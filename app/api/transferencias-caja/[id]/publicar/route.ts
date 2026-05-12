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

  // El valor de la caja origen no existe como tal en la caja destino. Hay que
  // mapear al valor equivalente en destino por (tipo + moneda). Sin un valor
  // equivalente no podemos publicar — sería un movimiento huérfano.
  const { data: valorOrigen } = await supabase
    .from("caja_valores")
    .select("tipo, moneda")
    .eq("id", tr.valor_id)
    .maybeSingle()
  if (!valorOrigen) return apiError("Valor de origen no encontrado", 404)

  const { data: valorDestino } = await supabase
    .from("caja_valores")
    .select("id, nombre")
    .eq("caja_id", tr.caja_hasta_id)
    .eq("tipo", valorOrigen.tipo)
    .eq("moneda", valorOrigen.moneda)
    .is("banco_permitido_id", null)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (!valorDestino) {
    return apiError(
      `La caja destino "${tr.caja_hasta_nombre}" no tiene un valor de tipo "${valorOrigen.tipo}" en moneda "${valorOrigen.moneda}". Configurá uno antes de publicar.`,
      422,
    )
  }

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
      valor_id: valorDestino.id,
      valor_nombre: valorDestino.nombre,
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
