import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET ?usuario_id=X  o  ?sucursal_id=Y  →  asignaciones filtradas
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const usuarioId = searchParams.get("usuario_id")
  const sucursalId = searchParams.get("sucursal_id")
  const supabase = getSupabase()
  let query = supabase
    .from("usuario_sucursales")
    .select("id, usuario_id, sucursal_id, es_principal, ver_nv_otras_sucursales")
  if (usuarioId) query = query.eq("usuario_id", usuarioId)
  if (sucursalId) query = query.eq("sucursal_id", sucursalId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST  →  asignar sucursal a usuario
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("usuario_sucursales")
    .upsert({
      usuario_id: body.usuario_id,
      sucursal_id: body.sucursal_id,
      es_principal: body.es_principal ?? false,
      ver_nv_otras_sucursales: body.ver_nv_otras_sucursales ?? false,
    }, { onConflict: "usuario_id,sucursal_id" })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE ?usuario_id=X&sucursal_id=Y  →  desasignar
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const usuarioId = searchParams.get("usuario_id")
  const sucursalId = searchParams.get("sucursal_id")
  if (!usuarioId || !sucursalId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
  const supabase = getSupabase()
  const { error } = await supabase
    .from("usuario_sucursales")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("sucursal_id", sucursalId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
