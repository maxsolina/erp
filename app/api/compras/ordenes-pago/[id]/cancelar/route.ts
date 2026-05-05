import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Obtener la OP
  const { data: op, error: opErr } = await supabase
    .from("compras_ordenes_pago")
    .select("*")
    .eq("id", id)
    .single()

  if (opErr || !op) return NextResponse.json({ error: "OP no encontrada" }, { status: 404 })
  if (op.estado !== "publicado") return NextResponse.json({ error: "Solo se puede cancelar una OP publicada" }, { status: 400 })

  // 2. Obtener comprobantes
  const { data: comprobantes } = await supabase
    .from("compras_op_comprobantes")
    .select("*")
    .eq("op_id", id)

  // 3. Cambiar estado a cancelado
  const { error: updateErr } = await supabase
    .from("compras_ordenes_pago")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 4. Revertir movimientos de caja: marcar los egresos originales como cancelados
  await supabase
    .from("movimientos_caja")
    .update({ estado_movimiento: "cancelado" })
    .eq("documento_origen_tipo", "orden_pago")
    .eq("documento_origen_numero", op.numero)

  // 5. Restaurar saldos de facturas
  const debitos = (comprobantes ?? []).filter(c => c.tipo === "debito")
  for (const comp of debitos) {
    if (comp.factura_id) {
      const { data: fac } = await supabase
        .from("facturas_compra")
        .select("saldo, total")
        .eq("id", comp.factura_id)
        .single()

      if (fac) {
        const saldoRestaurado = Math.min(fac.total, (fac.saldo ?? 0) + comp.importe)
        await supabase
          .from("facturas_compra")
          .update({
            saldo: saldoRestaurado,
            estado: saldoRestaurado >= fac.total ? "pendiente" : "pagada_parcial",
          })
          .eq("id", comp.factura_id)
      }
    }
  }

  // 6. Restaurar saldos de notas de crédito
  const creditos = (comprobantes ?? []).filter(c => c.tipo === "credito")
  for (const comp of creditos) {
    if (comp.factura_id) {
      const { data: nc } = await supabase
        .from("notas_credito_compra")
        .select("saldo_disponible, total")
        .eq("id", comp.factura_id)
        .single()

      if (nc) {
        const saldoRestaurado = Math.min(nc.total, (nc.saldo_disponible ?? 0) + comp.importe)
        await supabase
          .from("notas_credito_compra")
          .update({ saldo_disponible: saldoRestaurado, estado: "confirmada" })
          .eq("id", comp.factura_id)
      }
    }
  }

  await registrarEvento(supabase, {
    tipo_documento: "orden_pago",
    documento_id: op.id,
    tipo_evento: "cambio_estado",
    valor_anterior: "publicado",
    valor_nuevo: "cancelado",
    usuario: null,
  })

  return NextResponse.json({ success: true, estado: "cancelado" })
}
