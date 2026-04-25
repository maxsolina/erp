import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoRecepcionTomaEquipo } from "@/lib/contabilidad-asiento-factory"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  // Admin necesario: generarAsientoRecepcionTomaEquipo inserta en contabilidad_asientos,
  // tabla con RLS restrictivo que requiere service_role para bypass.
  const adminClient = createAdminClient()
  const { id } = await params
  const tomaId = parseInt(id)
  const body = await req.json()
  const { imei, color, bateria_pct, outlet, ubicacion_id, observaciones } = body

  if (!imei?.trim()) {
    return NextResponse.json({ error: "El IMEI es requerido" }, { status: 400 })
  }
  if (!color?.trim()) {
    return NextResponse.json({ error: "El color es requerido" }, { status: 400 })
  }
  if (bateria_pct === undefined || bateria_pct === null) {
    return NextResponse.json({ error: "El % de batería es requerido" }, { status: 400 })
  }
  if (!ubicacion_id) {
    return NextResponse.json({ error: "La ubicación es requerida" }, { status: 400 })
  }

  // Obtener la recepción de toma pendiente + datos de la toma (producto_id, sucursal_id)
  const { data: recepcion, error: errRec } = await supabase
    .from("recepciones_toma")
    .select("id, numero, sucursal_id")
    .eq("toma_equipo_id", tomaId)
    .eq("estado", "pendiente")
    .single()

  if (errRec || !recepcion) {
    return NextResponse.json({ error: "Recepción pendiente no encontrada" }, { status: 404 })
  }

  // Obtener la toma para el producto_id y nombre del equipo
  const { data: toma } = await supabase
    .from("tomas_equipo")
    .select("producto_id, modelo_equipo, precio_final, cliente_nombre")
    .eq("id", tomaId)
    .single()

  // Obtener la ubicación para saber el deposito_id
  const { data: ubicacion } = await supabase
    .from("ubicaciones")
    .select("id, nombre, deposito_id")
    .eq("id", Number(ubicacion_id))
    .single()

  const depositoId = ubicacion?.deposito_id ?? null

  // Actualizar la recepción a recibida con todos los datos del equipo
  const { error: errUpdate } = await supabase
    .from("recepciones_toma")
    .update({
      estado: "recibido",
      imei: imei.trim(),
      color: color.trim(),
      bateria_pct: Number(bateria_pct),
      outlet: Boolean(outlet),
      ubicacion_id: Number(ubicacion_id),
      observaciones: observaciones?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recepcion.id)

  if (errUpdate) {
    console.error("[confirmar-recepcion] update error:", errUpdate)
    const msg = errUpdate.message?.includes("column")
      ? `Falta ejecutar la migración SQL en Supabase: ${errUpdate.message}`
      : errUpdate.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Actualizar estado_recepcion en la toma
  await supabase
    .from("tomas_equipo")
    .update({ estado_recepcion: "recibido", updated_at: new Date().toISOString() })
    .eq("id", tomaId)

  // Ingresar el equipo al stock si tenemos producto_id y deposito_id
  if (toma?.producto_id && depositoId) {
    const { error: stockErr } = await supabase
      .from("stock_unidades")
      .insert({
        producto_id: toma.producto_id,
        ubicacion_id: Number(ubicacion_id),
        deposito_id: depositoId,
        nro_serie: imei.trim(),
        color: color.trim(),
        bateria_pct: Number(bateria_pct),
        es_outlet: Boolean(outlet),
        observaciones: observaciones?.trim() || null,
        estado: "disponible",
        origen_tipo: "toma_equipo",
        origen_id: recepcion.id,
        origen_numero: recepcion.numero,
      })

    if (stockErr) {
      console.error("[confirmar-recepcion] stock insert error:", stockErr.message)
    } else {
      // Registrar movimiento de stock
      await supabase
        .from("movimientos_stock")
        .insert({
          tipo: "entrada_recepcion",
          producto_id: toma.producto_id,
          producto_nombre: toma.modelo_equipo,
          ubicacion_destino_id: Number(ubicacion_id),
          deposito_destino_id: depositoId,
          cantidad: 1,
          nro_serie: imei.trim(),
          origen_tipo: "toma_equipo",
          origen_id: recepcion.id,
          origen_numero: recepcion.numero,
          usuario: "Admin",
        })
    }
  }

  // Generar asiento contable de la recepción TE
  const sucursalNombre = recepcion.sucursal_id
    ? (await supabase.from("sucursales").select("nombre").eq("id", recepcion.sucursal_id).maybeSingle()).data?.nombre ?? null
    : null
  const asientoRep = await generarAsientoRecepcionTomaEquipo(adminClient, {
    id: recepcion.id,
    numero: recepcion.numero,
    fecha: new Date().toISOString().split("T")[0],
    cliente_nombre: toma?.cliente_nombre ?? null,
    sucursal: sucursalNombre,
    total: toma?.precio_final ?? 0,
  })
  if (asientoRep.ok) {
    await supabase
      .from("recepciones_toma")
      .update({ asiento_id: asientoRep.asiento_id } as any)
      .eq("id", recepcion.id)
  } else {
    console.error("[confirmar-recepcion-te] asiento error:", asientoRep.error)
  }

  return NextResponse.json({ ok: true, recepcion_numero: recepcion.numero, imei, color, bateria_pct, outlet, ubicacion_id })
}
