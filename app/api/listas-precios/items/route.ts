import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/listas-precios/items?lista_id=1
// Devuelve los items con join a productos para tener sku, nombre, categoria, etc.
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const listaId = searchParams.get("lista_id")

  let query = supabase
    .from("lista_precios_items")
    .select(`
      id,
      lista_id,
      producto_id,
      precio,
      productos (
        id,
        nombre,
        codigo_interno,
        categoria,
        marca,
        stock_real,
        tiene_numero_serie,
        activo
      )
    `)

  if (listaId) query = query.eq("lista_id", parseInt(listaId))

  const { data, error } = await query.order("id")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Normalizar al formato que espera el ProductoDropdown
  const items = (data ?? []).map((item: any) => ({
    id: item.producto_id,
    sku: item.productos?.codigo_interno ?? "",
    nombre: item.productos?.nombre ?? "",
    descripcion: "",
    precio_venta: item.precio,
    stock: item.productos?.stock_real ?? 0,
    categoria: item.productos?.categoria ?? "",
    requiere_serie: item.productos?.tiene_numero_serie ?? false,
    activo: item.productos?.activo ?? true,
    lista_precio_item_id: item.id,
    lista_id: item.lista_id,
  }))

  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("lista_precios_items")
    .insert([body])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
