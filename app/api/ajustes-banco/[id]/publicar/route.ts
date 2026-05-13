import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoAjusteBanco } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/ajustes-banco/[id]/publicar
//
// Flujo:
//   1. Genera el asiento contable (BLOQUEANTE).
//   2. Crea el movimiento bancario (ingreso si importe > 0, egreso si < 0).
//   3. Marca el ajuste como publicado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: aj, error } = await supabase.from("ajustes_banco").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!aj) return apiError("Ajuste no encontrado", 404)
  if (aj.estado !== "borrador") return apiError("Solo se pueden publicar ajustes en borrador", 409)

  // ── 1. Asiento contable (bloqueante) ─────────────────────────────────────
  const asientoRes = await generarAsientoAjusteBanco(supabase, {
    id: aj.id,
    numero: aj.numero,
    fecha: aj.fecha,
    cuenta_bancaria_id: aj.cuenta_bancaria_id,
    cuenta_bancaria_nombre: aj.cuenta_bancaria_nombre ?? "",
    sucursal: aj.sucursal,
    concepto_nombre: aj.concepto_nombre ?? "",
    cuenta_analitica: aj.cuenta_analitica,
    importe: Number(aj.importe),
  })
  if (!asientoRes.ok) return apiError(`No se pudo generar el asiento contable: ${asientoRes.error}`, 422)

  // ── 2. Movimiento bancario ───────────────────────────────────────────────
  const esEntrada = Number(aj.importe) > 0
  const importeAbs = Math.abs(Number(aj.importe))
  const fechaOp = aj.fecha || new Date().toISOString().split("T")[0]
  const { error: emov } = await supabase.from("movimientos_banco").insert({
    cuenta_bancaria_id: aj.cuenta_bancaria_id,
    cuenta_bancaria_nombre: aj.cuenta_bancaria_nombre,
    tipo_movimiento: esEntrada ? "ingreso" : "egreso",
    importe: importeAbs,
    moneda: "ARS",
    tipo_operacion: "Ajuste de Banco",
    fecha_operacion: fechaOp,
    concepto: aj.concepto_nombre,
    documento_origen_tipo: "ajuste_banco",
    documento_origen_id: aj.id,
    documento_origen_numero: aj.numero,
    conciliado: false,
  })
  if (emov) {
    await supabase.from("contabilidad_asientos_lineas").delete().eq("asiento_id", asientoRes.asiento_id)
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoRes.asiento_id)
    return dbError(emov)
  }

  // ── 3. Marcar como publicado ─────────────────────────────────────────────
  const { error: eUpd } = await supabase.from("ajustes_banco").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
