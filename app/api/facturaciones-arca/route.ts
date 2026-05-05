import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/facturaciones-arca?historial=1
//
// Por default devuelve las facturas con IVA todavía NO facturadas externamente
// en ARCA. Con `?historial=1` invierte el filtro y devuelve las que ya fueron
// marcadas como facturadas (ordenadas por la fecha de marcado, más reciente
// primero).
//
// Filtros comunes (aplican siempre):
//   - impuestos > 0   (factura tiene IVA discriminado)
//   - estado != "cancelada"
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const historial = searchParams.get("historial") === "1"

  let q = supabase
    .from("facturas")
    .select(`
      id, numero, fecha, estado,
      cliente_id, cliente_nombre,
      sucursal, moneda, cotizacion,
      subtotal, impuestos, total,
      arca_facturada, arca_facturada_at, arca_facturada_por
    `)
    .gt("impuestos", 0)
    .neq("estado", "cancelada")
    .range(0, 49999)

  if (historial) {
    q = q.eq("arca_facturada", true).order("arca_facturada_at", { ascending: false })
  } else {
    q = q.eq("arca_facturada", false).order("fecha", { ascending: true })
  }

  const { data: facturas, error } = await q
  if (error) return dbError(error)
  const lista = (facturas ?? []) as any[]

  // 2. Enriquecer con datos del cliente (documento, condición IVA, CUIT)
  const clienteIds = [...new Set(lista.map(f => f.cliente_id).filter((x): x is number => x != null))]
  const clientesMap = new Map<number, any>()
  if (clienteIds.length > 0) {
    const { data: cs } = await supabase
      .from("clientes")
      .select("id, codigo, nombre, tipo_documento, numero_documento, condicion_iva")
      .in("id", clienteIds)
    for (const c of cs ?? []) clientesMap.set(c.id, c)
  }

  // 3. Enriquecer con medios de pago de la factura (la "parte blanca" — el
  //    subtotal). Los medios viven en `factura_medios_pago` con `tipo_parte`
  //    pudiendo ser "blanca" o "iva_diferido". Si no existe la columna,
  //    devolvemos lo que haya.
  const facIds = lista.map(f => f.id)
  const mediosPorFactura = new Map<number, any[]>()
  if (facIds.length > 0) {
    const { data: medios } = await supabase
      .from("factura_medios_pago")
      .select("factura_id, medio, monto, moneda, tipo_parte, tarjeta_nombre")
      .in("factura_id", facIds)
    for (const m of medios ?? []) {
      const fid = (m as any).factura_id as number
      if (!mediosPorFactura.has(fid)) mediosPorFactura.set(fid, [])
      mediosPorFactura.get(fid)!.push(m)
    }
  }

  // 4. Lineas para sacar la alícuota de IVA promedio (típicamente 21%, pero
  //    puede haber 10.5% o mixto). El facturador ARCA pide el detalle.
  const lineasPorFactura = new Map<number, any[]>()
  if (facIds.length > 0) {
    const { data: lineas } = await supabase
      .from("facturas_lineas")
      .select("factura_id, producto_id, producto_nombre, cantidad, subtotal, iva")
      .in("factura_id", facIds)
      .range(0, 49999)
    for (const l of lineas ?? []) {
      const fid = (l as any).factura_id as number
      if (!lineasPorFactura.has(fid)) lineasPorFactura.set(fid, [])
      lineasPorFactura.get(fid)!.push(l)
    }
  }

  // 5. Armar payload final
  const enriched = lista.map(f => {
    const cli = f.cliente_id != null ? clientesMap.get(f.cliente_id) : null
    const medios = mediosPorFactura.get(f.id) ?? []
    // La "parte blanca" típicamente equivale al subtotal — agrupamos los medios
    // que NO son del IVA diferido (si la columna existe) o todos si no hay
    // discriminación.
    const mediosBlancos = medios.filter(m => !m.tipo_parte || m.tipo_parte === "blanca")
    const formaPago = mediosBlancos
      .map(m => `${m.medio ?? ""}${m.tarjeta_nombre ? ` (${m.tarjeta_nombre})` : ""}`)
      .filter(Boolean)
      .join(" + ") || "—"

    // Alícuota IVA: agarramos la moda (la más usada por las líneas) — para
    // ARCA generalmente alcanza con esto. Si hay mix, lo marcamos.
    const lineas = lineasPorFactura.get(f.id) ?? []
    const tasas = lineas.map(l => Number(l.iva ?? 21)).filter(t => t > 0)
    const tasaUnica = tasas.length > 0 && tasas.every(t => t === tasas[0]) ? tasas[0] : null

    return {
      id: f.id,
      numero: f.numero,
      fecha: f.fecha,
      estado: f.estado,
      // Cliente
      cliente_id: f.cliente_id,
      cliente_nombre: cli?.nombre ?? f.cliente_nombre ?? "",
      cliente_codigo: cli?.codigo ?? null,
      cliente_tipo_documento: cli?.tipo_documento ?? null,
      cliente_numero_documento: cli?.numero_documento ?? null,
      cliente_condicion_iva: cli?.condicion_iva ?? null,
      // Importes
      moneda: f.moneda,
      cotizacion: f.cotizacion,
      subtotal: Number(f.subtotal ?? 0),
      impuestos: Number(f.impuestos ?? 0),
      total: Number(f.total ?? 0),
      tasa_iva: tasaUnica,  // null si la factura tiene mix de tasas
      // Pago
      forma_pago: formaPago,
      // Marcado en ARCA (solo relevante en historial)
      arca_facturada: f.arca_facturada,
      arca_facturada_at: f.arca_facturada_at,
      arca_facturada_por: f.arca_facturada_por,
      // Detalle de productos
      lineas: lineas.map(l => ({
        producto_nombre: l.producto_nombre,
        cantidad: Number(l.cantidad ?? 0),
        subtotal: Number(l.subtotal ?? 0),
        iva: Number(l.iva ?? 0),
      })),
    }
  })

  return NextResponse.json(enriched)
}
