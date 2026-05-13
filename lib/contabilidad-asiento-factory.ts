// ============================================================================
// contabilidad-asiento-factory.ts
// Genera asientos contables automáticos desde comprobantes de negocio.
// Regla: si falla la generación del asiento, la operación debe revertirse.
// Las cuentas contables salen SIEMPRE de contabilidad_mapeo_cuentas.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js"

export type ResultadoAsiento =
  | { ok: true; asiento_id: string }
  | { ok: false; error: string }

// ─── Factura de Venta ────────────────────────────────────────────────────────
// Si la factura es en moneda extranjera (USD), `cotizacion` debe venir con el
// TC aplicado para convertir subtotal/impuestos/total a ARS. Las columnas
// `debe`/`haber` siempre se persisten en ARS (moneda base), y el importe
// original (USD) queda en `importe_moneda_original` por línea + el TC en
// `cotizacion_aplicada` del header.
export async function generarAsientoFacturaVenta(
  supabase: SupabaseClient,
  factura: {
    id: number | string
    numero: string
    fecha: string
    cliente_id?: string | null
    cliente_nombre?: string | null
    cliente_categoria_id?: number | null
    sucursal?: string | null
    subtotal: number
    impuestos: number
    total: number
    moneda?: string
    cotizacion?: number | null
    /**
     * Subtotal correspondiente a líneas de productos tipo "servicio" (mano
     * de obra, instalación, reparación). Si > 0, ese monto se asienta en
     * "Ingresos por Servicios" en lugar de "Ventas Mercadería" — el HABER
     * queda partido en dos cuentas. El resto (subtotal - subtotal_servicios)
     * va a Ventas Mercadería como hasta ahora. Por defecto 0 para mantener
     * compatibilidad con todos los callers existentes.
     */
    subtotal_servicios?: number
  }
): Promise<ResultadoAsiento> {

  // 1. Mapeo de cuentas desde configuración (nunca hardcodeado)
  const { data: mapeo, error: mapeoErr } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo,
      diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "factura_venta")
    .eq("activo", true)

  if (mapeoErr) {
    return { ok: false, error: `Error al leer mapeo contable: ${mapeoErr.message}` }
  }
  if (!mapeo || mapeo.length === 0) {
    return {
      ok: false,
      error: "Sin mapeo contable para factura_venta. Ejecute el script 015_seed_mapeo_cuentas.sql.",
    }
  }

  const pm = Object.fromEntries(mapeo.map((r: any) => [r.subtipo, r]))
  let cDeudores = pm["deudores"]?.cuenta_debe as { id: string; codigo: string; nombre: string } | null
  const cVentas   = pm["ventas"]?.cuenta_haber   as { id: string; codigo: string; nombre: string } | null
  const cIVA      = pm["iva_debito"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null
  // Cuenta de servicios (subtipo nuevo, agregado por script 107). Puede no
  // existir en bases viejas; si la factura no tiene servicios no importa,
  // y si los tiene devolvemos un error claro pidiendo correr la migración.
  const cIngresosServicios = pm["ingresos_servicios"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null

  // 1b. Si la categoría del cliente tiene cuenta_cobrar_id configurada, usarla en lugar del mapeo global
  if (factura.cliente_categoria_id) {
    const { data: cat } = await supabase
      .from("categorias_proveedor")
      .select("cuenta_cobrar_id")
      .eq("id", factura.cliente_categoria_id)
      .maybeSingle()

    if (cat?.cuenta_cobrar_id) {
      const { data: cuentaRow } = await supabase
        .from("contabilidad_plan_cuentas")
        .select("id, codigo, nombre")
        .eq("id", cat.cuenta_cobrar_id)
        .maybeSingle()
      if (cuentaRow?.id) {
        cDeudores = { id: cuentaRow.id, codigo: cuentaRow.codigo, nombre: cuentaRow.nombre }
      }
    }
  }

  if (!cDeudores) return { ok: false, error: "Mapeo incompleto: falta cuenta 'deudores' (cuenta_debe) para factura_venta." }
  if (!cVentas)   return { ok: false, error: "Mapeo incompleto: falta cuenta 'ventas' (cuenta_haber) para factura_venta." }

  const diario_id: string = pm["deudores"]?.diario_id ?? pm["ventas"]?.diario_id
  if (!diario_id) return { ok: false, error: "Mapeo incompleto: falta diario_id para factura_venta." }

  // 2. Período contable activo (puede ser null si no hay períodos aún)
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: factura.fecha.split("T")[0] })

  // 3. Sucursal → id numérico
  let sucursal_id: number | null = null
  if (factura.sucursal) {
    const { data: suc } = await supabase
      .from("sucursales")
      .select("id")
      .eq("nombre", factura.sucursal)
      .maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 4. Construir líneas
  const fechaDate = factura.fecha.split("T")[0]
  const tieneIVA  = factura.impuestos > 0.009 && cIVA != null

  // Conversión a ARS si la factura está en moneda extranjera.
  const monedaFac = factura.moneda ?? "ARS"
  const esExtranjera = monedaFac !== "ARS" && (factura.cotizacion ?? 0) > 0
  const tc = esExtranjera ? Number(factura.cotizacion) : 1
  const toARS = (n: number) => Math.round(Number(n ?? 0) * tc * 100) / 100

  // Split productos vs servicios. Si la factura tiene parte de servicios,
  // ese tramo del HABER va a "Ingresos por Servicios" en lugar de "Ventas
  // Mercadería". El IVA y los Deudores se mantienen como una sola línea
  // (no se desdobla por moneda contable; los servicios pagan el mismo IVA).
  const subtotalServicios = Math.max(0, Number(factura.subtotal_servicios ?? 0))
  const subtotalProductos = Math.max(0, Number(factura.subtotal) - subtotalServicios)
  const tieneServicios    = subtotalServicios > 0.009
  const tieneProductos    = subtotalProductos > 0.009

  if (tieneServicios && !cIngresosServicios) {
    return {
      ok: false,
      error: "Sin mapeo contable para servicios. Ejecute el script 107_productos_servicios.sql.",
    }
  }

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }

  const lineas: Linea[] = [
    // DEBE: Deudores por Ventas = total de la factura (en ARS)
    {
      cuenta_id: cDeudores.id,
      cuenta_codigo: cDeudores.codigo,
      cuenta_nombre: cDeudores.nombre,
      debe: toARS(factura.total),
      haber: 0,
      descripcion: factura.cliente_nombre ?? null,
      orden: 0,
      importe_moneda_original: esExtranjera ? Number(factura.total) : null,
    },
  ]

  let orden = 1
  if (tieneIVA) {
    if (tieneProductos) {
      lineas.push({
        cuenta_id: cVentas.id,
        cuenta_codigo: cVentas.codigo,
        cuenta_nombre: cVentas.nombre,
        debe: 0,
        haber: toARS(subtotalProductos),
        descripcion: factura.numero,
        orden: orden++,
        importe_moneda_original: esExtranjera ? subtotalProductos : null,
      })
    }
    if (tieneServicios) {
      lineas.push({
        cuenta_id: cIngresosServicios!.id,
        cuenta_codigo: cIngresosServicios!.codigo,
        cuenta_nombre: cIngresosServicios!.nombre,
        debe: 0,
        haber: toARS(subtotalServicios),
        descripcion: factura.numero,
        orden: orden++,
        importe_moneda_original: esExtranjera ? subtotalServicios : null,
      })
    }
    // HABER: IVA Débito Fiscal = impuestos (en ARS), en una sola línea.
    lineas.push({
      cuenta_id: cIVA!.id,
      cuenta_codigo: cIVA!.codigo,
      cuenta_nombre: cIVA!.nombre,
      debe: 0,
      haber: toARS(factura.impuestos),
      descripcion: factura.numero,
      orden: orden++,
      importe_moneda_original: esExtranjera ? Number(factura.impuestos) : null,
    })
  } else {
    // Sin IVA separado: el "total" es lo que se imputa a HABER, dividido
    // proporcionalmente al split de subtotal entre productos y servicios.
    if (tieneProductos) {
      // Si solo hay productos, la línea es directamente el total.
      // Si hay mix, usamos subtotalProductos (más fielmente representa el monto).
      const haber = tieneServicios ? subtotalProductos : Number(factura.total)
      lineas.push({
        cuenta_id: cVentas.id,
        cuenta_codigo: cVentas.codigo,
        cuenta_nombre: cVentas.nombre,
        debe: 0,
        haber: toARS(haber),
        descripcion: factura.numero,
        orden: orden++,
        importe_moneda_original: esExtranjera ? haber : null,
      })
    }
    if (tieneServicios) {
      const haber = tieneProductos ? subtotalServicios : Number(factura.total)
      lineas.push({
        cuenta_id: cIngresosServicios!.id,
        cuenta_codigo: cIngresosServicios!.codigo,
        cuenta_nombre: cIngresosServicios!.nombre,
        debe: 0,
        haber: toARS(haber),
        descripcion: factura.numero,
        orden: orden++,
        importe_moneda_original: esExtranjera ? haber : null,
      })
    }
  }

  // 5. Validar partida doble
  const sumaDebe  = lineas.reduce((s, l) => s + l.debe,  0)
  const sumaHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return {
      ok: false,
      error: `Partida doble inválida: DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}`,
    }
  }

  // 6. Número correlativo por diario + año
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  // 7. Insertar asiento (estado publicado directamente — es automático)
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:               numero ?? null,
      diario_id,
      periodo_id:           periodo_id ?? null,
      fecha:                fechaDate,
      sucursal_id,
      concepto:             `Factura ${factura.numero}`,
      referencia:           factura.numero,
      comprobante_tipo:     "factura",
      moneda_original:      monedaFac,
      cotizacion_aplicada:  esExtranjera ? tc : null,
      es_manual:            false,
      estado:               "publicado",
    })
    .select("id")
    .single()

  if (asientoErr) {
    return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }
  }

  // 8. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))

  if (lineasErr) {
    // Rollback del asiento huérfano
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Factura de Venta — Asiento IVA diferido + Recargo TC ────────────────────
// Se genera al CONFIRMAR la factura, una vez que el operador eligió los medios
// de pago. Solo registra lo "extra" que paga el cliente al elegir tarjeta/transf:
//
//   DEBE   Deudores             [iva_total + recargo_total]
//   HABER  IVA Débito Fiscal    [iva_total]
//   HABER  Ventas Mercadería (Recargo TC) [recargo_total]
//
// Si iva_total y recargo_total son ambos 0 (cobro 100% efectivo), no se genera
// asiento y se devuelve { ok: true, asiento_id: null } como señal de "no aplica".
export async function generarAsientoIVADiferido(
  supabase: SupabaseClient,
  factura: {
    id: number | string
    numero: string
    fecha: string
    cliente_id?: string | null
    cliente_nombre?: string | null
    cliente_categoria_id?: number | null
    sucursal?: string | null
    moneda?: string
    cotizacion?: number | null  // requerida si moneda !== "ARS"
    iva_total: number       // suma de IVA proporcional sobre parte facturable (en moneda factura)
    recargo_total: number   // suma de recargos de tarjeta cobrados al cliente (en moneda factura)
  }
): Promise<{ ok: true; asiento_id: string | null } | { ok: false; error: string }> {

  // Si no hay IVA ni recargo, no hace falta asiento (cobro 100% efectivo)
  if (factura.iva_total <= 0.009 && factura.recargo_total <= 0.009) {
    return { ok: true, asiento_id: null }
  }

  // 1. Mapeo de cuentas
  const { data: mapeo, error: mapeoErr } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo,
      diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "factura_venta")
    .eq("activo", true)
    .in("subtipo", ["deudores", "iva_diferido", "recargo_tc"])

  if (mapeoErr) return { ok: false, error: `Error al leer mapeo contable: ${mapeoErr.message}` }
  if (!mapeo || mapeo.length === 0) {
    return { ok: false, error: "Sin mapeo contable para factura_venta. Ejecute 081_seed_mapeo_iva_diferido.sql." }
  }

  const pm = Object.fromEntries(mapeo.map((r: any) => [r.subtipo, r]))
  let cDeudores = pm["deudores"]?.cuenta_debe as { id: string; codigo: string; nombre: string } | null
  const cIVA       = pm["iva_diferido"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null
  const cRecargoTC = pm["recargo_tc"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null

  // Si la categoría del cliente tiene cuenta_cobrar_id, sobreescribir deudores
  if (factura.cliente_categoria_id) {
    const { data: cat } = await supabase
      .from("categorias_proveedor")
      .select("cuenta_cobrar_id")
      .eq("id", factura.cliente_categoria_id)
      .maybeSingle()

    if (cat?.cuenta_cobrar_id) {
      const { data: cuentaRow } = await supabase
        .from("contabilidad_plan_cuentas")
        .select("id, codigo, nombre")
        .eq("id", cat.cuenta_cobrar_id)
        .maybeSingle()
      if (cuentaRow?.id) {
        cDeudores = { id: cuentaRow.id, codigo: cuentaRow.codigo, nombre: cuentaRow.nombre }
      }
    }
  }

  if (!cDeudores) return { ok: false, error: "Mapeo incompleto: falta 'deudores' para factura_venta." }
  if (factura.iva_total > 0.009 && !cIVA) {
    return { ok: false, error: "Mapeo incompleto: falta 'iva_diferido' para factura_venta. Ejecute 081_seed_mapeo_iva_diferido.sql." }
  }
  if (factura.recargo_total > 0.009 && !cRecargoTC) {
    return { ok: false, error: "Mapeo incompleto: falta 'recargo_tc' para factura_venta. Ejecute 081_seed_mapeo_iva_diferido.sql." }
  }

  const diario_id: string = pm["deudores"]?.diario_id ?? pm["iva_diferido"]?.diario_id ?? pm["recargo_tc"]?.diario_id
  if (!diario_id) return { ok: false, error: "Mapeo incompleto: falta diario_id." }

  // 2. Período + sucursal
  const fechaDate = factura.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  let sucursal_id: number | null = null
  if (factura.sucursal) {
    const { data: suc } = await supabase
      .from("sucursales").select("id").eq("nombre", factura.sucursal).maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 3. Construir líneas
  // Conversión a ARS si la factura está en moneda extranjera.
  const monedaFac = factura.moneda ?? "ARS"
  const esExtranjera = monedaFac !== "ARS" && (factura.cotizacion ?? 0) > 0
  const tc = esExtranjera ? Number(factura.cotizacion) : 1
  const toARS = (n: number) => Math.round(Number(n ?? 0) * tc * 100) / 100

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }

  const totalDebeOriginal = Math.round((factura.iva_total + factura.recargo_total) * 100) / 100
  const totalDebeARS = toARS(totalDebeOriginal)
  const lineas: Linea[] = [
    {
      cuenta_id: cDeudores.id,
      cuenta_codigo: cDeudores.codigo,
      cuenta_nombre: cDeudores.nombre,
      debe: totalDebeARS,
      haber: 0,
      descripcion: factura.cliente_nombre ?? null,
      orden: 0,
      importe_moneda_original: esExtranjera ? totalDebeOriginal : null,
    },
  ]

  if (factura.iva_total > 0.009 && cIVA) {
    const ivaOriginal = Math.round(factura.iva_total * 100) / 100
    lineas.push({
      cuenta_id: cIVA.id,
      cuenta_codigo: cIVA.codigo,
      cuenta_nombre: cIVA.nombre,
      debe: 0,
      haber: toARS(ivaOriginal),
      descripcion: factura.numero,
      orden: 1,
      importe_moneda_original: esExtranjera ? ivaOriginal : null,
    })
  }

  if (factura.recargo_total > 0.009 && cRecargoTC) {
    const recOriginal = Math.round(factura.recargo_total * 100) / 100
    lineas.push({
      cuenta_id: cRecargoTC.id,
      cuenta_codigo: cRecargoTC.codigo,
      cuenta_nombre: cRecargoTC.nombre,
      debe: 0,
      haber: toARS(recOriginal),
      descripcion: factura.numero,
      orden: 2,
      importe_moneda_original: esExtranjera ? recOriginal : null,
    })
  }

  // 4. Validar partida doble
  const sumaDebe  = lineas.reduce((s, l) => s + l.debe,  0)
  const sumaHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return { ok: false, error: `Partida doble inválida (IVA diferido): DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}` }
  }

  // 5. Número correlativo
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  // 6. Insertar asiento
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:               numero ?? null,
      diario_id,
      periodo_id:           periodo_id ?? null,
      fecha:                fechaDate,
      sucursal_id,
      concepto:             `Factura ${factura.numero} — IVA + Recargo TC`,
      referencia:           factura.numero,
      comprobante_tipo:     "factura_iva_diferido",
      moneda_original:      monedaFac,
      cotizacion_aplicada:  esExtranjera ? tc : null,
      es_manual:            false,
      estado:               "publicado",
    })
    .select("id")
    .single()

  if (asientoErr) return { ok: false, error: `Error al crear asiento de IVA: ${asientoErr.message}` }

  // 7. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))

  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento de IVA: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Factura de Compra ───────────────────────────────────────────────────────
