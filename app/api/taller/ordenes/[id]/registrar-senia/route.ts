import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

// POST /api/taller/ordenes/[id]/registrar-senia
//
// Registra una seña en efectivo/tarjeta/transferencia/etc para una OT.
// Crea un Recibo (estado borrador) con un único pago + lo publica para
// que entre a la caja correspondiente.
//
// Si la OT tiene NV vinculada, imputa la seña contra esa NV. Si no, el
// recibo queda como saldo a favor del cliente (a imputar al cierre).
//
// Body:
//   caja_id, caja_nombre,
//   valor_id, valor_nombre, tipo_valor (efectivo|tarjeta|transferencia|...),
//   importe (en moneda del valor),
//   moneda (ARS por defecto),
//   cotizacion (1 por defecto, o ARS por unidad de moneda extranjera),
//   observaciones (opcional),
//   es_tarjeta, tarjeta_nombre, cantidad_cuotas (si es_tarjeta=true),

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

  const {
    caja_id, caja_nombre,
    valor_id, valor_nombre, tipo_valor,
    importe,
    moneda = "ARS",
    cotizacion = 1,
    observaciones,
    es_tarjeta = false,
    tarjeta_nombre = null,
    cantidad_cuotas = 1,
    usuario,
  } = body

  if (!caja_id) return NextResponse.json({ error: "Falta seleccionar la caja" }, { status: 422 })
  if (!valor_id) return NextResponse.json({ error: "Falta seleccionar el medio de pago" }, { status: 422 })
  const importeNum = Number(importe ?? 0)
  if (!importeNum || importeNum <= 0) return NextResponse.json({ error: "El importe debe ser mayor a 0" }, { status: 422 })

  // 1. Cargar la OT con cliente
  const { data: ot, error: otErr } = await supabase
    .from("taller_ordenes_trabajo")
    .select("id, numero, cliente_id, sucursal_id")
    .eq("id", id)
    .single()
  if (otErr || !ot) return NextResponse.json({ error: "OT no encontrada" }, { status: 404 })
  if (!ot.cliente_id) {
    return NextResponse.json({ error: "La OT no tiene cliente asignado" }, { status: 422 })
  }

  // 2. Cargar nombre del cliente
  const { data: cli } = await supabase
    .from("clientes")
    .select("nombre")
    .eq("id", ot.cliente_id)
    .maybeSingle()

  // 3. NV vinculada (si hay) — para imputar la seña
  const { data: nvVinculada } = await supabase
    .from("notas_venta")
    .select("id, numero, total")
    .eq("ot_id", id)
    .neq("estado", "cancelada")
    .maybeSingle()

  // 4. Generar número de recibo
  let numero: string
  try {
    const { data: numData } = await supabase.rpc("generar_numero_recibo", { p_sucursal: "" })
    numero = (numData as string) ?? `REC X 00000-${Date.now()}`
  } catch {
    numero = `REC X 00000-${Date.now()}`
  }

  // 5. Importe en ARS (para conciliación bimonetaria)
  const importeArs = moneda === "ARS" ? importeNum : importeNum * Number(cotizacion ?? 1)

  // 6. Crear recibo (cabecera) en borrador.
  // Nota: NO se setea `nota_venta_id` porque la columna es UUID en DB pero
  // notas_venta.id es int (schema mismatch viejo, no arreglado todavía). La
  // vinculación con la NV se mantiene a través de recibo_imputaciones (fix
  // 066) y de recibos.ot_id.
  const cabPayload = {
    numero,
    sucursal: null,
    cliente_id: ot.cliente_id,
    cliente_nombre: cli?.nombre ?? null,
    caja_id,
    caja_nombre: caja_nombre ?? null,
    nota_venta_numero: nvVinculada?.numero ?? null,
    cobrador_id: null,
    cobrador_nombre: null,
    concepto: `Seña OT ${ot.numero}`,
    importe: importeNum,
    importe_no_conciliado: importeNum,
    importe_no_conciliado_ars: importeArs,
    moneda,
    cotizacion: moneda === "ARS" ? null : Number(cotizacion ?? 1),
    observaciones: observaciones ?? null,
    estado: "borrador",
    fecha: new Date().toISOString().split("T")[0],
    ot_id: id,
  }

  const { data: rec, error: recErr } = await supabase
    .from("recibos")
    .insert(cabPayload)
    .select()
    .single()
  if (recErr) return dbError(recErr)

  // 7. Insertar el pago único
  const { error: pagoErr } = await supabase.from("recibo_pagos").insert({
    recibo_id: rec.id,
    valor_id,
    valor_nombre: valor_nombre ?? null,
    tipo_valor: tipo_valor ?? null,
    importe_comprobante: importeNum,
    moneda_comprobante: moneda,
    importe: importeNum,
    moneda,
    cotizacion: moneda === "ARS" ? null : Number(cotizacion ?? 1),
    es_tarjeta,
    tarjeta_nombre: es_tarjeta ? tarjeta_nombre : null,
    cantidad_cuotas: es_tarjeta ? Number(cantidad_cuotas ?? 1) : 1,
    numero_cupon: null,
    recargo_porcentaje: 0,
    recargo_importe: 0,
    es_cheque: false,
    cheque_id: null,
    cupon_tarjeta_id: null,
  })
  if (pagoErr) {
    return NextResponse.json({ error: `Recibo creado pero error en pago: ${pagoErr.message}` }, { status: 207 })
  }

  // 8. Si hay NV vinculada → imputar la seña contra esa NV
  if (nvVinculada?.id) {
    const asign = Math.min(importeNum, Number(nvVinculada.total ?? 0))
    if (asign > 0) {
      await supabase.from("recibo_imputaciones").insert({
        recibo_id: rec.id,
        tipo_comprobante: "nota_venta",
        comprobante_id: nvVinculada.id,
        comprobante_referencia: nvVinculada.numero,
        fecha_comprobante: null,
        fecha_vencimiento: null,
        saldo_moneda: Number(nvVinculada.total ?? 0),
        moneda_comprobante: "ARS",
        tipo_cotizacion: null,
        cotizacion_original: null,
        saldo_original: Number(nvVinculada.total ?? 0),
        cotizacion_actual: null,
        saldo_actual: Number(nvVinculada.total ?? 0),
        asignacion: asign,
      })
    }
  }

  // 9. Publicar el recibo (borrador → publicado).
  // El proxy.ts bloquea con 401 cualquier request a /api/* sin cookies de
  // sesión, así que reenviamos las cookies del usuario que disparó la
  // operación (la request original tiene auth válida).
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
      console.warn("[registrar-senia] publicar falló:", err?.error)
    }
  } catch (err) {
    console.warn("[registrar-senia] publicar error:", err)
  }

  // 10. Seguimiento
  await registrarEvento(supabase, {
    tipo_documento: "orden_taller",
    documento_id: id,
    tipo_evento: "nota",
    usuario: usuario ?? null,
    descripcion: `Seña registrada: $${importeNum.toLocaleString("es-AR")} ${moneda} (${valor_nombre ?? tipo_valor ?? "pago"}) — Recibo ${numero}`,
  })

  return NextResponse.json({
    ok: true,
    recibo_id: rec.id,
    recibo_numero: numero,
    importe: importeNum,
    imputado_a_nv: nvVinculada?.numero ?? null,
  })
}
