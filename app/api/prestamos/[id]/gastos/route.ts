import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/prestamos/[id]/gastos
// Body: { descripcion, importe, cuenta_contable }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  if (!body.importe || Number(body.importe) <= 0) return apiError("Importe inválido", 400)

  const { data, error } = await supabase
    .from("prestamo_gastos")
    .insert({
      prestamo_id: id,
      descripcion: body.descripcion ?? "",
      importe: Number(body.importe),
      cuenta_contable: body.cuenta_contable ?? "",
    })
    .select()
    .single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
