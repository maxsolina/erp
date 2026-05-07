import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_categorias_reparacion")
    .select("*, taller_areas_reparacion(nombre)")
    .order("orden_asignacion", { ascending: true })

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_categorias_reparacion")
    .insert([{
      nombre: body.nombre,
      area_id: body.area_id,
      orden_asignacion: body.orden_asignacion ?? 0,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return dbError(error)
  await registrarEvento(supabase, {
    tipo_documento: "taller_categoria",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Categoría ${data.nombre}`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