export async function generarAsientoFacturaCompra(
  supabase: SupabaseClient,
  factura: {
    id: number | string
    numero: string
    fecha: string
    proveedor_id?: string | number | null
    proveedor_nombre?: string | null
    proveedor_categoria_id?: string | number | null
    sucursal?: string | null
    subtotal: number
    impuestos: number
    total: number
    moneda?: string
    /** Cotización de la moneda a ARS (ej: 1200 significa 1 USD = 1200 ARS).
     *  Obligatorio cuando moneda != 'ARS'. Si se omite, se usa 1 (sin conversión). */
    cotizacion?: number | null
    /** Líneas de detalle de la factura (cuenta contable + importe por línea).
     *  Si se proveen, el asiento DEBE se construye cuenta a cuenta desde aquí.
     *  Si están vacías o no se proveen, se usa la cuenta genérica de mapeo. */
    lineas_detalle?: {
      cuenta_id: string | null
      cuenta_codigo: string
      cuenta_nombre: string
      subtotal: number  // importe de esta línea (sin IVA, en moneda original)
    }[]
    /** Impuestos detallados (IVA manual, etc.) */
    impuestos_detalle?: {
      nombre: string
      importe: number  // en moneda original
      cuenta_id?: string | null
    }[]
  }
): Promise<ResultadoAsiento> {

  // Tasa de conversión: si la factura es en moneda extranjera, multiplicar por cotizacion
  const tc = (factura.moneda && factura.moneda !== "ARS" && (factura.cotizacion ?? 0) > 0)
    ? Number(factura.cotizacion)
    : 1
  const conv = (v: number) => Math.round(v * tc * 100) / 100

  // 0. Idempotencia — solo matchea asientos publicados; los cancelados/revertidos permiten re-creación
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "factura_compra")
    .eq("referencia", factura.numero)
    .eq("estado", "publicado")
    .maybeSingle()

  if (existente?.id) return { ok: true, asiento_id: existente.id }

  // 1. Mapeo de cuentas desde configuración
  const { data: mapeo, error: mapeoErr } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo,
      diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "factura_compra")
    .eq("activo", true)

  if (mapeoErr) {
    return { ok: false, error: `Error al leer mapeo contable: ${mapeoErr.message}` }
  }
  if (!mapeo || mapeo.length === 0) {
    return {
      ok: false,
      error: "Sin mapeo contable para factura_compra. Ejecute el script 022_seed_mapeo_facturas_compra.sql.",
    }
  }

  const pm = Object.fromEntries(mapeo.map((r: any) => [r.subtipo, r]))
  let cAcreedores = pm["acreedores"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null
  const cCompras   = pm["compras"]?.cuenta_debe   as { id: string; codigo: string; nombre: string } | null
  const cIVA       = pm["iva_credito"]?.cuenta_debe as { id: string; codigo: string; nombre: string } | null

  // 1b. Si la categoría del proveedor tiene cuenta_pagar_id, sobreescribir la cuenta de acreedores
  if (factura.proveedor_categoria_id) {
    const { data: cat } = await supabase
      .from("categorias_proveedor")
      .select("nombre, cuenta_pagar_id")
      .eq("id", factura.proveedor_categoria_id)
      .maybeSingle()

    if (!cat?.cuenta_pagar_id) {
      const nombreCat = cat?.nombre ?? `ID ${factura.proveedor_categoria_id}`
      return {
        ok: false,
        error: `La categoría de proveedor "${nombreCat}" no tiene cuenta contable a pagar configurada. Configúrela en Compras → Config → Categorías de Proveedores antes de publicar.`,
      }
    } else {
      // Buscar los datos de la cuenta explícitamente
      const { data: cuentaRow } = await supabase
        .from("contabilidad_plan_cuentas")
        .select("id, codigo, nombre")
        .eq("id", cat.cuenta_pagar_id)
        .maybeSingle()

      if (cuentaRow?.id) {
        cAcreedores = { id: cuentaRow.id, codigo: cuentaRow.codigo, nombre: cuentaRow.nombre }
      } else {
        return { ok: false, error: `La cuenta contable configurada en la categoría "${cat.nombre}" no existe en el plan de cuentas.` }
      }
    }
  }

  if (!cAcreedores) return { ok: false, error: "Mapeo incompleto: falta cuenta 'acreedores' (cuenta_haber) para factura_compra." }
  // cCompras solo es obligatorio si no hay líneas de detalle
  if (!cCompras && !(factura.lineas_detalle?.length)) return { ok: false, error: "Mapeo incompleto: falta cuenta 'compras' (cuenta_debe) para factura_compra." }

  const diario_id: string = pm["acreedores"]?.diario_id ?? pm["compras"]?.diario_id
  if (!diario_id) return { ok: false, error: "Mapeo incompleto: falta diario_id para factura_compra." }

  // 2. Período contable
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: factura.fecha.split("T")[0] })

  // 3. Sucursal
  let sucursal_id: number | null = null
  if (factura.sucursal) {
    const { data: suc } = await supabase
      .from("sucursales")
      .select("id")
      .eq("nombre", factura.sucursal)
      .maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 4. Construir líneas del asiento
  const fechaDate = factura.fecha.split("T")[0]

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }

  const lineas: Linea[] = []
  const hayLineasDetalle = (factura.lineas_detalle?.length ?? 0) > 0

  if (hayLineasDetalle) {
    // ── Modo dinámico: una línea DEBE por cada línea de la factura (convertida a ARS) ──
    for (const [i, ld] of (factura.lineas_detalle ?? []).entries()) {
      if (ld.subtotal === 0) continue
      const cuentaId   = ld.cuenta_id   ?? cCompras?.id
      const cuentaCod  = ld.cuenta_id   ? ld.cuenta_codigo : (cCompras?.codigo ?? "")
      const cuentaNom  = ld.cuenta_id   ? ld.cuenta_nombre : (cCompras?.nombre ?? "")
      if (!cuentaId) continue
      lineas.push({
        cuenta_id:    cuentaId,
        cuenta_codigo: cuentaCod,
        cuenta_nombre: cuentaNom,
        debe:          conv(ld.subtotal),
        haber:         0,
        descripcion:   factura.numero,
        orden:         i,
      })
    }

    // Impuestos detallados (sección manual de IVA)
    const hayImpuestosDetalle = (factura.impuestos_detalle?.length ?? 0) > 0
    if (hayImpuestosDetalle) {
      for (const [j, imp] of (factura.impuestos_detalle ?? []).entries()) {
        if (imp.importe === 0) continue
        const cuentaId  = imp.cuenta_id ?? cIVA?.id
        const cuentaCod = imp.cuenta_id ? "" : (cIVA?.codigo ?? "")
        const cuentaNom = imp.cuenta_id ? imp.nombre : (cIVA?.nombre ?? imp.nombre)
        if (!cuentaId) continue
        lineas.push({
          cuenta_id:    cuentaId,
          cuenta_codigo: cuentaCod,
          cuenta_nombre: cuentaNom,
          debe:          conv(imp.importe),
          haber:         0,
          descripcion:   imp.nombre,
          orden:         lineas.length + j,
        })
      }
    } else if (factura.impuestos > 0.009 && cIVA) {
      // Fallback: impuesto como total único con cuenta IVA del mapeo
      lineas.push({
        cuenta_id:    cIVA.id,
        cuenta_codigo: cIVA.codigo,
        cuenta_nombre: cIVA.nombre,
        debe:          conv(factura.impuestos),
        haber:         0,
        descripcion:   factura.numero,
        orden:         lineas.length,
      })
    }
  } else {
    // ── Modo genérico (fallback): usa cuenta 'compras' del mapeo ──
    if (!cCompras) return { ok: false, error: "Mapeo incompleto: falta cuenta 'compras' (cuenta_debe) para factura_compra." }
    const tieneIVA = factura.impuestos > 0.009 && cIVA != null
    if (tieneIVA) {
      lineas.push(
        { cuenta_id: cCompras.id, cuenta_codigo: cCompras.codigo, cuenta_nombre: cCompras.nombre, debe: conv(factura.subtotal), haber: 0, descripcion: factura.numero, orden: 0 },
        { cuenta_id: cIVA!.id,    cuenta_codigo: cIVA!.codigo,    cuenta_nombre: cIVA!.nombre,    debe: conv(factura.impuestos), haber: 0, descripcion: factura.numero, orden: 1 }
      )
    } else {
      lineas.push(
        { cuenta_id: cCompras.id, cuenta_codigo: cCompras.codigo, cuenta_nombre: cCompras.nombre, debe: conv(factura.total), haber: 0, descripcion: factura.numero, orden: 0 }
      )
    }
  }

  // HABER: cuenta del proveedor = total convertido a ARS
  lineas.push({
    cuenta_id:    cAcreedores.id,
    cuenta_codigo: cAcreedores.codigo,
    cuenta_nombre: cAcreedores.nombre,
    debe:          0,
    haber:         conv(factura.total),
    descripcion:   factura.proveedor_nombre ?? null,
    orden:         lineas.length,
  })

  // 5. Validar partida doble
  const sumaDebe  = lineas.reduce((s, l) => s + l.debe,  0)
  const sumaHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return {
      ok: false,
      error: `Partida doble inválida: DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}`,
    }
  }

  // 6. Número correlativo
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  // 7. Insertar asiento
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:            numero ?? null,
      diario_id,
      periodo_id:        periodo_id ?? null,
      fecha:             fechaDate,
      sucursal_id,
      concepto:          `Factura Compra ${factura.numero}`,
      referencia:        factura.numero,
      comprobante_tipo:  "factura_compra",
      moneda_original:   factura.moneda ?? "ARS",
      cotizacion_aplicada: tc !== 1 ? tc : null,
      es_manual:         false,
      estado:            "publicado",
    })
    .select("id")
    .single()

  if (asientoErr) {
    return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }
  }

  // 8. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))

  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Orden de Pago a Proveedor ───────────────────────────────────────────────
