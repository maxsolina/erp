import { dbError } from "@/lib/api-utils"
// v3 - sin console.log
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { registrarEvento } from "@/lib/seguimiento"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const COLUMNAS = new Set([
  "imagen_url", "nombre", "codigo_interno", "categoria", "marca", "modelo",
  "color", "tipo", "puede_venderse", "puede_comprarse", "activo",
  "stock_real", "stock_minimo", "stock_maximo", "stock_critico",
  "tiene_numero_serie", "requiere_color", "requiere_bateria",
  "requiere_outlet", "requiere_observaciones",
  "costo_manual", "moneda_costo", "tipo_cotizacion_costo", "costo_contable", "costo_ars", "costo_usd", "historial_costos",
  "garantia_propia_valor", "garantia_propia_unidad",
  "garantia_fabricante_valor", "garantia_fabricante_unidad",
  "iva_venta", "iva_compra", "cuenta_ventas", "cuenta_existencias", "observaciones",
])

function filtrarPayload(body: Record<string, any>) {
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(body)) {
    if (COLUMNAS.has(k)) result[k] = v
  }
  if (!result.historial_costos) result.historial_costos = []
  return result
}

export async function GET(request: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const busqueda = searchParams.get("busqueda") || ""
  const activo = searchParams.get("activo")
  const tipo = searchParams.get("tipo")

  let query = supabase.from("productos").select("*").order("id", { ascending: false }).range(0, 49999)

  if (busqueda) {
    query = query.or(
      `nombre.ilike.%${busqueda}%,codigo_interno.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%,marca.ilike.%${busqueda}%`
    )
  }
  if (activo !== null && activo !== "") {
    query = query.eq("activo", activo === "true")
  }
  if (tipo && tipo !== "todos") {
    query = query.eq("tipo", tipo)
  }

  const { data, error } = await query
  if (error) return dbError(error)

  // Para productos con `tiene_numero_serie=true`, el stock se trackea unidad a
  // unidad en `stock_unidades` y la columna `productos.stock_real` queda obsoleta
  // (nadie la mantiene desde recepciones / entregas / ajustes a unidad). Lo
  // recomputamos en vivo: cuenta de unidades en estados "vivos" (NO entregado,
  // NO dado_de_baja). Para productos sin serie respeta el valor de la columna.
  const serializedIds = (data ?? []).filter(p => p.tiene_numero_serie).map(p => p.id)
  if (serializedIds.length > 0) {
    const { data: unidades } = await supabase
      .from("stock_unidades")
      .select("producto_id, estado")
      .in("producto_id", serializedIds)
      .range(0, 49999)
    const counts: Record<number, number> = {}
    for (const u of unidades ?? []) {
      if (u.estado === "entregado" || u.estado === "dado_de_baja") continue
      counts[u.producto_id] = (counts[u.producto_id] ?? 0) + 1
    }
    for (const p of data ?? []) {
      if (p.tiene_numero_serie) p.stock_real = counts[p.id] ?? 0
    }
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  const body = await request.json()
  const payload = filtrarPayload(body)

  const { data, error } = await supabase
    .from("productos")
    .insert([payload])
    .select()
    .single()

  if (error) return dbError(error)

  await registrarEvento(supabase, {
    tipo_documento: "producto",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Producto ${data.codigo_interno ?? ""} ${data.nombre ?? ""}`.trim(),
  })

  return NextResponse.json(data, { status: 201 })
}
