import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/depositos-bancarios/[id]/cancelar
//
// Cancela un depósito publicado:
//   1. Verifica que los extractos de caja afectados sigan abiertos.
//   2. Marca movimientos_caja como `cancelado` (no se borran).
//   3. Marca movimiento_banco como `cancelado`.
//   4. Genera asiento reversa (DEBE ↔ HABER invertidos).
//   5. Marca depósito como `cancelado` (estado terminal).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: dep, error } = await supabase
    .from("depositos_bancarios")
    .select("id, numero, estado")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!dep) return apiError("Depósito no encontrado", 404)
  if (dep.estado !== "publicado") return apiError("Solo se pueden cancelar depósitos publicados", 409)

  // 1. Verificar extractos de caja abiertos
  const { data: movsCaja, error: eMov } = await supabase
    .from("movimientos_caja")
    .select("id, extracto_id")
    .eq("documento_origen_tipo", "deposito")
    .eq("documento_origen_id", id)
  if (eMov) return dbError(eMov)

  const extractoIds = [...new Set((movsCaja ?? []).map(m => m.extracto_id).filter(Boolean))] as string[]
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

  // 2. Marcar movimientos_caja como cancelados
  if ((movsCaja ?? []).length > 0) {
    const { error: eUpd } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "cancelado" })
      .eq("documento_origen_tipo", "deposito")
      .eq("documento_origen_id", id)
    if (eUpd) return dbError(eUpd)
  }

  // 3. Marcar movimiento_banco como cancelado
  const { error: eBan } = await supabase
    .from("movimientos_banco")
    .update({ estado_movimiento: "cancelado" })
    .eq("documento_origen_tipo", "deposito")
    .eq("documento_origen_id", id)
  if (eBan) return dbError(eBan)

  // 4. Generar reversa del asiento
  const { data: asiento } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "deposito_bancario")
    .eq("referencia", dep.numero)
    .is("asiento_reversion_id", null)
    .maybeSingle()
  if (asiento) {
    const reversa = await generarAsientoReversa(supabase, asiento.id, `Anula Depósito ${dep.numero}`)
    if (!reversa.ok) return apiError(`No se generó la reversa del asiento: ${reversa.error}`, 409)
  }

  // 5. Marcar depósito como cancelado
  const { error: eUpdDep } = await supabase
    .from("depositos_bancarios")
    .update({ estado: "cancelado" })
    .eq("id", id)
  if (eUpdDep) return dbError(eUpdDep)

  return NextResponse.json({ ok: true })
}
