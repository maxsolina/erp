// Helper para registrar eventos en `documentos_seguimiento` desde los
// endpoints del backend. Se llama después de cada operación exitosa
// (creación, update). Si el insert falla, NO se rompe el flujo principal
// — solo se logea por consola: el seguimiento es auxiliar, no crítico.

import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

// Resuelve el username del usuario actualmente logueado leyendo las cookies
// de sesión. Funciona tanto cuando el endpoint usa el cliente con sesión
// (session-bound) como cuando usa el admin client (service_role) — el lookup
// va siempre por cookies. Si no hay sesión devuelve null y el evento se
// guarda como "sistema".
async function getCurrentUsername(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )
    const { data: userData } = await sessionClient.auth.getUser()
    const user = userData?.user
    if (!user) return null
    const { data: u } = await sessionClient
      .from("usuarios")
      .select("username, nombre")
      .eq("auth_user_id", user.id)
      .maybeSingle()
    return u?.username ?? u?.nombre ?? user.email ?? null
  } catch {
    return null
  }
}

export type TipoEvento =
  | "creacion"
  | "cambio_estado"
  | "cambio_campo"
  | "nota"
  | "mensaje"

interface EventoBase {
  tipo_documento: string
  documento_id: string | number
  usuario?: string | null
}

interface EventoCreacion extends EventoBase {
  tipo_evento: "creacion"
  descripcion?: string
}

interface EventoCambioEstado extends EventoBase {
  tipo_evento: "cambio_estado"
  valor_anterior: string
  valor_nuevo: string
}

interface EventoCambioCampo extends EventoBase {
  tipo_evento: "cambio_campo"
  campo: string
  valor_anterior: string | null
  valor_nuevo: string | null
}

interface EventoNotaOMensaje extends EventoBase {
  tipo_evento: "nota" | "mensaje"
  descripcion: string
}

export type Evento =
  | EventoCreacion
  | EventoCambioEstado
  | EventoCambioCampo
  | EventoNotaOMensaje

export async function registrarEvento(
  supabase: SupabaseClient,
  evento: Evento
): Promise<void> {
  try {
    // Resolución del usuario: SIEMPRE intentamos leerlo de la sesión primero
    // (vía cookies) para mantener consistencia entre todos los endpoints — los
    // que usan service_role admin client y los que pasan `usuario` desde el
    // body. Si no hay sesión activa, caemos a lo que pasó el caller. Esto
    // garantiza que la tabla siempre muestre el `username` canónico (ej.
    // "solinamax") en lugar de variantes pasadas por el body (ej. "max solina"
    // por el campo nombre del frontend).
    const usuarioResuelto =
      (await getCurrentUsername()) ?? evento.usuario ?? "sistema"

    const { error } = await supabase.from("documentos_seguimiento").insert({
      tipo_documento: evento.tipo_documento,
      documento_id: String(evento.documento_id),
      tipo_evento: evento.tipo_evento,
      campo: "campo" in evento ? evento.campo : null,
      valor_anterior: "valor_anterior" in evento ? evento.valor_anterior : null,
      valor_nuevo: "valor_nuevo" in evento ? evento.valor_nuevo : null,
      descripcion: "descripcion" in evento ? evento.descripcion : null,
      usuario: usuarioResuelto,
    })
    if (error) {
      // No lanzar — el flujo principal del documento ya pasó.
      console.warn("[seguimiento] insert falló:", error.message)
    }
  } catch (e: any) {
    console.warn("[seguimiento] error inesperado:", e?.message ?? e)
  }
}

// ─── Helper específico: registrar diff entre dos versiones de un doc ──────
// Compara dos objetos shallow y emite un evento `cambio_campo` por cada
// campo cuyo valor cambió. Útil para hooks de PUT / PATCH.

export async function registrarDiff(
  supabase: SupabaseClient,
  args: {
    tipo_documento: string
    documento_id: string | number
    usuario?: string | null
    antes: Record<string, unknown>
    despues: Record<string, unknown>
    campos: { key: string; label: string }[]
    formato?: (key: string, value: unknown) => string | null
  }
): Promise<void> {
  const { antes, despues, campos, formato } = args
  const fmt = formato ?? ((_, v) => (v == null ? null : String(v)))
  for (const { key, label } of campos) {
    const va = antes[key]
    const vb = despues[key]
    if (va === vb) continue
    // Para arrays / objetos comparar por JSON (shallow → JSON.stringify).
    if (
      typeof va === "object" && va !== null &&
      typeof vb === "object" && vb !== null &&
      JSON.stringify(va) === JSON.stringify(vb)
    ) continue
    await registrarEvento(supabase, {
      tipo_documento: args.tipo_documento,
      documento_id: args.documento_id,
      usuario: args.usuario,
      tipo_evento: "cambio_campo",
      campo: label,
      valor_anterior: fmt(key, va),
      valor_nuevo: fmt(key, vb),
    })
  }
}
