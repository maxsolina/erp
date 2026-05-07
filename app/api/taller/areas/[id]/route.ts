import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_areas_reparacion")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  // Whitelist de columnas (evita updates a campos inexistentes que pueda
  // venir el body si se usa el form genérico).
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.codigo !== undefined) update.codigo = body.codigo
  if (body.nombre !== undefined) update.nombre = body.nombre
  if (body.descripcion !== undefined) update.descripcion = body.descripcion ?? null
  if (body.orden !== undefined) update.orden = Number(body.orden ?? 0)
  if (body.control_inicial_obligatorio !== undefined) {
    update.control_inicial_obligatorio = !!body.control_inicial_obligatorio
  }
  if (body.activo !== undefined) update.activo = !!body.activo

  const { data, error } = await supabase
    .from("taller_areas_reparacion")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from("taller_areas_reparacion")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
