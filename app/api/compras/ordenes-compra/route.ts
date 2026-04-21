import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Columnas permitidas en ordenes_compra (incluye campos del script 047)
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

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ordenes_compra")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const payload = filtrarPayloadOC(body)

  // Generar número único consultando la DB — filtra solo OC-XXXXX y ordena por numero desc
  const { data: ultimaOC } = await supabase
    .from("ordenes_compra")
    .select("numero")
    .like("numero", "OC-%")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()

  const match = ultimaOC?.numero?.match(/(\d+)$/)
  const nextNum = match ? parseInt(match[1], 10) + 1 : 1
  payload.numero = `OC-${String(nextNum).padStart(5, "0")}`

  const { data, error } = await supabase
    .from("ordenes_compra")
    .insert([payload])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
