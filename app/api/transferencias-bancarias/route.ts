import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, desde_cuenta_nombre, hasta_cuenta_nombre, sucursal, importe_origen, fecha_operacion_origen, estado"
const SELECT_FULL = "id, numero, desde_cuenta_id, desde_cuenta_nombre, hasta_cuenta_id, hasta_cuenta_nombre, sucursal, importe_origen, tipo_operacion_origen, numero_operacion_origen, fecha_operacion_origen, tipo_operacion_destino, numero_operacion_destino, fecha_operacion_destino, observaciones, estado"

// GET /api/transferencias-bancarias
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transferencias_bancarias")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/transferencias-bancarias
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.desde_cuenta_id || !body.hasta_cuenta_id) return apiError("Seleccionar ambas cuentas", 400)
  if (body.desde_cuenta_id === body.hasta_cuenta_id) return apiError("Origen y destino no pueden ser iguales", 400)
  if (!body.importe_origen || body.importe_origen <= 0) return apiError("Importe inválido", 400)

  const supabase = await createClient()
  const [{ data: desde }, { data: hasta }] = await Promise.all([
    supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.desde_cuenta_id).maybeSingle(),
    supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.hasta_cuenta_id).maybeSingle(),
  ])
  if (!desde || !hasta) return apiError("Cuenta inválida", 400)

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_transf_bancaria", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("transferencias_bancarias")
    .insert({
      numero: numero || `TB-${Date.now()}`,
      desde_cuenta_id: body.desde_cuenta_id,
      desde_cuenta_nombre: `${desde.banco_nombre} - ${desde.numero_cuenta}`,
      hasta_cuenta_id: body.hasta_cuenta_id,
      hasta_cuenta_nombre: `${hasta.banco_nombre} - ${hasta.numero_cuenta}`,
      sucursal,
      importe_origen: body.importe_origen,
      tipo_operacion_origen: body.tipo_operacion_origen ?? "Transferencia",
      numero_operacion_origen: body.numero_operacion_origen || null,
      fecha_operacion_origen: body.fecha_operacion_origen || null,
      tipo_operacion_destino: body.tipo_operacion_destino ?? "Transferencia",
      numero_operacion_destino: body.numero_operacion_destino || null,
      fecha_operacion_destino: body.fecha_operacion_destino || null,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
