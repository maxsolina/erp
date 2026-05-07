import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listar NVs con sus líneas (dos queries separadas, sin FK PostgREST)
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const numero = searchParams.get("numero")
  const id = searchParams.get("id")

  // 1. Cabeceras
  let nvQuery = supabase
    .from("notas_venta")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)
  if (id) nvQuery = nvQuery.eq("id", Number(id))
  else if (numero) nvQuery = nvQuery.eq("numero", numero)

  const { data: nvs, error: nvErr } = await nvQuery
  if (nvErr) return NextResponse.json({ error: nvErr.message }, { status: 500 })
  if (!nvs || nvs.length === 0) return NextResponse.json([])

  // 2. Líneas de todas las NVs
  const nvIds = nvs.map((n: any) => n.id)
  const { data: lineas, error: lineasErr } = await supabase
    .from("notas_venta_lineas")
    .select("*")
    .in("nota_venta_id", nvIds)

  if (lineasErr) return NextResponse.json({ error: lineasErr.message }, { status: 500 })

  // 3. Enriquecer con datos de clientes
  const clienteIds = [...new Set(nvs.map((n: any) => n.cliente_id).filter(Boolean))]
  let clientesMap: Record<number, any> = {}
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nombre, codigo")
      .in("id", clienteIds)
    ;(clientes ?? []).forEach((c: any) => { clientesMap[c.id] = c })
  }

  // 4. Enriquecer con nombre de sucursal/depósito
  const sucursalIds = [...new Set(nvs.map((n: any) => n.sucursal_id).filter(Boolean))]
  let sucursalesMap: Record<number, any> = {}
  if (sucursalIds.length > 0) {
    const { data: sucursales } = await supabase
      .from("sucursales")
      .select("id, nombre")
      .in("id", sucursalIds)
    ;(sucursales ?? []).forEach((s: any) => { sucursalesMap[s.id] = s })
  }

  // 5. Combinar líneas
  const lineasPorNV: Record<number, any[]> = {}
  ;(lineas ?? []).forEach((l: any) => {
    if (!lineasPorNV[l.nota_venta_id]) lineasPorNV[l.nota_venta_id] = []
    lineasPorNV[l.nota_venta_id].push(l)
  })

  const result = nvs.map((nv: any) => ({
    ...nv,
    cliente_nombre: clientesMap[nv.cliente_id]?.nombre ?? nv.cliente_nombre ?? "",
    cliente_codigo: clientesMap[nv.cliente_id]?.codigo ?? "",
    deposito: sucursalesMap[nv.sucursal_id]?.nombre ?? nv.deposito ?? "",
    notas_venta_lineas: lineasPorNV[nv.id] ?? [],
  }))

  return NextResponse.json(result)
}

// POST — crear NV con sus líneas
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const {
    numero,
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
    usuario,
    ot_id,
    ot_numero,
  } = body

  // Generar número en el servidor de forma atómica
  let numeroFinal = numero
  if (!numeroFinal) {
    const { data: last } = await supabase
      .from("notas_venta")
      .select("numero")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastNum = last?.numero
      ? parseInt(last.numero.replace(/\D/g, "").slice(-8), 10)
      : 10737
    numeroFinal = `NV X 10000-${String(lastNum + 1).padStart(8, "0")}`
  }

  // Verificar que no exista ya ese número
  const { data: existing } = await supabase
    .from("notas_venta")
    .select("id")
    .eq("numero", numeroFinal)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `Ya existe una NV con el número ${numeroFinal}` }, { status: 409 })
  }

  // Mapear estado al enum válido de Supabase
  const ESTADOS_VALIDOS = ["borrador", "abierta", "a_facturar", "verificacion_factura", "verificacion_oe", "facturada", "finalizada", "parcial", "cancelada"]
  const estadoNormalizado = ESTADOS_VALIDOS.includes(estado) ? estado : "abierta"

  // Insertar cabecera de NV. Si la NV se origina en una OT del taller,
  // pasamos `ot_id` y `ot_numero` para que queden vinculadas (la columna
  // ot_id se agregó en scripts/alter-tablas-ot-id.sql).
  const buildPayload = (estadoUsado: string) => ({
    numero: numeroFinal,
    cliente_id: cliente_id ?? null,
    vendedor_id: vendedor_id ?? null,
    sucursal_id: sucursal_id ?? null,
    moneda: moneda ?? "ARS",
    estado: estadoUsado,
    subtotal: Number(subtotal ?? 0),
    impuestos: Number(impuestos ?? 0),
    total: Number(total ?? 0),
    notas: notas ?? null,
    ...(ot_id ? { ot_id } : {}),
  })

  let { data: nv, error: nvErr } = await supabase
    .from("notas_venta")
    .insert(buildPayload(estadoNormalizado))
    .select()
    .single()

  // Compat: si la DB todavía no tiene "borrador" en el CHECK, caemos a "abierta"
  // (correr scripts/091_notas_venta_estado_borrador.sql para habilitar borrador real)
  if (nvErr?.code === "23514" && estadoNormalizado === "borrador") {
    const fb = await supabase
      .from("notas_venta")
      .insert(buildPayload("abierta"))
      .select()
      .single()
    nv = fb.data
    nvErr = fb.error
  }

  if (nvErr) return NextResponse.json({ error: nvErr.message }, { status: 500 })

  // Insertar líneas si las hay
  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasInsert = lineas.map((l: any) => {
      const cant = Number(l.cantidad ?? 1)
      const precio = Number(l.precio_unitario ?? 0)
      const desc = Number(l.descuento ?? 0)
      const sub = Number(l.subtotal ?? (cant * precio))
      return {
        nota_venta_id: nv.id,
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

    const { error: lineasErr } = await supabase
      .from("notas_venta_lineas")
      .insert(lineasInsert)

    if (lineasErr) {
      return NextResponse.json(
        { error: `NV creada (id:${nv.id}) pero error en líneas: ${lineasErr.message}` },
        { status: 207 }
      )
    }
  }

  // Registrar evento de creación en el seguimiento (con label friendly)
  const ESTADO_NV_LABELS: Record<string, string> = {
    abierta: "Abierta",
    borrador: "Borrador",
    a_facturar: "A Facturar",
    verificacion_factura: "Verif. Factura",
    verificacion_oe: "Verif. OE",
    facturada: "Confirmada",
    finalizada: "Finalizada",
    parcial: "Parcial",
    cancelada: "Cancelada",
  }
  const labelEstado = ESTADO_NV_LABELS[nv.estado] ?? nv.estado
  await registrarEvento(supabase, {
    tipo_documento: "nota_venta",
    documento_id: nv.id,
    usuario,
    tipo_evento: "creacion",
    descripcion: `Documento creado en estado ${labelEstado}`,
  })

  return NextResponse.json({ ok: true, id: nv.id, numero: nv.numero ?? numeroFinal })
}
