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
  const [cats, marcas, colores] = await Promise.all([
    supabase.from("categorias_producto").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("marcas_producto").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("colores_producto").select("id, nombre, hex").eq("activo", true).order("nombre"),
  ])

  if (cats.error) return NextResponse.json({ error: cats.error.message }, { status: 500 })
  if (marcas.error) return NextResponse.json({ error: marcas.error.message }, { status: 500 })
  if (colores.error) return NextResponse.json({ error: colores.error.message }, { status: 500 })

  return NextResponse.json({
    categorias: cats.data ?? [],
    marcas: marcas.data ?? [],
    colores: colores.data ?? [],
  })
}
