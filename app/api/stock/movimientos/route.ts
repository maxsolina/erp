import { dbError } from "@/lib/api-utils"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const productoId = searchParams.get("producto_id")
  const tipo = searchParams.get("tipo")
  const origenTipo = searchParams.get("origen_tipo")
  const origenId = searchParams.get("origen_id")
  const stockUnidadId = searchParams.get("stock_unidad_id")
  const nroSerie = searchParams.get("nro_serie")
  const limit = Number(searchParams.get("limit") ?? 50)

  // Tabla 1: movimientos_stock — pensada como log canónico, hoy alimentada por
  // recepciones (entrada_recepcion) y recepciones de toma de equipo.
  let query = supabase
    .from("movimientos_stock")
    .select(`
      *,
      productos(nombre, codigo_interno),
      ubicaciones_origen:ubicacion_origen_id(codigo, nombre),
      ubicaciones_destino:ubicacion_destino_id(codigo, nombre),
      depositos_origen:deposito_origen_id(codigo, nombre),
      depositos_destino:deposito_destino_id(codigo, nombre)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (productoId) query = query.eq("producto_id", Number(productoId))
  if (tipo) query = query.eq("tipo", tipo)
  if (origenTipo) query = query.eq("origen_tipo", origenTipo)
  if (origenId) query = query.eq("origen_id", Number(origenId))
  if (stockUnidadId) query = query.eq("stock_unidad_id", Number(stockUnidadId))
  if (nroSerie) query = query.eq("nro_serie", nroSerie)

  const { data, error } = await query
  if (error) return dbError(error)

  // Tabla 2: stock_movimientos — log paralelo donde escriben remitos (egreso) y
  // cancelaciones de remito (ingreso). Lo unimos al historial cuando el caller
  // filtra por unidad puntual (stock_unidad_id o nro_serie). Esquema distinto:
  // tipo "egreso"/"ingreso", deposito_id/ubicacion_id (unicos) en vez de
  // origen/destino, y origen del comprobante en `documento_*`/`remito_numero`.
  // Lo normalizamos a la forma de movimientos_stock para que el front consuma
  // un único shape.
  let extras: any[] = []
  if (stockUnidadId || nroSerie) {
    let q2 = supabase.from("stock_movimientos").select("*")
    if (nroSerie) q2 = q2.eq("nro_serie", nroSerie)
    // stock_movimientos no tiene stock_unidad_id; si sólo viene ese filtro,
    // dejamos pasar todo (vendrá filtrado por nro_serie en el otro bloque, o
    // queda sin filtrar — peor caso, devolvemos un poco más).
    const { data: raw } = await q2.order("created_at", { ascending: false }).limit(limit)
    extras = (raw ?? []).map((m: any) => {
      const isEgreso = m.tipo === "egreso"
      // Para egreso (salida del depósito) la unidad SALE de (deposito_id, ubicacion_id)
      // hacia "ningún lado" (sale al cliente). Para ingreso (devolución) entra
      // a esa misma ubicación.
      const dep = m.deposito_id ? { codigo: null, nombre: m.deposito_nombre } : null
      const ubi = m.ubicacion_id ? { codigo: null, nombre: m.ubicacion_nombre } : null
      const origenTipoNorm = m.documento_tipo ?? null
      const origenNumero =
        m.remito_numero ?? m.documento_numero ?? m.nv_numero ?? m.oe_numero ?? null
      return {
        id: `sm-${m.id}`,
        tipo: isEgreso ? "salida_entrega" : "entrada_recepcion",
        producto_id: m.producto_id,
        productos: m.producto_nombre ? { nombre: m.producto_nombre, codigo_interno: null } : null,
        cantidad: m.cantidad ?? 1,
        stock_unidad_id: null,
        nro_serie: m.nro_serie,
        ubicacion_origen_id: isEgreso ? m.ubicacion_id : null,
        ubicacion_destino_id: isEgreso ? null : m.ubicacion_id,
        deposito_origen_id: isEgreso ? m.deposito_id : null,
        deposito_destino_id: isEgreso ? null : m.deposito_id,
        ubicaciones_origen: isEgreso ? ubi : null,
        ubicaciones_destino: isEgreso ? null : ubi,
        depositos_origen: isEgreso ? dep : null,
        depositos_destino: isEgreso ? null : dep,
        origen_tipo: origenTipoNorm,
        origen_id: m.documento_id ?? null,
        origen_numero: origenNumero,
        usuario: m.usuario,
        observaciones: m.observaciones,
        created_at: m.created_at,
      }
    })
  }

  // Eventos sintéticos de RESERVA — la app no escribe un movimiento explícito
  // cuando una unidad pasa a estado=reservado. Los derivamos:
  //   1. Desde `senias_equipo` con stock_item_id = unidad.id (reserva via seña).
  //   2. Desde `ordenes_entrega` cuyo JSONB productos referencia la serie
  //      (reserva via NV directa, sin seña).
  let reservas: any[] = []
  if (stockUnidadId || nroSerie) {
    const seenOEs = new Set<string>()
    // 1. Señas
    if (stockUnidadId) {
      const { data: senias } = await supabase
        .from("senias_equipo")
        .select("id, numero, oe_id, oe_numero, nota_venta_numero, created_at, stock_item_id")
        .eq("stock_item_id", Number(stockUnidadId))
      for (const s of senias ?? []) {
        if (s.oe_numero) seenOEs.add(s.oe_numero)
        reservas.push({
          id: `senia-${s.id}`,
          tipo: "reserva",
          producto_id: null,
          productos: null,
          cantidad: 1,
          stock_unidad_id: s.stock_item_id,
          nro_serie: nroSerie ?? null,
          ubicacion_origen_id: null,
          ubicacion_destino_id: null,
          deposito_origen_id: null,
          deposito_destino_id: null,
          ubicaciones_origen: null,
          ubicaciones_destino: null,
          depositos_origen: null,
          depositos_destino: null,
          origen_tipo: "orden_entrega",
          origen_id: s.oe_id ?? null,
          origen_numero: s.oe_numero ?? s.numero ?? null,
          usuario: null,
          observaciones: s.nota_venta_numero ? `Reserva por NV ${s.nota_venta_numero} (seña ${s.numero})` : `Seña ${s.numero}`,
          created_at: s.created_at,
        })
      }
    }
    // 2. OEs cuyo JSONB productos referencia esta serie (NV-directa).
    // Filtrado JS — Supabase no soporta `@>` con JSONB anidado complejo.
    if (nroSerie) {
      const { data: oes } = await supabase
        .from("ordenes_entrega")
        .select("id, numero, nota_venta_numero, productos, created_at")
        .not("productos", "is", null)
        .range(0, 4999)
      for (const oe of oes ?? []) {
        if (seenOEs.has(oe.numero)) continue
        const prods = Array.isArray(oe.productos) ? oe.productos : []
        const match = prods.some((p: any) => {
          if (String(p.imei ?? "") === nroSerie) return true
          const series = Array.isArray(p.series_seleccionadas) ? p.series_seleccionadas : []
          return series.some((s: any) => String(s?.serie ?? s?.nro_serie ?? s ?? "") === nroSerie)
        })
        if (match) {
          reservas.push({
            id: `oe-${oe.id}`,
            tipo: "reserva",
            producto_id: null,
            productos: null,
            cantidad: 1,
            stock_unidad_id: null,
            nro_serie: nroSerie,
            ubicacion_origen_id: null,
            ubicacion_destino_id: null,
            deposito_origen_id: null,
            deposito_destino_id: null,
            ubicaciones_origen: null,
            ubicaciones_destino: null,
            depositos_origen: null,
            depositos_destino: null,
            origen_tipo: "orden_entrega",
            origen_id: oe.id,
            origen_numero: oe.numero,
            usuario: null,
            observaciones: oe.nota_venta_numero ? `Reserva por NV ${oe.nota_venta_numero}` : null,
            created_at: oe.created_at,
          })
        }
      }
    }
  }

  // Mergear todo y reordenar por fecha desc.
  const merged = [...(data ?? []), ...extras, ...reservas].sort(
    (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  return NextResponse.json(merged)
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const movimientos = Array.isArray(body) ? body : [body]

  const { data, error } = await supabase
    .from("movimientos_stock")
    .insert(movimientos.map((m: any) => ({
      tipo: m.tipo,
      producto_id: m.producto_id || null,
      producto_nombre: m.producto_nombre,
      ubicacion_origen_id: m.ubicacion_origen_id || null,
      ubicacion_destino_id: m.ubicacion_destino_id || null,
      deposito_origen_id: m.deposito_origen_id || null,
      deposito_destino_id: m.deposito_destino_id || null,
      cantidad: m.cantidad ?? 1,
      stock_unidad_id: m.stock_unidad_id || null,
      nro_serie: m.nro_serie || null,
      origen_tipo: m.origen_tipo || null,
      origen_id: m.origen_id || null,
      origen_numero: m.origen_numero || null,
      usuario: m.usuario ?? "Admin",
      observaciones: m.observaciones || null,
    })))
    .select()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
