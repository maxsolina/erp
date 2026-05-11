import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, desde_cuenta_id, desde_cuenta_nombre, hasta_cuenta_id, hasta_cuenta_nombre, sucursal, importe_origen, tipo_operacion_origen, numero_operacion_origen, fecha_operacion_origen, tipo_operacion_destino, numero_operacion_destino, fecha_operacion_destino, observaciones, estado"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("transferencias_bancarias").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Transferencia no encontrada", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("transferencias_bancarias").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Transferencia no encontrada", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar en borrador", 409)

  const update: Record<string, unknown> = {}
  if (body.desde_cuenta_id !== undefined) {
    update.desde_cuenta_id = body.desde_cuenta_id
    const { data: c } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.desde_cuenta_id).maybeSingle()
    if (c) update.desde_cuenta_nombre = `${c.banco_nombre} - ${c.numero_cuenta}`
  }
  if (body.hasta_cuenta_id !== undefined) {
    update.hasta_cuenta_id = body.hasta_cuenta_id
    const { data: c } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.hasta_cuenta_id).maybeSingle()
    if (c) update.hasta_cuenta_nombre = `${c.banco_nombre} - ${c.numero_cuenta}`
  }
  for (const f of ["sucursal", "importe_origen", "tipo_operacion_origen", "tipo_operacion_destino", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  for (const f of ["numero_operacion_origen", "fecha_operacion_origen", "numero_operacion_destino", "fecha_operacion_destino"]) {
    if (body[f] !== undefined) update[f] = body[f] || null
  }

  const { data, error } = await supabase.from("transferencias_bancarias").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
