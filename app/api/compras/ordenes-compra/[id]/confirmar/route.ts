import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"
import {
  generarAsientoFacturaCircuito,
  generarAsientoReversa,
} from "@/lib/contabilidad-asiento-factory"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  // Admin necesario: generarAsientoFacturaCircuito inserta en contabilidad_asientos,
  // tabla con RLS restrictivo que requiere service_role para bypass.
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. OC + proveedor en una sola consulta (JOIN, ahorra 1 round-trip)
  const { data: oc, error: ocErr } = await supabase
    .from("ordenes_compra")
    .select(`
      *,
      proveedor:proveedores!ordenes_compra_proveedor_id_fkey(
        id, razon_social, aplica_circuito_compras, condicion_pago
      )
    `)
    .eq("id", id)
    .single()

  if (ocErr || !oc) return NextResponse.json({ error: "OC no encontrada" }, { status: 404 })
  if (oc.estado !== "borrador") {
    return NextResponse.json({ error: "Solo se puede confirmar una OC en estado borrador" }, { status: 400 })
  }

  // Si el JOIN falló (FK rota o nombre distinto), hacer fallback a la consulta tradicional
  let proveedor = (oc as any).proveedor as
    | { id: number; razon_social: string; aplica_circuito_compras?: boolean; condicion_pago?: string }
    | null
  if (!proveedor) {
    const { data } = await supabase
      .from("proveedores")
      .select("id, razon_social, aplica_circuito_compras, condicion_pago")
      .eq("id", oc.proveedor_id)
      .maybeSingle()
    proveedor = data
  }

  if (!proveedor?.aplica_circuito_compras) {
    return NextResponse.json({ error: "El proveedor no tiene el circuito de compras activado" }, { status: 400 })
  }

  // Validación CRÍTICA: si la OC es en moneda extranjera, necesitamos cotización.
  // Estrategia: primero usar oc.cotizacion_dia. Si no está, intentar fallback al
  // último valor cargado en contabilidad_cotizaciones para esa moneda + tipo.
  // Recién si ni eso existe, rechazar la confirmación con mensaje claro.
  const monedaOc = oc.moneda ?? "ARS"
  let cotizacionOc = Number((oc as any).cotizacion_dia ?? 0)
  if (monedaOc !== "ARS" && (!cotizacionOc || cotizacionOc <= 0)) {
    // Fallback: tomar la última cotización guardada para esta moneda + tipo
    const tipoCot = (oc as any).tipo_cotizacion ?? "oficial"
    const { data: ultimaCot } = await supabase
      .from("contabilidad_cotizaciones")
      .select("tasa, contabilidad_monedas!inner(codigo)")
      .eq("contabilidad_monedas.codigo", monedaOc)
      .eq("tipo", tipoCot)
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ultimaCot?.tasa) {
      cotizacionOc = Number(ultimaCot.tasa)
      // Guardar en la OC para que quede registrado lo que se usó
      await supabase.from("ordenes_compra").update({ cotizacion_dia: cotizacionOc }).eq("id", id)
    }
  }
  if (monedaOc !== "ARS" && (!cotizacionOc || cotizacionOc <= 0)) {
    return NextResponse.json(
      { error: `La OC está en ${monedaOc} pero no hay cotización cargada. Cargá una cotización en Contabilidad → Cotizaciones para ${monedaOc}/${(oc as any).tipo_cotizacion ?? "oficial"} antes de confirmar.` },
      { status: 400 },
    )
  }

  // Lineas de la OC (JSONB)
  const ocLineas: any[] = Array.isArray(oc.lineas)
    ? oc.lineas
    : Array.isArray(oc.items)
    ? oc.items
    : []

  if (ocLineas.length === 0) {
    return NextResponse.json({ error: "La OC no tiene líneas de productos" }, { status: 400 })
  }

  // 2. Lecturas independientes EN PARALELO (antes eran 3 round-trips secuenciales)
  //    - Última FC para generar número
  //    - Cuenta PT en Tránsito para las líneas
  //    - Última Recepción para generar número
  const [ultimaFcRes, cPtRowRes, ultimaRecRes] = await Promise.all([
    supabase
      .from("facturas_compra")
      .select("numero")
      .like("numero", "FC-%")
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("codigo", "11050301")
      .maybeSingle(),
    supabase
      .from("recepciones")
      .select("numero")
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const ultimaFc = ultimaFcRes.data
  const cPtRow = cPtRowRes.data
  const ultimaRec = ultimaRecRes.data

  // Generar número de Factura de Compra
  const siguienteFc = ultimaFc?.numero
    ? parseInt(ultimaFc.numero.split("-").pop() ?? "0", 10) + 1
    : 1
  const numeroFc = `FC-${String(siguienteFc).padStart(7, "0")}`

  // Generar número de Recepción
  const matchRec = ultimaRec?.numero?.match(/REC-(\d+)/)
  const siguienteRec = matchRec ? Number(matchRec[1]) + 1 : 1
  const numeroRec = `REC-${String(siguienteRec).padStart(5, "0")}`

  // 3. Calcular totales
  const subtotal = ocLineas.reduce(
    (s: number, l: any) => s + (l.cantidad ?? 0) * (l.precio_unitario ?? 0),
    0
  )
  const total = subtotal // circuito sin IVA en la factura automática (IVA = 0 salvo que el sistema lo calcule)

  // 4. Crear Factura de Compra en estado pendiente
  const { data: factura, error: fcErr } = await supabase
    .from("facturas_compra")
    .insert({
      numero:          numeroFc,
      tipo:            "A",
      fecha:           oc.fecha ?? new Date().toISOString().split("T")[0],
      fecha_vencimiento: oc.fecha ?? new Date().toISOString().split("T")[0],
      proveedor_id:    oc.proveedor_id,
      proveedor_nombre: oc.proveedor_nombre ?? proveedor.razon_social,
      estado:          "pendiente",
      orden_compra_id: oc.id,
      moneda:          oc.moneda ?? "ARS",
      tipo_cambio:     oc.tipo_cambio ?? 1,
      subtotal,
      iva:             0,
      total,
      saldo:           total,
      es_automatica:   true,
      sucursal:        oc.sucursal ?? null,
    })
    .select()
    .single()

  if (fcErr || !factura) {
    return NextResponse.json(
      { error: `Error al crear factura: ${fcErr?.message}` },
      { status: 500 }
    )
  }

  // 5. Insertar líneas de factura + generar asiento EN PARALELO
  //    Antes eran 2 round-trips secuenciales (líneas → asiento).
  //    Ambos sólo dependen de factura.id que ya tenemos, así que pueden ir juntos.
  const lineasFc = ocLineas.map((l: any, idx: number) => ({
    factura_id:       factura.id,
    orden:            idx,
    descripcion:      l.producto_nombre ?? l.descripcion ?? "",
    cuenta_contable_id: cPtRow?.id ?? null,
    cuenta_codigo:    cPtRow?.codigo ?? "11050301",
    cuenta_nombre:    cPtRow?.nombre ?? "PT en Tránsito",
    cantidad:         l.cantidad ?? 1,
    precio_unitario:  l.precio_unitario ?? 0,
    descuento_pct:    l.descuento ?? 0,
    subtotal:         (l.cantidad ?? 1) * (l.precio_unitario ?? 0),
    iva:              0,
    total_linea:      (l.cantidad ?? 1) * (l.precio_unitario ?? 0),
    alicuota_iva:     0,
  }))

  // ─── BLOQUE PARALELO GIGANTE: todo lo que sólo necesita factura.id va junto ──
  //   Antes era: [líneas + asiento] → [recepción + update FC] → [update OC + evento]
  //   Ahora:    [líneas, asiento, recepción, update OC, evento] todo en paralelo,
  //             y al final UN solo update para grabar el asiento_id en la factura.
  //   El cuello de botella ya no son los waits intermedios — sólo esperamos el más lento.
  const recepcionPayload = {
    numero:               numeroRec,
    fecha:                oc.fecha ?? new Date().toISOString().split("T")[0],
    orden_compra_id:      oc.id,
    orden_compra_numero:  oc.numero,
    proveedor_id:         oc.proveedor_id,
    proveedor_nombre:     oc.proveedor_nombre ?? proveedor.razon_social,
    estado:               "esperando_recepcion",
    documento_origen_tipo: "oc",
    documento_origen_id:  oc.id,
    documento_origen_ref: oc.numero,
    sucursal:             oc.sucursal ?? null,
    deposito_destino:     oc.deposito_destino ?? null,
    deposito_destino_id:  oc.deposito_destino_id ?? null,
    fecha_esperada:       oc.fecha_entrega_estimada ?? null,
    factura_id:           factura.id,
    items: ocLineas.map((l: any) => ({
      producto_id:            l.producto_id,
      producto_nombre:        l.producto_nombre,
      producto_sku:           l.producto_sku ?? "",
      cantidad_pedida:        l.cantidad ?? 0,
      cantidad_recibida:      0,
      precio_unitario:        l.precio_unitario ?? 0,
      udm:                    l.udm ?? "un",
      estado_linea:           "pendiente",
      tiene_serie:            l.tiene_serie ?? false,
      requiere_color:         l.requiere_color ?? false,
      requiere_bateria:       l.requiere_bateria ?? false,
      requiere_outlet:        l.requiere_outlet ?? false,
      requiere_observaciones: l.requiere_observaciones ?? false,
      nac:                    l.nac ?? false,
    })),
    total: 0,
  }

  const [lineasInsert, asientoFc, recepcionRes, ocUpdateRes] = await Promise.all([
    lineasFc.length > 0
      ? supabase.from("compras_facturas_lineas").insert(lineasFc)
      : Promise.resolve({ error: null as any }),
    generarAsientoFacturaCircuito(adminClient, {
      id:               factura.id,
      numero:           numeroFc,
      fecha:            factura.fecha,
      proveedor_nombre: factura.proveedor_nombre,
      sucursal:         oc.sucursal ?? null,
      subtotal,
      impuestos:        0,
      total,
      moneda:           monedaOc,
      cotizacion:       cotizacionOc || 1,
    }),
    supabase.from("recepciones").insert(recepcionPayload).select().single(),
    supabase.from("ordenes_compra").update({ estado: "confirmada" }).eq("id", id).select().single(),
    registrarEvento(supabase, {
      tipo_documento: "orden_compra",
      documento_id: oc.id,
      tipo_evento: "cambio_estado",
      valor_anterior: "borrador",
      valor_nuevo: "confirmada",
      usuario: null,
    }),
  ])

  if (lineasInsert.error) {
    await supabase.from("facturas_compra").delete().eq("id", factura.id)
    return NextResponse.json(
      { error: `Error al crear líneas de factura: ${lineasInsert.error.message}` },
      { status: 500 }
    )
  }

  if (!asientoFc.ok) {
    await supabase.from("compras_facturas_lineas").delete().eq("factura_id", factura.id)
    await supabase.from("facturas_compra").delete().eq("id", factura.id)
    return NextResponse.json(
      { error: `Error al generar asiento de factura: ${asientoFc.error}` },
      { status: 500 }
    )
  }

  if (recepcionRes.error || !recepcionRes.data) {
    await generarAsientoReversa(adminClient, asientoFc.asiento_id, "Anulación circuito — fallo al crear recepción")
    await supabase.from("compras_facturas_lineas").delete().eq("factura_id", factura.id)
    await supabase.from("facturas_compra").delete().eq("id", factura.id)
    return NextResponse.json(
      { error: `Error al crear recepción: ${recepcionRes.error?.message}` },
      { status: 500 }
    )
  }

  if (ocUpdateRes.error) {
    console.error("[circuito] Error actualizando estado OC:", ocUpdateRes.error.message)
  }

  // 7. Update final de la factura con el asiento_id (debe ir después porque depende del asiento generado)
  await supabase
    .from("facturas_compra")
    .update({ asiento_id: asientoFc.asiento_id })
    .eq("id", factura.id)

  return NextResponse.json({
    oc:        ocUpdateRes.data ?? { ...oc, estado: "confirmada" },
    factura:   { ...factura, asiento_id: asientoFc.asiento_id },
    recepcion: recepcionRes.data,
  })
}
