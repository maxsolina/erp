import { dbError } from "@/lib/api-utils"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const soloActivos = searchParams.get("activo") !== "false"

  let query = supabase
    .from("contabilidad_tipos_cotizacion")
    .select("*")
    .order("nombre")

  if (soloActivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "nombre es requerido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("contabilidad_tipos_cotizacion")
    .insert({
      nombre: body.nombre.trim().toLowerCase(),
      descripcion: body.descripcion ?? null,
      activo: body.activo ?? true,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const body = await req.json()
  const { data, error } = await supabase
    .from("contabilidad_tipos_cotizacion")
    .update({
      nombre: body.nombre?.trim().toLowerCase(),
      descripcion: body.descripcion ?? null,
      activo: body.activo,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const { error } = await supabase
    .from("contabilidad_tipos_cotizacion")
    .update({ activo: false })
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
