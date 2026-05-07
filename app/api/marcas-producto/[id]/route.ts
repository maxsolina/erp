import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (body.nombre !== undefined) patch.nombre = String(body.nombre).trim()
  if (body.activa !== undefined) patch.activa = !!body.activa
  const { data, error } = await supabase
    .from("marcas_producto")
    .update(patch)
    .eq("id", Number(id))
    .select()
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from("marcas_producto")
    .update({ activa: false })
    .eq("id", Number(id))
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