// Genera el asiento al confirmar una OP (pago a proveedor):
//   DEBE   21010101  Proveedores / Acreedores  [total en ARS, por categoría]
//   HABER  1101xxxx  Caja / Banco              [por cada medio de pago]
export async function generarAsientoOrdenPago(
  supabase: SupabaseClient,
  op: {
    id: string | number
    numero: string
    fecha: string
    caja_id: string
    proveedor_id?: number | string | null
    proveedor_nombre?: string | null
    proveedor_categoria_id?: number | string | null
    sucursal_id?: number | null
    importe: number
    moneda?: string
    cotizacion?: number | null
  }
): Promise<ResultadoAsiento> {

  // 0. Idempotencia
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "orden_pago")
    .eq("referencia", op.numero)
    .eq("estado", "publicado")
    .maybeSingle()
  if (existente?.id) return { ok: true, asiento_id: existente.id }

  // 1. Medios de pago de la OP
  const { data: medios, error: mediosErr } = await supabase
    .from("compras_op_medios_pago")
    .select("id, forma_pago_id, forma_pago_nombre, importe, importe_comp, moneda")
    .eq("op_id", String(op.id))
  if (mediosErr) return { ok: false, error: `Error al leer medios de pago: ${mediosErr.message}` }
  if (!medios || medios.length === 0) return { ok: false, error: "La OP no tiene medios de pago registrados." }

  // 2. Cuentas contables de cada caja_valor
  const valorIds = [...new Set(medios.map((m: any) => m.forma_pago_id).filter(Boolean))]
  const cuentasPorValor: Record<string, { id: string; codigo: string; nombre: string } | null> = {}
  if (valorIds.length > 0) {
    const { data: valores } = await supabase
      .from("caja_valores")
      .select("id, cuenta_contable_id, contabilidad_plan_cuentas:cuenta_contable_id(id, codigo, nombre)")
      .in("id", valorIds)
    for (const v of valores ?? []) {
      cuentasPorValor[v.id] = (v as any).contabilidad_plan_cuentas ?? null
    }
  }
  // Fallback: resolver por nombre dentro de la caja
  const mediosSinId = (medios as any[]).filter(m => !m.forma_pago_id && m.forma_pago_nombre)
  if (mediosSinId.length > 0) {
    const nombres = [...new Set(mediosSinId.map((m: any) => m.forma_pago_nombre).filter(Boolean))]
    if (nombres.length > 0) {
      const { data: porNombre } = await supabase
        .from("caja_valores")
        .select("id, nombre, cuenta_contable_id, contabilidad_plan_cuentas:cuenta_contable_id(id, codigo, nombre)")
        .eq("caja_id", op.caja_id)
        .in("nombre", nombres)
      for (const v of porNombre ?? []) {
        cuentasPorValor[`nombre:${v.nombre}`] = (v as any).contabilidad_plan_cuentas ?? null
      }
    }
  }

  // 3. Cuenta de Proveedores: desde categoría del proveedor o mapeo global
  let cAcreedores: { id: string; codigo: string; nombre: string } | null = null
  if (op.proveedor_categoria_id) {
    const { data: cat } = await supabase
      .from("categorias_proveedor")
      .select("cuenta_pagar_id")
      .eq("id", op.proveedor_categoria_id)
      .maybeSingle()
    if (cat?.cuenta_pagar_id) {
      const { data: cuentaRow } = await supabase
        .from("contabilidad_plan_cuentas")
        .select("id, codigo, nombre")
        .eq("id", cat.cuenta_pagar_id)
        .maybeSingle()
      if (cuentaRow?.id) cAcreedores = { id: cuentaRow.id, codigo: cuentaRow.codigo, nombre: cuentaRow.nombre }
    }
  }
  if (!cAcreedores) {
    // Fallback: mapeo global factura_compra.acreedores
    const { data: mapeo } = await supabase
      .from("contabilidad_mapeo_cuentas")
      .select("cuenta_haber:cuenta_haber_id(id, codigo, nombre)")
      .eq("tipo_origen", "factura_compra")
      .eq("subtipo", "acreedores")
      .eq("activo", true)
      .maybeSingle()
    cAcreedores = (mapeo as any)?.cuenta_haber ?? null
  }
  if (!cAcreedores) return { ok: false, error: "Sin cuenta Proveedores configurada. Ejecute 022_seed_mapeo_facturas_compra.sql o configure la categoría del proveedor." }

  // 4. Diario — el de la caja de la OP
  const { data: diario } = await supabase
    .from("contabilidad_diarios")
    .select("id")
    .eq("caja_id", op.caja_id)
    .limit(1)
    .maybeSingle()
  if (!diario?.id) return { ok: false, error: `Sin diario contable para la caja ${op.caja_id}. Ejecute 014_diarios_dinamicos.sql.` }

  // 5. Período y sucursal
  const fechaDate = op.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  let sucursal_id: number | null = op.sucursal_id ?? null
  if (!sucursal_id) {
    const { data: caja } = await supabase.from("cajas").select("sucursal").eq("id", op.caja_id).maybeSingle()
    if (caja?.sucursal) {
      const { data: suc } = await supabase.from("sucursales").select("id").eq("nombre", caja.sucursal).maybeSingle()
      sucursal_id = suc?.id ?? null
    }
  }

  // 6. Construir líneas
  const tc = (op.moneda && op.moneda !== "ARS" && (op.cotizacion ?? 0) > 0) ? Number(op.cotizacion) : 1
  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  const lineas: Linea[] = []
  let orden = 0
  let totalHaberARS = 0
  let cotizacionAsiento: number | null = null

  for (const medio of medios as any[]) {
    let cMedio: { id: string; codigo: string; nombre: string } | null = null
    if (medio.forma_pago_id) {
      cMedio = cuentasPorValor[medio.forma_pago_id] ?? null
    } else if (medio.forma_pago_nombre) {
      cMedio = cuentasPorValor[`nombre:${medio.forma_pago_nombre}`] ?? null
    }
    if (!cMedio?.id) {
      const nombre = medio.forma_pago_nombre
      if (nombre && nombre !== "null") {
        return { ok: false, error: `El medio de pago "${nombre}" no tiene cuenta contable asignada. Configure la cuenta en Configuración → Cajas.` }
      }
      continue
    }
    const esExtranjero = medio.moneda && medio.moneda !== "ARS"
    const cotizMedio = esExtranjero ? (tc || 1) : 1
    const importeComp = Number(medio.importe_comp ?? medio.importe)
    const importeARS = esExtranjero ? Math.round(importeComp * cotizMedio * 100) / 100 : importeComp
    if (esExtranjero && cotizMedio > 1 && !cotizacionAsiento) cotizacionAsiento = cotizMedio
    totalHaberARS += importeARS
    lineas.push({
      cuenta_id: cMedio.id, cuenta_codigo: cMedio.codigo, cuenta_nombre: cMedio.nombre,
      debe: 0, haber: importeARS,
      descripcion: medio.forma_pago_nombre ?? null,
      orden: orden++,
      importe_moneda_original: esExtranjero ? importeComp : null,
    })
  }

  if (lineas.length === 0) return { ok: false, error: "La OP no tiene medios de pago con cuenta contable asignable." }

  // DEBE: Proveedores — suma ARS de todos los pagos válidos
  const debeProveedores = totalHaberARS > 0 ? totalHaberARS : Math.round(op.importe * tc * 100) / 100
  lineas.push({
    cuenta_id: cAcreedores.id, cuenta_codigo: cAcreedores.codigo, cuenta_nombre: cAcreedores.nombre,
    debe: debeProveedores, haber: 0,
    descripcion: op.proveedor_nombre ?? null,
    orden: orden,
  })

  // 7. Validar partida doble
  const sumaDebe  = lineas.reduce((s, l) => s + l.debe, 0)
  const sumaHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return { ok: false, error: `Partida doble inválida en OP: DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}` }
  }

  // 8. Número correlativo
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario.id, p_fecha: fechaDate })

  // 9. Insertar asiento
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null, diario_id: diario.id, periodo_id: periodo_id ?? null,
      fecha: fechaDate, sucursal_id,
      concepto: `Orden de Pago ${op.numero} - ${op.proveedor_nombre ?? ""}`,
      referencia: op.numero, comprobante_tipo: "orden_pago",
      moneda_original: op.moneda ?? "ARS",
      cotizacion_aplicada: cotizacionAsiento ?? (op.cotizacion ?? null),
      es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento OP: ${asientoErr.message}` }

  // 10. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento OP: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Recibo de Cobro ──────────────────────────────────────────────────────────
export async function generarAsientoRecibo(
  supabase: SupabaseClient,
  recibo: {
    id: string | number
    numero: string
    fecha: string
    caja_id: string
    cliente_nombre?: string | null
    sucursal?: string | null
    importe: number
    moneda?: string
    /** Cotización a ARS del recibo (fallback si no hay cotización por línea de pago). */
    cotizacion?: number | null
  }
): Promise<ResultadoAsiento> {

  // 0. Idempotencia: si ya existe asiento para este recibo, devolver su id
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "recibo")
    .eq("referencia", recibo.numero)
    .maybeSingle()

  if (existente?.id) return { ok: true, asiento_id: existente.id }

  // 1. Pagos del recibo — incluir cotizacion para conversión de moneda extranjera
  const { data: pagos, error: pagosErr } = await supabase
    .from("recibo_pagos")
    .select("id, importe, moneda, valor_id, valor_nombre, cotizacion, tipo_cotizacion")
    .eq("recibo_id", String(recibo.id))

  if (pagosErr) return { ok: false, error: `Error al leer pagos del recibo: ${pagosErr.message}` }
  if (!pagos || pagos.length === 0) return { ok: false, error: "El recibo no tiene líneas de pago registradas." }

  // 1b. Cuentas contables de cada valor (sin FK declarada → query separada)
  const valorIds = [...new Set(pagos.map(p => p.valor_id).filter(Boolean))]
  const cuentasPorValor: Record<string, { id: string; codigo: string; nombre: string } | null> = {}
  if (valorIds.length > 0) {
    const { data: valores } = await supabase
      .from("caja_valores")
      .select("id, cuenta_contable_id, contabilidad_plan_cuentas:cuenta_contable_id(id, codigo, nombre)")
      .in("id", valorIds)
    for (const v of valores ?? []) {
      cuentasPorValor[v.id] = (v as any).contabilidad_plan_cuentas ?? null
    }
  }

  // 1c. Para pagos sin valor_id pero con valor_nombre, intentar resolver por nombre dentro de la caja
  const pagosOrfanos = pagos.filter(p => !p.valor_id && p.valor_nombre)
  if (pagosOrfanos.length > 0) {
    const nombres = [...new Set(pagosOrfanos.map(p => p.valor_nombre).filter(Boolean))]
    if (nombres.length > 0) {
      const { data: valoresPorNombre } = await supabase
        .from("caja_valores")
        .select("id, nombre, cuenta_contable_id, contabilidad_plan_cuentas:cuenta_contable_id(id, codigo, nombre)")
        .eq("caja_id", recibo.caja_id)
        .in("nombre", nombres)
      for (const v of valoresPorNombre ?? []) {
        // Guardar con clave "nombre:" para los pagos sin valor_id
        cuentasPorValor[`nombre:${v.nombre}`] = (v as any).contabilidad_plan_cuentas ?? null
      }
    }
  }

  // 2. Cuenta deudores (HABER) — desde mapeo global factura_venta.deudores
  const { data: mapeo } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select("cuenta_debe:cuenta_debe_id(id, codigo, nombre)")
    .eq("tipo_origen", "factura_venta")
    .eq("subtipo", "deudores")
    .eq("activo", true)
    .maybeSingle()

  const cDeudores = (mapeo as any)?.cuenta_debe as { id: string; codigo: string; nombre: string } | null
  if (!cDeudores) return { ok: false, error: "Sin cuenta deudores en mapeo. Ejecute 015_seed_mapeo_cuentas.sql." }

  // 3. Diario — el de la caja del recibo
  const { data: diario } = await supabase
    .from("contabilidad_diarios")
    .select("id")
    .eq("caja_id", recibo.caja_id)
    .limit(1)
    .maybeSingle()

  if (!diario?.id) return { ok: false, error: `Sin diario contable para la caja ${recibo.caja_id}. Ejecute 014_diarios_dinamicos.sql.` }

  // 4. Período y sucursal
  const fechaDate = recibo.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  let sucursal_id: number | null = null
  if (recibo.sucursal) {
    const { data: suc } = await supabase
      .from("sucursales").select("id").eq("nombre", recibo.sucursal).maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 5. Construir líneas — todos los importes en ARS
  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }

  const lineas: Linea[] = []
  let orden = 0
  let importeValidoPagosARS = 0
  // Cotización principal del asiento (la del primer pago USD, o del recibo)
  let cotizacionAsiento: number | null = null

  for (const pago of pagos) {
    // Resolver cuenta: primero por valor_id, luego por nombre, luego saltar
    let cPago: { id: string; codigo: string; nombre: string } | null = null
    if (pago.valor_id) {
      cPago = cuentasPorValor[pago.valor_id] ?? null
    } else if (pago.valor_nombre) {
      cPago = cuentasPorValor[`nombre:${pago.valor_nombre}`] ?? null
    }

    if (!cPago?.id) {
      // Si el pago tiene importe pero no tiene cuenta → error descriptivo
      // Si el pago no tiene valor_id ni valor_nombre válidos → dato corrupto, se ignora
      const nombreMostrar = pago.valor_nombre && pago.valor_nombre !== "null" ? pago.valor_nombre : null
      if (nombreMostrar) {
        return {
          ok: false,
          error: `El valor de pago "${nombreMostrar}" no tiene cuenta contable asignada. Ejecute 017_add_cuenta_contable_caja_valores.sql y asigne la cuenta en Configuración → Cajas.`,
        }
      }
      // Pago sin valor_id ni valor_nombre: dato inválido, se ignora del asiento
      continue
    }

    // Conversión de moneda extranjera → ARS
    const esExtranjero = pago.moneda && pago.moneda !== "ARS"
    const cotizPago = esExtranjero
      ? (Number(pago.cotizacion) || Number(recibo.cotizacion) || 1)
      : 1
    const importeARS = esExtranjero
      ? Math.round(pago.importe * cotizPago * 100) / 100
      : pago.importe

    if (esExtranjero && cotizPago > 1 && !cotizacionAsiento) {
      cotizacionAsiento = cotizPago
    }

    importeValidoPagosARS += importeARS

    lineas.push({
      cuenta_id: cPago.id,
      cuenta_codigo: cPago.codigo,
      cuenta_nombre: cPago.nombre,
      debe: importeARS,
      haber: 0,
      descripcion: pago.valor_nombre ?? null,
      orden: orden++,
      importe_moneda_original: esExtranjero ? pago.importe : null,
    })
  }

  if (lineas.length === 0) {
    return { ok: false, error: "El recibo no tiene ningún medio de pago con cuenta contable asignable." }
  }

  // HABER: Deudores por Ventas — suma ARS de todos los pagos válidos
  const haberDeudores = importeValidoPagosARS > 0 ? importeValidoPagosARS : recibo.importe
  lineas.push({
    cuenta_id: cDeudores.id,
    cuenta_codigo: cDeudores.codigo,
    cuenta_nombre: cDeudores.nombre,
    debe: 0,
    haber: haberDeudores,
    descripcion: recibo.cliente_nombre ?? null,
    orden: orden,
  })

  // 6. Validar partida doble
  const sumaDebe  = lineas.reduce((s, l) => s + l.debe, 0)
  const sumaHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return {
      ok: false,
      error: `Partida doble inválida en recibo: DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}`,
    }
  }

  // 7. Número correlativo
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario.id, p_fecha: fechaDate })

  // 8. Insertar asiento
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:               numero ?? null,
      diario_id:            diario.id,
      periodo_id:           periodo_id ?? null,
      fecha:                fechaDate,
      sucursal_id,
      concepto:             `Recibo ${recibo.numero}`,
      referencia:           recibo.numero,
      comprobante_tipo:     "recibo",
      moneda_original:      recibo.moneda ?? "ARS",
      cotizacion_aplicada:  cotizacionAsiento ?? (recibo.cotizacion ?? null),
      es_manual:            false,
      estado:               "publicado",
    })
    .select("id")
    .single()

  if (asientoErr) return { ok: false, error: `Error al crear asiento de recibo: ${asientoErr.message}` }

  // 9. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))

  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento de recibo: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Factura de Compra — Circuito (PT en Tránsito / Proveedores) ─────────────
// Genera el asiento contable para una factura creada automáticamente por el
// circuito de compras. El DEBE va siempre a PT en Tránsito en lugar de las
// cuentas de gasto, porque la mercadería aún no ingresó físicamente.
//
//   DEBE    11050301  PT en Tránsito        [subtotal neto]
//   DEBE    11040101  IVA Crédito Fiscal     [iva, si aplica]
//   HABER   21010101  Proveedores            [total con IVA]  (ARS)
//   HABER   21010102  Proveedores del Ext.   [total con IVA]  (USD/EUR)
export async function generarAsientoFacturaCircuito(
  supabase: SupabaseClient,
  factura: {
    id: number | string
    numero: string
    fecha: string
    proveedor_nombre?: string | null
    sucursal?: string | null
    subtotal: number
    impuestos: number
    total: number
    moneda?: string
    /** Cotización a ARS. Obligatorio si moneda != 'ARS'. */
    cotizacion?: number | null
  }
): Promise<ResultadoAsiento> {
  // Tasa de conversión
  const tc = (factura.moneda && factura.moneda !== "ARS" && (factura.cotizacion ?? 0) > 0)
    ? Number(factura.cotizacion)
    : 1
  const conv = (v: number) => Math.round(v * tc * 100) / 100

  // Idempotencia
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "factura_compra")
    .eq("referencia", factura.numero)
    .eq("estado", "publicado")
    .maybeSingle()
  if (existente?.id) return { ok: true, asiento_id: existente.id }

  // 1. Obtener diario CMP del mapeo (reutilizamos el mapeo de factura_compra)
  const { data: mapeo } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select("subtipo, diario_id")
    .eq("tipo_origen", "factura_compra")
    .eq("activo", true)
  const pm = Object.fromEntries((mapeo ?? []).map((r: any) => [r.subtipo, r]))
  const diario_id: string | undefined = pm["acreedores"]?.diario_id ?? pm["compras"]?.diario_id
  if (!diario_id) return { ok: false, error: "Sin diario configurado para factura_compra." }

  // 2. Buscar cuentas por código (verificar existencia)
  const codigos = ["11050301", "11040101", factura.moneda === "USD" || factura.moneda === "EUR" ? "21010102" : "21010101"]
  const { data: cuentas, error: cErr } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("codigo", codigos)
  if (cErr) return { ok: false, error: `Error al buscar cuentas: ${cErr.message}` }

  const byCode = Object.fromEntries((cuentas ?? []).map((c: any) => [c.codigo, c]))
  const cPtTransito = byCode["11050301"]
  const cIvaCF      = byCode["11040101"]
  const cProvCod    = factura.moneda === "USD" || factura.moneda === "EUR" ? "21010102" : "21010101"
  const cProv       = byCode[cProvCod]

  if (!cPtTransito) return { ok: false, error: "Cuenta 11050301 (PT en Tránsito) no encontrada en el plan de cuentas." }
  if (!cProv)       return { ok: false, error: `Cuenta ${cProvCod} (Proveedores) no encontrada en el plan de cuentas.` }

  // 3. Período contable
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: factura.fecha.split("T")[0] })

  // 4. Sucursal
  let sucursal_id: number | null = null
  if (factura.sucursal) {
    const { data: suc } = await supabase.from("sucursales").select("id").eq("nombre", factura.sucursal).maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 5. Construir líneas
  const fechaDate = factura.fecha.split("T")[0]
  type Linea = { cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string; debe: number; haber: number; descripcion: string | null; orden: number }
  const lineas: Linea[] = []

  const tieneIVA = factura.impuestos > 0.009 && cIvaCF != null
  lineas.push({
    cuenta_id: cPtTransito.id, cuenta_codigo: cPtTransito.codigo, cuenta_nombre: cPtTransito.nombre,
    debe: conv(tieneIVA ? factura.subtotal : factura.total), haber: 0,
    descripcion: factura.numero, orden: 0,
  })
  if (tieneIVA) {
    lineas.push({
      cuenta_id: cIvaCF.id, cuenta_codigo: cIvaCF.codigo, cuenta_nombre: cIvaCF.nombre,
      debe: conv(factura.impuestos), haber: 0, descripcion: factura.numero, orden: 1,
    })
  }
  lineas.push({
    cuenta_id: cProv.id, cuenta_codigo: cProv.codigo, cuenta_nombre: cProv.nombre,
    debe: 0, haber: conv(factura.total), descripcion: factura.proveedor_nombre ?? null, orden: lineas.length,
  })

  // 6. Validar partida doble
  const sumaDebe  = lineas.reduce((s, l) => s + l.debe, 0)
  const sumaHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(sumaDebe - sumaHaber) > 0.01) {
    return { ok: false, error: `Partida doble inválida: DEBE=${sumaDebe.toFixed(2)} HABER=${sumaHaber.toFixed(2)}` }
  }

  // 7. Número correlativo
  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  // 8. Insertar asiento
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null, diario_id, periodo_id: periodo_id ?? null, fecha: fechaDate,
      sucursal_id, concepto: `Factura Compra Circuito ${factura.numero}`,
      referencia: factura.numero, comprobante_tipo: "factura_compra",
      moneda_original: factura.moneda ?? "ARS",
      cotizacion_aplicada: tc !== 1 ? tc : null,
      es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  // 9. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Recepción Circuito (Productos Terminados / PT en Tránsito) ───────────────
// Genera el asiento contable al confirmar una recepción del circuito de compras.
//
//   DEBE    11050101  Productos Terminados   [costo recibido]
//   HABER   11050301  PT en Tránsito         [costo recibido]
//
// Si 11050101 no existe, hace fallback a 11050102 (Mercadería de Reventa).
export async function generarAsientoRecepcionCircuito(
  supabase: SupabaseClient,
  recepcion: {
    id: number | string
    numero: string
    fecha: string
    proveedor_nombre?: string | null
    sucursal?: string | null
    total: number              // importe total en ARS (ya convertido)
    moneda?: string            // moneda original de la OC (ej: "USD")
    tipo_cambio?: number       // cotización aplicada
    tipo_cotizacion?: string | null  // tipo de cotización ("oficial", "blue", etc.)
    total_moneda_original?: number   // total en moneda original antes de convertir
  }
): Promise<ResultadoAsiento> {
  // Idempotencia
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "recepcion_circuito")
    .eq("referencia", recepcion.numero)
    .eq("estado", "publicado")
    .maybeSingle()
  if (existente?.id) return { ok: true, asiento_id: existente.id }

  if (recepcion.total <= 0) return { ok: false, error: "El total de la recepción debe ser mayor a 0." }

  // 1. Buscar diario STK desde mapeo (si no existe, retornar error descriptivo)
  const { data: mapeoStk } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select("diario_id")
    .eq("tipo_origen", "recepcion_circuito")
    .eq("activo", true)
    .limit(1)
    .maybeSingle()

  // Fallback: buscar diario por código "STK"
  let diario_id: string | undefined = mapeoStk?.diario_id
  if (!diario_id) {
    const { data: diarioStk } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("codigo", "STK")
      .maybeSingle()
    diario_id = diarioStk?.id
  }
  if (!diario_id) return { ok: false, error: "Sin diario STK (Stock) configurado. Verifique los diarios contables." }

  // 2. Buscar cuentas por código
  const { data: cuentas } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("codigo", ["11050101", "11050102", "11050301"])
  const byCode = Object.fromEntries((cuentas ?? []).map((c: any) => [c.codigo, c]))

  const cPtTransito = byCode["11050301"]
  const cPT         = byCode["11050101"] ?? byCode["11050102"]  // fallback Mercadería de Reventa

  if (!cPtTransito) return { ok: false, error: "Cuenta 11050301 (PT en Tránsito) no encontrada en el plan de cuentas." }
  if (!cPT)         return { ok: false, error: "Cuentas 11050101 / 11050102 (Productos Terminados) no encontradas en el plan de cuentas." }

  // 3. Período contable
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: recepcion.fecha.split("T")[0] })

  // 4. Sucursal
  let sucursal_id: number | null = null
  if (recepcion.sucursal) {
    const { data: suc } = await supabase.from("sucursales").select("id").eq("nombre", recepcion.sucursal).maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 5. Construir líneas (importes en ARS, importes originales si hay conversión)
  const fechaDate = recepcion.fecha.split("T")[0]
  const lineas = [
    {
      cuenta_id: cPT.id, cuenta_codigo: cPT.codigo, cuenta_nombre: cPT.nombre,
      debe: recepcion.total, haber: 0,
      descripcion: recepcion.numero,
      importe_moneda_original: recepcion.total_moneda_original ?? null,
      orden: 0,
    },
    {
      cuenta_id: cPtTransito.id, cuenta_codigo: cPtTransito.codigo, cuenta_nombre: cPtTransito.nombre,
      debe: 0, haber: recepcion.total,
      descripcion: recepcion.proveedor_nombre ?? null,
      importe_moneda_original: recepcion.total_moneda_original
        ? -recepcion.total_moneda_original
        : null,
      orden: 1,
    },
  ]

  // 6. Número correlativo
  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  // 7. Insertar asiento
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null, diario_id, periodo_id: periodo_id ?? null, fecha: fechaDate,
      sucursal_id, concepto: `Según Recepción ${recepcion.numero} de ${recepcion.proveedor_nombre ?? ""}`,
      referencia: recepcion.numero, comprobante_tipo: "recepcion_circuito",
      moneda_original: recepcion.moneda ?? "ARS",
      cotizacion_aplicada: recepcion.tipo_cambio && recepcion.tipo_cambio !== 1 ? recepcion.tipo_cambio : null,
      tipo_cotizacion: recepcion.tipo_cotizacion ?? null,
      es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  // 8. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Reversa genérica de asiento ─────────────────────────────────────────────
export async function generarAsientoReversa(
  supabase: SupabaseClient,
  asiento_origen_id: string,
  concepto_reversa: string
): Promise<ResultadoAsiento> {

  // 1. Buscar asiento original + líneas
  const { data: original, error: origErr } = await supabase
    .from("contabilidad_asientos")
    .select(`
      id, numero, diario_id, periodo_id, fecha, sucursal_id,
      referencia, comprobante_tipo, moneda_original, asiento_reversion_id,
      contabilidad_asientos_lineas(
        cuenta_id, cuenta_codigo, cuenta_nombre, debe, haber, descripcion, orden
      )
    `)
    .eq("id", asiento_origen_id)
    .single()

  if (origErr || !original) return { ok: false, error: `Asiento original no encontrado: ${origErr?.message}` }
  if (original.asiento_reversion_id) return { ok: false, error: "Este asiento ya tiene una reversa registrada." }

  const fechaHoy = new Date().toISOString().split("T")[0]

  // 2. Período actual
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaHoy })

  // 3. Número correlativo
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: original.diario_id, p_fecha: fechaHoy })

  // 4. Insertar asiento reversa
  const { data: reversa, error: reversaErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:           numero ?? null,
      diario_id:        original.diario_id,
      periodo_id:       periodo_id ?? null,
      fecha:            fechaHoy,
      sucursal_id:      original.sucursal_id,
      concepto:         concepto_reversa,
      referencia:       original.referencia ? `ANULA ${original.referencia}` : null,
      comprobante_tipo: original.comprobante_tipo,
      moneda_original:  original.moneda_original,
      es_manual:        false,
      estado:           "publicado",
    })
    .select("id")
    .single()

  if (reversaErr) return { ok: false, error: `Error al crear asiento reversa: ${reversaErr.message}` }

  // 5. Líneas espejo (DEBE ↔ HABER invertidos)
  const lineasOrigen = (original as any).contabilidad_asientos_lineas as Array<{
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }>

  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasOrigen.map(l => ({
      asiento_id:    reversa.id,
      cuenta_id:     l.cuenta_id,
      cuenta_codigo: l.cuenta_codigo,
      cuenta_nombre: l.cuenta_nombre,
      debe:          l.haber,   // invertido
      haber:         l.debe,    // invertido
      descripcion:   l.descripcion,
      orden:         l.orden,
    })))

  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", reversa.id)
    return { ok: false, error: `Error en líneas de reversa: ${lineasErr.message}` }
  }

  // 6. Vincular reversa al asiento original (el original queda publicado, la reversa lo neutraliza)
  await supabase
    .from("contabilidad_asientos")
    .update({ asiento_reversion_id: reversa.id })
    .eq("id", asiento_origen_id)

  return { ok: true, asiento_id: reversa.id }
}

// ─── Remito de Venta — CMV ────────────────────────────────────────────────────
// Genera el asiento de Costo de Mercadería Vendida al confirmar un remito:
//
//   DEBE    42010101  CMV Productos Terminados    [costo total]
//   HABER   11050101  Productos Terminados        [costo total]
//
// Diario: STK (Stock ARS). El costo se obtiene de costo_contable del producto.
export async function generarAsientoRemito(
  supabase: SupabaseClient,
  remito: {
    id: string
    numero: string
    fecha: string
    cliente_nombre?: string | null
    sucursal?: string | null
    /** Líneas del remito con producto_id y cantidad remitida */
    lineas: { producto_id: number | string; cantidad: number }[]
  }
): Promise<ResultadoAsiento> {
  // 0. Idempotencia: si ya existe asiento publicado para este remito, no duplicar
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "remito")
    .eq("referencia", remito.numero)
    .eq("estado", "publicado")
    .maybeSingle()
  if (existente?.id) return { ok: true, asiento_id: existente.id }

  if (!remito.lineas || remito.lineas.length === 0) {
    return { ok: false, error: "El remito no tiene líneas para calcular el CMV." }
  }

  // 1. Mapeo de cuentas — tipo remito_venta (ejecutar 037_seed_mapeo_remito_venta.sql)
  const { data: mapeo, error: mapeoErr } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo,
      diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "remito_venta")
    .eq("activo", true)

  if (mapeoErr) return { ok: false, error: `Error al leer mapeo contable: ${mapeoErr.message}` }
  if (!mapeo || mapeo.length === 0) {
    return {
      ok: false,
      error: "Sin mapeo contable para remito_venta. Ejecute el script 037_seed_mapeo_remito_venta.sql.",
    }
  }

  const pm = Object.fromEntries(mapeo.map((r: any) => [r.subtipo, r]))
  const cCMV        = pm["cmv"]?.cuenta_debe        as { id: string; codigo: string; nombre: string } | null
  const cExistencias = pm["existencias"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null
  const diario_id: string = pm["cmv"]?.diario_id ?? pm["existencias"]?.diario_id

  if (!cCMV)        return { ok: false, error: "Mapeo incompleto: falta cuenta 'cmv' (cuenta_debe) para remito_venta." }
  if (!cExistencias) return { ok: false, error: "Mapeo incompleto: falta cuenta 'existencias' (cuenta_haber) para remito_venta." }
  if (!diario_id)   return { ok: false, error: "Mapeo incompleto: falta diario_id (STK) para remito_venta." }

  // 2. Obtener costo_contable de cada producto
  const productoIds = [...new Set(remito.lineas.map((l) => String(l.producto_id)))]
  const { data: productos, error: prodErr } = await supabase
    .from("productos")
    .select("id, costo_contable")
    .in("id", productoIds)

  if (prodErr) return { ok: false, error: `Error al leer costos de productos: ${prodErr.message}` }

  const costoPorProducto: Record<string, number> = {}
  for (const p of productos ?? []) {
    costoPorProducto[String(p.id)] = Number(p.costo_contable ?? 0)
  }

  // 3. Calcular costo total (suma de costo_contable * cantidad por línea)
  let costoTotal = 0
  for (const linea of remito.lineas) {
    const costoUnitario = costoPorProducto[String(linea.producto_id)] ?? 0
    costoTotal += costoUnitario * Number(linea.cantidad)
  }
  costoTotal = Math.round(costoTotal * 100) / 100

  // El asiento se genera incluso con costo 0 para mantener trazabilidad (según spec)

  // 4. Período contable
  const fechaDate = remito.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  // 5. Sucursal
  let sucursal_id: number | null = null
  if (remito.sucursal) {
    const { data: suc } = await supabase
      .from("sucursales")
      .select("id")
      .eq("nombre", remito.sucursal)
      .maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  // 6. Construir líneas (partida doble simplificada: 1 DEBE + 1 HABER)
  const concepto = `Según Remito ${remito.numero}${remito.cliente_nombre ? ` de ${remito.cliente_nombre}` : ""}`
  const lineas = [
    {
      cuenta_id:    cCMV.id,
      cuenta_codigo: cCMV.codigo,
      cuenta_nombre: cCMV.nombre,
      debe:         costoTotal,
      haber:        0,
      descripcion:  remito.numero,
      orden:        0,
    },
    {
      cuenta_id:    cExistencias.id,
      cuenta_codigo: cExistencias.codigo,
      cuenta_nombre: cExistencias.nombre,
      debe:         0,
      haber:        costoTotal,
      descripcion:  remito.cliente_nombre ?? null,
      orden:        1,
    },
  ]

  // 7. Número correlativo
  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  // 8. Insertar asiento en estado publicado
  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero:           numero ?? null,
      diario_id,
      periodo_id:       periodo_id ?? null,
      fecha:            fechaDate,
      sucursal_id,
      concepto,
      referencia:       remito.numero,
      comprobante_tipo: "remito",
      moneda_original:  "ARS",
      es_manual:        false,
      estado:           "publicado",
    })
    .select("id")
    .single()

  if (asientoErr) return { ok: false, error: `Error al crear asiento CMV: ${asientoErr.message}` }

  // 9. Insertar líneas
  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map((l) => ({ ...l, asiento_id: asiento.id })))

  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento CMV: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── NC Toma de Equipo ────────────────────────────────────────────────────────
// Genera el asiento al confirmar la Toma de Equipo:
//   DEBE  99999996  Cta Puente Toma Equipo (importe en ARS)
//   HABER 11030101  Deudores por Ventas    (importe en ARS)
//
// La toma se acuerda en USD (precio del equipo usado), pero el asiento
// SIEMPRE se valúa en ARS aplicando la cotización del día. Si no se pasa
// `moneda`/`cotizacion` se asume ARS (compat con tomas viejas).
export async function generarAsientoNCTomaEquipo(
  supabase: SupabaseClient,
  nc: {
    id: number | string
    numero: string
    fecha: string
    cliente_nombre?: string | null
    sucursal?: string | null
    total: number                   // En la moneda original
    moneda?: string                 // "USD" | "ARS" | etc. Default "ARS"
    cotizacion?: number | null      // ARS por unidad de moneda. Si moneda="USD" y total=300 → ARS = 300 * cotizacion
  }
): Promise<ResultadoAsiento> {
  // Idempotencia
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "nc_toma_equipo")
    .eq("referencia", nc.numero)
    .eq("estado", "publicado")
    .maybeSingle()
  if (existente?.id) return { ok: true, asiento_id: existente.id }

  if (nc.total <= 0) return { ok: false, error: "El total de la NC debe ser mayor a 0." }

  // Convertir a ARS si la toma se acordó en otra moneda.
  const monedaOrig = (nc.moneda ?? "ARS").toUpperCase()
  const cotiz = monedaOrig === "ARS" ? 1 : Number(nc.cotizacion ?? 0)
  if (monedaOrig !== "ARS" && (!cotiz || cotiz <= 0)) {
    return { ok: false, error: `La toma está en ${monedaOrig} pero falta la cotización para convertir a ARS.` }
  }
  const totalArs = nc.total * cotiz

  // Mapeo de cuentas
  const { data: mapeo } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo, diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "nc_toma_equipo")
    .eq("activo", true)

  if (!mapeo || mapeo.length === 0)
    return { ok: false, error: "Sin mapeo contable para nc_toma_equipo. Ejecute 032_circuito_toma_equipo_contable.sql." }

  const pm = Object.fromEntries((mapeo as any[]).map((r: any) => [r.subtipo, r]))
  const cDeudores  = pm["deudores"]?.cuenta_debe  as { id: string; codigo: string; nombre: string } | null
  const cPuente    = pm["cta_puente"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null
  const diario_id: string = pm["deudores"]?.diario_id ?? pm["cta_puente"]?.diario_id

  if (!cDeudores) return { ok: false, error: "Mapeo incompleto: falta cuenta 'deudores' para nc_toma_equipo." }
  if (!cPuente)   return { ok: false, error: "Mapeo incompleto: falta cuenta 'cta_puente' para nc_toma_equipo." }
  if (!diario_id) return { ok: false, error: "Mapeo incompleto: falta diario_id para nc_toma_equipo." }

  const fechaDate = nc.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  let sucursal_id: number | null = null
  if (nc.sucursal) {
    const { data: suc } = await supabase.from("sucursales").select("id").eq("nombre", nc.sucursal).maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null, diario_id, periodo_id: periodo_id ?? null, fecha: fechaDate,
      sucursal_id,
      concepto: `NC por Toma de Equipo ${nc.numero}${nc.cliente_nombre ? ` de ${nc.cliente_nombre}` : ""}`,
      referencia: nc.numero, comprobante_tipo: "nc_toma_equipo",
      moneda_original: monedaOrig,
      cotizacion_aplicada: monedaOrig !== "ARS" ? cotiz : null,
      tipo_cotizacion: monedaOrig !== "ARS" ? "blue" : null,
      es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento NC TE: ${asientoErr.message}` }

  // NC TE: DEBE Cuenta Puente / HABER Deudores — siempre en ARS para que
  // los asientos sean consistentes con el resto del libro mayor.
  const lineas = [
    { cuenta_id: cPuente.id,   cuenta_codigo: cPuente.codigo,   cuenta_nombre: cPuente.nombre,   debe: totalArs, haber: 0,       importe_moneda_original: monedaOrig !== "ARS" ? nc.total : null, descripcion: nc.numero,                  orden: 0 },
    { cuenta_id: cDeudores.id, cuenta_codigo: cDeudores.codigo, cuenta_nombre: cDeudores.nombre, debe: 0,        haber: totalArs, importe_moneda_original: monedaOrig !== "ARS" ? nc.total : null, descripcion: nc.cliente_nombre ?? null, orden: 1 },
  ]

  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento NC TE: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Recepción Toma de Equipo ─────────────────────────────────────────────────
