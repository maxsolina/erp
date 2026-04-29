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

  return NextResponse.json({
    ok: true,
    asiento_reversa_negro_id: asientoReversaNegro,
    asiento_reversa_iva_id: asientoReversaIVA,
    advertencias: advertencias.length > 0 ? advertencias : undefined,
  })
}
