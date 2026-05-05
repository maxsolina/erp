import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

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

  console.log(`[PUT versiones/${id}] lineas recibidas:`, Array.isArray(lineas) ? lineas.length : typeof lineas, lineas)

  // Snapshot ANTES del update — para detectar diff de cabecera y de líneas
  // (precios). Los eventos de cambio se registran al final.
  const { data: versionAntes } = await supabase
    .from("versiones_lista_precios")
    .select("nombre, fecha_inicial, fecha_final, activa, estado")
    .eq("id", id)
    .maybeSingle()
  const { data: lineasAntes } = await supabase
    .from("version_lista_precios_lineas")
    .select("producto_id, producto_nombre, costo_importe, markup_porcentaje, precio_venta, precio_venta_moneda, forzar_precio_pesos, precio_forzado_ars, iva")
    .eq("version_id", id)

  const ESTADOS_VALIDOS = ["borrador", "confirmada", "activa", "cerrada"]
  const estadoRaw = (versionData.estado ?? "borrador").toLowerCase()
  const estadoNorm = ESTADOS_VALIDOS.includes(estadoRaw) ? estadoRaw : "borrador"

  // Actualizar la versión
  const { data: version, error: vErr } = await supabase
    .from("versiones_lista_precios")
    .update({
      nombre: versionData.nombre,
      fecha_inicial: versionData.fecha_inicial ?? new Date().toISOString().split("T")[0],
      fecha_final: versionData.fecha_final ?? null,
      activa: versionData.activa ?? false,
      estado: estadoNorm,
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

  // ── Eventos de seguimiento: diff cabecera + diff líneas ──────────────────
  // Cabecera: emitir cambio_campo por cada metadata que cambió.
  if (versionAntes) {
    const camposCabecera: { key: string; label: string }[] = [
      { key: "nombre", label: "Nombre" },
      { key: "fecha_inicial", label: "Fecha inicial" },
      { key: "fecha_final", label: "Fecha final" },
      { key: "activa", label: "Activa" },
      { key: "estado", label: "Estado" },
    ]
    for (const { key, label } of camposCabecera) {
      const va = (versionAntes as Record<string, unknown>)[key]
      const vb = (version as Record<string, unknown>)[key]
      if (String(va ?? "") !== String(vb ?? "")) {
        await registrarEvento(supabase, {
          tipo_documento: "lista_precio_version",
          documento_id: Number(id),
          tipo_evento: "cambio_campo",
          campo: label,
          valor_anterior: va == null ? null : String(va),
          valor_nuevo: vb == null ? null : String(vb),
          usuario: body.usuario ?? null,
        })
      }
    }
  }

  // Líneas: comparar antes vs después por producto_id. Emitir un evento por
  // cada producto que cambió de precio (precio_venta o precio_forzado_ars o
  // costo_importe o markup), con el detalle del cambio.
  const antesById = new Map<number, any>()
  for (const l of lineasAntes ?? []) antesById.set(l.producto_id, l)
  const despuesById = new Map<number, any>()
  for (const l of lineasInsertadas) despuesById.set(l.producto_id, l)

  // Productos que estaban antes y desaparecieron
  for (const [pid, la] of antesById) {
    if (!despuesById.has(pid)) {
      await registrarEvento(supabase, {
        tipo_documento: "lista_precio_version",
        documento_id: Number(id),
        tipo_evento: "nota",
        descripcion: `Producto eliminado de la versión: ${la.producto_nombre ?? `#${pid}`} (precio era ${la.precio_venta} ${la.precio_venta_moneda ?? "ARS"})`,
        usuario: body.usuario ?? null,
      })
    }
  }
  // Productos nuevos
  for (const [pid, ld] of despuesById) {
    if (!antesById.has(pid)) {
      await registrarEvento(supabase, {
        tipo_documento: "lista_precio_version",
        documento_id: Number(id),
        tipo_evento: "nota",
        descripcion: `Producto agregado a la versión: ${ld.producto_nombre ?? `#${pid}`} (precio ${ld.precio_venta} ${ld.precio_venta_moneda ?? "ARS"})`,
        usuario: body.usuario ?? null,
      })
    }
  }
  // Productos que cambiaron de precio
  for (const [pid, la] of antesById) {
    const ld = despuesById.get(pid)
    if (!ld) continue
    const nombre = ld.producto_nombre ?? la.producto_nombre ?? `#${pid}`
    const cambios: string[] = []
    if (Number(la.costo_importe) !== Number(ld.costo_importe)) {
      cambios.push(`costo ${la.costo_importe} → ${ld.costo_importe}`)
    }
    if (Number(la.markup_porcentaje) !== Number(ld.markup_porcentaje)) {
      cambios.push(`markup ${la.markup_porcentaje}% → ${ld.markup_porcentaje}%`)
    }
    if (Number(la.precio_venta) !== Number(ld.precio_venta)) {
      cambios.push(`precio ${la.precio_venta} → ${ld.precio_venta} ${ld.precio_venta_moneda ?? ""}`.trim())
    }
    if (Number(la.precio_forzado_ars ?? 0) !== Number(ld.precio_forzado_ars ?? 0)) {
      cambios.push(`precio forzado ARS ${la.precio_forzado_ars ?? "—"} → ${ld.precio_forzado_ars ?? "—"}`)
    }
    if (la.forzar_precio_pesos !== ld.forzar_precio_pesos) {
      cambios.push(`forzar pesos ${la.forzar_precio_pesos ? "sí" : "no"} → ${ld.forzar_precio_pesos ? "sí" : "no"}`)
    }
    if (Number(la.iva) !== Number(ld.iva)) {
      cambios.push(`IVA ${la.iva}% → ${ld.iva}%`)
    }
    if (cambios.length > 0) {
      await registrarEvento(supabase, {
        tipo_documento: "lista_precio_version",
        documento_id: Number(id),
        tipo_evento: "cambio_campo",
        campo: nombre,
        valor_anterior: null,
        valor_nuevo: cambios.join(" · "),
        usuario: body.usuario ?? null,
      })
    }
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

  // Capturamos el evento de borrado ANTES porque el FK ON DELETE CASCADE de
  // documentos_seguimiento.documento_id no existe — el evento queda como
  // referencia al documento ya inexistente.
  await registrarEvento(supabase, {
    tipo_documento: "lista_precio_version",
    documento_id: Number(id),
    tipo_evento: "cambio_estado",
    valor_anterior: "vigente",
    valor_nuevo: "eliminada",
    usuario: null,
  })

  const { error } = await supabase
    .from("versiones_lista_precios")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
