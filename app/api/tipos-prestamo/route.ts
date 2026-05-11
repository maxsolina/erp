import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, nombre, cuenta_prestamo, cuenta_intereses, cuenta_intereses_devengar, cuenta_iva_devengar, cuenta_percepciones_devengar, cuenta_refinanciacion, cuenta_preexistente, concepto_liquidacion, activo"

// GET /api/tipos-prestamo
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase.from("tipos_prestamo").select(SELECT).order("nombre")
  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/tipos-prestamo
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.nombre) return apiError("nombre es requerido", 400)

  const nullable = (v: any) => (v && String(v).trim() ? String(v).trim() : null)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tipos_prestamo")
    .insert({
      nombre: body.nombre,
      cuenta_prestamo: nullable(body.cuenta_prestamo),
      cuenta_intereses: nullable(body.cuenta_intereses),
      cuenta_intereses_devengar: nullable(body.cuenta_intereses_devengar),
      cuenta_iva_devengar: nullable(body.cuenta_iva_devengar),
      cuenta_percepciones_devengar: nullable(body.cuenta_percepciones_devengar),
      cuenta_refinanciacion: nullable(body.cuenta_refinanciacion),
      cuenta_preexistente: nullable(body.cuenta_preexistente),
      concepto_liquidacion: nullable(body.concepto_liquidacion),
      activo: body.activo ?? true,
    })
    .select(SELECT)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
