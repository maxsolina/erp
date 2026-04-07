import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const numero = searchParams.get("numero")

  let query = supabase
    .from("facturas")
    .select(`
      *,
      facturas_lineas(*),
      facturas_vencimientos(*)
    `)
    .order("created_at", { ascending: false })

  if (id) query = query.eq("id", Number(id))
  else if (numero) query = query.eq("numero", numero)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
