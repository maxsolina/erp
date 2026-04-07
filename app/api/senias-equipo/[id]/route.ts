import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

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
    const { monto_senia, medio_pago_senia, sucursal_id, usuario } = body

    // Generar recibo por la seña
    let reciboNumero = ""
    let reciboId: number | null = null
    try {
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

      const { data: recData, error: recErr } = await supabase
        .from("recibos")
        .insert({
          numero: reciboNumero,
          cliente_id: senia.cliente_id,
          cliente_nombre: senia.cliente_nombre,
          vendedor_id: senia.vendedor_id ?? null,
          sucursal_id: sucursal_id ?? senia.sucursal_id,
          fecha: new Date().toISOString(),
          estado: "activo",
          moneda: "ARS",
          importe_total: monto_senia,
          importe_no_conciliado: monto_senia,
          notas: `Seña por equipo: ${senia.equipo_nombre} (${senia.numero})`,
        })
        .select()
        .single()
      if (!recErr && recData) {
        reciboId = recData.id
        // Insertar línea del recibo
        await supabase.from("recibos_lineas").insert({
          recibo_id: recData.id,
          medio: medio_pago_senia,
          descripcion: `Seña equipo ${senia.equipo_nombre}`,
          monto_original: monto_senia,
          monto_con_recargo: monto_senia,
        })
      }
    } catch (e) {
      console.error("[senias] recibo error:", e)
    }

    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: new Date().toISOString(),
        usuario: usuario ?? "Operador",
        accion: "Seña registrada",
        detalle: `Monto: $${monto_senia?.toLocaleString("es-AR")}. Medio: ${medio_pago_senia}`,
      },
    ]

    const { data: updated, error } = await supabase
      .from("senias_equipo")
      .update({
        monto_senia,
        medio_pago_senia,
        estado_senia: "registrada",
        recibo_senia_numero: reciboNumero,
        recibo_senia_id: reciboId,
        seguimiento,
      })
      .eq("id", id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, senia: updated, recibo_numero: reciboNumero })
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, senia: updated })
  }

  // ── CANCELAR ────────────────────────────────────────────────────────────────
  if (accion === "cancelar") {
    const { usuario, motivo } = body

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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, senia: updated })
  }

  // ── CONFIRMAR CIERRE ────────────────────────────────────────────────────────
  if (accion === "confirmar_cierre") {
    const { medios_pago_cierre, toma_equipo_id, usuario } = body
    const ahora = new Date().toISOString()

    // 1. Crear Remito confirmado
    let remitoId: number | null = null
    let remitoNumero = ""
    const { data: lastRem } = await supabase
      .from("remitos")
      .select("numero")
      .not("numero", "ilike", "%NaN%")
      .like("numero", "R X %")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    remitoNumero = `R X 10000-${String(parseNum(lastRem?.numero, 5035) + 1).padStart(8, "0")}`
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
        lineas: [],
        seguimiento: [{ fecha: ahora, usuario: usuario ?? "Operador", accion: "Remito confirmado (cierre seña)" }],
      })
      .select()
      .single()
    if (!remErr && remData) remitoId = remData.id

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

        await supabase.from("stock_movimientos").insert({
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
      }
    }

    // 2. Crear Factura abierta
    let facturaId: number | null = null
    let facturaNumero = ""
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
        estado: "abierta",
        moneda: "ARS",
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
      await supabase.from("facturas_lineas").insert({
        factura_id: facData.id,
        producto_id: senia.stock_item_id ?? null,
        producto_nombre: senia.equipo_nombre,
        descripcion: [senia.equipo_color, senia.equipo_imei ? `IMEI: ${senia.equipo_imei}` : null, senia.equipo_bateria ? `Bat: ${senia.equipo_bateria}%` : null].filter(Boolean).join(" · ") || null,
        cantidad: 1,
        precio_unitario: senia.precio_final,
        descuento: senia.descuento ?? 0,
        subtotal: senia.precio_final,
      })
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

    const seguimiento = [
      ...(senia.seguimiento ?? []),
      {
        fecha: ahora,
        usuario: usuario ?? "Operador",
        accion: "Seña confirmada — equipo entregado",
        detalle: `Remito: ${remitoNumero}. Factura: ${facturaNumero}. Medios cierre: ${medios_pago_cierre?.length ?? 0}`,
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
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, senia: updated, remito_numero: remitoNumero, factura_numero: facturaNumero })
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
}
