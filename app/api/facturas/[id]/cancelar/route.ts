import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const { motivo } = await req.json().catch(() => ({ motivo: null }))

  // 1. Obtener la factura
  const { data: factura, error: facErr } = await supabase
    .from("facturas")
    .select("id, numero, estado, asiento_id, asiento_iva_id")
    .eq("id", id)
    .single()

  if (facErr || !factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
  }
  if (factura.estado === "cancelada") {
    return NextResponse.json({ error: "La factura ya está cancelada" }, { status: 422 })
  }

  // 2. Marcar factura como cancelada
  const { error: updateErr } = await supabase
    .from("facturas")
    .update({ estado: "cancelada", saldo: 0, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const conceptoBase = `Cancelación factura ${factura.numero}${motivo ? ` — ${motivo}` : ""}`
  const advertencias: string[] = []
  let asientoReversaNegro: string | null = null
  let asientoReversaIVA: string | null = null

  // 3. Revertir asiento "negro" (asiento 1) si existe
  if (factura.asiento_id) {
    const r = await generarAsientoReversa(supabase, factura.asiento_id, conceptoBase)
    if (r.ok) asientoReversaNegro = r.asiento_id
    else advertencias.push(`Reversa de asiento principal falló: ${r.error}`)
  } else {
    // Fallback: buscar por referencia (facturas creadas antes de la columna asiento_id)
    const { data: asientoLegacy } = await supabase
      .from("contabilidad_asientos")
      .select("id")
      .eq("comprobante_tipo", "factura")
      .eq("referencia", factura.numero)
      .is("asiento_reversion_id", null)
      .maybeSingle()
    if (asientoLegacy?.id) {
      const r = await generarAsientoReversa(supabase, asientoLegacy.id, conceptoBase)
      if (r.ok) asientoReversaNegro = r.asiento_id
      else advertencias.push(`Reversa de asiento legacy falló: ${r.error}`)
    }
  }

  // 4. Revertir asiento de IVA diferido (asiento 2) si existe
  if (factura.asiento_iva_id) {
    const r = await generarAsientoReversa(supabase, factura.asiento_iva_id, `${conceptoBase} (IVA + Recargo)`)
    if (r.ok) asientoReversaIVA = r.asiento_id
    else advertencias.push(`Reversa de asiento IVA falló: ${r.error}`)
  }

  // 5. Si la factura proviene de una seña, liberar la referencia y volver
  //    el estado de la seña a "registrada" para que el operador pueda
  //    reintentar el cierre con otra factura sin tener que cancelar la seña
  //    completa. También cancelar el remito asociado y revertir su asiento.
  const { data: senia } = await supabase
    .from("senias_equipo")
    .select("id, numero, remito_id, remito_numero, seguimiento, monto_senia")
    .eq("factura_id", id)
    .maybeSingle()
  if (senia) {
    // Cancelar el remito + revertir su asiento
    if (senia.remito_id) {
      const { data: rem } = await supabase
        .from("remitos")
        .select("id, asiento_id")
        .eq("id", senia.remito_id)
        .maybeSingle()
      if (rem?.asiento_id) {
        await generarAsientoReversa(supabase, rem.asiento_id, `Cancelación remito ${senia.remito_numero ?? ""} (cancelación factura ${factura.numero})`)
      }
      await supabase
        .from("remitos")
        .update({ estado: "cancelado", updated_at: new Date().toISOString() })
        .eq("id", senia.remito_id)
    }
    // Liberar la seña: vuelve a "registrada" para que el operador pueda
    // reabrir el cierre. Si tenía monto_senia > 0 lo respetamos (recibo
    // sigue válido); si era sin_senia, queda "en_curso" sin_senia.
    const nuevaEstadoSenia = (Number(senia.monto_senia ?? 0) > 0) ? "registrada" : "sin_senia"
    const seguimiento = [
      ...((senia as { seguimiento?: unknown[] }).seguimiento ?? []),
      {
        fecha: new Date().toISOString(),
        usuario: "Sistema",
        accion: "Factura cancelada — cierre liberado",
        detalle: `Factura ${factura.numero} cancelada${motivo ? ` (${motivo})` : ""}. Remito ${senia.remito_numero ?? ""} cancelado. Operador puede confirmar de nuevo.`,
      },
    ]
    await supabase
      .from("senias_equipo")
      .update({
        estado: "en_curso",
        estado_senia: nuevaEstadoSenia,
        factura_id: null,
        factura_numero: null,
        remito_id: null,
        remito_numero: null,
        medios_pago_cierre: [],
        seguimiento,
      })
      .eq("id", senia.id)
  }

  return NextResponse.json({
    ok: true,
    asiento_reversa_negro_id: asientoReversaNegro,
    asiento_reversa_iva_id: asientoReversaIVA,
    advertencias: advertencias.length > 0 ? advertencias : undefined,
  })
}
