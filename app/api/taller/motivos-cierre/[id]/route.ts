import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_motivos_cierre")
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
  const { data, error } = await supabase
    .from("taller_motivos_cierre")
    .update({ nombre: body.nombre, activo: body.activo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_motivo_cierre",
    documento_id: id,
    tipo_evento: "cambio_campo",
    campo: "Motivo de cierre",
    valor_anterior: null,
    valor_nuevo: data?.nombre ?? null,
    usuario: null,
  })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from("taller_motivos_cierre")
    .delete()
    .eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
