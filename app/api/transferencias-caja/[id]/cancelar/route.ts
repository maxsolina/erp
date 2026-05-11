import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/transferencias-caja/[id]/cancelar
//
// Cancela una transferencia pendiente: marca ambos movimientos de caja como
// cancelados y la transferencia como cancelada.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase
    .from("transferencias_caja")
    .select("estado, comprobante_salida_id, comprobante_entrada_id")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "pendiente") return apiError("Solo se pueden cancelar transferencias pendientes", 409)

  const ids = [tr.comprobante_salida_id, tr.comprobante_entrada_id].filter(Boolean) as string[]
  if (ids.length > 0) {
    const { error: e1 } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "cancelado" })
      .in("id", ids)
    if (e1) return dbError(e1)
  }

  const { error: eUpd } = await supabase
    .from("transferencias_caja")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
