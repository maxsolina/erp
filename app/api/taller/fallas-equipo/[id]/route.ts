import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Lookup manual (sin joins PostgREST) para no depender de FK registradas.
  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return dbError(error)

  const enriched: Record<string, unknown> = { ...data }

  if (data.equipo_id) {
    const { data: eq } = await supabase
      .from("taller_equipos")
      .select("nombre, marca, modelo")
      .eq("id", data.equipo_id)
      .maybeSingle()
    enriched.taller_equipos = eq ?? null
  }

  if (data.falla_id) {
    const { data: fa } = await supabase
      .from("taller_fallas")
      .select("nombre")
      .eq("id", data.falla_id)
      .maybeSingle()
    enriched.taller_fallas = fa ?? null
  }

  if (data.categoria_id) {
    const { data: cat } = await supabase
      .from("taller_categorias_reparacion")
      .select("nombre")
      .eq("id", data.categoria_id)
      .maybeSingle()
    enriched.taller_categorias_reparacion = cat ?? null
  }

  const { data: reps } = await supabase
    .from("taller_fallas_por_equipo_repuestos")
    .select("producto_id, cantidad")
    .eq("falla_equipo_id", id)
  enriched.repuestos = (reps ?? []).map(r => ({
    producto_id: Number(r.producto_id),
    cantidad: Number(r.cantidad),
  }))

  return NextResponse.json(enriched)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  // Whitelist de columnas reales — el body trae campos enriquecidos del GET
  // (taller_equipos, taller_fallas, taller_categorias_reparacion) que NO son
  // columnas, son lookups manuales. Filtramos para no pasarlos al UPDATE.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.equipo_id !== undefined) update.equipo_id = body.equipo_id
  if (body.falla_id !== undefined) update.falla_id = body.falla_id
  if (body.categoria_id !== undefined) update.categoria_id = body.categoria_id ?? null
  if (body.complejidad_principal !== undefined) update.complejidad_principal = Number(body.complejidad_principal ?? 1)
  if (body.complejidad_secundaria !== undefined) update.complejidad_secundaria = Number(body.complejidad_secundaria ?? 1)
  if (body.tiempo_reparacion_principal !== undefined) update.tiempo_reparacion_principal = Number(body.tiempo_reparacion_principal ?? 0)
  if (body.tiempo_reparacion_secundaria !== undefined) update.tiempo_reparacion_secundaria = Number(body.tiempo_reparacion_secundaria ?? 0)
  if (body.puntaje_base !== undefined) update.puntaje_base = Number(body.puntaje_base ?? 50)

  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)

  // Reemplazar repuestos si se envían
  if (body.repuestos !== undefined) {
    await supabase.from("taller_fallas_por_equipo_repuestos").delete().eq("falla_equipo_id", id)
    if (Array.isArray(body.repuestos) && body.repuestos.length > 0) {
      const rows = body.repuestos
        .filter((r: { producto_id: unknown }) => r.producto_id != null && r.producto_id !== "")
        .map((r: { producto_id: string | number; cantidad: number }) => ({
          falla_equipo_id: id,
          producto_id: Number(r.producto_id),
          cantidad: Number(r.cantidad ?? 1),
        }))
      if (rows.length > 0) {
        const { error: repErr } = await supabase
          .from("taller_fallas_por_equipo_repuestos")
          .insert(rows)
        if (repErr) console.error("[fallas-equipo PATCH] error en repuestos:", repErr.message)
      }
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("taller_fallas_por_equipo").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
