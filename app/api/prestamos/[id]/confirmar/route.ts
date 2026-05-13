import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarCuotasPrestamo, getExtractoAbierto, getValorEnCaja } from "@/lib/finanzas-server"
import { generarAsientoAltaPrestamo } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/confirmar
//
// Workflow:
//   1. Genera cuotas según sistema de amortización.
//   2. Si el préstamo NO es preexistente y tiene caja, inserta movimiento_caja
//      ingreso por importe_acreditado (o capital) en la caja asociada.
//   3. Actualiza el préstamo con totales y estado=pendiente.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data: prestamo, error } = await supabase.from("prestamos").select("*").eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!prestamo) return apiError("Préstamo no encontrado", 404)
  if (prestamo.estado !== "borrador") return apiError("Solo se pueden confirmar préstamos en borrador", 409)
  if (!prestamo.fecha_primera_cuota) return apiError("Definí la fecha de primera cuota antes de confirmar", 400)
  if (prestamo.moneda && prestamo.moneda !== "ARS" && !prestamo.cotizacion) {
    return apiError(`Falta la cotización para ${prestamo.moneda}. Cargala antes de confirmar.`, 422)
  }

  // Tipo de préstamo (para cuentas contables)
  const { data: tipo } = await supabase
    .from("tipos_prestamo")
    .select("cuenta_prestamo, cuenta_preexistente, cuenta_intereses_devengar")
    .eq("id", prestamo.tipo_id)
    .maybeSingle()
  if (!tipo?.cuenta_prestamo) {
    return apiError("Falta cuenta contable del préstamo. Configurala en Finanzas → Tipos de Préstamo.", 422)
  }

  // ── 1. Generar cuotas para conocer intereses totales ─────────────────────
  const cuotas = generarCuotasPrestamo({
    prestamo_id: prestamo.id,
    capital: prestamo.capital,
    tasa_porcentaje: prestamo.tasa_porcentaje,
    cantidad_cuotas: prestamo.cantidad_cuotas,
    fecha_primera_cuota: prestamo.fecha_primera_cuota,
    sistema_amortizacion: prestamo.sistema_amortizacion,
  })
  const interesesTotal = cuotas.reduce((s, c) => s + c.interes, 0)

  // ── 2. Asiento contable BLOQUEANTE (alta con deuda total) ────────────────
  const importeAlta = Number(prestamo.importe_acreditado || prestamo.capital)
  const asientoRes = await generarAsientoAltaPrestamo(supabase, {
    id: prestamo.id,
    numero: prestamo.numero,
    fecha: prestamo.fecha,
    caja_id: prestamo.caja_id,
    cuenta_bancaria_acreditacion_id: prestamo.cuenta_bancaria_acreditacion_id,
    cuenta_bancaria_acreditacion_nombre: prestamo.cuenta_bancaria_acreditacion_nombre,
    moneda: prestamo.moneda || "ARS",
    cotizacion: prestamo.cotizacion,
    importe: importeAlta,
    intereses_total: interesesTotal,
    cuenta_prestamo: tipo.cuenta_prestamo,
    cuenta_preexistente: tipo.cuenta_preexistente,
    cuenta_intereses_devengar: tipo.cuenta_intereses_devengar,
    es_preexistente: !!prestamo.es_preexistente,
    entidad_nombre: prestamo.entidad_nombre || "Préstamo",
  })
  if (!asientoRes.ok) return apiError(`No se generó el asiento: ${asientoRes.error}`, 422)

  // ── 3. Insertar cuotas
  const { error: eCuotas } = await supabase.from("prestamo_cuotas").insert(cuotas)
  if (eCuotas) return dbError(eCuotas)

  // ── 4. Si no es preexistente, registrar el ingreso (caja o banco).
  if (!prestamo.es_preexistente) {
    const importe = prestamo.importe_acreditado || prestamo.capital
    if (prestamo.cuenta_bancaria_acreditacion_id) {
      // Acreditación en cuenta bancaria propia → movimientos_banco
      const { error: eMovB } = await supabase.from("movimientos_banco").insert({
        cuenta_bancaria_id: prestamo.cuenta_bancaria_acreditacion_id,
        cuenta_bancaria_nombre: prestamo.cuenta_bancaria_acreditacion_nombre,
        tipo_movimiento: "ingreso",
        importe,
        moneda: prestamo.moneda || "ARS",
        tipo_operacion: "Alta de Préstamo",
        fecha_operacion: prestamo.fecha,
        concepto: `Alta préstamo ${prestamo.numero} — ${prestamo.entidad_nombre}`,
        documento_origen_tipo: "prestamo",
        documento_origen_id: prestamo.id,
        documento_origen_numero: prestamo.numero,
        conciliado: false,
      })
      if (eMovB) return dbError(eMovB)
    } else if (prestamo.caja_id) {
      // Acreditación en caja efectivo → movimientos_caja
      const extracto = await getExtractoAbierto(supabase, prestamo.caja_id, prestamo.caja_nombre)
      if (extracto.ok) {
        const valor = await getValorEnCaja(supabase, prestamo.caja_id, prestamo.moneda, "efectivo")
        if (valor.ok) {
          const { error: eMov } = await supabase.from("movimientos_caja").insert({
            extracto_id: extracto.extractoId,
            valor_id: valor.valorId,
            valor_nombre: valor.valorNombre,
            tipo_movimiento: "ingreso",
            importe,
            concepto: `Alta préstamo ${prestamo.numero} - ${prestamo.entidad_nombre}`,
            documento_origen_tipo: "prestamo",
            documento_origen_id: prestamo.id,
            documento_origen_numero: prestamo.numero,
            estado_movimiento: "confirmado",
          })
          if (eMov) return dbError(eMov)
        }
      }
    }
  }

  // ── 5. Totales (saldo = deuda total = capital + intereses)
  const totalPrestamo = cuotas.reduce((s, c) => s + c.total, 0)

  const { error: eUpd } = await supabase.from("prestamos").update({
    estado: "pendiente",
    intereses_total: Math.round(interesesTotal * 100) / 100,
    total: Math.round(totalPrestamo * 100) / 100,
    saldo: Math.round(totalPrestamo * 100) / 100,
    capital_pendiente: prestamo.capital,
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, asiento_id: asientoRes.asiento_id })
}
