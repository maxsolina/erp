import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const modeloId = searchParams.get("modelo_id")
  const categoriaId = searchParams.get("categoria_id")

  let query = supabase
    .from("cotizador_criterios")
    .select(`
      id, modelo_id, categoria_id, etiqueta, descuento_usd, descuento_porcentaje, orden, activo, web_deriva_atencion, created_at, updated_at,
      modelo:cotizador_modelos(id, valor_base_usd, producto:productos(id, nombre)),
      categoria:cotizador_categorias(id, nombre, accion)
    `)
    .order("descuento_usd", { ascending: true })

  if (modeloId) query = query.eq("modelo_id", modeloId)
  if (categoriaId) query = query.eq("categoria_id", categoriaId)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  if (!body.modelo_id) return apiError("modelo_id requerido", 400)
  if (!body.categoria_id) return apiError("categoria_id requerido", 400)
  if (!body.etiqueta || typeof body.etiqueta !== "string") {
    return apiError("etiqueta requerida", 400)
  }

  const descuentoUsd = Number(body.descuento_usd)
  if (Number.isNaN(descuentoUsd) || descuentoUsd < 0) {
    return apiError("descuento_usd debe ser >= 0", 400)
  }

  // Validar que el descuento no supere el valor_base_usd del modelo
  const { data: modelo, error: modeloErr } = await supabase
    .from("cotizador_modelos")
    .select("valor_base_usd")
    .eq("id", body.modelo_id)
    .single()
  if (modeloErr) return apiError("modelo no encontrado", 404)
  if (descuentoUsd > Number(modelo.valor_base_usd)) {
    return apiError(`descuento_usd no puede superar el valor base del modelo (${modelo.valor_base_usd})`, 400)
  }

  // Porcentaje dinámico opcional: si viene un número, se usa como base de cálculo
  let descuentoPct: number | null = null
  if (body.descuento_porcentaje !== undefined && body.descuento_porcentaje !== null && body.descuento_porcentaje !== "") {
    descuentoPct = Number(body.descuento_porcentaje)
    if (Number.isNaN(descuentoPct) || descuentoPct < 0 || descuentoPct > 100) {
      return apiError("descuento_porcentaje debe estar entre 0 y 100", 400)
    }
  }

  const { data, error } = await supabase
    .from("cotizador_criterios")
    .insert({
      modelo_id: body.modelo_id,
      categoria_id: body.categoria_id,
      etiqueta: body.etiqueta.trim(),
      descuento_usd: descuentoUsd,
      descuento_porcentaje: descuentoPct,
      orden: Number(body.orden) || 0,
      activo: body.activo ?? true,
      web_deriva_atencion: body.web_deriva_atencion ?? false,
    })
    .select(`
      id, modelo_id, categoria_id, etiqueta, descuento_usd, descuento_porcentaje, orden, activo, web_deriva_atencion, created_at, updated_at,
      categoria:cotizador_categorias(id, nombre, accion)
    `)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
