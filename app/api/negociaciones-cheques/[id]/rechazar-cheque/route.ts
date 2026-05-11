import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/negociaciones-cheques/[id]/rechazar-cheque
// body: { cheque_id, motivo? }
//
// Marca un cheque como rechazado, genera una nota_debito_cheque_rechazado,
// y la registra en negociacion_cheques_devueltos.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  if (!body.cheque_id) return apiError("cheque_id es requerido", 400)

  const supabase = await createClient()

  const { data: neg } = await supabase.from("negociaciones_cheques").select("id").eq("id", id).maybeSingle()
  if (!neg) return apiError("Negociación no encontrada", 404)

  const { data: cheque } = await supabase.from("cheques_terceros").select("*").eq("id", body.cheque_id).maybeSingle()
  if (!cheque) return apiError("Cheque no encontrado", 404)

  const total = cheque.importe
  const { data: nd, error: eNd } = await supabase
    .from("notas_debito_cheque_rechazado")
    .insert({
      numero: `ND-CHQ-${Date.now()}`,
      negociacion_id: id,
      cheque_id: body.cheque_id,
      cliente_nombre: cheque.origen_nombre || "",
      importe_cheque: cheque.importe,
      gastos_bancarios: 0,
      total,
      fecha: new Date().toISOString().split("T")[0],
    })
    .select()
    .single()
  if (eNd) return dbError(eNd)

  const { error: eChq } = await supabase
    .from("cheques_terceros")
    .update({ estado: "rechazado", fecha_egreso: new Date().toISOString() })
    .eq("id", body.cheque_id)
  if (eChq) return dbError(eChq)

  const { error: eDev } = await supabase
    .from("negociacion_cheques_devueltos")
    .upsert({
      negociacion_id: id,
      cheque_id: body.cheque_id,
      nd_generada_id: nd.id,
      fecha_rechazo: new Date().toISOString().split("T")[0],
      motivo_rechazo: body.motivo ?? "Rechazado por el banco",
    })
  if (eDev) return dbError(eDev)

  return NextResponse.json({ ok: true, nd_numero: nd.numero })
}
