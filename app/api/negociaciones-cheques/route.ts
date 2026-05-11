import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, caja_nombre, sucursal, tipo_acreditacion, total_negociado, total_gastos, total_recibido, fecha, destino_tipo, proveedor_nombre, cuenta_bancaria_nombre, estado"
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

// GET /api/negociaciones-cheques
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("negociaciones_cheques")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/negociaciones-cheques
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.caja_id) return apiError("caja_id es requerido", 400)
  if (!body.fecha) return apiError("fecha es requerida", 400)

  const items: ItemCheque[] = Array.isArray(body.items) ? body.items : []
  const gastos: Gasto[] = Array.isArray(body.gastos) ? body.gastos : []

  const supabase = await createClient()
  const [{ data: caja }, cuenta] = await Promise.all([
    supabase.from("cajas").select("nombre").eq("id", body.caja_id).maybeSingle(),
    body.cuenta_bancaria_id
      ? supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  if (!caja) return apiError("Caja inválida", 400)

  const totalNeg = items.reduce((s, i) => s + Number(i.importe ?? 0), 0)
  const totalGas = gastos.reduce((s, g) => s + Number(g.total ?? Number(g.importe ?? 0) + Number(g.impuestos ?? 0)), 0)

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_negociacion", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("negociaciones_cheques")
    .insert({
      numero: numero || `NCHQ-${Date.now()}`,
      caja_id: body.caja_id,
      caja_nombre: caja.nombre,
      sucursal,
      tipo_acreditacion: body.tipo_acreditacion ?? "neto",
      fecha: body.fecha,
      destino_tipo: body.destino_tipo ?? "banco",
      proveedor_nombre: body.destino_tipo === "proveedor" ? (body.proveedor_nombre || null) : null,
      cuenta_bancaria_id: body.destino_tipo === "banco" ? (body.cuenta_bancaria_id || null) : null,
      cuenta_bancaria_nombre: body.destino_tipo === "banco" && cuenta.data ? `${cuenta.data.banco_nombre} - ${cuenta.data.numero_cuenta}` : null,
      total_negociado: totalNeg,
      total_gastos: totalGas,
      total_recibido: totalNeg - totalGas,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()
  if (error) return dbError(error)

  const id = (data as { id: string }).id
  if (items.length > 0) {
    const { error: ei } = await supabase.from("negociacion_cheques_items").insert(items.map(i => cleanItem(i, id)))
    if (ei) return dbError(ei)
  }
  if (gastos.length > 0) {
    const { error: eg } = await supabase.from("negociacion_gastos").insert(gastos.map(g => cleanGasto(g, id)))
    if (eg) return dbError(eg)
  }

  return NextResponse.json(data, { status: 201 })
}
