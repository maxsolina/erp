import { dbError } from "@/lib/api-utils"
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
    .from("nc_categorias")
    .select("id, nombre, activa")
    .order("nombre")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("nc_categorias")
    .insert({ nombre: body.nombre, activa: body.activa ?? true })
    .select("id")
    .single()
  if (error) return dbError(error)
  return NextResponse.json({ ok: true, id: data.id })
}
