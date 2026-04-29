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
  if (body.nombre !== undefined)            update.nombre            = body.nombre
  if (body.tipo !== undefined)              update.tipo              = body.tipo
  if (body.dias_presentacion !== undefined) update.dias_presentacion = body.dias_presentacion
  if (body.dias_pago !== undefined)         update.dias_pago         = body.dias_pago
  if (body.activa !== undefined)            update.activa            = body.activa

  const { data, error } = await supabase
    .from("tarjetas")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const { error } = await supabase.from("tarjetas").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
