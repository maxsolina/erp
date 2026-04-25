import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — obtener una NV por ID
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const id = Number(params.id)
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const { data: nv, error } = await supabase
    .from("notas_venta")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return dbError(error)

  const { data: lineas } = await supabase
    .from("notas_venta_lineas")
    .select("*")
    .eq("nota_venta_id", id)

  return NextResponse.json({ ...nv, notas_venta_lineas: lineas ?? [] })
}

// PATCH — ejecutar acciones sobre una NV
// Acciones:
//   - reservar_stock: marca N unidades disponibles de cada producto como 'reservado'
//                    y las vincula a la NV. Idempotente: libera reservas previas de
//                    esta NV antes de re-reservar.
//   - liberar_stock:  libera todas las unidades reservadas para esta NV (estado → 'disponible')
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const nvId = Number(params.id)
  if (!nvId) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json()
  const { accion } = body

  if (!["reservar_stock", "liberar_stock"].includes(accion)) {
    return NextResponse.json({ error: "Acción no válida. Use: reservar_stock | liberar_stock" }, { status: 400 })
  }

  // Cargar la NV
  const { data: nv, error: nvErr } = await supabase
    .from("notas_venta")
    .select("id, numero, estado, sucursal_id")
    .eq("id", nvId)
    .single()

  if (nvErr || !nv) {
    return NextResponse.json({ error: "NV no encontrada" }, { status: 404 })
  }

  // ─── liberar_stock ────────────────────────────────────────────────────────
  if (accion === "liberar_stock") {
    const { data: unidades, error: uErr } = await supabase
      .from("stock_unidades")
      .select("id")
      .eq("nota_venta_id", nvId)
      .eq("estado", "reservado")

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    const ids = (unidades ?? []).map((u: any) => u.id)

    if (ids.length > 0) {
      const { error: releaseErr } = await supabase
        .from("stock_unidades")
        .update({
          estado: "disponible",
          nota_venta_id: null,
          nota_venta_numero: null,
        })
        .in("id", ids)

      if (releaseErr) return NextResponse.json({ error: releaseErr.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      accion: "liberar_stock",
      unidades_liberadas: ids.length,
    })
  }

  // ─── reservar_stock ───────────────────────────────────────────────────────
  // 1. Cargar líneas de la NV
  const { data: lineas, error: lineasErr } = await supabase
    .from("notas_venta_lineas")
    .select("producto_id, cantidad")
    .eq("nota_venta_id", nvId)

  if (lineasErr) return NextResponse.json({ error: lineasErr.message }, { status: 500 })
  if (!lineas || lineas.length === 0) {
    return NextResponse.json({ error: "La NV no tiene líneas" }, { status: 422 })
  }

  // 2. Liberar reservas previas de esta NV (idempotencia)
  await supabase
    .from("stock_unidades")
    .update({ estado: "disponible", nota_venta_id: null, nota_venta_numero: null })
    .eq("nota_venta_id", nvId)
    .eq("estado", "reservado")

  // 3. Para cada línea, reservar N unidades disponibles del producto
  // Obtener depositos de la sucursal para priorizar unidades del mismo deposito
  let depositoIds: number[] = []
  if (nv.sucursal_id) {
    const { data: deps } = await supabase
      .from("depositos")
      .select("id")
      .eq("sucursal_id", nv.sucursal_id)
    depositoIds = (deps ?? []).map((d: any) => d.id)
  }

  const resultados: {
    producto_id: number
    cantidad_solicitada: number
    cantidad_reservada: number
    unidades_ids: number[]
    sin_serie: boolean
  }[] = []

  for (const linea of lineas) {
    const { producto_id, cantidad } = linea
    const cantidadNecesaria = Number(cantidad ?? 1)

    // Buscar unidades disponibles para este producto (priorizar depósito de la sucursal)
    let queryUnidades = supabase
      .from("stock_unidades")
      .select("id, deposito_id")
      .eq("producto_id", producto_id)
      .eq("estado", "disponible")
      .not("nro_serie", "is", null) // solo unidades con número de serie/IMEI
      .order("deposito_id", { ascending: true })
      .limit(cantidadNecesaria * 3) // pedir más para poder priorizar por deposito

    const { data: disponibles, error: dispErr } = await queryUnidades

    if (dispErr) {
      return NextResponse.json({ error: `Error al buscar unidades: ${dispErr.message}` }, { status: 500 })
    }

    if (!disponibles || disponibles.length === 0) {
      // Producto sin stock_unidades con serie — podría ser accesorio/consumible sin serie
      // Registrar sin error (esos productos no se reservan individualmente)
      resultados.push({ producto_id, cantidad_solicitada: cantidadNecesaria, cantidad_reservada: 0, unidades_ids: [], sin_serie: true })
      continue
    }

    // Priorizar unidades del depósito de la sucursal
    const priorizadas = [
      ...disponibles.filter((u: any) => depositoIds.includes(u.deposito_id)),
      ...disponibles.filter((u: any) => !depositoIds.includes(u.deposito_id)),
    ].slice(0, cantidadNecesaria)

    const idsAReservar = priorizadas.map((u: any) => u.id)

    // Marcar como reservadas y vincular a la NV
    const { error: reservaErr } = await supabase
      .from("stock_unidades")
      .update({
        estado: "reservado",
        nota_venta_id: nvId,
        nota_venta_numero: nv.numero,
      })
      .in("id", idsAReservar)

    if (reservaErr) {
      return NextResponse.json({ error: `Error al reservar unidades: ${reservaErr.message}` }, { status: 500 })
    }

    resultados.push({
      producto_id,
      cantidad_solicitada: cantidadNecesaria,
      cantidad_reservada: idsAReservar.length,
      unidades_ids: idsAReservar,
      sin_serie: false,
    })
  }

  const totalReservadas = resultados.reduce((s, r) => s + r.cantidad_reservada, 0)
  const sinCobertura = resultados.filter(r => !r.sin_serie && r.cantidad_reservada < r.cantidad_solicitada)

  return NextResponse.json({
    ok: true,
    accion: "reservar_stock",
    nota_venta_id: nvId,
    nota_venta_numero: nv.numero,
    total_unidades_reservadas: totalReservadas,
    sin_cobertura: sinCobertura.length > 0
      ? sinCobertura.map(r => ({
          producto_id: r.producto_id,
          solicitado: r.cantidad_solicitada,
          reservado: r.cantidad_reservada,
          faltante: r.cantidad_solicitada - r.cantidad_reservada,
        }))
      : [],
    detalle: resultados,
  })
}
