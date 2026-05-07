import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_feriados")
    .select("*")
    .order("fecha", { ascending: false })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_feriados")
    .insert([{
      fecha: body.fecha,
      descripcion: body.descripcion ?? null,
    }])
    .select()
    .single()

  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_feriado",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Feriado ${data.fecha}${data.descripcion ? ` — ${data.descripcion}` : ""}`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
