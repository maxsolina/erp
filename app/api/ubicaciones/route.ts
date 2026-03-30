import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const depositoId = searchParams.get("deposito_id")

  let query = supabase
    .from("ubicaciones")
    .select("*, depositos(nombre, codigo)")
    .eq("activa", true)
    .order("nombre")

  if (depositoId) query = query.eq("deposito_id", Number(depositoId))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("ubicaciones")
    .insert({
      deposito_id: body.deposito_id,
      codigo: body.codigo,
      nombre: body.nombre,
      tipo: body.tipo ?? "interna",
      es_reparacion: body.es_reparacion ?? false,
      es_defecto: body.es_defecto ?? false,
      activa: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
