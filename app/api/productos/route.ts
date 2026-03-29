import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("busqueda") || ""
  const activo = searchParams.get("activo")
  const tipo = searchParams.get("tipo")

  let query = supabase
    .from("productos")
    .select("*")
    .order("nombre", { ascending: true })

  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,codigo_interno.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%,marca.ilike.%${busqueda}%`
    )
  }

  if (activo !== null && activo !== "") {
    query = query.eq("activo", activo === "true")
  }

  if (tipo && tipo !== "todos") {
    query = query.eq("tipo", tipo)
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

  // Quitar campos que no son columnas de la tabla
  const { id: _id, created_at: _ca, updated_at: _ua, ...payload } = body

  const { data, error } = await supabase
    .from("productos")
    .insert([payload])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
