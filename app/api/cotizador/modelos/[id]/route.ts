import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cotizador_modelos")
    .select(`
      id, producto_id, valor_base_usd, marca, activo, orden, created_at, updated_at,
      producto:productos(id, nombre, codigo_interno, marca, modelo)
    `)
    .eq("id", id)
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.producto_id !== undefined) {
    const productoId = Number(body.producto_id)
    if (!productoId || Number.isNaN(productoId)) {
      return apiError("producto_id inválido", 400)
    }
    update.producto_id = productoId
  }
  if (body.valor_base_usd !== undefined) {
    const v = Number(body.valor_base_usd)
    if (Number.isNaN(v) || v < 0) return apiError("valor_base_usd debe ser >= 0", 400)
    update.valor_base_usd = v
  }
  if (body.marca !== undefined) update.marca = String(body.marca).trim() || "Apple"
  if (body.activo !== undefined) update.activo = Boolean(body.activo)
  if (body.orden !== undefined) update.orden = Number(body.orden) || 0

  const { data, error } = await supabase
    .from("cotizador_modelos")
    .update(update)
    .eq("id", id)
    .select(`
      id, producto_id, valor_base_usd, marca, activo, orden, created_at, updated_at,
      producto:productos(id, nombre, codigo_interno, marca, modelo)
    `)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("cotizador_modelos").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
