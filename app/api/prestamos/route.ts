import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, tipo_nombre, entidad_nombre, nro_prestamo, moneda, capital, capital_pendiente, total, saldo, fecha, cantidad_cuotas, estado"
const SELECT_FULL = "id, numero, tipo_id, tipo_nombre, entidad_id, entidad_nombre, nro_prestamo, moneda, capital, tasa_porcentaje, capital_pendiente, intereses_total, iva, percepcion_iva, percepcion_iibb, otros_gastos, total, saldo, fecha, sucursal, caja_id, caja_nombre, sistema_amortizacion, es_preexistente, cantidad_cuotas, periodicidad, fecha_primera_cuota, importe_refinanciado, importe_acreditado, tipo_garante, garante, forma_pago, tipo_tasa, distribucion_pago, periodo_gracia, observaciones, estado"

// GET /api/prestamos
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("prestamos")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/prestamos — crea préstamo en borrador.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.capital || body.capital <= 0) return apiError("Capital inválido", 400)
  if (!body.fecha) return apiError("Fecha es requerida", 400)
  if (!body.cantidad_cuotas || body.cantidad_cuotas <= 0) return apiError("Cantidad de cuotas inválida", 400)

  const supabase = await createClient()
  let tipoNombre: string | null = null
  if (body.tipo_id) {
    const { data: t } = await supabase.from("tipos_prestamo").select("nombre").eq("id", body.tipo_id).maybeSingle()
    tipoNombre = t?.nombre ?? null
  }
  let entidadNombre: string | null = null
  if (body.entidad_id) {
    const { data: e } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.entidad_id).maybeSingle()
    if (e) entidadNombre = `${e.banco_nombre} - ${e.numero_cuenta}`
  }
  let cajaNombre: string | null = null
  if (body.caja_id) {
    const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_id).maybeSingle()
    cajaNombre = c?.nombre ?? null
  }

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_prestamo", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("prestamos")
    .insert({
      numero: numero || `PRES-${Date.now()}`,
      tipo_id: body.tipo_id || null,
      tipo_nombre: tipoNombre ?? "",
      entidad_id: body.entidad_id || null,
      entidad_nombre: entidadNombre ?? "",
      nro_prestamo: body.nro_prestamo ?? "",
      moneda: body.moneda ?? "ARS",
      capital: body.capital,
      tasa_porcentaje: body.tasa_porcentaje ?? 0,
      iva: body.iva ?? 0,
      percepcion_iva: body.percepcion_iva ?? 0,
      percepcion_iibb: body.percepcion_iibb ?? 0,
      otros_gastos: body.otros_gastos ?? 0,
      fecha: body.fecha,
      sucursal,
      caja_id: body.caja_id || null,
      caja_nombre: cajaNombre ?? "",
      sistema_amortizacion: body.sistema_amortizacion ?? "frances",
      es_preexistente: !!body.es_preexistente,
      cantidad_cuotas: body.cantidad_cuotas,
      periodicidad: body.periodicidad ?? "mensual",
      fecha_primera_cuota: body.fecha_primera_cuota || null,
      importe_refinanciado: body.importe_refinanciado ?? 0,
      importe_acreditado: body.importe_acreditado ?? 0,
      tipo_garante: body.tipo_garante ?? "",
      garante: body.garante ?? "",
      forma_pago: body.forma_pago ?? "",
      tipo_tasa: body.tipo_tasa ?? "",
      distribucion_pago: body.distribucion_pago ?? "Proporcional",
      periodo_gracia: body.periodo_gracia ?? 0,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
