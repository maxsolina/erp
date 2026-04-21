import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/monedas
// Devuelve las monedas activas de contabilidad_monedas
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("contabilidad_monedas")
    .select("id, codigo, nombre, simbolo, es_base, activo")
    .eq("activo", true)
    .order("es_base", { ascending: false }) // ARS (base) primero
    .order("codigo")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store' }
  })
}
