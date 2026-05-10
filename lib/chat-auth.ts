// Helper compartido por los endpoints de /api/chat — resuelve el usuario
// logueado a su fila en la tabla `usuarios` (FK que usan las tablas chat_*).
//
// Devuelve null si no hay sesión o si el auth.uid() no tiene match en
// `usuarios` (caso raro: usuario auth pero sin perfil en el ERP).

import type { SupabaseClient } from "@supabase/supabase-js"

export interface UsuarioActual {
  id: number
  auth_user_id: string
  nombre: string
  email: string
  is_superuser: boolean
}

export async function getUsuarioActual(supabase: SupabaseClient): Promise<UsuarioActual | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return null

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, auth_user_id, nombre, email, is_superuser")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle()

  return usuario ?? null
}
