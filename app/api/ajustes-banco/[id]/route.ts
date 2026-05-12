import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, cuenta_bancaria_id, cuenta_bancaria_nombre, sucursal, concepto_id, concepto_nombre, importe, fecha, cuenta_analitica, observaciones, estado"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("ajustes_banco").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Ajuste no encontrado", 404)
  return NextResponse.json(data)
}

// PUT /api/ajustes-banco/[id] — actualiza un ajuste en borrador.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const supabase = await createClient()
  const { data: actual } = await supabase.from("ajustes_banco").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Ajuste no encontrado", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar ajustes en borrador", 409)

  const update: Record<string, unknown> = {}
  if (body.cuenta_bancaria_id !== undefined) {
    update.cuenta_bancaria_id = body.cuenta_bancaria_id
    const { data: c } = await supabase
      .from("cuentas_bancarias")
      .select("banco_nombre, numero_cuenta")
      .eq("id", body.cuenta_bancaria_id)
      .maybeSingle()
    if (c) update.cuenta_bancaria_nombre = `${c.banco_nombre} - ${c.numero_cuenta}`
  } else if (body.cuenta_bancaria_nombre !== undefined) {
    update.cuenta_bancaria_nombre = body.cuenta_bancaria_nombre
  }
  if (body.concepto_id !== undefined) {
    update.concepto_id = body.concepto_id
    const { data: concepto } = await supabase
      .from("conceptos_registro_caja")
      .select("nombre")
      .eq("id", body.concepto_id)
      .maybeSingle()
    update.concepto_nombre = concepto?.nombre ?? ""
  }
  if (body.importe !== undefined) update.importe = body.importe
  if (body.fecha !== undefined) update.fecha = body.fecha
  if (body.sucursal !== undefined) update.sucursal = body.sucursal
  if (body.cuenta_analitica !== undefined) update.cuenta_analitica = body.cuenta_analitica || null
  if (body.observaciones !== undefined) update.observaciones = body.observaciones

  const { data, error } = await supabase.from("ajustes_banco").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
