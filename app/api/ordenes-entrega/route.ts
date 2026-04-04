import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("ordenes_entrega")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("ordenes_entrega")
    .insert({
      numero: body.numero,
      nota_venta_id: body.nota_venta_id ?? null,
      nota_venta_numero: body.nota_venta_numero ?? null,
      cliente_id: body.cliente_id ?? null,
      cliente_nombre: body.cliente_nombre ?? null,
      estado: body.estado ?? "confirmada",
      fecha: body.fecha ?? null,
      fecha_entrega_programada: body.fecha_entrega_programada ?? null,
      tipo: body.tipo ?? null,
      deposito_origen: body.deposito_origen ?? null,
      ubicacion_origen: body.ubicacion_origen ?? null,
      total_productos: Number(body.total_productos ?? 0),
      productos_entregados: Number(body.productos_entregados ?? 0),
      productos: body.productos ?? [],
      seguimiento: body.seguimiento ?? [],
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, numero: data.numero })
}
