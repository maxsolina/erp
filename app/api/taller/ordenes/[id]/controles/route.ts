import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/taller/ordenes/[id]/controles
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("taller_ot_controles")
    .select("*, taller_ot_control_items(*)")
    .eq("ot_id", id)
    .order("created_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/taller/ordenes/[id]/controles
// Crea un registro de control (inicial o final) con items basados en el maestro
// Body: { tipo: 'inicial'|'final', area_id, categoria_id? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const tipo = body.tipo ?? "inicial"

  // Crear registro de control
  const { data: ctrl, error: ctrlErr } = await supabase
    .from("taller_ot_controles")
    .insert([{
      ot_id: id,
      tipo,
      historico: false,
      completado: false,
    }])
    .select()
    .single()

  if (ctrlErr) return NextResponse.json({ error: ctrlErr.message }, { status: 500 })

  // Buscar controles del maestro según tipo, área y categoría
  const isRecepcion = tipo === "inicial"
  let masterQuery = supabase
    .from("taller_controles")
    .select("*")
    .eq("activo", true)
    .eq("area_id", body.area_id)

  if (isRecepcion) {
    masterQuery = masterQuery.eq("disponible_recepcion", true)
  } else {
    masterQuery = masterQuery.eq("disponible_calidad", true)
  }

  const { data: masters } = await masterQuery.order("orden")

  // Filtrar por categoría: incluir los que coinciden o los que no tienen categoría (null = todas)
  const filtered = (masters ?? []).filter(
    m => !m.categoria_id || m.categoria_id === body.categoria_id
  )

  if (filtered.length && ctrl) {
    const items = filtered.map(m => ({
      control_id: ctrl.id,
      control_maestro_id: m.id,
      nombre: m.nombre,
      obs_inicial: null,
      check_inicial: false,
      obs_final: null,
      check_final: false,
    }))
    await supabase.from("taller_ot_control_items").insert(items)
  }

  // Retornar control completo
  const { data: result } = await supabase
    .from("taller_ot_controles")
    .select("*, taller_ot_control_items(*)")
    .eq("id", ctrl!.id)
    .single()

  return NextResponse.json(result, { status: 201 })
}
