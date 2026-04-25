import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const [opRes, mediosRes, compRes] = await Promise.all([
    supabase.from("compras_ordenes_pago").select("*").eq("id", id).single(),
    supabase.from("compras_op_medios_pago").select("*").eq("op_id", id).order("created_at"),
    supabase.from("compras_op_comprobantes").select("*").eq("op_id", id).order("created_at"),
  ])

  if (opRes.error) return NextResponse.json({ error: opRes.error.message }, { status: 500 })
  return NextResponse.json({
    ...opRes.data,
    medios_pago: mediosRes.data ?? [],
    comprobantes: compRes.data ?? [],
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  // Calcular periodo
  if (body.fecha) {
    const d = new Date(body.fecha)
    body.periodo = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
  }

  const { medios_pago, comprobantes, ...opData } = body
  opData.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from("compras_ordenes_pago").update(opData).eq("id", id).select().single()
  if (error) return dbError(error)

  // Reemplazar medios de pago
  if (Array.isArray(medios_pago)) {
    await supabase.from("compras_op_medios_pago").delete().eq("op_id", id)
    if (medios_pago.length > 0) {
      const mediosConOp = medios_pago.map((m: Record<string, unknown>) => {
        const { id: _mid, ...rest } = m as Record<string, unknown>
        return { ...rest, op_id: id }
      })
      await supabase.from("compras_op_medios_pago").insert(mediosConOp)
    }
  }

  // Reemplazar comprobantes
  if (Array.isArray(comprobantes)) {
    await supabase.from("compras_op_comprobantes").delete().eq("op_id", id)
    if (comprobantes.length > 0) {
      const compConOp = comprobantes.map((c: Record<string, unknown>) => {
        const { id: _cid, ...rest } = c as Record<string, unknown>
        return { ...rest, op_id: id }
      })
      await supabase.from("compras_op_comprobantes").insert(compConOp)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // Solo se puede eliminar en estado borrador
  const { data: op } = await supabase.from("compras_ordenes_pago").select("estado").eq("id", id).single()
  if (op && op.estado !== "borrador") {
    return NextResponse.json({ error: "Solo se pueden eliminar órdenes en estado borrador" }, { status: 400 })
  }

  const { error } = await supabase.from("compras_ordenes_pago").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ success: true })
}
