import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cotizador_categorias")
    .select("id, nombre, orden, accion, activo, created_at, updated_at")
    .order("orden")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  if (!body.nombre || typeof body.nombre !== "string") {
    return apiError("nombre requerido", 400)
  }
  if (!["descuento", "whatsapp", "cartel_sistema"].includes(body.accion)) {
    return apiError("accion inválida", 400)
  }

  const { data, error } = await supabase
    .from("cotizador_categorias")
    .insert({
      nombre: body.nombre.trim(),
      orden: Number(body.orden) || 0,
      accion: body.accion,
      activo: body.activo ?? true,
    })
    .select("id, nombre, orden, accion, activo, created_at, updated_at")
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
