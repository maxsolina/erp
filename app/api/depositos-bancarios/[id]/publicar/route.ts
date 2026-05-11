import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/depositos-bancarios/[id]/publicar
//
// Workflow:
//   1. Verifica extracto abierto para caja_egreso.
//   2. Por cada valor línea, inserta movimiento_caja egreso.
//   3. Inserta movimiento_banco ingreso por el total en la cuenta destino.
//   4. Marca depósito como publicado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: dep, error } = await supabase
    .from("depositos_bancarios")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!dep) return apiError("Depósito no encontrado", 404)
  if (dep.estado !== "borrador") return apiError("Solo se pueden publicar depósitos en borrador", 409)

  const extracto = await getExtractoAbierto(supabase, dep.caja_egreso_id, dep.caja_egreso_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const { data: vals } = await supabase
    .from("deposito_bancario_valores")
    .select("valor_id, valor_nombre, importe")
    .eq("deposito_id", id)

  for (const valor of vals ?? []) {
    const { data: vc } = await supabase
      .from("caja_valores")
      .select("moneda")
      .eq("id", valor.valor_id)
      .maybeSingle()

    const { error: e1 } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: valor.valor_id,
      valor_nombre: valor.valor_nombre,
      tipo_movimiento: "egreso",
      importe: valor.importe,
      moneda: vc?.moneda,
      concepto: `Depósito a ${dep.cuenta_bancaria_nombre}`,
      documento_origen_tipo: "deposito",
      documento_origen_id: dep.id,
      documento_origen_numero: dep.numero,
      estado_movimiento: "confirmado",
    })
    if (e1) return dbError(e1)
  }

  const { data: cuenta } = await supabase
    .from("cuentas_bancarias")
    .select("moneda")
    .eq("id", dep.cuenta_bancaria_id)
    .maybeSingle()

  const { error: e2 } = await supabase.from("movimientos_banco").insert({
    cuenta_bancaria_id: dep.cuenta_bancaria_id,
    cuenta_bancaria_nombre: dep.cuenta_bancaria_nombre,
    tipo_movimiento: "ingreso",
    importe: dep.importe,
    moneda: cuenta?.moneda || "ARS",
    tipo_operacion: "Depósito",
    concepto: `Depósito desde ${dep.caja_egreso_nombre}`,
    documento_origen_tipo: "deposito",
    documento_origen_id: dep.id,
    documento_origen_numero: dep.numero,
    conciliado: false,
  })
  if (e2) return dbError(e2)

  const { error: eUpd } = await supabase.from("depositos_bancarios").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
