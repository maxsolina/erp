import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { generarAsientoRecibo } from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const isUUID = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

// POST — publicar un recibo (estado borrador → publicado)
//
// Cascada faithful al monolito:
// 1. Verificar extracto de caja abierto
// 2. Por cada pago: insertar movimiento_caja (+ cupon_tarjeta si tarjeta, + cheque si cheque)
// 3. Por cada imputación con asignación > 0: actualizar saldo + estado de la factura
// 4. Insertar movimientos en ventas_cc_movimientos (CC bimonetaria con cross-currency)
// 5. Update recibo: estado='publicado', importe_no_conciliado, fecha_publicacion
// 6. Generar asiento contable vía generarAsientoRecibo
//
// El body acepta caso_imputacion ("A"|"B"|"C") para decidir cómo se imputan los pagos
// ARS a CC ARS / CC USD según el tipo de saldo del cliente. Si no se manda, "A".
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const casoImputacion: "A" | "B" | "C" = body?.caso_imputacion ?? "A"

  // 1. Cargar recibo + pagos + imputaciones
  const { data: recibo, error: recErr } = await supabase
    .from("recibos")
    .select("*")
    .eq("id", id)
    .single()
  if (recErr || !recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 })
  }
  if (recibo.estado !== "borrador") {
    return NextResponse.json(
      { error: `Solo se publican recibos en estado borrador (actual: ${recibo.estado})` },
      { status: 422 }
    )
  }
  if (!recibo.cliente_id) {
    return NextResponse.json({ error: "El recibo debe tener un cliente" }, { status: 422 })
  }
  if (!recibo.caja_id) {
    return NextResponse.json({ error: "El recibo debe tener una caja seleccionada" }, { status: 422 })
  }

  const { data: pagos, error: pagosErr } = await supabase
    .from("recibo_pagos")
    .select("*")
    .eq("recibo_id", id)
  if (pagosErr) return NextResponse.json({ error: pagosErr.message }, { status: 500 })
  if (!pagos || pagos.length === 0) {
    return NextResponse.json({ error: "El recibo debe tener al menos un medio de pago" }, { status: 422 })
  }

  const { data: imputaciones } = await supabase
    .from("recibo_imputaciones")
    .select("*")
    .eq("recibo_id", id)

  // Validar tarjeta sin factura/NV
  if (pagos.some((p: any) => p.es_tarjeta) && !recibo.factura_id && !recibo.nota_venta_id) {
    return NextResponse.json(
      { error: "Para cobrar con tarjeta, el recibo debe estar vinculado a una factura" },
      { status: 422 }
    )
  }

  // 2. Verificar extracto abierto
  const { data: extracto } = await supabase
    .from("extractos_caja")
    .select("id")
    .eq("caja_id", recibo.caja_id)
    .eq("estado", "abierto")
    .single()
  if (!extracto) {
    return NextResponse.json(
      { error: `No hay extracto abierto para "${recibo.caja_nombre ?? "la caja"}". Abrí un extracto en Finanzas → Extractos de Caja.` },
      { status: 422 }
    )
  }

  // 3. Movimientos de caja (+ cupones / cheques)
  for (const pago of pagos as any[]) {
    const movPayload: Record<string, unknown> = {
      extracto_id: extracto.id,
      valor_id: pago.valor_id,
      valor_nombre: pago.valor_nombre,
      tipo_movimiento: "ingreso",
      importe: pago.importe,
      moneda: pago.moneda,
      concepto: `Recibo ${recibo.numero} - ${recibo.cliente_nombre ?? ""}`,
      documento_origen_tipo: "recibo",
      documento_origen_numero: recibo.numero,
      estado_movimiento: "confirmado",
    }
    if (isUUID(String(recibo.id))) {
      movPayload.documento_origen_id = String(recibo.id)
    }

    const { error: movErr } = await supabase.from("movimientos_caja").insert(movPayload)
    if (movErr) {
      // Compat: si una columna del payload no existe en la DB, reintentar sin ella
      if (movErr.message.includes("schema cache")) {
        const col = movErr.message.match(/Could not find the '([^']+)' column/)?.[1]
        if (col) delete movPayload[col]
        else delete movPayload.estado_movimiento
        const retry = await supabase.from("movimientos_caja").insert(movPayload)
        if (retry.error) {
          return NextResponse.json({ error: `Error movimientos_caja: ${retry.error.message}` }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: `Error movimientos_caja: ${movErr.message}` }, { status: 500 })
      }
    }

    // Cupón si tarjeta
    if (pago.es_tarjeta) {
      const { data: cupon } = await supabase
        .from("cupones_tarjeta")
        .insert({
          numero_cupon: pago.numero_cupon ?? null,
          tarjeta_nombre: pago.tarjeta_nombre,
          forma_pago_nombre: pago.valor_nombre,
          forma_pago_id: pago.valor_id,
          cliente_nombre: recibo.cliente_nombre,
          sucursal: recibo.sucursal,
          extracto_id: extracto.id,
          importe: pago.importe,
          estado: "en_cartera",
          venta_id: recibo.nota_venta_id,
          venta_numero: recibo.nota_venta_numero,
        })
        .select()
        .single()
      if (cupon?.id) {
        await supabase.from("recibo_pagos").update({ cupon_tarjeta_id: cupon.id }).eq("id", pago.id)
      }
    }

    // Cheque
    if (pago.es_cheque && pago.cheque_id) {
      await supabase
        .from("cheques_terceros")
        .update({ origen_nombre: recibo.cliente_nombre })
        .eq("id", pago.cheque_id)
    }
  }

  // 4. Imputar comprobantes — actualizar saldo + estado según el tipo:
  //    - factura: bajar `saldo` y marcar conciliada si llega a 0
  //    - nota_credito / ajuste: bajar `saldo_disponible` del ajuste
  for (const imp of (imputaciones ?? []) as any[]) {
    if (!imp.asignacion || imp.asignacion <= 0) continue

    const tipo = imp.tipo_comprobante ?? "factura"

    if (tipo === "factura") {
      const { data: fac } = await supabase
        .from("facturas")
        .select("saldo, estado, total")
        .eq("id", imp.comprobante_id)
        .single()
      if (fac) {
        const nuevoSaldo = Math.max(0, (Number(fac.saldo) || 0) - Number(imp.asignacion))
        const nuevoEstado = nuevoSaldo <= 0.01 ? "conciliada" : fac.estado
        await supabase
          .from("facturas")
          .update({ saldo: nuevoSaldo, estado: nuevoEstado })
          .eq("id", imp.comprobante_id)
      }
    } else if (tipo === "nota_credito" || tipo === "ajuste") {
      // Crédito del cliente (NC/ajuste): reducir su saldo_disponible
      const { data: aj } = await supabase
        .from("ajustes_clientes")
        .select("saldo_disponible, total")
        .eq("id", imp.comprobante_id)
        .single()
      if (aj) {
        const nuevoSaldoDisp = Math.max(0, (Number(aj.saldo_disponible ?? aj.total) || 0) - Number(imp.asignacion))
        await supabase
          .from("ajustes_clientes")
          .update({ saldo_disponible: Math.round(nuevoSaldoDisp * 100) / 100 })
          .eq("id", imp.comprobante_id)
      }
    }
  }

  // 5. Calcular no conciliado (USD-aware) — modelo correcto:
  //
  //   Las NCs/ajustes ticked son una FUENTE de fondos adicional al cash.
  //   Las facturas son DESTINOS (asignación = deuda pagada).
  //   Conservación:  sum(pagos cash) + sum(NC asig) == sum(factura asig)
  //
  //   noConciliado = max(0, pagos_cash + NC_asig - factura_asig)
  //
  //   El bug previo sumaba TODAS las imputaciones (factura + NC) como si
  //   fueran "destinos", lo que daba un resultado mentiroso (e.g. 0 sin
  //   conciliar cuando en realidad faltaban 169.40 USD por aplicar).
  const imps = (imputaciones ?? []) as any[]
  const sumAsig = (filterFn: (i: any) => boolean) =>
    imps.filter(filterFn).reduce((s, i) => s + Number(i.asignacion ?? 0), 0)
  const esFactura = (i: any) => i.tipo_comprobante === "factura" || i.tipo_comprobante === "nota_debito"
  const esCredito = (i: any) => i.tipo_comprobante === "nota_credito" || i.tipo_comprobante === "ajuste"

  // Cross-currency: si una moneda está corta y la otra tiene excedente, se
  // compensan usando la cotización del recibo. Caso típico: factura USD que
  // se pagó parte en cash USD + parte en cash ARS (al cambio). Sin esto, el
  // ARS del cash queda como "no conciliado" cuando en realidad cubrió el
  // shortfall USD.
  const cotXChange = Number(recibo.cotizacion ?? 0) || 0
  const totalUSDPagos = (pagos as any[]).reduce(
    (s: number, p: any) => s + (p.moneda === "USD" ? Number(p.importe ?? 0) : 0), 0,
  )
  const totalARSPagos = (pagos as any[]).reduce(
    (s: number, p: any) => s + (p.moneda === "ARS" ? Number(p.importe ?? 0) : 0), 0,
  )
  const totalUSDFacturas = sumAsig(i => esFactura(i) && (i.moneda_comprobante ?? "USD") === "USD")
  const totalUSDCreditos = sumAsig(i => esCredito(i) && (i.moneda_comprobante ?? "USD") === "USD")
  const totalARSFacturas = sumAsig(i => esFactura(i) && (i.moneda_comprobante ?? "ARS") === "ARS")
  const totalARSCreditos = sumAsig(i => esCredito(i) && (i.moneda_comprobante ?? "ARS") === "ARS")

  // Net per currency: positivo = excedente, negativo = faltante
  let netUSD = totalUSDPagos + totalUSDCreditos - totalUSDFacturas
  let netARS = totalARSPagos + totalARSCreditos - totalARSFacturas

  // Cross-fill ARS → USD (ARS sobrante cubre USD faltante)
  if (netUSD < -0.005 && netARS > 0.005 && cotXChange > 0) {
    const necesidadARS = (-netUSD) * cotXChange
    const transferARS = Math.min(necesidadARS, netARS)
    netARS -= transferARS
    netUSD += transferARS / cotXChange
  }
  // Cross-fill USD → ARS
  if (netARS < -0.005 && netUSD > 0.005 && cotXChange > 0) {
    const necesidadUSD = (-netARS) / cotXChange
    const transferUSD = Math.min(necesidadUSD, netUSD)
    netUSD -= transferUSD
    netARS += transferUSD * cotXChange
  }

  const hasUSDPayment = (pagos as any[]).some((p: any) => p.moneda === "USD")
  // Modelo histórico de campos:
  //   - importe_no_conciliado:     en moneda principal del recibo
  //   - importe_no_conciliado_ars: solo cuando hay USD payment (resto ARS)
  let noConciliado: number
  let noConciliadoARS: number
  if (hasUSDPayment) {
    noConciliado = Math.max(0, Math.round(netUSD * 100) / 100)
    noConciliadoARS = Math.max(0, Math.round(netARS * 100) / 100)
  } else {
    // Recibo 100% ARS — la moneda principal es ARS, el campo "ars" es 0
    noConciliado = Math.max(0, Math.round(netARS * 100) / 100)
    noConciliadoARS = 0
  }

  // 6. Movimientos en ventas_cc_movimientos (bimonetaria con cross-currency)
  const cotizacionCC = Number(recibo.cotizacion ?? 1) || 1
  const tipoCotizCC = recibo.tipo_cotizacion ?? "blue"
  const ccMovs: Record<string, unknown>[] = []
  const idStr = String(recibo.id)
  const isUUIDRec = isUUID(idStr)

  for (const pago of pagos as any[]) {
    if (pago.moneda === "USD" && body?.imputacion_cuenta_pagos?.[pago.id] === "ARS") {
      return NextResponse.json(
        { error: "Los pagos en USD solo pueden imputarse a la Cuenta Corriente en USD." },
        { status: 422 }
      )
    }

    const baseMovCC: Record<string, unknown> = {
      cliente_id: recibo.cliente_id,
      sentido: "haber",
      comprobante_tipo: "recibo",
      comprobante_id: isUUIDRec ? idStr : null,
      comprobante_id_int: !isUUIDRec ? Number(recibo.id) : null,
      comprobante_numero: recibo.numero,
      fecha: new Date().toISOString().split("T")[0],
    }

    if (pago.moneda === "USD") {
      ccMovs.push({
        ...baseMovCC,
        moneda: "USD",
        tipo_movimiento: "recibo",
        importe: Number(pago.importe),
        cotizacion_aplicada: cotizacionCC,
        tipo_cotizacion: tipoCotizCC,
      })
    } else {
      const imputacionPago = body?.imputacion_cuenta_pagos?.[pago.id] as "ARS" | "USD" | undefined
      const destino = casoImputacion === "C"
        ? (imputacionPago ?? "ARS")
        : casoImputacion === "B" ? "USD" : "ARS"

      if (destino === "USD") {
        const conciliacionId = crypto.randomUUID()
        const cotiz = cotizacionCC > 0 ? cotizacionCC : 1
        const importeUSD = Math.round((Number(pago.importe) / cotiz) * 100) / 100

        ccMovs.push({
          ...baseMovCC,
          moneda: "ARS",
          tipo_movimiento: "conciliacion_cruzada",
          importe: Number(pago.importe),
          cotizacion_aplicada: cotiz,
          tipo_cotizacion: tipoCotizCC,
          conciliacion_id: conciliacionId,
        })
        ccMovs.push({
          ...baseMovCC,
          moneda: "USD",
          tipo_movimiento: "conciliacion_cruzada",
          importe: importeUSD,
          importe_conversion: Number(pago.importe),
          cotizacion_aplicada: cotiz,
          tipo_cotizacion: tipoCotizCC,
          conciliacion_id: conciliacionId,
        })
      } else {
        ccMovs.push({
          ...baseMovCC,
          moneda: "ARS",
          tipo_movimiento: "recibo",
          importe: Number(pago.importe),
          cotizacion_aplicada: 1,
        })
      }
    }
  }

  if (ccMovs.length > 0) {
    const { error: ccErr } = await supabase.from("ventas_cc_movimientos").insert(ccMovs)
    if (ccErr && !ccErr.message.includes("does not exist") && !ccErr.message.includes("Could not find the table")) {
      console.error("[publicar recibo] Error CC movimientos:", ccErr.message)
    }
  }

  // 7. Update recibo a 'publicado'
  const { error: pubErr } = await supabase
    .from("recibos")
    .update({
      estado: "publicado",
      importe_no_conciliado: noConciliado,
      importe_no_conciliado_ars: noConciliadoARS,
      fecha_publicacion: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (pubErr) {
    return NextResponse.json({ error: `Error al publicar: ${pubErr.message}` }, { status: 500 })
  }

  // 8. Generar asiento contable. Si falla, revertimos el estado.
  const fecha = recibo.fecha ?? recibo.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0]
  const resultadoAsiento = await generarAsientoRecibo(supabase, {
    id: recibo.id,
    numero: recibo.numero,
    fecha,
    caja_id: recibo.caja_id,
    cliente_nombre: recibo.cliente_nombre,
    sucursal: recibo.sucursal ?? null,
    importe: recibo.importe,
    moneda: recibo.moneda,
    cotizacion: recibo.cotizacion ?? null,
  })
  if (!resultadoAsiento.ok) {
    await supabase.from("recibos").update({ estado: "borrador" }).eq("id", id)
    return NextResponse.json(
      { ok: false, error: `Fallo al generar asiento (recibo revertido a borrador): ${resultadoAsiento.error}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, id, asiento_id: resultadoAsiento.asiento_id })
}
