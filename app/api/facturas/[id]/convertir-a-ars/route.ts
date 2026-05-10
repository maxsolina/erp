import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generarAsientoFacturaVenta, generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  // 1. Leer factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas")
    .select("id, numero, estado, moneda, tipo_cotizacion, cotizacion, subtotal, descuento, total, saldo, asiento_id, fecha, sucursal, cliente_id, cliente_nombre")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }
  if (factura.estado !== "abierta" && factura.estado !== "borrador") {
    return NextResponse.json({ error: `Solo se pueden convertir facturas en estado "abierta" o "borrador" (estado actual: "${factura.estado}")` }, { status: 422 })
  }
  if (factura.moneda === "ARS") {
    return NextResponse.json({ error: "La factura ya está en ARS" }, { status: 422 })
  }
  const cot = Number(factura.cotizacion ?? 0)
  if (!(cot > 0)) {
    return NextResponse.json({ error: "La factura no tiene una cotización válida cargada. Editá la factura y completá la cotización antes de convertir." }, { status: 422 })
  }

  // 2. Leer líneas para convertir importes
  const { data: lineas, error: linErr } = await supabase
    .from("facturas_lineas")
    .select("id, cantidad, precio_unitario, descuento, subtotal")
    .eq("factura_id", factura.id)

  if (linErr) return NextResponse.json({ error: linErr.message }, { status: 500 })

  // 3. Calcular valores convertidos
  const monedaOriginal = factura.moneda
  const cotizacionUsada = cot
  const subtotalArs = round2(Number(factura.subtotal ?? 0) * cot)
  const descuentoArs = round2(Number(factura.descuento ?? 0) * cot)
  const totalArs    = round2(Number(factura.total ?? 0) * cot)
  const saldoArs    = round2(Number(factura.saldo ?? 0) * cot)

  // 4. Revertir asiento "negro" original (en USD)
  if (factura.asiento_id) {
    const r = await generarAsientoReversa(
      supabase,
      factura.asiento_id,
      `Conversión a ARS factura ${factura.numero} (revierte asiento ${monedaOriginal})`
    )
    if (!r.ok) {
      return NextResponse.json({ error: `No se pudo revertir el asiento original: ${r.error}` }, { status: 500 })
    }
  }

  // 5. Actualizar líneas (cada precio_unitario y subtotal por cotización)
  if (lineas && lineas.length > 0) {
    for (const l of lineas) {
      const { error } = await supabase
        .from("facturas_lineas")
        .update({
          precio_unitario: round2(Number(l.precio_unitario ?? 0) * cot),
          subtotal:        round2(Number(l.subtotal ?? 0) * cot),
        })
        .eq("id", l.id)
      if (error) {
        return NextResponse.json({ error: `Error al convertir líneas: ${error.message}` }, { status: 500 })
      }
    }
  }

  // 6. Actualizar factura: moneda, totales convertidos, asiento_id=null
  //    Conservamos cotizacion + tipo_cotizacion como referencia histórica.
  const { error: updErr } = await supabase
    .from("facturas")
    .update({
      moneda:    "ARS",
      subtotal:  subtotalArs,
      descuento: descuentoArs,
      total:     totalArs,
      saldo:     saldoArs,
      asiento_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", factura.id)

  if (updErr) {
    return NextResponse.json({ error: `Error al actualizar la factura: ${updErr.message}` }, { status: 500 })
  }

  // Calcular subtotal de servicios desde las líneas (ya convertidas a ARS).
  // Necesario para que el factory partía el HABER entre Ventas Mercadería
  // e Ingresos por Servicios.
  let subtotalServicios = 0
  if (lineas && lineas.length > 0) {
    const productoIdsLineas = lineas.map(l => l.producto_id).filter(id => id != null)
    if (productoIdsLineas.length > 0) {
      const { data: prods } = await supabase
        .from("productos")
        .select("id, tipo")
        .in("id", productoIdsLineas)
      const tipoPorId: Record<string, string> = {}
      for (const p of prods ?? []) tipoPorId[String(p.id)] = String(p.tipo ?? "almacenable")
      for (const l of lineas) {
        if (l.producto_id != null && tipoPorId[String(l.producto_id)] === "servicio") {
          // El subtotal en lineas[] todavía es en moneda original; lo convertimos.
          subtotalServicios += round2(Number(l.subtotal ?? 0) * cot)
        }
      }
    }
  }

  // 7. Generar nuevo asiento "negro" en ARS
  const asientoResult = await generarAsientoFacturaVenta(supabase, {
    id:             factura.id,
    numero:         factura.numero,
    fecha:          (factura.fecha as string).split("T")[0],
    cliente_id:     factura.cliente_id != null ? String(factura.cliente_id) : null,
    cliente_nombre: factura.cliente_nombre,
    sucursal:       factura.sucursal,
    subtotal:       subtotalArs,
    impuestos:      0,
    total:          totalArs,
    moneda:         "ARS",
    subtotal_servicios: subtotalServicios,
  })

  if (!asientoResult.ok) {
    return NextResponse.json({
      error: `Factura convertida a ARS pero falló el nuevo asiento: ${asientoResult.error}`,
      _factura_actualizada: true,
    }, { status: 500 })
  }

  // 8. Vincular nuevo asiento_id
  await supabase
    .from("facturas")
    .update({ asiento_id: asientoResult.asiento_id })
    .eq("id", factura.id)

  return NextResponse.json({
    ok: true,
    factura_id: factura.id,
    moneda_original: monedaOriginal,
    cotizacion_aplicada: cotizacionUsada,
    subtotal_ars: subtotalArs,
    total_ars: totalArs,
    asiento_id: asientoResult.asiento_id,
  })
}
