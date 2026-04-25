import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .select("*, taller_equipos(nombre), taller_fallas(nombre), taller_categorias_reparacion(nombre)")
    .eq("id", id)
    .single()

  if (error) return dbError(error)

  const { data: reps } = await supabase
    .from("taller_fallas_por_equipo_repuestos")
    .select("producto_id, cantidad")
    .eq("falla_equipo_id", id)

  ;(data as Record<string, unknown>).repuestos = reps ?? []

  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()
  const { repuestos, ...fields } = body

  const { data, error } = await supabase
    .from("taller_fallas_por_equipo")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)

  if (repuestos !== undefined) {
    await supabase.from("taller_fallas_por_equipo_repuestos").delete().eq("falla_equipo_id", id)
    if (repuestos?.length) {
      const rows = repuestos.map((r: { producto_id: string; cantidad: number }) => ({
        falla_equipo_id: id,
        producto_id: r.producto_id,
        cantidad: r.cantidad ?? 1,
      }))
      await supabase.from("taller_fallas_por_equipo_repuestos").insert(rows)
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
