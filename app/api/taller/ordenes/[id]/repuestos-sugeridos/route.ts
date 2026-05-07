import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/taller/ordenes/[id]/repuestos-sugeridos
// Calcula los repuestos sugeridos para una OT basándose en su (equipo,
// falla principal, fallas secundarias) cruzando con la tabla maestro
// `taller_fallas_por_equipo_repuestos`. Inserta en `taller_ot_repuestos`
// solo los productos que NO estén ya cargados (no pisa cambios manuales).
//
// Body: vacío (usa los IDs de la OT).
// Response: { agregados: N, skip_duplicados: N, mensaje: string }
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Cargar la OT con su falla principal y fallas secundarias
  const { data: ot, error: otErr } = await supabase
    .from("taller_ordenes_trabajo")
    .select("id, equipo_id, falla_principal_id")
    .eq("id", id)
    .single()
  if (otErr || !ot) return NextResponse.json({ error: "OT no encontrada" }, { status: 404 })
  if (!ot.equipo_id) {
    return NextResponse.json({ error: "La OT no tiene equipo asignado" }, { status: 422 })
  }

  const { data: secs } = await supabase
    .from("taller_ot_fallas_secundarias")
    .select("falla_id")
    .eq("ot_id", id)

  const fallaIds: string[] = [
    ...(ot.falla_principal_id ? [ot.falla_principal_id] : []),
    ...(secs ?? []).map(s => s.falla_id),
  ]
  if (fallaIds.length === 0) {
    return NextResponse.json({
      agregados: 0,
      skip_duplicados: 0,
      mensaje: "La OT no tiene fallas asignadas, no hay repuestos para sugerir",
    })
  }

  // 2. Buscar las fallas-equipo que matcheen (equipo + falla)
  const { data: fallaEquipos } = await supabase
    .from("taller_fallas_por_equipo")
    .select("id")
    .eq("equipo_id", ot.equipo_id)
    .in("falla_id", fallaIds)

  const fallaEquipoIds = (fallaEquipos ?? []).map(f => f.id)
  if (fallaEquipoIds.length === 0) {
    return NextResponse.json({
      agregados: 0,
      skip_duplicados: 0,
      mensaje: "No hay coincidencias en 'Fallas por Equipo' para este equipo + fallas. Cargá la combinación en Configuración → Fallas por Equipos para activar la sugerencia automática.",
    })
  }

  // 3. Cargar todos los repuestos sugeridos (puede haber duplicados entre fallas)
  const { data: repuestosSugeridos } = await supabase
    .from("taller_fallas_por_equipo_repuestos")
    .select("producto_id, cantidad")
    .in("falla_equipo_id", fallaEquipoIds)

  if (!repuestosSugeridos?.length) {
    return NextResponse.json({
      agregados: 0,
      skip_duplicados: 0,
      mensaje: "Las fallas vinculadas no tienen repuestos definidos. Editá la falla por equipo y agregá repuestos para activar la sugerencia.",
    })
  }

  // 4. Agregar cantidades por producto_id
  const acumulado = new Map<number, number>()
  for (const r of repuestosSugeridos) {
    const pid = Number(r.producto_id)
    if (!pid) continue
    acumulado.set(pid, (acumulado.get(pid) ?? 0) + Number(r.cantidad ?? 1))
  }

  // 5. Cargar info de productos (nombre + costo de referencia). Usamos
  // costo_contable como precio inicial sugerido — el operador puede ajustarlo
  // manualmente desde la pestaña de Repuestos antes de facturar.
  const productoIds = [...acumulado.keys()]
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, costo_contable, costo_manual")
    .in("id", productoIds)

  const productoMap = new Map<number, { nombre: string; precio: number }>()
  for (const p of productos ?? []) {
    productoMap.set(Number(p.id), {
      nombre: p.nombre,
      precio: Number(p.costo_contable ?? p.costo_manual ?? 0),
    })
  }

  // 6. Verificar qué productos YA están en taller_ot_repuestos para no duplicar
  const { data: existentes } = await supabase
    .from("taller_ot_repuestos")
    .select("producto_id")
    .eq("ot_id", id)
  const yaCargados = new Set((existentes ?? []).map(r => Number(r.producto_id)))

  // 7. Insertar los nuevos
  const aInsertar: Array<Record<string, unknown>> = []
  let skipDuplicados = 0
  for (const [pid, cant] of acumulado.entries()) {
    if (yaCargados.has(pid)) {
      skipDuplicados++
      continue
    }
    const info = productoMap.get(pid)
    const subtotal = (info?.precio ?? 0) * cant
    aInsertar.push({
      ot_id: id,
      producto_id: pid,
      producto_nombre: info?.nombre ?? `Producto #${pid}`,
      cantidad: cant,
      unidad: "un",
      precio_unitario: info?.precio ?? 0,
      descuento_pct: 0,
      subtotal,
      total: subtotal,
    })
  }

  if (aInsertar.length === 0) {
    return NextResponse.json({
      agregados: 0,
      skip_duplicados: skipDuplicados,
      mensaje: skipDuplicados > 0
        ? `Todos los repuestos sugeridos (${skipDuplicados}) ya estaban cargados.`
        : "Sin cambios.",
    })
  }

  const { error: insErr } = await supabase
    .from("taller_ot_repuestos")
    .insert(aInsertar)
  if (insErr) return dbError(insErr)

  return NextResponse.json({
    agregados: aInsertar.length,
    skip_duplicados: skipDuplicados,
    mensaje: `Se cargaron ${aInsertar.length} repuesto(s) sugerido(s).${skipDuplicados ? ` (${skipDuplicados} ya estaban cargados, se respetaron)` : ""}`,
  })
}
