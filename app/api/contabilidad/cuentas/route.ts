import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/contabilidad/cuentas?q=texto&limit=200  → búsqueda por código o nombre
// GET /api/contabilidad/cuentas?id=UUID            → traer una cuenta por id
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const q = searchParams.get("q")
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 500)

  if (id) {
    const { data, error } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("id", id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (q !== null) {
    const term = q.trim()
    const query = supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .order("codigo", { ascending: true })
      .limit(limit)

    if (term.length > 0) {
      query.or(`codigo.ilike.%${term}%,nombre.ilike.%${term}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ data: [] })
}
