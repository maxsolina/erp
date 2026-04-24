import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { updated_at: _, ...rest } = body
  const updateData = {
    ...rest,
    termino_pago_id: rest.termino_pago_id && rest.termino_pago_id > 0 ? rest.termino_pago_id : null,
    vendedor_id: rest.vendedor_id && rest.vendedor_id > 0 ? rest.vendedor_id : null,
    lista_precios_id: rest.lista_precios_id && rest.lista_precios_id > 0 ? rest.lista_precios_id : null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("clientes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Soft delete — no eliminamos físicamente
  const { data, error } = await supabase
    .from("clientes")
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
