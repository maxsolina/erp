import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST — cancela el ajuste si está en borrador o pendiente. Si está confirmado
// ya hubo movimientos de stock + asiento; eso requeriría una reversa más
// compleja que dejamos fuera de este iteración.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const { data: aj } = await supabase.from("ajustes_stock").select("estado").eq("id", Number(id)).maybeSingle()
  if (!aj) return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 })
  const estadoAnterior = aj.estado
  if (!["borrador", "pendiente"].includes(aj.estado)) {
    return NextResponse.json({
      error: `No se puede cancelar un ajuste en estado "${aj.estado}". (Si ya fue confirmado, generá un ajuste de signo opuesto para revertirlo.)`,
    }, { status: 422 })
  }

  const { error } = await supabase
    .from("ajustes_stock")
    .update({
      estado: "cancelado",
      cancelado_por: body.cancelado_por ?? null,
      cancelado_at: new Date().toISOString(),
      motivo_cancelacion: body.motivo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
  if (error) return dbError(error)

  await registrarEvento(supabase, {
    tipo_documento: "ajuste_stock",
    documento_id: Number(id),
    tipo_evento: "cambio_estado",
    valor_anterior: estadoAnterior,
    valor_nuevo: "cancelado",
    usuario: body.cancelado_por ?? null,
  })
  if (body.motivo) {
    await registrarEvento(supabase, {
      tipo_documento: "ajuste_stock",
      documento_id: Number(id),
      tipo_evento: "nota",
      descripcion: `Motivo de cancelación: ${body.motivo}`,
      usuario: body.cancelado_por ?? null,
    })
  }

  return NextResponse.json({ ok: true })
}
