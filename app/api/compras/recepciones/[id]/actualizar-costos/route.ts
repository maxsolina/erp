import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/compras/recepciones/[id]/actualizar-costos
 *
 * Sistema de "último costo":
 * - Si la recepción es de origen toma_equipo → no actualiza, devuelve { skip: true }
 * - Para cada ítem de la recepción con cantidad_recibida > 0:
 *   - Si el ítem tiene nac: true → no actualiza ese producto
 *   - Si no → actualiza productos.costo_contable = precio_unitario
 * - Idempotente: puede llamarse múltiples veces sin riesgo
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la recepción con sus items
  const { data: rec, error: recErr } = await supabase
    .from("recepciones")
    .select("id, numero, documento_origen_tipo, items")
    .eq("id", id)
    .single()

  if (recErr || !rec) {
    return NextResponse.json(
      { error: "Recepción no encontrada", detail: recErr?.message },
      { status: 404 }
    )
  }

  // 2. No actualizar si proviene de toma de equipo
  if (rec.documento_origen_tipo === "toma_equipo") {
    return NextResponse.json({ skip: true, reason: "toma_equipo" })
  }

  // 3. Obtener items (columna 'items' JSONB en la tabla recepciones)
  const items: any[] = Array.isArray(rec.items) ? rec.items : []

  if (items.length === 0) {
    return NextResponse.json({ ok: true, actualizados: [] })
  }

  // 4. Filtrar líneas que corresponde actualizar
  const lineasActualizar = items.filter(
    (l: any) => l.nac !== true && (l.cantidad_recibida ?? 0) > 0 && l.producto_id && l.precio_unitario > 0
  )

  if (lineasActualizar.length === 0) {
    return NextResponse.json({ ok: true, actualizados: [], message: "Todas las líneas con NAC o sin cantidad" })
  }

  // 5. Actualizar costo_contable de cada producto (usar adminClient para saltar RLS)
  const actualizados: { producto_id: number; costo_anterior: number | null; costo_nuevo: number }[] = []
  const errores: string[] = []

  for (const linea of lineasActualizar) {
    const productoId = linea.producto_id
    const costoNuevo = linea.precio_unitario

    // Leer costo actual e historial para auditoría y trazabilidad
    const { data: prod } = await supabase
      .from("productos")
      .select("id, costo_contable, historial_costos")
      .eq("id", productoId)
      .maybeSingle()

    const historialActual: any[] = Array.isArray(prod?.historial_costos) ? prod.historial_costos : []
    const nuevaEntrada = {
      fecha: new Date().toISOString(),
      valor_anterior: prod?.costo_contable ?? 0,
      valor_nuevo: costoNuevo,
      moneda: "ARS",
      usuario: "sistema",
      origen: "recepcion",
      referencia: rec.numero,
    }

    const { error: updErr } = await adminClient
      .from("productos")
      .update({
        costo_contable: costoNuevo,
        historial_costos: [...historialActual, nuevaEntrada],
      })
      .eq("id", productoId)

    if (updErr) {
      errores.push(`producto_id ${productoId}: ${updErr.message}`)
    } else {
      actualizados.push({
        producto_id: productoId,
        costo_anterior: prod?.costo_contable ?? null,
        costo_nuevo: costoNuevo,
      })
    }
  }

  if (errores.length > 0 && actualizados.length === 0) {
    return NextResponse.json(
      { ok: false, error: errores.join("; "), actualizados },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    recepcion_id: rec.id,
    recepcion_numero: rec.numero,
    actualizados,
    errores: errores.length > 0 ? errores : undefined,
  })
}
