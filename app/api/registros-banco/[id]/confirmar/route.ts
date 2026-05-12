import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarAsientoRegistroBanco } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/registros-banco/[id]/confirmar
//
// Flujo:
//   1. Valida cuadre + cotización (si moneda != ARS).
//   2. Genera el asiento contable (BLOQUEANTE).
//   3. Inserta los movimientos bancarios (egreso).
//   4. Marca el registro como confirmado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: reg, error } = await supabase.from("registros_banco").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!reg) return apiError("Registro no encontrado", 404)
  if (reg.estado !== "borrador") return apiError("Solo se pueden confirmar registros en borrador", 409)

  const totalC = Number(reg.total_comprobantes ?? 0)
  const totalV = Number(reg.total_valores ?? 0)
  if (Math.abs(totalC - totalV) > 0.01) {
    return apiError(`Total comprobantes (${totalC.toFixed(2)}) no coincide con total valores (${totalV.toFixed(2)}). Corregí antes de confirmar.`, 422)
  }
  if (reg.moneda && reg.moneda !== "ARS" && !reg.cotizacion) {
    return apiError(`Falta la cotización para ${reg.moneda}. Cargala antes de confirmar.`, 422)
  }

  // ── 1. Asiento contable (bloqueante) ─────────────────────────────────────
  const asientoRes = await generarAsientoRegistroBanco(supabase, {
    id: reg.id,
    numero: reg.numero,
    fecha: reg.fecha,
    cuenta_bancaria_id: reg.cuenta_bancaria_id,
    cuenta_bancaria_nombre: reg.cuenta_bancaria_nombre ?? "",
    sucursal: reg.sucursal,
    concepto_nombre: reg.concepto_nombre ?? "",
    moneda: reg.moneda ?? "ARS",
    cotizacion: reg.cotizacion,
  })
  if (!asientoRes.ok) return apiError(`No se pudo generar el asiento contable: ${asientoRes.error}`, 422)

  // ── 2. Movimientos bancarios ─────────────────────────────────────────────
  const { data: vals } = await supabase
    .from("registro_banco_valores")
    .select("nombre, importe, moneda")
    .eq("registro_id", id)

  for (const valor of vals ?? []) {
    const { error: emov } = await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: reg.cuenta_bancaria_id,
      cuenta_bancaria_nombre: reg.cuenta_bancaria_nombre,
      tipo_movimiento: "egreso",
      importe: valor.importe,
      moneda: valor.moneda,
      tipo_operacion: valor.nombre || "Registro de Banco",
      concepto: "Registro de Banco",
      documento_origen_tipo: "registro_banco",
      documento_origen_id: reg.id,
      documento_origen_numero: reg.numero,
      conciliado: false,
    })
    if (emov) {
      await supabase.from("contabilidad_asientos_lineas").delete().eq("asiento_id", asientoRes.asiento_id)
      await supabase.from("contabilidad_asientos").delete().eq("id", asientoRes.asiento_id)
      return dbError(emov)
    }
  }

  const { error: eUpd } = await supabase
    .from("registros_banco")
    .update({ estado: "confirmado", updated_at: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
