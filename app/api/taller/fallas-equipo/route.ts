import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  // No usamos joins de PostgREST para evitar errores tipo
  // "Could not find the 'taller_X' column ... in the schema cache" cuando
  // las FK no están registradas. Hacemos lookups separados por id y armamos
  // el resultado en JS.
  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .select("*")
    .order("equipo_id")

  if (error) return dbError(error)
  if (!data?.length) return NextResponse.json([])

  // Equipos
  const equipoIds = [...new Set(data.map(r => r.equipo_id).filter(Boolean))]
  const { data: equipos } = equipoIds.length
    ? await supabase
        .from("taller_equipos")
        .select("id, nombre, marca, modelo")
        .in("id", equipoIds)
    : { data: [] as Array<{ id: string; nombre: string; marca?: string; modelo?: string }> }
  const equipoMap = new Map<string, { nombre: string; marca?: string; modelo?: string }>()
  for (const e of equipos ?? []) {
    equipoMap.set(e.id, { nombre: e.nombre, marca: e.marca, modelo: e.modelo })
  }

  // Fallas
  const fallaIds = [...new Set(data.map(r => r.falla_id).filter(Boolean))]
  const { data: fallas } = fallaIds.length
    ? await supabase.from("taller_fallas").select("id, nombre").in("id", fallaIds)
    : { data: [] as Array<{ id: string; nombre: string }> }
  const fallaMap = new Map<string, string>()
  for (const f of fallas ?? []) fallaMap.set(f.id, f.nombre)

  // Categorías (puede ser null en algunas filas)
  const catIds = [...new Set(data.map(r => r.categoria_id).filter(Boolean))]
  const { data: cats } = catIds.length
    ? await supabase.from("taller_categorias_reparacion").select("id, nombre").in("id", catIds)
    : { data: [] as Array<{ id: string; nombre: string }> }
  const catMap = new Map<string, string>()
  for (const c of cats ?? []) catMap.set(c.id, c.nombre)

  // Repuestos por falla_equipo_id
  const ids = data.map(r => r.id)
  const { data: reps } = await supabase
    .from("taller_fallas_por_equipo_repuestos")
    .select("falla_equipo_id, producto_id, cantidad")
    .in("falla_equipo_id", ids)
  const repMap: Record<string, { producto_id: number; cantidad: number }[]> = {}
  for (const r of reps ?? []) {
    if (!repMap[r.falla_equipo_id]) repMap[r.falla_equipo_id] = []
    repMap[r.falla_equipo_id].push({ producto_id: Number(r.producto_id), cantidad: Number(r.cantidad) })
  }

  // Combinar todo en el formato que espera el frontend (mismas claves que
  // antes generaba el join PostgREST)
  const enriched = data.map(item => {
    const eq = item.equipo_id ? equipoMap.get(item.equipo_id) : null
    const fa = item.falla_id ? fallaMap.get(item.falla_id) : null
    const cat = item.categoria_id ? catMap.get(item.categoria_id) : null
    return {
      ...item,
      taller_equipos: eq ?? null,
      taller_fallas: fa ? { nombre: fa } : null,
      taller_categorias_reparacion: cat ? { nombre: cat } : null,
      repuestos: repMap[item.id] ?? [],
    }
  })

  return NextResponse.json(enriched)
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

  if (error) return dbError(error)

  if (body.repuestos?.length && data) {
    const rows = body.repuestos
      .filter((r: { producto_id: unknown }) => r.producto_id != null && r.producto_id !== "")
      .map((r: { producto_id: string | number; cantidad: number }) => ({
        falla_equipo_id: data.id,
        producto_id: Number(r.producto_id),
        cantidad: Number(r.cantidad ?? 1),
      }))
    if (rows.length > 0) {
      const { error: repErr } = await supabase
        .from("taller_fallas_por_equipo_repuestos")
        .insert(rows)
      if (repErr) console.error("[fallas-equipo POST] error en repuestos:", repErr.message)
    }
  }

  await registrarEvento(supabase, {
    tipo_documento: "taller_falla_equipo",
    documento_id: data.id,
    tipo_evento: "creacion",
    descripcion: `Falla por equipo creada`,
    usuario: null,
  })
  return NextResponse.json(data, { status: 201 })
}
