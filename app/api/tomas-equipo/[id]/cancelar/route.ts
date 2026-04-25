import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generarAsientoReversa } from "@/lib/contabilidad-asiento-factory"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  // Admin necesario: generarAsientoReversa inserta en contabilidad_asientos,
  // tabla con RLS restrictivo que requiere service_role para bypass.
  const adminClient = createAdminClient()
  const { id } = await params
  const tomaId = parseInt(id)

  if (isNaN(tomaId)) {
    return NextResponse.json({ error: "ID de toma inválido" }, { status: 400 })
  }

  // 1. Obtener la toma
  const { data: toma, error: errToma } = await supabase
    .from("tomas_equipo")
    .select("id, numero, estado")
    .eq("id", tomaId)
    .single()

  if (errToma || !toma) {
    return NextResponse.json({ error: "Toma de equipo no encontrada" }, { status: 404 })
  }
  if (toma.estado === "cancelado") {
    return NextResponse.json({ error: "La toma ya está cancelada" }, { status: 400 })
  }

  // 2. Obtener la NC vinculada (ajuste automático)
  const { data: ajuste } = await supabase
    .from("ajustes_clientes")
    .select("id, numero, estado, asiento_id, es_automatica")
    .eq("toma_equipo_id", tomaId)
    .maybeSingle()

  // 3. Obtener la recepción vinculada
  const { data: recepcion } = await supabase
    .from("recepciones_toma")
    .select("id, numero, estado, asiento_id")
    .eq("toma_equipo_id", tomaId)
    .maybeSingle()

  // ── CASO B: recepción ya conforme (recibido) — revertir asiento REP primero ──
  if (recepcion && recepcion.estado === "recibido") {
    if (recepcion.asiento_id) {
      const reversaRep = await generarAsientoReversa(
        adminClient,
        recepcion.asiento_id,
        `Anulación REP Toma Equipo ${toma.numero}`
      )
      if (!reversaRep.ok) {
        console.error("[cancelar-te] reversa REP error:", reversaRep.error)
        return NextResponse.json({ error: `Error al revertir asiento de recepción: ${reversaRep.error}` }, { status: 500 })
      }
    }
    // Cancelar recepción
    await supabase
      .from("recepciones_toma")
      .update({ estado: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", recepcion.id)
  } else if (recepcion && recepcion.estado !== "cancelado") {
    // ── CASO A: recepción pendiente — solo cancelar sin reversa ──
    await supabase
      .from("recepciones_toma")
      .update({ estado: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", recepcion.id)
  }

  // 4. Revertir asiento de la NC y cancelarla
  if (ajuste && ajuste.estado !== "cancelado") {
    if (ajuste.asiento_id) {
      const reversaNc = await generarAsientoReversa(
        adminClient,
        ajuste.asiento_id,
        `Anulación NC Toma Equipo ${toma.numero}`
      )
      if (!reversaNc.ok) {
        console.error("[cancelar-te] reversa NC error:", reversaNc.error)
        return NextResponse.json({ error: `Error al revertir asiento de nota de crédito: ${reversaNc.error}` }, { status: 500 })
      }
    }
    await supabase
      .from("ajustes_clientes")
      .update({ estado: "cancelado", updated_at: new Date().toISOString() })
      .eq("id", ajuste.id)
  }

  // 5. Cancelar la toma
  const { error: errCancel } = await supabase
    .from("tomas_equipo")
    .update({ estado: "cancelado", updated_at: new Date().toISOString() })
    .eq("id", tomaId)

  if (errCancel) {
    return NextResponse.json({ error: `Error al cancelar la toma: ${errCancel.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
