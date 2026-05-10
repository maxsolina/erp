// GET    /api/chat/conversaciones        — lista de chats del usuario
// POST   /api/chat/conversaciones        — crear chat (1-a-1 o grupo)
//
// Para cada conversación devolvemos:
//   - id, tipo, nombre, ultimo_mensaje_at
//   - participantes: [{ usuario_id, nombre, avatar_url, ... }]
//   - ultimo_mensaje: { contenido, remitente_nombre, created_at }
//   - no_leidos: cantidad de mensajes posteriores al last_read_at del user
//
// Para 1-a-1 el cliente arma el "nombre de la conv" desde el otro participante.
// Para grupos usa `nombre`.
//
// IMPORTANTE: la tabla `usuarios` tiene RLS restrictiva ("solo veo mi fila").
// Para resolver nombres/avatares de los OTROS participantes usamos
// `createAdminClient()` solamente para esa lectura — solo traemos campos
// públicos (id, nombre, avatar_url, email). El resto de lecturas siguen
// con session client + RLS para auditoría.

import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getUsuarioActual } from "@/lib/chat-auth"

export async function GET() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // Conversaciones donde participo (no archivadas)
  const { data: misParts, error: mpErr } = await supabase
    .from("chat_participantes")
    .select("conversacion_id, last_read_at")
    .eq("usuario_id", yo.id)
    .is("archivado_at", null)

  if (mpErr) return NextResponse.json({ error: mpErr.message }, { status: 500 })

  const convIds = (misParts ?? []).map(p => p.conversacion_id)
  if (convIds.length === 0) return NextResponse.json([])

  const lastReadByConv: Record<string, string | null> = {}
  for (const p of misParts ?? []) lastReadByConv[p.conversacion_id] = p.last_read_at

  // 1) Conversaciones (sin joinear usuarios — eso lo hacemos abajo con admin)
  const { data: convs, error: convErr } = await supabase
    .from("chat_conversaciones")
    .select(`
      id, tipo, nombre, imagen_url, ultimo_mensaje_at, created_at,
      participantes:chat_participantes(usuario_id, rol, last_read_at)
    `)
    .in("id", convIds)
    .order("ultimo_mensaje_at", { ascending: false, nullsFirst: false })

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 })

  // 2) IDs únicos de todos los usuarios involucrados
  const userIds = new Set<number>()
  for (const c of convs ?? []) {
    for (const p of (c as any).participantes ?? []) userIds.add(p.usuario_id)
  }

  // 3) Resolver datos de usuarios con admin client (bypassea RLS de `usuarios`)
  const { data: usuariosData } = userIds.size > 0
    ? await admin.from("usuarios").select("id, nombre, avatar_url, email").in("id", [...userIds])
    : { data: [] }
  const usuarioPorId: Record<number, any> = {}
  for (const u of usuariosData ?? []) usuarioPorId[u.id] = u

  // 4) Último mensaje + no leídos en paralelo
  const [{ data: ultimosMsgs }, noLeidosPorConv] = await Promise.all([
    supabase
      .from("chat_mensajes")
      .select("id, conversacion_id, contenido, tipo, remitente_id, created_at, eliminado_at")
      .in("conversacion_id", convIds)
      .order("created_at", { ascending: false })
      .then(r => ({ data: r.data ?? [], error: r.error })),
    contarNoLeidos(supabase, convIds, lastReadByConv),
  ])

  const ultimoPorConv: Record<string, any> = {}
  for (const m of ultimosMsgs ?? []) {
    if (!ultimoPorConv[m.conversacion_id]) ultimoPorConv[m.conversacion_id] = m
  }

  // 5) Enriquecer con datos de usuarios
  const enriched = (convs ?? []).map((c: any) => {
    const ultimo = ultimoPorConv[c.id]
    return {
      ...c,
      participantes: (c.participantes ?? []).map((p: any) => ({
        ...p,
        usuario: usuarioPorId[p.usuario_id] ?? null,
      })),
      ultimo_mensaje: ultimo
        ? {
            ...ultimo,
            remitente_nombre: usuarioPorId[ultimo.remitente_id]?.nombre ?? null,
            es_propio: ultimo.remitente_id === yo.id,
          }
        : null,
      no_leidos: noLeidosPorConv[c.id] ?? 0,
    }
  })

  return NextResponse.json(enriched)
}

async function contarNoLeidos(
  supabase: any,
  convIds: string[],
  lastRead: Record<string, string | null>,
): Promise<Record<string, number>> {
  // Para cada conv: contamos mensajes con created_at > last_read_at (o todos si null).
  // Hacemos una sola query y agrupamos en JS para evitar N queries.
  const { data: mensajes } = await supabase
    .from("chat_mensajes")
    .select("conversacion_id, remitente_id, created_at")
    .in("conversacion_id", convIds)
    .is("eliminado_at", null)

  const out: Record<string, number> = {}
  for (const m of mensajes ?? []) {
    const lr = lastRead[m.conversacion_id]
    if (lr && m.created_at <= lr) continue
    out[m.conversacion_id] = (out[m.conversacion_id] ?? 0) + 1
  }
  return out
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const body = await req.json()
  const { tipo, participantes_ids, nombre } = body as {
    tipo: "directo" | "grupo"
    participantes_ids: number[]
    nombre?: string
  }

  if (tipo !== "directo" && tipo !== "grupo") {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 })
  }
  if (!Array.isArray(participantes_ids) || participantes_ids.length === 0) {
    return NextResponse.json({ error: "Faltan participantes" }, { status: 400 })
  }
  if (tipo === "grupo" && !nombre?.trim()) {
    return NextResponse.json({ error: "Los grupos requieren un nombre" }, { status: 400 })
  }

  // Lista única de participantes (incluyo siempre al usuario logueado)
  const allIds = Array.from(new Set([yo.id, ...participantes_ids.map(Number)]))

  // Si es 'directo' y ya hay una conv 1-a-1 entre estas dos personas, devolverla.
  // Esto evita duplicar chats — el "Iniciar conversación" debe ser idempotente.
  if (tipo === "directo" && allIds.length === 2) {
    const otroId = allIds.find(id => id !== yo.id)!
    const { data: existente } = await supabase
      .from("chat_conversaciones")
      .select(`id, tipo, participantes:chat_participantes(usuario_id)`)
      .eq("tipo", "directo")
    const match = (existente ?? []).find((c: any) => {
      const ids = (c.participantes ?? []).map((p: any) => p.usuario_id).sort()
      return ids.length === 2 && ids.includes(yo.id) && ids.includes(otroId)
    })
    if (match) {
      return NextResponse.json({ id: match.id, ya_existia: true })
    }
  }

  const { data: conv, error: convErr } = await supabase
    .from("chat_conversaciones")
    .insert({
      tipo,
      nombre: tipo === "grupo" ? nombre!.trim() : null,
      creado_por_id: yo.id,
    })
    .select("id")
    .single()

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 })

  // Insertar participantes — el creador queda con rol 'admin' en grupos.
  const partRows = allIds.map(uid => ({
    conversacion_id: conv.id,
    usuario_id: uid,
    rol: tipo === "grupo" && uid === yo.id ? "admin" : "miembro",
  }))
  const { error: partErr } = await supabase.from("chat_participantes").insert(partRows)
  if (partErr) {
    // rollback: borrar la conv huérfana
    await supabase.from("chat_conversaciones").delete().eq("id", conv.id)
    return NextResponse.json({ error: partErr.message }, { status: 500 })
  }

  return NextResponse.json({ id: conv.id, ya_existia: false }, { status: 201 })
}
