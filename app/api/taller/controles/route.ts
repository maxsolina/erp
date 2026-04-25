import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_controles")
    .select("*, taller_areas_reparacion(nombre), taller_categorias_reparacion(nombre)")
    .order("orden")

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_controles")
    .insert([{
      nombre: body.nombre,
      area_id: body.area_id,
      categoria_id: body.categoria_id ?? null,
      disponible_recepcion: body.disponible_recepcion ?? false,
      obs_recepcion_visible: body.obs_recepcion_visible ?? false,
      obs_recepcion_requerida: body.obs_recepcion_requerida ?? false,
      disponible_calidad: body.disponible_calidad ?? false,
      obs_calidad_visible: body.obs_calidad_visible ?? false,
      obs_calidad_requerida: body.obs_calidad_requerida ?? false,
      orden: body.orden ?? 0,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
