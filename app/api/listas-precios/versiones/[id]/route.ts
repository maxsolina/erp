import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PUT /api/listas-precios/versiones/[id]
// Actualiza la versión y reemplaza sus líneas por completo
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json()

  const { lineas, lista_precios_nombre, id: _id, created_at, ...versionData } = body

  // Actualizar la versión
  const { data: version, error: vErr } = await supabase
    .from("versiones_lista_precios")
    .update({
      nombre: versionData.nombre,
      fecha_inicial: versionData.fecha_inicial,
      fecha_final: versionData.fecha_final ?? null,
      activa: versionData.activa ?? false,
      estado: versionData.estado ?? "borrador",
      seguimiento: versionData.seguimiento ?? [],
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })

  // Reemplazar líneas: borrar las actuales e insertar las nuevas
  const { error: delErr } = await supabase
    .from("version_lista_precios_lineas")
    .delete()
    .eq("version_id", id)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  let lineasInsertadas: any[] = []
  if (Array.isArray(lineas) && lineas.length > 0) {
    const lineasToInsert = lineas.map((l: any) => ({
      version_id: Number(id),
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
    lineas: lineasInsertadas.map((l: any) => ({
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
    seguimiento: version.seguimiento ?? [],
  })
}

// DELETE /api/listas-precios/versiones/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params

  const { error } = await supabase
    .from("versiones_lista_precios")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
