import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("busqueda") || ""
  const activo = searchParams.get("activo")

  let query = supabase
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true })

  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,codigo.ilike.%${busqueda}%,numero_documento.ilike.%${busqueda}%,email.ilike.%${busqueda}%`
    )
  }

  if (activo !== null && activo !== "") {
    query = query.eq("activo", activo === "true")
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("clientes")
    .insert([body])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
