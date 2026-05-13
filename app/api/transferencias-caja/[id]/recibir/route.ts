import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/transferencias-caja/[id]/recibir
//
// La caja destino confirma la recepción: pasa TODOS los movimientos ingreso
// de la transferencia (uno por cada línea de valor) de pendiente a confirmado,
// y la transferencia de pendiente a publicado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase
    .from("transferencias_caja")
    .select("estado")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "pendiente") return apiError("Solo se pueden recibir transferencias pendientes", 409)

  // Confirmar todos los movimientos de entrada de las líneas multi-valor.
  const { data: lineas } = await supabase
    .from("transferencia_caja_valores")
    .select("comprobante_entrada_id")
    .eq("transferencia_id", id)
  const movIds = (lineas ?? []).map((l: any) => l.comprobante_entrada_id).filter(Boolean)
  if (movIds.length > 0) {
    const { error: e1 } = await supabase
      .from("movimientos_caja")
      .update({ estado_movimiento: "confirmado" })
      .in("id", movIds)
    if (e1) return dbError(e1)
  }

  const { error: eUpd } = await supabase
    .from("transferencias_caja")
    .update({ estado: "publicado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
