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
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id: idParam } = await params
  const id = Number(idParam)
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

  // Enriquecer con cliente_nombre/codigo y nombre del depósito (mismo patrón que el listado)
  let cliente_nombre: string = nv.cliente_nombre ?? ""
  let cliente_codigo = ""
  if (nv.cliente_id) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("nombre, codigo")
      .eq("id", nv.cliente_id)
      .maybeSingle()
    if (cli) {
      cliente_nombre = cli.nombre ?? cliente_nombre
      cliente_codigo = cli.codigo ?? ""
    }
  }
  let deposito = nv.deposito ?? ""
  if (nv.sucursal_id) {
    const { data: suc } = await supabase
      .from("sucursales")
      .select("nombre")
      .eq("id", nv.sucursal_id)
      .maybeSingle()
    if (suc?.nombre) deposito = suc.nombre
  }

  return NextResponse.json({
    ...nv,
    cliente_nombre,
    cliente_codigo,
    deposito,
    notas_venta_lineas: lineas ?? [],
  })
}

// PUT — reemplazar cabecera + líneas de una NV (modo edición)
// Solo permitido si la NV está en estado 'abierta' (sin cascada disparada).
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 })

  const body = await req.json()
  const {
    cliente_id,
    vendedor_id,
    sucursal_id,
    moneda,
    estado,
    subtotal,
    impuestos,
    total,
    notas,
    lineas = [],
  } = body

  // Verificar estado actual
  const { data: actual, error: actualErr } = await supabase
    .from("notas_venta")
    .select("estado")
    .eq("id", id)
    .single()
  if (actualErr || !actual) {
    return NextResponse.json({ error: "NV no encontrada" }, { status: 404 })
  }
  if (actual.estado !== "abierta" && actual.estado !== "borrador") {
    return NextResponse.json(
      { error: `No se puede editar una NV en estado '${actual.estado}'. Solo NVs en estado 'borrador' o 'abierta' son editables.` },
      { status: 422 }
    )
  }

  const ESTADOS_VALIDOS = ["borrador", "abierta", "a_facturar", "verificacion_factura", "verificacion_oe", "facturada", "finalizada", "parcial", "cancelada"]
  const estadoNormalizado = ESTADOS_VALIDOS.includes(estado) ? estado : "abierta"

  // Update cabecera
  const { error: updErr } = await supabase
    .from("notas_venta")
    .update({
      cliente_id: cliente_id ?? null,
      vendedor_id: vendedor_id ?? null,
      sucursal_id: sucursal_id ?? null,
      moneda: moneda ?? "ARS",
      estado: estadoNormalizado,
      subtotal: Number(subtotal ?? 0),
      impuestos: Number(impuestos ?? 0),
      total: Number(total ?? 0),
      notas: notas ?? null,
    })
    .eq("id", id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Reemplazar líneas: borrar las existentes e insertar las nuevas
  const { error: delErr } = await supabase
    .from("notas_venta_lineas")
    .delete()
    .eq("nota_venta_id", id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasInsert = lineas.map((l: any) => {
      const cant = Number(l.cantidad ?? 1)
      const precio = Number(l.precio_unitario ?? 0)
      const desc = Number(l.descuento ?? 0)
      const sub = Number(l.subtotal ?? (cant * precio))
      return {
        nota_venta_id: id,
        producto_id: l.producto_id ?? null,
        producto_nombre: String(l.producto_nombre ?? ""),
        descripcion: l.descripcion ?? null,
        cantidad: cant,
        precio_unitario: precio,
        descuento: desc,
        subtotal: isNaN(sub) ? 0 : sub,
        iva: Number(l.iva ?? 0),
      }
    })
    const { error: insErr } = await supabase
      .from("notas_venta_lineas")
      .insert(lineasInsert)
    if (insErr) {
      return NextResponse.json(
        { error: `Cabecera actualizada pero error en líneas: ${insErr.message}` },
        { status: 207 }
      )
    }
  }

  return NextResponse.json({ ok: true, id })
}

// PATCH — ejecutar acciones sobre una NV
// Acciones:
//   - reservar_stock: marca N unidades disponibles de cada producto como 'reservado'
//                    y las vincula a la NV. Idempotente: libera reservas previas de
//                    esta NV antes de re-reservar.
//   - liberar_stock:  libera todas las unidades reservadas para esta NV (estado → 'disponible')
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id: idParam } = await params
  const nvId = Number(idParam)
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
