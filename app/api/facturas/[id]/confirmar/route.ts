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
  medio: "efectivo" | "transferencia" | "tarjeta"
  monto: number          // monto base que paga el cliente sobre el subtotal en negro
  tarjeta_id?: number
  cuotas?: number
  recargo_pct?: number   // % de recargo de tarjeta (0 si no aplica)
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
  if (factura.estado !== "abierta") {
    return NextResponse.json({ error: `La factura está en estado "${factura.estado}", no se puede confirmar` }, { status: 422 })
  }

  // 2. Leer líneas de factura con la alícuota de IVA del producto
  const { data: lineas, error: linErr } = await supabase
    .from("facturas_lineas")
    .select("id, producto_id, subtotal")
    .eq("factura_id", id)

  if (linErr) return NextResponse.json({ error: linErr.message }, { status: 500 })
  if (!lineas || lineas.length === 0) {
    return NextResponse.json({ error: "La factura no tiene líneas" }, { status: 422 })
  }

  // Resolver alícuotas desde productos
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

  // 4. Calcular recargo + IVA proporcional por cada medio facturable
  // Para cada medio NO efectivo:
  //   - Recargo (solo tarjeta) = monto * recargo_pct / 100
  //   - ratio = monto / subtotalNegro (qué porción del total cubre)
  //   - por cada línea: base imponible = (línea.subtotal + recargo de la línea) * ratio
  //                     IVA = base * alicuota/100
  //   - IVA del medio = suma de los IVA por línea (calculado sobre monto + recargo)
  let ivaTotal = 0
  let recargoTotal = 0

  const mediosCalculados = medios.map((m) => {
    const monto = Number(m.monto) || 0
    let ivaMedio = 0
    let recargoMedio = 0

    // Recargo va primero — se calcula sobre el monto base
    if (m.medio === "tarjeta" && (m.recargo_pct ?? 0) > 0) {
      recargoMedio = Math.round(monto * (Number(m.recargo_pct) / 100) * 100) / 100
    }

    // IVA se calcula sobre (monto base + recargo) en proporción a las alícuotas de cada línea
    if (m.medio !== "efectivo") {
      const baseConRecargo = monto + recargoMedio
      const ratio = baseConRecargo / subtotalNegro
      for (const linea of lineas) {
        const alicuota = linea.producto_id != null ? (alicuotaPorProducto.get(linea.producto_id) ?? 21) : 21
        const baseImponible = Number(linea.subtotal ?? 0) * ratio
        ivaMedio += baseImponible * (alicuota / 100)
      }
      ivaMedio = Math.round(ivaMedio * 100) / 100
    }

    ivaTotal += ivaMedio
    recargoTotal += recargoMedio

    return {
      medio: m.medio,
      tarjeta_id: m.medio === "tarjeta" ? (m.tarjeta_id ?? null) : null,
      cuotas: m.medio === "tarjeta" ? (m.cuotas ?? 1) : null,
      monto_base: monto,
      iva_calculado: ivaMedio,
      recargo: recargoMedio,
      monto_total: Math.round((monto + ivaMedio + recargoMedio) * 100) / 100,
    }
  })

  ivaTotal = Math.round(ivaTotal * 100) / 100
  recargoTotal = Math.round(recargoTotal * 100) / 100
  const totalFinal = Math.round((subtotalNegro + ivaTotal + recargoTotal) * 100) / 100

  // 5. Insertar las filas en factura_medios_pago
  const { error: mpErr } = await supabase
    .from("factura_medios_pago")
    .insert(mediosCalculados.map(m => ({ ...m, factura_id: factura.id })))

  if (mpErr) {
    return NextResponse.json({ error: `Error guardando medios de pago: ${mpErr.message}` }, { status: 500 })
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
