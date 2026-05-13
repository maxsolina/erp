import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, getValorEnCaja, validarSaldoSuficienteEfectivo } from "@/lib/finanzas-server"
import { generarAsientoPagoCuotaPrestamo } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/cuotas/[cuotaId]/pagar
// Body: { caja_id?: string, cuenta_bancaria_id?: string }
//
// Marca una cuota como pagada. El origen del pago puede ser una caja efectivo
// (caja_id) o una cuenta bancaria propia (cuenta_bancaria_id). Genera asiento
// contable + movimiento (caja o banco) según el origen.
export async function POST(req: Request, ctx: { params: Promise<{ id: string; cuotaId: string }> }) {
  const { id, cuotaId } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const cajaIdPago = body?.caja_id || null
  const cuentaBancariaIdPago = body?.cuenta_bancaria_id || null

  if (!cajaIdPago && !cuentaBancariaIdPago) {
    return apiError("Indicá desde qué caja efectivo o cuenta bancaria sale el pago.", 400)
  }
  if (cajaIdPago && cuentaBancariaIdPago) {
    return apiError("Elegí solo uno: caja efectivo o cuenta bancaria.", 400)
  }

  const supabase = await createClient()

  const { data: prestamo } = await supabase.from("prestamos").select("*").eq("id", id).maybeSingle()
  if (!prestamo) return apiError("Préstamo no encontrado", 404)

  const { data: cuota } = await supabase.from("prestamo_cuotas").select("*").eq("id", cuotaId).eq("prestamo_id", id).maybeSingle()
  if (!cuota) return apiError("Cuota no encontrada", 404)
  if (cuota.estado === "conciliado") return apiError("La cuota ya está paga", 409)

  // Resolver origen del pago
  let valorId: string | null = null
  let valorNombre = ""
  let cajaNombre: string | null = null
  let extractoId: string | null = null
  let cuentaBancariaNombre: string | null = null

  if (cajaIdPago) {
    const { data: cajaInfo } = await supabase.from("cajas").select("nombre").eq("id", cajaIdPago).maybeSingle()
    cajaNombre = cajaInfo?.nombre ?? null
    const extracto = await getExtractoAbierto(supabase, cajaIdPago, cajaNombre)
    if (!extracto.ok) return apiError(extracto.error, 409)
    extractoId = extracto.extractoId
    const valor = await getValorEnCaja(supabase, cajaIdPago, prestamo.moneda, "efectivo")
    if (!valor.ok) return apiError(valor.error, 409)
    valorId = valor.valorId
    valorNombre = valor.valorNombre
    // Validar saldo suficiente (no permitir egreso si caja queda en negativo)
    const saldoCheck = await validarSaldoSuficienteEfectivo(supabase, extracto.extractoId, valor.valorId, Number(cuota.total), valor.valorNombre)
    if (!saldoCheck.ok) return apiError(saldoCheck.error, 409)
  } else if (cuentaBancariaIdPago) {
    const { data: cb } = await supabase
      .from("cuentas_bancarias")
      .select("banco_nombre, numero_cuenta, moneda")
      .eq("id", cuentaBancariaIdPago)
      .maybeSingle()
    if (!cb) return apiError("Cuenta bancaria no encontrada", 404)
    cuentaBancariaNombre = `${cb.banco_nombre} - ${cb.numero_cuenta}`
    if (cb.moneda && cb.moneda !== prestamo.moneda) {
      return apiError(`La cuenta bancaria está en ${cb.moneda} pero el préstamo es en ${prestamo.moneda}.`, 409)
    }
  }

  // Tipo de préstamo (cuentas contables)
  const { data: tipo } = await supabase
    .from("tipos_prestamo")
    .select("cuenta_prestamo, cuenta_intereses, cuenta_intereses_devengar")
    .eq("id", prestamo.tipo_id)
    .maybeSingle()
  if (!tipo?.cuenta_prestamo) {
    return apiError("Falta cuenta contable del préstamo. Configurala en Finanzas → Tipos de Préstamo.", 422)
  }

  const hoyFecha = new Date().toISOString().split("T")[0]

  // Asiento PRIMERO (bloqueante)
  const asientoRes = await generarAsientoPagoCuotaPrestamo(supabase, {
    prestamo_id: prestamo.id,
    prestamo_numero: prestamo.numero,
    numero_cuota: cuota.numero_cuota,
    fecha: hoyFecha,
    caja_id: cajaIdPago,
    valor_id: valorId,
    valor_nombre: valorNombre,
    cuenta_bancaria_id: cuentaBancariaIdPago,
    cuenta_bancaria_nombre: cuentaBancariaNombre,
    moneda: prestamo.moneda || "ARS",
    cotizacion: prestamo.cotizacion,
    capital: Number(cuota.capital),
    interes: Number(cuota.interes),
    total: Number(cuota.total),
    cuenta_prestamo: tipo.cuenta_prestamo,
    cuenta_intereses: tipo.cuenta_intereses || "",
    cuenta_intereses_devengar: tipo.cuenta_intereses_devengar || null,
    entidad_nombre: prestamo.entidad_nombre || "Préstamo",
  })
  if (!asientoRes.ok) return apiError(`No se generó el asiento: ${asientoRes.error}`, 422)

  // Movimiento de egreso (caja o banco según el origen)
  if (cajaIdPago && extractoId && valorId) {
    const { error: eMov } = await supabase.from("movimientos_caja").insert({
      extracto_id: extractoId,
      valor_id: valorId,
      valor_nombre: valorNombre,
      tipo_movimiento: "egreso",
      importe: cuota.total,
      concepto: `Pago cuota ${cuota.numero_cuota} - préstamo ${prestamo.numero}`,
      documento_origen_tipo: "prestamo_pago",
      documento_origen_id: cuota.id,
      documento_origen_numero: prestamo.numero,
      estado_movimiento: "confirmado",
    })
    if (eMov) return dbError(eMov)
  } else if (cuentaBancariaIdPago) {
    const { error: eMovB } = await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: cuentaBancariaIdPago,
      cuenta_bancaria_nombre: cuentaBancariaNombre,
      tipo_movimiento: "egreso",
      importe: cuota.total,
      moneda: prestamo.moneda || "ARS",
      tipo_operacion: "Pago Préstamo",
      fecha_operacion: hoyFecha,
      concepto: `Pago cuota ${cuota.numero_cuota} - préstamo ${prestamo.numero}`,
      documento_origen_tipo: "prestamo_pago",
      documento_origen_id: cuota.id,
      documento_origen_numero: prestamo.numero,
      conciliado: false,
    })
    if (eMovB) return dbError(eMovB)
  }

  // Registrar pago.
  const hoy = hoyFecha
  const { error: ePago } = await supabase.from("prestamo_pagos").insert({
    prestamo_id: id,
    cuota_id: cuotaId,
    fecha: hoy,
    importe: cuota.total,
    caja_id: cajaIdPago,
    cuenta_bancaria_id: cuentaBancariaIdPago,
  })
  if (ePago) return dbError(ePago)

  // Marcar cuota como conciliada.
  const { error: eCuota } = await supabase
    .from("prestamo_cuotas")
    .update({ estado: "conciliado", fecha_pago: hoy })
    .eq("id", cuotaId)
  if (eCuota) return dbError(eCuota)

  // Actualizar préstamo.
  const nuevoCapPend = Math.max((prestamo.capital_pendiente || 0) - cuota.capital, 0)
  const nuevoSaldo = Math.max((prestamo.saldo || 0) - cuota.total, 0)
  // Cierra el préstamo si: (a) ya se pagó todo el capital, o (b) ya no queda saldo total a pagar.
  const cierra = nuevoCapPend <= 0 || nuevoSaldo <= 0
  const { error: eUpd } = await supabase.from("prestamos").update({
    capital_pendiente: nuevoCapPend,
    saldo: nuevoSaldo,
    updated_at: new Date().toISOString(),
    ...(cierra ? { estado: "cerrado" } : {}),
  }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
