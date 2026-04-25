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
    .from("sucursales")
    .select("id, codigo, nombre, direccion, telefono, deposito_id, activa")
    .order("nombre")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("sucursales")
    .insert({
      codigo: body.codigo,
      nombre: body.nombre,
      direccion: body.direccion ?? null,
      telefono: body.telefono ?? null,
      deposito_id: body.deposito_id ?? null,
      activa: body.activa ?? true,
    })
    .select()
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
