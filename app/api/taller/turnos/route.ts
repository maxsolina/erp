import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_turnos")
    .select("*")
    .order("hora_entrada")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
