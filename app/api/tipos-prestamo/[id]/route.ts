import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, nombre, cuenta_prestamo, cuenta_intereses, cuenta_intereses_devengar, cuenta_iva_devengar, cuenta_percepciones_devengar, cuenta_refinanciacion, cuenta_preexistente, concepto_liquidacion, activo"

const NULLABLE_FIELDS = [
  "cuenta_prestamo",
  "cuenta_intereses",
  "cuenta_intereses_devengar",
  "cuenta_iva_devengar",
  "cuenta_percepciones_devengar",
  "cuenta_refinanciacion",
  "cuenta_preexistente",
  "concepto_liquidacion",
]

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("tipos_prestamo").select(SELECT).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Tipo de préstamo no encontrado", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.nombre !== undefined) update.nombre = body.nombre
  for (const f of NULLABLE_FIELDS) {
    if (body[f] !== undefined) update[f] = (body[f] && String(body[f]).trim() ? String(body[f]).trim() : null)
  }
  if (body.activo !== undefined) update.activo = !!body.activo

  const supabase = await createClient()
  const { data, error } = await supabase.from("tipos_prestamo").update(update).eq("id", id).select(SELECT).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
