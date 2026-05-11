import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/negociaciones-cheques/[id]/avanzar
//
// Avanza la negociación al siguiente estado del flujo:
//   borrador → en_negociacion → cobranza → liquidacion → finalizada
//
// Si el siguiente estado es `finalizada`, además ejecuta el cierre completo:
//   - inserta mov_caja egreso por cada cheque del item
//   - marca los cheques como `negociado` o `endosado` según destino_tipo
//   - si destino=banco, inserta mov_banco ingreso por total_recibido
const FLUJO: Record<string, string> = {
  borrador: "en_negociacion",
  en_negociacion: "cobranza",
  cobranza: "liquidacion",
  liquidacion: "finalizada",
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: neg, error } = await supabase.from("negociaciones_cheques").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!neg) return apiError("Negociación no encontrada", 404)

  const siguiente = FLUJO[neg.estado]
  if (!siguiente) return apiError(`No se puede avanzar desde estado ${neg.estado}`, 409)

  if (siguiente !== "finalizada") {
    const { error: eUpd } = await supabase.from("negociaciones_cheques").update({ estado: siguiente }).eq("id", id)
    if (eUpd) return dbError(eUpd)
    return NextResponse.json({ ok: true, estado: siguiente })
  }

  // Finalizar: necesita extracto abierto + ejecuta workflow completo.
  const extracto = await getExtractoAbierto(supabase, neg.caja_id, neg.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const { data: items } = await supabase
    .from("negociacion_cheques_items")
    .select("cheque_id, valor_id, valor_nombre, importe")
    .eq("negociacion_id", id)

  for (const item of items ?? []) {
    const { error: eMov } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: item.valor_id || null,
      valor_nombre: item.valor_nombre,
      tipo_movimiento: "egreso",
      importe: item.importe,
      concepto: `Negociación cheques ${neg.numero}`,
      documento_origen_tipo: "negociacion_cheques",
      documento_origen_id: neg.id,
      documento_origen_numero: neg.numero,
      estado_movimiento: "confirmado",
    })
    if (eMov) return dbError(eMov)

    const { error: eChq } = await supabase
      .from("cheques_terceros")
      .update({
        estado: neg.destino_tipo === "banco" ? "negociado" : "endosado",
        fecha_egreso: new Date().toISOString(),
        destino_tipo: neg.destino_tipo,
        destino_nombre: neg.destino_tipo === "banco" ? neg.cuenta_bancaria_nombre : neg.proveedor_nombre,
      })
      .eq("id", item.cheque_id)
    if (eChq) return dbError(eChq)
  }

  if (neg.destino_tipo === "banco" && neg.cuenta_bancaria_id) {
    const { error: eMovB } = await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: neg.cuenta_bancaria_id,
      cuenta_bancaria_nombre: neg.cuenta_bancaria_nombre,
      tipo_movimiento: "ingreso",
      importe: neg.total_recibido,
      tipo_operacion: "Negociación Cheques",
      concepto: `Negociación cheques ${neg.numero}`,
      documento_origen_tipo: "negociacion_cheques",
      documento_origen_id: neg.id,
      documento_origen_numero: neg.numero,
      conciliado: false,
    })
    if (eMovB) return dbError(eMovB)
  }

  const { error: eUpd } = await supabase.from("negociaciones_cheques").update({ estado: "finalizada" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, estado: "finalizada" })
}
