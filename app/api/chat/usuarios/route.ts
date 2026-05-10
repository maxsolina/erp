// GET /api/chat/usuarios — usuarios elegibles para iniciar un chat
// (todos los usuarios activos excepto el logueado).
//
// La RLS de `usuarios` solo deja ver tu propia fila → usamos admin client
// para listar a TODOS los empleados (necesario para el picker de nuevo chat).
// Solo devolvemos campos públicos: id, nombre, avatar_url, email.

import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getUsuarioActual } from "@/lib/chat-auth"

export async function GET() {
  const supabase = await createClient()
  const yo = await getUsuarioActual(supabase)
  if (!yo) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  // Admin client: bypassea RLS para poder listar a todos los activos.
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("usuarios")
    .select("id, nombre, avatar_url, email, is_superuser")
    .eq("is_active", true)
    .neq("id", yo.id)
    .order("nombre")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
