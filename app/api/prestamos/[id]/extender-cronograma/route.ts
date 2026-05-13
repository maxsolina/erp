import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { generarCuotasPrestamo } from "@/lib/finanzas-server"
import { generarAsientoExtensionCronograma } from "@/lib/contabilidad-asiento-factory"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/extender-cronograma
// Body: { cantidad: number }
//
// Solo aplica a préstamos perpetuos: genera N cuotas adicionales de intereses
// con el capital_pendiente actual, continuando desde la última cuota existente.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const cantidad = Number(body.cantidad ?? 0)
  if (!cantidad || cantidad <= 0) return apiError("Cantidad inválida", 400)

  const supabase = await createClient()

  const { data: prestamo } = await supabase.from("prestamos").select("*").eq("id", id).maybeSingle()
  if (!prestamo) return apiError("Préstamo no encontrado", 404)
  if (prestamo.estado !== "pendiente") return apiError("Solo se puede extender préstamos pendientes", 409)
  if (prestamo.sistema_amortizacion !== "perpetuo") {
    return apiError("Solo aplica a préstamos perpetuos", 409)
  }

  const capPend = Number(prestamo.capital_pendiente ?? 0)
  if (capPend <= 0) return apiError("El capital pendiente es 0; no hay nada que extender", 409)

  // Última cuota existente para arrancar desde el mes siguiente
  const { data: ultima } = await supabase
    .from("prestamo_cuotas")
    .select("numero_cuota, fecha_vencimiento")
    .eq("prestamo_id", id)
    .order("numero_cuota", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!ultima) return apiError("El préstamo no tiene cuotas previas; usá Confirmar primero", 409)

  // Fecha de la siguiente cuota = última + 1 mes
  const sig = new Date(ultima.fecha_vencimiento)
  sig.setMonth(sig.getMonth() + 1)
  const fechaSig = sig.toISOString().split("T")[0]

  // Generar nuevas cuotas con capital_pendiente actual
  const nuevasGen = generarCuotasPrestamo({
    prestamo_id: id,
    capital: capPend,
    tasa_porcentaje: Number(prestamo.tasa_porcentaje ?? 0),
    cantidad_cuotas: cantidad,
    fecha_primera_cuota: fechaSig,
    sistema_amortizacion: "perpetuo",
  })
  // Renumerar a partir de ultima.numero_cuota + 1
  const baseNum = ultima.numero_cuota + 1
  const filas = nuevasGen.map((c, idx) => ({
    ...c,
    numero_cuota: baseNum + idx,
  }))

  // Asiento contable BLOQUEANTE (antes de insertar cuotas)
  const sumaIntereses = filas.reduce((s, c) => s + c.interes, 0)
  const { data: tipo } = await supabase
    .from("tipos_prestamo")
    .select("cuenta_prestamo, cuenta_intereses_devengar")
    .eq("id", prestamo.tipo_id)
    .maybeSingle()
  if (!tipo?.cuenta_prestamo) {
    return apiError("Falta cuenta contable del préstamo. Configurala en Finanzas → Tipos de Préstamo.", 422)
  }
  if (sumaIntereses > 0) {
    const asientoExt = await generarAsientoExtensionCronograma(supabase, {
      prestamo_id: prestamo.id,
      prestamo_numero: prestamo.numero,
      fecha: new Date().toISOString().split("T")[0],
      caja_id: prestamo.caja_id,
      moneda: prestamo.moneda || "ARS",
      cotizacion: prestamo.cotizacion,
      intereses_adicionales: sumaIntereses,
      cuenta_prestamo: tipo.cuenta_prestamo,
      cuenta_intereses_devengar: tipo.cuenta_intereses_devengar || "",
      entidad_nombre: prestamo.entidad_nombre || "Préstamo",
    })
    if (!asientoExt.ok) return apiError(`No se generó el asiento: ${asientoExt.error}`, 422)
  }

  const { error: eIns } = await supabase.from("prestamo_cuotas").insert(filas)
  if (eIns) return dbError(eIns)

  // Actualizar cantidad_cuotas + totales del préstamo
  const sumaTotales = filas.reduce((s, c) => s + c.total, 0)
  const { error: eUpd } = await supabase
    .from("prestamos")
    .update({
      cantidad_cuotas: Number(prestamo.cantidad_cuotas ?? 0) + cantidad,
      total: Math.round((Number(prestamo.total ?? 0) + sumaTotales) * 100) / 100,
      intereses_total: Math.round((Number(prestamo.intereses_total ?? 0) + sumaIntereses) * 100) / 100,
      saldo: Math.round((Number(prestamo.saldo ?? 0) + sumaTotales) * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true, cuotas_agregadas: cantidad })
}
