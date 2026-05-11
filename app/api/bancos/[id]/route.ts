import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, codigo, nombre, direccion, telefono, email, activo"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("bancos").select(SELECT).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Banco no encontrado", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.codigo !== undefined) update.codigo = body.codigo
  if (body.nombre !== undefined) update.nombre = body.nombre
  if (body.direccion !== undefined) update.direccion = body.direccion || null
  if (body.telefono !== undefined) update.telefono = body.telefono || null
  if (body.email !== undefined) update.email = body.email || null
  if (body.activo !== undefined) update.activo = !!body.activo

  const supabase = await createClient()
  const { data, error } = await supabase.from("bancos").update(update).eq("id", id).select(SELECT).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
