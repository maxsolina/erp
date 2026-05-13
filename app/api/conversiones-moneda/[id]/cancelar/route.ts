import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/conversiones-moneda/[id]/cancelar
//
// Cancela una conversión publicada:
//   1. Verifica que el extracto de caja afectado siga abierto.
//   2. Marca movimientos_caja como `cancelado`.
//   3. Genera asiento reversa.
//   4. Marca la conversión como `cancelado`.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: conv, error } = await supabase
    .from("conversiones_moneda")
    .select("id, numero, estado")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!conv) return apiError("Conversión no encontrada", 404)
  if (conv.estado !== "publicado") return apiError("Solo se pueden cancelar conversiones publicadas", 409)

  // 1. Verificar extractos abiertos
  // Nota: incluimos "conversion_moneda_redondeo" por compatibilidad con conversiones
  // viejas que todavía tienen el movimiento de redondeo en caja.
  const { data: movs, error: eMov } = await supabase
    .from("movimientos_caja")
    .select("id, extracto_id")
    .in("documento_origen_tipo", ["conversion_moneda", "conversion_moneda_redondeo"])
    .eq("documento_origen_id", id)
  if (eMov) return dbError(eMov)

  const extractoIds = [...new Set((movs ?? []).map(m => m.extracto_id).filter(Boolean))] as string[]
  if (extractoIds.length > 0) {
    const { data: extractos } = await supabase
      .from("extractos_caja")
      .select("id, estado")
      .in("id", extractoIds)
    const algunoCerrado = (extractos ?? []).some(e => e.estado !== "abierto")
    if (algunoCerrado) {
      return apiError("No se puede cancelar: el extracto de caja ya está cerrado", 409)
    }
  }

  // 2. Marcar movimientos como cancelados
  if ((movs ?? []).length > 0) {
    const { error: eUpd } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "cancelado" })
      .in("documento_origen_tipo", ["conversion_moneda", "conversion_moneda_redondeo"])
      .eq("documento_origen_id", id)
    if (eUpd) return dbError(eUpd)
  }

  // 3. Reversa del asiento
  const { data: asiento } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "conversion_moneda")
    .eq("referencia", conv.numero)
    .is("asiento_reversion_id", null)
    .maybeSingle()
  if (asiento) {
    const reversa = await generarAsientoReversa(supabase, asiento.id, `Anula Conversión ${conv.numero}`)
    if (!reversa.ok) return apiError(`No se generó la reversa del asiento: ${reversa.error}`, 409)
  }

  // 4. Marcar conversión como cancelada
  const { error: eUpdConv } = await supabase
    .from("conversiones_moneda")
    .update({ estado: "cancelado" })
    .eq("id", id)
  if (eUpdConv) return dbError(eUpdConv)

  return NextResponse.json({ ok: true })
}
