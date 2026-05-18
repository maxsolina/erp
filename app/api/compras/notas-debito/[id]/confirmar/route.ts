import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"
import { generarAsientoNotaCompra } from "@/lib/contabilidad-asiento-factory"

// Confirma una Nota de Débito de Compra en estado borrador.
// Estado borrador → confirmada. saldo_disponible = total (deuda adicional del
// proveedor, queda pendiente de cancelar con futuros pagos).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { id } = await params

  const { data: nd, error: ndErr } = await supabase
    .from("notas_debito_compra")
    .select("*")
    .eq("id", id)
    .single()
  if (ndErr || !nd) {
    return NextResponse.json({ error: "ND no encontrada" }, { status: 404 })
  }
  if (nd.estado !== "borrador" && nd.estado !== "pendiente") {
    return NextResponse.json(
      { error: `Solo se puede confirmar una ND en estado borrador. Estado actual: ${nd.estado}` },
      { status: 400 },
    )
  }

  const { data: updated, error: updErr } = await supabase
    .from("notas_debito_compra")
    .update({
      estado: "confirmada",
      saldo_disponible: Number(nd.total ?? 0),
    })
    .eq("id", id)
    .select()
    .single()

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Generar asiento contable
  let asientoError: string | null = null
  try {
    const resultado = await generarAsientoNotaCompra(adminClient, {
      id: nd.id,
      numero: nd.numero,
      fecha: nd.fecha,
      proveedor_id: nd.proveedor_id,
      proveedor_nombre: nd.proveedor_nombre,
      sucursal: nd.sucursal ?? null,
      total: Number(nd.total ?? 0),
      moneda: nd.moneda ?? "ARS",
      cotizacion: nd.cotizacion ?? null,
      es_credito: false,
    })
    if (resultado.ok && resultado.asiento_id) {
      await adminClient
        .from("notas_debito_compra")
        .update({ asiento_id: resultado.asiento_id })
        .eq("id", id)
    } else if (!resultado.ok) {
      asientoError = resultado.error ?? "Error desconocido al generar asiento"
    }
  } catch (e: any) {
    asientoError = e?.message ?? "Error al generar asiento contable"
    console.error("[ND compra confirmar] Error en generarAsientoNotaCompra:", asientoError)
  }

  await registrarEvento(supabase, {
    tipo_documento: "nota_debito_compra",
    documento_id: nd.id,
    tipo_evento: "cambio_estado",
    valor_anterior: nd.estado,
    valor_nuevo: "confirmada",
    usuario: null,
  })

  return NextResponse.json({
    ...updated,
    ...(asientoError ? { aviso_asiento: `ND confirmada. Asiento contable pendiente: ${asientoError}` } : {}),
  })
}
