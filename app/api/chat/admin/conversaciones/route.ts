// GET /api/chat/admin/conversaciones — vista global (solo superusers).
// Devuelve TODAS las conversaciones del ERP con sus participantes, último
// mensaje y conteos. Sirve para auditoría — el admin puede después abrir
// una conversación y ver el histórico (las RLS le permiten leer).

import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getUsuarioActual } from "@/lib/chat-auth"

export async function GET() {
  const supabase = await createClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  if (!yo.is_superuser) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

  const admin = createAdminClient()
  const { data: convs, error } = await admin
    .from("chat_conversaciones")
    .select(`
      id, tipo, nombre, imagen_url, ultimo_mensaje_at, created_at, creado_por_id,
      participantes:chat_participantes(usuario_id, rol)
    `)
    .order("ultimo_mensaje_at", { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const convIds = (convs ?? []).map((c: any) => c.id)
  if (convIds.length === 0) return NextResponse.json([])

  // Resolver datos de TODOS los usuarios involucrados (creadores + participantes)
  const userIds = new Set<number>()
  for (const c of convs ?? []) {
    if (c.creado_por_id) userIds.add(c.creado_por_id)
    for (const p of (c as any).participantes ?? []) userIds.add(p.usuario_id)
  }
  const { data: usuariosData } = userIds.size > 0
    ? await admin.from("usuarios").select("id, nombre, avatar_url, email").in("id", [...userIds])
    : { data: [] }
  const usuarioPorId: Record<number, any> = {}
  for (const u of usuariosData ?? []) usuarioPorId[u.id] = u

  // Conteo de mensajes por conv
  const { data: cantPorConv } = await admin
    .from("chat_mensajes")
    .select("conversacion_id")
    .in("conversacion_id", convIds)
  const totalPorConv: Record<string, number> = {}
  for (const m of cantPorConv ?? []) totalPorConv[m.conversacion_id] = (totalPorConv[m.conversacion_id] ?? 0) + 1

  const enriched = (convs ?? []).map((c: any) => ({
    ...c,
    creado_por: c.creado_por_id ? usuarioPorId[c.creado_por_id] ?? null : null,
    participantes: (c.participantes ?? []).map((p: any) => ({
      ...p,
      usuario: usuarioPorId[p.usuario_id] ?? null,
    })),
    cantidad_mensajes: totalPorConv[c.id] ?? 0,
  }))

  return NextResponse.json(enriched)
}
