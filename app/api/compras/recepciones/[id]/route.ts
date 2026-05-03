import { dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data, error } = await supabase.from("recepciones").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Enriquecer items/lineas con flags del producto (tiene_numero_serie, requiere_color,
  // requiere_bateria, etc.) — algunas OCs viejas se guardaron sin esos flags y entonces
  // el wizard de registro de unidades no muestra los campos correspondientes.
  const items: any[] = Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.lineas) ? data.lineas
    : []
  if (items.length > 0) {
    const productoIds = [...new Set(items.map(it => it.producto_id).filter(Boolean))]
    if (productoIds.length > 0) {
      const { data: productos } = await supabase
        .from("productos")
        .select("id, tiene_numero_serie, requiere_color, requiere_bateria, requiere_outlet, requiere_observaciones")
        .in("id", productoIds)
      const flagsMap = new Map<number, any>()
      for (const p of productos ?? []) flagsMap.set(p.id, p)
      const itemsEnriquecidos = items.map(it => {
        const p = flagsMap.get(it.producto_id)
        if (!p) return it
        // Producto = fuente de verdad. OR-eamos para sobreescribir cualquier false
        // explícito que haya quedado de la recepción vieja.
        return {
          ...it,
          tiene_serie:            !!it.tiene_serie            || !!p.tiene_numero_serie,
          requiere_color:         !!it.requiere_color         || !!p.requiere_color,
          requiere_bateria:       !!it.requiere_bateria       || !!p.requiere_bateria,
          requiere_outlet:        !!it.requiere_outlet        || !!p.requiere_outlet,
          requiere_observaciones: !!it.requiere_observaciones || !!p.requiere_observaciones,
        }
      })
      // Mantener ambos campos populados (items + lineas) para compat con el monolito
      ;(data as any).items = itemsEnriquecidos
      ;(data as any).lineas = itemsEnriquecidos
    }
  }
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { data, error } = await supabase.from("recepciones").update(body).eq("id", id).select().single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { error } = await supabase.from("recepciones").delete().eq("id", id)
  if (error) return dbError(error)
  return NextResponse.json({ success: true })
}
