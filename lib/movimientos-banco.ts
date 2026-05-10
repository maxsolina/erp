// ─── Helper: emisión y cancelación de movimientos bancarios ─────────────
//
// Cualquier flujo que toque un banco (recibos cobrados con banco, OPs pagadas
// con banco, depósitos, extracciones, transferencias, etc.) debe registrar
// el movimiento en `movimientos_banco` para que aparezca en el libro mayor
// del banco (`/finanzas/movimientos-bancarios`).
//
// El medio de pago (caja_valor) sabe a qué banco corresponde via:
//   caja_valor.banco_permitido_id → caja_bancos_permitidos.cuenta_bancaria_id
//
// Si el caja_valor no es bancario (efectivo, tarjeta, cheque, etc.) o no
// está linkeado a una cuenta bancaria, la helper hace no-op silenciosamente.

import type { SupabaseClient } from "@supabase/supabase-js"

interface EmitirMovBancoArgs {
  caja_valor_id: string
  tipo: "ingreso" | "egreso"
  importe: number
  moneda?: string
  concepto?: string
  fecha_operacion?: string
  documento_origen_tipo: string
  documento_origen_id?: string | null
  documento_origen_numero?: string | null
  tipo_operacion?: string | null
}

/**
 * Inserta una fila en `movimientos_banco` si el caja_valor está linkeado
 * a una cuenta bancaria via `caja_bancos_permitidos.cuenta_bancaria_id`.
 * No-op si el caja_valor no es bancario o no tiene el FK seteado.
 */
export async function emitirMovimientoBancoSiAplica(
  supabase: SupabaseClient,
  args: EmitirMovBancoArgs,
): Promise<{ ok: boolean; insertado: boolean; error?: string }> {
  try {
    // 1. Resolver caja_valor → banco_permitido → cuenta_bancaria
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("id, banco_permitido_id")
      .eq("id", args.caja_valor_id)
      .single()
    if (!cv?.banco_permitido_id) return { ok: true, insertado: false }

    const { data: bp } = await supabase
      .from("caja_bancos_permitidos")
      .select("id, cuenta_bancaria_id, banco_nombre")
      .eq("id", cv.banco_permitido_id)
      .single()
    if (!bp?.cuenta_bancaria_id) return { ok: true, insertado: false }

    const { data: cb } = await supabase
      .from("cuentas_bancarias")
      .select("id, banco_nombre, moneda")
      .eq("id", bp.cuenta_bancaria_id)
      .single()
    if (!cb) return { ok: true, insertado: false }

    // 2. Insertar movimiento bancario
    const payload: Record<string, unknown> = {
      cuenta_bancaria_id: cb.id,
      cuenta_bancaria_nombre: cb.banco_nombre,
      tipo_movimiento: args.tipo,
      importe: args.importe,
      moneda: args.moneda ?? cb.moneda ?? "ARS",
      tipo_operacion: args.tipo_operacion ?? args.documento_origen_tipo,
      fecha_operacion: args.fecha_operacion ?? new Date().toISOString().split("T")[0],
      concepto: args.concepto ?? null,
      documento_origen_tipo: args.documento_origen_tipo,
      documento_origen_id: args.documento_origen_id ?? null,
      documento_origen_numero: args.documento_origen_numero ?? null,
      conciliado: false,
      estado_movimiento: "confirmado",
    }
    const { error } = await supabase.from("movimientos_banco").insert(payload)
    if (error) {
      // Si la columna estado_movimiento no existe todavía (115 no corrido),
      // reintentamos sin ella para no romper el flujo.
      if (error.message.includes("estado_movimiento")) {
        delete payload.estado_movimiento
        const retry = await supabase.from("movimientos_banco").insert(payload)
        if (retry.error) return { ok: false, insertado: false, error: retry.error.message }
        return { ok: true, insertado: true }
      }
      return { ok: false, insertado: false, error: error.message }
    }
    return { ok: true, insertado: true }
  } catch (err) {
    return { ok: false, insertado: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Marca como cancelado los movimientos bancarios asociados a un documento.
 * Patrón soft-delete (estado_movimiento='cancelado') para preservar auditoría.
 */
export async function cancelarMovimientosBancoPorDocumento(
  supabase: SupabaseClient,
  documento_origen_tipo: string,
  documento_origen_numero: string,
): Promise<void> {
  await supabase
    .from("movimientos_banco")
    .update({ estado_movimiento: "cancelado" })
    .eq("documento_origen_tipo", documento_origen_tipo)
    .eq("documento_origen_numero", documento_origen_numero)
}
