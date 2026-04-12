import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_tecnicos")
    .select("*, taller_areas_reparacion(nombre), taller_categorias_reparacion(nombre), taller_turnos(nombre, hora_entrada, hora_salida)")
    .order("nombre")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Cargar categorías secundarias
  if (data) {
    const ids = data.map((t: { id: string }) => t.id)
    const { data: secs } = await supabase
      .from("taller_tecnico_categorias_secundarias")
      .select("tecnico_id, categoria_id, taller_categorias_reparacion(nombre)")
      .in("tecnico_id", ids)

    const secMap: Record<string, { categoria_id: string; nombre: string }[]> = {}
    for (const s of secs ?? []) {
      if (!secMap[s.tecnico_id]) secMap[s.tecnico_id] = []
      secMap[s.tecnico_id].push({
        categoria_id: s.categoria_id,
        nombre: (s.taller_categorias_reparacion as { nombre: string } | null)?.nombre ?? "",
      })
    }

    for (const t of data) {
      (t as Record<string, unknown>).categorias_secundarias = secMap[t.id] ?? []
    }
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_tecnicos")
    .insert([{
      nombre: body.nombre,
      tipo: body.tipo,
      area_id: body.area_id,
      categoria_principal_id: body.categoria_principal_id ?? null,
      complejidad_tope: body.complejidad_tope ?? null,
      turno_id: body.turno_id,
      activo: body.activo ?? true,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insertar categorías secundarias
  if (body.categorias_secundarias?.length && data) {
    const rows = body.categorias_secundarias.map((cid: string) => ({
      tecnico_id: data.id,
      categoria_id: cid,
    }))
    await supabase.from("taller_tecnico_categorias_secundarias").insert(rows)
  }

  return NextResponse.json(data, { status: 201 })
}
