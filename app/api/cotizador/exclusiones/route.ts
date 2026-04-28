import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cotizador_exclusiones")
    .select("id, descripcion, orden, activo, created_at, updated_at")
    .order("orden")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  if (!body.descripcion || typeof body.descripcion !== "string") {
    return apiError("descripcion requerida", 400)
  }

  const { data, error } = await supabase
    .from("cotizador_exclusiones")
    .insert({
      descripcion: body.descripcion.trim(),
      orden: Number(body.orden) || 0,
      activo: body.activo ?? true,
    })
    .select("id, descripcion, orden, activo, created_at, updated_at")
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
