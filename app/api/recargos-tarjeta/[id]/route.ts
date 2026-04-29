import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.tarjeta_id !== undefined)  update.tarjeta_id  = body.tarjeta_id
  if (body.grupo_id !== undefined)    update.grupo_id    = body.grupo_id
  if (body.sucursal_id !== undefined) update.sucursal_id = body.sucursal_id
  if (body.desde_cuota !== undefined) update.desde_cuota = body.desde_cuota
  if (body.hasta_cuota !== undefined) update.hasta_cuota = body.hasta_cuota
  if (body.fecha_desde !== undefined) update.fecha_desde = body.fecha_desde
  if (body.fecha_hasta !== undefined) update.fecha_hasta = body.fecha_hasta
  if (body.recargo_pct !== undefined) update.recargo_pct = body.recargo_pct
  if (body.activo !== undefined)      update.activo      = body.activo

  if (body.dias !== undefined) {
    if (body.dias.lun !== undefined) update.dia_lun = body.dias.lun
    if (body.dias.mar !== undefined) update.dia_mar = body.dias.mar
    if (body.dias.mie !== undefined) update.dia_mie = body.dias.mie
    if (body.dias.jue !== undefined) update.dia_jue = body.dias.jue
    if (body.dias.vie !== undefined) update.dia_vie = body.dias.vie
    if (body.dias.sab !== undefined) update.dia_sab = body.dias.sab
    if (body.dias.dom !== undefined) update.dia_dom = body.dias.dom
  }

  const { data, error } = await supabase
    .from("recargos_tarjeta")
    .update(update)
    .eq("id", id)
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
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const { error } = await supabase.from("recargos_tarjeta").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
