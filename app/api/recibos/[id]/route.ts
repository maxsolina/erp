import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — leer un recibo con sus pagos e imputaciones
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params

  const { data: rec, error } = await supabase
    .from("recibos")
    .select("*")
    .eq("id", id)
    .single()
  if (error || !rec) {
    return NextResponse.json({ error: error?.message ?? "Recibo no encontrado" }, { status: 404 })
  }

  const { data: pagos } = await supabase
    .from("recibo_pagos")
    .select("*")
    .eq("recibo_id", id)
  const { data: imputaciones } = await supabase
    .from("recibo_imputaciones")
    .select("*")
    .eq("recibo_id", id)

  return NextResponse.json({
    ...rec,
    pagos: pagos ?? [],
    imputaciones: imputaciones ?? [],
  })
}

// PUT — reemplazar cabecera + pagos + imputaciones de un recibo en estado 'borrador'.
// Recibos publicados o cancelados no se editan.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params

  const body = await req.json()
  const {
    cliente_id,
    cliente_nombre,
    caja_id,
    caja_nombre,
    factura_id,
    nota_venta_id,
    nota_venta_numero,
    cobrador_id,
    cobrador_nombre,
    concepto,
    importe,
    importe_no_conciliado,
    importe_no_conciliado_ars,
    moneda,
    tipo_cotizacion,
    cotizacion,
    observaciones,
    pagos = [],
    imputaciones = [],
  } = body

  // Validar estado
  const { data: actual, error: actualErr } = await supabase
    .from("recibos")
    .select("estado")
    .eq("id", id)
    .single()
  if (actualErr || !actual) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }
  if (actual.estado !== "borrador") {
    return NextResponse.json(
      { error: `No se puede editar un recibo en estado '${actual.estado}'. Solo borradores son editables.` },
      { status: 422 }
    )
  }

  // Update cabecera
  const updatePayload: Record<string, unknown> = {
    cliente_id: cliente_id ?? null,
    cliente_nombre: cliente_nombre ?? null,
    caja_id: caja_id ?? null,
    caja_nombre: caja_nombre ?? null,
    factura_id: factura_id ?? null,
    nota_venta_id: nota_venta_id ?? null,
    nota_venta_numero: nota_venta_numero ?? null,
    cobrador_id: cobrador_id ?? null,
    cobrador_nombre: cobrador_nombre ?? null,
    concepto: concepto ?? null,
    importe: Number(importe ?? 0),
    importe_no_conciliado: Number(importe_no_conciliado ?? 0),
    importe_no_conciliado_ars: Number(importe_no_conciliado_ars ?? 0),
    moneda: moneda ?? "ARS",
    tipo_cotizacion: tipo_cotizacion ?? null,
    cotizacion: cotizacion ?? null,
    observaciones: observaciones ?? null,
    updated_at: new Date().toISOString(),
  }

  const { error: updErr } = await supabase
    .from("recibos")
    .update(updatePayload)
    .eq("id", id)
  if (updErr) return dbError(updErr)

  // Reemplazar pagos
  await supabase.from("recibo_pagos").delete().eq("recibo_id", id)
  if (Array.isArray(pagos) && pagos.length > 0) {
    const pagosInsert = pagos.map((p: any) => ({
      recibo_id: id,
      valor_id: p.valor_id ?? null,
      valor_nombre: p.valor_nombre ?? null,
      tipo_valor: p.tipo_valor ?? null,
      importe_comprobante: Number(p.importe_comprobante ?? p.importe ?? 0),
      moneda_comprobante: p.moneda_comprobante ?? p.moneda ?? "ARS",
      importe: Number(p.importe ?? 0),
      moneda: p.moneda ?? "ARS",
      es_tarjeta: !!p.es_tarjeta,
      tarjeta_nombre: p.tarjeta_nombre ?? null,
      cantidad_cuotas: Number(p.cantidad_cuotas ?? 1),
      numero_cupon: p.numero_cupon ?? null,
      recargo_porcentaje: Number(p.recargo_porcentaje ?? 0),
      recargo_importe: Number(p.recargo_importe ?? 0),
      es_cheque: !!p.es_cheque,
      cheque_id: p.cheque_id ?? null,
      cupon_tarjeta_id: p.cupon_tarjeta_id ?? null,
    }))
    const { error: pagosErr } = await supabase.from("recibo_pagos").insert(pagosInsert)
    if (pagosErr) return dbError(pagosErr)
  }

  // Reemplazar imputaciones (solo asignacion > 0)
  await supabase.from("recibo_imputaciones").delete().eq("recibo_id", id)
  const impsConAsig = (imputaciones ?? []).filter((i: any) => Number(i.asignacion ?? 0) > 0)
  if (impsConAsig.length > 0) {
    const impsInsert = impsConAsig.map((i: any) => ({
      recibo_id: id,
      tipo_comprobante: i.tipo_comprobante ?? null,
      comprobante_id: i.comprobante_id ?? null,
      comprobante_referencia: i.comprobante_referencia ?? null,
      fecha_comprobante: i.fecha_comprobante ?? null,
      fecha_vencimiento: i.fecha_vencimiento ?? null,
      saldo_moneda: Number(i.saldo_moneda ?? 0),
      moneda_comprobante: i.moneda_comprobante ?? "ARS",
      tipo_cotizacion: i.tipo_cotizacion ?? null,
      cotizacion_original: i.cotizacion_original ?? null,
      saldo_original: Number(i.saldo_original ?? 0),
      cotizacion_actual: i.cotizacion_actual ?? null,
      saldo_actual: Number(i.saldo_actual ?? 0),
      asignacion: Number(i.asignacion ?? 0),
    }))
    const { error: impsErr } = await supabase.from("recibo_imputaciones").insert(impsInsert)
    if (impsErr) return dbError(impsErr)
  }

  return NextResponse.json({ ok: true, id })
}
