import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/grupos-tarjeta
// Devuelve grupos con sus tarjetas y cargos embebidos
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("grupos_tarjeta")
    .select(`
      id, nombre, banco, tipo_movimiento, activo,
      grupos_tarjeta_tarjetas(tarjeta_id),
      grupos_tarjeta_cargos(id, nombre, tipo, arancel, es_porcentaje, cuenta_contable)
    `)
    .eq("activo", true)
    .order("nombre")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    banco: g.banco ?? "",
    tipo_movimiento: g.tipo_movimiento ?? "",
    activo: g.activo,
    tarjetas_ids: (g.grupos_tarjeta_tarjetas ?? []).map((t: any) => t.tarjeta_id),
    cargos: g.grupos_tarjeta_cargos ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("grupos_tarjeta")
    .insert({ nombre: body.nombre, banco: body.banco, tipo_movimiento: body.tipo_movimiento })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
