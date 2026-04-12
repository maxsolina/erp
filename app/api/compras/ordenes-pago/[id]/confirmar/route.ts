import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Obtener la OP completa
  const { data: op, error: opErr } = await supabase
    .from("compras_ordenes_pago")
    .select("*")
    .eq("id", id)
    .single()

  if (opErr || !op) return NextResponse.json({ error: "OP no encontrada" }, { status: 404 })
  if (op.estado !== "borrador") return NextResponse.json({ error: "Solo se puede confirmar una OP en borrador" }, { status: 400 })
  if (!op.proveedor_id) return NextResponse.json({ error: "Debe seleccionar un proveedor" }, { status: 400 })
  if (!op.importe || op.importe <= 0) return NextResponse.json({ error: "El importe debe ser mayor a 0" }, { status: 400 })
  if (!op.caja_id) return NextResponse.json({ error: "Debe seleccionar una caja" }, { status: 400 })

  // 2. Verificar medios de pago
  const { data: medios } = await supabase
    .from("compras_op_medios_pago")
    .select("*")
    .eq("op_id", id)

  if (!medios || medios.length === 0) {
    return NextResponse.json({ error: "Debe agregar al menos un medio de pago" }, { status: 400 })
  }

  // 3. Obtener comprobantes vinculados
  const { data: comprobantes } = await supabase
    .from("compras_op_comprobantes")
    .select("*")
    .eq("op_id", id)

  // 4. Validar que importes asignados no superen saldos
  const debitos = (comprobantes ?? []).filter(c => c.tipo === "debito")
  for (const comp of debitos) {
    if (comp.importe > comp.saldo_original) {
      return NextResponse.json({
        error: `El importe asignado a ${comp.referencia} (${comp.importe}) supera su saldo (${comp.saldo_original})`
      }, { status: 400 })
    }
  }

  // 5. Cambiar estado a publicado
  const periodo = op.fecha
    ? `${String(new Date(op.fecha).getMonth() + 1).padStart(2, "0")}/${new Date(op.fecha).getFullYear()}`
    : null

  const { error: updateErr } = await supabase
    .from("compras_ordenes_pago")
    .update({
      estado: "publicado",
      periodo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 6. Registrar movimientos de egreso en caja
  const { data: extracto } = await supabase
    .from("extractos_caja")
    .select("id")
    .eq("caja_id", op.caja_id)
    .eq("estado", "abierto")
    .single()

  if (!extracto) {
    return NextResponse.json({
      error: `No hay extracto de caja abierto para la caja seleccionada. Abrí un extracto en Finanzas → Extractos de Caja.`
    }, { status: 400 })
  }

  // Validar saldo disponible para medios de tipo efectivo
  for (const medio of medios) {
    if (!medio.forma_pago_id) continue

    // Obtener tipo del valor (efectivo vs banco_cheques)
    const { data: valor } = await supabase
      .from("caja_valores")
      .select("tipo")
      .eq("id", medio.forma_pago_id)
      .single()

    if (!valor || valor.tipo !== "efectivo") continue

    // Calcular saldo actual del extracto para ese valor
    const { data: saldoApertura } = await supabase
      .from("extracto_saldos")
      .select("saldo_apertura")
      .eq("extracto_id", extracto.id)
      .eq("valor_id", medio.forma_pago_id)
      .single()

    const { data: movsExistentes } = await supabase
      .from("movimientos_caja")
      .select("tipo_movimiento, importe")
      .eq("extracto_id", extracto.id)
      .eq("valor_id", medio.forma_pago_id)
      .neq("estado_movimiento", "cancelado")

    const apertura = Number(saldoApertura?.saldo_apertura ?? 0)
    const totalIngresos = (movsExistentes ?? [])
      .filter(m => m.tipo_movimiento === "ingreso")
      .reduce((a, m) => a + Number(m.importe), 0)
    const totalEgresos = (movsExistentes ?? [])
      .filter(m => m.tipo_movimiento === "egreso")
      .reduce((a, m) => a + Number(m.importe), 0)

    const saldoDisponible = apertura + totalIngresos - totalEgresos
    const importeMedio = Number(medio.importe_comp ?? medio.importe)

    if (importeMedio > saldoDisponible) {
      return NextResponse.json({
        error: `Saldo insuficiente en "${medio.forma_pago_nombre ?? "efectivo"}": disponible $${saldoDisponible.toFixed(2)}, se requiere $${importeMedio.toFixed(2)}.`
      }, { status: 400 })
    }
  }

  for (const medio of medios) {
    const movPayload: Record<string, unknown> = {
      extracto_id: extracto.id,
      valor_id: medio.forma_pago_id ?? null,
      valor_nombre: medio.forma_pago_nombre ?? medio.nombre ?? "Efectivo",
      tipo_movimiento: "egreso",
      importe: medio.importe_comp ?? medio.importe,
      moneda: op.moneda ?? "ARS",
      concepto: `OP ${op.numero} - ${op.proveedor_nombre}`,
      documento_origen_tipo: "orden_pago",
      documento_origen_numero: op.numero,
      estado_movimiento: "confirmado",
    }
    // Solo enviar documento_origen_id si es UUID válido
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (isUUID.test(String(op.id))) movPayload.documento_origen_id = op.id

    const { error: movErr } = await supabase.from("movimientos_caja").insert(movPayload)
    if (movErr) {
      // Si falla por schema cache, reintentar sin estado_movimiento
      if (movErr.message.includes("schema cache") || movErr.message.includes("Could not find")) {
        delete movPayload.estado_movimiento
        const retry = await supabase.from("movimientos_caja").insert(movPayload)
        if (retry.error) return NextResponse.json({ error: "Error al registrar movimiento en caja: " + retry.error.message }, { status: 500 })
      } else {
        return NextResponse.json({ error: "Error al registrar movimiento en caja: " + movErr.message }, { status: 500 })
      }
    }
  }

  // 7. Actualizar saldo de facturas vinculadas
  for (const comp of debitos) {
    if (comp.factura_id) {
      const { data: fac } = await supabase
        .from("facturas_compra")
        .select("saldo, total")
        .eq("id", comp.factura_id)
        .single()

      if (fac) {
        const nuevoSaldo = Math.max(0, (fac.saldo ?? fac.total) - comp.importe)
        await supabase
          .from("facturas_compra")
          .update({
            saldo: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? "pagada" : "pagada_parcial",
          })
          .eq("id", comp.factura_id)
      }
    }
  }

  // 8. Actualizar saldos en comprobantes (notas de crédito)
  const creditos = (comprobantes ?? []).filter(c => c.tipo === "credito")
  for (const comp of creditos) {
    if (comp.factura_id) {
      const { data: nc } = await supabase
        .from("notas_credito_compra")
        .select("saldo_disponible, total")
        .eq("id", comp.factura_id)
        .single()

      if (nc) {
        const nuevoSaldo = Math.max(0, (nc.saldo_disponible ?? nc.total) - comp.importe)
        await supabase
          .from("notas_credito_compra")
          .update({ saldo_disponible: nuevoSaldo, estado: nuevoSaldo <= 0 ? "aplicada" : "confirmada" })
          .eq("id", comp.factura_id)
      }
    }
  }

  return NextResponse.json({ success: true, estado: "publicado" })
}
