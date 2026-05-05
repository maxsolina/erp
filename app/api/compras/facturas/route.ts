import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("facturas_compra")
    .select("*")
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Separar lineas del payload principal (van a tabla compras_facturas_lineas)
  const { lineas, ...cabecera } = body

  const { data, error } = await supabase
    .from("facturas_compra")
    .insert([cabecera])
    .select()
    .single()

  if (error) return dbError(error)

  // Insertar líneas si vienen
  if (lineas?.length && data?.id) {
    const lineasPayload = lineas.map((l: Record<string, unknown>, i: number) => ({
      factura_id: data.id,
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
    const { error: lineasError } = await supabase.from("compras_facturas_lineas").insert(lineasPayload)
    if (lineasError) {
      await supabase.from("compras_facturas").delete().eq("id", data.id)
      return NextResponse.json({ error: "Error al insertar lineas" }, { status: 500 })
    }
  }

  await registrarEvento(supabase, {
    tipo_documento: "factura_compra",
    documento_id: data.id,
    tipo_evento: "creacion",
    usuario: body.usuario ?? null,
    descripcion: `Factura Compra ${data.numero ?? `#${data.id}`}${body.proveedor_nombre ? ` — ${body.proveedor_nombre}` : ""}`,
  })

  return NextResponse.json(data, { status: 201 })
}
