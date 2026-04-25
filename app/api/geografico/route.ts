import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/geografico?tipo=paises|provincias&pais_id=1
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo") ?? "paises"

  if (tipo === "provincias") {
    const paisId = searchParams.get("pais_id")
    let query = supabase.from("provincias").select("id, nombre").eq("activa", true).order("nombre")
    if (paisId) query = query.eq("pais_id", paisId)
    const { data, error } = await query
    if (error) return dbError(error)
    return NextResponse.json(data ?? [])
  }

  const { data, error } = await supabase
    .from("paises")
    .select("id, nombre, codigo_iso")
    .eq("activo", true)
    .order("nombre")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}
