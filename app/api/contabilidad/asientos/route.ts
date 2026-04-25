import { dbError } from "@/lib/api-utils"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── GET: lista/detalle de asientos ─────────────────────────────────────────
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const diario_id = searchParams.get("diario_id")
  const periodo_id = searchParams.get("periodo_id")
  const sucursal_id = searchParams.get("sucursal_id")
  const estado = searchParams.get("estado")
  const es_manual = searchParams.get("es_manual")
  const fecha_desde = searchParams.get("fecha_desde")
  const fecha_hasta = searchParams.get("fecha_hasta")
  const sin_cancelados = searchParams.get("sin_cancelados")

  let query = supabase
    .from("contabilidad_asientos")
    .select(`
      *,
      diario:contabilidad_diarios(id, nombre, codigo, tipo),
      periodo:contabilidad_periodos(id, nombre),
      sucursal:sucursales(id, nombre),
      lineas:contabilidad_asientos_lineas(*)
    `)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })

  if (id) query = query.eq("id", id)
  if (diario_id) query = query.eq("diario_id", diario_id)
  if (periodo_id) query = query.eq("periodo_id", periodo_id)
  if (sucursal_id) query = query.eq("sucursal_id", sucursal_id)
  if (estado) query = query.eq("estado", estado)
  if (es_manual === "true") query = query.eq("es_manual", true)
  if (es_manual === "false") query = query.eq("es_manual", false)
  if (sin_cancelados === "true") query = query.neq("estado", "cancelado")
  if (fecha_desde) query = query.gte("fecha", fecha_desde)
  if (fecha_hasta) query = query.lte("fecha", fecha_hasta)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(id ? (data?.[0] ?? null) : (data ?? []))
}

// ─── POST: crear asiento (nace en no_asentado) ───────────────────────────────
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const {
    diario_id, fecha, sucursal_id, concepto, referencia,
    comprobante_tipo, comprobante_id, nota_venta_id,
    partner_id, partner_tipo, moneda_original, cotizacion_aplicada,
    tipo_cotizacion, es_apertura, es_cierre, es_manual, a_revisar,
    lineas = [],
  } = body

  // Validar que las lineas cuadren si se publican directamente
  const sumaDebe = lineas.reduce((s: number, l: any) => s + (Number(l.debe) || 0), 0)
  const sumaHaber = lineas.reduce((s: number, l: any) => s + (Number(l.haber) || 0), 0)

  const estadoInicial = es_manual ? "no_asentado" : "publicado"

  if (estadoInicial === "publicado" && Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return NextResponse.json(
      { error: `Partida doble inválida: DEBE=${sumaDebe} HABER=${sumaHaber}` },
      { status: 422 }
    )
  }

  // Buscar período activo para la fecha
  const { data: periodoData } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fecha })

  const periodo_id = periodoData ?? null

  // Generar número si va directo a publicado
  let numero: string | null = null
  if (estadoInicial === "publicado") {
    const { data: numData } = await supabase
      .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fecha })
    numero = numData
  }

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero,
      diario_id,
      periodo_id,
      fecha,
      sucursal_id: sucursal_id ?? null,
      concepto: concepto ?? null,
      referencia: referencia ?? null,
      comprobante_tipo: comprobante_tipo ?? null,
      comprobante_id: comprobante_id ?? null,
      nota_venta_id: nota_venta_id ?? null,
      partner_id: partner_id ?? null,
      partner_tipo: partner_tipo ?? null,
      moneda_original: moneda_original ?? "ARS",
      cotizacion_aplicada: cotizacion_aplicada ?? null,
      tipo_cotizacion: tipo_cotizacion ?? null,
      es_apertura: es_apertura ?? false,
      es_cierre: es_cierre ?? false,
      es_manual: es_manual ?? false,
      a_revisar: a_revisar ?? false,
      estado: estadoInicial,
    })
    .select()
    .single()

  if (asientoErr) return NextResponse.json({ error: asientoErr.message }, { status: 500 })

  // Insertar líneas
  if (lineas.length > 0) {
    const lineasInsert = lineas.map((l: any, idx: number) => ({
      asiento_id: asiento.id,
      cuenta_id: l.cuenta_id,
      cuenta_codigo: l.cuenta_codigo ?? "",
      cuenta_nombre: l.cuenta_nombre ?? "",
      cuenta_analitica_id: l.cuenta_analitica_id ?? null,
      debe: Number(l.debe) || 0,
      haber: Number(l.haber) || 0,
      descripcion: l.descripcion ?? null,
      importe_moneda_original: l.importe_moneda_original ?? null,
      fecha_vencimiento: l.fecha_vencimiento ?? null,
      orden: idx,
    }))

    const { error: lineasErr } = await supabase
      .from("contabilidad_asientos_lineas")
      .insert(lineasInsert)

    if (lineasErr) {
      // Rollback: eliminar asiento huérfano
      await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
      return NextResponse.json({ error: lineasErr.message }, { status: 500 })
    }
  }

  return NextResponse.json(asiento, { status: 201 })
}

