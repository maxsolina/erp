import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/listas-precios/versiones?lista_id=1
// Devuelve versiones con sus líneas embebidas
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const lista_id = searchParams.get("lista_id")

  let query = supabase
    .from("versiones_lista_precios")
    .select(`
      *,
      listas_precios(nombre),
      version_lista_precios_lineas(*)
    `)
    .order("created_at", { ascending: false })

  if (lista_id) {
    query = query.eq("lista_precios_id", lista_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mapear al formato que espera el frontend
  const result = (data ?? []).map((v: any) => ({
    id: v.id,
    lista_precios_id: v.lista_precios_id,
    lista_precios_nombre: v.listas_precios?.nombre ?? "",
    nombre: v.nombre,
    fecha_inicial: v.fecha_inicial,
    fecha_final: v.fecha_final ?? null,
    activa: v.activa,
    estado: v.estado,
    ultima_actualizacion: v.ultima_actualizacion,
    seguimiento: v.seguimiento ?? [],
    lineas: (v.version_lista_precios_lineas ?? []).map((l: any) => ({
      id: l.id,
      producto_id: l.producto_id,
      producto_codigo: l.producto_codigo,
      producto_nombre: l.producto_nombre,
      costo_moneda: l.costo_moneda,
      costo_importe: Number(l.costo_importe),
      cotizacion_dolar: Number(l.cotizacion_dolar),
      markup_porcentaje: Number(l.markup_porcentaje),
      markup_nominal: Number(l.markup_nominal),
      forzar_precio_pesos: l.forzar_precio_pesos,
      precio_forzado_ars: l.precio_forzado_ars !== null ? Number(l.precio_forzado_ars) : null,
      precio_venta: Number(l.precio_venta),
      precio_venta_moneda: l.precio_venta_moneda,
      iva: Number(l.iva),
    })),
  }))

  return NextResponse.json(result)
}

// POST /api/listas-precios/versiones
// Crea una versión nueva con sus líneas opcionales
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const { lineas, lista_precios_nombre, ...versionData } = body

  const ESTADOS_VALIDOS = ["borrador", "confirmada", "activa", "cerrada"]
  const estadoRaw = (versionData.estado ?? "borrador").toLowerCase()
  const estadoNorm = ESTADOS_VALIDOS.includes(estadoRaw) ? estadoRaw : "borrador"

  const { data: version, error: vErr } = await supabase
    .from("versiones_lista_precios")
    .insert({
      lista_precios_id: versionData.lista_precios_id,
      nombre: versionData.nombre,
      fecha_inicial: versionData.fecha_inicial ?? new Date().toISOString().split("T")[0],
      fecha_final: versionData.fecha_final ?? null,
      activa: versionData.activa ?? false,
      estado: estadoNorm,
      seguimiento: versionData.seguimiento ?? [],
      ultima_actualizacion: new Date().toISOString(),
    })
    .select()
    .single()

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })

  // Insertar líneas si vienen
  let lineasInsertadas: any[] = []
  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasToInsert = lineas.map((l: any) => ({
      version_id: version.id,
      producto_id: l.producto_id,
      producto_codigo: l.producto_codigo ?? "",
      producto_nombre: l.producto_nombre ?? "",
      costo_moneda: l.costo_moneda ?? "ARS",
      costo_importe: l.costo_importe ?? 0,
      cotizacion_dolar: l.cotizacion_dolar ?? 0,
      markup_porcentaje: l.markup_porcentaje ?? 0,
      markup_nominal: l.markup_nominal ?? 0,
      forzar_precio_pesos: l.forzar_precio_pesos ?? false,
      precio_forzado_ars: l.precio_forzado_ars ?? null,
      precio_venta: l.precio_venta ?? 0,
      precio_venta_moneda: l.precio_venta_moneda ?? "ARS",
      iva: l.iva ?? 21,
    }))

    const { data: lData, error: lErr } = await supabase
      .from("version_lista_precios_lineas")
      .insert(lineasToInsert)
      .select()

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })
    lineasInsertadas = lData ?? []
  }

  return NextResponse.json({
    ...version,
    lista_precios_nombre: lista_precios_nombre ?? "",
    lineas: lineasInsertadas,
    seguimiento: version.seguimiento ?? [],
  })
}
