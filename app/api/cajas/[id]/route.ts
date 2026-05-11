import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, nombre, codigo, sucursal, cierre_diario_obligatorio, no_valida_cierre_sabados, no_valida_cierre_domingos, no_valida_cierre_feriados, activo"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("cajas").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Caja no encontrada", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.nombre !== undefined) update.nombre = body.nombre
  if (body.codigo !== undefined) update.codigo = body.codigo || null
  if (body.sucursal !== undefined) update.sucursal = body.sucursal
  for (const f of [
    "cierre_diario_obligatorio",
    "no_valida_cierre_sabados",
    "no_valida_cierre_domingos",
    "no_valida_cierre_feriados",
    "activo",
  ]) {
    if (body[f] !== undefined) update[f] = !!body[f]
  }
  update.updated_at = new Date().toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase.from("cajas").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
