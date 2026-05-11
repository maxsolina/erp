import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, caja_id, caja_nombre, sucursal, tipo_acreditacion, total_negociado, total_gastos, total_recibido, fecha, destino_tipo, proveedor_nombre, cuenta_bancaria_id, cuenta_bancaria_nombre, observaciones, estado"

interface ItemCheque {
  cheque_id: string
  valor_nombre?: string | null
  valor_id?: string | null
  importe?: number
}
interface Gasto {
  tipo?: string | null
  cuenta_contable?: string | null
  cuenta_analitica?: string | null
  descripcion?: string | null
  importe?: number
  impuestos?: number
  total?: number
  moneda?: string | null
}

const cleanItem = (i: ItemCheque, negId: string) => ({
  negociacion_id: negId,
  cheque_id: i.cheque_id,
  valor_nombre: i.valor_nombre ?? null,
  valor_id: i.valor_id || null,
  importe: Number(i.importe ?? 0),
})
const cleanGasto = (g: Gasto, negId: string) => ({
  negociacion_id: negId,
  tipo: g.tipo ?? "Cuenta Contable",
  cuenta_contable: g.cuenta_contable ?? null,
  cuenta_analitica: g.cuenta_analitica ?? null,
  descripcion: g.descripcion ?? null,
  importe: Number(g.importe ?? 0),
  impuestos: Number(g.impuestos ?? 0),
  total: Number(g.total ?? Number(g.importe ?? 0) + Number(g.impuestos ?? 0)),
  moneda: g.moneda ?? "ARS",
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data, error } = await supabase.from("negociaciones_cheques").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Negociación no encontrada", 404)

  const [{ data: items }, { data: gastos }, { data: devueltos }] = await Promise.all([
    supabase.from("negociacion_cheques_items").select("id, cheque_id, valor_nombre, valor_id, importe").eq("negociacion_id", id),
    supabase.from("negociacion_gastos").select("id, tipo, cuenta_contable, cuenta_analitica, descripcion, importe, impuestos, total, moneda").eq("negociacion_id", id),
    supabase.from("negociacion_cheques_devueltos").select("id, cheque_id, motivo_rechazo, fecha_rechazo, nd_generada_id").eq("negociacion_id", id),
  ])

  return NextResponse.json({ ...data, items: items ?? [], gastos: gastos ?? [], devueltos: devueltos ?? [] })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("negociaciones_cheques").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Negociación no encontrada", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar negociaciones en borrador", 409)

  const items: ItemCheque[] = Array.isArray(body.items) ? body.items : []
  const gastos: Gasto[] = Array.isArray(body.gastos) ? body.gastos : []
  const totalNeg = items.reduce((s, i) => s + Number(i.importe ?? 0), 0)
  const totalGas = gastos.reduce((s, g) => s + Number(g.total ?? Number(g.importe ?? 0) + Number(g.impuestos ?? 0)), 0)

  const update: Record<string, unknown> = {}
  if (body.caja_id !== undefined) {
    update.caja_id = body.caja_id
    const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_id).maybeSingle()
    if (c) update.caja_nombre = c.nombre
  }
  if (body.destino_tipo !== undefined) update.destino_tipo = body.destino_tipo
  if (body.proveedor_nombre !== undefined) {
    update.proveedor_nombre = body.destino_tipo === "proveedor" ? (body.proveedor_nombre || null) : null
  }
  if (body.cuenta_bancaria_id !== undefined) {
    if (body.destino_tipo === "banco" && body.cuenta_bancaria_id) {
      update.cuenta_bancaria_id = body.cuenta_bancaria_id
      const { data: cb } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_id).maybeSingle()
      update.cuenta_bancaria_nombre = cb ? `${cb.banco_nombre} - ${cb.numero_cuenta}` : null
    } else {
      update.cuenta_bancaria_id = null
      update.cuenta_bancaria_nombre = null
    }
  }
  for (const f of ["sucursal", "tipo_acreditacion", "fecha", "observaciones"]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  update.total_negociado = totalNeg
  update.total_gastos = totalGas
  update.total_recibido = totalNeg - totalGas

  const { data, error } = await supabase.from("negociaciones_cheques").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)

  await supabase.from("negociacion_cheques_items").delete().eq("negociacion_id", id)
  if (items.length > 0) {
    const { error: ei } = await supabase.from("negociacion_cheques_items").insert(items.map(i => cleanItem(i, id)))
    if (ei) return dbError(ei)
  }
  await supabase.from("negociacion_gastos").delete().eq("negociacion_id", id)
  if (gastos.length > 0) {
    const { error: eg } = await supabase.from("negociacion_gastos").insert(gastos.map(g => cleanGasto(g, id)))
    if (eg) return dbError(eg)
  }

  return NextResponse.json(data)
}
