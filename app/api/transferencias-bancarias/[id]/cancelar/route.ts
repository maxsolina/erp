import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/transferencias-bancarias/[id]/cancelar
//
// Cancela una transferencia bancaria publicada:
//   1. Marca los movimientos_banco como `cancelado`.
//   2. Genera asiento reversa.
//   3. Marca la transferencia como `cancelado`.
//
// Las transferencias bancarias no afectan extractos de caja, así que no hay
// que verificar cierre de extracto. Pero sí podría haber sido conciliado el
// movimiento; lo dejamos cancelar igualmente (la conciliación queda huérfana).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase
    .from("transferencias_bancarias")
    .select("id, numero, estado")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "publicado") return apiError("Solo se pueden cancelar transferencias publicadas", 409)

  // 1. Marcar movimientos_banco como cancelados (origen + destino)
  const { error: eBan } = await supabase
    .from("movimientos_banco")
    .update({ estado_movimiento: "cancelado" })
    .eq("documento_origen_tipo", "transferencia_bancaria")
    .eq("documento_origen_id", id)
  if (eBan) return dbError(eBan)

  // 2. Reversa del asiento
  const { data: asiento } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "transferencia_bancaria")
    .eq("referencia", tr.numero)
    .is("asiento_reversion_id", null)
    .maybeSingle()
  if (asiento) {
    const reversa = await generarAsientoReversa(supabase, asiento.id, `Anula Transferencia Bancaria ${tr.numero}`)
    if (!reversa.ok) return apiError(`No se generó la reversa del asiento: ${reversa.error}`, 409)
  }

  // 3. Marcar transferencia como cancelada
  const { error: eUpdTr } = await supabase
    .from("transferencias_bancarias")
    .update({ estado: "cancelado" })
    .eq("id", id)
  if (eUpdTr) return dbError(eUpdTr)

  return NextResponse.json({ ok: true })
}
