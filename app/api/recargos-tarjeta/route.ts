import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/recargos-tarjeta?tarjeta_id=1&grupo_id=1
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)

  let query = supabase
    .from("recargos_tarjeta")
    .select("*")
    .eq("activo", true)
    .order("desde_cuota")

  const tarjetaId = searchParams.get("tarjeta_id")
  const grupoId = searchParams.get("grupo_id")
  if (tarjetaId) query = query.eq("tarjeta_id", tarjetaId)
  if (grupoId) query = query.eq("grupo_id", grupoId)

  const { data, error } = await query
  if (error) return dbError(error)

  const result = (data ?? []).map((r: any) => ({
    ...r,
    dias: {
      lun: r.dia_lun, mar: r.dia_mar, mie: r.dia_mie,
      jue: r.dia_jue, vie: r.dia_vie, sab: r.dia_sab, dom: r.dia_dom,
    },
  }))

  return NextResponse.json(result)
}

// POST /api/recargos-tarjeta
// body: { tarjeta_id, grupo_id, desde_cuota?, hasta_cuota?, recargo_pct?,
//         activo?, sucursal_id?, fecha_desde?, fecha_hasta?,
//         dias?: { lun, mar, mie, jue, vie, sab, dom } }
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  if (!body.tarjeta_id || !body.grupo_id) {
    return NextResponse.json({ error: "tarjeta_id y grupo_id son requeridos" }, { status: 400 })
  }

  const dias = body.dias ?? {}
  const insert = {
    tarjeta_id:  body.tarjeta_id,
    grupo_id:    body.grupo_id,
    sucursal_id: body.sucursal_id ?? null,
    desde_cuota: body.desde_cuota ?? 1,
    hasta_cuota: body.hasta_cuota ?? 1,
    fecha_desde: body.fecha_desde ?? null,
    fecha_hasta: body.fecha_hasta ?? null,
    recargo_pct: body.recargo_pct ?? 0,
    activo:      body.activo ?? true,
    dia_lun: dias.lun ?? true,
    dia_mar: dias.mar ?? true,
    dia_mie: dias.mie ?? true,
    dia_jue: dias.jue ?? true,
    dia_vie: dias.vie ?? true,
    dia_sab: dias.sab ?? true,
    dia_dom: dias.dom ?? true,
  }

  const { data, error } = await supabase
    .from("recargos_tarjeta")
    .insert(insert)
    .select()
    .single()

  if (error) return dbError(error)
  const r = data as Record<string, unknown> & { dia_lun: boolean; dia_mar: boolean; dia_mie: boolean; dia_jue: boolean; dia_vie: boolean; dia_sab: boolean; dia_dom: boolean }
  return NextResponse.json({
    ...r,
    dias: {
      lun: r.dia_lun, mar: r.dia_mar, mie: r.dia_mie,
      jue: r.dia_jue, vie: r.dia_vie, sab: r.dia_sab, dom: r.dia_dom,
    },
  }, { status: 201 })
}
