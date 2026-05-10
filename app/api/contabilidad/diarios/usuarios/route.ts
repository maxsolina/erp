// GET    /api/contabilidad/diarios/usuarios?diario_id=...   — lista asignados
// POST   /api/contabilidad/diarios/usuarios                  — asignar
// DELETE /api/contabilidad/diarios/usuarios?id=...           — desasignar
//
// Solo superusers pueden modificar (la RLS lo exige). El listado lo puede
// leer el propio usuario para sus diarios + admins para todos.

import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const url = new URL(req.url)
  const diarioId = url.searchParams.get("diario_id")
  if (!diarioId) return NextResponse.json({ error: "diario_id requerido" }, { status: 400 })

  // Verificar autenticación
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: rows, error } = await admin
    .from("contabilidad_diarios_usuarios")
    .select("id, diario_id, usuario_id, created_at")
    .eq("diario_id", diarioId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolver datos básicos de los usuarios con admin (RLS de `usuarios` es restrictiva)
  const ids = [...new Set((rows ?? []).map(r => r.usuario_id))]
  const { data: usuariosData } = ids.length > 0
    ? await admin.from("usuarios").select("id, nombre, email").in("id", ids)
    : { data: [] }
  const userMap: Record<number, { id: number; nombre: string; email: string }> = {}
  for (const u of usuariosData ?? []) userMap[u.id] = u as any

  const enriched = (rows ?? []).map(r => ({
    ...r,
    usuario: userMap[r.usuario_id] ?? null,
    nombre: userMap[r.usuario_id]?.nombre ?? `#${r.usuario_id}`,
  }))
  return NextResponse.json(enriched)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  // Validar que es superuser desde el lado del server
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: yo } = await supabase.from("usuarios").select("is_superuser").eq("auth_user_id", auth.user.id).maybeSingle()
  if (!yo?.is_superuser) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

  const body = await req.json()
  const { diario_id, usuario_id } = body
  if (!diario_id || !usuario_id) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const { data, error } = await admin
    .from("contabilidad_diarios_usuarios")
    .insert({ diario_id, usuario_id: Number(usuario_id) })
    .select()
    .single()
  if (error) {
    // 23505 = unique_violation (el usuario ya está asignado)
    const status = error.code === "23505" ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: yo } = await supabase.from("usuarios").select("is_superuser").eq("auth_user_id", auth.user.id).maybeSingle()
  if (!yo?.is_superuser) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const { error } = await admin.from("contabilidad_diarios_usuarios").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
