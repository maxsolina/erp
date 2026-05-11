import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/grupos-tarjeta
// Devuelve grupos con sus tarjetas y cargos embebidos
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("grupos_tarjeta")
    .select(`
      id, nombre, banco, tipo_movimiento, activo,
      grupos_tarjeta_tarjetas(tarjeta_id),
      grupos_tarjeta_cargos(id, nombre, tipo, arancel, es_porcentaje, cuenta_contable)
    `)
    .eq("activo", true)
    .order("nombre")
  if (error) return dbError(error)

  const result = (data ?? []).map((g: any) => ({
    id: g.id,
    nombre: g.nombre,
    banco: g.banco ?? "",
    tipo_movimiento: g.tipo_movimiento ?? "",
    activo: g.activo,
    tarjetas_ids: (g.grupos_tarjeta_tarjetas ?? []).map((t: any) => t.tarjeta_id),
    cargos: g.grupos_tarjeta_cargos ?? [],
  }))

  return NextResponse.json(result)
}

// POST /api/grupos-tarjeta
// body: { nombre, banco?, tipo_movimiento?, activo?,
//         tarjeta_ids?: number[], cargos?: [...] }
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from("grupos_tarjeta")
    .insert({
      nombre: body.nombre,
      banco: body.banco ?? null,
      tipo_movimiento: body.tipo_movimiento ?? null,
      activo: body.activo ?? true,
    })
    .select()
    .single()
  if (error) return dbError(error)

  const grupoId = (data as { id: number }).id

  // Tarjetas vinculadas
  if (Array.isArray(body.tarjeta_ids) && body.tarjeta_ids.length > 0) {
    const filas = body.tarjeta_ids.map((tid: number) => ({ grupo_id: grupoId, tarjeta_id: tid }))
    const { error: tErr } = await supabase.from("grupos_tarjeta_tarjetas").insert(filas)
    if (tErr) return dbError(tErr)
  }

  // Cargos
  if (Array.isArray(body.cargos) && body.cargos.length > 0) {
    const filas = body.cargos.map((c: any) => ({
      grupo_id: grupoId,
      nombre: c.nombre,
      tipo: c.tipo ?? null,
      arancel: c.arancel ?? 0,
      es_porcentaje: c.es_porcentaje ?? true,
      cuenta_contable: c.cuenta_contable ?? null,
    }))
    const { error: cErr } = await supabase.from("grupos_tarjeta_cargos").insert(filas)
    if (cErr) return dbError(cErr)
  }

  return NextResponse.json({ ...data, tarjetas_ids: body.tarjeta_ids ?? [], cargos: body.cargos ?? [] }, { status: 201 })
}
