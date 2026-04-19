import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase()
  const { id: remitoId } = await params

  // ── 1. Obtener el remito actual ─────────────────────────────────────────────
  const { data: remito, error: remitoErr } = await supabase
    .from("remitos")
    .select("id, estado, asiento_id, numero")
    .eq("id", remitoId)
    .single()

  if (remitoErr || !remito) {
    return NextResponse.json({ error: "Remito no encontrado." }, { status: 404 })
  }

  if (remito.estado !== "entregado") {
    return NextResponse.json(
      { error: `Solo se pueden cancelar remitos en estado 'entregado'. Estado actual: ${remito.estado}` },
      { status: 400 }
    )
  }

  // ── 2. Generar asiento reversa del CMV ──────────────────────────────────────
  if (remito.asiento_id) {
    const resultadoReversa = await generarAsientoReversa(
      supabase,
      remito.asiento_id,
      `Anulación CMV — Remito ${remito.numero ?? remitoId} cancelado`
    )

    if (!resultadoReversa.ok) {
      return NextResponse.json(
        { error: `Fallo al generar asiento reversa: ${resultadoReversa.error}` },
        { status: 500 }
      )
    }
  }

  // ── 3. Revertir movimientos de stock (marcar unidades disponibles de nuevo) ─
  // Revertir stock_unidades: entregado → disponible
  await supabase
    .from("stock_unidades")
    .update({ estado: "disponible", updated_at: new Date().toISOString() })
    .eq("remito_id", remitoId)

  // Insertar movimientos de ingreso para deshacer los egresos del remito
  const { data: movimientosOrigen } = await supabase
    .from("stock_movimientos")
    .select("producto_id, producto_nombre, cantidad, nro_serie, deposito_id, deposito_nombre, ubicacion_id, ubicacion_nombre, nv_numero, oe_numero, remito_numero")
    .eq("documento_tipo", "remito")
    .eq("documento_numero", remito.numero)
    .eq("tipo", "egreso")

  if (movimientosOrigen && movimientosOrigen.length > 0) {
    const reversas = movimientosOrigen.map((m: any) => ({
      tipo: "ingreso",
      producto_id: m.producto_id,
      producto_nombre: m.producto_nombre,
      cantidad: m.cantidad,
      nro_serie: m.nro_serie ?? null,
      deposito_id: m.deposito_id ?? null,
      deposito_nombre: m.deposito_nombre ?? null,
      ubicacion_id: m.ubicacion_id ?? null,
      ubicacion_nombre: m.ubicacion_nombre ?? null,
      documento_tipo: "remito_cancelado",
      documento_numero: remito.numero ?? null,
      nv_numero: m.nv_numero ?? null,
      oe_numero: m.oe_numero ?? null,
      remito_numero: m.remito_numero ?? null,
      usuario: "sistema",
      observaciones: `Reversa por cancelación de remito ${remito.numero ?? remitoId}`,
    }))

    await supabase.from("stock_movimientos").insert(reversas)
  }

  // ── 4. Actualizar estado del remito a "cancelado" ───────────────────────────
  await supabase
    .from("remitos")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", remitoId)

  return NextResponse.json({ ok: true, mensaje: "Remito cancelado y asiento CMV revertido." })
}
