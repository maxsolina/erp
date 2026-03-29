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
  console.log("[v0] POST /api/productos body keys:", Object.keys(body))

  const { id: _id, created_at: _ca, updated_at: _ua, historial_costos, ...payload } = body
  // historial_costos no existe en la tabla como columna separada si viene del form
  const insertPayload = { ...payload, historial_costos: historial_costos ?? [] }
  console.log("[v0] insertPayload keys:", Object.keys(insertPayload))

  const { data, error } = await supabase
    .from("productos")
    .insert([insertPayload])
    .select()
    .single()

  if (error) {
    console.log("[v0] Supabase insert error:", error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log("[v0] Producto creado id:", data?.id)
  return NextResponse.json(data, { status: 201 })
}
