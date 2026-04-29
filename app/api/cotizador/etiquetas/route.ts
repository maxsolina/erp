import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const categoriaId = searchParams.get("categoria_id")

  let query = supabase
    .from("cotizador_etiquetas_categoria")
    .select(`
      id, categoria_id, etiqueta, orden, activo, created_at, updated_at,
      categoria:cotizador_categorias(id, nombre, accion)
    `)
    .order("orden")
    .order("etiqueta")

  if (categoriaId) query = query.eq("categoria_id", categoriaId)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  if (!body.categoria_id) return apiError("categoria_id requerido", 400)
  if (!body.etiqueta || typeof body.etiqueta !== "string" || !body.etiqueta.trim()) {
    return apiError("etiqueta requerida", 400)
  }

  const { data, error } = await supabase
    .from("cotizador_etiquetas_categoria")
    .insert({
      categoria_id: body.categoria_id,
      etiqueta: body.etiqueta.trim(),
      orden: Number(body.orden) || 0,
      activo: body.activo ?? true,
    })
    .select(`
      id, categoria_id, etiqueta, orden, activo, created_at, updated_at,
      categoria:cotizador_categorias(id, nombre, accion)
    `)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
