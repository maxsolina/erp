import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .select("*, taller_equipos(nombre, marca, modelo), taller_fallas(nombre), taller_categorias_reparacion(nombre)")
    .order("equipo_id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Cargar repuestos
  if (data?.length) {
    const ids = data.map((r: { id: string }) => r.id)
    const { data: reps } = await supabase
      .from("taller_fallas_por_equipo_repuestos")
      .select("falla_equipo_id, producto_id, cantidad")
      .in("falla_equipo_id", ids)

    const repMap: Record<string, { producto_id: string; cantidad: number }[]> = {}
    for (const r of reps ?? []) {
      if (!repMap[r.falla_equipo_id]) repMap[r.falla_equipo_id] = []
      repMap[r.falla_equipo_id].push({ producto_id: r.producto_id, cantidad: r.cantidad })
    }
    for (const item of data) {
      (item as Record<string, unknown>).repuestos = repMap[item.id] ?? []
    }
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .insert([{
      equipo_id: body.equipo_id,
      falla_id: body.falla_id,
      categoria_id: body.categoria_id ?? null,
      complejidad_principal: body.complejidad_principal ?? 1,
      complejidad_secundaria: body.complejidad_secundaria ?? 1,
      tiempo_reparacion_principal: body.tiempo_reparacion_principal ?? 0,
      tiempo_reparacion_secundaria: body.tiempo_reparacion_secundaria ?? 0,
      puntaje_base: body.puntaje_base ?? 50,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.repuestos?.length && data) {
    const rows = body.repuestos.map((r: { producto_id: string; cantidad: number }) => ({
      falla_equipo_id: data.id,
      producto_id: r.producto_id,
      cantidad: r.cantidad ?? 1,
    }))
    await supabase.from("taller_fallas_por_equipo_repuestos").insert(rows)
  }

  return NextResponse.json(data, { status: 201 })
}
