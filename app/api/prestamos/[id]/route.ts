import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_FULL = "id, numero, tipo_id, tipo_nombre, entidad_id, entidad_nombre, nro_prestamo, moneda, capital, tasa_porcentaje, capital_pendiente, intereses_total, iva, percepcion_iva, percepcion_iibb, otros_gastos, total, saldo, fecha, sucursal, caja_id, caja_nombre, cuenta_bancaria_acreditacion_id, cuenta_bancaria_acreditacion_nombre, sistema_amortizacion, es_preexistente, cantidad_cuotas, periodicidad, fecha_primera_cuota, importe_refinanciado, importe_acreditado, tipo_garante, garante, forma_pago, tipo_tasa, distribucion_pago, periodo_gracia, observaciones, cotizacion, tipo_cotizacion, estado"

// GET /api/prestamos/[id] — incluye cuotas y gastos.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const { data, error } = await supabase.from("prestamos").select(SELECT_FULL).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Préstamo no encontrado", 404)

  const [{ data: cuotas }, { data: gastos }] = await Promise.all([
    supabase.from("prestamo_cuotas").select("id, numero_cuota, fecha_vencimiento, capital, interes, iva, percepciones, total, saldo, estado, fecha_pago").eq("prestamo_id", id).order("numero_cuota"),
    supabase.from("prestamo_gastos").select("id, descripcion, importe, cuenta_contable").eq("prestamo_id", id),
  ])

  return NextResponse.json({ ...data, cuotas: cuotas ?? [], gastos: gastos ?? [] })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const { data: actual } = await supabase.from("prestamos").select("estado").eq("id", id).maybeSingle()
  if (!actual) return apiError("Préstamo no encontrado", 404)
  if (actual.estado !== "borrador") return apiError("Solo se pueden editar préstamos en borrador", 409)

  const update: Record<string, unknown> = {}
  if (body.tipo_id !== undefined) {
    update.tipo_id = body.tipo_id || null
    if (body.tipo_id) {
      const { data: t } = await supabase.from("tipos_prestamo").select("nombre").eq("id", body.tipo_id).maybeSingle()
      update.tipo_nombre = t?.nombre ?? ""
    } else {
      update.tipo_nombre = ""
    }
  }
  if (body.entidad_id !== undefined) {
    update.entidad_id = body.entidad_id || null
    if (body.entidad_id) {
      const { data: e } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.entidad_id).maybeSingle()
      update.entidad_nombre = e ? `${e.banco_nombre} - ${e.numero_cuenta}` : ""
    } else if (body.entidad_nombre_manual && String(body.entidad_nombre_manual).trim() !== "") {
      update.entidad_nombre = String(body.entidad_nombre_manual).trim()
    } else {
      update.entidad_nombre = ""
    }
  } else if (body.entidad_nombre_manual !== undefined) {
    // Si solo cambió el nombre manual y entidad_id sigue null
    update.entidad_nombre = String(body.entidad_nombre_manual).trim()
  }
  if (body.caja_id !== undefined) {
    update.caja_id = body.caja_id || null
    if (body.caja_id) {
      const { data: c } = await supabase.from("cajas").select("nombre").eq("id", body.caja_id).maybeSingle()
      update.caja_nombre = c?.nombre ?? ""
    } else {
      update.caja_nombre = ""
    }
  }
  if (body.cuenta_bancaria_acreditacion_id !== undefined) {
    update.cuenta_bancaria_acreditacion_id = body.cuenta_bancaria_acreditacion_id || null
    if (body.cuenta_bancaria_acreditacion_id) {
      const { data: cb } = await supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_acreditacion_id).maybeSingle()
      update.cuenta_bancaria_acreditacion_nombre = cb ? `${cb.banco_nombre} - ${cb.numero_cuenta}` : ""
    } else {
      update.cuenta_bancaria_acreditacion_nombre = ""
    }
  }
  for (const f of [
    "nro_prestamo", "moneda", "capital", "tasa_porcentaje", "iva", "percepcion_iva", "percepcion_iibb",
    "otros_gastos", "fecha", "sucursal", "sistema_amortizacion", "es_preexistente", "cantidad_cuotas",
    "periodicidad", "importe_refinanciado", "importe_acreditado", "tipo_garante", "garante",
    "forma_pago", "tipo_tasa", "distribucion_pago", "periodo_gracia", "observaciones",
  ]) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  if (body.fecha_primera_cuota !== undefined) update.fecha_primera_cuota = body.fecha_primera_cuota || null
  if (body.cotizacion !== undefined) update.cotizacion = body.cotizacion || null
  if (body.tipo_cotizacion !== undefined) update.tipo_cotizacion = body.tipo_cotizacion || null
  update.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from("prestamos").update(update).eq("id", id).select(SELECT_FULL).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