// ─── PATCH: publicar, cancelar, actualizar asiento manual ───────────────────
export async function PATCH(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const body = await req.json()
  const { action, lineas, ...campos } = body

  // Obtener asiento actual
  const { data: actual, error: errActual } = await supabase
    .from("contabilidad_asientos")
    .select("*, lineas:contabilidad_asientos_lineas(*)")
    .eq("id", id)
    .single()

  if (errActual || !actual) return NextResponse.json({ error: "Asiento no encontrado" }, { status: 404 })

  // ── Publicar ──
  if (action === "publicar") {
    if (actual.estado !== "no_asentado")
      return NextResponse.json({ error: "Solo se puede publicar un asiento en estado 'no_asentado'" }, { status: 422 })

    // Actualizar líneas si se enviaron
    if (lineas) {
      await supabase.from("contabilidad_asientos_lineas").delete().eq("asiento_id", id)
      const lineasInsert = lineas.map((l: any, idx: number) => ({
        asiento_id: id,
        cuenta_id: l.cuenta_id,
        cuenta_codigo: l.cuenta_codigo ?? "",
        cuenta_nombre: l.cuenta_nombre ?? "",
        cuenta_analitica_id: l.cuenta_analitica_id ?? null,
        debe: Number(l.debe) || 0,
        haber: Number(l.haber) || 0,
        descripcion: l.descripcion ?? null,
        importe_moneda_original: l.importe_moneda_original ?? null,
        orden: idx,
      }))
      const { error: errL } = await supabase.from("contabilidad_asientos_lineas").insert(lineasInsert)
      if (errL) return NextResponse.json({ error: errL.message }, { status: 500 })
    }

    // Validar partida doble
    const { data: currentLineas } = await supabase
      .from("contabilidad_asientos_lineas")
      .select("debe, haber")
      .eq("asiento_id", id)

    const sumaDebe = (currentLineas ?? []).reduce((s, l) => s + Number(l.debe), 0)
    const sumaHaber = (currentLineas ?? []).reduce((s, l) => s + Number(l.haber), 0)

    if (Math.abs(sumaDebe - sumaHaber) > 0.01)
      return NextResponse.json(
        { error: `Partida doble inválida: DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}` },
        { status: 422 }
      )

    // Generar número
    const { data: numData } = await supabase
      .rpc("contabilidad_generar_numero_asiento", {
        p_diario_id: actual.diario_id,
        p_fecha: actual.fecha,
      })

    const { data, error } = await supabase
      .from("contabilidad_asientos")
      .update({ estado: "publicado", numero: numData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) return dbError(error)
    return NextResponse.json(data)
  }

  // ── Cancelar ──
  if (action === "cancelar") {
    if (actual.estado !== "publicado")
      return NextResponse.json({ error: "Solo se puede cancelar un asiento publicado" }, { status: 422 })

    // Crear asiento de reversión
    const { data: numData } = await supabase
      .rpc("contabilidad_generar_numero_asiento", {
        p_diario_id: actual.diario_id,
        p_fecha: new Date().toISOString().split("T")[0],
      })

    const lineasReversion = (actual.lineas ?? []).map((l: any, idx: number) => ({
      cuenta_id: l.cuenta_id,
      cuenta_codigo: l.cuenta_codigo,
      cuenta_nombre: l.cuenta_nombre,
      debe: Number(l.haber),
      haber: Number(l.debe),
      descripcion: l.descripcion,
      orden: idx,
    }))

    const { data: reversion, error: errRev } = await supabase
      .from("contabilidad_asientos")
      .insert({
        numero: numData,
        diario_id: actual.diario_id,
        periodo_id: actual.periodo_id,
        fecha: new Date().toISOString().split("T")[0],
        sucursal_id: actual.sucursal_id,
        concepto: `Reversión de ${actual.numero ?? id}`,
        referencia: actual.referencia,
        comprobante_tipo: actual.comprobante_tipo,
        comprobante_id: actual.comprobante_id,
        estado: "publicado",
        es_manual: true,
        moneda_original: actual.moneda_original,
        asiento_reversion_id: id,
      })
      .select()
      .single()

    if (errRev) return NextResponse.json({ error: errRev.message }, { status: 500 })

    if (lineasReversion.length > 0) {
      await supabase.from("contabilidad_asientos_lineas").insert(
        lineasReversion.map((l: any) => ({ ...l, asiento_id: reversion.id }))
      )
    }

    // Marcar original como cancelado
    const { data, error } = await supabase
      .from("contabilidad_asientos")
      .update({
        estado: "cancelado",
        asiento_reversion_id: reversion.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) return dbError(error)
    return NextResponse.json({ asiento: data, reversion })
  }

  // ── Actualización de campos (solo si está en no_asentado) ──
  if (actual.estado !== "no_asentado")
    return NextResponse.json(
      { error: "Los asientos publicados solo pueden cancelarse, no editarse." },
      { status: 422 }
    )

  if (lineas) {
    await supabase.from("contabilidad_asientos_lineas").delete().eq("asiento_id", id)
    const lineasInsert = lineas.map((l: any, idx: number) => ({
      asiento_id: id,
      cuenta_id: l.cuenta_id,
      cuenta_codigo: l.cuenta_codigo ?? "",
      cuenta_nombre: l.cuenta_nombre ?? "",
      cuenta_analitica_id: l.cuenta_analitica_id ?? null,
      debe: Number(l.debe) || 0,
      haber: Number(l.haber) || 0,
      descripcion: l.descripcion ?? null,
      orden: idx,
    }))
    const { error: errL } = await supabase.from("contabilidad_asientos_lineas").insert(lineasInsert)
    if (errL) return NextResponse.json({ error: errL.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("contabilidad_asientos")
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
