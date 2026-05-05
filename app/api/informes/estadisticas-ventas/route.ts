import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)

  const fechaDesde = searchParams.get("fecha_desde") || "2026-01-01"
  const fechaHasta = searchParams.get("fecha_hasta") || "2026-12-31"
  const sucursalIdsParam = searchParams.get("sucursal_ids")
  const sucursalIds = sucursalIdsParam
    ? sucursalIdsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
    : []

  // 1. Notas de venta en el rango de fechas
  let nvQuery = supabase
    .from("notas_venta")
    .select("id, fecha, cliente_id, vendedor_id, sucursal_id")
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta + "T23:59:59")
    .range(0, 49999)

  if (sucursalIds.length > 0) {
    nvQuery = nvQuery.in("sucursal_id", sucursalIds)
  }

  const { data: nvs, error: nvErr } = await nvQuery
  if (nvErr) return NextResponse.json({ error: nvErr.message }, { status: 500 })
  if (!nvs || nvs.length === 0) return NextResponse.json([])

  const nvIds = nvs.map((n: any) => n.id)

  // 2. Líneas de esas notas de venta
  const { data: lineas, error: lineasErr } = await supabase
    .from("notas_venta_lineas")
    .select("id, nota_venta_id, producto_id, producto_nombre, cantidad, precio_unitario, descuento, subtotal")
    .in("nota_venta_id", nvIds)
    .range(0, 49999)

  if (lineasErr) return NextResponse.json({ error: lineasErr.message }, { status: 500 })
  if (!lineas || lineas.length === 0) return NextResponse.json([])

  // 3. Cargar entidades relacionadas en paralelo
  const clienteIds = [...new Set(nvs.map((n: any) => n.cliente_id).filter(Boolean))] as number[]
  const vendedorIds = [...new Set(nvs.map((n: any) => n.vendedor_id).filter(Boolean))] as number[]
  const sucursalIdsAll = [...new Set(nvs.map((n: any) => n.sucursal_id).filter(Boolean))] as number[]
  const productoIds = [...new Set(lineas.map((l: any) => l.producto_id).filter(Boolean))] as number[]

  const [clientesRes, vendedoresRes, sucursalesRes, productosRes] = await Promise.all([
    clienteIds.length > 0
      ? supabase.from("clientes").select("id, nombre, condicion_iva").in("id", clienteIds)
      : Promise.resolve({ data: [], error: null }),
    vendedorIds.length > 0
      ? supabase.from("vendedores").select("id, nombre").in("id", vendedorIds)
      : Promise.resolve({ data: [], error: null }),
    sucursalIdsAll.length > 0
      ? supabase.from("sucursales").select("id, nombre").in("id", sucursalIdsAll)
      : Promise.resolve({ data: [], error: null }),
    productoIds.length > 0
      ? supabase.from("productos").select("id, categoria, marca, costo_manual, iva_venta").in("id", productoIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const clientesMap: Record<number, any> = {}
  ;(clientesRes.data ?? []).forEach((c: any) => { clientesMap[c.id] = c })

  const vendedoresMap: Record<number, any> = {}
  ;(vendedoresRes.data ?? []).forEach((v: any) => { vendedoresMap[v.id] = v })

  const sucursalesMap: Record<number, any> = {}
  ;(sucursalesRes.data ?? []).forEach((s: any) => { sucursalesMap[s.id] = s })

  const productosMap: Record<number, any> = {}
  ;(productosRes.data ?? []).forEach((p: any) => { productosMap[p.id] = p })

  const nvsMap: Record<number, any> = {}
  nvs.forEach((nv: any) => { nvsMap[nv.id] = nv })

  // 4. Construir una fila DatoVenta por línea de venta
  let rowId = 1
  const resultado = lineas
    .map((linea: any) => {
      const nv = nvsMap[linea.nota_venta_id]
      if (!nv) return null

      const fecha = new Date(nv.fecha)
      const anio = fecha.getFullYear()
      const mesCorto = fecha.toLocaleString("es-AR", { month: "short" })
      const mesStr = `${anio} ${mesCorto.charAt(0).toUpperCase() + mesCorto.slice(1)}`
      const fechaStr = fecha.toISOString().split("T")[0]

      const cliente = clientesMap[nv.cliente_id]
      const vendedor = vendedoresMap[nv.vendedor_id]
      const sucursal = sucursalesMap[nv.sucursal_id]
      const producto = productosMap[linea.producto_id]

      const cantidad = Number(linea.cantidad ?? 0)
      const precioUnitario = Number(linea.precio_unitario ?? 0)
      const descuento = Number(linea.descuento ?? 0)
      const total = Number(linea.subtotal ?? 0)
      const ivaVenta = Number(producto?.iva_venta ?? 21)
      const impuestos = Math.round(total * ivaVenta) / 100
      const costo = Math.round(cantidad * Number(producto?.costo_manual ?? 0) * 100) / 100
      const margen = Math.round((total - costo) * 100) / 100

      return {
        id: rowId++,
        fecha: fechaStr,
        mes: mesStr,
        anio,
        sucursal: sucursal?.nombre ?? "Sin sucursal",
        vendedor: vendedor?.nombre ?? "Sin vendedor",
        cliente: cliente?.nombre ?? "Sin cliente",
        categoria_cliente: cliente?.condicion_iva ?? "",
        producto: linea.producto_nombre || producto?.nombre || "Sin producto",
        categoria_producto: producto?.categoria || "Sin categoría",
        subcategoria_producto: "",
        marca: producto?.marca || "-",
        cantidad,
        precio_unitario: precioUnitario,
        total,
        descuento,
        impuestos,
        costo,
        margen,
      }
    })
    .filter(Boolean)

  return NextResponse.json(resultado)
}
