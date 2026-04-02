import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("busqueda") || ""
  const estado = searchParams.get("estado") || ""

  let query = supabase
    .from("proveedores")
    .select("*")
    .order("razon_social", { ascending: true })

  if (busqueda) {
    query = query.or(
      `razon_social.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%,cuit.ilike.%${busqueda}%`
    )
  }
  if (estado) {
    query = query.eq("estado", estado)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("proveedores")
    .insert([body])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
