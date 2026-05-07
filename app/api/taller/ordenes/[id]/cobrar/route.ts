import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

// POST /api/taller/ordenes/[id]/cobrar
//
// Cobra el saldo pendiente de la OT con uno o varios medios de pago.
// Crea UN recibo con múltiples pagos (efectivo + tarjeta + transferencia
// + ...), lo publica y lo imputa contra la NV vinculada.
//
// Cuando el saldo de la NV llega a 0, el operador puede ir a la ficha
// de la NV y darle "Confirmar" para emitir Factura + Remito (ese flujo
// se mantiene en el módulo de Ventas).
//
// Body:
//   caja_id, caja_nombre,
//   pagos: [{
//     valor_id, valor_nombre, tipo_valor,
//     importe, moneda, cotizacion,
//     es_tarjeta, tarjeta_nombre, cantidad_cuotas,
//   }],
//   observaciones, usuario

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabase()
  const body = await req.json()

  const { caja_id, caja_nombre, pagos = [], observaciones, usuario } = body

  if (!caja_id) return NextResponse.json({ error: "Falta seleccionar la caja" }, { status: 422 })
  if (!Array.isArray(pagos) || pagos.length === 0) {
    return NextResponse.json({ error: "Agregá al menos un medio de pago" }, { status: 422 })
  }
  // Validación de cada pago
  for (const p of pagos) {
    if (!p.valor_id) return NextResponse.json({ error: "Cada pago necesita un medio de pago" }, { status: 422 })
    if (!Number(p.importe) || Number(p.importe) <= 0) {
      return NextResponse.json({ error: "Cada pago necesita un importe mayor a 0" }, { status: 422 })
    }
  }

  // 1. Cargar OT + NV vinculada
  const { data: ot, error: otErr } = await supabase
    .from("taller_ordenes_trabajo")
    .select("id, numero, cliente_id")
    .eq("id", id)
    .single()
  if (otErr || !ot) return NextResponse.json({ error: "OT no encontrada" }, { status: 404 })

  const { data: nv } = await supabase
    .from("notas_venta")
    .select("id, numero, total")
    .eq("ot_id", id)
    .neq("estado", "cancelada")
    .maybeSingle()
  if (!nv) {
    return NextResponse.json({
      error: "La OT no tiene Nota de Venta vinculada. Generá el presupuesto primero.",
    }, { status: 422 })
  }

  // 2. Calcular saldo actual de la NV (total - imputaciones previas).
  // Hacemos dos queries separadas (en lugar de join supabase con
  // recibos!inner) para no depender de que PostgREST reconozca la relación.
  const { data: imputacionesPrev } = await supabase
    .from("recibo_imputaciones")
    .select("asignacion, recibo_id")
    .eq("tipo_comprobante", "nota_venta")
    .eq("comprobante_id", nv.id)
  const reciboIdsImput = [...new Set((imputacionesPrev ?? []).map(i => i.recibo_id).filter(Boolean))]
  let estadosRecibos: Record<string, string> = {}
  if (reciboIdsImput.length > 0) {
    const { data: recsEstados } = await supabase
      .from("recibos")
      .select("id, estado")
      .in("id", reciboIdsImput)
    for (const r of recsEstados ?? []) {
      estadosRecibos[String(r.id)] = r.estado
    }
  }
  const yaImputado = (imputacionesPrev ?? []).reduce((acc, i) => {
    if (estadosRecibos[String(i.recibo_id)] === "cancelado") return acc
    return acc + Number(i.asignacion ?? 0)
  }, 0)
  const saldoNV = Number(nv.total ?? 0) - yaImputado

  if (saldoNV <= 0.01) {
    return NextResponse.json({
      error: "La NV ya está totalmente cubierta por recibos previos.",
    }, { status: 422 })
  }

  // 3. Cliente nombre
  const { data: cli } = await supabase
    .from("clientes")
    .select("nombre")
    .eq("id", ot.cliente_id)
    .maybeSingle()

  // 4. Total cobrado en este recibo (en ARS, sumando con cotización)
  const totalCobrado = pagos.reduce(
    (acc, p) => acc + Number(p.importe ?? 0) * Number(p.cotizacion ?? 1),
    0,
  )

  // 5. Generar número de recibo
  let numero: string
  try {
    const { data: numData } = await supabase.rpc("generar_numero_recibo", { p_sucursal: "" })
    numero = (numData as string) ?? `REC X 00000-${Date.now()}`
  } catch {
    numero = `REC X 00000-${Date.now()}`
  }

  // 6. Crear cabecera del recibo.
  // No se setea `nota_venta_id` (columna UUID vs notas_venta.id int — schema
  // mismatch). La vinculación queda por imputación (recibo_imputaciones) +
  // por ot_id.
  // Si el cliente paga de más, el excedente queda como saldo a favor (en
  // `importe_no_conciliado`).
  const noConciliado = Math.max(0, totalCobrado - saldoNV)
  const { data: rec, error: recErr } = await supabase
    .from("recibos")
    .insert({
      numero,
      sucursal: null,
      cliente_id: ot.cliente_id,
      cliente_nombre: cli?.nombre ?? null,
      caja_id,
      caja_nombre: caja_nombre ?? null,
      nota_venta_numero: nv.numero,
      cobrador_id: null,
      cobrador_nombre: null,
      concepto: `Cobro OT ${ot.numero} (NV ${nv.numero})`,
      importe: totalCobrado,
      importe_no_conciliado: noConciliado,
      importe_no_conciliado_ars: noConciliado,
      moneda: "ARS",
      cotizacion: null,
      observaciones: observaciones ?? null,
      estado: "borrador",
      fecha: new Date().toISOString().split("T")[0],
      ot_id: id,
    })
    .select()
    .single()
  if (recErr) return dbError(recErr)

  // 7. Insertar todos los pagos
  const pagosInsert = pagos.map(p => ({
    recibo_id: rec.id,
    valor_id: p.valor_id,
    valor_nombre: p.valor_nombre ?? null,
    tipo_valor: p.tipo_valor ?? null,
    importe_comprobante: Number(p.importe ?? 0),
    moneda_comprobante: p.moneda ?? "ARS",
    importe: Number(p.importe ?? 0),
    moneda: p.moneda ?? "ARS",
    cotizacion: p.moneda === "ARS" ? null : Number(p.cotizacion ?? 1),
    es_tarjeta: !!p.es_tarjeta,
    tarjeta_nombre: p.es_tarjeta ? p.tarjeta_nombre ?? null : null,
    cantidad_cuotas: p.es_tarjeta ? Number(p.cantidad_cuotas ?? 1) : 1,
    numero_cupon: null,
    recargo_porcentaje: 0,
    recargo_importe: 0,
    es_cheque: false,
    cheque_id: null,
    cupon_tarjeta_id: null,
  }))
  const { error: pagosErr } = await supabase.from("recibo_pagos").insert(pagosInsert)
  if (pagosErr) {
    return NextResponse.json({ error: `Recibo creado pero error en pagos: ${pagosErr.message}` }, { status: 207 })
  }

  // 8. Imputar el cobro completo (o hasta el saldo) contra la NV
  const asignacion = Math.min(totalCobrado, saldoNV)
  if (asignacion > 0) {
    await supabase.from("recibo_imputaciones").insert({
      recibo_id: rec.id,
      tipo_comprobante: "nota_venta",
      comprobante_id: nv.id,
      comprobante_referencia: nv.numero,
      fecha_comprobante: null,
      fecha_vencimiento: null,
      saldo_moneda: saldoNV,
      moneda_comprobante: "ARS",
      tipo_cotizacion: null,
      cotizacion_original: null,
      saldo_original: saldoNV,
      cotizacion_actual: null,
      saldo_actual: saldoNV,
      asignacion,
    })
  }

  // 9. Publicar el recibo (borrador → publicado).
  // Forwardamos cookies de la request original para pasar el proxy.ts auth
  // check (el proxy bloquea /api/* sin sesión).
  const baseUrl = req.url.split("/api/")[0]
  const cookieHeader = req.headers.get("cookie") ?? ""
  try {
    const pubRes = await fetch(`${baseUrl}/api/recibos/${rec.id}/publicar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({}),
    })
    if (!pubRes.ok) {
      const err = await pubRes.json().catch(() => ({}))
      console.warn("[cobrar OT] publicar falló:", err?.error)
    }
  } catch (err) {
    console.warn("[cobrar OT] publicar error:", err)
  }

  // 10. Seguimiento
  const labelPagos = pagos.map(p => `${p.valor_nombre ?? p.tipo_valor} ${p.importe}`).join(" + ")
  await registrarEvento(supabase, {
    tipo_documento: "orden_taller",
    documento_id: id,
    tipo_evento: "nota",
    usuario: usuario ?? null,
    descripcion: `Cobro $${totalCobrado.toLocaleString("es-AR")} (${labelPagos}) — Recibo ${numero}`,
  })

  const saldoFinalNV = saldoNV - asignacion
  return NextResponse.json({
    ok: true,
    recibo_id: rec.id,
    recibo_numero: numero,
    importe: totalCobrado,
    saldo_nv: saldoFinalNV,
    nv_cubierta: saldoFinalNV <= 0.01,
    nv_id: nv.id,
    nv_numero: nv.numero,
  })
}
