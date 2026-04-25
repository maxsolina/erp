import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/tarjetas
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("tarjetas")
    .select("id, nombre, tipo, dias_presentacion, dias_pago, activa")
    .eq("activa", true)
    .order("nombre")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("tarjetas")
    .insert(body)
    .select()
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
