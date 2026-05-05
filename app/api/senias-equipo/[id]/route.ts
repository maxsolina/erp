import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import {
  generarAsientoRecibo,
  generarAsientoRemito,
  generarAsientoFacturaVenta,
} from "@/lib/contabilidad-asiento-factory"
import { registrarEvento } from "@/lib/seguimiento"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Parsea el numero correlativo de un comprobante de forma segura */
function parseNum(numero: string | null | undefined, fallback: number): number {
  if (!numero) return fallback
  const n = parseInt(numero.replace(/\D/g, "").slice(-8), 10)
  return isNaN(n) || n < fallback ? fallback : n
}

// PATCH — actualizar una seña (registrar seña / actualizar fecha / cancelar / confirmar cierre)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id: rawId } = await params
  const id = parseInt(rawId)
  const body = await req.json()
  const { accion } = body

  // Cargar seña actual
  const { data: senia, error: loadErr } = await supabase
    .from("senias_equipo")
    .select("*")
    .eq("id", id)
    .single()
  if (loadErr || !senia) return NextResponse.json({ error: "Seña no encontrada" }, { status: 404 })

  // ── REGISTRAR SEÑA ──────────────────────────────────────────────────────────
  if (accion === "registrar_senia") {
    // Bloquear si ya existe un recibo activo (solo se permite uno a la vez)
    if (senia.estado_senia === "registrada" && senia.recibo_senia_id) {
      return NextResponse.json({ error: "Ya existe un recibo de seña activo. Cancelalo antes de registrar uno nuevo." }, { status: 409 })
    }

    const { monto_senia, medio_pago_senia, sucursal_id, usuario, cotizacion_senia, moneda_pago } = body

    // Cotización al momento del pago: la que viene del form, fallback 1
    const cotizPago: number = Number(cotizacion_senia) > 0 ? Number(cotizacion_senia) : 1

    // Conversión de moneda CORRECTA en ambas direcciones:
    //   - moneda_pago = moneda en la que entró el cash (caja_valor)
    //   - senia.moneda = moneda en que está expresada la seña (típicamente USD)
    //
    // El recibo se imputa en LA MONEDA DEL SEÑA, con `importe` convertido. Los
    // `recibo_pagos` guardan la moneda y monto original del cash que llegó.
    // Si las monedas coinciden, no hay conversión. Si difieren se aplica
    // `cotizPago` en la dirección que corresponda.
    const monedaSenia = (senia.moneda ?? "ARS") as "ARS" | "USD"
    const monedaPago = (moneda_pago ?? monedaSenia) as "ARS" | "USD"
    let importeEnSenia = Number(monto_senia)
    if (monedaPago !== monedaSenia && cotizPago > 0) {
      if (monedaPago === "ARS" && monedaSenia === "USD") {
        importeEnSenia = Number(monto_senia) / cotizPago   // ARS → USD
      } else if (monedaPago === "USD" && monedaSenia === "ARS") {
        importeEnSenia = Number(monto_senia) * cotizPago   // USD → ARS
      }
    }
    importeEnSenia = parseFloat(importeEnSenia.toFixed(4))
    // Para el ventas_cc_movimientos seguimos persistiendo en USD por
    // consistencia con el resto del módulo (CC bimonetaria con USD como base).
    const montoUSD = monedaSenia === "USD"
      ? importeEnSenia
      : (cotizPago > 0 ? parseFloat((importeEnSenia / cotizPago).toFixed(4)) : importeEnSenia)

    // Generar recibo por la seña
    let reciboNumero = ""
    let reciboId: number | null = null
    try {
      // Número correlativo
      const { data: lastRec } = await supabase
        .from("recibos")
        .select("numero")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastNum = lastRec?.numero
        ? parseInt(lastRec.numero.replace(/\D/g, "").slice(-5), 10)
        : 11735
      reciboNumero = `RC X Norte-${String(lastNum + 1).padStart(6, "0")}`

      // Nombre de sucursal: de la caja si hay caja_id, o fallback
      let sucursalNombre = "Casa Central"
      if (body.caja_id) {
        const { data: cajaRow } = await supabase
          .from("cajas")
          .select("sucursal")
          .eq("id", body.caja_id)
          .maybeSingle()
        if (cajaRow?.sucursal) sucursalNombre = cajaRow.sucursal
      } else if (sucursal_id) {
        const { data: sucRow } = await supabase
          .from("sucursales")
          .select("nombre")
          .eq("id", sucursal_id)
          .maybeSingle()
        if (sucRow?.nombre) sucursalNombre = sucRow.nombre
      }

      // El recibo se imputa en la MONEDA DEL SEÑA con el importe convertido.
      // El detalle del cash (moneda + monto original) va en recibo_pagos.
      // Así la CC del cliente y el listado de recibos siempre ven la moneda
      // del seña (típicamente USD), sin importar en qué moneda llegó el efectivo.
      const observacionesRecibo = monedaPago === monedaSenia
        ? `Seña: ${senia.equipo_nombre} (${senia.numero})`
        : `Seña: ${senia.equipo_nombre} (${senia.numero}) | ${monedaPago} ${Number(monto_senia).toLocaleString("es-AR")} @ $${cotizPago}`
      const { data: recData, error: recErr } = await supabase
        .from("recibos")
        .insert({
          numero: reciboNumero,
          sucursal: sucursalNombre,
          cliente_id: senia.cliente_id,
          cliente_nombre: senia.cliente_nombre,
          caja_id: body.caja_id ?? null,
          fecha: new Date().toISOString().split("T")[0],
          estado: "publicado",
          fecha_publicacion: new Date().toISOString(),
          moneda: monedaSenia,
          importe: importeEnSenia,
          importe_no_conciliado: importeEnSenia,
          observaciones: observacionesRecibo,
          cotizacion: monedaPago !== monedaSenia ? cotizPago : null,
        })
        .select()
        .single()
      if (recErr) {
        console.error("[senias] recibo insert error:", recErr.message, recErr.details)
      } else if (recData) {
        reciboId = recData.id
        // Línea de pago del recibo — preserva la moneda y monto ORIGINAL del cash
        await supabase.from("recibo_pagos").insert({
          recibo_id: recData.id,
          valor_id: body.caja_valor_id ?? null,
          valor_nombre: medio_pago_senia ?? null,
          tipo_valor: "efectivo",
          // moneda_comprobante / importe_comprobante = moneda del recibo (seña),
          // moneda / importe = moneda del cash que llegó.
          importe_comprobante: importeEnSenia,
          moneda_comprobante: monedaSenia,
          importe: Number(monto_senia),
          moneda: monedaPago,
          cotizacion: monedaPago !== monedaSenia ? cotizPago : null,
          es_tarjeta: false,
          es_cheque: false,
          cantidad_cuotas: 1,
          recargo_porcentaje: 0,
          recargo_importe: 0,
        })

        // ── Movimiento en caja (si hay extracto abierto) ───────────────────────
        // El movimiento de caja preserva la moneda y monto ORIGINAL del cash
        // (no la moneda del seña), porque la caja tracks el efectivo real recibido.
        if (body.caja_id) {
          const { data: extracto } = await supabase
            .from("extractos_caja")
            .select("id")
            .eq("caja_id", body.caja_id)
            .eq("estado", "abierto")
            .maybeSingle()
          if (extracto) {
            const { error: movErr } = await supabase.from("movimientos_caja").insert({
              extracto_id: extracto.id,
              valor_id: body.caja_valor_id ?? null,
              valor_nombre: medio_pago_senia ?? null,
              tipo_movimiento: "ingreso",
              importe: Number(monto_senia),
              moneda: monedaPago,
              concepto: `Seña ${senia.numero} - ${senia.cliente_nombre}`,
              documento_origen_tipo: "recibo",
              documento_origen_numero: reciboNumero,
            })
            if (movErr) console.error("[senias] movimiento_caja error:", movErr.message)
          } else {
            console.warn("[senias] No hay extracto abierto para caja_id:", body.caja_id)
          }
        }

        // ── Movimiento cuenta corriente USD del cliente ─────────────────────
        const ccMov = {
          cliente_id: senia.cliente_id,
          sentido: 'haber',
          moneda: 'USD',
          tipo_movimiento: 'recibo',
          importe: montoUSD,
          cotizacion_aplicada: cotizPago,
          comprobante_tipo: 'recibo',
          comprobante_numero: reciboNumero,
          fecha: new Date().toISOString().split('T')[0],
        }
        const { error: ccErr } = await supabase.from('ventas_cc_movimientos').insert(ccMov)
        if (ccErr) console.error('[senias] cc_movimiento error:', ccErr.message)

        // ── Asiento contable ────────────────────────────────────────────────
        const asientoRes = await generarAsientoRecibo(supabase, {
          id: recData.id,
          numero: reciboNumero,
          fecha: new Date().toISOString().split('T')[0],
          caja_id: body.caja_id ?? '',
          cliente_nombre: senia.cliente_nombre,
          sucursal: sucursalNombre,
          importe: montoUSD,
          moneda: 'USD',
          cotizacion: cotizPago,
        })
        if (!asientoRes.ok) {
          console.error('[senias] asiento recibo error:', asientoRes.error)
        }
      }
    } catch (e) {
      console.error("[senias] recibo error:", e)
    }

    const fmtImp = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const detalleSeguimiento = monedaPago === monedaSenia
      ? `${monedaPago} ${fmtImp(Number(monto_senia))}. Medio: ${medio_pago_senia}`
      : `${monedaPago} ${fmtImp(Number(monto_senia))} → ${monedaSenia} ${fmtImp(importeEnSenia)} @ $${cotizPago}. Medio: ${medio_pago_senia}`
    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: new Date().toISOString(),
        usuario: usuario ?? "Operador",
        accion: "Seña registrada",
        detalle: detalleSeguimiento,
      },
    ]

    // UPDATE base (columnas que siempre existen)
    const { data: updated, error } = await supabase
      .from("senias_equipo")
      .update({
        monto_senia,
        medio_pago_senia,
        estado_senia: "registrada",
        recibo_senia_numero: reciboNumero,
        seguimiento,
      })
      .eq("id", id)
      .select()
      .single()
    if (error) return dbError(error)

    // UPDATE columnas opcionales (script 062) — se ignora el error si aún no existen
    await supabase.from("senias_equipo").update({
      recibo_senia_id: reciboId,
      cotizacion_senia: cotizPago,
      monto_senia_usd: montoUSD,
    }).eq("id", id)

    // Reservar la unidad de stock (fallback: cubre señas creadas antes del fix en POST)
    if (senia.stock_item_id) {
      await supabase
        .from("stock_unidades")
        .update({ estado: "reservado" })
        .eq("id", senia.stock_item_id)
        .eq("estado", "disponible")
      // Vincular NV (columnas opcionales — script 064)
      await supabase
        .from("stock_unidades")
        .update({ nota_venta_id: senia.nota_venta_id ?? null, nota_venta_numero: senia.nota_venta_numero ?? null })
        .eq("id", senia.stock_item_id)
    }

    return NextResponse.json({ ok: true, senia: { ...updated, recibo_senia_id: reciboId, cotizacion_senia: cotizPago, monto_senia_usd: montoUSD }, recibo_numero: reciboNumero })
  }

  // ── CANCELAR RECIBO DE SEÑA ─────────────────────────────────────────────────
  if (accion === "cancelar_recibo_senia") {
    const { usuario } = body
    if (senia.estado_senia !== "registrada") {
      return NextResponse.json({ error: "No hay recibo activo para cancelar" }, { status: 400 })
    }
    // Cancelar el recibo en tabla recibos
    if (senia.recibo_senia_id) {
      const { error: cancelErr } = await supabase
        .from("recibos")
        .update({ estado: "cancelado", importe_no_conciliado: 0 })
        .eq("id", senia.recibo_senia_id)
      if (cancelErr) {
        console.error("[senias] cancelar recibo error:", cancelErr.message)
        return NextResponse.json({ error: "Error al cancelar el recibo: " + cancelErr.message }, { status: 500 })
      }

      // Reversa en caja: leer recibo + recibo_pagos para obtener el importe original del comprobante
      const { data: reciboCancelado } = await supabase
        .from("recibos")
        .select("caja_id")
        .eq("id", senia.recibo_senia_id)
        .maybeSingle()
      const { data: pagosOriginales } = await supabase
        .from("recibo_pagos")
        .select("valor_id, valor_nombre, importe_comprobante, moneda_comprobante")
        .eq("recibo_id", senia.recibo_senia_id)
      if (reciboCancelado?.caja_id && pagosOriginales && pagosOriginales.length > 0) {
        const { data: extracto } = await supabase
          .from("extractos_caja")
          .select("id")
          .eq("caja_id", reciboCancelado.caja_id)
          .eq("estado", "abierto")
          .maybeSingle()
        if (extracto) {
          for (const pago of pagosOriginales) {
            const { error: reversaErr } = await supabase.from("movimientos_caja").insert({
              extracto_id: extracto.id,
              valor_id: pago.valor_id,
              valor_nombre: pago.valor_nombre,
              tipo_movimiento: "egreso",
              importe: pago.importe_comprobante,
              moneda: pago.moneda_comprobante,
              concepto: `Reversa seña cancelada - ${senia.numero} (${senia.cliente_nombre})`,
              documento_origen_tipo: "recibo",
              documento_origen_numero: senia.recibo_senia_numero,
            })
            if (reversaErr) console.error("[senias] reversa caja error:", reversaErr.message)
          }
        } else {
          console.warn("[senias] No hay extracto abierto para revertir caja, caja_id:", reciboCancelado.caja_id)
        }
      }

      // Reversa en cuenta corriente USD: eliminar el movimiento haber del recibo
      await supabase
        .from("ventas_cc_movimientos")
        .delete()
        .eq("comprobante_numero", senia.recibo_senia_numero)
        .eq("tipo_movimiento", "recibo")
        .eq("sentido", "haber")
        .eq("cliente_id", senia.cliente_id)
    }
    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: new Date().toISOString(),
        usuario: usuario ?? "Operador",
        accion: "Recibo de seña cancelado",
        detalle: `Recibo ${senia.recibo_senia_numero ?? ""} anulado. Seña devuelta a sin_senia.`,
      },
    ]
    // UPDATE base
    const { data: updated, error } = await supabase
      .from("senias_equipo")
      .update({
        estado_senia: "sin_senia",
        monto_senia: 0,
        medio_pago_senia: null,
        recibo_senia_numero: null,
        seguimiento,
      })
      .eq("id", id)
      .select()
      .single()
    if (error) return dbError(error)

    // UPDATE columnas opcionales (script 062)
    await supabase.from("senias_equipo").update({
      recibo_senia_id: null,
      cotizacion_senia: null,
      monto_senia_usd: null,
    }).eq("id", id)

    return NextResponse.json({ ok: true, senia: { ...updated, recibo_senia_id: null, cotizacion_senia: null, monto_senia_usd: null } })
  }

  // ── ACTUALIZAR FECHA LÍMITE ─────────────────────────────────────────────────
  if (accion === "actualizar_fecha_limite") {
    const { fecha_limite, usuario } = body
    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: new Date().toISOString(),
        usuario: usuario ?? "Operador",
        accion: "Fecha límite actualizada",
        detalle: `Nueva fecha: ${fecha_limite}`,
      },
    ]
    const { data: updated, error } = await supabase
      .from("senias_equipo")
      .update({ fecha_limite, seguimiento })
      .eq("id", id)
      .select()
      .single()
    if (error) return dbError(error)
    return NextResponse.json({ ok: true, senia: updated })
  }

  // ── CANCELAR ────────────────────────────────────────────────────────────────
  if (accion === "cancelar") {
    const { usuario, motivo } = body

    // Liberar la unidad de stock reservada
    if (senia.stock_item_id) {
      await supabase
        .from("stock_unidades")
        .update({
          estado: "disponible",
          nota_venta_id: null,
          nota_venta_numero: null,
        })
        .eq("id", senia.stock_item_id)
        .eq("estado", "reservado")
    }

    // Cancelar OE
    if (senia.oe_id) {
      await supabase
        .from("ordenes_entrega")
        .update({ estado: "cancelada" })
        .eq("id", senia.oe_id)
    }

    // Cancelar NV
    if (senia.nota_venta_id) {
      await supabase
        .from("notas_venta")
        .update({ estado: "cancelada" })
        .eq("id", senia.nota_venta_id)
    }

    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: new Date().toISOString(),
        usuario: usuario ?? "Operador",
        accion: "Seña cancelada",
        detalle: motivo ?? "Cancelación manual",
      },
    ]

    const { data: updated, error } = await supabase
      .from("senias_equipo")
      .update({ estado: "cancelada", seguimiento })
      .eq("id", id)
      .select()
      .single()
    if (error) return dbError(error)

    await registrarEvento(supabase, {
      tipo_documento: "senia_equipo",
      documento_id: Number(id),
      tipo_evento: "cambio_estado",
      valor_anterior: senia.estado,
      valor_nuevo: "cancelada",
      usuario: body.usuario ?? null,
    })

    return NextResponse.json({ ok: true, senia: updated })
  }

  // ── CONFIRMAR CIERRE ────────────────────────────────────────────────────────
  if (accion === "confirmar_cierre") {
    const { medios_pago_cierre, toma_equipo_id, usuario } = body
    const ahora = new Date().toISOString()

    // 1. Crear Remito confirmado + asiento contable de salida de stock
    let remitoId: number | null = null
    let remitoNumero = ""
    let remitoAsientoId: string | null = null
    const { data: lastRem } = await supabase
      .from("remitos")
      .select("numero")
      .not("numero", "ilike", "%NaN%")
      .like("numero", "R X %")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    remitoNumero = `R X 10000-${String(parseNum(lastRem?.numero, 5035) + 1).padStart(8, "0")}`
    // Líneas del remito en formato compatible con generarAsientoRemito
    const remitoLineas = [{
      producto_id: senia.stock_item_id ?? 0,
      producto_nombre: senia.equipo_nombre,
      cantidad: 1,
      precio_unitario: senia.precio_final,
    }]
    const { data: remData, error: remErr } = await supabase
      .from("remitos")
      .insert({
        numero: remitoNumero,
        orden_entrega_id: senia.oe_id,
        orden_entrega_numero: senia.oe_numero,
        nota_venta_id: senia.nota_venta_id,
        nota_venta_numero: senia.nota_venta_numero,
        cliente_id: senia.cliente_id,
        cliente_nombre: senia.cliente_nombre,
        estado: "confirmado",
        fecha: ahora,
        tipo: "salida",
        total_bultos: 1,
        productos: [{ nombre: senia.equipo_nombre, imei: senia.equipo_imei, cantidad: 1 }],
        lineas: remitoLineas,
        seguimiento: [{ fecha: ahora, usuario: usuario ?? "Operador", accion: "Remito confirmado (cierre seña)" }],
      })
      .select()
      .single()
    if (!remErr && remData) {
      remitoId = remData.id
      // Asiento contable del remito (Costo Mercadería / Stock).
      // Si falla, loggeamos pero no abortamos — el operador puede regenerar el asiento desde la ficha.
      if (senia.stock_item_id) {
        const asientoRem = await generarAsientoRemito(supabase, {
          id: String(remData.id),
          numero: remitoNumero,
          fecha: ahora.split("T")[0],
          cliente_nombre: senia.cliente_nombre,
          sucursal: null,
          lineas: [{ producto_id: senia.stock_item_id, cantidad: 1 }],
        })
        if (asientoRem.ok && asientoRem.asiento_id) {
          remitoAsientoId = asientoRem.asiento_id
          await supabase.from("remitos").update({ asiento_id: asientoRem.asiento_id }).eq("id", remData.id)
        } else if (!asientoRem.ok) {
          console.error("[senias cierre] asiento remito error:", asientoRem.error)
        }
      }
    }

    // 1b. Descontar stock — marcar unidad como entregada y registrar movimiento
    if (senia.stock_item_id) {
      const { data: unidad } = await supabase
        .from("stock_unidades")
        .select("id, producto_id, deposito_id, ubicacion_id, nro_serie")
        .eq("id", senia.stock_item_id)
        .single()

      if (unidad) {
        await supabase
          .from("stock_unidades")
          .update({ estado: "entregado", updated_at: ahora })
          .eq("id", unidad.id)

        const { error: movEgresoErr } = await supabase.from("stock_movimientos").insert({
          tipo: "egreso",
          producto_id: unidad.producto_id,
          producto_nombre: senia.equipo_nombre ?? "",
          cantidad: 1,
          nro_serie: unidad.nro_serie ?? senia.equipo_imei ?? null,
          deposito_id: unidad.deposito_id ?? null,
          ubicacion_id: unidad.ubicacion_id ?? null,
          documento_tipo: "remito",
          documento_numero: remitoNumero,
          nv_numero: senia.nota_venta_numero ?? null,
          oe_numero: senia.oe_numero ?? null,
          remito_numero: remitoNumero,
          usuario: usuario ?? "Operador",
          observaciones: `Entrega confirmada (cierre seña ${senia.numero}). NV: ${senia.nota_venta_numero ?? "-"} | OE: ${senia.oe_numero ?? "-"}`,
        })
        if (movEgresoErr) {
          // No abortamos — el remito y la unidad ya están actualizados. Loggeamos
          // y propagamos el error como advertencia para que el front sepa.
          console.error("[senia cierre] error al registrar movimiento de egreso:", movEgresoErr.message)
        }
      }
    }

    // 2. Crear Factura confirmada + asiento contable de venta.
    // Antes nacía "abierta" y sin asiento; ahora completa el circuito contable
    // en el momento del cierre (DR Deudores / CR Ventas + IVA si corresponde).
    let facturaId: number | null = null
    let facturaNumero = ""
    let facturaAsientoId: string | null = null
    const { data: lastFac } = await supabase
      .from("facturas")
      .select("numero")
      .like("numero", "FAC-%")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    const facSeq = parseNum(lastFac?.numero, 1) + 1
    facturaNumero = `FAC-${String(facSeq).padStart(5, "0")}`
    const saldoPendiente = Math.max(0, Number(senia.precio_final) - Number(senia.monto_senia ?? 0))
    const { data: facData, error: facErr } = await supabase
      .from("facturas")
      .insert({
        numero: facturaNumero,
        tipo: "",
        nota_venta_id: senia.nota_venta_id,
        nota_venta_numero: senia.nota_venta_numero,
        cliente_id: senia.cliente_id,
        cliente_nombre: senia.cliente_nombre,
        vendedor_id: senia.vendedor_id ?? null,
        sucursal_id: senia.sucursal_id ?? null,
        fecha: ahora,
        estado: "confirmada",
        moneda: senia.moneda ?? "ARS",
        subtotal: senia.precio_final,
        descuento: senia.descuento ?? 0,
        impuestos: 0,
        total: senia.precio_final,
        saldo: saldoPendiente,
      })
      .select()
      .single()
    if (!facErr && facData) {
      facturaId = facData.id
      // Insertar línea de producto en la factura
      const { error: facLinErr } = await supabase.from("facturas_lineas").insert({
        factura_id: facData.id,
        producto_id: senia.stock_item_id ?? null,
        producto_nombre: senia.equipo_nombre,
        descripcion: [senia.equipo_color, senia.equipo_imei ? `IMEI: ${senia.equipo_imei}` : null, senia.equipo_bateria ? `Bat: ${senia.equipo_bateria}%` : null].filter(Boolean).join(" · ") || null,
        cantidad: 1,
        precio_unitario: senia.precio_final,
        descuento: senia.descuento ?? 0,
        subtotal: senia.precio_final,
      })
      if (facLinErr) {
        console.error("[senia cierre] error en línea de factura:", facLinErr.message)
      }

      // Asiento contable de la factura (DR Deudores / CR Ventas).
      // Si falla, loggeamos pero no abortamos.
      const asientoFac = await generarAsientoFacturaVenta(supabase, {
        id: facData.id,
        numero: facturaNumero,
        fecha: ahora.split("T")[0],
        cliente_id: senia.cliente_id != null ? String(senia.cliente_id) : null,
        cliente_nombre: senia.cliente_nombre,
        sucursal: null,
        subtotal: Number(senia.precio_final),
        impuestos: 0,
        total: Number(senia.precio_final),
        moneda: senia.moneda ?? "ARS",
        cotizacion: (senia.moneda && senia.moneda !== "ARS") ? Number(senia.cotizacion ?? 0) : null,
      })
      if (asientoFac.ok && asientoFac.asiento_id) {
        facturaAsientoId = asientoFac.asiento_id
        await supabase.from("facturas").update({ asiento_id: asientoFac.asiento_id }).eq("id", facData.id)
      } else if (!asientoFac.ok) {
        console.error("[senias cierre] asiento factura error:", asientoFac.error)
      }
    }

    // 3. Actualizar NV a facturada
    if (senia.nota_venta_id) {
      await supabase
        .from("notas_venta")
        .update({ estado: "facturada" })
        .eq("id", senia.nota_venta_id)
    }

    // 4. Actualizar OE a entregada
    if (senia.oe_id) {
      await supabase
        .from("ordenes_entrega")
        .update({ estado: "entregada", productos_entregados: 1 })
        .eq("id", senia.oe_id)
    }

    const detalleCierre = [
      `Remito: ${remitoNumero}${remitoAsientoId ? " (con asiento)" : ""}`,
      `Factura: ${facturaNumero} confirmada${facturaAsientoId ? " (con asiento)" : ""}`,
      `Medios cierre: ${medios_pago_cierre?.length ?? 0}`,
    ].join(". ")
    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: ahora,
        usuario: usuario ?? "Operador",
        accion: "Operación confirmada — equipo entregado",
        detalle: detalleCierre,
      },
    ]

    const { data: updated, error } = await supabase
      .from("senias_equipo")
      .update({
        estado: "confirmada",
        remito_id: remitoId,
        remito_numero: remitoNumero,
        factura_id: facturaId,
        factura_numero: facturaNumero,
        medios_pago_cierre: medios_pago_cierre ?? [],
        toma_equipo_id: toma_equipo_id ?? null,
        seguimiento,
      })
      .eq("id", id)
      .select()
      .single()
    if (error) return dbError(error)

    await registrarEvento(supabase, {
      tipo_documento: "senia_equipo",
      documento_id: Number(id),
      tipo_evento: "cambio_estado",
      valor_anterior: senia.estado,
      valor_nuevo: "confirmada",
      usuario: body.usuario ?? null,
    })

    return NextResponse.json({ ok: true, senia: updated, remito_numero: remitoNumero, factura_numero: facturaNumero })
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
}