// Genera el asiento al confirmar la Recepción de una TE:
//   DEBE  11050101  Productos Terminados   (importe)
//   HABER 99999996  Cta Puente Toma Equipo (importe)
export async function generarAsientoRecepcionTomaEquipo(
  supabase: SupabaseClient,
  rec: {
    id: number | string
    numero: string
    fecha: string
    cliente_nombre?: string | null
    sucursal?: string | null
    total: number
    moneda?: string
    cotizacion?: number | null
  }
): Promise<ResultadoAsiento> {
  // Idempotencia
  const { data: existente } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "recepcion_toma_equipo")
    .eq("referencia", rec.numero)
    .eq("estado", "publicado")
    .maybeSingle()
  if (existente?.id) return { ok: true, asiento_id: existente.id }

  if (rec.total <= 0) return { ok: false, error: "El total de la recepción TE debe ser mayor a 0." }

  // Si la toma estaba en USD, hay que convertir a ARS con la cotización del
  // día en que se valuó la toma (persistida en tomas_equipo.cotizacion).
  // Sin esto el asiento queda anotado como pesos crudos (bug: USD 300 → $300).
  const monedaOrig = (rec.moneda ?? "ARS").toUpperCase()
  const cotiz = monedaOrig === "ARS" ? 1 : Number(rec.cotizacion ?? 0)
  if (monedaOrig !== "ARS" && (!cotiz || cotiz <= 0)) {
    return { ok: false, error: `La toma está en ${monedaOrig} pero falta la cotización para convertir a ARS.` }
  }
  const totalArs = rec.total * cotiz

  const { data: mapeo } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo, diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", "recepcion_toma_equipo")
    .eq("activo", true)

  if (!mapeo || mapeo.length === 0)
    return { ok: false, error: "Sin mapeo contable para recepcion_toma_equipo. Ejecute 032_circuito_toma_equipo_contable.sql." }

  const pm = Object.fromEntries((mapeo as any[]).map((r: any) => [r.subtipo, r]))
  const cProductos = pm["productos"]?.cuenta_debe  as { id: string; codigo: string; nombre: string } | null
  const cPuente    = pm["cta_puente"]?.cuenta_haber as { id: string; codigo: string; nombre: string } | null
  const diario_id: string = pm["productos"]?.diario_id ?? pm["cta_puente"]?.diario_id

  if (!cProductos) return { ok: false, error: "Mapeo incompleto: falta cuenta 'productos' para recepcion_toma_equipo." }
  if (!cPuente)    return { ok: false, error: "Mapeo incompleto: falta cuenta 'cta_puente' para recepcion_toma_equipo." }
  if (!diario_id)  return { ok: false, error: "Mapeo incompleto: falta diario_id para recepcion_toma_equipo." }

  const fechaDate = rec.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  let sucursal_id: number | null = null
  if (rec.sucursal) {
    const { data: suc } = await supabase.from("sucursales").select("id").eq("nombre", rec.sucursal).maybeSingle()
    sucursal_id = suc?.id ?? null
  }

  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null, diario_id, periodo_id: periodo_id ?? null, fecha: fechaDate,
      sucursal_id,
      concepto: `Recepción Toma de Equipo ${rec.numero}${rec.cliente_nombre ? ` de ${rec.cliente_nombre}` : ""}`,
      referencia: rec.numero, comprobante_tipo: "recepcion_toma_equipo",
      moneda_original: monedaOrig,
      cotizacion_aplicada: monedaOrig !== "ARS" ? cotiz : null,
      tipo_cotizacion: monedaOrig !== "ARS" ? "blue" : null,
      es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento REP TE: ${asientoErr.message}` }

  const lineas = [
    { cuenta_id: cProductos.id, cuenta_codigo: cProductos.codigo, cuenta_nombre: cProductos.nombre, debe: totalArs, haber: 0,       importe_moneda_original: monedaOrig !== "ARS" ? rec.total : null, descripcion: rec.numero,                  orden: 0 },
    { cuenta_id: cPuente.id,    cuenta_codigo: cPuente.codigo,    cuenta_nombre: cPuente.nombre,    debe: 0,        haber: totalArs, importe_moneda_original: monedaOrig !== "ARS" ? rec.total : null, descripcion: rec.cliente_nombre ?? null, orden: 1 },
  ]

  const { error: lineasErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (lineasErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento REP TE: ${lineasErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Ajustes de Stock (positivos / negativos) ───────────────────────────────
// Genera el asiento contable cuando se confirma un ajuste de stock.
//   Positivo: DR Mercadería (existencias) / CR Ajuste Inventario Positivo
//   Negativo: DR Ajuste Inventario Negativo / CR Mercadería (existencias)
// Mapeo en `contabilidad_mapeo_cuentas` con tipo_origen "ajuste_positivo" o
// "ajuste_negativo" y subtipos "existencias" + "contrapartida". Si falta el
// mapeo retorna error y el confirmar debe abortar.
export async function generarAsientoAjuste(
  supabase: SupabaseClient,
  ajuste: {
    id: number
    numero: string
    tipo: "positivo" | "negativo"
    fecha: string
    sucursal_id?: number | null
    deposito_nombre?: string | null
    concepto?: string | null
    importe_total: number  // suma de costo_unitario * cantidad por línea
  }
): Promise<ResultadoAsiento> {
  if (!(ajuste.importe_total > 0)) {
    return { ok: false, error: "Importe total del ajuste debe ser > 0 para generar el asiento. Asegurese de que cada línea tenga costo_unitario." }
  }

  const tipoOrigen = ajuste.tipo === "positivo" ? "ajuste_positivo" : "ajuste_negativo"
  const { data: mapeo, error: mapeoErr } = await supabase
    .from("contabilidad_mapeo_cuentas")
    .select(`
      subtipo, diario_id,
      cuenta_debe:cuenta_debe_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_id(id, codigo, nombre)
    `)
    .eq("tipo_origen", tipoOrigen)
    .eq("activo", true)

  if (mapeoErr) return { ok: false, error: `Error al leer mapeo contable: ${mapeoErr.message}` }
  if (!mapeo || mapeo.length === 0) {
    return {
      ok: false,
      error: `Sin mapeo contable para ${tipoOrigen}. Ejecute el script 097_ajustes_stock.sql.`,
    }
  }
  const pm = Object.fromEntries(mapeo.map((r: any) => [r.subtipo, r]))

  // Para ajuste_positivo: existencias=debe, contrapartida=haber
  // Para ajuste_negativo: existencias=haber, contrapartida=debe
  const cExistencias = (ajuste.tipo === "positivo"
    ? pm["existencias"]?.cuenta_debe
    : pm["existencias"]?.cuenta_haber) as { id: string; codigo: string; nombre: string } | null
  const cContra = (ajuste.tipo === "positivo"
    ? pm["contrapartida"]?.cuenta_haber
    : pm["contrapartida"]?.cuenta_debe) as { id: string; codigo: string; nombre: string } | null

  if (!cExistencias) return { ok: false, error: `Mapeo incompleto: falta cuenta 'existencias' para ${tipoOrigen}.` }
  if (!cContra)      return { ok: false, error: `Mapeo incompleto: falta cuenta 'contrapartida' para ${tipoOrigen}.` }

  const diario_id: string = pm["existencias"]?.diario_id ?? pm["contrapartida"]?.diario_id
  if (!diario_id) return { ok: false, error: `Mapeo incompleto: falta diario_id para ${tipoOrigen}.` }

  const fechaDate = ajuste.fecha.split("T")[0]
  const { data: periodo_id } = await supabase
    .rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  const importe = Math.round(Number(ajuste.importe_total) * 100) / 100

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const desc = ajuste.deposito_nombre ?? ajuste.concepto ?? ajuste.numero
  const lineas: Linea[] =
    ajuste.tipo === "positivo"
      ? [
          { cuenta_id: cExistencias.id, cuenta_codigo: cExistencias.codigo, cuenta_nombre: cExistencias.nombre, debe: importe, haber: 0, descripcion: desc, orden: 0 },
          { cuenta_id: cContra.id,      cuenta_codigo: cContra.codigo,      cuenta_nombre: cContra.nombre,      debe: 0,       haber: importe, descripcion: ajuste.numero, orden: 1 },
        ]
      : [
          { cuenta_id: cContra.id,      cuenta_codigo: cContra.codigo,      cuenta_nombre: cContra.nombre,      debe: importe, haber: 0,       descripcion: desc, orden: 0 },
          { cuenta_id: cExistencias.id, cuenta_codigo: cExistencias.codigo, cuenta_nombre: cExistencias.nombre, debe: 0,       haber: importe, descripcion: ajuste.numero, orden: 1 },
        ]

  const { data: numero } = await supabase
    .rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: ajuste.sucursal_id ?? null,
      concepto: `Ajuste de Stock ${ajuste.numero}${ajuste.concepto ? ` — ${ajuste.concepto}` : ""}`,
      referencia: ajuste.numero,
      comprobante_tipo: tipoOrigen,
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento de ajuste: ${asientoErr.message}` }

  const { error: lineasInsErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (lineasInsErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento de ajuste: ${lineasInsErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Registro de Caja ────────────────────────────────────────────────────────
// Genera asiento contable para un Registro de Caja confirmado.
// DEBE: cuenta_contable del comprobante × (importe + impuestos).
// HABER: cuenta_haber del caja_valor × importe (convertido a moneda del registro).
// Total DEBE = Total HABER (ya validado en confirmar).
// Diario: primer valor pagado → diario por caja_id + tipo. Fallback: General.
export async function generarAsientoRegistroCaja(
  supabase: SupabaseClient,
  registro: {
    id: string
    numero: string
    fecha: string
    caja_id: string
    sucursal: string | null
    concepto_nombre: string
    moneda: string
    cotizacion: number | null
  }
): Promise<ResultadoAsiento> {
  const moneda = registro.moneda || "ARS"
  const cot = Number(registro.cotizacion ?? 0)
  if (moneda !== "ARS" && cot <= 0) {
    return { ok: false, error: `Falta la cotización del registro para generar el asiento en ${moneda}.` }
  }
  // Conversión a ARS (moneda base del asiento).
  const aARS = (importe: number, monedaValor: string): number => {
    if (!monedaValor || monedaValor === "ARS") return importe
    if (cot <= 0) return importe
    return importe * cot
  }
  const compAARS = (importe: number): number => {
    if (moneda === "ARS") return importe
    if (cot <= 0) return importe
    return importe * cot
  }

  const [{ data: comps }, { data: vals }] = await Promise.all([
    supabase
      .from("registro_caja_comprobantes")
      .select("descripcion, cuenta_contable, importe, impuestos")
      .eq("registro_id", registro.id),
    supabase
      .from("registro_caja_valores")
      .select("valor_id, valor_nombre, importe, moneda")
      .eq("registro_id", registro.id),
  ])
  if (!comps || comps.length === 0) return { ok: false, error: "Registro sin comprobantes." }
  if (!vals || vals.length === 0) return { ok: false, error: "Registro sin valores pagados." }

  // 1) Resolver cuenta_contable_id por código (DEBE)
  const codigosDebe = Array.from(new Set(comps.map((c: any) => c.cuenta_contable).filter(Boolean)))
  if (codigosDebe.length === 0) return { ok: false, error: "Falta cuenta contable en los comprobantes." }
  const { data: cuentasDebe } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("codigo", codigosDebe)
  const cuentaByCodigo = new Map<string, { id: string; codigo: string; nombre: string }>()
  for (const cc of cuentasDebe ?? []) cuentaByCodigo.set(cc.codigo, cc as any)
  for (const cod of codigosDebe) {
    if (!cuentaByCodigo.has(cod)) return { ok: false, error: `Cuenta contable "${cod}" no encontrada en el plan de cuentas.` }
  }

  // 2) Resolver cuenta_haber del caja_valor (HABER)
  const valorIds = Array.from(new Set(vals.map((v: any) => v.valor_id).filter(Boolean)))
  if (valorIds.length === 0) return { ok: false, error: "Los valores del registro no tienen valor_id." }
  const { data: cajaValores } = await supabase
    .from("caja_valores")
    .select("id, codigo, nombre, tipo, caja_id, cuenta_haber_id, contabilidad_plan_cuentas:cuenta_haber_id(id, codigo, nombre)")
    .in("id", valorIds)
  const cajaValorById = new Map<string, any>()
  for (const cv of cajaValores ?? []) cajaValorById.set(cv.id, cv)
  for (const vid of valorIds) {
    const cv = cajaValorById.get(vid)
    if (!cv) return { ok: false, error: `Valor de caja ${vid} no encontrado.` }
    if (!cv.cuenta_haber_id) return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta_haber configurada.` }
  }

  // 3) Diario: primer valor → caja_id + tipo. Fallback: General.
  const primerValor = cajaValorById.get(vals[0].valor_id)
  let diario_id: string | null = null
  if (primerValor?.caja_id && primerValor?.tipo) {
    const tipoDiario = primerValor.tipo === "efectivo" ? "efectivo" : "banco_cheques"
    const { data: d } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("caja_id", primerValor.caja_id)
      .eq("tipo", tipoDiario)
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (d) diario_id = d.id
  }
  if (!diario_id) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("tipo", "general")
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (gen) diario_id = gen.id
  }
  if (!diario_id) return { ok: false, error: "No se encontró diario contable para el asiento (ni para la caja ni General)." }

  const fechaDate = registro.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  // 4) Construir líneas
  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  const lineas: Linea[] = []
  let orden = 0

  for (const c of comps as any[]) {
    const cuenta = cuentaByCodigo.get(c.cuenta_contable)!
    const importeReg = Number(c.importe ?? 0) + Number(c.impuestos ?? 0)
    const importeARS = Math.round(compAARS(importeReg) * 100) / 100
    if (importeARS <= 0) continue
    lineas.push({
      cuenta_id: cuenta.id,
      cuenta_codigo: cuenta.codigo,
      cuenta_nombre: cuenta.nombre,
      debe: importeARS,
      haber: 0,
      descripcion: c.descripcion ?? registro.concepto_nombre ?? null,
      orden: orden++,
      importe_moneda_original: moneda !== "ARS" ? importeReg : null,
    })
  }

  for (const v of vals as any[]) {
    const cv = cajaValorById.get(v.valor_id)
    const cuentaHaber = cv.contabilidad_plan_cuentas as { id: string; codigo: string; nombre: string }
    if (!cuentaHaber) return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta_haber válida.` }
    const importeARS = Math.round(aARS(Number(v.importe ?? 0), v.moneda) * 100) / 100
    if (importeARS <= 0) continue
    lineas.push({
      cuenta_id: cuentaHaber.id,
      cuenta_codigo: cuentaHaber.codigo,
      cuenta_nombre: cuentaHaber.nombre,
      debe: 0,
      haber: importeARS,
      descripcion: `Pago con ${v.valor_nombre}`,
      orden: orden++,
      importe_moneda_original: moneda !== "ARS" ? Number(v.importe ?? 0) : null,
    })
  }

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    return { ok: false, error: `Asiento desbalanceado: debe=${totalDebe.toFixed(2)}, haber=${totalHaber.toFixed(2)}.` }
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Registro de Caja ${registro.numero} — ${registro.concepto_nombre}`,
      referencia: registro.numero,
      comprobante_tipo: "registro_caja",
      moneda_original: moneda,
      cotizacion_aplicada: moneda !== "ARS" ? cot : null,
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Registro de Banco ──────────────────────────────────────────────────────
// DEBE: cuenta_contable de cada comprobante (gasto/contrapartida) por importe+imp.
// HABER: cuenta del banco (del diario vinculado a cuenta_bancaria_id) por importe
//        de cada valor pagado (convertido a ARS si moneda != ARS).
export async function generarAsientoRegistroBanco(
  supabase: SupabaseClient,
  registro: {
    id: string
    numero: string
    fecha: string
    cuenta_bancaria_id: string
    cuenta_bancaria_nombre: string
    sucursal: string | null
    concepto_nombre: string
    moneda: string
    cotizacion: number | null
  }
): Promise<ResultadoAsiento> {
  const moneda = registro.moneda || "ARS"
  const cot = Number(registro.cotizacion ?? 0)
  if (moneda !== "ARS" && cot <= 0) {
    return { ok: false, error: `Falta la cotización del registro para generar el asiento en ${moneda}.` }
  }
  const aARS = (importe: number, monedaValor: string): number => {
    if (!monedaValor || monedaValor === "ARS") return importe
    if (cot <= 0) return importe
    return importe * cot
  }
  const compAARS = (importe: number): number => {
    if (moneda === "ARS") return importe
    if (cot <= 0) return importe
    return importe * cot
  }

  const [{ data: comps }, { data: vals }] = await Promise.all([
    supabase
      .from("registro_banco_comprobantes")
      .select("descripcion, cuenta_contable, importe, impuestos")
      .eq("registro_id", registro.id),
    supabase
      .from("registro_banco_valores")
      .select("nombre, importe, moneda")
      .eq("registro_id", registro.id),
  ])
  if (!comps || comps.length === 0) return { ok: false, error: "Registro sin comprobantes." }
  if (!vals || vals.length === 0) return { ok: false, error: "Registro sin valores pagados." }

  // Cuentas DEBE por código
  const codigosDebe = Array.from(new Set(comps.map((c: any) => c.cuenta_contable).filter(Boolean)))
  if (codigosDebe.length === 0) return { ok: false, error: "Falta cuenta contable en los comprobantes." }
  const { data: cuentasDebe } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("codigo", codigosDebe)
  const cuentaByCodigo = new Map<string, { id: string; codigo: string; nombre: string }>()
  for (const cc of cuentasDebe ?? []) cuentaByCodigo.set(cc.codigo, cc as any)
  for (const cod of codigosDebe) {
    if (!cuentaByCodigo.has(cod)) return { ok: false, error: `Cuenta contable "${cod}" no encontrada en el plan de cuentas.` }
  }

  // Diario por cuenta_bancaria_id + cuenta del banco
  const { data: diario } = await supabase
    .from("contabilidad_diarios")
    .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
    .eq("cuenta_bancaria_id", registro.cuenta_bancaria_id)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (!diario) return { ok: false, error: `No se encontró diario contable para la cuenta bancaria. Configurá uno en Contabilidad → Diarios.` }
  const cuentaBancoId = diario.cuenta_haber_predeterminada_id ?? diario.cuenta_debito_predeterminada_id
  if (!cuentaBancoId) return { ok: false, error: `El diario de la cuenta bancaria no tiene cuenta_debito/cuenta_haber configurada.` }
  const { data: cuentaBanco } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("id", cuentaBancoId)
    .maybeSingle()
  if (!cuentaBanco) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan de cuentas." }

  const fechaDate = registro.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  const lineas: Linea[] = []
  let orden = 0

  for (const c of comps as any[]) {
    const cuenta = cuentaByCodigo.get(c.cuenta_contable)!
    const importeReg = Number(c.importe ?? 0) + Number(c.impuestos ?? 0)
    const importeARS = Math.round(compAARS(importeReg) * 100) / 100
    if (importeARS <= 0) continue
    lineas.push({
      cuenta_id: cuenta.id, cuenta_codigo: cuenta.codigo, cuenta_nombre: cuenta.nombre,
      debe: importeARS, haber: 0, descripcion: c.descripcion ?? registro.concepto_nombre ?? null, orden: orden++,
      importe_moneda_original: moneda !== "ARS" ? importeReg : null,
    })
  }

  for (const v of vals as any[]) {
    const importeARS = Math.round(aARS(Number(v.importe ?? 0), v.moneda) * 100) / 100
    if (importeARS <= 0) continue
    lineas.push({
      cuenta_id: cuentaBanco.id, cuenta_codigo: cuentaBanco.codigo, cuenta_nombre: cuentaBanco.nombre,
      debe: 0, haber: importeARS, descripcion: `${v.nombre || "Pago"} — ${registro.cuenta_bancaria_nombre}`, orden: orden++,
      importe_moneda_original: moneda !== "ARS" ? Number(v.importe ?? 0) : null,
    })
  }

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    return { ok: false, error: `Asiento desbalanceado: debe=${totalDebe.toFixed(2)}, haber=${totalHaber.toFixed(2)}.` }
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario.id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id: diario.id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Registro de Banco ${registro.numero} — ${registro.concepto_nombre}`,
      referencia: registro.numero,
      comprobante_tipo: "registro_banco",
      moneda_original: moneda,
      cotizacion_aplicada: moneda !== "ARS" ? cot : null,
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Ajuste de Banco ────────────────────────────────────────────────────────
// Lógica: el ajuste tiene un único `importe` (positivo o negativo) y una
// `cuenta_analitica` (la contrapartida). El signo positivo es entrada (sube saldo).
//   - entrada (importe > 0): DEBE cuenta_banco, HABER cuenta_analitica
//   - salida  (importe < 0): DEBE cuenta_analitica, HABER cuenta_banco
//     (se aplica abs)
export async function generarAsientoAjusteBanco(
  supabase: SupabaseClient,
  ajuste: {
    id: string
    numero: string
    fecha: string
    cuenta_bancaria_id: string | null
    cuenta_bancaria_nombre: string
    sucursal: string | null
    concepto_nombre: string
    cuenta_analitica: string | null
    importe: number
  }
): Promise<ResultadoAsiento> {
  if (!ajuste.cuenta_analitica) {
    return { ok: false, error: "Falta cuenta contable en el ajuste — cargala antes de publicar." }
  }
  if (!ajuste.cuenta_bancaria_id) {
    return { ok: false, error: "Falta cuenta_bancaria_id en el ajuste." }
  }

  // Cuenta contrapartida
  const { data: cuentaContra } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("codigo", ajuste.cuenta_analitica)
    .maybeSingle()
  if (!cuentaContra) return { ok: false, error: `Cuenta contable "${ajuste.cuenta_analitica}" no encontrada.` }

  // Diario + cuenta banco
  const { data: diario } = await supabase
    .from("contabilidad_diarios")
    .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
    .eq("cuenta_bancaria_id", ajuste.cuenta_bancaria_id)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (!diario) return { ok: false, error: `No se encontró diario contable para la cuenta bancaria.` }
  const cuentaBancoId = diario.cuenta_haber_predeterminada_id ?? diario.cuenta_debito_predeterminada_id
  if (!cuentaBancoId) return { ok: false, error: `El diario del banco no tiene cuenta_debito/cuenta_haber configurada.` }
  const { data: cuentaBanco } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("id", cuentaBancoId)
    .maybeSingle()
  if (!cuentaBanco) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan de cuentas." }

  const fechaDate = ajuste.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  const importe = Math.round(Math.abs(Number(ajuste.importe ?? 0)) * 100) / 100
  if (importe <= 0) return { ok: false, error: "Importe del ajuste debe ser > 0." }
  const esEntrada = Number(ajuste.importe) > 0

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const lineas: Linea[] = esEntrada
    ? [
        { cuenta_id: cuentaBanco.id, cuenta_codigo: cuentaBanco.codigo, cuenta_nombre: cuentaBanco.nombre,
          debe: importe, haber: 0, descripcion: `Ajuste ${ajuste.cuenta_bancaria_nombre}`, orden: 0 },
        { cuenta_id: cuentaContra.id, cuenta_codigo: cuentaContra.codigo, cuenta_nombre: cuentaContra.nombre,
          debe: 0, haber: importe, descripcion: ajuste.concepto_nombre, orden: 1 },
      ]
    : [
        { cuenta_id: cuentaContra.id, cuenta_codigo: cuentaContra.codigo, cuenta_nombre: cuentaContra.nombre,
          debe: importe, haber: 0, descripcion: ajuste.concepto_nombre, orden: 0 },
        { cuenta_id: cuentaBanco.id, cuenta_codigo: cuentaBanco.codigo, cuenta_nombre: cuentaBanco.nombre,
          debe: 0, haber: importe, descripcion: `Ajuste ${ajuste.cuenta_bancaria_nombre}`, orden: 1 },
      ]

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario.id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id: diario.id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Ajuste de Banco ${ajuste.numero} — ${ajuste.concepto_nombre}`,
      referencia: ajuste.numero,
      comprobante_tipo: "ajuste_banco",
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Ajuste de Caja ──────────────────────────────────────────────────────────
// Genera asiento contable para un Ajuste de Caja publicado.
// Lógica:
//   - Línea "entrada" (sobrante): DEBE caja_valor.cuenta_contable (la caja aumenta),
//     HABER cuenta_analitica del ajuste (contrapartida — ej: ingreso por diferencia).
//   - Línea "salida" (faltante): DEBE cuenta_analitica del ajuste (gasto por diferencia),
//     HABER caja_valor.cuenta_haber (la caja disminuye).
//   - Diario: el del caja_valor de la primer línea (caja_id + tipo). Fallback: General.
export async function generarAsientoAjusteCaja(
  supabase: SupabaseClient,
  ajuste: {
    id: string
    numero: string
    fecha: string
    caja_id: string
    sucursal: string | null
    concepto_nombre: string
    cuenta_analitica: string | null
  }
): Promise<ResultadoAsiento> {
  if (!ajuste.cuenta_analitica) {
    return { ok: false, error: "Falta cuenta contable en el ajuste — cargala antes de publicar." }
  }

  // Cuenta contrapartida (cuenta_analitica del ajuste)
  const { data: cuentaContra } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("codigo", ajuste.cuenta_analitica)
    .maybeSingle()
  if (!cuentaContra) return { ok: false, error: `Cuenta contable "${ajuste.cuenta_analitica}" no encontrada en el plan de cuentas.` }

  const { data: vals } = await supabase
    .from("ajuste_caja_valores")
    .select("valor_id, valor_nombre, tipo_movimiento, importe")
    .eq("ajuste_id", ajuste.id)
  if (!vals || vals.length === 0) return { ok: false, error: "Ajuste sin líneas de valor." }

  // Resolver cuentas del caja_valor por valor_id
  const valorIds = Array.from(new Set(vals.map((v: any) => v.valor_id).filter(Boolean)))
  if (valorIds.length === 0) return { ok: false, error: "Las líneas del ajuste no tienen valor_id." }
  const { data: cajaValores } = await supabase
    .from("caja_valores")
    .select("id, nombre, tipo, caja_id, cuenta_contable_id, cuenta_haber_id, cuenta_debe:cuenta_contable_id(id, codigo, nombre), cuenta_haber:cuenta_haber_id(id, codigo, nombre)")
    .in("id", valorIds)
  const cvById = new Map<string, any>()
  for (const cv of cajaValores ?? []) cvById.set(cv.id, cv)
  for (const vid of valorIds) {
    const cv = cvById.get(vid)
    if (!cv) return { ok: false, error: `Valor de caja ${vid} no encontrado.` }
    if (!cv.cuenta_debe || !cv.cuenta_haber) {
      return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta_contable/cuenta_haber configurada.` }
    }
  }

  // Diario: primer caja_valor → buscar por caja_id + tipo. Fallback General.
  const primerCV = cvById.get(vals[0].valor_id)
  let diario_id: string | null = null
  if (primerCV?.caja_id && primerCV?.tipo) {
    const tipoDiario = primerCV.tipo === "efectivo" ? "efectivo" : "banco_cheques"
    const { data: d } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("caja_id", primerCV.caja_id)
      .eq("tipo", tipoDiario)
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (d) diario_id = d.id
  }
  if (!diario_id) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("tipo", "general")
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (gen) diario_id = gen.id
  }
  if (!diario_id) return { ok: false, error: "No se encontró diario contable (ni para la caja ni General)." }

  const fechaDate = ajuste.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const lineas: Linea[] = []
  let orden = 0

  for (const v of vals as any[]) {
    const cv = cvById.get(v.valor_id)
    const importe = Math.round(Number(v.importe ?? 0) * 100) / 100
    if (importe <= 0) continue
    const desc = `Ajuste ${v.valor_nombre} — ${ajuste.concepto_nombre}`
    if (v.tipo_movimiento === "entrada") {
      // Sobrante: la caja sube → DEBE caja, HABER contrapartida
      lineas.push({
        cuenta_id: cv.cuenta_debe.id, cuenta_codigo: cv.cuenta_debe.codigo, cuenta_nombre: cv.cuenta_debe.nombre,
        debe: importe, haber: 0, descripcion: desc, orden: orden++,
      })
      lineas.push({
        cuenta_id: cuentaContra.id, cuenta_codigo: cuentaContra.codigo, cuenta_nombre: cuentaContra.nombre,
        debe: 0, haber: importe, descripcion: ajuste.concepto_nombre, orden: orden++,
      })
    } else {
      // Faltante: la caja baja → DEBE contrapartida (gasto), HABER caja
      lineas.push({
        cuenta_id: cuentaContra.id, cuenta_codigo: cuentaContra.codigo, cuenta_nombre: cuentaContra.nombre,
        debe: importe, haber: 0, descripcion: ajuste.concepto_nombre, orden: orden++,
      })
      lineas.push({
        cuenta_id: cv.cuenta_haber.id, cuenta_codigo: cv.cuenta_haber.codigo, cuenta_nombre: cv.cuenta_haber.nombre,
        debe: 0, haber: importe, descripcion: desc, orden: orden++,
      })
    }
  }

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    return { ok: false, error: `Asiento desbalanceado: debe=${totalDebe.toFixed(2)}, haber=${totalHaber.toFixed(2)}.` }
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Ajuste de Caja ${ajuste.numero} — ${ajuste.concepto_nombre}`,
      referencia: ajuste.numero,
      comprobante_tipo: "ajuste_caja",
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Depósito Bancario ───────────────────────────────────────────────────────
// Caja (efectivo) → Banco. Genera:
//   DEBE  cuenta_banco           (importe total)
//   HABER cuenta_caja_valor      (una línea por cada valor depositado)
// Diario: el de la cuenta_bancaria destino.
export async function generarAsientoDepositoBancario(
  supabase: SupabaseClient,
  deposito: {
    id: string
    numero: string
    fecha: string
    cuenta_bancaria_id: string
    cuenta_bancaria_nombre: string
    caja_egreso_id: string
    caja_egreso_nombre: string
    sucursal: string | null
  }
): Promise<ResultadoAsiento> {
  const { data: diario } = await supabase
    .from("contabilidad_diarios")
    .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
    .eq("cuenta_bancaria_id", deposito.cuenta_bancaria_id)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (!diario) return { ok: false, error: `No se encontró diario contable para la cuenta bancaria. Configurá uno en Contabilidad → Diarios.` }
  const cuentaBancoId = diario.cuenta_debito_predeterminada_id ?? diario.cuenta_haber_predeterminada_id
  if (!cuentaBancoId) return { ok: false, error: `El diario del banco no tiene cuenta_debito/cuenta_haber configurada.` }
  const { data: cuentaBanco } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("id", cuentaBancoId)
    .maybeSingle()
  if (!cuentaBanco) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan de cuentas." }

  const { data: vals } = await supabase
    .from("deposito_bancario_valores")
    .select("valor_id, valor_nombre, importe")
    .eq("deposito_id", deposito.id)
  if (!vals || vals.length === 0) return { ok: false, error: "Depósito sin líneas de valor." }

  const valorIds = Array.from(new Set(vals.map((v: any) => v.valor_id).filter(Boolean)))
  if (valorIds.length === 0) return { ok: false, error: "Las líneas del depósito no tienen valor_id." }
  const { data: cajaValores } = await supabase
    .from("caja_valores")
    .select("id, nombre, cuenta_haber:cuenta_haber_id(id, codigo, nombre), cuenta_debe:cuenta_contable_id(id, codigo, nombre)")
    .in("id", valorIds)
  const cvById = new Map<string, any>()
  for (const cv of cajaValores ?? []) cvById.set(cv.id, cv)
  for (const vid of valorIds) {
    const cv = cvById.get(vid)
    if (!cv) return { ok: false, error: `Valor de caja ${vid} no encontrado.` }
    if (!cv.cuenta_haber && !cv.cuenta_debe) {
      return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta contable configurada.` }
    }
  }

  const fechaDate = deposito.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const lineas: Linea[] = []
  let orden = 0

  const total = (vals as any[]).reduce((s, v) => s + Number(v.importe ?? 0), 0)
  const totalRound = Math.round(total * 100) / 100
  if (totalRound <= 0) return { ok: false, error: "Importe total del depósito debe ser > 0." }
  lineas.push({
    cuenta_id: cuentaBanco.id, cuenta_codigo: cuentaBanco.codigo, cuenta_nombre: cuentaBanco.nombre,
    debe: totalRound, haber: 0,
    descripcion: `Depósito desde ${deposito.caja_egreso_nombre}`,
    orden: orden++,
  })

  for (const v of vals as any[]) {
    const cv = cvById.get(v.valor_id)
    const importe = Math.round(Number(v.importe ?? 0) * 100) / 100
    if (importe <= 0) continue
    const cuentaHaber = cv.cuenta_haber ?? cv.cuenta_debe
    lineas.push({
      cuenta_id: cuentaHaber.id, cuenta_codigo: cuentaHaber.codigo, cuenta_nombre: cuentaHaber.nombre,
      debe: 0, haber: importe,
      descripcion: `${v.valor_nombre} — ${deposito.caja_egreso_nombre}`,
      orden: orden++,
    })
  }

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    return { ok: false, error: `Asiento desbalanceado: debe=${totalDebe.toFixed(2)}, haber=${totalHaber.toFixed(2)}.` }
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario.id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id: diario.id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Depósito Bancario ${deposito.numero} — ${deposito.cuenta_bancaria_nombre}`,
      referencia: deposito.numero,
      comprobante_tipo: "deposito_bancario",
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Extracción Bancaria ─────────────────────────────────────────────────────
// Banco → Caja (efectivo). Genera:
//   DEBE  cuenta_caja_valor      (una línea por cada valor que entra a caja)
//   HABER cuenta_banco           (importe total)
// Diario: el de la cuenta_bancaria origen.
export async function generarAsientoExtraccionBancaria(
  supabase: SupabaseClient,
  extraccion: {
    id: string
    numero: string
    fecha: string
    cuenta_bancaria_id: string
    cuenta_bancaria_nombre: string
    caja_ingreso_id: string
    caja_ingreso_nombre: string
    sucursal: string | null
  }
): Promise<ResultadoAsiento> {
  const { data: diario } = await supabase
    .from("contabilidad_diarios")
    .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
    .eq("cuenta_bancaria_id", extraccion.cuenta_bancaria_id)
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (!diario) return { ok: false, error: `No se encontró diario contable para la cuenta bancaria. Configurá uno en Contabilidad → Diarios.` }
  const cuentaBancoId = diario.cuenta_haber_predeterminada_id ?? diario.cuenta_debito_predeterminada_id
  if (!cuentaBancoId) return { ok: false, error: `El diario del banco no tiene cuenta_debito/cuenta_haber configurada.` }
  const { data: cuentaBanco } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("id", cuentaBancoId)
    .maybeSingle()
  if (!cuentaBanco) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan de cuentas." }

  const { data: vals } = await supabase
    .from("extraccion_valores")
    .select("valor_id, valor_nombre, importe")
    .eq("extraccion_id", extraccion.id)
  if (!vals || vals.length === 0) return { ok: false, error: "Extracción sin líneas de valor." }

  const valorIds = Array.from(new Set(vals.map((v: any) => v.valor_id).filter(Boolean)))
  if (valorIds.length === 0) return { ok: false, error: "Las líneas de la extracción no tienen valor_id." }
  const { data: cajaValores } = await supabase
    .from("caja_valores")
    .select("id, nombre, cuenta_debe:cuenta_contable_id(id, codigo, nombre), cuenta_haber:cuenta_haber_id(id, codigo, nombre)")
    .in("id", valorIds)
  const cvById = new Map<string, any>()
  for (const cv of cajaValores ?? []) cvById.set(cv.id, cv)
  for (const vid of valorIds) {
    const cv = cvById.get(vid)
    if (!cv) return { ok: false, error: `Valor de caja ${vid} no encontrado.` }
    if (!cv.cuenta_debe && !cv.cuenta_haber) {
      return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta contable configurada.` }
    }
  }

  const fechaDate = extraccion.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const lineas: Linea[] = []
  let orden = 0

  for (const v of vals as any[]) {
    const cv = cvById.get(v.valor_id)
    const importe = Math.round(Number(v.importe ?? 0) * 100) / 100
    if (importe <= 0) continue
    const cuentaDebe = cv.cuenta_debe ?? cv.cuenta_haber
    lineas.push({
      cuenta_id: cuentaDebe.id, cuenta_codigo: cuentaDebe.codigo, cuenta_nombre: cuentaDebe.nombre,
      debe: importe, haber: 0,
      descripcion: `${v.valor_nombre} — ${extraccion.caja_ingreso_nombre}`,
      orden: orden++,
    })
  }

  const total = (vals as any[]).reduce((s, v) => s + Number(v.importe ?? 0), 0)
  const totalRound = Math.round(total * 100) / 100
  if (totalRound <= 0) return { ok: false, error: "Importe total de la extracción debe ser > 0." }
  lineas.push({
    cuenta_id: cuentaBanco.id, cuenta_codigo: cuentaBanco.codigo, cuenta_nombre: cuentaBanco.nombre,
    debe: 0, haber: totalRound,
    descripcion: `Extracción hacia ${extraccion.caja_ingreso_nombre}`,
    orden: orden++,
  })

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    return { ok: false, error: `Asiento desbalanceado: debe=${totalDebe.toFixed(2)}, haber=${totalHaber.toFixed(2)}.` }
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario.id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id: diario.id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Extracción Bancaria ${extraccion.numero} — ${extraccion.cuenta_bancaria_nombre}`,
      referencia: extraccion.numero,
      comprobante_tipo: "extraccion_bancaria",
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Conversión de Moneda ────────────────────────────────────────────────────
// Caja A (moneda X) → Caja B (moneda Y) dentro de la misma caja física.
// Asiento:
//   DEBE  cuenta_caja_valor_destino    (la caja destino aumenta)
//   HABER cuenta_caja_valor_origen     (la caja origen disminuye)
// Importe en ARS:
//   - si moneda_origen = ARS  → importe_origen
//   - si moneda_destino = ARS → importe_destino
//   - si ninguna = ARS        → importe_origen * cotizacion (cotización contra ARS)
// Diario: el de la caja para tipo efectivo, fallback General.
export async function generarAsientoConversionMoneda(
  supabase: SupabaseClient,
  conv: {
    id: string
    numero: string
    fecha: string
    caja_id: string
    sucursal: string | null
    valor_origen_id: string
    valor_origen_nombre: string
    valor_destino_id: string
    valor_destino_nombre: string
    moneda_origen: string
    moneda_destino: string
    importe_origen: number
    importe_destino: number
    cotizacion: number
  }
): Promise<ResultadoAsiento> {
  // Cuentas de origen y destino (caja_valores)
  const { data: cajaValores } = await supabase
    .from("caja_valores")
    .select("id, nombre, cuenta_debe:cuenta_contable_id(id, codigo, nombre), cuenta_haber:cuenta_haber_id(id, codigo, nombre)")
    .in("id", [conv.valor_origen_id, conv.valor_destino_id])
  const cvById = new Map<string, any>()
  for (const cv of cajaValores ?? []) cvById.set(cv.id, cv)
  const cvOrigen = cvById.get(conv.valor_origen_id)
  const cvDestino = cvById.get(conv.valor_destino_id)
  if (!cvOrigen || !cvDestino) return { ok: false, error: "Valores de caja no encontrados." }
  const cuentaOrigenHaber = cvOrigen.cuenta_haber ?? cvOrigen.cuenta_debe
  const cuentaDestinoDebe = cvDestino.cuenta_debe ?? cvDestino.cuenta_haber
  if (!cuentaOrigenHaber) return { ok: false, error: `El valor "${cvOrigen.nombre}" no tiene cuenta contable configurada.` }
  if (!cuentaDestinoDebe) return { ok: false, error: `El valor "${cvDestino.nombre}" no tiene cuenta contable configurada.` }

  // Diario: efectivo de la caja, fallback General.
  let diario_id: string | null = null
  const { data: d } = await supabase
    .from("contabilidad_diarios")
    .select("id")
    .eq("caja_id", conv.caja_id)
    .eq("tipo", "efectivo")
    .eq("activo", true)
    .limit(1)
    .maybeSingle()
  if (d) diario_id = d.id
  if (!diario_id) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("tipo", "general")
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (gen) diario_id = gen.id
  }
  if (!diario_id) return { ok: false, error: "No se encontró diario contable (ni para la caja ni General)." }

  // Calcular importe en ARS de cada lado por separado.
  //  - Si una moneda es ARS, su importe ya está en ARS.
  //  - Si la moneda es extranjera, multiplicamos por la cotización (la cotización
  //    es siempre ARS por unidad de moneda extranjera).
  const cot = Number(conv.cotizacion)
  if ((conv.moneda_origen !== "ARS" || conv.moneda_destino !== "ARS") && (!cot || cot <= 0)) {
    return { ok: false, error: "Cotización inválida." }
  }
  const importeARSOrigen = conv.moneda_origen === "ARS"
    ? Math.round(Number(conv.importe_origen) * 100) / 100
    : Math.round(Number(conv.importe_origen) * cot * 100) / 100
  const importeARSDestino = conv.moneda_destino === "ARS"
    ? Math.round(Number(conv.importe_destino) * 100) / 100
    : Math.round(Number(conv.importe_destino) * cot * 100) / 100
  if (importeARSOrigen <= 0 || importeARSDestino <= 0) {
    return { ok: false, error: "Importe en ARS debe ser > 0." }
  }
  // Diferencia por redondeo: si destino vale más que origen → ganancia.
  // Si destino vale menos que origen → pérdida.
  const diferenciaARS = Math.round((importeARSDestino - importeARSOrigen) * 100) / 100

  // Si hay diferencia, buscar cuenta 62010201 "Diferencia de Cambio".
  let cuentaDifCambio: { id: string; codigo: string; nombre: string } | null = null
  if (Math.abs(diferenciaARS) > 0.001) {
    const { data: cdc } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("codigo", "62010201")
      .maybeSingle()
    if (!cdc) return { ok: false, error: "Para registrar la diferencia por redondeo, falta la cuenta 62010201 (Diferencia de Cambio) en el plan de cuentas." }
    cuentaDifCambio = cdc
  }

  const fechaDate = conv.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const lineas: Linea[] = [
    {
      cuenta_id: cuentaDestinoDebe.id, cuenta_codigo: cuentaDestinoDebe.codigo, cuenta_nombre: cuentaDestinoDebe.nombre,
      debe: importeARSDestino, haber: 0,
      descripcion: `Conversión: ingreso ${conv.valor_destino_nombre}`,
      orden: 0,
    },
    {
      cuenta_id: cuentaOrigenHaber.id, cuenta_codigo: cuentaOrigenHaber.codigo, cuenta_nombre: cuentaOrigenHaber.nombre,
      debe: 0, haber: importeARSOrigen,
      descripcion: `Conversión: egreso ${conv.valor_origen_nombre}`,
      orden: 1,
    },
  ]
  if (cuentaDifCambio && Math.abs(diferenciaARS) > 0.001) {
    if (diferenciaARS > 0) {
      // Destino vale más que origen → ganancia (HABER diferencia de cambio)
      lineas.push({
        cuenta_id: cuentaDifCambio.id, cuenta_codigo: cuentaDifCambio.codigo, cuenta_nombre: cuentaDifCambio.nombre,
        debe: 0, haber: diferenciaARS,
        descripcion: `Diferencia por redondeo conversión ${conv.numero}`,
        orden: 2,
      })
    } else {
      // Destino vale menos que origen → pérdida (DEBE diferencia de cambio)
      lineas.push({
        cuenta_id: cuentaDifCambio.id, cuenta_codigo: cuentaDifCambio.codigo, cuenta_nombre: cuentaDifCambio.nombre,
        debe: Math.abs(diferenciaARS), haber: 0,
        descripcion: `Diferencia por redondeo conversión ${conv.numero}`,
        orden: 2,
      })
    }
  }

  const totalDebe = lineas.reduce((s, l) => s + l.debe, 0)
  const totalHaber = lineas.reduce((s, l) => s + l.haber, 0)
  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    return { ok: false, error: `Asiento desbalanceado: debe=${totalDebe.toFixed(2)}, haber=${totalHaber.toFixed(2)}.` }
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asiento, error: asientoErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Conversión ${conv.numero} — ${conv.moneda_origen} → ${conv.moneda_destino}`,
      referencia: conv.numero,
      comprobante_tipo: "conversion_moneda",
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento: ${asientoErr.message}` }

  const { error: linErr } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineas.map(l => ({ ...l, asiento_id: asiento.id })))
  if (linErr) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErr.message}` }
  }

  return { ok: true, asiento_id: asiento.id }
}

