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
  // Intenta primero con sucursal_id (schema nuevo); si falla, cae a sucursal (schema viejo)
  let { data, error } = await supabase
    .from("vendedores")
    .select("id, nombre, email, sucursal_id, activo")
    .eq("activo", true)
    .order("nombre")

  if (error?.code === "42703") {
    const fb = await supabase
      .from("vendedores")
      .select("id, nombre, email, activo")
      .eq("activo", true)
      .order("nombre")
    data = fb.data
    error = fb.error
  }

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const insertPayload: Record<string, unknown> = { nombre: body.nombre, email: body.email }
  if (body.sucursal_id != null) insertPayload.sucursal_id = body.sucursal_id

  let { data, error } = await supabase.from("vendedores").insert(insertPayload).select().single()

  // Compat schema viejo (columna sucursal en vez de sucursal_id)
  if (error?.code === "42703" && body.sucursal) {
    const fb = await supabase
      .from("vendedores")
      .insert({ nombre: body.nombre, email: body.email, sucursal: body.sucursal })
      .select()
      .single()
    data = fb.data
    error = fb.error
  }

  if (error) return dbError(error)
  return NextResponse.json(data)
}
