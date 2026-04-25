import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// PATCH /api/taller/ordenes/[id]/controles/[controlId]
// Body: { completado?, observaciones_generales?, historico?, items?: [{ id, check_inicial?, obs_inicial?, check_final?, obs_final? }] }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; controlId: string }> }) {
  const { controlId } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { items, ...fields } = body

  if (Object.keys(fields).length) {
    const { error } = await supabase
      .from("taller_ot_controles")
      .update(fields)
      .eq("id", controlId)

    if (error) return dbError(error)
  }

  // Actualizar items
  if (items?.length) {
    for (const item of items) {
      const { id: itemId, ...itemFields } = item
      if (itemId && Object.keys(itemFields).length) {
        await supabase
          .from("taller_ot_control_items")
          .update(itemFields)
          .eq("id", itemId)
      }
    }
  }

  const { data } = await supabase
    .from("taller_ot_controles")
    .select("*, taller_ot_control_items(*)")
    .eq("id", controlId)
    .single()

  return NextResponse.json(data)
}
