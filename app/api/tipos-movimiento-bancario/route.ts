import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, nombre, codigo_causal, emite_cheques_diferidos, emite_cheques_corrientes, disponible_en_pagos, disponible_en_cobros, disponible_en_finanzas, activo"

// GET /api/tipos-movimiento-bancario → listado de tipos de movimiento bancario (?incluir_inactivos=1 trae todos)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase.from("tipos_movimiento_bancario").select(SELECT).order("nombre")
  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/tipos-movimiento-bancario
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.nombre || !body.codigo_causal) return apiError("nombre y codigo_causal son requeridos", 400)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tipos_movimiento_bancario")
    .insert({
      nombre: body.nombre,
      codigo_causal: body.codigo_causal,
      emite_cheques_diferidos: !!body.emite_cheques_diferidos,
      emite_cheques_corrientes: !!body.emite_cheques_corrientes,
      disponible_en_pagos: !!body.disponible_en_pagos,
      disponible_en_cobros: !!body.disponible_en_cobros,
      disponible_en_finanzas: body.disponible_en_finanzas ?? true,
      activo: body.activo ?? true,
    })
    .select(SELECT)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
