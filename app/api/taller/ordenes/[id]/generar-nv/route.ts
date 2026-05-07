import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

// POST /api/taller/ordenes/[id]/generar-nv
//
// Genera una Nota de Venta pre-cargada desde la OT, con:
//   • Cabecera: cliente_id, sucursal_id, moneda ARS por defecto, estado
//     "borrador" (presupuesto editable) o "abierta" si la DB no soporta
//     borrador todavía. ot_id queda vinculado a la NV.
//   • Líneas:
//       - Una por cada repuesto en taller_ot_repuestos
//       - Una línea adicional "Mano de obra reparación" con importe
//         igual a presupuesto_estimado (si está cargado)
//
// Si la OT ya tiene una NV NO cancelada vinculada, devuelve error 409
// para evitar duplicados. Para regenerarla, primero cancelar la vieja
// (eso lo hace el flujo de re-presupuestación, fase 4).

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabase()
  const body = await req.json().catch(() => ({}))

  // 1. Cargar la OT
  const { data: ot, error: otErr } = await supabase
    .from("taller_ordenes_trabajo")
    .select("id, numero, cliente_id, sucursal_id, presupuesto_estimado, descripcion, estado, equipo_id")
    .eq("id", id)
    .single()
  if (otErr || !ot) return NextResponse.json({ error: "OT no encontrada" }, { status: 404 })
  if (!ot.cliente_id) {
    return NextResponse.json({ error: "La OT no tiene cliente asignado" }, { status: 422 })
  }
  if (ot.estado === "cancelada" || ot.estado === "entregado") {
    return NextResponse.json({ error: `No se puede generar NV en estado "${ot.estado}"` }, { status: 422 })
  }

  // 2. Verificar que no haya NV vigente vinculada
  const { data: nvExistente } = await supabase
    .from("notas_venta")
    .select("id, numero, estado")
    .eq("ot_id", id)
    .neq("estado", "cancelada")
    .maybeSingle()
  if (nvExistente) {
    // Si el caller pidió regenerar (re-presupuestación), cancela la NV
    // anterior automáticamente. Solo se permite si la NV no fue facturada
    // todavía (estados borrador / abierta / a_facturar). Si ya hay factura,
    // hay que hacer NC primero, no se permite la regeneración silenciosa.
    if (body.force_regenerate) {
      const estadosCancelables = ["borrador", "abierta", "a_facturar"]
      if (!estadosCancelables.includes(nvExistente.estado)) {
        return NextResponse.json({
          error: `La NV ${nvExistente.numero} ya está en estado "${nvExistente.estado}". No se puede regenerar — primero hay que cancelarla manualmente o emitir Nota de Crédito.`,
        }, { status: 422 })
      }
      const { error: cancelErr } = await supabase
        .from("notas_venta")
        .update({ estado: "cancelada", updated_at: new Date().toISOString() })
        .eq("id", nvExistente.id)
      if (cancelErr) return dbError(cancelErr)
      // Registrar evento de cancelación
      await registrarEvento(supabase, {
        tipo_documento: "nota_venta",
        documento_id: nvExistente.id,
        tipo_evento: "cambio_estado",
        valor_anterior: nvExistente.estado,
        valor_nuevo: "cancelada",
        usuario: body.usuario ?? null,
      })
    } else {
      return NextResponse.json({
        error: `Ya existe la NV ${nvExistente.numero} (estado ${nvExistente.estado}) vinculada a esta OT. Para regenerar primero cancelala.`,
        nv_existente: nvExistente,
      }, { status: 409 })
    }
  }

  // 3. Cargar repuestos de la OT
  const { data: repuestos } = await supabase
    .from("taller_ot_repuestos")
    .select("producto_id, producto_nombre, cantidad, unidad, precio_unitario, descuento_pct, subtotal, total")
    .eq("ot_id", id)
    .order("id")

  // 4. Cargar info del equipo para descripción de la línea de mano de obra
  let equipoLabel = ""
  if (ot.equipo_id) {
    const { data: eq } = await supabase
      .from("taller_equipos")
      .select("nombre, marca, modelo")
      .eq("id", ot.equipo_id)
      .maybeSingle()
    if (eq) {
      equipoLabel = [eq.nombre, eq.marca, eq.modelo].filter(Boolean).join(" ")
    }
  }

  // 5. Construir líneas: repuestos + mano de obra
  type LineaNV = {
    producto_id: number | null
    producto_nombre: string
    descripcion: string | null
    cantidad: number
    precio_unitario: number
    descuento: number
    subtotal: number
    iva: number
  }

  const lineas: LineaNV[] = []

  for (const r of repuestos ?? []) {
    const cant = Number(r.cantidad ?? 1)
    const precio = Number(r.precio_unitario ?? 0)
    const desc = Number(r.descuento_pct ?? 0)
    const sub = cant * precio * (1 - desc / 100)
    lineas.push({
      producto_id: r.producto_id ? Number(r.producto_id) : null,
      producto_nombre: r.producto_nombre ?? "Repuesto",
      descripcion: null,
      cantidad: cant,
      precio_unitario: precio,
      descuento: desc,
      subtotal: Math.round(sub * 100) / 100,
      iva: 21,
    })
  }

  // Línea de mano de obra (si hay presupuesto estimado)
  const manoObra = Number(ot.presupuesto_estimado ?? 0)
  if (manoObra > 0) {
    lineas.push({
      producto_id: null,
      producto_nombre: "Mano de obra reparación",
      descripcion: `OT ${ot.numero}${equipoLabel ? ` — ${equipoLabel}` : ""}`,
      cantidad: 1,
      precio_unitario: manoObra,
      descuento: 0,
      subtotal: manoObra,
      iva: 21,
    })
  }

  if (lineas.length === 0) {
    return NextResponse.json({
      error: "La OT no tiene repuestos cargados ni presupuesto estimado, no hay nada para facturar. Cargá repuestos o un presupuesto antes de generar la NV.",
    }, { status: 422 })
  }

  // 6. Calcular totales
  const subtotal = lineas.reduce((a, l) => a + l.subtotal, 0)
  const impuestos = lineas.reduce((a, l) => a + l.subtotal * (l.iva / 100), 0)
  const total = subtotal + impuestos

  // 7. Generar número de NV
  const { data: lastNv } = await supabase
    .from("notas_venta")
    .select("numero")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastNum = lastNv?.numero
    ? parseInt(lastNv.numero.replace(/\D/g, "").slice(-8), 10)
    : 10737
  const numeroFinal = `NV X 10000-${String(lastNum + 1).padStart(8, "0")}`

  // 8. Insertar NV con estado "borrador" (intentar) o caer a "abierta"
  const buildPayload = (estadoUsado: string) => ({
    numero: numeroFinal,
    cliente_id: ot.cliente_id,
    sucursal_id: ot.sucursal_id ?? null,
    moneda: "ARS",
    estado: estadoUsado,
    subtotal: Math.round(subtotal * 100) / 100,
    impuestos: Math.round(impuestos * 100) / 100,
    total: Math.round(total * 100) / 100,
    notas: ot.descripcion ?? null,
    ot_id: id,
  })

  let { data: nv, error: nvErr } = await supabase
    .from("notas_venta")
    .insert(buildPayload("borrador"))
    .select()
    .single()

  // Fallback si la DB no soporta "borrador" todavía
  if (nvErr?.code === "23514") {
    const fb = await supabase
      .from("notas_venta")
      .insert(buildPayload("abierta"))
      .select()
      .single()
    nv = fb.data
    nvErr = fb.error
  }

  if (nvErr) return dbError(nvErr)

  // 9. Insertar líneas
  const lineasInsert = lineas.map(l => ({
    nota_venta_id: nv.id,
    producto_id: l.producto_id,
    producto_nombre: l.producto_nombre,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    precio_unitario: l.precio_unitario,
    descuento: l.descuento,
    subtotal: l.subtotal,
    iva: l.iva,
  }))
  const { error: linErr } = await supabase
    .from("notas_venta_lineas")
    .insert(lineasInsert)
  if (linErr) {
    // No revertimos la NV — se queda en estado borrador, el operador edita
    console.error("[generar-nv] error en líneas:", linErr.message)
  }

  // 10. Seguimiento
  await registrarEvento(supabase, {
    tipo_documento: "nota_venta",
    documento_id: nv.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `NV ${numeroFinal} generada desde OT ${ot.numero}`,
  })
  await registrarEvento(supabase, {
    tipo_documento: "orden_taller",
    documento_id: id,
    tipo_evento: "nota",
    usuario: body.usuario ?? null,
    descripcion: `Generada NV ${numeroFinal} (presupuesto ${total.toLocaleString("es-AR")})`,
  })

  return NextResponse.json({
    ok: true,
    nv_id: nv.id,
    nv_numero: numeroFinal,
    total,
  })
}
