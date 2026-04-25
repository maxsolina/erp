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
  const id = searchParams.get("id")
  const ano_fiscal_id = searchParams.get("ano_fiscal_id")

  let query = supabase
    .from("contabilidad_periodos")
    .select(`*, contabilidad_anos_fiscales(nombre, codigo)`)
    .order("fecha_inicio", { ascending: true })

  if (id) query = query.eq("id", id)
  if (ano_fiscal_id) query = query.eq("ano_fiscal_id", ano_fiscal_id)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(id ? (data?.[0] ?? null) : (data ?? []))
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { ano_fiscal_id, nombre, fecha_inicio, fecha_fin, estado = "aprobado" } = body

  const { data, error } = await supabase
    .from("contabilidad_periodos")
    .insert({ ano_fiscal_id, nombre, fecha_inicio, fecha_fin, estado })
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
    .from("contabilidad_periodos")
    .update({ ...body, updated_at: new Date().toISOString() })
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
    .from("contabilidad_periodos")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
