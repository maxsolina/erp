import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, sucursal, caja_desde_id, caja_desde_nombre, caja_hasta_id, caja_hasta_nombre, valor_id, valor_nombre, importe, concepto, fecha, observaciones, estado, comprobante_salida_id, comprobante_entrada_id"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("transferencias_caja").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Transferencia no encontrada", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("transferencias_caja").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Transferencia no encontrada", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar en borrador", 409)

  const update: Record<string, unknown> = {}
  if (body.caja_desde_id !== undefined) {
    update.caja_desde_id = body.caja_desde_id
    const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_desde_id).maybeSingle()
    if (c) update.caja_desde_nombre = c.nombre
  }
  if (body.caja_hasta_id !== undefined) {
    update.caja_hasta_id = body.caja_hasta_id
    const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_hasta_id).maybeSingle()
    if (c) update.caja_hasta_nombre = c.nombre
  }
  if (body.valor_id !== undefined) {
    update.valor_id = body.valor_id
    const { data: v } = await supabase.from("caja_valores").select("nombre").eq("id", body.valor_id).maybeSingle()
    if (v) update.valor_nombre = v.nombre
  }
  for (const f of ["sucursal", "importe", "concepto", "fecha", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }

  const { data, error } = await supabase.from("transferencias_caja").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
