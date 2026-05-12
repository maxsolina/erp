import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// DELETE /api/prestamos/[id]/gastos/[gastoId]
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; gastoId: string }> }) {
  const { id, gastoId } = await ctx.params
  const supabase = await createClient()
  const { error } = await supabase.from("prestamo_gastos").delete().eq("id", gastoId).eq("prestamo_id", id)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
