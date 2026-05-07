import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_areas_reparacion")
    .select("*")
    .order("orden", { ascending: true })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_areas_reparacion")
    .insert([{
      codigo: body.codigo,
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      orden: body.orden ?? 0,
      control_inicial_obligatorio: body.control_inicial_obligatorio ?? false,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_area",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Área ${data.codigo} — ${data.nombre}`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
