import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/taller/repuestos-sugeridos-preview
//   ?equipo_id=...
//   &falla_principal_id=...
//   &fallas_sec=ID1,ID2,...
//   &lista_precios_id=N        (opcional — usa precio_venta de la lista)
//
// Devuelve los repuestos que serían auto-cargados si se creara una OT con
// esa combinación, enriquecidos con stock real + precio según la lista
// seleccionada (o costo_contable como fallback).
//
// Response:
//   {
//     repuestos: [{
//       producto_id, producto_nombre, cantidad_sugerida, stock_real,
//       tipo, stock_suficiente, faltante,
//       precio_unitario, precio_origen ("lista" | "costo_contable" | "ninguno"),
//       subtotal,
//     }],
//     hay_faltantes: boolean,
//     total: number,
//     lista_precios?: { id, nombre, version_id, version_nombre },
//   }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const equipoId = searchParams.get("equipo_id")
  const fallaPrincipal = searchParams.get("falla_principal_id")
  const fallasSecParam = searchParams.get("fallas_sec") ?? ""
  const listaPreciosId = searchParams.get("lista_precios_id")

  if (!equipoId || !fallaPrincipal) {
    return NextResponse.json({ repuestos: [], hay_faltantes: false, total: 0 })
  }

  const supabase = await createClient()
  const fallaIds = [
    fallaPrincipal,
    ...fallasSecParam.split(",").filter(Boolean),
  ]

  // 1. Buscar combinaciones (equipo, falla) en el maestro
  const { data: fallaEquipos, error: feErr } = await supabase
    .from("taller_fallas_por_equipo")
    .select("id")
    .eq("equipo_id", equipoId)
    .in("falla_id", fallaIds)
  if (feErr) return dbError(feErr)

  const fallaEquipoIds = (fallaEquipos ?? []).map(f => f.id)
  if (fallaEquipoIds.length === 0) {
    return NextResponse.json({ repuestos: [], hay_faltantes: false, total: 0 })
  }

  // 2. Cargar repuestos sugeridos
  const { data: repuestos } = await supabase
    .from("taller_fallas_por_equipo_repuestos")
    .select("producto_id, cantidad")
    .in("falla_equipo_id", fallaEquipoIds)

  if (!repuestos?.length) {
    return NextResponse.json({ repuestos: [], hay_faltantes: false, total: 0 })
  }

  // 3. Sumar cantidades por producto_id
  const acumulado = new Map<number, number>()
  for (const r of repuestos) {
    const pid = Number(r.producto_id)
    if (!pid) continue
    acumulado.set(pid, (acumulado.get(pid) ?? 0) + Number(r.cantidad ?? 1))
  }

  const productoIds = [...acumulado.keys()]

  // 4. Disparamos en paralelo: productos + lista de precios + stock
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, tiene_numero_serie, tipo, costo_contable, costo_manual")
    .in("id", productoIds)

  const serializedIds = (productos ?? []).filter(p => p.tiene_numero_serie).map(p => Number(p.id))
  const bulkIds = (productos ?? []).filter(p => !p.tiene_numero_serie).map(p => Number(p.id))

  // Lista de precios: buscamos la versión activa más reciente y sus líneas.
  let precioMap = new Map<number, number>()
  let listaInfo: { id: number; nombre: string; version_id: number; version_nombre: string } | null = null
  if (listaPreciosId) {
    const lpId = Number(listaPreciosId)
    const { data: lista } = await supabase
      .from("listas_precios")
      .select("id, nombre")
      .eq("id", lpId)
      .maybeSingle()
    if (lista) {
      // Tomamos la versión activa más reciente de esa lista.
      const { data: version } = await supabase
        .from("versiones_lista_precios")
        .select("id, nombre, fecha_inicial")
        .eq("lista_precios_id", lpId)
        .eq("activa", true)
        .order("fecha_inicial", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (version) {
        listaInfo = {
          id: lista.id,
          nombre: lista.nombre,
          version_id: version.id,
          version_nombre: version.nombre,
        }
        const { data: lineas } = await supabase
          .from("version_lista_precios_lineas")
          .select("producto_id, precio_venta")
          .eq("version_id", version.id)
          .in("producto_id", productoIds)
        for (const l of lineas ?? []) {
          precioMap.set(Number(l.producto_id), Number(l.precio_venta ?? 0))
        }
      }
    }
  }

  // Stock live (mismo patrón que /api/productos).
  const stockMap = new Map<number, number>()
  if (serializedIds.length > 0) {
    const { data: unidades } = await supabase
      .from("stock_unidades")
      .select("producto_id, estado")
      .in("producto_id", serializedIds)
      .range(0, 49999)
    for (const u of unidades ?? []) {
      if (u.estado === "entregado" || u.estado === "dado_de_baja") continue
      const pid = Number(u.producto_id)
      stockMap.set(pid, (stockMap.get(pid) ?? 0) + 1)
    }
  }
  if (bulkIds.length > 0) {
    const { data: cantidades } = await supabase
      .from("stock_cantidades")
      .select("producto_id, cantidad")
      .in("producto_id", bulkIds)
      .range(0, 49999)
    for (const sc of cantidades ?? []) {
      const pid = Number(sc.producto_id)
      stockMap.set(pid, (stockMap.get(pid) ?? 0) + Number(sc.cantidad ?? 0))
    }
  }

  // 5. Map de info por producto
  const prodMap = new Map<number, {
    nombre: string
    stock_real: number
    tipo: string
    costo_contable: number
    costo_manual: number
  }>()
  for (const p of productos ?? []) {
    prodMap.set(Number(p.id), {
      nombre: p.nombre,
      stock_real: stockMap.get(Number(p.id)) ?? 0,
      tipo: p.tipo ?? "almacenable",
      costo_contable: Number(p.costo_contable ?? 0),
      costo_manual: Number(p.costo_manual ?? 0),
    })
  }

  // 6. Construir respuesta con precio resuelto
  const result = [...acumulado.entries()].map(([pid, cant]) => {
    const info = prodMap.get(pid)
    const aplicaStock = info?.tipo === "almacenable"
    const stock = info?.stock_real ?? 0
    const stockSuficiente = !aplicaStock || stock >= cant

    // Resolución del precio:
    //  1) Si hay lista de precios y el producto tiene línea en ella → ese precio
    //  2) Sino, costo_contable del producto (con fallback a costo_manual)
    //  3) Sino, 0 (y avisamos como "ninguno")
    let precio = 0
    let precioOrigen: "lista" | "costo_contable" | "costo_manual" | "ninguno" = "ninguno"
    if (precioMap.has(pid)) {
      precio = precioMap.get(pid) ?? 0
      precioOrigen = "lista"
    } else if (info?.costo_contable && info.costo_contable > 0) {
      precio = info.costo_contable
      precioOrigen = "costo_contable"
    } else if (info?.costo_manual && info.costo_manual > 0) {
      precio = info.costo_manual
      precioOrigen = "costo_manual"
    }

    return {
      producto_id: pid,
      producto_nombre: info?.nombre ?? `Producto #${pid}`,
      cantidad_sugerida: cant,
      stock_real: stock,
      tipo: info?.tipo ?? "desconocido",
      stock_suficiente: stockSuficiente,
      faltante: stockSuficiente ? 0 : Math.max(0, cant - stock),
      precio_unitario: precio,
      precio_origen: precioOrigen,
      subtotal: precio * cant,
    }
  })

  const hayFaltantes = result.some(r => !r.stock_suficiente)
  const total = result.reduce((acc, r) => acc + r.subtotal, 0)
  return NextResponse.json({
    repuestos: result,
    hay_faltantes: hayFaltantes,
    total,
    lista_precios: listaInfo,
  })
}
