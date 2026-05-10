// GET    /api/caja-valores/usuarios?caja_valor_id=...   — lista asignados
// POST   /api/caja-valores/usuarios                      — asignar
// DELETE /api/caja-valores/usuarios?id=...               — desasignar
//
// Mismo patrón que diarios/usuarios — solo superuser modifica.

import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const url = new URL(req.url)
  const cajaValorId = url.searchParams.get("caja_valor_id")
  if (!cajaValorId) return NextResponse.json({ error: "caja_valor_id requerido" }, { status: 400 })

  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: rows, error } = await admin
    .from("caja_valores_usuarios")
    .select("id, caja_valor_id, usuario_id, created_at")
    .eq("caja_valor_id", cajaValorId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const { data: yo } = await supabase.from("usuarios").select("is_superuser").eq("auth_user_id", auth.user.id).maybeSingle()
  if (!yo?.is_superuser) return NextResponse.json({ error: "Solo administradores" }, { status: 403 })

  const body = await req.json()
  const { caja_valor_id, usuario_id } = body
  if (!caja_valor_id || !usuario_id) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const { data, error } = await admin
    .from("caja_valores_usuarios")
    .insert({ caja_valor_id, usuario_id: Number(usuario_id) })
    .select()
    .single()
  if (error) {
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

  const { error } = await admin.from("caja_valores_usuarios").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
