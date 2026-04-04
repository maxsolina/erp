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
    .from("remitos")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("remitos")
    .insert({
      numero: body.numero,
      orden_entrega_id: body.orden_entrega_id ?? null,
      orden_entrega_numero: body.orden_entrega_numero ?? null,
      nota_venta_id: body.nota_venta_id ?? null,
      nota_venta_numero: body.nota_venta_numero ?? null,
      cliente_id: body.cliente_id ?? null,
      cliente_nombre: body.cliente_nombre ?? null,
      estado: body.estado ?? "confirmado",
      fecha: body.fecha ?? null,
      tipo: body.tipo ?? null,
      deposito: body.deposito ?? null,
      ubicacion: body.ubicacion ?? null,
      total_bultos: Number(body.total_bultos ?? 1),
      observaciones: body.observaciones ?? null,
      productos: body.productos ?? [],
      lineas: body.lineas ?? [],
      seguimiento: body.seguimiento ?? [],
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, numero: data.numero })
}
