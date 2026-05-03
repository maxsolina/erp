import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/seguimiento?tipo=nota_venta&id=123
// Devuelve los eventos de seguimiento de un documento, ordenados ascendentemente
// por fecha (los más viejos primero, igual que un timeline).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo")
  const id = searchParams.get("id")

  if (!tipo || !id) {
    return NextResponse.json(
      { error: "Faltan parámetros: tipo + id" },
      { status: 400 }
    )
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("documentos_seguimiento")
    .select("*")
    .eq("tipo_documento", tipo)
    .eq("documento_id", id)
    .order("fecha", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
