import { dbError } from "@/lib/api-utils"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("depositos")
    .select("id, codigo, nombre, activo, sucursal_id")
    .order("nombre")

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("depositos")
    .insert({ codigo: body.codigo, nombre: body.nombre, sucursal_id: body.sucursal_id ?? null, activo: true })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
