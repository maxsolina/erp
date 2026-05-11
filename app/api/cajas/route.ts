import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, nombre, codigo, sucursal, cierre_diario_obligatorio, activo"
const SELECT_FULL = "id, nombre, codigo, sucursal, cierre_diario_obligatorio, no_valida_cierre_sabados, no_valida_cierre_domingos, no_valida_cierre_feriados, activo"

// GET /api/cajas → listado de cajas (filtra activos por default, ?incluir_inactivos=1 las trae todas)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("cajas")
    .select(SELECT_LIST)
    .order("sucursal")
    .order("nombre")

  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/cajas → crea una caja nueva.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.nombre?.trim()) return apiError("nombre es requerido", 400)
  if (!body.sucursal) return apiError("sucursal es requerida", 400)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cajas")
    .insert({
      nombre: body.nombre,
      codigo: body.codigo || null,
      sucursal: body.sucursal,
      cierre_diario_obligatorio: body.cierre_diario_obligatorio ?? true,
      no_valida_cierre_sabados: !!body.no_valida_cierre_sabados,
      no_valida_cierre_domingos: !!body.no_valida_cierre_domingos,
      no_valida_cierre_feriados: !!body.no_valida_cierre_feriados,
      activo: body.activo ?? true,
    })
    .select(SELECT_FULL)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
