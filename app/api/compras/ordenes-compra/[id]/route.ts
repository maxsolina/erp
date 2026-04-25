import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const COLUMNAS_OC = new Set([
  "numero", "fecha", "fecha_entrega_estimada", "fecha_entrega_esperada",
  "proveedor_id", "proveedor_nombre",
  "estado", "moneda", "tipo_cotizacion", "cotizacion_dia", "tipo_cambio",
  "sucursal", "sucursal_id", "deposito_destino", "deposito_destino_id",
  "ubicacion", "ubicacion_destino", "ubicacion_destino_id",
  "items", "lineas", "subtotal", "impuestos", "total", "observaciones",
  "termino_pago", "metodo_pago", "metodo_compra", "tipo_compra",
  "legajo_id", "despacho_simple_id",
  "factura_circuito_id", "recepcion_circuito_id",
  "cancelacion_motivo", "cancelacion_fecha",
])

function filtrarPayloadOC(body: Record<string, any>) {
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(body)) {
    if (COLUMNAS_OC.has(k)) result[k] = v
  }
  return result
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data, error } = await supabase.from("ordenes_compra").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const payload = filtrarPayloadOC(body)
  const { data, error } = await supabase.from("ordenes_compra").update(payload).eq("id", id).select().single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { error } = await supabase.from("ordenes_compra").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ success: true })
}
