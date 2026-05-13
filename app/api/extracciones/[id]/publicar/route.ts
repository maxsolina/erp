import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, getValorEnCaja } from "@/lib/finanzas-server"
import { generarAsientoExtraccionBancaria } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/extracciones/[id]/publicar
//
// Workflow:
//   1. Verifica extracto abierto para caja_ingreso.
//   2. Verifica que caja_ingreso tenga un caja_valor en moneda de la cuenta_bancaria tipo efectivo.
//   3. Por cada línea, inserta movimiento_caja ingreso.
//   4. Inserta movimiento_banco egreso por el total en la cuenta origen.
//   5. Marca extracción como publicada.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: ext, error } = await supabase
    .from("extracciones")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) return dbError(error)
  if (!ext) return apiError("Extracción no encontrada", 404)
  if (ext.estado !== "borrador") return apiError("Solo se pueden publicar extracciones en borrador", 409)

  const extracto = await getExtractoAbierto(supabase, ext.caja_ingreso_id, ext.caja_ingreso_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const { data: cuenta } = await supabase
    .from("cuentas_bancarias")
    .select("moneda")
    .eq("id", ext.cuenta_bancaria_id)
    .maybeSingle()
  const monedaCuenta = cuenta?.moneda || "ARS"

  const valorCheck = await getValorEnCaja(supabase, ext.caja_ingreso_id, monedaCuenta, "efectivo")
  if (!valorCheck.ok) return apiError(valorCheck.error, 409)

  const { data: vals } = await supabase
    .from("extraccion_valores")
    .select("valor_id, valor_nombre, importe")
    .eq("extraccion_id", id)

  const fechaOp = ext.fecha_operacion || new Date().toISOString().split("T")[0]

  // 1. Asiento contable PRIMERO (bloqueante).
  const asientoRes = await generarAsientoExtraccionBancaria(supabase, {
    id: ext.id,
    numero: ext.numero,
    fecha: fechaOp,
    cuenta_bancaria_id: ext.cuenta_bancaria_id,
    cuenta_bancaria_nombre: ext.cuenta_bancaria_nombre,
    caja_ingreso_id: ext.caja_ingreso_id,
    caja_ingreso_nombre: ext.caja_ingreso_nombre,
    sucursal: ext.sucursal,
  })
  if (!asientoRes.ok) return apiError(`No se generó el asiento: ${asientoRes.error}`, 409)

  // 2. Movimientos de caja (ingresos)
  for (const valor of vals ?? []) {
    const { data: vc } = await supabase
      .from("caja_valores")
      .select("moneda")
      .eq("id", valor.valor_id)
      .maybeSingle()

    const { error: e1 } = await supabase.from("movimientos_caja").insert({
      extracto_id: extracto.extractoId,
      valor_id: valor.valor_id,
      valor_nombre: valor.valor_nombre,
      tipo_movimiento: "ingreso",
      importe: valor.importe,
      moneda: vc?.moneda,
      concepto: `Extracción desde ${ext.cuenta_bancaria_nombre}`,
      documento_origen_tipo: "extraccion",
      documento_origen_id: ext.id,
      documento_origen_numero: ext.numero,
      estado_movimiento: "confirmado",
    })
    if (e1) return dbError(e1)
  }

  // 3. Movimiento bancario (egreso)
  const { error: e2 } = await supabase.from("movimientos_banco").insert({
    cuenta_bancaria_id: ext.cuenta_bancaria_id,
    cuenta_bancaria_nombre: ext.cuenta_bancaria_nombre,
    tipo_movimiento: "egreso",
    importe: ext.importe,
    moneda: monedaCuenta,
    tipo_operacion: "Extracción",
    numero_operacion: ext.numero_operacion,
    fecha_operacion: fechaOp,
    concepto: `Extracción hacia ${ext.caja_ingreso_nombre}`,
    documento_origen_tipo: "extraccion",
    documento_origen_id: ext.id,
    documento_origen_numero: ext.numero,
    conciliado: false,
  })
  if (e2) return dbError(e2)

  // 4. Cambiar estado
  const { error: eUpd } = await supabase.from("extracciones").update({ estado: "publicado" }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
