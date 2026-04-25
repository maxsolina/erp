import { dbError } from "@/lib/api-utils"
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
    .order("id", { ascending: false })

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
    return dbError(error)
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Sanitizar FKs: si son 0 o inválidos enviar null para evitar FK violations
  const payload = {
    ...body,
    termino_pago_id: body.termino_pago_id && body.termino_pago_id > 0 ? body.termino_pago_id : null,
    vendedor_id: body.vendedor_id && body.vendedor_id > 0 ? body.vendedor_id : null,
    lista_precios_id: body.lista_precios_id && body.lista_precios_id > 0 ? body.lista_precios_id : null,
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert([payload])
    .select()
    .single()

  if (error) {
    return dbError(error)
  }

  return NextResponse.json(data, { status: 201 })
}
