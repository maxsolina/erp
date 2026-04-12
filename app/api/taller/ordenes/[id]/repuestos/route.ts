import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/taller/ordenes/[id]/repuestos
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("taller_ot_repuestos")
    .select("*")
    .eq("ot_id", id)
    .order("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/taller/ordenes/[id]/repuestos
// Body: { producto_id, producto_nombre, cantidad, unidad?, precio_unitario, descuento_pct? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const cantidad = body.cantidad ?? 1
  const precio = body.precio_unitario ?? 0
  const desc = body.descuento_pct ?? 0
  const subtotal = cantidad * precio
  const total = subtotal * (1 - desc / 100)

  const { data, error } = await supabase
    .from("taller_ot_repuestos")
    .insert([{
      ot_id: id,
      producto_id: body.producto_id,
      producto_nombre: body.producto_nombre ?? null,
      cantidad,
      unidad: body.unidad ?? "un",
      precio_unitario: precio,
      descuento_pct: desc,
      subtotal,
      total,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PUT /api/taller/ordenes/[id]/repuestos — reemplazar todos los repuestos (bulk)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()
  const items: {
    producto_id: string
    producto_nombre?: string
    cantidad?: number
    unidad?: string
    precio_unitario?: number
    descuento_pct?: number
  }[] = body.items ?? []

  // Eliminar existentes
  await supabase.from("taller_ot_repuestos").delete().eq("ot_id", id)

  if (items.length) {
    const rows = items.map(item => {
      const cant = item.cantidad ?? 1
      const precio = item.precio_unitario ?? 0
      const desc = item.descuento_pct ?? 0
      const sub = cant * precio
      return {
        ot_id: id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre ?? null,
        cantidad: cant,
        unidad: item.unidad ?? "un",
        precio_unitario: precio,
        descuento_pct: desc,
        subtotal: sub,
        total: sub * (1 - desc / 100),
      }
    })
    const { error } = await supabase.from("taller_ot_repuestos").insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = await supabase.from("taller_ot_repuestos").select("*").eq("ot_id", id).order("id")
  return NextResponse.json(data)
}
