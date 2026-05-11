import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, nombre, codigo_causal, emite_cheques_diferidos, emite_cheques_corrientes, disponible_en_pagos, disponible_en_cobros, disponible_en_finanzas, activo"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("tipos_movimiento_bancario").select(SELECT).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Tipo de movimiento no encontrado", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.nombre !== undefined) update.nombre = body.nombre
  if (body.codigo_causal !== undefined) update.codigo_causal = body.codigo_causal
  for (const f of [
    "emite_cheques_diferidos", "emite_cheques_corrientes",
    "disponible_en_pagos", "disponible_en_cobros", "disponible_en_finanzas", "activo",
  ]) {
    if (body[f] !== undefined) update[f] = !!body[f]
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from("tipos_movimiento_bancario").update(update).eq("id", id).select(SELECT).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
