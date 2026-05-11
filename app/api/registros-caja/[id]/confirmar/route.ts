import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/registros-caja/[id]/confirmar
//
// Verifica extracto abierto y por cada valor del registro inserta un
// movimiento_caja egreso confirmado. Marca el registro como confirmado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: reg, error } = await supabase.from("registros_caja").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!reg) return apiError("Registro no encontrado", 404)
  if (reg.estado !== "borrador") return apiError("Solo se pueden confirmar registros en borrador", 409)

  const extracto = await getExtractoAbierto(supabase, reg.caja_id, reg.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const { data: vals } = await supabase
    .from("registro_caja_valores")
    .select("valor_id, valor_nombre, importe, moneda")
    .eq("registro_id", id)

  for (const valor of vals ?? []) {
    const { error: emov } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: valor.valor_id,
      valor_nombre: valor.valor_nombre,
      tipo_movimiento: "egreso",
      importe: valor.importe,
      moneda: valor.moneda,
      concepto: "Registro de Caja",
      documento_origen_tipo: "registro_caja",
      documento_origen_id: reg.id,
      documento_origen_numero: reg.numero,
      estado_movimiento: "confirmado",
    })
    if (emov) return dbError(emov)
  }

  const { error: eUpd } = await supabase
    .from("registros_caja")
    .update({ estado: "confirmado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
