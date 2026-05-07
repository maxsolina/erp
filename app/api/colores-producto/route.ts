import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("colores_producto")
    .select("*")
    .order("nombre")
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  if (!body.nombre || !String(body.nombre).trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 422 })
  }
  const { data, error } = await supabase
    .from("colores_producto")
    .insert([{
      nombre: String(body.nombre).trim(),
      hex: body.hex ?? null,
      activo: body.activo ?? true,
    }])
    .select()
    .single()
  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "color_producto",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Color: ${data.nombre}`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
