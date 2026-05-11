import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/ajustes-caja/[id]/publicar
//
// Por cada línea de ajuste_caja_valores inserta un movimiento_caja:
//   tipo_movimiento "entrada" → ingreso
//   tipo_movimiento "salida"  → egreso
// Marca el ajuste como publicado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: aj, error } = await supabase.from("ajustes_caja").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!aj) return apiError("Ajuste no encontrado", 404)
  if (aj.estado !== "borrador") return apiError("Solo se pueden publicar ajustes en borrador", 409)

  const extracto = await getExtractoAbierto(supabase, aj.caja_id, aj.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const { data: vals } = await supabase
    .from("ajuste_caja_valores")
    .select("valor_id, valor_nombre, tipo_movimiento, importe")
    .eq("ajuste_id", id)

  for (const linea of vals ?? []) {
    const { error: e1 } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: linea.valor_id,
      valor_nombre: linea.valor_nombre,
      tipo_movimiento: linea.tipo_movimiento === "entrada" ? "ingreso" : "egreso",
      importe: linea.importe,
      concepto: aj.concepto_nombre,
      documento_origen_tipo: "ajuste_caja",
      documento_origen_id: aj.id,
      documento_origen_numero: aj.numero,
    })
    if (e1) return dbError(e1)
  }

  const { error: eUpd } = await supabase.from("ajustes_caja").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
