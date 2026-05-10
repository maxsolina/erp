// GET   /api/chat/conversaciones/[id]/mensajes  — mensajes (paginados)
// POST  /api/chat/conversaciones/[id]/mensajes  — mandar mensaje
//
// La paginación es por cursor (created_at descending). El cliente carga los
// últimos N, después si scrollea hacia arriba pide más con `?antes_de=`.
//
// Como `usuarios` tiene RLS estricta, resolvemos los datos del remitente
// con admin client (solo campos públicos: id, nombre, avatar_url).

import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getUsuarioActual } from "@/lib/chat-auth"

const PAGE_SIZE = 50
const MAX_CONTENIDO_LENGTH = 5000

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id: convId } = await params
  const url = new URL(req.url)
  const antesDe = url.searchParams.get("antes_de")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? PAGE_SIZE), 100)

  let q = supabase
    .from("chat_mensajes")
    .select(`
      id, conversacion_id, remitente_id, tipo, contenido,
      adjunto_url, adjunto_nombre, adjunto_tamaño,
      reply_to_id, editado_at, eliminado_at, created_at
    `)
    .eq("conversacion_id", convId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (antesDe) q = q.lt("created_at", antesDe)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolver remitentes con admin client (RLS de `usuarios` no deja al
  // session client ver a OTROS usuarios). Sólo traemos campos públicos.
  const remitenteIds = [...new Set((data ?? []).map((m: any) => m.remitente_id))]
  const { data: remitentes } = remitenteIds.length > 0
    ? await admin.from("usuarios").select("id, nombre, avatar_url").in("id", remitenteIds)
    : { data: [] }
  const remPorId: Record<number, any> = {}
  for (const u of remitentes ?? []) remPorId[u.id] = u

  // Devolvemos en orden cronológico ascendente (más viejo primero) para que
  // el cliente solo haga `appendChild` al final cuando lleguen mensajes nuevos.
  const ordenados = (data ?? []).slice().reverse().map((m: any) => ({
    ...m,
    remitente: remPorId[m.remitente_id] ?? null,
  }))
  return NextResponse.json(ordenados)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { id: convId } = await params
  const body = await req.json()
  const contenido = String(body.contenido ?? "").trim()
  const tipo = (body.tipo ?? "texto") as "texto" | "imagen" | "archivo"
  const reply_to_id = body.reply_to_id ?? null
  const adjunto_url = body.adjunto_url ?? null
  const adjunto_nombre = body.adjunto_nombre ?? null
  const adjunto_tamaño = body.adjunto_tamaño ?? null

  if (tipo === "texto" && !contenido) {
    return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 })
  }
  if (contenido.length > MAX_CONTENIDO_LENGTH) {
    return NextResponse.json({ error: `Máximo ${MAX_CONTENIDO_LENGTH} caracteres` }, { status: 400 })
  }

  const { data: msg, error } = await supabase
    .from("chat_mensajes")
    .insert({
      conversacion_id: convId,
      remitente_id: yo.id,
      tipo,
      contenido: contenido || null,
      adjunto_url, adjunto_nombre, adjunto_tamaño,
      reply_to_id,
    })
    .select(`
      id, conversacion_id, remitente_id, tipo, contenido,
      adjunto_url, adjunto_nombre, adjunto_tamaño,
      reply_to_id, editado_at, eliminado_at, created_at
    `)
    .single()

  if (error) {
    // 42501 = RLS rejection (usuario no es participante de la conv)
    const status = error.code === "42501" ? 403 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  // Auto-marcar como leído mi propio mensaje (el remitente "ya lo vio").
  await supabase
    .from("chat_participantes")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversacion_id", convId)
    .eq("usuario_id", yo.id)

  // Enriquecer con datos del remitente para que el front no tenga que pedirlo
  const { data: rem } = await admin
    .from("usuarios")
    .select("id, nombre, avatar_url")
    .eq("id", yo.id)
    .maybeSingle()

  return NextResponse.json({ ...msg, remitente: rem ?? null }, { status: 201 })
}
