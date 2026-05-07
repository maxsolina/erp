import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_turnos")
    .select("*")
    .order("hora_entrada")

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_turnos")
    .insert([{
      nombre: body.nombre,
      hora_entrada: body.hora_entrada,
      hora_salida: body.hora_salida,
      trabaja_sabado: body.trabaja_sabado ?? false,
      trabaja_domingo: body.trabaja_domingo ?? false,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_turno",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Turno ${data.nombre} (${data.hora_entrada}–${data.hora_salida})`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
