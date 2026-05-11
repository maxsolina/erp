import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, codigo, nombre, direccion, telefono, email, activo"

// GET /api/bancos → listado del maestro de bancos (?incluir_inactivos=1 trae todos)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase.from("bancos").select(SELECT).order("nombre")
  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/bancos
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.codigo || !body.nombre) return apiError("codigo y nombre son requeridos", 400)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bancos")
    .insert({
      codigo: body.codigo,
      nombre: body.nombre,
      direccion: body.direccion || null,
      telefono: body.telefono || null,
      email: body.email || null,
      activo: body.activo ?? true,
    })
    .select(SELECT)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
