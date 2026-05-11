import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/extractos-caja/[id]/cerrar
// body: { saldos: [{ id, saldo_cierre }] }
//
// Recibe los saldos físicos ingresados por el operador, los persiste en
// extracto_saldos y marca el extracto como cerrado.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const saldos: { id: string; saldo_cierre: number }[] = Array.isArray(body.saldos) ? body.saldos : []

  const supabase = await createClient()
  const { data: extracto } = await supabase.from("extractos_caja").select("estado").eq("id", id).maybeSingle()
  if (!extracto) return apiError("Extracto no encontrado", 404)
  if (extracto.estado !== "abierto") return apiError("El extracto ya está cerrado", 409)

  for (const s of saldos) {
    if (!s.id) continue
    const { error } = await supabase
      .from("extracto_saldos")
      .update({ saldo_cierre_ingresado: Number(s.saldo_cierre ?? 0) })
      .eq("id", s.id)
      .eq("extracto_id", id)
    if (error) return dbError(error)
  }

  const { error: eUpd } = await supabase
    .from("extractos_caja")
    .update({ estado: "cerrado", fecha_cierre: new Date().toISOString() })
    .eq("id", id)
  if (eUpd) return dbError(eUpd)

  return NextResponse.json({ ok: true })
}
