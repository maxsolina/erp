import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, caja_id, caja_nombre, sucursal, valor_origen_id, valor_origen_nombre, moneda_origen, importe_origen, valor_destino_id, valor_destino_nombre, moneda_destino, importe_destino, tipo_cotizacion, cotizacion, diferencia_redondeo, fecha, observaciones, estado"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("conversiones_moneda").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Conversión no encontrada", 404)
  return NextResponse.json(data)
}

// PUT /api/conversiones-moneda/[id] — edita una conversión en borrador.
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("conversiones_moneda").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Conversión no encontrada", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar conversiones en borrador", 409)

  // Resolver nombres si cambian los IDs.
  const update: Record<string, unknown> = {}
  if (body.caja_id !== undefined) {
    update.caja_id = body.caja_id
    const { data: caja } = await supabase.from("cajas").select("nombre, sucursal").eq("id", body.caja_id).maybeSingle()
    if (caja) {
      update.caja_nombre = caja.nombre
      if (body.sucursal === undefined) update.sucursal = caja.sucursal
    }
  }
  if (body.valor_origen_id !== undefined) {
    update.valor_origen_id = body.valor_origen_id
    const { data: v } = await supabase.from("caja_valores").select("nombre, moneda").eq("id", body.valor_origen_id).maybeSingle()
    if (v) { update.valor_origen_nombre = v.nombre; update.moneda_origen = v.moneda }
  }
  if (body.valor_destino_id !== undefined) {
    update.valor_destino_id = body.valor_destino_id
    const { data: v } = await supabase.from("caja_valores").select("nombre, moneda").eq("id", body.valor_destino_id).maybeSingle()
    if (v) { update.valor_destino_nombre = v.nombre; update.moneda_destino = v.moneda }
  }

  for (const f of ["sucursal", "importe_origen", "importe_destino", "tipo_cotizacion", "cotizacion", "diferencia_redondeo", "fecha", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }

  const { data, error } = await supabase.from("conversiones_moneda").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
