import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("taller_tecnicos")
    .select("*, taller_areas_reparacion(nombre), taller_categorias_reparacion(nombre), taller_turnos(nombre, hora_entrada, hora_salida)")
    .eq("id", id)
    .single()

  if (error) return dbError(error)

  // Categorías secundarias
  const { data: secs } = await supabase
    .from("taller_tecnico_categorias_secundarias")
    .select("categoria_id, taller_categorias_reparacion(nombre)")
    .eq("tecnico_id", id)

  ;(data as Record<string, unknown>).categorias_secundarias = (secs ?? []).map(s => {
    const categoria = Array.isArray(s.taller_categorias_reparacion)
      ? s.taller_categorias_reparacion[0]
      : s.taller_categorias_reparacion

    return {
      categoria_id: s.categoria_id,
      nombre: (categoria as { nombre?: string } | null)?.nombre ?? "",
    }
  })

  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { categorias_secundarias, ...fields } = body

  const { data, error } = await supabase
    .from("taller_tecnicos")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)

  // Reemplazar categorías secundarias si se envían
  if (categorias_secundarias !== undefined) {
    await supabase.from("taller_tecnico_categorias_secundarias").delete().eq("tecnico_id", id)
    if (categorias_secundarias?.length) {
      const rows = categorias_secundarias.map((cid: string) => ({
        tecnico_id: id,
        categoria_id: cid,
      }))
      await supabase.from("taller_tecnico_categorias_secundarias").insert(rows)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from("taller_tecnicos")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
