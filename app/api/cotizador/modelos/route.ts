import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cotizador_modelos")
    .select(`
      id, producto_id, valor_base_usd, marca, activo, orden, created_at, updated_at,
      producto:productos(id, nombre, codigo_interno, marca, modelo)
    `)
    .order("orden")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  const productoId = Number(body.producto_id)
  if (!productoId || Number.isNaN(productoId)) {
    return apiError("producto_id requerido", 400)
  }

  const valorBaseUsd = Number(body.valor_base_usd)
  if (Number.isNaN(valorBaseUsd) || valorBaseUsd < 0) {
    return apiError("valor_base_usd debe ser >= 0", 400)
  }

  const { data, error } = await supabase
    .from("cotizador_modelos")
    .insert({
      producto_id: productoId,
      valor_base_usd: valorBaseUsd,
      marca: body.marca?.trim() || "Apple",
      activo: body.activo ?? true,
      orden: Number(body.orden) || 0,
    })
    .select(`
      id, producto_id, valor_base_usd, marca, activo, orden, created_at, updated_at,
      producto:productos(id, nombre, codigo_interno, marca, modelo)
    `)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
