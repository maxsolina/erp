import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/registros-caja/[id]/cancelar
//
// Cancela un registro confirmado:
//   1. Busca los movimientos_caja generados y verifica que sus extractos sigan abiertos.
//   2. Marca los movimientos como `cancelado` (NO los borra — quedan visibles tachados).
//   3. Marca el registro como `cancelado` (estado terminal).
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: reg, error } = await supabase.from("registros_caja").select("estado").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!reg) return apiError("Registro no encontrado", 404)
  if (reg.estado !== "confirmado") return apiError("Solo se pueden cancelar registros confirmados", 409)

  // 1. Buscar movimientos y verificar extractos abiertos.
  const { data: movs, error: eMov } = await supabase
    .from("movimientos_caja")
    .select("id, extracto_id")
    .eq("documento_origen_tipo", "registro_caja")
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
      return apiError("No se puede cancelar: el extracto de caja donde se asentaron los movimientos ya está cerrado", 409)
    }
  }

  // 2. Marcar movs como cancelados.
  if ((movs ?? []).length > 0) {
    const { error: eUpdMov } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "cancelado" })
      .eq("documento_origen_tipo", "registro_caja")
      .eq("documento_origen_id", id)
    if (eUpdMov) return dbError(eUpdMov)
  }

  // 3. Marcar registro como cancelado.
  const { error: eUpd } = await supabase
    .from("registros_caja")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
