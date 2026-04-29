import { apiError, dbError } from "@/lib/api-utils"
import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/auth/lookup-email?username=X
// Devuelve { email } del usuario activo cuyo username matchea, o 404 si no existe.
// Usa admin client porque se llama ANTES del login (no hay sesión todavía → RLS lo bloquearía).
// Solo expone el email asociado al username — no datos sensibles.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = (searchParams.get("username") ?? "").trim().toLowerCase()
  if (!username) return apiError("username requerido", 400)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("usuarios")
    .select("email, is_active")
    .eq("username", username)
    .maybeSingle()

  if (error) return dbError(error)
  if (!data || !data.is_active) return apiError("Usuario no encontrado o inactivo", 404)
  return NextResponse.json({ email: data.email })
}
