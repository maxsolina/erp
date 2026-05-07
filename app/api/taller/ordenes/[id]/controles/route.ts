import { dbError } from "@/lib/api-utils"
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

  if (error) return dbError(error)
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

  // Buscar PRIMERO los controles del maestro para saber si hay items que
  // creen este checklist. Si no hay ninguno, devolvemos error sin crear
  // un wrapper vacío que ensucie la DB.
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

  if (filtered.length === 0) {
    const flagLabel = isRecepcion ? "Aparece en el control inicial" : "Aparece en el control final"
    return NextResponse.json({
      error: `No hay controles configurados para esta área con la flag "${flagLabel}" activada. Andá a Configuración → Controles, creá uno (o editá uno existente) y volvé a intentar.`,
    }, { status: 422 })
  }

  // Crear registro de control (wrapper) recién ahora que sabemos que hay items
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

  if (ctrl) {
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
