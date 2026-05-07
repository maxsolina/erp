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

// DELETE /api/taller/ordenes/[id]/controles/[controlId]
// Solo permite eliminar controles que NO estén completados ni marcados como
// históricos (ej: un control vacío creado por error de configuración).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; controlId: string }> }) {
  const { controlId } = await params
  const supabase = await createClient()

  const { data: ctrl } = await supabase
    .from("taller_ot_controles")
    .select("completado, historico")
    .eq("id", controlId)
    .single()

  if (!ctrl) return NextResponse.json({ error: "Control no encontrado" }, { status: 404 })
  if (ctrl.completado || ctrl.historico) {
    return NextResponse.json(
      { error: "No se puede eliminar un control completado o histórico" },
      { status: 422 },
    )
  }

  // Borrar items primero (FK)
  await supabase.from("taller_ot_control_items").delete().eq("control_id", controlId)
  const { error } = await supabase.from("taller_ot_controles").delete().eq("id", controlId)
  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
