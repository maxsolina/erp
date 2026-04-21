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
    .from("listas_precios")
    .select("*")
    .order("nombre")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("listas_precios")
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })
  // Campos permitidos para actualizar
  const allowed = ["nombre", "tipo", "moneda_base", "incluye_iva", "activa", "no_visible",
    "dias_validez", "estado", "usuarios_admin", "usuarios_habilitados", "observaciones_filtro"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key]
  }
  const { data, error } = await supabase
    .from("listas_precios")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
