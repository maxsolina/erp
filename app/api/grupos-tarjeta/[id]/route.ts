import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PUT /api/grupos-tarjeta/[id]
// Actualiza datos del grupo y opcionalmente sincroniza tarjetas vinculadas y cargos.
// body: { nombre?, banco?, tipo_movimiento?, activo?,
//         tarjeta_ids?: number[],
//         cargos?: [{ id?, nombre, tipo?, arancel, es_porcentaje?, cuenta_contable? }] }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const grupoId = Number(id)
  const body = await req.json()

  // 1. Actualizar campos básicos del grupo
  const update: Record<string, unknown> = {}
  if (body.nombre !== undefined)          update.nombre          = body.nombre
  if (body.banco !== undefined)           update.banco           = body.banco
  if (body.tipo_movimiento !== undefined) update.tipo_movimiento = body.tipo_movimiento
  if (body.activo !== undefined)          update.activo          = body.activo

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("grupos_tarjeta").update(update).eq("id", grupoId)
    if (error) return dbError(error)
  }

  // 2. Sincronizar tarjetas vinculadas (si se envían)
  if (Array.isArray(body.tarjeta_ids)) {
    // Borrar todas y reinsertar
    await supabase.from("grupos_tarjeta_tarjetas").delete().eq("grupo_id", grupoId)
    if (body.tarjeta_ids.length > 0) {
      const filas = body.tarjeta_ids.map((tid: number) => ({ grupo_id: grupoId, tarjeta_id: tid }))
      const { error } = await supabase.from("grupos_tarjeta_tarjetas").insert(filas)
      if (error) return dbError(error)
    }
  }

  // 3. Sincronizar cargos (si se envían)
  if (Array.isArray(body.cargos)) {
    // Estrategia simple: borrar todos y reinsertar
    await supabase.from("grupos_tarjeta_cargos").delete().eq("grupo_id", grupoId)
    if (body.cargos.length > 0) {
      const filas = body.cargos.map((c: { nombre: string; tipo?: string; arancel: number; es_porcentaje?: boolean; cuenta_contable?: string }) => ({
        grupo_id:        grupoId,
        nombre:          c.nombre,
        tipo:            c.tipo ?? "Gasto",
        arancel:         c.arancel,
        es_porcentaje:   c.es_porcentaje ?? true,
        cuenta_contable: c.cuenta_contable ?? null,
      }))
      const { error } = await supabase.from("grupos_tarjeta_cargos").insert(filas)
      if (error) return dbError(error)
    }
  }

  // 4. Devolver el grupo completo recargado
  const { data, error } = await supabase
    .from("grupos_tarjeta")
    .select(`
      id, nombre, banco, tipo_movimiento, activo,
      grupos_tarjeta_tarjetas(tarjeta_id),
      grupos_tarjeta_cargos(id, nombre, tipo, arancel, es_porcentaje, cuenta_contable)
    `)
    .eq("id", grupoId)
    .single()

  if (error) return dbError(error)
  const result = {
    id: data.id,
    nombre: data.nombre,
    banco: data.banco ?? "",
    tipo_movimiento: data.tipo_movimiento ?? "",
    activo: data.activo,
    tarjetas_ids: ((data as { grupos_tarjeta_tarjetas?: { tarjeta_id: number }[] }).grupos_tarjeta_tarjetas ?? []).map(t => t.tarjeta_id),
    cargos: (data as { grupos_tarjeta_cargos?: unknown[] }).grupos_tarjeta_cargos ?? [],
  }
  return NextResponse.json(result)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  // Las tablas grupos_tarjeta_tarjetas, grupos_tarjeta_cargos y recargos_tarjeta
  // tienen ON DELETE CASCADE sobre grupo_id, así que se limpian solas.
  const { error } = await supabase.from("grupos_tarjeta").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
