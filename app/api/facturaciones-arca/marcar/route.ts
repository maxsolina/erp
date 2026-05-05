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

// POST /api/facturaciones-arca/marcar
//
// Body:
//   { ids: number[]; usuario?: string }
//
// Marca las facturas como ya facturadas externamente en ARCA. Se usa después
// de que el operador subió el Excel al facturador masivo y volvió al ERP a
// confirmar. La operación es idempotente: marcar una factura ya marcada no
// hace nada. Las facturadas desaparecen del listado de pendientes.
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json().catch(() => ({}))
  const ids: number[] = Array.isArray(body.ids) ? body.ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0) : []
  if (ids.length === 0) {
    return NextResponse.json({ error: "Debe pasar al menos un id de factura" }, { status: 422 })
  }

  const ahora = new Date().toISOString()
  const usuario = body.usuario ?? null

  const { data, error } = await supabase
    .from("facturas")
    .update({
      arca_facturada: true,
      arca_facturada_at: ahora,
      arca_facturada_por: usuario,
      updated_at: ahora,
    })
    .in("id", ids)
    .select("id, numero")
  if (error) return dbError(error)

  // Evento de seguimiento por cada factura marcada
  for (const f of data ?? []) {
    await registrarEvento(supabase, {
      tipo_documento: "factura",
      documento_id: f.id,
      tipo_evento: "nota",
      descripcion: `Marcada como facturada externamente en ARCA (${f.numero ?? `#${f.id}`})`,
      usuario,
    })
  }

  return NextResponse.json({ ok: true, marcadas: data?.length ?? 0 })
}
