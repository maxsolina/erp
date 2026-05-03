import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generarAsientoIVADiferido } from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface MedioPagoInput {
  medio: "efectivo" | "transferencia" | "tarjeta" | "credito_toma"
  monto: number          // monto base que paga el cliente, YA convertido a la moneda de la factura
  moneda?: "ARS" | "USD" // moneda original con la que el cliente pagó (para diferenciar Efectivo USD vs ARS)
  tarjeta_id?: number
  cuotas?: number
  recargo_pct?: number   // % de recargo de tarjeta (0 si no aplica)
  nc_id?: number         // FAC-11: para credito_toma, FK a ajustes_clientes
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json()
  const medios: MedioPagoInput[] = Array.isArray(body.medios) ? body.medios : []

  if (medios.length === 0) {
    return NextResponse.json({ error: "Debe especificar al menos un medio de pago" }, { status: 422 })
  }

  // 1. Leer factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas")
    .select("id, numero, estado, fecha, sucursal, moneda, subtotal, total, cliente_id, cliente_nombre")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }
  if (factura.estado !== "abierta" && factura.estado !== "borrador") {
    return NextResponse.json({ error: `La factura está en estado "${factura.estado}", no se puede confirmar` }, { status: 422 })
  }

  // 2. Leer líneas de factura
  const { data: lineas, error: linErr } = await supabase
    .from("facturas_lineas")
    .select("id, producto_id, subtotal")
    .eq("factura_id", id)

  if (linErr) return NextResponse.json({ error: linErr.message }, { status: 500 })
  if (!lineas || lineas.length === 0) {
    return NextResponse.json({ error: "La factura no tiene líneas" }, { status: 422 })
  }

  // Resolver alícuotas desde productos (la tabla facturas_lineas no tiene
  // columna `iva` propia — el % se obtiene del producto vía iva_venta).
  const productoIds = [...new Set(lineas.map(l => l.producto_id).filter((x): x is number => x != null))]
  const alicuotaPorProducto = new Map<number, number>()
  if (productoIds.length > 0) {
    const { data: productos } = await supabase
      .from("productos")
      .select("id, iva_venta")
      .in("id", productoIds)
    for (const p of productos ?? []) {
      alicuotaPorProducto.set(p.id, Number((p as { iva_venta?: number }).iva_venta ?? 21))
    }
  }
  const alicuotaDeLinea = (l: any): number =>
    l.producto_id != null ? (alicuotaPorProducto.get(l.producto_id) ?? 21) : 21

  const subtotalNegro = Number(factura.subtotal ?? 0)
  if (subtotalNegro <= 0) {
    return NextResponse.json({ error: "Subtotal de factura inválido" }, { status: 422 })
  }

  // 3. Validar que la suma de medios cubre el subtotal en negro
  const sumaMedios = medios.reduce((s, m) => s + (Number(m.monto) || 0), 0)
  if (Math.abs(sumaMedios - subtotalNegro) > 0.5) {
    return NextResponse.json({
      error: `La suma de medios de pago (${sumaMedios.toFixed(2)}) no coincide con el subtotal de la factura (${subtotalNegro.toFixed(2)})`,
    }, { status: 422 })
  }

  // 4. FAC-10: IVA preponderante de la factura.
  // Agrupar el subtotal por % de IVA y elegir el % con mayor monto.
  const subtotalPorIva = new Map<number, number>()
  for (const l of lineas) {
    const iva = alicuotaDeLinea(l)
    subtotalPorIva.set(iva, (subtotalPorIva.get(iva) ?? 0) + Number(l.subtotal ?? 0))
  }
  let ivaPreponderante = 21
  let maxSubtotalPrep = 0
  subtotalPorIva.forEach((sub, iva) => {
    if (sub > maxSubtotalPrep) { maxSubtotalPrep = sub; ivaPreponderante = iva }
  })

  // 5. FAC-10: Para cada medio NO efectivo:
  //   - recargoMedio = monto * recargo_pct / 100 (de la tabla recargos_tarjeta)
  //   - comisionMedio = sum(monto * cargo.arancel / 100) por cada cargo del grupo
  //                     CUYO NOMBRE NO CONTENGA "IVA" (los cargos administrativos
  //                     llamados "IVA" no son el IVA fiscal y no deben duplicar)
  //   - ivaMedio = (monto + recargoMedio + comisionMedio) * ivaPreponderante / 100
  //   - "recargo" en la tabla factura_medios_pago = recargoMedio + comisionMedio
  let ivaTotal = 0
  let recargoTotal = 0

  // Resolver grupos de tarjeta para mapear recargo→cargos
  const recargosIds = [...new Set(medios.filter(m => m.medio === "tarjeta" && m.tarjeta_id).map(m => m.tarjeta_id!))]
  const cargosPorTarjeta = new Map<number, { nombre: string; arancel: number }[]>()
  if (recargosIds.length > 0) {
    // Para cada tarjeta + cuotas, buscar el recargo que aplica y el grupo correspondiente
    const { data: recargosData } = await supabase
      .from("recargos_tarjeta")
      .select("id, tarjeta_id, grupo_id, desde_cuota, hasta_cuota, recargo_pct, activo, dias")
      .in("tarjeta_id", recargosIds)
      .eq("activo", true)
    const { data: gruposData } = await supabase
      .from("grupos_tarjeta")
      .select("id, nombre, cargos")
    const gruposMap = new Map<number, { nombre: string; arancel: number }[]>()
    for (const g of gruposData ?? []) {
      gruposMap.set(g.id, Array.isArray(g.cargos) ? g.cargos : [])
    }
    // Mapeamos por (tarjeta_id, cuotas) → cargos
    for (const m of medios) {
      if (m.medio !== "tarjeta" || !m.tarjeta_id) continue
      const cuotas = m.cuotas ?? 1
      const rec = (recargosData ?? []).find(r =>
        r.tarjeta_id === m.tarjeta_id &&
        cuotas >= r.desde_cuota && cuotas <= r.hasta_cuota
      )
      if (rec) {
        cargosPorTarjeta.set(m.tarjeta_id, gruposMap.get(rec.grupo_id) ?? [])
      }
    }
  }

  const mediosCalculados = medios.map((m) => {
    const monto = Number(m.monto) || 0
    let recargoMedio = 0
    let comisionMedio = 0

    if (m.medio === "tarjeta" && (m.recargo_pct ?? 0) > 0) {
      recargoMedio = Math.round(monto * (Number(m.recargo_pct) / 100) * 100) / 100
    }
    if (m.medio === "tarjeta" && m.tarjeta_id) {
      const cargos = cargosPorTarjeta.get(m.tarjeta_id) ?? []
      for (const c of cargos) {
        // Excluir cargos llamados "IVA*" (son cargos admin de la tarjeta, no IVA fiscal)
        if (!/iva/i.test(c.nombre)) {
          comisionMedio += monto * (Number(c.arancel) / 100)
        }
      }
      comisionMedio = Math.round(comisionMedio * 100) / 100
    }

    // FAC-11: credito_toma y efectivo NO generan IVA fiscal ni recargos
    let ivaMedio = 0
    if (m.medio === "tarjeta" || m.medio === "transferencia") {
      const base = monto + recargoMedio + comisionMedio
      ivaMedio = Math.round(base * (ivaPreponderante / 100) * 100) / 100
    }

    const recargoCombinado = Math.round((recargoMedio + comisionMedio) * 100) / 100
    ivaTotal += ivaMedio
    recargoTotal += recargoCombinado

    return {
      medio: m.medio,
      moneda: m.moneda ?? (factura.moneda ?? "ARS"),
      tarjeta_id: m.medio === "tarjeta" ? (m.tarjeta_id ?? null) : null,
      cuotas: m.medio === "tarjeta" ? (m.cuotas ?? 1) : null,
      nc_id: m.medio === "credito_toma" ? (m.nc_id ?? null) : null,
      monto_base: monto,
      iva_calculado: ivaMedio,
      recargo: recargoCombinado,
      monto_total: Math.round((monto + ivaMedio + recargoCombinado) * 100) / 100,
    }
  })

  ivaTotal = Math.round(ivaTotal * 100) / 100
  recargoTotal = Math.round(recargoTotal * 100) / 100
  const totalFinal = Math.round((subtotalNegro + ivaTotal + recargoTotal) * 100) / 100

  // FAC-11: total cobrado por créditos de toma de equipo (las NCs aplicadas).
  // Se descuenta del saldo de la factura al final (la NC se "consume").
  const totalCreditoToma = mediosCalculados
    .filter(m => m.medio === "credito_toma")
    .reduce((s, m) => s + Number(m.monto_total), 0)

  // 5. Insertar las filas en factura_medios_pago
  const filasMedios = mediosCalculados.map(m => ({ ...m, factura_id: factura.id }))
  const { error: mpErr } = await supabase
    .from("factura_medios_pago")
    .insert(filasMedios)

  if (mpErr) {
    // Compat: si la columna `moneda` no existe (script 095 no aplicado),
    // reintentamos sin ella en vez de romper el flujo.
    const colFaltante = mpErr.message.match(/Could not find the '([^']+)' column/)?.[1]
    if (colFaltante) {
      const filasSinCol = filasMedios.map(f => {
        const copia = { ...f } as Record<string, unknown>
        delete copia[colFaltante]
        return copia
      })
      const retry = await supabase.from("factura_medios_pago").insert(filasSinCol)
      if (retry.error) {
        return NextResponse.json({ error: `Error guardando medios de pago: ${retry.error.message}` }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: `Error guardando medios de pago: ${mpErr.message}` }, { status: 500 })
    }
  }

  // 6. Generar Asiento 2 (IVA diferido + recargo TC)
  const asientoResult = await generarAsientoIVADiferido(supabase, {
    id: factura.id,
    numero: factura.numero,
    fecha: factura.fecha ?? new Date().toISOString(),
    cliente_id: factura.cliente_id != null ? String(factura.cliente_id) : null,
    cliente_nombre: factura.cliente_nombre,
    sucursal: factura.sucursal,
    moneda: factura.moneda ?? "ARS",
    iva_total: ivaTotal,
    recargo_total: recargoTotal,
  })

  if (!asientoResult.ok) {
    // Rollback: borrar las filas de medios_pago para no dejar inconsistencia
    await supabase.from("factura_medios_pago").delete().eq("factura_id", factura.id)
    return NextResponse.json({ error: `Error contable: ${asientoResult.error}` }, { status: 500 })
  }

  // 7. Actualizar factura: estado, totales, asiento_iva_id
  // FAC-11 (Opción B): saldo = totalFinal completo. La línea credito_toma
  // es solo un marcador visual en factura_medios_pago — no afecta el saldo.
  // El operador concilia la NC contra la factura en el recibo (tab Comprobantes),
  // y ahí baja el saldo de la factura Y el saldo_disponible de la NC.
  // (Variable totalCreditoToma se calcula igual por si se necesita en logs.)
  void totalCreditoToma
  const { error: updErr } = await supabase
    .from("facturas")
    .update({
      estado: "confirmada",
      impuestos: ivaTotal,
      total: totalFinal,
      saldo: totalFinal,
      asiento_iva_id: asientoResult.asiento_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", factura.id)

  if (updErr) {
    return NextResponse.json({ error: `Factura confirmada parcialmente: ${updErr.message}` }, { status: 500 })
  }

  // FAC-11 (Opción B): la NC NO se descuenta al confirmar la factura.
  // El crédito por toma de equipo es informativo en la factura — el saldo
  // de la factura ya quedó reducido por `totalCreditoToma`, y el operador
  // matchea la NC manualmente en el recibo (panel "Créditos del cliente"),
  // donde se hace la conciliación real.

  return NextResponse.json({
    ok: true,
    factura_id: factura.id,
    asiento_iva_id: asientoResult.asiento_id,
    iva_total: ivaTotal,
    recargo_total: recargoTotal,
    total_final: totalFinal,
    medios: mediosCalculados,
  })
}
