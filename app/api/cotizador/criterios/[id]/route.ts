import { apiError, dbError } from "@/lib/api-utils"
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
  if (body.categoria_id !== undefined) update.categoria_id = body.categoria_id
  if (body.web_deriva_atencion !== undefined) update.web_deriva_atencion = Boolean(body.web_deriva_atencion)
  if (body.descuento_porcentaje !== undefined) {
    if (body.descuento_porcentaje === null || body.descuento_porcentaje === "") {
      update.descuento_porcentaje = null
    } else {
      const pct = Number(body.descuento_porcentaje)
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        return apiError("descuento_porcentaje debe estar entre 0 y 100", 400)
      }
      update.descuento_porcentaje = pct
    }
  }

  if (body.descuento_usd !== undefined) {
    const descuentoUsd = Number(body.descuento_usd)
    if (Number.isNaN(descuentoUsd) || descuentoUsd < 0) {
      return apiError("descuento_usd debe ser >= 0", 400)
    }

    // Validar contra valor_base_usd del modelo dueño del criterio
    const { data: criterio, error: criterioErr } = await supabase
      .from("cotizador_criterios")
      .select("modelo_id")
      .eq("id", id)
      .single()
    if (criterioErr) return apiError("criterio no encontrado", 404)

    const { data: modelo } = await supabase
      .from("cotizador_modelos")
      .select("valor_base_usd")
      .eq("id", criterio.modelo_id)
      .single()
    if (modelo && descuentoUsd > Number(modelo.valor_base_usd)) {
      return apiError(`descuento_usd no puede superar el valor base del modelo (${modelo.valor_base_usd})`, 400)
    }
    update.descuento_usd = descuentoUsd
  }

  const { data, error } = await supabase
    .from("cotizador_criterios")
    .update(update)
    .eq("id", id)
    .select(`
      id, modelo_id, categoria_id, etiqueta, descuento_usd, descuento_porcentaje, orden, activo, web_deriva_atencion, created_at, updated_at,
      categoria:cotizador_categorias(id, nombre, accion)
    `)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("cotizador_criterios").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
