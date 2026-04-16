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

  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }

  const lineas: Linea[] = [
    // DEBE: Deudores por Ventas = total de la factura
    {
      cuenta_id: cDeudores.id,
      cuenta_codigo: cDeudores.codigo,
      cuenta_nombre: cDeudores.nombre,
      debe: factura.total,
      haber: 0,
      descripcion: factura.cliente_nombre ?? null,
      orden: 0,
    },
  ]

  if (tieneIVA) {
    lineas.push(
      // HABER: Ventas Mercadería = subtotal neto
      {
        cuenta_id: cVentas.id,
        cuenta_codigo: cVentas.codigo,
        cuenta_nombre: cVentas.nombre,
        debe: 0,
        haber: factura.subtotal,
        descripcion: factura.numero,
        orden: 1,
      },
      // HABER: IVA Débito Fiscal = impuestos
      {
        cuenta_id: cIVA!.id,
        cuenta_codigo: cIVA!.codigo,
        cuenta_nombre: cIVA!.nombre,
        debe: 0,
        haber: factura.impuestos,
        descripcion: factura.numero,
        orden: 2,
      }
    )
  } else {
    lineas.push(
      // HABER: Ventas Mercadería = total (sin IVA separado)
      {
        cuenta_id: cVentas.id,
        cuenta_codigo: cVentas.codigo,
        cuenta_nombre: cVentas.nombre,
        debe: 0,
        haber: factura.total,
        descripcion: factura.numero,
        orden: 1,
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
      numero:            numero ?? null,
      diario_id,
      periodo_id:        periodo_id ?? null,
      fecha:             fechaDate,
      sucursal_id,
      concepto:          `Factura ${factura.numero}`,
      referencia:        factura.numero,
      comprobante_tipo:  "factura",
      moneda_original:   factura.moneda ?? "ARS",
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
    // Rollback del asiento huérfano
    await supabase.from("contabilidad_asientos").delete().eq("id", asiento.id)
    return { ok: false, error: `Error en líneas del asiento: ${lineasErr.message}` }
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
    proveedor_categoria_id?: number | null
    sucursal?: string | null
    subtotal: number
    impuestos: number
    total: number
    moneda?: string
    /** Líneas de detalle de la factura (cuenta contable + importe por línea).
     *  Si se proveen, el asiento DEBE se construye cuenta a cuenta desde aquí.
     *  Si están vacías o no se proveen, se usa la cuenta genérica de mapeo. */
    lineas_detalle?: {
      cuenta_id: string | null
      cuenta_codigo: string
      cuenta_nombre: string
      subtotal: number  // importe de esta línea (sin IVA)
    }[]
    /** Impuestos detallados (IVA manual, etc.) */
    impuestos_detalle?: {
      nombre: string
      importe: number
      cuenta_id?: string | null
    }[]
  }
): Promise<ResultadoAsiento> {

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
      // La categoría existe pero no tiene cuenta a pagar configurada → bloquear
      const nombreCat = cat?.nombre ?? `ID ${factura.proveedor_categoria_id}`
      return {
        ok: false,
        error: `La categoría de proveedor "${nombreCat}" no tiene cuenta contable a pagar configurada. Configurela en Compras → Config → Categorías de Proveedores antes de publicar la factura.`,
      }
    }

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
    // ── Modo dinámico: una línea DEBE por cada línea de la factura ──
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
        debe:          ld.subtotal,
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
          debe:          imp.importe,
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
        debe:          factura.impuestos,
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
        { cuenta_id: cCompras.id, cuenta_codigo: cCompras.codigo, cuenta_nombre: cCompras.nombre, debe: factura.subtotal, haber: 0, descripcion: factura.numero, orden: 0 },
        { cuenta_id: cIVA!.id,    cuenta_codigo: cIVA!.codigo,    cuenta_nombre: cIVA!.nombre,    debe: factura.impuestos, haber: 0, descripcion: factura.numero, orden: 1 }
      )
    } else {
      lineas.push(
        { cuenta_id: cCompras.id, cuenta_codigo: cCompras.codigo, cuenta_nombre: cCompras.nombre, debe: factura.total, haber: 0, descripcion: factura.numero, orden: 0 }
      )
    }
  }

  // HABER: cuenta del proveedor (categoría) = total de la factura
  lineas.push({
    cuenta_id:    cAcreedores.id,
    cuenta_codigo: cAcreedores.codigo,
    cuenta_nombre: cAcreedores.nombre,
    debe:          0,
    haber:         factura.total,
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

  // 1. Pagos del recibo
  const { data: pagos, error: pagosErr } = await supabase
    .from("recibo_pagos")
    .select("id, importe, moneda, valor_id, valor_nombre")
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

  // 5. Construir líneas
  type Linea = {
    cuenta_id: string; cuenta_codigo: string; cuenta_nombre: string
    debe: number; haber: number; descripcion: string | null; orden: number
  }

  const lineas: Linea[] = []
  let orden = 0

  for (const pago of pagos) {
    const cPago = pago.valor_id ? (cuentasPorValor[pago.valor_id] ?? null) : null

    if (!cPago?.id) {
      return {
        ok: false,
        error: `El valor de pago "${pago.valor_nombre}" no tiene cuenta contable asignada. Ejecute 017_add_cuenta_contable_caja_valores.sql y asigne la cuenta en Configuración → Cajas.`,
      }
    }

    lineas.push({
      cuenta_id: cPago.id,
      cuenta_codigo: cPago.codigo,
      cuenta_nombre: cPago.nombre,
      debe: pago.importe,
      haber: 0,
      descripcion: pago.valor_nombre ?? null,
      orden: orden++,
    })
  }

  // HABER: Deudores por Ventas = total del recibo
  lineas.push({
    cuenta_id: cDeudores.id,
    cuenta_codigo: cDeudores.codigo,
    cuenta_nombre: cDeudores.nombre,
    debe: 0,
    haber: recibo.importe,
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
      numero:           numero ?? null,
      diario_id:        diario.id,
      periodo_id:       periodo_id ?? null,
      fecha:            fechaDate,
      sucursal_id,
      concepto:         `Recibo ${recibo.numero}`,
      referencia:       recibo.numero,
      comprobante_tipo: "recibo",
      moneda_original:  recibo.moneda ?? "ARS",
      es_manual:        false,
      estado:           "publicado",
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

  // 6. Marcar asiento original como revertido
  await supabase
    .from("contabilidad_asientos")
    .update({ asiento_reversion_id: reversa.id, estado: "cancelado" })
    .eq("id", asiento_origen_id)

  return { ok: true, asiento_id: reversa.id }
}
