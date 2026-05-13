import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, getValorEnCaja, generarCuotasPrestamo, validarSaldoSuficienteEfectivo } from "@/lib/finanzas-server"
import { generarAsientoPagoCapitalPrestamo } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/pagar-capital
// Body: { importe: number, fecha?: string, caja_id?: string, cuenta_bancaria_id?: string }
//
// Amortización extraordinaria de capital (fuera de cronograma).
// 1. Genera asiento (DEBE cuenta_prestamo / HABER cuenta_caja_valor o banco).
// 2. Inserta movimiento egreso (caja o banco).
// 3. Inserta prestamo_pagos con cuota_id=null y tipo_pago='capital_extra'.
// 4. Reduce capital_pendiente del préstamo.
// 5. Recalcula las cuotas pendientes futuras con el nuevo capital.
// 6. Si capital_pendiente llega a 0 → estado=cerrado.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const importe = Number(body.importe ?? 0)
  if (!importe || importe <= 0) return apiError("Importe inválido", 400)
  const cajaIdPago = body.caja_id || null
  const cuentaBancariaIdPago = body.cuenta_bancaria_id || null

  if (!cajaIdPago && !cuentaBancariaIdPago) {
    return apiError("Indicá desde qué caja efectivo o cuenta bancaria sale el pago.", 400)
  }
  if (cajaIdPago && cuentaBancariaIdPago) {
    return apiError("Elegí solo uno: caja efectivo o cuenta bancaria.", 400)
  }

  const supabase = await createClient()

  const { data: prestamo } = await supabase.from("prestamos").select("*").eq("id", id).maybeSingle()
  if (!prestamo) return apiError("Préstamo no encontrado", 404)
  if (prestamo.estado !== "pendiente") return apiError("Solo se puede pagar capital en préstamos pendientes", 409)

  const capPend = Number(prestamo.capital_pendiente ?? 0)
  if (importe > capPend + 0.01) return apiError(`El importe supera el capital pendiente (${capPend.toFixed(2)})`, 422)

  // Tipo de préstamo (para la cuenta contable)
  const { data: tipo } = await supabase
    .from("tipos_prestamo")
    .select("cuenta_prestamo, cuenta_intereses_devengar")
    .eq("id", prestamo.tipo_id)
    .maybeSingle()
  if (!tipo?.cuenta_prestamo) {
    return apiError("Falta cuenta contable del préstamo. Configurala en Finanzas → Tipos de Préstamo.", 422)
  }

  const fecha = body.fecha || new Date().toISOString().split("T")[0]

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
    const saldoCheck = await validarSaldoSuficienteEfectivo(supabase, extracto.extractoId, valor.valorId, importe, valor.valorNombre)
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

  // Antes del asiento: necesitamos calcular la diferencia de intereses futuros
  // (lo que ya no se va a devengar porque las cuotas pendientes bajan).
  // Para eso, leemos las cuotas pendientes y simulamos el recálculo.
  const { data: cuotasPendPre } = await supabase
    .from("prestamo_cuotas")
    .select("id, numero_cuota, fecha_vencimiento, interes")
    .eq("prestamo_id", id)
    .neq("estado", "conciliado")
    .order("numero_cuota")
  const interesesAntes = (cuotasPendPre ?? []).reduce((s, c) => s + Number(c.interes ?? 0), 0)

  const nuevoCapPend = Math.round((capPend - importe) * 100) / 100
  let interesesDespues = 0
  let cuotasRecalculadas: ReturnType<typeof generarCuotasPrestamo> = []
  if (cuotasPendPre && cuotasPendPre.length > 0 && nuevoCapPend > 0) {
    cuotasRecalculadas = generarCuotasPrestamo({
      prestamo_id: id,
      capital: nuevoCapPend,
      tasa_porcentaje: Number(prestamo.tasa_porcentaje ?? 0),
      cantidad_cuotas: cuotasPendPre.length,
      fecha_primera_cuota: cuotasPendPre[0].fecha_vencimiento,
      sistema_amortizacion: prestamo.sistema_amortizacion,
    })
    interesesDespues = cuotasRecalculadas.reduce((s, c) => s + c.interes, 0)
  }
  const diffIntereses = Math.max(Math.round((interesesAntes - interesesDespues) * 100) / 100, 0)

  // 1. Asiento contable PRIMERO (bloqueante)
  const asientoRes = await generarAsientoPagoCapitalPrestamo(supabase, {
    prestamo_id: prestamo.id,
    prestamo_numero: prestamo.numero,
    fecha,
    caja_id: cajaIdPago,
    valor_id: valorId,
    valor_nombre: valorNombre,
    cuenta_bancaria_id: cuentaBancariaIdPago,
    cuenta_bancaria_nombre: cuentaBancariaNombre,
    moneda: prestamo.moneda || "ARS",
    cotizacion: prestamo.cotizacion,
    importe,
    cuenta_prestamo: tipo.cuenta_prestamo,
    diff_intereses_devengar: diffIntereses,
    cuenta_intereses_devengar: tipo.cuenta_intereses_devengar,
    concepto: prestamo.entidad_nombre || "Pago de capital",
  })
  if (!asientoRes.ok) return apiError(`No se generó el asiento: ${asientoRes.error}`, 422)

  // 2. Movimiento egreso (caja o banco)
  if (cajaIdPago && extractoId && valorId) {
    const { error: eMov } = await supabase.from("movimientos_caja").insert({
      extracto_id: extractoId,
      valor_id: valorId,
      valor_nombre: valorNombre,
      tipo_movimiento: "egreso",
      importe,
      concepto: `Pago capital préstamo ${prestamo.numero}`,
      documento_origen_tipo: "prestamo_pago_capital",
      documento_origen_id: prestamo.id,
      documento_origen_numero: prestamo.numero,
      estado_movimiento: "confirmado",
    })
    if (eMov) return dbError(eMov)
  } else if (cuentaBancariaIdPago) {
    const { error: eMovB } = await supabase.from("movimientos_banco").insert({
      cuenta_bancaria_id: cuentaBancariaIdPago,
      cuenta_bancaria_nombre: cuentaBancariaNombre,
      tipo_movimiento: "egreso",
      importe,
      moneda: prestamo.moneda || "ARS",
      tipo_operacion: "Pago Capital Préstamo",
      fecha_operacion: fecha,
      concepto: `Pago capital préstamo ${prestamo.numero}`,
      documento_origen_tipo: "prestamo_pago_capital",
      documento_origen_id: prestamo.id,
      documento_origen_numero: prestamo.numero,
      conciliado: false,
    })
    if (eMovB) return dbError(eMovB)
  }

  // 3. Registrar pago en prestamo_pagos
  const { error: ePago } = await supabase.from("prestamo_pagos").insert({
    prestamo_id: id,
    cuota_id: null,
    fecha,
    importe,
    caja_id: cajaIdPago,
    cuenta_bancaria_id: cuentaBancariaIdPago,
    tipo_pago: "capital_extra",
  })
  if (ePago) return dbError(ePago)

  // 4. Aplicar el recálculo (ya lo precalculamos arriba para el asiento)
  if (cuotasPendPre && cuotasPendPre.length > 0 && nuevoCapPend > 0 && cuotasRecalculadas.length > 0) {
    // Actualizar cada cuota pendiente con los nuevos importes (mantenemos las fechas reales).
    for (let i = 0; i < cuotasPendPre.length; i++) {
      const cuotaOrig = cuotasPendPre[i]
      const cuotaNueva = cuotasRecalculadas[i]
      const { error: eUpdC } = await supabase
        .from("prestamo_cuotas")
        .update({
          capital: cuotaNueva.capital,
          interes: cuotaNueva.interes,
          total: cuotaNueva.total,
          saldo: cuotaNueva.saldo,
        })
        .eq("id", cuotaOrig.id)
      if (eUpdC) return dbError(eUpdC)
    }
  } else if (cuotasPendPre && cuotasPendPre.length > 0 && nuevoCapPend <= 0) {
    // Capital cancelado totalmente — cuotas pendientes quedan en 0.
    const { error: eClear } = await supabase
      .from("prestamo_cuotas")
      .update({ capital: 0, interes: 0, total: 0, saldo: 0 })
      .eq("prestamo_id", id)
      .neq("estado", "conciliado")
    if (eClear) return dbError(eClear)
  }

  // 5. Actualizar préstamo
  // El saldo total (deuda) baja por el importe del capital + los intereses futuros cancelados.
  const nuevoSaldo = Math.max(Math.round((Number(prestamo.saldo ?? 0) - importe - diffIntereses) * 100) / 100, 0)
  const { error: eUpdP } = await supabase
    .from("prestamos")
    .update({
      capital_pendiente: nuevoCapPend,
      saldo: nuevoSaldo,
      updated_at: new Date().toISOString(),
      ...(nuevoCapPend <= 0 ? { estado: "cerrado" } : {}),
    })
    .eq("id", id)
  if (eUpdP) return dbError(eUpdP)

  return NextResponse.json({ ok: true, capital_pendiente: nuevoCapPend, asiento_id: asientoRes.asiento_id })
}
