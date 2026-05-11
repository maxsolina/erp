import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, getValorEnCaja } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/conversiones-moneda/[id]/publicar
//
// Workflow:
//  1. Verifica que la conversión esté en borrador.
//  2. Verifica extracto abierto de la caja.
//  3. Verifica que la caja tenga un valor en moneda_destino tipo efectivo.
//  4. Inserta movimiento_caja egreso del valor origen.
//  5. Inserta movimiento_caja ingreso del valor destino.
//  6. Si hay diferencia de redondeo, inserta movimiento auxiliar.
//  7. Marca la conversión como publicada.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: conv, error } = await supabase
    .from("conversiones_moneda")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!conv) return apiError("Conversión no encontrada", 404)
  if (conv.estado !== "borrador") return apiError("Solo se pueden publicar conversiones en borrador", 409)

  const extracto = await getExtractoAbierto(supabase, conv.caja_id, conv.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const valDest = await getValorEnCaja(supabase, conv.caja_id, conv.moneda_destino, "efectivo")
  if (!valDest.ok) return apiError(valDest.error, 409)

  // Egreso del valor origen.
  const { error: e1 } = await supabase.from("movimientos_caja").insert({
    extracto_id: extracto.extractoId,
    valor_id: conv.valor_origen_id,
    valor_nombre: conv.valor_origen_nombre,
    tipo_movimiento: "egreso",
    importe: conv.importe_origen,
    moneda: conv.moneda_origen,
    concepto: `Conversión a ${conv.moneda_destino} @ ${conv.cotizacion}`,
    documento_origen_tipo: "conversion_moneda",
    documento_origen_id: conv.id,
    documento_origen_numero: conv.numero,
    estado_movimiento: "confirmado",
  })
  if (e1) return dbError(e1)

  // Ingreso del valor destino.
  const { error: e2 } = await supabase.from("movimientos_caja").insert({
    extracto_id: extracto.extractoId,
    valor_id: conv.valor_destino_id,
    valor_nombre: conv.valor_destino_nombre,
    tipo_movimiento: "ingreso",
    importe: conv.importe_destino,
    moneda: conv.moneda_destino,
    concepto: `Conversión desde ${conv.moneda_origen} @ ${conv.cotizacion}`,
    documento_origen_tipo: "conversion_moneda",
    documento_origen_id: conv.id,
    documento_origen_numero: conv.numero,
    estado_movimiento: "confirmado",
  })
  if (e2) return dbError(e2)

  // Diferencia de redondeo.
  if (Math.abs(conv.diferencia_redondeo ?? 0) > 0.001) {
    const { error: e3 } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: conv.valor_origen_id,
      valor_nombre: conv.valor_origen_nombre,
      tipo_movimiento: conv.diferencia_redondeo > 0 ? "egreso" : "ingreso",
      importe: Math.abs(conv.diferencia_redondeo),
      moneda: conv.moneda_origen,
      concepto: `Diferencia redondeo conversión ${conv.numero}`,
      documento_origen_tipo: "conversion_moneda_redondeo",
      documento_origen_id: conv.id,
      estado_movimiento: "confirmado",
    })
    if (e3) return dbError(e3)
  }

  const { error: eUpd } = await supabase
    .from("conversiones_moneda")
    .update({ estado: "publicado" })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
