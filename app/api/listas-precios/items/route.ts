import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/listas-precios/items?lista_id=1
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const lista_id = searchParams.get("lista_id")

  if (!lista_id) {
    return NextResponse.json({ error: "lista_id requerido" }, { status: 400 })
  }

  // Traer items de la lista
  const { data: items, error: itemsError } = await supabase
    .from("lista_precios_items")
    .select("*")
    .eq("lista_id", lista_id)

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  if (!items || items.length === 0) return NextResponse.json([])

  // Traer los productos correspondientes
  const productoIds = items.map((i: any) => i.producto_id)
  const { data: productos, error: prodError } = await supabase
    .from("productos")
    .select("id, nombre, codigo_interno, observaciones, precio_venta, costo_manual, stock_real, categoria, tiene_numero_serie")
    .in("id", productoIds)

  if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })

  const productoMap: Record<number, any> = {}
  for (const p of productos ?? []) {
    productoMap[p.id] = p
  }

  const result = items.map((item: any) => {
    const p = productoMap[item.producto_id] ?? {}
    return {
      id: p.id ?? item.producto_id,
      sku: p.codigo_interno ?? "",
      nombre: p.nombre ?? "",
      descripcion: p.observaciones ?? "",
      precio_venta: item.precio ?? p.precio_venta ?? 0,
      costo: p.costo_manual ?? 0,
      stock: p.stock_real ?? 0,
      categoria: p.categoria ?? "",
      requiere_serie: p.tiene_numero_serie ?? false,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("lista_precios_items")
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
