import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — listar recibos.
// Si se pasa ?id=X devuelve un único recibo CON pagos + imputaciones embebidos
// (para que la ficha pueda mostrar el detalle completo). Sin ?id, devuelve la
// lista pelada para el listado.
export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (id) {
    const { data, error } = await supabase
      .from("recibos")
      .select("*, recibo_pagos(*), recibo_imputaciones(*)")
      .eq("id", id)
    if (error) return dbError(error)
    return NextResponse.json(data ?? [])
  }
  const { data, error } = await supabase
    .from("recibos")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST — crear recibo (cabecera + pagos + imputaciones) en una sola operación
//
// El cliente solo manda los datos del form. El servidor:
// - Genera el número con la RPC `generar_numero_recibo`
// - Inserta cabecera con estado='borrador' (publicar es una acción separada)
// - Inserta recibo_pagos asociados
// - Inserta recibo_imputaciones con asignacion > 0
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const {
    sucursal,
    cliente_id,
    cliente_nombre,
    caja_id,
    caja_nombre,
    factura_id,
    nota_venta_id,
    nota_venta_numero,
    cobrador_id,
    cobrador_nombre,
    concepto,
    importe,
    importe_no_conciliado,
    importe_no_conciliado_ars,
    moneda,
    tipo_cotizacion,
    cotizacion,
    observaciones,
    fecha,
    pagos = [],
    imputaciones = [],
  } = body

  // 1. Generar número
  let numero: string
  try {
    const { data: numData, error: numErr } = await supabase.rpc("generar_numero_recibo", {
      p_sucursal: sucursal ?? "",
    })
    if (numErr || !numData) {
      numero = `REC X 00000-${Date.now()}`
    } else {
      numero = numData as string
    }
  } catch {
    numero = `REC X 00000-${Date.now()}`
  }

  // 2. Insertar cabecera
  const cabeceraPayload: Record<string, unknown> = {
    numero,
    sucursal: sucursal ?? null,
    cliente_id: cliente_id ?? null,
    cliente_nombre: cliente_nombre ?? null,
    caja_id: caja_id ?? null,
    caja_nombre: caja_nombre ?? null,
    factura_id: factura_id ?? null,
    nota_venta_id: nota_venta_id ?? null,
    nota_venta_numero: nota_venta_numero ?? null,
    cobrador_id: cobrador_id ?? null,
    cobrador_nombre: cobrador_nombre ?? null,
    concepto: concepto ?? null,
    importe: Number(importe ?? 0),
    importe_no_conciliado: Number(importe_no_conciliado ?? 0),
    importe_no_conciliado_ars: Number(importe_no_conciliado_ars ?? 0),
    moneda: moneda ?? "ARS",
    tipo_cotizacion: tipo_cotizacion ?? null,
    cotizacion: cotizacion ?? null,
    observaciones: observaciones ?? null,
    estado: "borrador",
    fecha: fecha ?? new Date().toISOString().split("T")[0],
  }

  const { data: rec, error: recErr } = await supabase
    .from("recibos")
    .insert(cabeceraPayload)
    .select()
    .single()
  if (recErr) return dbError(recErr)

  // 3. Insertar pagos
  if (Array.isArray(pagos) && pagos.length > 0) {
    const pagosInsert = pagos.map((p: any) => ({
      recibo_id: rec.id,
      valor_id: p.valor_id ?? null,
      valor_nombre: p.valor_nombre ?? null,
      tipo_valor: p.tipo_valor ?? null,
      importe_comprobante: Number(p.importe_comprobante ?? p.importe ?? 0),
      moneda_comprobante: p.moneda_comprobante ?? p.moneda ?? "ARS",
      importe: Number(p.importe ?? 0),
      moneda: p.moneda ?? "ARS",
      es_tarjeta: !!p.es_tarjeta,
      tarjeta_nombre: p.tarjeta_nombre ?? null,
      cantidad_cuotas: Number(p.cantidad_cuotas ?? 1),
      numero_cupon: p.numero_cupon ?? null,
      recargo_porcentaje: Number(p.recargo_porcentaje ?? 0),
      recargo_importe: Number(p.recargo_importe ?? 0),
      es_cheque: !!p.es_cheque,
      cheque_id: p.cheque_id ?? null,
      cupon_tarjeta_id: p.cupon_tarjeta_id ?? null,
    }))
    const { error: pagosErr } = await supabase.from("recibo_pagos").insert(pagosInsert)
    if (pagosErr) {
      return NextResponse.json(
        { error: `Recibo creado (id:${rec.id}) pero error en pagos: ${pagosErr.message}` },
        { status: 207 }
      )
    }
  }

  // 4. Insertar imputaciones (solo las que tienen asignacion > 0)
  const impsConAsig = (imputaciones ?? []).filter((i: any) => Number(i.asignacion ?? 0) > 0)
  if (impsConAsig.length > 0) {
    const impsInsert = impsConAsig.map((i: any) => ({
      recibo_id: rec.id,
      tipo_comprobante: i.tipo_comprobante ?? null,
      comprobante_id: i.comprobante_id ?? null,
      comprobante_referencia: i.comprobante_referencia ?? null,
      fecha_comprobante: i.fecha_comprobante ?? null,
      fecha_vencimiento: i.fecha_vencimiento ?? null,
      saldo_moneda: Number(i.saldo_moneda ?? 0),
      moneda_comprobante: i.moneda_comprobante ?? "ARS",
      tipo_cotizacion: i.tipo_cotizacion ?? null,
      cotizacion_original: i.cotizacion_original ?? null,
      saldo_original: Number(i.saldo_original ?? 0),
      cotizacion_actual: i.cotizacion_actual ?? null,
      saldo_actual: Number(i.saldo_actual ?? 0),
      asignacion: Number(i.asignacion ?? 0),
    }))
    const { error: impsErr } = await supabase.from("recibo_imputaciones").insert(impsInsert)
    if (impsErr) {
      return NextResponse.json(
        { error: `Recibo creado (id:${rec.id}) pero error en imputaciones: ${impsErr.message}` },
        { status: 207 }
      )
    }
  }

  return NextResponse.json({ ok: true, id: rec.id, numero: rec.numero })
}
