import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, sucursal, caja_desde_nombre, caja_hasta_nombre, valor_nombre, importe, fecha, estado"
const SELECT_FULL = "id, numero, sucursal, caja_desde_id, caja_desde_nombre, caja_hasta_id, caja_hasta_nombre, valor_id, valor_nombre, importe, concepto, fecha, observaciones, estado, comprobante_salida_id, comprobante_entrada_id"

// GET /api/transferencias-caja
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transferencias_caja")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/transferencias-caja
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.caja_desde_id || !body.caja_hasta_id) return apiError("Seleccionar caja origen y destino", 400)
  if (body.caja_desde_id === body.caja_hasta_id) return apiError("Origen y destino deben ser distintos", 400)
  if (!body.valor_id) return apiError("Seleccionar valor", 400)
  if (!body.importe || body.importe <= 0) return apiError("Importe inválido", 400)

  const supabase = await createClient()
  const [{ data: cd }, { data: ch }, { data: val }] = await Promise.all([
    supabase.from("cajas").select("nombre").eq("id", body.caja_desde_id).maybeSingle(),
    supabase.from("cajas").select("nombre").eq("id", body.caja_hasta_id).maybeSingle(),
    supabase.from("caja_valores").select("nombre").eq("id", body.valor_id).maybeSingle(),
  ])
  if (!cd || !ch || !val) return apiError("Caja o valor inválido", 400)

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_transferencia_caja", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("transferencias_caja")
    .insert({
      numero: numero || `TRC-${Date.now()}`,
      sucursal,
      caja_desde_id: body.caja_desde_id,
      caja_desde_nombre: cd.nombre,
      caja_hasta_id: body.caja_hasta_id,
      caja_hasta_nombre: ch.nombre,
      valor_id: body.valor_id,
      valor_nombre: val.nombre,
      importe: body.importe,
      concepto: body.concepto ?? "Transferencia",
      fecha: body.fecha,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
