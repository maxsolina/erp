import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto } from "@/lib/finanzas-server"
import { generarAsientoAjusteCaja } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/ajustes-caja/[id]/publicar
//
// Flujo:
//   1. Valida estado + extracto abierto.
//   2. Genera el asiento contable (BLOQUEANTE).
//   3. Por cada línea inserta movimiento_caja (entrada → ingreso, salida → egreso).
//   4. Marca el ajuste como publicado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: aj, error } = await supabase.from("ajustes_caja").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!aj) return apiError("Ajuste no encontrado", 404)
  if (aj.estado !== "borrador") return apiError("Solo se pueden publicar ajustes en borrador", 409)

  const extracto = await getExtractoAbierto(supabase, aj.caja_id, aj.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  // ── 1. Asiento contable (bloqueante) ─────────────────────────────────────
  const asientoRes = await generarAsientoAjusteCaja(supabase, {
    id: aj.id,
    numero: aj.numero,
    fecha: aj.fecha,
    caja_id: aj.caja_id,
    sucursal: aj.sucursal,
    concepto_nombre: aj.concepto_nombre ?? "",
    cuenta_analitica: aj.cuenta_analitica,
  })
  if (!asientoRes.ok) return apiError(`No se pudo generar el asiento contable: ${asientoRes.error}`, 422)

  // ── 2. Movimientos de caja ───────────────────────────────────────────────
  const { data: vals } = await supabase
    .from("ajuste_caja_valores")
    .select("valor_id, valor_nombre, tipo_movimiento, importe")
    .eq("ajuste_id", id)

  for (const linea of vals ?? []) {
    const { error: e1 } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: linea.valor_id,
      valor_nombre: linea.valor_nombre,
      tipo_movimiento: linea.tipo_movimiento === "entrada" ? "ingreso" : "egreso",
      importe: linea.importe,
      concepto: aj.concepto_nombre,
      documento_origen_tipo: "ajuste_caja",
      documento_origen_id: aj.id,
      documento_origen_numero: aj.numero,
    })
    if (e1) {
      // Rollback asiento si falla el movimiento
      await supabase.from("contabilidad_asientos_lineas").delete().eq("asiento_id", asientoRes.asiento_id)
      await supabase.from("contabilidad_asientos").delete().eq("id", asientoRes.asiento_id)
      return dbError(e1)
    }
  }

  // ── 3. Marcar como publicado ─────────────────────────────────────────────
  const { error: eUpd } = await supabase.from("ajustes_caja").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
