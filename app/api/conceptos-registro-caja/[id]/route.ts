import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/conceptos-registro-caja/[id]
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("conceptos_registro_caja")
    .select(
      "id, codigo, nombre, cuenta_contable_ingresos, cuenta_contable_egresos, requiere_observacion, visible_en_banco, visible_en_caja, visible_en_ajuste_cajas, visible_en_ajuste_banco, visible_en_transferencias, visible_en_cancelaciones, activo",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) return dbError(error)
  if (!data) return apiError("Concepto no encontrado", 404)
  return NextResponse.json(data)
}

// PUT /api/conceptos-registro-caja/[id]
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const supabase = await createClient()
  const update: Record<string, unknown> = {}
  if (body.codigo !== undefined) update.codigo = body.codigo
  if (body.nombre !== undefined) update.nombre = body.nombre
  if (body.cuenta_contable_ingresos !== undefined) update.cuenta_contable_ingresos = body.cuenta_contable_ingresos || null
  if (body.cuenta_contable_egresos !== undefined) update.cuenta_contable_egresos = body.cuenta_contable_egresos || null
  for (const flag of [
    "visible_en_ajuste_cajas",
    "visible_en_ajuste_banco",
    "visible_en_caja",
    "visible_en_banco",
    "visible_en_transferencias",
    "visible_en_cancelaciones",
    "requiere_observacion",
    "activo",
  ]) {
    if (body[flag] !== undefined) update[flag] = !!body[flag]
  }

  const { data, error } = await supabase
    .from("conceptos_registro_caja")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
