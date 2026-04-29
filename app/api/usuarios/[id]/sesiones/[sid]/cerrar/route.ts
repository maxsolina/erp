import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/usuarios/[id]/sesiones/[sid]/cerrar
// body: {
//   tipo_cierre: "logout_manual" | "expirada" | "invalida" | "forzada"
//   terminada_por: "usuario" | "sistema" | "administrador"
//   razon?: string
// }
//
// Notas:
//   - Si tipo_cierre = "forzada", solo un superusuario puede ejecutarlo (validación server-side).
//   - Esto NO invalida el JWT de Supabase del usuario afectado (eso requiere acceso admin
//     vía service role; queda como mejora futura). Sí marca la fila de log como cerrada.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params
  const usuarioId = parseInt(id, 10)
  const sesionId  = parseInt(sid, 10)
  if (Number.isNaN(usuarioId) || Number.isNaN(sesionId)) return apiError("Parámetros inválidos", 400)

  const body = await req.json().catch(() => ({}))
  const tipoCierre   = body?.tipo_cierre   ?? "logout_manual"
  const terminadaPor = body?.terminada_por ?? "usuario"
  const razon        = body?.razon ?? null

  const supabase = await createClient()

  // Si es forzada, validar que el solicitante sea superusuario y registrar quién lo hizo
  let terminadaPorUserId: number | null = null
  if (tipoCierre === "forzada") {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError("No autenticado", 401)
    const { data: solicitante } = await supabase
      .from("usuarios")
      .select("id, is_superuser")
      .eq("auth_user_id", user.id)
      .maybeSingle()
    if (!solicitante?.is_superuser) {
      return apiError("Solo un superusuario puede cerrar sesiones forzosamente", 403)
    }
    terminadaPorUserId = solicitante.id
  }

  const { error } = await supabase
    .from("usuario_sesiones")
    .update({
      logout_at: new Date().toISOString(),
      tipo_cierre: tipoCierre,
      terminada_por: terminadaPor,
      terminada_por_user_id: terminadaPorUserId,
      razon,
    })
    .eq("id", sesionId)
    .eq("usuario_id", usuarioId)
    .is("logout_at", null) // solo cerramos si todavía está abierta

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
