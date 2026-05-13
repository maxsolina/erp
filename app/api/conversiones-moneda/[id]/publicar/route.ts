import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, getValorEnCaja } from "@/lib/finanzas-server"
import { generarAsientoConversionMoneda } from "@/lib/contabilidad-asiento-factory"
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

  // 1. Asiento contable PRIMERO (bloqueante).
  // Si falla, no se insertan movimientos y el usuario puede reintentar sin duplicar.
  const asientoRes = await generarAsientoConversionMoneda(supabase, {
    id: conv.id,
    numero: conv.numero,
    fecha: conv.fecha || new Date().toISOString().split("T")[0],
    caja_id: conv.caja_id,
    sucursal: conv.sucursal,
    valor_origen_id: conv.valor_origen_id,
    valor_origen_nombre: conv.valor_origen_nombre,
    valor_destino_id: conv.valor_destino_id,
    valor_destino_nombre: conv.valor_destino_nombre,
    moneda_origen: conv.moneda_origen,
    moneda_destino: conv.moneda_destino,
    importe_origen: Number(conv.importe_origen),
    importe_destino: Number(conv.importe_destino),
    cotizacion: Number(conv.cotizacion),
  })
  if (!asientoRes.ok) return apiError(`No se generó el asiento: ${asientoRes.error}`, 409)

  // 2. Egreso del valor origen.
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

  // 3. Ingreso del valor destino.
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

  // Nota: la diferencia por redondeo NO se asienta en la caja física,
  // se refleja como línea de "Diferencia de Cambio" dentro del asiento contable.

  // 4. Cambiar estado
  const { error: eUpd } = await supabase
    .from("conversiones_moneda")
    .update({ estado: "publicado" })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
