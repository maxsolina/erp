import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, caja_id, caja_nombre, sucursal, concepto_id, concepto_nombre, tipo_ajuste, importe, fecha, cuenta_analitica, es_automatico, observaciones, estado"

interface ValorLinea { valor_id: string; valor_nombre: string; tipo_movimiento: "entrada" | "salida"; importe: number }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data, error } = await supabase.from("ajustes_caja").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Ajuste no encontrado", 404)

  const { data: vals } = await supabase
    .from("ajuste_caja_valores")
    .select("id, valor_id, valor_nombre, tipo_movimiento, importe")
    .eq("ajuste_id", id)

  return NextResponse.json({ ...data, valores: vals ?? [] })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("ajustes_caja").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Ajuste no encontrado", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar ajustes en borrador", 409)

  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  const importeTotal = valores.length > 0
    ? valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)
    : Number(body.importe ?? 0)

  const update: Record<string, unknown> = {}
  if (body.caja_id !== undefined) {
    update.caja_id = body.caja_id
    const { data: cj } = await supabase.from("cajas").select("nombre, sucursal").eq("id", body.caja_id).maybeSingle()
    if (cj) {
      update.caja_nombre = cj.nombre
      if (body.sucursal === undefined) update.sucursal = cj.sucursal
    }
  }
  if (body.concepto_id !== undefined) {
    update.concepto_id = body.concepto_id
    const { data: c } = await supabase.from("conceptos_registro_caja").select("nombre").eq("id", body.concepto_id).maybeSingle()
    if (c) update.concepto_nombre = c.nombre
  }
  if (importeTotal > 0) update.importe = importeTotal
  for (const f of ["sucursal", "tipo_ajuste", "fecha", "observaciones", "es_automatico"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  if (body.cuenta_analitica !== undefined) update.cuenta_analitica = body.cuenta_analitica || null

  const { data, error } = await supabase.from("ajustes_caja").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)

  await supabase.from("ajuste_caja_valores").delete().eq("ajuste_id", id)
  if (valores.length > 0) {
    const filas = valores.map(v => ({
      ajuste_id: id,
      valor_id: v.valor_id,
      valor_nombre: v.valor_nombre,
      tipo_movimiento: v.tipo_movimiento,
      importe: v.importe,
    }))
    const { error: vErr } = await supabase.from("ajuste_caja_valores").insert(filas)
    if (vErr) return dbError(vErr)
  }

  return NextResponse.json(data)
}
