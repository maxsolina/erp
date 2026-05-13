import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoTransferenciaBancaria } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/transferencias-bancarias/[id]/publicar
//
// Inserta movimientos_banco egreso en cuenta origen + ingreso en cuenta destino,
// genera asiento (DEBE banco destino / HABER banco origen) y marca como publicada.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: tr, error } = await supabase
    .from("transferencias_bancarias")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!tr) return apiError("Transferencia no encontrada", 404)
  if (tr.estado !== "borrador") return apiError("Solo se pueden publicar transferencias en borrador", 409)
  if (tr.desde_cuenta_id === tr.hasta_cuenta_id) return apiError("Origen y destino no pueden ser iguales", 409)

  const hoy = new Date().toISOString().split("T")[0]
  const fechaOrigen = tr.fecha_operacion_origen || hoy
  const fechaDestino = tr.fecha_operacion_destino || tr.fecha_operacion_origen || hoy

  // 1. Asiento contable PRIMERO (bloqueante).
  // Si falla, no se insertan movimientos y el usuario puede reintentar sin duplicar.
  const asientoRes = await generarAsientoTransferenciaBancaria(supabase, {
    id: tr.id,
    numero: tr.numero,
    fecha: fechaOrigen,
    desde_cuenta_id: tr.desde_cuenta_id,
    desde_cuenta_nombre: tr.desde_cuenta_nombre,
    hasta_cuenta_id: tr.hasta_cuenta_id,
    hasta_cuenta_nombre: tr.hasta_cuenta_nombre,
    importe: Number(tr.importe_origen),
  })
  if (!asientoRes.ok) return apiError(`No se generó el asiento: ${asientoRes.error}`, 409)

  // 2. Movimientos bancarios
  const { error: e1 } = await supabase.from("movimientos_banco").insert({
    cuenta_bancaria_id: tr.desde_cuenta_id,
    cuenta_bancaria_nombre: tr.desde_cuenta_nombre,
    tipo_movimiento: "egreso",
    importe: tr.importe_origen,
    tipo_operacion: "Transferencia entre Cuentas Propias",
    numero_operacion: tr.numero_operacion_origen,
    fecha_operacion: fechaOrigen,
    concepto: `Transferencia a ${tr.hasta_cuenta_nombre}`,
    documento_origen_tipo: "transferencia_bancaria",
    documento_origen_id: tr.id,
    documento_origen_numero: tr.numero,
    conciliado: false,
  })
  if (e1) return dbError(e1)

  const { error: e2 } = await supabase.from("movimientos_banco").insert({
    cuenta_bancaria_id: tr.hasta_cuenta_id,
    cuenta_bancaria_nombre: tr.hasta_cuenta_nombre,
    tipo_movimiento: "ingreso",
    importe: tr.importe_origen,
    tipo_operacion: "Transferencia entre Cuentas Propias",
    numero_operacion: tr.numero_operacion_destino,
    fecha_operacion: fechaDestino,
    concepto: `Transferencia desde ${tr.desde_cuenta_nombre}`,
    documento_origen_tipo: "transferencia_bancaria",
    documento_origen_id: tr.id,
    documento_origen_numero: tr.numero,
    conciliado: false,
  })
  if (e2) return dbError(e2)

  // 3. Cambiar estado
  const { error: eUpd } = await supabase.from("transferencias_bancarias").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
