import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import {
  generarAsientoRecibo,
  generarAsientoReversa,
} from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — generar asiento contable al publicar un recibo
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params

  // Traer datos del recibo — sin sucursal porque puede no existir la columna (020_add_sucursal_recibos.sql)
  const { data: recibo, error: reciboErr } = await supabase
    .from("recibos")
    .select("id, numero, fecha, caja_id, cliente_nombre, importe, moneda, created_at")
    .eq("id", id)
    .single()

  if (reciboErr || !recibo) {
    return NextResponse.json(
      { ok: false, error: reciboErr?.message ?? "Recibo no encontrado" },
      { status: 404 }
    )
  }

  // Intentar leer sucursal por separado (puede no existir la columna)
  let sucursalRecibo: string | null = null
  try {
    const { data: conSuc } = await supabase
      .from("recibos")
      .select("sucursal")
      .eq("id", id)
      .single()
    sucursalRecibo = (conSuc as any)?.sucursal ?? null
  } catch { /* columna aún no existe, se ignora */ }

  const fecha = recibo.fecha ?? recibo.created_at?.split("T")[0] ?? new Date().toISOString().split("T")[0]

  const resultado = await generarAsientoRecibo(supabase, {
    id: recibo.id,
    numero: recibo.numero,
    fecha,
    caja_id: recibo.caja_id,
    cliente_nombre: recibo.cliente_nombre,
    sucursal: sucursalRecibo,
    importe: recibo.importe,
    moneda: recibo.moneda,
  })

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 422 })
  }
  return NextResponse.json(resultado)
}

// DELETE — generar asiento de reversa al cancelar un recibo
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id } = await params

  // Buscar asiento original del recibo
  const { data: recibo, error: reciboErr } = await supabase
    .from("recibos")
    .select("numero")
    .eq("id", id)
    .single()

  if (reciboErr || !recibo) {
    return NextResponse.json(
      { ok: false, error: reciboErr?.message ?? "Recibo no encontrado" },
      { status: 404 }
    )
  }

  const { data: asientoOrigen } = await supabase
    .from("contabilidad_asientos")
    .select("id")
    .eq("comprobante_tipo", "recibo")
    .eq("referencia", recibo.numero)
    .neq("estado", "cancelado")
    .maybeSingle()

  if (!asientoOrigen?.id) {
    // Sin asiento previo — no hay nada que revertir, OK silencioso
    return NextResponse.json({ ok: true, asiento_id: null })
  }

  const resultado = await generarAsientoReversa(
    supabase,
    asientoOrigen.id,
    `Anulación Recibo ${recibo.numero}`
  )

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 422 })
  }
  return NextResponse.json(resultado)
}
