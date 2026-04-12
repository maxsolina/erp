import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_tipos_ot")
    .select("*, taller_areas_reparacion(nombre)")
    .order("nombre")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_tipos_ot")
    .insert([{
      nombre: body.nombre,
      codigo: body.codigo,
      area_id: body.area_id,
      tipo_tecnico: body.tipo_tecnico ?? 'ambos',
      es_garantia_compra: body.es_garantia_compra ?? false,
      es_garantia_reparacion: body.es_garantia_reparacion ?? false,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
