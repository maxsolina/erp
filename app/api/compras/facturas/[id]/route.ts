import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  // Separar lineas del payload principal
  const { lineas, ...cabecera } = body

  const { data, error } = await supabase.from("facturas_compra").update(cabecera).eq("id", id).select().single()
  if (error) return dbError(error)

  // Actualizar líneas: borrar y reinsertar
  if (lineas) {
    await supabase.from("compras_facturas_lineas").delete().eq("factura_id", id)
    if (lineas.length > 0) {
      const lineasPayload = lineas.map((l: Record<string, unknown>, i: number) => ({
        factura_id: Number(id),
        orden: i,
        descripcion: l.descripcion ?? "",
        cuenta_contable_id: l.cuenta_contable_id ?? null,
        cuenta_codigo: l.cuenta_codigo ?? "",
        cuenta_nombre: l.cuenta_nombre ?? "",
        cantidad: l.cantidad ?? 1,
        precio_unitario: l.precio_unitario ?? 0,
        descuento_pct: l.descuento_pct ?? 0,
        subtotal: l.subtotal ?? 0,
      }))
      await supabase.from("compras_facturas_lineas").insert(lineasPayload)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { error } = await supabase.from("facturas_compra").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ success: true })
}
