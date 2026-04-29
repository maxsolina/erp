import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/usuarios/me → devuelve el registro de la tabla `usuarios` que corresponde
// al auth.users.id de la sesión activa.
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: errAuth } = await supabase.auth.getUser()
  if (errAuth || !user) return apiError("No autenticado", 401)

  const { data, error } = await supabase
    .from("usuarios")
    .select(`
      id, auth_user_id, nombre, username, email, avatar_url,
      sucursal_default_id, is_superuser, is_active, last_login_at,
      sucursales:sucursal_default_id ( id, nombre )
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (error) return dbError(error)
  if (!data) return apiError("El usuario autenticado no tiene perfil ERP cargado", 404)

  // Traemos sus vistas y permisos de usuario_permisos para que el cliente arme la cascada
  const { data: perms } = await supabase
    .from("usuario_permisos")
    .select("vistas, permisos")
    .eq("usuario_id", data.id)
    .maybeSingle()

  const u = data as any
  return NextResponse.json({
    ...u,
    sucursal_default_nombre: u.sucursales?.nombre ?? null,
    sucursales: undefined,
    vistas:   (perms?.vistas   ?? {}) as Record<string, boolean>,
    permisos: (perms?.permisos ?? {}) as Record<string, Record<string, string | boolean>>,
  })
}
