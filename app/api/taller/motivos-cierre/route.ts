import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_motivos_cierre")
    .select("*")
    .order("nombre")

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_motivos_cierre")
    .insert([{ nombre: body.nombre, activo: body.activo ?? true }])
    .select()
    .single()

  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_motivo_cierre",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Motivo de cierre ${data.nombre}`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
