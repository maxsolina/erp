import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { getExtractoAbierto, getValorEnCaja } from "@/lib/finanzas-server"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/cuotas/[cuotaId]/pagar
//
// Marca una cuota como pagada, inserta movimiento_caja egreso y actualiza
// capital_pendiente + saldo del préstamo. Si capital_pendiente queda en 0,
// el préstamo pasa a estado=cerrado.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; cuotaId: string }> }) {
  const { id, cuotaId } = await ctx.params
  const supabase = await createClient()

  const { data: prestamo } = await supabase.from("prestamos").select("*").eq("id", id).maybeSingle()
  if (!prestamo) return apiError("Préstamo no encontrado", 404)
  if (!prestamo.caja_id) return apiError("El préstamo no tiene caja asignada", 400)

  const { data: cuota } = await supabase.from("prestamo_cuotas").select("*").eq("id", cuotaId).eq("prestamo_id", id).maybeSingle()
  if (!cuota) return apiError("Cuota no encontrada", 404)
  if (cuota.estado === "conciliado") return apiError("La cuota ya está paga", 409)

  const extracto = await getExtractoAbierto(supabase, prestamo.caja_id, prestamo.caja_nombre)
  if (!extracto.ok) return apiError(extracto.error, 409)

  const valor = await getValorEnCaja(supabase, prestamo.caja_id, prestamo.moneda, "efectivo")
  if (!valor.ok) return apiError(valor.error, 409)

  // Egreso en caja.
  const { error: eMov } = await supabase.from("movimientos_caja").insert({
    extracto_id: extracto.extractoId,
    valor_id: valor.valorId,
    valor_nombre: valor.valorNombre,
    tipo_movimiento: "egreso",
    importe: cuota.total,
    concepto: `Pago cuota ${cuota.numero_cuota} - préstamo ${prestamo.numero}`,
    documento_origen_tipo: "prestamo_pago",
    documento_origen_id: cuota.id,
    documento_origen_numero: prestamo.numero,
    estado_movimiento: "confirmado",
  })
  if (eMov) return dbError(eMov)

  // Registrar pago.
  const hoy = new Date().toISOString().split("T")[0]
  const { error: ePago } = await supabase.from("prestamo_pagos").insert({
    prestamo_id: id,
    cuota_id: cuotaId,
    fecha: hoy,
    importe: cuota.total,
    caja_id: prestamo.caja_id,
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
  const { error: eUpd } = await supabase.from("prestamos").update({
    capital_pendiente: nuevoCapPend,
    saldo: nuevoSaldo,
    updated_at: new Date().toISOString(),
    ...(nuevoCapPend <= 0 ? { estado: "cerrado" } : {}),
  }).eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
