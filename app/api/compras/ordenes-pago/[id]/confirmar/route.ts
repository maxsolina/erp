import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoOrdenPago } from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"
import { emitirMovimientoBancoSiAplica } from "@/lib/movimientos-banco"

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

  // 2-3. Medios + comprobantes + extracto de caja EN PARALELO (todos
  // independientes entre sí, sólo necesitan op.id / op.caja_id).
  const [mediosRes, compRes, extractoRes] = await Promise.all([
    supabase.from("compras_op_medios_pago").select("*").eq("op_id", id),
    supabase.from("compras_op_comprobantes").select("*").eq("op_id", id),
    supabase.from("extractos_caja").select("id").eq("caja_id", op.caja_id).eq("estado", "abierto").single(),
  ])
  const medios = mediosRes.data
  const comprobantes = compRes.data

  if (!medios || medios.length === 0) {
    return NextResponse.json({ error: "Debe agregar al menos un medio de pago" }, { status: 400 })
  }

  // 4. Validar que importes asignados no superen saldos.
  //
  // Convención (alineada con el form y con el endpoint /cancelar):
  // `comp.importe` está GUARDADO en la moneda del comprobante (moneda_comp),
  // NO en la moneda de la OP. Comparación directa contra saldo_original
  // (que también está en moneda del comprobante).
  const debitos = (comprobantes ?? []).filter(c => c.tipo === "debito")
  const opMoneda = op.moneda ?? "ARS"
  for (const comp of debitos) {
    const facMoneda = comp.moneda_comp ?? "ARS"
    if (comp.importe > comp.saldo_original + 0.01) {
      return NextResponse.json({
        error: `El importe asignado a ${comp.referencia} (${comp.importe} ${facMoneda}) supera su saldo (${comp.saldo_original} ${facMoneda})`
      }, { status: 400 })
    }
  }

  // 4b. Validar conciliación completa si la OP tiene medios en ARS
  //
  // OJO: en OPs mixtas (ej: 5.000 ARS + 300 USD pagando una factura de 600 USD)
  // hay que convertir TODO a una moneda común antes de sumar. Sumar plano
  // 5000 + 300 - 600 = 4700 mezcla unidades y da basura.
  // Convertimos a ARS usando la cotización guardada en cada medio/comprobante
  // (o, si falla, la cotización de la cabecera de la OP).
  const tieneARS = (medios ?? []).some((m: Record<string, unknown>) => !m.moneda || m.moneda === "ARS")
  if (tieneARS) {
    const opCotiz = Number(op.cotizacion ?? 0)
    const aARS = (importe: number, moneda: string | undefined, cotPropia?: number): number => {
      if (!moneda || moneda === "ARS") return importe
      const cot = Number(cotPropia ?? 0) > 0 ? Number(cotPropia) : opCotiz
      return cot > 0 ? importe * cot : importe
    }

    const totalMediosARS = (medios ?? []).reduce((s: number, m: Record<string, unknown>) => {
      const importe = Number(m.importe ?? m.importe_comp ?? 0)
      return s + aARS(importe, m.moneda as string, Number(m.cotizacion))
    }, 0)

    // c.importe viene en la moneda de la factura (no en la moneda de la OP).
    // Ej: si pagás una factura USD con OP mixta, el form manda importe=600 USD,
    // moneda_comp="USD". Convertimos a ARS para comparar.
    const totalDebitosARS = (comprobantes ?? [])
      .filter((c: Record<string, unknown>) => c.tipo === "debito")
      .reduce((s: number, c: Record<string, unknown>) => {
        const importe = Number(c.importe ?? 0)
        return s + aARS(importe, c.moneda_comp as string, Number(c.cotizacion))
      }, 0)
    const totalCreditosARS = (comprobantes ?? [])
      .filter((c: Record<string, unknown>) => c.tipo === "credito")
      .reduce((s: number, c: Record<string, unknown>) => {
        const importe = Number(c.importe ?? 0)
        return s + aARS(importe, c.moneda_comp as string, Number(c.cotizacion))
      }, 0)

    const noConciliadoARS = totalMediosARS - totalDebitosARS + totalCreditosARS

    // Tolerancia: si hay cualquier mezcla de monedas, los redondeos a 2 decimales
    // en USD se amplifican al convertir × cotización. Ej: 303,5714... USD → 303,57
    // → ×1400 = 424.998 ARS pierde 2 ARS contra los 425.000 ARS originales.
    // Usamos $10 ARS de tolerancia para cross-currency, $0,01 para misma moneda.
    const hayCrossCurrency = (medios ?? []).some(m => (m.moneda ?? opMoneda) !== opMoneda) ||
      (comprobantes ?? []).some(c => (c.moneda_comp ?? opMoneda) !== opMoneda)
    const tolerancia = hayCrossCurrency ? 10 : 0.01
    if (noConciliadoARS > tolerancia) {
      return NextResponse.json({
        error: `Hay $${noConciliadoARS.toFixed(2)} sin conciliar (equivalente en ARS, convertido por cotización). La OP contiene medios en ARS y debe estar completamente conciliada antes de confirmar.`
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

  // 6. Registrar movimientos de egreso en caja (ya tenemos extracto del paralelo anterior)
  const extracto = extractoRes.data
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

  // Inserts de movimientos_caja + emisiones bancarias EN PARALELO
  // (antes era N×2 secuenciales — para una OP con 3 medios eran 6 round-trips,
  // ahora son 2 olas de N en paralelo).
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const insertarMovimiento = async (medio: any) => {
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
    if (isUUID.test(String(op.id))) movPayload.documento_origen_id = op.id
    const { error: movErr } = await supabase.from("movimientos_caja").insert(movPayload)
    if (movErr) {
      if (movErr.message.includes("schema cache") || movErr.message.includes("Could not find")) {
        delete movPayload.estado_movimiento
        const retry = await supabase.from("movimientos_caja").insert(movPayload)
        if (retry.error) throw new Error("Error al registrar movimiento en caja: " + retry.error.message)
      } else {
        throw new Error("Error al registrar movimiento en caja: " + movErr.message)
      }
    }
  }

  try {
    await Promise.all([
      ...medios.map(insertarMovimiento),
      ...medios
        .filter(m => m.forma_pago_id)
        .map(m => emitirMovimientoBancoSiAplica(supabase, {
          caja_valor_id: m.forma_pago_id,
          tipo: "egreso",
          importe: Number(m.importe ?? m.importe_comp),
          moneda: m.moneda ?? op.moneda ?? "ARS",
          concepto: `OP ${op.numero} - ${op.proveedor_nombre ?? ""}`,
          fecha_operacion: op.fecha,
          documento_origen_tipo: "orden_pago",
          documento_origen_id: isUUID.test(String(op.id)) ? op.id : null,
          documento_origen_numero: op.numero,
          tipo_operacion: "Pago a proveedor",
        })),
    ])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Error en movimientos" }, { status: 500 })
  }

  // 7-8. Actualizar saldos de facturas (débitos) + NCs (créditos) EN PARALELO.
  // Cada uno requiere read (saldo actual) + write (nuevo saldo) = 2 round-trips.
  // Antes era 2×N secuenciales — ahora son 2 olas de N en paralelo.
  const creditos = (comprobantes ?? []).filter(c => c.tipo === "credito")

  const actualizarFactura = async (comp: any) => {
    if (!comp.factura_id) return
    const { data: fac } = await supabase
      .from("facturas_compra")
      .select("saldo, total")
      .eq("id", comp.factura_id)
      .single()
    if (!fac) return
    // comp.importe ya viene en moneda del comprobante (ver convención
    // documentada en paso 4). No re-convertir. Descuento directo.
    const nuevoSaldo = Math.max(0, (fac.saldo ?? fac.total) - Number(comp.importe ?? 0))
    await supabase
      .from("facturas_compra")
      .update({
        saldo: nuevoSaldo,
        estado: nuevoSaldo <= 0.01 ? "pagada" : "pagada_parcial",
      })
      .eq("id", comp.factura_id)
  }

  const actualizarNC = async (comp: any) => {
    if (!comp.factura_id) return
    const { data: nc } = await supabase
      .from("notas_credito_compra")
      .select("saldo_disponible, total")
      .eq("id", comp.factura_id)
      .single()
    if (!nc) return
    const nuevoSaldo = Math.max(0, (nc.saldo_disponible ?? nc.total) - comp.importe)
    await supabase
      .from("notas_credito_compra")
      .update({ saldo_disponible: nuevoSaldo, estado: nuevoSaldo <= 0 ? "aplicada" : "confirmada" })
      .eq("id", comp.factura_id)
  }

  await Promise.all([
    ...debitos.map(actualizarFactura),
    ...creditos.map(actualizarNC),
  ])

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
