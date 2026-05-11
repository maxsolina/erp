import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/registros-banco/[id]/confirmar
//
// Por cada valor inserta un movimiento_banco egreso en la cuenta bancaria.
// Marca el registro como confirmado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: reg, error } = await supabase.from("registros_banco").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!reg) return apiError("Registro no encontrado", 404)
  if (reg.estado !== "borrador") return apiError("Solo se pueden confirmar registros en borrador", 409)

  const { data: vals } = await supabase
    .from("registro_banco_valores")
    .select("nombre, importe, moneda")
    .eq("registro_id", id)

  for (const valor of vals ?? []) {
    const { error: emov } = await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: reg.cuenta_bancaria_id,
      cuenta_bancaria_nombre: reg.cuenta_bancaria_nombre,
      tipo_movimiento: "egreso",
      importe: valor.importe,
      moneda: valor.moneda,
      tipo_operacion: valor.nombre || "Registro de Banco",
      concepto: "Registro de Banco",
      documento_origen_tipo: "registro_banco",
      documento_origen_id: reg.id,
      documento_origen_numero: reg.numero,
      conciliado: false,
    })
    if (emov) return dbError(emov)
  }

  const { error: eUpd } = await supabase
    .from("registros_banco")
    .update({ estado: "confirmado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
