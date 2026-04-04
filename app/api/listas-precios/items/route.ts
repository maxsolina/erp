import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/listas-precios/items?lista_id=1
// Devuelve todos los items de la lista con datos del producto
export async function GET(req: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)
    const listaId = searchParams.get("lista_id")

    // Traer items de la lista
    let itemsQuery = supabase.from("lista_precios_items").select("*")
    if (listaId) itemsQuery = itemsQuery.eq("lista_id", parseInt(listaId))
    const { data: items, error: itemsError } = await itemsQuery.order("id")
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

    if (!items || items.length === 0) return NextResponse.json([])

    // Traer los productos correspondientes
    const productoIds = [...new Set(items.map((i: any) => i.producto_id))]
    const { data: productos, error: prodError } = await supabase
      .from("productos")
      .select("id, nombre, codigo_interno, categoria, marca, stock_real, tiene_numero_serie, activo, costo_manual")
      .in("id", productoIds)
    if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })

    const prodMap = new Map((productos ?? []).map((p: any) => [p.id, p]))

    const result = items.map((item: any) => {
      const prod = prodMap.get(item.producto_id) ?? {}
      return {
        id: item.producto_id,
        sku: prod.codigo_interno ?? "",
        nombre: prod.nombre ?? "",
        descripcion: "",
        precio_venta: item.precio ?? 0,
        costo: prod.costo_manual ?? 0,
        stock: prod.stock_real ?? 0,
        categoria: prod.categoria ?? "",
        requiere_serie: prod.tiene_numero_serie ?? false,
        lista_precio_item_id: item.id,
        lista_id: item.lista_id,
      }
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { data, error } = await supabase
      .from("lista_precios_items")
      .insert([body])
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })
    const { error } = await supabase.from("lista_precios_items").delete().eq("id", parseInt(id))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
