import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/cancelar
//
// Cancela un préstamo:
//   - estado=borrador: lo marca como cancelado y borra cuotas si las hubiese.
//   - estado=pendiente: si no tiene pagos hechos, reversa el asiento del alta,
//     cancela movimientos de caja, borra cuotas y marca estado=cancelado.
//   - Si tiene pagos hechos, rechaza con 409.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: prestamo } = await supabase.from("prestamos").select("*").eq("id", id).maybeSingle()
  if (!prestamo) return apiError("Préstamo no encontrado", 404)
  if (prestamo.estado === "cancelado") return apiError("El préstamo ya está cancelado", 409)
  if (prestamo.estado === "cerrado") return apiError("No se puede cancelar un préstamo ya cerrado", 409)

  // Verificar que no haya pagos hechos
  const { count: pagosCount } = await supabase
    .from("prestamo_pagos")
    .select("id", { count: "exact", head: true })
    .eq("prestamo_id", id)
  if ((pagosCount ?? 0) > 0) {
    return apiError("No se puede cancelar: el préstamo tiene pagos registrados. Cancelá los pagos primero.", 409)
  }

  // Si está en borrador: sin asiento, sin movimientos. Solo borrar cuotas y cambiar estado.
  if (prestamo.estado === "borrador") {
    await supabase.from("prestamo_cuotas").delete().eq("prestamo_id", id)
    const { error: eUpd } = await supabase.from("prestamos").update({ estado: "cancelado" }).eq("id", id)
    if (eUpd) return dbError(eUpd)
    return NextResponse.json({ ok: true })
  }

  // estado=pendiente: verificar extracto de caja abierto (si hubo ingreso en caja)
  const { data: movs } = await supabase
    .from("movimientos_caja")
    .select("id, extracto_id")
    .eq("documento_origen_tipo", "prestamo")
    .eq("documento_origen_id", id)

  const extractoIds = [...new Set((movs ?? []).map(m => m.extracto_id).filter(Boolean))] as string[]
  if (extractoIds.length > 0) {
    const { data: extractos } = await supabase
      .from("extractos_caja")
      .select("id, estado")
      .in("id", extractoIds)
    const algunoCerrado = (extractos ?? []).some(e => e.estado !== "abierto")
    if (algunoCerrado) {
      return apiError("No se puede cancelar: el extracto de caja donde se asentó el ingreso ya está cerrado", 409)
    }
  }

  // 1. Marcar movimientos_caja del alta como cancelado
  if ((movs ?? []).length > 0) {
    const { error: eMov } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "cancelado" })
      .eq("documento_origen_tipo", "prestamo")
      .eq("documento_origen_id", id)
    if (eMov) return dbError(eMov)
  }

  // 2. Reversa del asiento del alta
  const { data: asiento } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "prestamo_alta")
    .eq("referencia", prestamo.numero)
    .is("asiento_reversion_id", null)
    .maybeSingle()
  if (asiento) {
    const reversa = await generarAsientoReversa(supabase, asiento.id, `Anula Préstamo ${prestamo.numero}`)
    if (!reversa.ok) return apiError(`No se generó la reversa del asiento: ${reversa.error}`, 409)
  }

  // 3. Borrar cuotas (no hubo pagos, garantizado arriba)
  await supabase.from("prestamo_cuotas").delete().eq("prestamo_id", id)

  // 4. Marcar préstamo como cancelado
  const { error: eUpdP } = await supabase
    .from("prestamos")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpdP) return dbError(eUpdP)

  return NextResponse.json({ ok: true })
}
