import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, caja_nombre, sucursal, moneda_origen, importe_origen, moneda_destino, importe_destino, cotizacion, fecha, estado"
const SELECT_FULL = "id, numero, caja_id, caja_nombre, sucursal, valor_origen_id, valor_origen_nombre, moneda_origen, importe_origen, valor_destino_id, valor_destino_nombre, moneda_destino, importe_destino, tipo_cotizacion, cotizacion, diferencia_redondeo, fecha, observaciones, estado"

// GET /api/conversiones-moneda
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("conversiones_moneda")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/conversiones-moneda — crea una conversión en borrador.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.caja_id || !body.valor_origen_id || !body.valor_destino_id) {
    return apiError("caja_id, valor_origen_id y valor_destino_id son requeridos", 400)
  }
  if (body.valor_origen_id === body.valor_destino_id) {
    return apiError("El valor origen y destino no pueden ser el mismo", 400)
  }
  if (!body.importe_origen || !body.cotizacion) {
    return apiError("importe_origen y cotizacion son requeridos", 400)
  }

  const supabase = await createClient()

  const [{ data: caja }, { data: valOrigen }, { data: valDestino }] = await Promise.all([
    supabase.from("cajas").select("nombre, sucursal").eq("id", body.caja_id).maybeSingle(),
    supabase.from("caja_valores").select("nombre, moneda").eq("id", body.valor_origen_id).maybeSingle(),
    supabase.from("caja_valores").select("nombre, moneda").eq("id", body.valor_destino_id).maybeSingle(),
  ])
  if (!caja) return apiError("Caja no encontrada", 404)
  if (!valOrigen || !valDestino) return apiError("Valor origen o destino inválido", 400)
  if (valOrigen.moneda === valDestino.moneda) {
    return apiError("Origen y destino deben tener monedas distintas", 400)
  }

  const sucursal = body.sucursal ?? caja.sucursal ?? ""

  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_conversion", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("conversiones_moneda")
    .insert({
      numero: numero || `CD-${Date.now()}`,
      caja_id: body.caja_id,
      caja_nombre: caja.nombre,
      sucursal,
      valor_origen_id: body.valor_origen_id,
      valor_origen_nombre: valOrigen.nombre,
      moneda_origen: valOrigen.moneda,
      importe_origen: body.importe_origen,
      valor_destino_id: body.valor_destino_id,
      valor_destino_nombre: valDestino.nombre,
      moneda_destino: valDestino.moneda,
      importe_destino: body.importe_destino,
      tipo_cotizacion: body.tipo_cotizacion ?? "Divisa",
      cotizacion: body.cotizacion,
      diferencia_redondeo: body.diferencia_redondeo ?? 0,
      fecha: body.fecha,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
