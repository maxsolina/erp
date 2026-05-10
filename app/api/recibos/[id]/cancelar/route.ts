import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"
import { cancelarMovimientosBancoPorDocumento } from "@/lib/movimientos-banco"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — cancelar un recibo publicado y revertir todos sus efectos colaterales
//
// Body: { motivo: string }
// Pasos (faithful al monolito):
// 1. Bloquear si tiene conciliaciones de deuda
// 2. Marcar movimientos_caja como cancelado
// 3. Borrar movimientos en ventas_cc_movimientos
// 4. Cancelar cupones de tarjeta
// 5. Revertir saldos de facturas imputadas
// 6. Update recibo: estado='cancelado', motivo, fecha_cancelacion
// 7. Generar asiento de reversa
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const motivo: string = body?.motivo ?? ""

  if (!motivo.trim()) {
    return NextResponse.json({ error: "Motivo de cancelación requerido" }, { status: 422 })
  }

  // Cargar recibo
  const { data: recibo, error: recErr } = await supabase
    .from("recibos")
    .select("*")
    .eq("id", id)
    .single()
  if (recErr || !recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }
  if (recibo.estado !== "publicado") {
    return NextResponse.json(
      { error: `Solo se pueden cancelar recibos publicados (actual: ${recibo.estado})` },
      { status: 422 }
    )
  }

  // 1. Bloquear si hay conciliaciones de deuda
  const { count: concCount } = await supabase
    .from("conciliaciones_deuda_aplicaciones")
    .select("*", { count: "exact", head: true })
    .or(`credito_numero.eq.${recibo.numero},debito_numero.eq.${recibo.numero}`)
  if ((concCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Recibo ${recibo.numero} tiene conciliaciones de deuda — revertilas primero` },
      { status: 422 }
    )
  }

  // Cargar pagos e imputaciones
  const { data: pagos } = await supabase.from("recibo_pagos").select("*").eq("recibo_id", id)
  const { data: imputaciones } = await supabase.from("recibo_imputaciones").select("*").eq("recibo_id", id)

  // 2. Marcar movimientos de caja como cancelados
  await supabase
    .from("movimientos_caja")
    .update({ estado_movimiento: "cancelado" })
    .eq("documento_origen_tipo", "recibo")
    .eq("documento_origen_numero", recibo.numero)

  // 2b. Marcar movimientos bancarios como cancelados (recibos cobrados con banco)
  await cancelarMovimientosBancoPorDocumento(supabase, "recibo", recibo.numero)

  // 3. Borrar movimientos CC
  const { error: ccRevErr } = await supabase
    .from("ventas_cc_movimientos")
    .delete()
    .eq("comprobante_tipo", "recibo")
    .eq("comprobante_id", String(recibo.id))
  if (ccRevErr && !ccRevErr.message.includes("does not exist") && !ccRevErr.message.includes("Could not find the table")) {
    console.warn("[cancelar recibo] No se pudieron revertir mov CC:", ccRevErr.message)
  }

  // 4. Cancelar cupones
  for (const pago of (pagos ?? []) as any[]) {
    if (pago.cupon_tarjeta_id) {
      await supabase.from("cupones_tarjeta").update({ estado: "cancelado" }).eq("id", pago.cupon_tarjeta_id)
    }
  }

  // 5. Revertir imputaciones (sumar de vuelta el saldo a las facturas)
  for (const imp of (imputaciones ?? []) as any[]) {
    if (!imp.asignacion || imp.asignacion <= 0) continue
    const { data: fac } = await supabase
      .from("facturas")
      .select("saldo, total")
      .eq("id", imp.comprobante_id)
      .single()
    if (fac) {
      const saldoRestaurado = Math.min((Number(fac.saldo) || 0) + Number(imp.asignacion), Number(fac.total))
      await supabase
        .from("facturas")
        .update({ saldo: saldoRestaurado, estado: "abierta" })
        .eq("id", imp.comprobante_id)
    }
  }

  // 6. Update recibo
  const { error: cancelErr } = await supabase
    .from("recibos")
    .update({
      estado: "cancelado",
      importe_no_conciliado: 0,
      importe_no_conciliado_ars: 0,
      fecha_cancelacion: new Date().toISOString(),
      motivo_cancelacion: motivo,
    })
    .eq("id", id)
  if (cancelErr) return NextResponse.json({ error: cancelErr.message }, { status: 500 })

  // 7. Generar asiento de reversa (si había uno publicado)
  const { data: asientoOrigen } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "recibo")
    .eq("referencia", recibo.numero)
    .neq("estado", "cancelado")
    .maybeSingle()
  if (asientoOrigen?.id) {
    await generarAsientoReversa(supabase, asientoOrigen.id, `Anulación Recibo ${recibo.numero}`)
  }

  await registrarEvento(supabase, {
    tipo_documento: "recibo",
    documento_id: id,
    tipo_evento: "cambio_estado",
    valor_anterior: recibo.estado,
    valor_nuevo: "cancelado",
    usuario: null,
  })

  return NextResponse.json({ ok: true, id })
}
