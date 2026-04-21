import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/compras/recepciones/[id]/actualizar-costos
 *
 * Sistema bimontario de "último costo":
 * - Siempre guarda costo_ars y costo_usd en el producto (doble guardado).
 * - costo_contable se expresa en moneda_costo del producto.
 * - La cotización a usar viene del campo tipo_cotizacion de la OC.
 * - Si la recepción es de toma_equipo → skip.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la recepción
  const { data: rec, error: recErr } = await supabase
    .from("recepciones")
    .select("id, numero, fecha, documento_origen_tipo, orden_compra_id, documento_origen_id, items")
    .eq("id", id)
    .single()

  if (recErr || !rec) {
    return NextResponse.json(
      { error: "Recepción no encontrada", detail: recErr?.message },
      { status: 404 }
    )
  }

  // 2. No actualizar si proviene de toma de equipo
  if (rec.documento_origen_tipo === "toma_equipo") {
    return NextResponse.json({ skip: true, reason: "toma_equipo" })
  }

  // 3. Obtener items
  const items: any[] = Array.isArray(rec.items) ? rec.items : []
  if (items.length === 0) {
    return NextResponse.json({ ok: true, actualizados: [] })
  }

  // 4. Filtrar líneas que corresponde actualizar
  const lineasActualizar = items.filter(
    (l: any) => l.nac !== true && (l.cantidad_recibida ?? 0) > 0 && l.producto_id && l.precio_unitario > 0
  )
  if (lineasActualizar.length === 0) {
    return NextResponse.json({ ok: true, actualizados: [], message: "Todas las líneas con NAC o sin cantidad" })
  }

  // 5. Obtener moneda y tipo_cotizacion de la OC vinculada
  const ocId = rec.orden_compra_id ?? rec.documento_origen_id
  let monedaOC = "ARS"
  let tipoCotizacionOC = "oficial"
  if (ocId) {
    const { data: oc } = await adminClient
      .from("ordenes_compra")
      .select("moneda, tipo_cotizacion")
      .eq("id", ocId)
      .maybeSingle()
    monedaOC = oc?.moneda ?? "ARS"
    tipoCotizacionOC = oc?.tipo_cotizacion ?? "oficial"
  }

  // 6. Helper: obtener tasa para una moneda dada, usando el tipo de cotización de la OC
  const fechaRec = (rec.fecha ?? new Date().toISOString()).split("T")[0]
  const tipoCambioCache: Record<string, number> = { ARS: 1 }

  async function getTipoCambio(moneda: string): Promise<number> {
    if (tipoCambioCache[moneda] !== undefined) return tipoCambioCache[moneda]

    const { data: monedaRow } = await adminClient
      .from("contabilidad_monedas")
      .select("id, tipo_cotizacion_defecto")
      .eq("codigo", moneda)
      .maybeSingle()

    if (!monedaRow) { tipoCambioCache[moneda] = 1; return 1 }

    // Para la moneda de la OC usamos su tipo_cotizacion; para otras usamos el default de la moneda
    const tipoAUsar = moneda === monedaOC ? tipoCotizacionOC : (monedaRow.tipo_cotizacion_defecto ?? "oficial")

    const { data: cotRow } = await adminClient
      .from("contabilidad_cotizaciones")
      .select("tasa")
      .eq("moneda_id", monedaRow.id)
      .eq("tipo", tipoAUsar)
      .lte("fecha", fechaRec)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle()

    const tasa = cotRow?.tasa ? Number(cotRow.tasa) : 1
    tipoCambioCache[moneda] = tasa
    return tasa
  }

  // 7. Actualizar productos con doble guardado (costo_ars + costo_usd)
  const actualizados: { producto_id: number; costo_anterior: number | null; costo_nuevo: number; moneda: string; costo_ars: number; costo_usd: number }[] = []
  const errores: string[] = []

  for (const linea of lineasActualizar) {
    const productoId = linea.producto_id
    const precioOC = linea.precio_unitario // en monedaOC

    const { data: prod } = await adminClient
      .from("productos")
      .select("id, costo_contable, moneda_costo, historial_costos")
      .eq("id", productoId)
      .maybeSingle()

    const monedaProducto = prod?.moneda_costo ?? "ARS"

    // Calcular costoARS y costoUSD según monedaOC
    let costoARS: number
    let costoUSD: number

    if (monedaOC === "ARS") {
      costoARS = precioOC
      const tcUSD = await getTipoCambio("USD")
      costoUSD = tcUSD > 0 ? Math.round((precioOC / tcUSD) * 1000000) / 1000000 : 0
    } else if (monedaOC === "USD") {
      costoUSD = precioOC
      const tcUSD = await getTipoCambio("USD")
      costoARS = Math.round(precioOC * tcUSD * 100) / 100
    } else {
      // Otra moneda extranjera: usar ARS como pivote
      const tcOC = await getTipoCambio(monedaOC)
      costoARS = Math.round(precioOC * tcOC * 100) / 100
      const tcUSD = await getTipoCambio("USD")
      costoUSD = tcUSD > 0 ? Math.round((costoARS / tcUSD) * 1000000) / 1000000 : 0
    }

    // costo_contable en la moneda configurada del producto
    const costoNuevo = monedaProducto === "ARS" ? costoARS : costoUSD

    const tipoCambioAplicado = monedaOC !== "ARS" ? (tipoCambioCache[monedaOC] ?? null) : null

    const historialActual: any[] = Array.isArray(prod?.historial_costos) ? prod.historial_costos : []
    const nuevaEntrada = {
      fecha: new Date().toISOString(),
      valor_anterior: prod?.costo_contable ?? 0,
      valor_nuevo: costoNuevo,
      moneda: monedaProducto,
      moneda_origen: monedaOC,
      precio_origen: precioOC,
      tipo_cambio_aplicado: tipoCambioAplicado,
      tipo_cotizacion: tipoCotizacionOC,
      costo_ars: costoARS,
      costo_usd: costoUSD,
      usuario: "sistema",
      origen: "recepcion",
      referencia: rec.numero,
    }

    const { error: updErr } = await adminClient
      .from("productos")
      .update({
        costo_contable: costoNuevo,
        costo_ars: costoARS,
        costo_usd: costoUSD,
        historial_costos: [...historialActual, nuevaEntrada],
      })
      .eq("id", productoId)

    if (updErr) {
      errores.push(`producto_id ${productoId}: ${updErr.message}`)
    } else {
      actualizados.push({
        producto_id: productoId,
        costo_anterior: prod?.costo_contable ?? null,
        costo_nuevo: costoNuevo,
        moneda: monedaProducto,
        costo_ars: costoARS,
        costo_usd: costoUSD,
      })
    }
  }

  if (errores.length > 0 && actualizados.length === 0) {
    return NextResponse.json(
      { ok: false, error: errores.join("; "), actualizados },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    recepcion_id: rec.id,
    recepcion_numero: rec.numero,
    actualizados,
    errores: errores.length > 0 ? errores : undefined,
  })
}


