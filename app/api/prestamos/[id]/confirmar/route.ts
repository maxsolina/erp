import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarCuotasPrestamo, getExtractoAbierto, getValorEnCaja } from "@/lib/finanzas-server"
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

  // 1. Generar cuotas
  const cuotas = generarCuotasPrestamo({
    prestamo_id: prestamo.id,
    capital: prestamo.capital,
    tasa_porcentaje: prestamo.tasa_porcentaje,
    cantidad_cuotas: prestamo.cantidad_cuotas,
    fecha_primera_cuota: prestamo.fecha_primera_cuota,
    sistema_amortizacion: prestamo.sistema_amortizacion,
  })

  const { error: eCuotas } = await supabase.from("prestamo_cuotas").insert(cuotas)
  if (eCuotas) return dbError(eCuotas)

  // 2. Si no es preexistente y tiene caja, registrar ingreso.
  if (prestamo.caja_id && !prestamo.es_preexistente) {
    const extracto = await getExtractoAbierto(supabase, prestamo.caja_id, prestamo.caja_nombre)
    if (extracto.ok) {
      const valor = await getValorEnCaja(supabase, prestamo.caja_id, prestamo.moneda, "efectivo")
      if (valor.ok) {
        const importe = prestamo.importe_acreditado || prestamo.capital
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

  // 3. Totales
  const totalIntereses = cuotas.reduce((s, c) => s + c.interes, 0)
  const totalPrestamo = cuotas.reduce((s, c) => s + c.total, 0)

  const { error: eUpd } = await supabase.from("prestamos").update({
    estado: "pendiente",
    intereses_total: Math.round(totalIntereses * 100) / 100,
    total: Math.round(totalPrestamo * 100) / 100,
    saldo: prestamo.capital,
    capital_pendiente: prestamo.capital,
    updated_at: new Date().toISOString(),
  }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
