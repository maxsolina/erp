import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, validarSaldoSuficienteEfectivo } from "@/lib/finanzas-server"
import { generarAsientoRegistroCaja } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/registros-caja/[id]/confirmar
//
// Flujo:
//   1. Valida estado + cuadre + cotización (si moneda != ARS).
//   2. Genera el asiento contable (BLOQUEANTE: si falla, no se confirma).
//   3. Inserta los movimientos de caja (egreso) en el extracto abierto.
//   4. Marca el registro como confirmado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: reg, error } = await supabase.from("registros_caja").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!reg) return apiError("Registro no encontrado", 404)
  if (reg.estado !== "borrador") return apiError("Solo se pueden confirmar registros en borrador", 409)

  // Validación dura: total comprobantes debe coincidir con total valores (tolerancia 1 centavo).
  const totalC = Number(reg.total_comprobantes ?? 0)
  const totalV = Number(reg.total_valores ?? 0)
  if (Math.abs(totalC - totalV) > 0.01) {
    return apiError(`Total comprobantes (${totalC.toFixed(2)}) no coincide con total valores (${totalV.toFixed(2)}). Corregí antes de confirmar.`, 422)
  }
  if (reg.moneda && reg.moneda !== "ARS" && !reg.cotizacion) {
    return apiError(`Falta la cotización para ${reg.moneda}. Cargala antes de confirmar.`, 422)
  }

  const extracto = await getExtractoAbierto(supabase, reg.caja_id, reg.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  // ── 0. Validar saldo suficiente para egresos en efectivo ─────────────────
  // Sumamos importes por valor_id (por si el mismo valor aparece más de una vez)
  // y verificamos que el saldo del extracto alcance.
  const { data: valsCheck } = await supabase
    .from("registro_caja_valores")
    .select("valor_id, valor_nombre, importe")
    .eq("registro_id", id)
  const importePorValor = new Map<string, { nombre: string; importe: number }>()
  for (const v of valsCheck ?? []) {
    const cur = importePorValor.get(v.valor_id as string) ?? { nombre: v.valor_nombre as string, importe: 0 }
    cur.importe += Number(v.importe ?? 0)
    importePorValor.set(v.valor_id as string, cur)
  }
  for (const [valorId, { nombre, importe }] of importePorValor.entries()) {
    const check = await validarSaldoSuficienteEfectivo(supabase, extracto.extractoId, valorId, importe, nombre)
    if (!check.ok) return apiError(check.error, 409)
  }

  // ── 1. Asiento contable (bloqueante) ─────────────────────────────────────
  const asientoRes = await generarAsientoRegistroCaja(supabase, {
    id: reg.id,
    numero: reg.numero,
    fecha: reg.fecha,
    caja_id: reg.caja_id,
    sucursal: reg.sucursal,
    concepto_nombre: reg.concepto_nombre ?? "",
    moneda: reg.moneda ?? "ARS",
    cotizacion: reg.cotizacion,
  })
  if (!asientoRes.ok) return apiError(`No se pudo generar el asiento contable: ${asientoRes.error}`, 422)

  // ── 2. Movimientos de caja ───────────────────────────────────────────────
  const { data: vals } = await supabase
    .from("registro_caja_valores")
    .select("valor_id, valor_nombre, importe, moneda")
    .eq("registro_id", id)

  for (const valor of vals ?? []) {
    const { error: emov } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: valor.valor_id,
      valor_nombre: valor.valor_nombre,
      tipo_movimiento: "egreso",
      importe: valor.importe,
      moneda: valor.moneda,
      concepto: "Registro de Caja",
      documento_origen_tipo: "registro_caja",
      documento_origen_id: reg.id,
      documento_origen_numero: reg.numero,
      estado_movimiento: "confirmado",
    })
    if (emov) {
      // Rollback del asiento si fallan los movimientos
      await supabase.from("contabilidad_asientos_lineas").delete().eq("asiento_id", asientoRes.asiento_id)
      await supabase.from("contabilidad_asientos").delete().eq("id", asientoRes.asiento_id)
      return dbError(emov)
    }
  }

  // ── 3. Marcar como confirmado ────────────────────────────────────────────
  const { error: eUpd } = await supabase
    .from("registros_caja")
    .update({ estado: "confirmado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
