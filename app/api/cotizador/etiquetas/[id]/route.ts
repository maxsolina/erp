import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.etiqueta !== undefined) update.etiqueta = String(body.etiqueta).trim()
  if (body.orden !== undefined) update.orden = Number(body.orden) || 0
  if (body.activo !== undefined) update.activo = Boolean(body.activo)

  const { data, error } = await supabase
    .from("cotizador_etiquetas_categoria")
    .update(update)
    .eq("id", id)
    .select(`
      id, categoria_id, etiqueta, orden, activo, created_at, updated_at,
      categoria:cotizador_categorias(id, nombre, accion)
    `)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("cotizador_etiquetas_categoria").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
