import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_equipos")
    .select("*, taller_areas_reparacion(nombre)")
    .order("nombre")

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_equipos")
    .insert([{
      nombre: body.nombre,
      marca: body.marca ?? null,
      modelo: body.modelo ?? null,
      area_id: body.area_id,
      dias_garantia_compra: body.dias_garantia_compra ?? 0,
      dias_garantia_reparacion: body.dias_garantia_reparacion ?? 30,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_equipo",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Equipo ${data.nombre}${data.marca ? ` ${data.marca}` : ""}${data.modelo ? ` ${data.modelo}` : ""}`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