// ─── Alta de Préstamo ────────────────────────────────────────────────────────
// Al confirmar el préstamo se levanta TODA la deuda (capital + intereses
// futuros del cronograma). Los intereses se contabilizan como "Intereses a
// devengar" (activo transitorio) y se consumirán mes a mes a medida que se
// paguen las cuotas.
//
//   DEBE  cuenta_caja_valor       (capital recibido)
//   DEBE  cuenta_intereses_devengar (total intereses futuros, casillero futuro)
//   HABER cuenta_prestamo          (capital + intereses totales = deuda total)
//
// Si moneda != ARS, todo se multiplica por la cotización para registrar en ARS.
// Si es preexistente y sin caja, va a cuenta_preexistente (puente).
// Si intereses_total = 0, se omite la línea de intereses a devengar.
export async function generarAsientoAltaPrestamo(
  supabase: SupabaseClient,
  prestamo: {
    id: string
    numero: string
    fecha: string
    caja_id: string | null
    cuenta_bancaria_acreditacion_id: string | null
    cuenta_bancaria_acreditacion_nombre: string | null
    moneda: string
    cotizacion: number | null
    importe: number // importe_acreditado o capital
    intereses_total: number // suma de los intereses de TODAS las cuotas
    cuenta_prestamo: string  // "CODIGO Nombre"
    cuenta_preexistente: string | null
    cuenta_intereses_devengar: string | null // "CODIGO Nombre" — requerida si hay intereses
    es_preexistente: boolean
    entidad_nombre: string
  }
): Promise<ResultadoAsiento> {
  const moneda = prestamo.moneda || "ARS"
  const cot = Number(prestamo.cotizacion ?? 0)
  if (moneda !== "ARS" && cot <= 0) {
    return { ok: false, error: `Falta la cotización para registrar el asiento en ${moneda}.` }
  }
  const aARS = (n: number) => moneda === "ARS" ? n : Math.round(n * cot * 100) / 100

  // Cuenta pasivo (préstamo)
  const codigoP = (prestamo.cuenta_prestamo || "").trim().split(/\s+/)[0]
  if (!codigoP) return { ok: false, error: "Falta cuenta contable del préstamo (configurala en Tipos de Préstamo)." }
  const { data: cuentaPrestamo } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("codigo", codigoP)
    .maybeSingle()
  if (!cuentaPrestamo) return { ok: false, error: `Cuenta contable "${codigoP}" del préstamo no encontrada en el plan.` }

  // Cuenta del lado DEBE: caja_valor (efectivo de la caja) o cuenta_preexistente
  let cuentaDebe: { id: string; codigo: string; nombre: string } | null = null
  let valorNombre = prestamo.entidad_nombre
  let diario_id: string | null = null

  if (prestamo.cuenta_bancaria_acreditacion_id && !prestamo.es_preexistente) {
    // Acreditación en cuenta bancaria propia
    const { data: dBanco } = await supabase
      .from("contabilidad_diarios")
      .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
      .eq("cuenta_bancaria_id", prestamo.cuenta_bancaria_acreditacion_id)
      .eq("activo", true).limit(1).maybeSingle()
    const cuentaBancoId = dBanco?.cuenta_debito_predeterminada_id ?? dBanco?.cuenta_haber_predeterminada_id ?? null
    if (!cuentaBancoId) return { ok: false, error: `Falta cuenta contable del banco "${prestamo.cuenta_bancaria_acreditacion_nombre}". Configurala en Contabilidad → Diarios.` }
    const { data: cuentaBancoPC } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("id", cuentaBancoId)
      .maybeSingle()
    if (!cuentaBancoPC) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan." }
    cuentaDebe = cuentaBancoPC
    valorNombre = prestamo.cuenta_bancaria_acreditacion_nombre || "Cuenta bancaria"
    if (dBanco) diario_id = dBanco.id
  } else if (prestamo.caja_id && !prestamo.es_preexistente) {
    // Acreditación en caja efectivo
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("id, nombre, cuenta_debe:cuenta_contable_id(id, codigo, nombre), cuenta_haber:cuenta_haber_id(id, codigo, nombre)")
      .eq("caja_id", prestamo.caja_id)
      .eq("moneda", moneda)
      .eq("tipo", "efectivo")
      .limit(1)
      .maybeSingle()
    if (!cv) return { ok: false, error: `No hay valor de caja en ${moneda} efectivo en la caja del préstamo.` }
    const c = (cv as any).cuenta_debe ?? (cv as any).cuenta_haber
    if (!c) return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta contable configurada.` }
    cuentaDebe = c
    valorNombre = cv.nombre

    const { data: d } = await supabase
      .from("contabilidad_diarios")
      .select("id").eq("caja_id", prestamo.caja_id).eq("tipo", "efectivo").eq("activo", true).limit(1).maybeSingle()
    if (d) diario_id = d.id
  } else {
    // Preexistente: usar cuenta_preexistente (cuenta puente)
    const codigoPre = (prestamo.cuenta_preexistente || "").trim().split(/\s+/)[0]
    if (!codigoPre) return { ok: false, error: "Préstamo preexistente sin caja: falta cuenta_preexistente en el tipo de préstamo." }
    const { data: cuentaPre } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("codigo", codigoPre)
      .maybeSingle()
    if (!cuentaPre) return { ok: false, error: `Cuenta puente "${codigoPre}" no encontrada en el plan.` }
    cuentaDebe = cuentaPre
  }

  // Fallback diario
  if (!diario_id) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id").eq("tipo", "general").eq("activo", true).limit(1).maybeSingle()
    if (gen) diario_id = gen.id
  }
  if (!diario_id) return { ok: false, error: "No se encontró diario contable (ni de la caja ni General)." }

  const importeARS = aARS(Number(prestamo.importe))
  if (importeARS <= 0) return { ok: false, error: "Importe del préstamo debe ser > 0." }
  const intereses = Math.round(Number(prestamo.intereses_total || 0) * 100) / 100
  const interesesARS = aARS(intereses)
  const totalDeudaARS = Math.round((importeARS + interesesARS) * 100) / 100

  // Cuenta de intereses a devengar (requerida si hay intereses)
  let cuentaIntDev: { id: string; codigo: string; nombre: string } | null = null
  if (intereses > 0) {
    const codigoID = (prestamo.cuenta_intereses_devengar || "").trim().split(/\s+/)[0]
    if (!codigoID) return { ok: false, error: "Falta cuenta 'Intereses a devengar' en el Tipo de Préstamo (necesaria para levantar la deuda total)." }
    const { data: ci } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("codigo", codigoID)
      .maybeSingle()
    if (!ci) return { ok: false, error: `Cuenta "${codigoID}" (intereses a devengar) no encontrada en el plan.` }
    cuentaIntDev = ci
  }

  const fechaDate = prestamo.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type LineaAP = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  const lineasAP: LineaAP[] = []
  let ordAP = 0
  // DEBE Caja
  lineasAP.push({
    cuenta_id: cuentaDebe!.id, cuenta_codigo: cuentaDebe!.codigo, cuenta_nombre: cuentaDebe!.nombre,
    debe: importeARS, haber: 0,
    descripcion: `Alta préstamo ${prestamo.numero} — ${valorNombre}`,
    orden: ordAP++,
    importe_moneda_original: moneda !== "ARS" ? Number(prestamo.importe) : null,
  })
  // DEBE Intereses a devengar (si hay)
  if (cuentaIntDev && interesesARS > 0) {
    lineasAP.push({
      cuenta_id: cuentaIntDev.id, cuenta_codigo: cuentaIntDev.codigo, cuenta_nombre: cuentaIntDev.nombre,
      debe: interesesARS, haber: 0,
      descripcion: `Intereses futuros préstamo ${prestamo.numero}`,
      orden: ordAP++,
      importe_moneda_original: moneda !== "ARS" ? intereses : null,
    })
  }
  // HABER Préstamo (deuda total = capital + intereses)
  lineasAP.push({
    cuenta_id: cuentaPrestamo.id, cuenta_codigo: cuentaPrestamo.codigo, cuenta_nombre: cuentaPrestamo.nombre,
    debe: 0, haber: totalDeudaARS,
    descripcion: `Deuda préstamo ${prestamo.numero} — ${prestamo.entidad_nombre}`,
    orden: ordAP++,
    importe_moneda_original: moneda !== "ARS" ? Number(prestamo.importe) + intereses : null,
  })

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asientoAP, error: aErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Alta préstamo ${prestamo.numero} — ${prestamo.entidad_nombre}`,
      referencia: prestamo.numero,
      comprobante_tipo: "prestamo_alta",
      moneda_original: moneda,
      cotizacion_aplicada: moneda !== "ARS" ? cot : null,
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (aErr) return { ok: false, error: `Error al crear asiento: ${aErr.message}` }

  const { error: linAP } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasAP.map(l => ({ ...l, asiento_id: asientoAP.id })))
  if (linAP) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoAP.id)
    return { ok: false, error: `Error en líneas del asiento: ${linAP.message}` }
  }

  return { ok: true, asiento_id: asientoAP.id }
}

