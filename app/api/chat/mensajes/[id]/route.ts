// PATCH  /api/chat/mensajes/[id]   — editar (15 min, propios)
// DELETE /api/chat/mensajes/[id]   — borrar para todos (soft delete)

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUsuarioActual } from "@/lib/chat-auth"

const VENTANA_EDICION_MS = 15 * 60 * 1000  // 15 minutos

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id: msgId } = await params
  const body = await req.json()
  const contenido = String(body.contenido ?? "").trim()
  if (!contenido) return NextResponse.json({ error: "Contenido vacío" }, { status: 400 })

  // Validamos: el remitente soy yo, no está borrado, y la edición es dentro de ventana
  const { data: existente } = await supabase
    .from("chat_mensajes")
    .select("id, remitente_id, eliminado_at, created_at")
    .eq("id", msgId)
    .maybeSingle()

  if (!existente) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 })
  if (existente.remitente_id !== yo.id) return NextResponse.json({ error: "Solo podés editar tus propios mensajes" }, { status: 403 })
  if (existente.eliminado_at) return NextResponse.json({ error: "El mensaje fue eliminado" }, { status: 400 })

  const elapsed = Date.now() - new Date(existente.created_at).getTime()
  if (elapsed > VENTANA_EDICION_MS) {
    return NextResponse.json({ error: "Pasaron más de 15 minutos — no se puede editar" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("chat_mensajes")
    .update({ contenido, editado_at: new Date().toISOString() })
    .eq("id", msgId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id: msgId } = await params

  const { data: existente } = await supabase
    .from("chat_mensajes")
    .select("remitente_id")
    .eq("id", msgId)
    .maybeSingle()
  if (!existente) return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 })
  if (existente.remitente_id !== yo.id) return NextResponse.json({ error: "Solo podés borrar tus propios mensajes" }, { status: 403 })

  // Soft delete — la fila queda pero el contenido se vacía y el UI muestra
  // "Mensaje eliminado". Auditoría: el admin sigue viendo eliminado_at.
  const { error } = await supabase
    .from("chat_mensajes")
    .update({ eliminado_at: new Date().toISOString(), contenido: null, adjunto_url: null })
    .eq("id", msgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
