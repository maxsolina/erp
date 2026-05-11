import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, cuenta_bancaria_id, cuenta_bancaria_nombre, sucursal, caja_egreso_id, caja_egreso_nombre, importe, tipo_operacion, numero_operacion, fecha_operacion, observaciones, estado"

interface ValorLinea { valor_id: string; valor_nombre: string; importe: number }

// GET /api/depositos-bancarios/[id] — incluye `valores` (líneas).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data, error } = await supabase.from("depositos_bancarios").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Depósito no encontrado", 404)

  const { data: vals } = await supabase
    .from("deposito_bancario_valores")
    .select("id, valor_id, valor_nombre, importe")
    .eq("deposito_id", id)

  return NextResponse.json({ ...data, valores: vals ?? [] })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("depositos_bancarios").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Depósito no encontrado", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar depósitos en borrador", 409)

  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  const importeTotal = valores.length > 0
    ? valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)
    : Number(body.importe ?? 0)

  const update: Record<string, unknown> = {}
  if (body.cuenta_bancaria_id !== undefined) {
    update.cuenta_bancaria_id = body.cuenta_bancaria_id
    const { data: c } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_id).maybeSingle()
    if (c) update.cuenta_bancaria_nombre = `${c.banco_nombre} - ${c.numero_cuenta}`
  }
  if (body.caja_egreso_id !== undefined) {
    update.caja_egreso_id = body.caja_egreso_id
    const { data: cj } = await supabase.from("cajas").select("nombre").eq("id", body.caja_egreso_id).maybeSingle()
    if (cj) update.caja_egreso_nombre = cj.nombre
  }
  if (importeTotal > 0) update.importe = importeTotal
  for (const f of ["sucursal", "tipo_operacion", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  for (const f of ["numero_operacion", "fecha_operacion"]) {
    if (body[f] !== undefined) update[f] = body[f] || null
  }

  const { data, error } = await supabase.from("depositos_bancarios").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)

  await supabase.from("deposito_bancario_valores").delete().eq("deposito_id", id)
  if (valores.length > 0) {
    const filas = valores.map(v => ({
      deposito_id: id,
      valor_id: v.valor_id,
      valor_nombre: v.valor_nombre,
      importe: v.importe,
    }))
    const { error: vErr } = await supabase.from("deposito_bancario_valores").insert(filas)
    if (vErr) return dbError(vErr)
  }

  return NextResponse.json(data)
}
