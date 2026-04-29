import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Parser básico de User-Agent (server-side, sin librerías externas)
function parseUA(ua: string | null): { sistema_operativo: string; navegador: string; version_navegador: string } {
  if (!ua) return { sistema_operativo: "Desconocido", navegador: "Desconocido", version_navegador: "" }

  let so = "Desconocido"
  if (/Windows NT/.test(ua))            so = "Windows"
  else if (/Mac OS X/.test(ua))         so = "macOS"
  else if (/Android/.test(ua))          so = "Android"
  else if (/iPhone|iPad|iPod/.test(ua)) so = "iOS"
  else if (/Linux/.test(ua))            so = "Linux"

  let navegador = "Desconocido", version = ""
  if (/Edg\//.test(ua))           { navegador = "Edge";    version = ua.match(/Edg\/(\d+\.\d+)/)?.[1] ?? "" }
  else if (/OPR\//.test(ua))      { navegador = "Opera";   version = ua.match(/OPR\/(\d+\.\d+)/)?.[1] ?? "" }
  else if (/Chrome\//.test(ua))   { navegador = "Chrome";  version = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] ?? "" }
  else if (/Firefox\//.test(ua))  { navegador = "Firefox"; version = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] ?? "" }
  else if (/Safari\//.test(ua))   { navegador = "Safari";  version = ua.match(/Version\/(\d+\.\d+)/)?.[1] ?? "" }

  return { sistema_operativo: so, navegador, version_navegador: version }
}

function extraerIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const xri = req.headers.get("x-real-ip")
  if (xri) return xri
  return null
}

// ─── GET — listar sesiones del usuario ───────────────────────────────────────
// Query params soportados:
//   ?solo_activas=1
//   ?desde=YYYY-MM-DD
//   ?hasta=YYYY-MM-DD
//   ?tipo_cierre=logout_manual|expirada|invalida|forzada
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuarioId = parseInt(id, 10)
  if (Number.isNaN(usuarioId)) return apiError("id inválido", 400)

  const { searchParams } = new URL(req.url)
  const soloActivas = searchParams.get("solo_activas") === "1"
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const tipoCierre = searchParams.get("tipo_cierre")

  const supabase = await createClient()
  let query = supabase
    .from("usuario_sesiones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("login_at", { ascending: false })

  if (soloActivas)        query = query.is("logout_at", null)
  if (desde)              query = query.gte("login_at", desde)
  if (hasta)              query = query.lte("login_at", hasta + "T23:59:59")
  if (tipoCierre)         query = query.eq("tipo_cierre", tipoCierre)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// ─── POST — registrar el inicio de una sesión (llamado al loguearse) ─────────
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuarioId = parseInt(id, 10)
  if (Number.isNaN(usuarioId)) return apiError("id inválido", 400)

  const body = await req.json().catch(() => ({}))
  const ua = body?.user_agent ?? req.headers.get("user-agent") ?? ""
  const { sistema_operativo, navegador, version_navegador } = parseUA(ua)
  const ip = extraerIp(req)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("usuario_sesiones")
    .insert({
      usuario_id: usuarioId,
      ip,
      sistema_operativo,
      navegador,
      version_navegador,
      login_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) return dbError(error)

  // Actualizar last_login_at del usuario
  await supabase
    .from("usuarios")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", usuarioId)

  return NextResponse.json({ ok: true, id: data.id })
}
