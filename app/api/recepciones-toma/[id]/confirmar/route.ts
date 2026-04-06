import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const tomaId = parseInt(id)
  const body = await req.json()
  const { imei, observaciones } = body

  if (!imei?.trim()) {
    return NextResponse.json({ error: "El IMEI es requerido" }, { status: 400 })
  }

  // Obtener la recepción de toma pendiente
  const { data: recepcion, error: errRec } = await supabase
    .from("recepciones_toma")
    .select("id, numero")
    .eq("toma_equipo_id", tomaId)
    .eq("estado", "pendiente")
    .single()

  if (errRec || !recepcion) {
    return NextResponse.json({ error: "Recepción pendiente no encontrada" }, { status: 404 })
  }

  // Actualizar la recepción a recibida con IMEI y observaciones
  const { error: errUpdate } = await supabase
    .from("recepciones_toma")
    .update({
      estado: "recibido",
      observaciones: `IMEI: ${imei}${observaciones ? ` | ${observaciones}` : ""}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recepcion.id)

  if (errUpdate) {
    return NextResponse.json({ error: errUpdate.message }, { status: 500 })
  }

  // Actualizar estado_recepcion en la toma
  await supabase
    .from("tomas_equipo")
    .update({ estado_recepcion: "recibido", updated_at: new Date().toISOString() })
    .eq("id", tomaId)

  return NextResponse.json({ ok: true, recepcion_numero: recepcion.numero, imei })
}
