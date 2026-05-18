import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"
import { generarAsientoNotaCompra } from "@/lib/contabilidad-asiento-factory"

// Confirma una Nota de Crédito de Compra en estado borrador:
// 1. Cambia estado → "confirmada"
// 2. Setea saldo_disponible = total (para que aparezca como crédito disponible
//    en Conciliación de Deuda del proveedor y para aplicar en OPs)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { id } = await params

  // 1. Obtener la NC
  const { data: nc, error: ncErr } = await supabase
    .from("notas_credito_compra")
    .select("*")
    .eq("id", id)
    .single()
  if (ncErr || !nc) {
    return NextResponse.json({ error: "NC no encontrada" }, { status: 404 })
  }
  if (nc.estado !== "borrador" && nc.estado !== "pendiente") {
    return NextResponse.json(
      { error: `Solo se puede confirmar una NC en estado borrador. Estado actual: ${nc.estado}` },
      { status: 400 },
    )
  }

  // 2. Actualizar a "confirmada" + saldo_disponible = total
  const { data: updated, error: updErr } = await supabase
    .from("notas_credito_compra")
    .update({
      estado: "confirmada",
      saldo_disponible: Number(nc.total ?? 0),
    })
    .eq("id", id)
    .select()
    .single()

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // 3. Generar asiento contable
  let asientoError: string | null = null
  try {
    const resultado = await generarAsientoNotaCompra(adminClient, {
      id: nc.id,
      numero: nc.numero,
      fecha: nc.fecha,
      proveedor_id: nc.proveedor_id,
      proveedor_nombre: nc.proveedor_nombre,
      sucursal: nc.sucursal ?? null,
      total: Number(nc.total ?? 0),
      moneda: nc.moneda ?? "ARS",
      cotizacion: nc.cotizacion ?? null,
      es_credito: true,
    })
    if (resultado.ok && resultado.asiento_id) {
      await adminClient
        .from("notas_credito_compra")
        .update({ asiento_id: resultado.asiento_id })
        .eq("id", id)
    } else if (!resultado.ok) {
      asientoError = resultado.error ?? "Error desconocido al generar asiento"
    }
  } catch (e: any) {
    asientoError = e?.message ?? "Error al generar asiento contable"
    console.error("[NC compra confirmar] Error en generarAsientoNotaCompra:", asientoError)
  }

  await registrarEvento(supabase, {
    tipo_documento: "nota_credito_compra",
    documento_id: nc.id,
    tipo_evento: "cambio_estado",
    valor_anterior: nc.estado,
    valor_nuevo: "confirmada",
    usuario: null,
  })

  return NextResponse.json({
    ...updated,
    ...(asientoError ? { aviso_asiento: `NC confirmada. Asiento contable pendiente: ${asientoError}` } : {}),
  })
}
