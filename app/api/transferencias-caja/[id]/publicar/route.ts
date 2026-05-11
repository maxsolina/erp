import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/transferencias-caja/[id]/publicar
//
// Workflow:
//   1. Verifica extractos abiertos en caja origen y destino.
//   2. Inserta movimiento_caja egreso confirmado en origen.
//   3. Inserta movimiento_caja ingreso pendiente en destino (espera "recibir").
//   4. Transferencia: borrador → pendiente.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase.from("transferencias_caja").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "borrador") return apiError("Solo se pueden publicar transferencias en borrador", 409)

  const extOrigen = await getExtractoAbierto(supabase, tr.caja_desde_id, tr.caja_desde_nombre)
  if (!extOrigen.ok) return apiError(extOrigen.error, 409)
  const extDestino = await getExtractoAbierto(supabase, tr.caja_hasta_id, tr.caja_hasta_nombre)
  if (!extDestino.ok) return apiError(extDestino.error, 409)

  const { data: movSalida, error: e1 } = await supabase
    .from("movimientos_caja")
    .insert({
      extracto_id: extOrigen.extractoId,
      valor_id: tr.valor_id,
      valor_nombre: tr.valor_nombre,
      tipo_movimiento: "egreso",
      importe: tr.importe,
      concepto: `Transf. a ${tr.caja_hasta_nombre}`,
      documento_origen_tipo: "transferencia_caja_salida",
      documento_origen_id: tr.id,
      documento_origen_numero: tr.numero,
      estado_movimiento: "confirmado",
    })
    .select("id")
    .single()
  if (e1) return dbError(e1)

  const { data: movEntrada, error: e2 } = await supabase
    .from("movimientos_caja")
    .insert({
      extracto_id: extDestino.extractoId,
      valor_id: tr.valor_id,
      valor_nombre: tr.valor_nombre,
      tipo_movimiento: "ingreso",
      importe: tr.importe,
      concepto: `Transf. desde ${tr.caja_desde_nombre}`,
      documento_origen_tipo: "transferencia_caja_entrada",
      documento_origen_id: tr.id,
      documento_origen_numero: tr.numero,
      estado_movimiento: "pendiente",
    })
    .select("id")
    .single()
  if (e2) return dbError(e2)

  const { error: eUpd } = await supabase
    .from("transferencias_caja")
    .update({
      estado: "pendiente",
      comprobante_salida_id: movSalida?.id,
      comprobante_entrada_id: movEntrada?.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