// ─── Pago de Cuota de Préstamo ───────────────────────────────────────────────
// Bajo el modelo de "Opción A" (deuda total al alta):
//   DEBE  cuenta_prestamo            (TOTAL cuota — baja la deuda íntegra)
//   HABER cuenta_caja_valor          (TOTAL cuota — sale plata)
// Y reconocimiento del gasto del mes (consume el casillero "intereses a devengar"):
//   DEBE  cuenta_intereses           (parte interés — pasa a ser gasto del período)
//   HABER cuenta_intereses_devengar  (parte interés — sale del activo)
export async function generarAsientoPagoCuotaPrestamo(
  supabase: SupabaseClient,
  pago: {
    prestamo_id: string
    prestamo_numero: string
    numero_cuota: number
    fecha: string
    // Origen del pago: caja efectivo (valor_id) o cuenta bancaria (cuenta_bancaria_id).
    caja_id: string | null
    valor_id: string | null
    valor_nombre: string
    cuenta_bancaria_id: string | null
    cuenta_bancaria_nombre: string | null
    moneda: string
    cotizacion: number | null
    capital: number
    interes: number
    total: number
    cuenta_prestamo: string                  // "CODIGO Nombre"
    cuenta_intereses: string                 // "CODIGO Nombre" — cuenta de gasto
    cuenta_intereses_devengar: string | null // "CODIGO Nombre" — activo transitorio
    entidad_nombre: string
  }
): Promise<ResultadoAsiento> {
  const moneda = pago.moneda || "ARS"
  const cot = Number(pago.cotizacion ?? 0)
  if (moneda !== "ARS" && cot <= 0) {
    return { ok: false, error: `Falta la cotización para registrar el asiento en ${moneda}.` }
  }
  const aARS = (n: number) => moneda === "ARS" ? n : Math.round(n * cot * 100) / 100

  // Cuentas
  const codPres = (pago.cuenta_prestamo || "").trim().split(/\s+/)[0]
  const codInt = (pago.cuenta_intereses || "").trim().split(/\s+/)[0]
  const codIntDev = (pago.cuenta_intereses_devengar || "").trim().split(/\s+/)[0]
  if (!codPres) return { ok: false, error: "Falta cuenta contable del préstamo en el tipo de préstamo." }
  if (Number(pago.interes) > 0 && !codInt) return { ok: false, error: "Falta cuenta de intereses (gasto) en el tipo de préstamo." }
  if (Number(pago.interes) > 0 && !codIntDev) return { ok: false, error: "Falta cuenta 'Intereses a devengar' en el tipo de préstamo." }

  const codigos = [codPres, codInt, codIntDev].filter(Boolean)
  const { data: ctas } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("codigo", codigos)
  const byCodigo = new Map<string, { id: string; codigo: string; nombre: string }>()
  for (const c of ctas ?? []) byCodigo.set(c.codigo, c as any)
  const cuentaPrestamoPC = byCodigo.get(codPres)
  if (!cuentaPrestamoPC) return { ok: false, error: `Cuenta "${codPres}" del préstamo no encontrada en el plan.` }
  const cuentaIntPC = codInt ? byCodigo.get(codInt) : null
  if (codInt && !cuentaIntPC) return { ok: false, error: `Cuenta "${codInt}" (gasto intereses) no encontrada en el plan.` }
  const cuentaIntDevPC = codIntDev ? byCodigo.get(codIntDev) : null
  if (codIntDev && !cuentaIntDevPC) return { ok: false, error: `Cuenta "${codIntDev}" (intereses a devengar) no encontrada en el plan.` }

  // Cuenta del HABER (origen del pago): caja_valor o banco
  let cuentaCajaPC: { id: string; codigo: string; nombre: string } | null = null
  let nombreOrigen = pago.valor_nombre
  let diarioId: string | null = null

  if (pago.cuenta_bancaria_id) {
    // Pago desde cuenta bancaria
    const { data: dB } = await supabase
      .from("contabilidad_diarios")
      .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
      .eq("cuenta_bancaria_id", pago.cuenta_bancaria_id)
      .eq("activo", true).limit(1).maybeSingle()
    const idCB = dB?.cuenta_haber_predeterminada_id ?? dB?.cuenta_debito_predeterminada_id ?? null
    if (!idCB) return { ok: false, error: `Falta cuenta contable del banco "${pago.cuenta_bancaria_nombre}". Configurala en Contabilidad → Diarios.` }
    const { data: ctaB } = await supabase
      .from("contabilidad_plan_cuentas").select("id, codigo, nombre").eq("id", idCB).maybeSingle()
    if (!ctaB) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan." }
    cuentaCajaPC = ctaB
    nombreOrigen = pago.cuenta_bancaria_nombre || "Cuenta bancaria"
    if (dB) diarioId = dB.id
  } else if (pago.valor_id) {
    // Pago desde caja efectivo
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("id, nombre, cuenta_haber:cuenta_haber_id(id, codigo, nombre), cuenta_debe:cuenta_contable_id(id, codigo, nombre)")
      .eq("id", pago.valor_id)
      .maybeSingle()
    if (!cv) return { ok: false, error: "Valor de caja no encontrado." }
    const c = (cv as any).cuenta_haber ?? (cv as any).cuenta_debe
    if (!c) return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta contable configurada.` }
    cuentaCajaPC = c
    nombreOrigen = cv.nombre

    if (pago.caja_id) {
      const { data: d } = await supabase
        .from("contabilidad_diarios")
        .select("id").eq("caja_id", pago.caja_id).eq("tipo", "efectivo").eq("activo", true).limit(1).maybeSingle()
      if (d) diarioId = d.id
    }
  } else {
    return { ok: false, error: "Falta indicar el origen del pago (caja o cuenta bancaria)." }
  }
  // Fallback diario General
  if (!diarioId) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id").eq("tipo", "general").eq("activo", true).limit(1).maybeSingle()
    if (gen) diarioId = gen.id
  }
  if (!diarioId) return { ok: false, error: "No se encontró diario contable (ni de la caja ni General)." }

  const capitalARS = aARS(Number(pago.capital))
  const interesARS = aARS(Number(pago.interes))
  const totalARS = capitalARS + interesARS
  if (totalARS <= 0) return { ok: false, error: "Importe total del pago debe ser > 0." }

  const fechaDate = pago.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type LineaPCu = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  const lineasPCu: LineaPCu[] = []
  let ord = 0
  // (1) DEBE Préstamo por TOTAL cuota (baja toda la deuda de esa cuota — incluye capital + intereses)
  lineasPCu.push({
    cuenta_id: cuentaPrestamoPC.id, cuenta_codigo: cuentaPrestamoPC.codigo, cuenta_nombre: cuentaPrestamoPC.nombre,
    debe: totalARS, haber: 0,
    descripcion: `Cuota ${pago.numero_cuota} préstamo ${pago.prestamo_numero} — cancela deuda`,
    orden: ord++,
    importe_moneda_original: moneda !== "ARS" ? Number(pago.total) : null,
  })
  // (2) HABER Caja/Banco por TOTAL cuota
  if (!cuentaCajaPC) return { ok: false, error: "No se resolvió la cuenta del origen del pago." }
  lineasPCu.push({
    cuenta_id: cuentaCajaPC.id, cuenta_codigo: cuentaCajaPC.codigo, cuenta_nombre: cuentaCajaPC.nombre,
    debe: 0, haber: totalARS,
    descripcion: `Egreso ${nombreOrigen} — cuota ${pago.numero_cuota} préstamo ${pago.prestamo_numero}`,
    orden: ord++,
    importe_moneda_original: moneda !== "ARS" ? Number(pago.total) : null,
  })
  // (3) Reconocimiento del interés como gasto del mes (consume el casillero):
  //     DEBE Intereses (gasto)   /   HABER Intereses a devengar (activo transitorio)
  if (interesARS > 0 && cuentaIntPC && cuentaIntDevPC) {
    lineasPCu.push({
      cuenta_id: cuentaIntPC.id, cuenta_codigo: cuentaIntPC.codigo, cuenta_nombre: cuentaIntPC.nombre,
      debe: interesARS, haber: 0,
      descripcion: `Interés devengado cuota ${pago.numero_cuota} préstamo ${pago.prestamo_numero}`,
      orden: ord++,
      importe_moneda_original: moneda !== "ARS" ? Number(pago.interes) : null,
    })
    lineasPCu.push({
      cuenta_id: cuentaIntDevPC.id, cuenta_codigo: cuentaIntDevPC.codigo, cuenta_nombre: cuentaIntDevPC.nombre,
      debe: 0, haber: interesARS,
      descripcion: `Consumo intereses a devengar cuota ${pago.numero_cuota} préstamo ${pago.prestamo_numero}`,
      orden: ord++,
      importe_moneda_original: moneda !== "ARS" ? Number(pago.interes) : null,
    })
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diarioId, p_fecha: fechaDate })

  const { data: asientoPCu, error: aErrPCu } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id: diarioId,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Pago cuota ${pago.numero_cuota} préstamo ${pago.prestamo_numero} — ${pago.entidad_nombre}`,
      referencia: pago.prestamo_numero,
      comprobante_tipo: "prestamo_pago_cuota",
      moneda_original: moneda,
      cotizacion_aplicada: moneda !== "ARS" ? cot : null,
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (aErrPCu) return { ok: false, error: `Error al crear asiento: ${aErrPCu.message}` }

  const { error: linPCu } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasPCu.map(l => ({ ...l, asiento_id: asientoPCu.id })))
  if (linPCu) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoPCu.id)
    return { ok: false, error: `Error en líneas del asiento: ${linPCu.message}` }
  }

  return { ok: true, asiento_id: asientoPCu.id }
}

