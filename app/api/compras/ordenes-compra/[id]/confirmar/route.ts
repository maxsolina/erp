import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import {
  generarAsientoFacturaCircuito,
  generarAsientoReversa,
} from "@/lib/contabilidad-asiento-factory"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la OC
  const { data: oc, error: ocErr } = await supabase
    .from("ordenes_compra")
    .select("*")
    .eq("id", id)
    .single()

  if (ocErr || !oc) return NextResponse.json({ error: "OC no encontrada" }, { status: 404 })
  if (oc.estado !== "borrador") {
    return NextResponse.json({ error: "Solo se puede confirmar una OC en estado borrador" }, { status: 400 })
  }

  // 2. Obtener proveedor y verificar circuito
  const { data: proveedor } = await supabase
    .from("proveedores")
    .select("id, razon_social, aplica_circuito_compras, condicion_pago")
    .eq("id", oc.proveedor_id)
    .maybeSingle()

  if (!proveedor?.aplica_circuito_compras) {
    return NextResponse.json({ error: "El proveedor no tiene el circuito de compras activado" }, { status: 400 })
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

  // 3. Generar número de Factura de Compra
  const { data: ultimaFc } = await supabase
    .from("facturas_compra")
    .select("numero")
    .like("numero", "FC-%")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()
  const siguienteFc = ultimaFc?.numero
    ? parseInt(ultimaFc.numero.split("-").pop() ?? "0", 10) + 1
    : 1
  const numeroFc = `FC-${String(siguienteFc).padStart(7, "0")}`

  // 4. Calcular totales
  const subtotal = ocLineas.reduce(
    (s: number, l: any) => s + (l.cantidad ?? 0) * (l.precio_unitario ?? 0),
    0
  )
  const total = subtotal // circuito sin IVA en la factura automática (IVA = 0 salvo que el sistema lo calcule)

  // 5. Crear Factura de Compra en estado pendiente
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

  // 6. Insertar líneas de factura (una por línea de OC, con cuenta PT en Tránsito)
  // Buscamos la cuenta PT en Tránsito para ponerla en las líneas
  const { data: cPtRow } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("codigo", "11050301")
    .maybeSingle()

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

  if (lineasFc.length > 0) {
    const { error: lineasErr } = await supabase
      .from("compras_facturas_lineas")
      .insert(lineasFc)
    if (lineasErr) {
      // Rollback factura
      await supabase.from("facturas_compra").delete().eq("id", factura.id)
      return NextResponse.json(
        { error: `Error al crear líneas de factura: ${lineasErr.message}` },
        { status: 500 }
      )
    }
  }

  // 7. Generar asiento contable de la factura (circuito)
  const asientoFc = await generarAsientoFacturaCircuito(adminClient, {
    id:               factura.id,
    numero:           numeroFc,
    fecha:            factura.fecha,
    proveedor_nombre: factura.proveedor_nombre,
    sucursal:         oc.sucursal ?? null,
    subtotal,
    impuestos:        0,
    total,
    moneda:           oc.moneda ?? "ARS",
    cotizacion:       Number((oc as any).cotizacion_dia ?? 1) || 1,
  })

  if (!asientoFc.ok) {
    // Rollback: eliminar líneas y factura
    await supabase.from("compras_facturas_lineas").delete().eq("factura_id", factura.id)
    await supabase.from("facturas_compra").delete().eq("id", factura.id)
    return NextResponse.json(
      { error: `Error al generar asiento de factura: ${asientoFc.error}` },
      { status: 500 }
    )
  }

  // Guardar asiento_id en la factura
  await supabase
    .from("facturas_compra")
    .update({ asiento_id: asientoFc.asiento_id })
    .eq("id", factura.id)

  // 8. Generar número de Recepción
  const { data: ultimaRec } = await supabase
    .from("recepciones")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle()
  const matchRec = ultimaRec?.numero?.match(/REC-(\d+)/)
  const siguienteRec = matchRec ? Number(matchRec[1]) + 1 : 1
  const numeroRec = `REC-${String(siguienteRec).padStart(5, "0")}`

  // 9. Crear Recepción en estado esperando_recepcion
  const { data: recepcion, error: recErr } = await supabase
    .from("recepciones")
    .insert({
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
    })
    .select()
    .single()

  if (recErr || !recepcion) {
    // Rollback: factura + asiento
    await generarAsientoReversa(adminClient, asientoFc.asiento_id, "Anulación circuito — fallo al crear recepción")
    await supabase.from("compras_facturas_lineas").delete().eq("factura_id", factura.id)
    await supabase.from("facturas_compra").delete().eq("id", factura.id)
    return NextResponse.json(
      { error: `Error al crear recepción: ${recErr?.message}` },
      { status: 500 }
    )
  }

  // 10. Confirmar la OC → estado confirmada
  const { data: ocActualizada, error: ocUpdErr } = await supabase
    .from("ordenes_compra")
    .update({ estado: "confirmada" })
    .eq("id", id)
    .select()
    .single()

  if (ocUpdErr) {
    // No es crítico para rollback — la OC ya tiene factura y recepción, loguear
    console.error("[circuito] Error actualizando estado OC:", ocUpdErr.message)
  }

  return NextResponse.json({
    oc:        ocActualizada ?? { ...oc, estado: "confirmada" },
    factura:   { ...factura, asiento_id: asientoFc.asiento_id },
    recepcion,
  })
}
