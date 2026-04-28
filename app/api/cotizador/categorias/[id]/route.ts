import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.nombre !== undefined) update.nombre = String(body.nombre).trim()
  if (body.orden !== undefined) update.orden = Number(body.orden) || 0
  if (body.accion !== undefined) {
    if (!["descuento", "whatsapp", "cartel_sistema"].includes(body.accion)) {
      return apiError("accion inválida", 400)
    }
    update.accion = body.accion
  }
  if (body.activo !== undefined) update.activo = Boolean(body.activo)

  const { data, error } = await supabase
    .from("cotizador_categorias")
    .update(update)
    .eq("id", id)
    .select("id, nombre, orden, accion, activo, created_at, updated_at")
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("cotizador_categorias").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
