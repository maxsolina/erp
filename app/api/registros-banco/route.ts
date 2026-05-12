import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, cuenta_bancaria_nombre, sucursal, concepto_nombre, moneda, cotizacion, tipo_cotizacion, total_comprobantes, total_valores, fecha, estado"
const SELECT_FULL = "id, numero, cuenta_bancaria_id, cuenta_bancaria_nombre, sucursal, concepto_id, concepto_nombre, moneda, cotizacion, tipo_cotizacion, total_comprobantes, total_valores, fecha, observaciones, estado"

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

// GET /api/registros-banco
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("registros_banco")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/registros-banco — crea registro + comprobantes + valores.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.cuenta_bancaria_id) return apiError("cuenta_bancaria_id es requerido", 400)
  if (!body.concepto_id) return apiError("concepto_id es requerido", 400)
  if (!body.fecha) return apiError("fecha es requerida", 400)
  const comprobantes: Comprobante[] = Array.isArray(body.comprobantes) ? body.comprobantes : []
  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  if (comprobantes.length === 0) return apiError("Agregar al menos un comprobante", 400)

  const supabase = await createClient()
  const [{ data: cuenta }, { data: concepto }] = await Promise.all([
    supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_id).maybeSingle(),
    supabase.from("conceptos_registro_caja").select("nombre, requiere_observacion").eq("id", body.concepto_id).maybeSingle(),
  ])
  if (!cuenta || !concepto) return apiError("Cuenta bancaria o concepto inválido", 400)
  if (concepto.requiere_observacion && !(body.observaciones ?? "").trim()) {
    return apiError("El concepto requiere observación", 400)
  }

  const registroMoneda = (body.moneda ?? "ARS") as string
  const cotizacion = Number(body.cotizacion ?? 0)
  const aMonedaRegistro = (importe: number, monedaValor?: string | null): number => {
    const mv = monedaValor || registroMoneda
    if (mv === registroMoneda) return importe
    if (cotizacion <= 0) return importe
    if (registroMoneda === "ARS" && mv !== "ARS") return importe * cotizacion
    if (registroMoneda !== "ARS" && mv === "ARS") return importe / cotizacion
    return importe
  }
  const totalC = comprobantes.reduce((s, c) => s + Number(c.importe ?? 0) + Number(c.impuestos ?? 0), 0)
  const totalV = valores.reduce((s, v) => s + aMonedaRegistro(Number(v.importe ?? 0), v.moneda), 0)

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_registro_banco", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("registros_banco")
    .insert({
      numero,
      cuenta_bancaria_id: body.cuenta_bancaria_id,
      cuenta_bancaria_nombre: `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}`,
      sucursal,
      concepto_id: body.concepto_id,
      concepto_nombre: concepto.nombre,
      moneda: body.moneda ?? "ARS",
      cotizacion: body.cotizacion ?? null,
      tipo_cotizacion: body.tipo_cotizacion ?? null,
      fecha: body.fecha,
      observaciones: body.observaciones ?? "",
      total_comprobantes: totalC,
      total_valores: totalV,
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()
  if (error) return dbError(error)

  const id = (data as { id: string }).id
  if (comprobantes.length > 0) {
    const { error: ec } = await supabase.from("registro_banco_comprobantes").insert(comprobantes.map(c => cleanComp(c, id)))
    if (ec) return dbError(ec)
  }
  if (valores.length > 0) {
    const { error: ev } = await supabase.from("registro_banco_valores").insert(valores.map(v => cleanVal(v, id)))
    if (ev) return dbError(ev)
  }

  return NextResponse.json(data, { status: 201 })
}