// ─── Extensión de Cronograma de Préstamo Perpetuo ────────────────────────────
// Cuando se agregan N cuotas más a un préstamo perpetuo, se "compromete" más
// interés futuro → la deuda crece.
//   DEBE  cuenta_intereses_devengar (suma intereses de las nuevas cuotas)
//   HABER cuenta_prestamo          (deuda crece por el mismo monto)
export async function generarAsientoExtensionCronograma(
  supabase: SupabaseClient,
  ext: {
    prestamo_id: string
    prestamo_numero: string
    fecha: string
    caja_id: string | null
    moneda: string
    cotizacion: number | null
    intereses_adicionales: number
    cuenta_prestamo: string                  // "CODIGO Nombre"
    cuenta_intereses_devengar: string        // "CODIGO Nombre"
    entidad_nombre: string
  }
): Promise<ResultadoAsiento> {
  const moneda = ext.moneda || "ARS"
  const cot = Number(ext.cotizacion ?? 0)
  if (moneda !== "ARS" && cot <= 0) {
    return { ok: false, error: `Falta la cotización para registrar el asiento en ${moneda}.` }
  }
  const aARS = (n: number) => moneda === "ARS" ? n : Math.round(n * cot * 100) / 100

  const codPres = (ext.cuenta_prestamo || "").trim().split(/\s+/)[0]
  const codIntDev = (ext.cuenta_intereses_devengar || "").trim().split(/\s+/)[0]
  if (!codPres) return { ok: false, error: "Falta cuenta del préstamo en el tipo de préstamo." }
  if (!codIntDev) return { ok: false, error: "Falta cuenta 'Intereses a devengar' en el tipo de préstamo." }

  const { data: ctasExt } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("codigo", [codPres, codIntDev])
  const byCodigoExt = new Map<string, { id: string; codigo: string; nombre: string }>()
  for (const c of ctasExt ?? []) byCodigoExt.set(c.codigo, c as any)
  const cuentaPrestamoExt = byCodigoExt.get(codPres)
  const cuentaIntDevExt = byCodigoExt.get(codIntDev)
  if (!cuentaPrestamoExt) return { ok: false, error: `Cuenta "${codPres}" no encontrada en el plan.` }
  if (!cuentaIntDevExt) return { ok: false, error: `Cuenta "${codIntDev}" no encontrada en el plan.` }

  const interesesARSExt = aARS(Number(ext.intereses_adicionales))
  if (interesesARSExt <= 0) return { ok: false, error: "Intereses adicionales debe ser > 0." }

  // Diario: del préstamo (caja) o General
  let diarioExtId: string | null = null
  if (ext.caja_id) {
    const { data: dx } = await supabase
      .from("contabilidad_diarios").select("id")
      .eq("caja_id", ext.caja_id).eq("tipo", "efectivo").eq("activo", true).limit(1).maybeSingle()
    if (dx) diarioExtId = dx.id
  }
  if (!diarioExtId) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios").select("id").eq("tipo", "general").eq("activo", true).limit(1).maybeSingle()
    if (gen) diarioExtId = gen.id
  }
  if (!diarioExtId) return { ok: false, error: "No se encontró diario contable (ni de la caja ni General)." }

  const fechaDateExt = ext.fecha.split("T")[0]
  const { data: periodo_id_ext } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDateExt })

  type LineaExt = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  const lineasExt: LineaExt[] = [
    {
      cuenta_id: cuentaIntDevExt.id, cuenta_codigo: cuentaIntDevExt.codigo, cuenta_nombre: cuentaIntDevExt.nombre,
      debe: interesesARSExt, haber: 0,
      descripcion: `Extensión cronograma préstamo ${ext.prestamo_numero} — intereses futuros`,
      orden: 0,
      importe_moneda_original: moneda !== "ARS" ? Number(ext.intereses_adicionales) : null,
    },
    {
      cuenta_id: cuentaPrestamoExt.id, cuenta_codigo: cuentaPrestamoExt.codigo, cuenta_nombre: cuentaPrestamoExt.nombre,
      debe: 0, haber: interesesARSExt,
      descripcion: `Extensión cronograma préstamo ${ext.prestamo_numero} — deuda adicional`,
      orden: 1,
      importe_moneda_original: moneda !== "ARS" ? Number(ext.intereses_adicionales) : null,
    },
  ]

  const { data: numeroExt } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diarioExtId, p_fecha: fechaDateExt })

  const { data: asientoExt, error: aErrExt } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numeroExt ?? null,
      diario_id: diarioExtId,
      periodo_id: periodo_id_ext ?? null,
      fecha: fechaDateExt,
      sucursal_id: null,
      concepto: `Extensión cronograma préstamo ${ext.prestamo_numero} — ${ext.entidad_nombre}`,
      referencia: ext.prestamo_numero,
      comprobante_tipo: "prestamo_extension",
      moneda_original: moneda,
      cotizacion_aplicada: moneda !== "ARS" ? cot : null,
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (aErrExt) return { ok: false, error: `Error al crear asiento: ${aErrExt.message}` }

  const { error: linErrExt } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasExt.map(l => ({ ...l, asiento_id: asientoExt.id })))
  if (linErrExt) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoExt.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErrExt.message}` }
  }

  return { ok: true, asiento_id: asientoExt.id }
}

// ─── Pago de Capital de Préstamo ─────────────────────────────────────────────
// Amortización extraordinaria de capital (fuera de cronograma).
//   DEBE  cuenta_prestamo (pasivo baja)
//   HABER cuenta_caja_valor (caja sale)
// La cuenta_prestamo viene del tipo_prestamo (formato "CODIGO Nombre").
// Diario: el de la caja (efectivo) usada para pagar; fallback General.
export async function generarAsientoPagoCapitalPrestamo(
  supabase: SupabaseClient,
  pago: {
    prestamo_id: string
    prestamo_numero: string
    fecha: string
    // Origen del pago: caja efectivo (valor_id) o cuenta bancaria (cuenta_bancaria_id).
    caja_id: string | null
    valor_id: string | null
    valor_nombre: string
    cuenta_bancaria_id: string | null
    cuenta_bancaria_nombre: string | null
    moneda: string
    cotizacion: number | null
    importe: number
    cuenta_prestamo: string // formato "CODIGO Nombre" o solo "CODIGO"
    // Intereses futuros que dejan de aplicar (porque las cuotas pendientes se
    // recalcularon con menos capital o pasaron a 0). Si > 0, se agrega:
    //   DEBE Préstamo (extra)  /  HABER Intereses a devengar
    diff_intereses_devengar: number
    cuenta_intereses_devengar: string | null // requerido si diff_intereses_devengar > 0
    concepto: string
  }
): Promise<ResultadoAsiento> {
  const moneda = pago.moneda || "ARS"
  const cot = Number(pago.cotizacion ?? 0)
  if (moneda !== "ARS" && cot <= 0) {
    return { ok: false, error: `Falta la cotización para registrar el asiento en ${moneda}.` }
  }
  const aARS = (n: number) => moneda === "ARS" ? n : Math.round(n * cot * 100) / 100

  // Cuenta de pasivo (préstamo). El campo viene como "CODIGO Nombre".
  const codigoPrestamo = (pago.cuenta_prestamo || "").trim().split(/\s+/)[0]
  if (!codigoPrestamo) return { ok: false, error: "Falta cuenta contable del préstamo (configurala en Tipos de Préstamo)." }
  const { data: cuentaPrestamo } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .eq("codigo", codigoPrestamo)
    .maybeSingle()
  if (!cuentaPrestamo) return { ok: false, error: `Cuenta contable "${codigoPrestamo}" del préstamo no encontrada en el plan.` }

  // Cuenta del HABER: caja_valor o banco
  let cuentaCaja: { id: string; codigo: string; nombre: string } | null = null
  let nombreOrigen = pago.valor_nombre
  let diario_id: string | null = null

  if (pago.cuenta_bancaria_id) {
    // Pago desde cuenta bancaria
    const { data: dB } = await supabase
      .from("contabilidad_diarios")
      .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
      .eq("cuenta_bancaria_id", pago.cuenta_bancaria_id)
      .eq("activo", true).limit(1).maybeSingle()
    const idCB = dB?.cuenta_haber_predeterminada_id ?? dB?.cuenta_debito_predeterminada_id ?? null
    if (!idCB) return { ok: false, error: `Falta cuenta contable del banco "${pago.cuenta_bancaria_nombre}". Configurala en Contabilidad → Diarios.` }
    const { data: ctaB } = await supabase
      .from("contabilidad_plan_cuentas").select("id, codigo, nombre").eq("id", idCB).maybeSingle()
    if (!ctaB) return { ok: false, error: "Cuenta contable del banco no encontrada en el plan." }
    cuentaCaja = ctaB
    nombreOrigen = pago.cuenta_bancaria_nombre || "Cuenta bancaria"
    if (dB) diario_id = dB.id
  } else if (pago.valor_id) {
    // Pago desde caja efectivo
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("id, nombre, cuenta_haber:cuenta_haber_id(id, codigo, nombre), cuenta_debe:cuenta_contable_id(id, codigo, nombre)")
      .eq("id", pago.valor_id)
      .maybeSingle()
    if (!cv) return { ok: false, error: "Valor de caja no encontrado." }
    const c = (cv as any).cuenta_haber ?? (cv as any).cuenta_debe
    if (!c) return { ok: false, error: `El valor "${cv.nombre}" no tiene cuenta contable configurada.` }
    cuentaCaja = c
    nombreOrigen = cv.nombre

    if (pago.caja_id) {
      const { data: d } = await supabase
        .from("contabilidad_diarios")
        .select("id").eq("caja_id", pago.caja_id).eq("tipo", "efectivo").eq("activo", true).limit(1).maybeSingle()
      if (d) diario_id = d.id
    }
  } else {
    return { ok: false, error: "Falta indicar el origen del pago (caja o cuenta bancaria)." }
  }
  if (!diario_id) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id").eq("tipo", "general").eq("activo", true).limit(1).maybeSingle()
    if (gen) diario_id = gen.id
  }
  if (!diario_id) return { ok: false, error: "No se encontró diario contable (ni de la caja ni General)." }

  const importe = Math.round(Number(pago.importe) * 100) / 100
  if (importe <= 0) return { ok: false, error: "Importe debe ser > 0." }

  const fechaDate = pago.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  if (!cuentaCaja) return { ok: false, error: "No se resolvió la cuenta del origen del pago." }
  const importeARS = aARS(importe)
  const diffInt = Math.round(Number(pago.diff_intereses_devengar || 0) * 100) / 100
  const diffIntARS = aARS(diffInt)

  // Si hay diferencia de intereses a devengar, necesitamos la cuenta
  let cuentaIntDev: { id: string; codigo: string; nombre: string } | null = null
  if (diffInt > 0.001) {
    const codIntDev = (pago.cuenta_intereses_devengar || "").trim().split(/\s+/)[0]
    if (!codIntDev) return { ok: false, error: "Falta cuenta 'Intereses a devengar' en el Tipo de Préstamo (necesaria para cancelar intereses futuros del casillero)." }
    const { data: cid } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .eq("codigo", codIntDev)
      .maybeSingle()
    if (!cid) return { ok: false, error: `Cuenta "${codIntDev}" (intereses a devengar) no encontrada en el plan.` }
    cuentaIntDev = cid
  }

  type LineaPC = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
    importe_moneda_original?: number | null
  }
  // DEBE Préstamo por (capital + diff_intereses_devengar)
  const totalDebePrestamoARS = Math.round((importeARS + diffIntARS) * 100) / 100
  const lineasPC: LineaPC[] = [
    {
      cuenta_id: cuentaPrestamo.id, cuenta_codigo: cuentaPrestamo.codigo, cuenta_nombre: cuentaPrestamo.nombre,
      debe: totalDebePrestamoARS, haber: 0,
      descripcion: `Pago capital préstamo ${pago.prestamo_numero}${diffInt > 0 ? " (incluye cancelación intereses futuros)" : ""}`,
      orden: 0,
      importe_moneda_original: moneda !== "ARS" ? (importe + diffInt) : null,
    },
    {
      cuenta_id: cuentaCaja.id, cuenta_codigo: cuentaCaja.codigo, cuenta_nombre: cuentaCaja.nombre,
      debe: 0, haber: importeARS,
      descripcion: `Egreso ${nombreOrigen} — capital préstamo ${pago.prestamo_numero}`,
      orden: 1,
      importe_moneda_original: moneda !== "ARS" ? importe : null,
    },
  ]
  if (cuentaIntDev && diffIntARS > 0) {
    lineasPC.push({
      cuenta_id: cuentaIntDev.id, cuenta_codigo: cuentaIntDev.codigo, cuenta_nombre: cuentaIntDev.nombre,
      debe: 0, haber: diffIntARS,
      descripcion: `Cancelación intereses futuros préstamo ${pago.prestamo_numero}`,
      orden: 2,
      importe_moneda_original: moneda !== "ARS" ? diffInt : null,
    })
  }

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diario_id, p_fecha: fechaDate })

  const { data: asientoPC, error: aErr } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Pago capital préstamo ${pago.prestamo_numero} — ${pago.concepto}`,
      referencia: pago.prestamo_numero,
      comprobante_tipo: "prestamo_pago_capital",
      moneda_original: moneda,
      cotizacion_aplicada: moneda !== "ARS" ? cot : null,
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (aErr) return { ok: false, error: `Error al crear asiento: ${aErr.message}` }

  const { error: linErrPC } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasPC.map(l => ({ ...l, asiento_id: asientoPC.id })))
  if (linErrPC) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoPC.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErrPC.message}` }
  }

  return { ok: true, asiento_id: asientoPC.id }
}

// ─── Transferencia Bancaria ──────────────────────────────────────────────────
// Cuenta Bancaria A → Cuenta Bancaria B (misma moneda).
// Asiento:
//   DEBE  cuenta_banco_destino
//   HABER cuenta_banco_origen
// Diario: el de la cuenta_bancaria origen.
export async function generarAsientoTransferenciaBancaria(
  supabase: SupabaseClient,
  tr: {
    id: string
    numero: string
    fecha: string
    desde_cuenta_id: string
    desde_cuenta_nombre: string
    hasta_cuenta_id: string
    hasta_cuenta_nombre: string
    importe: number
  }
): Promise<ResultadoAsiento> {
  // Resolver cuenta contable del banco con fallback: primero diario, sino caja_valor.
  const resolverCuentaBanco = async (cuenta_bancaria_id: string, nombre: string): Promise<{ ok: true; diario_id: string | null; cuenta_id: string } | { ok: false; error: string }> => {
    const { data: diario } = await supabase
      .from("contabilidad_diarios")
      .select("id, cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id")
      .eq("cuenta_bancaria_id", cuenta_bancaria_id)
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    const idDeDiario = diario?.cuenta_haber_predeterminada_id ?? diario?.cuenta_debito_predeterminada_id ?? null
    if (idDeDiario) return { ok: true, diario_id: diario.id, cuenta_id: idDeDiario }

    // Fallback: caja_valor que tenga banco_permitido_id apuntando a esta cuenta.
    const { data: cv } = await supabase
      .from("caja_valores")
      .select("cuenta_contable_id, cuenta_haber_id")
      .eq("banco_permitido_id", cuenta_bancaria_id)
      .not("cuenta_contable_id", "is", null)
      .limit(1)
      .maybeSingle()
    const idDeCV = cv?.cuenta_haber_id ?? cv?.cuenta_contable_id ?? null
    if (idDeCV) return { ok: true, diario_id: diario?.id ?? null, cuenta_id: idDeCV }

    return { ok: false, error: `Falta la cuenta contable del banco "${nombre}". Configurala en Contabilidad → Diarios (cuenta débito / haber) o en el Valor de Caja asociado.` }
  }

  const origenRes = await resolverCuentaBanco(tr.desde_cuenta_id, tr.desde_cuenta_nombre)
  if (!origenRes.ok) return origenRes
  const destinoRes = await resolverCuentaBanco(tr.hasta_cuenta_id, tr.hasta_cuenta_nombre)
  if (!destinoRes.ok) return destinoRes

  const cuentaOrigenId = origenRes.cuenta_id
  const cuentaDestinoId = destinoRes.cuenta_id

  // Diario: usamos el del banco origen; si no, el del destino; si no, General.
  let diarioId: string | null = origenRes.diario_id ?? destinoRes.diario_id ?? null
  if (!diarioId) {
    const { data: gen } = await supabase
      .from("contabilidad_diarios")
      .select("id")
      .eq("tipo", "general")
      .eq("activo", true)
      .limit(1)
      .maybeSingle()
    if (gen) diarioId = gen.id
  }
  if (!diarioId) return { ok: false, error: "No se encontró diario contable (ni del banco origen, ni destino, ni General)." }

  // Resolver cuentas del plan
  const { data: ctasArr } = await supabase
    .from("contabilidad_plan_cuentas")
    .select("id, codigo, nombre")
    .in("id", [cuentaOrigenId, cuentaDestinoId])
  const ctaById = new Map<string, { id: string; codigo: string; nombre: string }>()
  for (const c of ctasArr ?? []) ctaById.set(c.id, c as any)
  const cuentaOrigen = ctaById.get(cuentaOrigenId)
  const cuentaDestino = ctaById.get(cuentaDestinoId)
  if (!cuentaOrigen || !cuentaDestino) return { ok: false, error: "Cuentas contables del banco no encontradas en el plan." }

  const importe = Math.round(Number(tr.importe) * 100) / 100
  if (importe <= 0) return { ok: false, error: "Importe debe ser > 0." }

  const fechaDate = tr.fecha.split("T")[0]
  const { data: periodo_id } = await supabase.rpc("contabilidad_periodo_para_fecha", { p_fecha: fechaDate })

  type LineaTB = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }
  const lineasTB: LineaTB[] = [
    {
      cuenta_id: cuentaDestino.id, cuenta_codigo: cuentaDestino.codigo, cuenta_nombre: cuentaDestino.nombre,
      debe: importe, haber: 0,
      descripcion: `Transferencia desde ${tr.desde_cuenta_nombre}`,
      orden: 0,
    },
    {
      cuenta_id: cuentaOrigen.id, cuenta_codigo: cuentaOrigen.codigo, cuenta_nombre: cuentaOrigen.nombre,
      debe: 0, haber: importe,
      descripcion: `Transferencia a ${tr.hasta_cuenta_nombre}`,
      orden: 1,
    },
  ]

  const { data: numero } = await supabase.rpc("contabilidad_generar_numero_asiento", { p_diario_id: diarioId, p_fecha: fechaDate })

  const { data: asientoTB, error: asientoErrTB } = await supabase
    .from("contabilidad_asientos")
    .insert({
      numero: numero ?? null,
      diario_id: diarioId,
      periodo_id: periodo_id ?? null,
      fecha: fechaDate,
      sucursal_id: null,
      concepto: `Transferencia Bancaria ${tr.numero} — ${tr.desde_cuenta_nombre} → ${tr.hasta_cuenta_nombre}`,
      referencia: tr.numero,
      comprobante_tipo: "transferencia_bancaria",
      moneda_original: "ARS",
      es_manual: false,
      estado: "publicado",
    })
    .select("id")
    .single()
  if (asientoErrTB) return { ok: false, error: `Error al crear asiento: ${asientoErrTB.message}` }

  const { error: linErrTB } = await supabase
    .from("contabilidad_asientos_lineas")
    .insert(lineasTB.map(l => ({ ...l, asiento_id: asientoTB.id })))
  if (linErrTB) {
    await supabase.from("contabilidad_asientos").delete().eq("id", asientoTB.id)
    return { ok: false, error: `Error en líneas del asiento: ${linErrTB.message}` }
  }

  return { ok: true, asiento_id: asientoTB.id }
}

