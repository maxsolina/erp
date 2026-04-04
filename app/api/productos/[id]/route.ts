import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

const COLUMNAS = new Set([
  "imagen_url", "nombre", "codigo_interno", "categoria", "marca", "modelo",
  "color", "tipo", "puede_venderse", "puede_comprarse", "activo",
  "stock_real", "stock_minimo", "stock_maximo", "stock_critico",
  "tiene_numero_serie", "requiere_color", "requiere_bateria",
  "requiere_outlet", "requiere_observaciones",
  "costo_manual", "moneda_costo", "costo_contable", "historial_costos",
  "garantia_propia_valor", "garantia_propia_unidad",
  "garantia_fabricante_valor", "garantia_fabricante_unidad",
  "iva_venta", "iva_compra", "cuenta_ventas", "cuenta_existencias", "observaciones",
])

function filtrarPayload(body: Record<string, any>) {
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(body)) {
    if (COLUMNAS.has(k)) result[k] = v
  }
  if (!result.historial_costos) result.historial_costos = []
  return result
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await request.json()
  const payload = filtrarPayload(body)

  const { data, error } = await supabase
    .from("productos")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  const { error } = await supabase.from("productos").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
