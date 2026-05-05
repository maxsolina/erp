import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoOrdenPago } from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  // Admin necesario: generarAsientoOrdenPago inserta en contabilidad_asientos,
  // tabla con RLS restrictivo que requiere service_role para bypass.
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la OP completa
  const { data: op, error: opErr } = await supabase
    .from("compras_ordenes_pago")
    .select("*")
    .eq("id", id)
    .single()

  if (opErr || !op) return NextResponse.json({ error: "OP no encontrada" }, { status: 404 })
  if (op.estado !== "borrador") return NextResponse.json({ error: "Solo se puede confirmar una OP en borrador" }, { status: 400 })
  if (!op.proveedor_id) return NextResponse.json({ error: "Debe seleccionar un proveedor" }, { status: 400 })
  if (!op.importe || op.importe <= 0) return NextResponse.json({ error: "El importe debe ser mayor a 0" }, { status: 400 })
  if (!op.caja_id) return NextResponse.json({ error: "Debe seleccionar una caja" }, { status: 400 })

  // 2. Verificar medios de pago
  const { data: medios } = await supabase
    .from("compras_op_medios_pago")
    .select("*")
    .eq("op_id", id)

  if (!medios || medios.length === 0) {
    return NextResponse.json({ error: "Debe agregar al menos un medio de pago" }, { status: 400 })
  }

  // 3. Obtener comprobantes vinculados
  const { data: comprobantes } = await supabase
    .from("compras_op_comprobantes")
    .select("*")
    .eq("op_id", id)

  // 4. Validar que importes asignados no superen saldos
  const debitos = (comprobantes ?? []).filter(c => c.tipo === "debito")
  const opMoneda = op.moneda ?? "ARS"
  for (const comp of debitos) {
    const facMoneda = comp.moneda_comp ?? "ARS"
    if (facMoneda !== opMoneda) {
      // Cross-currency: convertir importe de la OP a la moneda de la factura
      const cotiz = Number(comp.cotizacion ?? op.cotizacion ?? 0)
      if (cotiz > 0) {
        const importeEnMonedaFac = comp.importe / cotiz
        if (importeEnMonedaFac > comp.saldo_original + 0.01) {
          return NextResponse.json({
            error: `El importe asignado a ${comp.referencia} (${comp.importe} ${opMoneda} ≈ ${importeEnMonedaFac.toFixed(2)} ${facMoneda}) supera su saldo (${comp.saldo_original} ${facMoneda})`
          }, { status: 400 })
        }
      }
      // Sin cotización disponible: no se puede validar, se permite continuar
    } else {
      // Misma moneda: comparación directa
      if (comp.importe > comp.saldo_original + 0.01) {
        return NextResponse.json({
          error: `El importe asignado a ${comp.referencia} (${comp.importe}) supera su saldo (${comp.saldo_original})`
        }, { status: 400 })
      }
    }
  }

  // 4b. Validar conciliación completa si la OP tiene medios en ARS
  const tieneARS = (medios ?? []).some((m: Record<string, unknown>) => !m.moneda || m.moneda === "ARS")
  if (tieneARS) {
    const totalMediosComp = (medios ?? []).reduce((s: number, m: Record<string, unknown>) =>
      s + Number(m.importe_comp ?? m.importe ?? 0), 0)
    const totalDebitos = (comprobantes ?? [])
      .filter((c: Record<string, unknown>) => c.tipo === "debito")
      .reduce((s: number, c: Record<string, unknown>) => s + Number(c.importe ?? 0), 0)
    const totalCreditos = (comprobantes ?? [])
      .filter((c: Record<string, unknown>) => c.tipo === "credito")
      .reduce((s: number, c: Record<string, unknown>) => s + Number(c.importe ?? 0), 0)
    const noConciliado = totalMediosComp - totalDebitos + totalCreditos
    if (noConciliado > 0.01) {
      return NextResponse.json({
        error: `Hay $${noConciliado.toFixed(2)} sin conciliar. La OP contiene medios en ARS y debe estar completamente conciliada antes de confirmar.`
      }, { status: 400 })
    }
  }

  // 5. Cambiar estado a publicado
  const periodo = op.fecha
    ? `${String(new Date(op.fecha).getMonth() + 1).padStart(2, "0")}/${new Date(op.fecha).getFullYear()}`
    : null

  const { error: updateErr } = await supabase
    .from("compras_ordenes_pago")
    .update({
      estado: "publicado",
      periodo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 6. Registrar movimientos de egreso en caja
  const { data: extracto } = await supabase
    .from("extractos_caja")
    .select("id")
    .eq("caja_id", op.caja_id)
    .eq("estado", "abierto")
    .single()

  if (!extracto) {
    return NextResponse.json({
      error: `No hay extracto de caja abierto para la caja seleccionada. Abrí un extracto en Finanzas → Extractos de Caja.`
    }, { status: 400 })
  }

  // Validar saldo disponible para medios de tipo efectivo
  for (const medio of medios) {
    if (!medio.forma_pago_id) continue

    // Obtener tipo del valor (efectivo vs banco_cheques)
    const { data: valor } = await supabase
      .from("caja_valores")
      .select("tipo")
      .eq("id", medio.forma_pago_id)
      .single()

    if (!valor || valor.tipo !== "efectivo") continue

    // Calcular saldo actual del extracto para ese valor
    const { data: saldoApertura } = await supabase
      .from("extracto_saldos")
      .select("saldo_apertura")
      .eq("extracto_id", extracto.id)
      .eq("valor_id", medio.forma_pago_id)
      .maybeSingle()

    // Si no hay registro en extracto_saldos para este valor, no bloquear (saldo desconocido)
    if (!saldoApertura) continue

    const { data: movsExistentes } = await supabase
      .from("movimientos_caja")
      .select("tipo_movimiento, importe")
      .eq("extracto_id", extracto.id)
      .eq("valor_id", medio.forma_pago_id)
      .neq("estado_movimiento", "cancelado")

    const apertura = Number(saldoApertura.saldo_apertura ?? 0)
    const totalIngresos = (movsExistentes ?? [])
      .filter(m => m.tipo_movimiento === "ingreso")
      .reduce((a, m) => a + Number(m.importe), 0)
    const totalEgresos = (movsExistentes ?? [])
      .filter(m => m.tipo_movimiento === "egreso")
      .reduce((a, m) => a + Number(m.importe), 0)

    const saldoDisponible = apertura + totalIngresos - totalEgresos
    // Usar importe (moneda propia del valor), NO importe_comp (equivalente ARS)
    const importeMedio = Number(medio.importe ?? medio.importe_comp)

    if (importeMedio > saldoDisponible) {
      return NextResponse.json({
        error: `Saldo insuficiente en "${medio.forma_pago_nombre ?? "efectivo"}": disponible $${saldoDisponible.toFixed(2)}, se requiere $${importeMedio.toFixed(2)}.`
      }, { status: 400 })
    }
  }

  for (const medio of medios) {
    const movPayload: Record<string, unknown> = {
      extracto_id: extracto.id,
      valor_id: medio.forma_pago_id ?? null,
      valor_nombre: medio.forma_pago_nombre ?? medio.nombre ?? "Efectivo",
      tipo_movimiento: "egreso",
      importe: medio.importe ?? medio.importe_comp,
      moneda: medio.moneda ?? op.moneda ?? "ARS",
      concepto: `OP ${op.numero} - ${op.proveedor_nombre}`,
      documento_origen_tipo: "orden_pago",
      documento_origen_numero: op.numero,
      estado_movimiento: "confirmado",
    }
    // Solo enviar documento_origen_id si es UUID válido
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (isUUID.test(String(op.id))) movPayload.documento_origen_id = op.id

    const { error: movErr } = await supabase.from("movimientos_caja").insert(movPayload)
    if (movErr) {
      // Si falla por schema cache, reintentar sin estado_movimiento
      if (movErr.message.includes("schema cache") || movErr.message.includes("Could not find")) {
        delete movPayload.estado_movimiento
        const retry = await supabase.from("movimientos_caja").insert(movPayload)
        if (retry.error) return NextResponse.json({ error: "Error al registrar movimiento en caja: " + retry.error.message }, { status: 500 })
      } else {
        return NextResponse.json({ error: "Error al registrar movimiento en caja: " + movErr.message }, { status: 500 })
      }
    }
  }

  // 7. Actualizar saldo de facturas vinculadas
  for (const comp of debitos) {
    if (comp.factura_id) {
      const { data: fac } = await supabase
        .from("facturas_compra")
        .select("saldo, total")
        .eq("id", comp.factura_id)
        .single()

      if (fac) {
        const facMonedaUpd = comp.moneda_comp ?? "ARS"
        // Si la factura está en distinta moneda que la OP, convertir el importe
        const importeEnMonedaFac =
          facMonedaUpd !== opMoneda
            ? comp.importe / Math.max(Number(comp.cotizacion ?? op.cotizacion ?? 1), 0.0001)
            : comp.importe
        const nuevoSaldo = Math.max(0, (fac.saldo ?? fac.total) - importeEnMonedaFac)
        await supabase
          .from("facturas_compra")
          .update({
            saldo: nuevoSaldo,
            estado: nuevoSaldo <= 0.01 ? "pagada" : "pagada_parcial",
          })
          .eq("id", comp.factura_id)
      }
    }
  }

  // 8. Actualizar saldos en comprobantes (notas de crédito)
  const creditos = (comprobantes ?? []).filter(c => c.tipo === "credito")
  for (const comp of creditos) {
    if (comp.factura_id) {
      const { data: nc } = await supabase
        .from("notas_credito_compra")
        .select("saldo_disponible, total")
        .eq("id", comp.factura_id)
        .single()

      if (nc) {
        const nuevoSaldo = Math.max(0, (nc.saldo_disponible ?? nc.total) - comp.importe)
        await supabase
          .from("notas_credito_compra")
          .update({ saldo_disponible: nuevoSaldo, estado: nuevoSaldo <= 0 ? "aplicada" : "confirmada" })
          .eq("id", comp.factura_id)
      }
    }
  }

  // 9. Generar asiento contable para la OP
  let asientoError: string | null = null
  try {
    const resultadoAsiento = await generarAsientoOrdenPago(adminClient, {
      id: op.id,
      numero: op.numero,
      fecha: op.fecha,
      caja_id: op.caja_id,
      proveedor_id: op.proveedor_id,
      proveedor_nombre: op.proveedor_nombre,
      proveedor_categoria_id: op.proveedor_categoria_id ?? null,
      sucursal_id: op.sucursal_id ?? null,
      importe: op.importe,
      moneda: op.moneda ?? "ARS",
      cotizacion: op.cotizacion ?? null,
    })
    if (resultadoAsiento.ok && resultadoAsiento.asiento_id) {
      await adminClient
        .from("compras_ordenes_pago")
        .update({ asiento_id: resultadoAsiento.asiento_id })
        .eq("id", id)
    } else if (!resultadoAsiento.ok) {
      asientoError = resultadoAsiento.error ?? "Error desconocido al generar asiento"
    }
  } catch (e: any) {
    asientoError = e?.message ?? "Error al generar asiento contable"
    console.error("[OP confirmar] Error en generarAsientoOrdenPago:", asientoError)
  }

  if (asientoError) {
    console.error(`[OP confirmar] OP ${op.numero} publicada SIN asiento: ${asientoError}`)
  }

  await registrarEvento(supabase, {
    tipo_documento: "orden_pago",
    documento_id: op.id,
    tipo_evento: "cambio_estado",
    valor_anterior: "borrador",
    valor_nuevo: "publicado",
    usuario: null,
  })

  return NextResponse.json({
    success: true,
    estado: "publicado",
    ...(asientoError ? { aviso_asiento: `OP publicada. Asiento contable pendiente: ${asientoError}` } : {}),
  })
}
