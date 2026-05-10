// PATCH /api/chat/conversaciones/[id]/leer  — marca todos los mensajes
// previos como leídos por el usuario actual (setea last_read_at = NOW()).

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUsuarioActual } from "@/lib/chat-auth"

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id: convId } = await params
  const { error } = await supabase
    .from("chat_participantes")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversacion_id", convId)
    .eq("usuario_id", yo.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
