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

  if (tieneIVA) {
    lineas.push(
      // HABER: Ventas Mercadería = subtotal neto (en ARS)
      {
        cuenta_id: cVentas.id,
        cuenta_codigo: cVentas.codigo,
        cuenta_nombre: cVentas.nombre,
        debe: 0,
        haber: toARS(factura.subtotal),
        descripcion: factura.numero,
        orden: 1,
        importe_moneda_original: esExtranjera ? Number(factura.subtotal) : null,
      },
      // HABER: IVA Débito Fiscal = impuestos (en ARS)
      {
        cuenta_id: cIVA!.id,
        cuenta_codigo: cIVA!.codigo,
        cuenta_nombre: cIVA!.nombre,
        debe: 0,
        haber: toARS(factura.impuestos),
        descripcion: factura.numero,
        orden: 2,
        importe_moneda_original: esExtranjera ? Number(factura.impuestos) : null,
      }
    )
  } else {
    lineas.push(
      // HABER: Ventas Mercadería = total (sin IVA separado, en ARS)
      {
        cuenta_id: cVentas.id,
        cuenta_codigo: cVentas.codigo,
        cuenta_nombre: cVentas.nombre,
        debe: 0,
        haber: toARS(factura.total),
        descripcion: factura.numero,
        orden: 1,
        importe_moneda_original: esExtranjera ? Number(factura.total) : null,
      }
    )
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
//   DEBE  11030101  Deudores por Ventas    (importe)
//   HABER 99999996  Cta Puente Toma Equipo (importe)
export async function generarAsientoNCTomaEquipo(
  supabase: SupabaseClient,
  nc: {
    id: number | string
    numero: string
    fecha: string
    cliente_nombre?: string | null
    sucursal?: string | null
    total: number
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
      moneda_original: "ARS", es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento NC TE: ${asientoErr.message}` }

  // NC TE: DEBE Cuenta Puente / HABER Deudores
  // La cuenta puente se cancela cuando llega la REP (DEBE Productos / HABER Cuenta Puente)
  const lineas = [
    { cuenta_id: cPuente.id,   cuenta_codigo: cPuente.codigo,   cuenta_nombre: cPuente.nombre,   debe: nc.total, haber: 0,        descripcion: nc.numero,                    orden: 0 },
    { cuenta_id: cDeudores.id, cuenta_codigo: cDeudores.codigo, cuenta_nombre: cDeudores.nombre, debe: 0,        haber: nc.total, descripcion: nc.cliente_nombre ?? null, orden: 1 },
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
      moneda_original: "ARS", es_manual: false, estado: "publicado",
    })
    .select("id").single()
  if (asientoErr) return { ok: false, error: `Error al crear asiento REP TE: ${asientoErr.message}` }

  const lineas = [
    { cuenta_id: cProductos.id, cuenta_codigo: cProductos.codigo, cuenta_nombre: cProductos.nombre, debe: rec.total, haber: 0, descripcion: rec.numero, orden: 0 },
    { cuenta_id: cPuente.id,    cuenta_codigo: cPuente.codigo,    cuenta_nombre: cPuente.nombre,    debe: 0, haber: rec.total, descripcion: rec.cliente_nombre ?? null, orden: 1 },
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

