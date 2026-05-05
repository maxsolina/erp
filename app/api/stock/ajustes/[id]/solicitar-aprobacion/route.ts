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

// POST — borrador → pendiente. Lo bloquea para edición y queda esperando
// aprobación. Quien lo solicitó queda en `solicitado_por`.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const { data: aj } = await supabase.from("ajustes_stock").select("estado").eq("id", Number(id)).maybeSingle()
  if (!aj) return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 })
  if (aj.estado !== "borrador") {
    return NextResponse.json({ error: `No se puede enviar a aprobar — estado actual: ${aj.estado}` }, { status: 422 })
  }

  const { error } = await supabase
    .from("ajustes_stock")
    .update({
      estado: "pendiente",
      solicitado_por: body.solicitado_por ?? null,
      solicitado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(id))
  if (error) return dbError(error)

  await registrarEvento(supabase, {
    tipo_documento: "ajuste_stock",
    documento_id: Number(id),
    tipo_evento: "cambio_estado",
    valor_anterior: "borrador",
    valor_nuevo: "pendiente",
    usuario: body.solicitado_por ?? null,
  })

  return NextResponse.json({ ok: true })
}
