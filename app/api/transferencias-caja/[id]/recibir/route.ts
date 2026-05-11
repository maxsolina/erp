import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/transferencias-caja/[id]/recibir
//
// La caja destino confirma la recepción: pasa el movimiento ingreso de
// pendiente a confirmado, y la transferencia de pendiente a publicado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase
    .from("transferencias_caja")
    .select("estado, comprobante_entrada_id")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "pendiente") return apiError("Solo se pueden recibir transferencias pendientes", 409)

  if (tr.comprobante_entrada_id) {
    const { error: e1 } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "confirmado" })
      .eq("id", tr.comprobante_entrada_id)
    if (e1) return dbError(e1)
  }

  const { error: eUpd } = await supabase
    .from("transferencias_caja")
    .update({ estado: "publicado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
