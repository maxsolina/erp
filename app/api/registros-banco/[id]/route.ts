import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, cuenta_bancaria_id, cuenta_bancaria_nombre, sucursal, concepto_id, concepto_nombre, moneda, total_comprobantes, total_valores, fecha, observaciones, estado"

interface Comprobante {
  descripcion?: string | null
  cuenta_contable?: string | null
  cuenta_analitica?: string | null
  importe?: number
  impuestos?: number
}
interface ValorLinea {
  nombre?: string | null
  importe?: number
  moneda?: string | null
  importe_comprobante?: number
  moneda_comprobante?: string | null
}

const cleanComp = (c: Comprobante, registroId: string) => ({
  registro_id: registroId,
  descripcion: c.descripcion ?? null,
  cuenta_contable: c.cuenta_contable ?? null,
  cuenta_analitica: c.cuenta_analitica ?? null,
  importe: Number(c.importe ?? 0),
  impuestos: Number(c.impuestos ?? 0),
  total: Number(c.importe ?? 0) + Number(c.impuestos ?? 0),
})
const cleanVal = (v: ValorLinea, registroId: string) => ({
  registro_id: registroId,
  nombre: v.nombre ?? null,
  importe_comprobante: Number(v.importe_comprobante ?? 0),
  moneda_comprobante: v.moneda_comprobante ?? null,
  importe: Number(v.importe ?? 0),
  moneda: v.moneda ?? null,
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data, error } = await supabase.from("registros_banco").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Registro no encontrado", 404)

  const [{ data: comps }, { data: vals }] = await Promise.all([
    supabase.from("registro_banco_comprobantes").select("id, descripcion, cuenta_contable, cuenta_analitica, importe, impuestos, total").eq("registro_id", id),
    supabase.from("registro_banco_valores").select("id, nombre, importe_comprobante, moneda_comprobante, importe, moneda").eq("registro_id", id),
  ])

  return NextResponse.json({ ...data, comprobantes: comps ?? [], valores: vals ?? [] })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("registros_banco").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Registro no encontrado", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar registros en borrador", 409)

  const comprobantes: Comprobante[] = Array.isArray(body.comprobantes) ? body.comprobantes : []
  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  const totalC = comprobantes.reduce((s, c) => s + Number(c.importe ?? 0) + Number(c.impuestos ?? 0), 0)
  const totalV = valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)

  const update: Record<string, unknown> = {}
  if (body.cuenta_bancaria_id !== undefined) {
    update.cuenta_bancaria_id = body.cuenta_bancaria_id
    const { data: c } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_id).maybeSingle()
    if (c) update.cuenta_bancaria_nombre = `${c.banco_nombre} - ${c.numero_cuenta}`
  }
  if (body.concepto_id !== undefined) {
    update.concepto_id = body.concepto_id
    const { data: co } = await supabase.from("conceptos_registro_caja").select("nombre").eq("id", body.concepto_id).maybeSingle()
    if (co) update.concepto_nombre = co.nombre
  }
  for (const f of ["sucursal", "moneda", "fecha", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  update.total_comprobantes = totalC
  update.total_valores = totalV
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from("registros_banco").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)

  await supabase.from("registro_banco_comprobantes").delete().eq("registro_id", id)
  if (comprobantes.length > 0) {
    const { error: ec } = await supabase.from("registro_banco_comprobantes").insert(comprobantes.map(c => cleanComp(c, id)))
    if (ec) return dbError(ec)
  }
  await supabase.from("registro_banco_valores").delete().eq("registro_id", id)
  if (valores.length > 0) {
    const { error: ev } = await supabase.from("registro_banco_valores").insert(valores.map(v => cleanVal(v, id)))
    if (ev) return dbError(ev)
  }

  return NextResponse.json(data)
}
