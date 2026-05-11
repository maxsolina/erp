import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/movimientos-banco/[id]/conciliar
// body: { conciliado: boolean }
//
// Marca o desmarca el movimiento como conciliado, seteando fecha_conciliacion.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const conciliado = !!body.conciliado

  const supabase = await createClient()
  const { error } = await supabase
    .from("movimientos_banco")
    .update({
      conciliado,
      fecha_conciliacion: conciliado ? new Date().toISOString() : null,
    })
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
