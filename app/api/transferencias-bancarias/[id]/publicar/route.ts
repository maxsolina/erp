import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/transferencias-bancarias/[id]/publicar
//
// Inserta movimientos_banco egreso en cuenta origen + ingreso en cuenta destino
// y marca la transferencia como publicada.
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

  const { error: e1 } = await supabase.from("movimientos_banco").insert({
    cuenta_bancaria_id: tr.desde_cuenta_id,
    cuenta_bancaria_nombre: tr.desde_cuenta_nombre,
    tipo_movimiento: "egreso",
    importe: tr.importe_origen,
    tipo_operacion: "Transferencia entre Cuentas Propias",
    numero_operacion: tr.numero_operacion_origen,
    fecha_operacion: tr.fecha_operacion_origen,
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
    fecha_operacion: tr.fecha_operacion_destino,
    concepto: `Transferencia desde ${tr.desde_cuenta_nombre}`,
    documento_origen_tipo: "transferencia_bancaria",
    documento_origen_id: tr.id,
    documento_origen_numero: tr.numero,
    conciliado: false,
  })
  if (e2) return dbError(e2)

  const { error: eUpd } = await supabase.from("transferencias_bancarias").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
