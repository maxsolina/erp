// Helper para registrar eventos en `documentos_seguimiento` desde los
// endpoints del backend. Se llama después de cada operación exitosa
// (creación, update). Si el insert falla, NO se rompe el flujo principal
// — solo se logea por consola: el seguimiento es auxiliar, no crítico.

import type { SupabaseClient } from "@supabase/supabase-js"

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
    const { error } = await supabase.from("documentos_seguimiento").insert({
      tipo_documento: evento.tipo_documento,
      documento_id: String(evento.documento_id),
      tipo_evento: evento.tipo_evento,
      campo: "campo" in evento ? evento.campo : null,
      valor_anterior: "valor_anterior" in evento ? evento.valor_anterior : null,
      valor_nuevo: "valor_nuevo" in evento ? evento.valor_nuevo : null,
      descripcion: "descripcion" in evento ? evento.descripcion : null,
      usuario: evento.usuario ?? "sistema",
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
