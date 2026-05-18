import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Cargar OT principal con sus joins (catálogos)
  const { data, error } = await supabase
    .from("taller_ordenes_trabajo")
    .select(`
      *,
      taller_areas_reparacion(id, nombre, codigo, control_inicial_obligatorio),
      taller_tipos_ot(id, nombre, codigo, tipo_tecnico, es_garantia_compra, es_garantia_reparacion),
      taller_equipos(id, nombre, marca, modelo, dias_garantia_compra, dias_garantia_reparacion),
      taller_fallas!taller_ordenes_trabajo_falla_principal_id_fkey(id, nombre),
      taller_categorias_reparacion(id, nombre),
      taller_tecnicos(id, nombre, tipo),
      taller_motivos_cierre(id, nombre)
    `)
    .eq("id", id)
    .single()

  if (error) return dbError(error)

  // 2. Disparar TODAS las queries dependientes en paralelo. Antes este
  // endpoint hacía ~14 queries secuenciales (~1.5–2s); con Promise.all
  // queda en ~150–250ms (lo que tarde la query más lenta).
  const [
    clienteRes,
    fallaSecRes,
    repuestosRes,
    controlesRes,
    historialRes,
    notasVentaRes,
    facturasRes,
    recibosRawRes,
    remitosRes,
    ordenesCompraRes,
  ] = await Promise.all([
    data.cliente_id
      ? supabase.from("clientes").select("id, codigo, nombre, telefono").eq("id", data.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("taller_ot_fallas_secundarias").select("falla_id, taller_fallas(nombre)").eq("ot_id", id),
    supabase.from("taller_ot_repuestos").select("*").eq("ot_id", id).order("id"),
    supabase.from("taller_ot_controles").select("*, taller_ot_control_items(*)").eq("ot_id", id).order("created_at"),
    supabase.from("taller_ot_historial").select("*").eq("ot_id", id).order("fecha", { ascending: true }),
    supabase.from("notas_venta").select("id, numero, estado, total").eq("ot_id", id),
    supabase.from("facturas").select("id, numero, estado, total").eq("ot_id", id),
    supabase.from("recibos").select("id, numero, estado, importe").eq("ot_id", id),
    supabase.from("remitos").select("id, numero, estado").eq("ot_id", id),
    supabase.from("ordenes_compra").select("id, numero, estado, total").eq("ot_id", id),
  ])

  const clienteData = (clienteRes.data ?? null) as { id: number; codigo?: string; nombre: string; telefono?: string } | null
  const fallaSec = fallaSecRes.data ?? []
  const repuestosRaw = repuestosRes.data ?? []
  const controles = controlesRes.data ?? []
  const historial = historialRes.data ?? []
  const notasVenta = notasVentaRes.data ?? []
  const facturas = facturasRes.data ?? []
  const recibosRaw = recibosRawRes.data ?? []
  const remitos = remitosRes.data ?? []
  const ordenesCompra = ordenesCompraRes.data ?? []

  // 3. Enriquecer repuestos con stock real (calculado live desde
  // stock_unidades para con-IMEI y stock_cantidades para sin-IMEI). La
  // columna `productos.stock_real` es legacy y no se mantiene.
  // También se hace en paralelo (productos + stock_unidades + stock_cantidades).
  let repuestos: Array<Record<string, unknown>> = repuestosRaw
  if (repuestosRaw.length > 0) {
    const productoIds = [...new Set(repuestosRaw.map(r => Number(r.producto_id)).filter(Boolean))]
    if (productoIds.length > 0) {
      // Paso 1: traer info del producto. Necesitamos saber qué productos
      // son con/sin IMEI antes de pedir su stock.
      const { data: productos } = await supabase
        .from("productos")
        .select("id, tiene_numero_serie, tipo")
        .in("id", productoIds)

      const serializedIds = (productos ?? []).filter(p => p.tiene_numero_serie).map(p => Number(p.id))
      const bulkIds = (productos ?? []).filter(p => !p.tiene_numero_serie).map(p => Number(p.id))

      // Paso 2: stock_unidades + stock_cantidades en paralelo.
      const [unidadesRes, cantidadesRes] = await Promise.all([
        serializedIds.length > 0
          ? supabase
              .from("stock_unidades")
              .select("producto_id, estado")
              .in("producto_id", serializedIds)
              .range(0, 49999)
          : Promise.resolve({ data: [] as Array<{ producto_id: number; estado: string }> }),
        bulkIds.length > 0
          ? supabase
              .from("stock_cantidades")
              .select("producto_id, cantidad")
              .in("producto_id", bulkIds)
              .range(0, 49999)
          : Promise.resolve({ data: [] as Array<{ producto_id: number; cantidad: number }> }),
      ])

      const stockReal = new Map<number, number>()
      for (const u of unidadesRes.data ?? []) {
        if (u.estado === "entregado" || u.estado === "dado_de_baja") continue
        const pid = Number(u.producto_id)
        stockReal.set(pid, (stockReal.get(pid) ?? 0) + 1)
      }
      for (const sc of cantidadesRes.data ?? []) {
        const pid = Number(sc.producto_id)
        stockReal.set(pid, (stockReal.get(pid) ?? 0) + Number(sc.cantidad ?? 0))
      }

      const stockMap = new Map<number, { stock: number; tipo: string }>()
      for (const p of productos ?? []) {
        stockMap.set(Number(p.id), {
          stock: stockReal.get(Number(p.id)) ?? 0,
          tipo: p.tipo ?? "almacenable",
        })
      }
      repuestos = repuestosRaw.map(r => {
        const info = stockMap.get(Number(r.producto_id))
        const tipo = info?.tipo ?? "almacenable"
        const stock = info?.stock ?? 0
        const cant = Number(r.cantidad ?? 0)
        const aplicaStock = tipo === "almacenable"
        return {
          ...r,
          stock_real: stock,
          tipo_producto: tipo,
          stock_suficiente: !aplicaStock || stock >= cant,
          faltante: !aplicaStock ? 0 : Math.max(0, cant - stock),
        }
      })
    }
  }

  // Mapeamos `importe` → `importe_total` para compatibilidad con UIs.
  const recibos = recibosRaw.map(r => ({ ...r, importe_total: Number(r.importe ?? 0) }))

  const result = {
    ...data,
    cliente: clienteData,
    cliente_nombre: clienteData?.nombre ?? null,
    fallas_secundarias: fallaSec.map(f => {
      const falla = Array.isArray(f.taller_fallas) ? f.taller_fallas[0] : f.taller_fallas
      return {
        falla_id: f.falla_id,
        nombre: (falla as { nombre?: string } | null)?.nombre ?? "",
      }
    }),
    repuestos,
    controles,
    historial,
    comprobantes: {
      notas_venta: notasVenta,
      facturas,
      recibos,
      remitos,
      ordenes_compra: ordenesCompra,
    },
  }

  return NextResponse.json(result)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { fallas_secundarias } = body

  // Whitelist de columnas reales (el body puede traer campos enriquecidos
  // del GET como taller_areas_reparacion, cliente, comprobantes, etc. que
  // NO son columnas reales y harían fallar el update).
  const COLUMNAS = new Set([
    "sucursal_id", "area_id", "tipo_ot_id", "tipo_tecnico", "cliente_id",
    "categoria_cliente", "celular_contacto", "factura_origen_id", "ot_origen_id",
    "equipo_id", "falla_principal_id", "categoria_reparacion_id", "tecnico_id",
    "imei", "serial_number", "codigo_desbloqueo", "ingresa_apagado", "ingresa_mojado",
    "deja_cargador", "requerido_mkt", "presupuesto_estimado", "descripcion",
    "observaciones_internas", "lista_precios_id",
  ])
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (COLUMNAS.has(k)) update[k] = v
  }

  const { data, error } = await supabase
    .from("taller_ordenes_trabajo")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)

  if (fallas_secundarias !== undefined) {
    await supabase.from("taller_ot_fallas_secundarias").delete().eq("ot_id", id)
    if (fallas_secundarias?.length) {
      const rows = fallas_secundarias.map((fid: string) => ({
        ot_id: id,
        falla_id: fid,
      }))
      await supabase.from("taller_ot_fallas_secundarias").insert(rows)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("taller_ordenes_trabajo").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
