import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — ficha completa con líneas.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const { data: aj, error } = await supabase
    .from("ajustes_stock")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle()
  if (error) return dbError(error)
  if (!aj) return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 })

  const { data: lineas } = await supabase
    .from("ajustes_stock_lineas")
    .select("*")
    .eq("ajuste_id", aj.id)
    .order("orden")

  return NextResponse.json({ ...aj, lineas: lineas ?? [] })
}

// PUT — actualizar borrador (sólo si estado=borrador).
//   Reemplaza líneas si vienen en el body.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase()
  const { id } = await params
  const body = await req.json()

  const { data: aj } = await supabase.from("ajustes_stock").select("estado").eq("id", Number(id)).maybeSingle()
  if (!aj) return NextResponse.json({ error: "Ajuste no encontrado" }, { status: 404 })
  if (aj.estado !== "borrador") {
    return NextResponse.json({ error: `No se puede editar — estado actual: ${aj.estado}` }, { status: 422 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of [
    "deposito_id", "deposito_nombre", "ubicacion_id", "ubicacion_nombre",
    "sucursal_id", "concepto", "observaciones", "fecha",
  ]) {
    if (k in body) updates[k] = body[k]
  }
  const { error: upErr } = await supabase.from("ajustes_stock").update(updates).eq("id", Number(id))
  if (upErr) return dbError(upErr)

  if (Array.isArray(body.lineas)) {
    await supabase.from("ajustes_stock_lineas").delete().eq("ajuste_id", Number(id))
    if (body.lineas.length > 0) {
      const lineasInsert = body.lineas.map((l: any, idx: number) => ({
        ajuste_id: Number(id),
        producto_id: l.producto_id ?? null,
        producto_nombre: l.producto_nombre ?? null,
        producto_codigo: l.producto_codigo ?? null,
        cantidad: Number(l.cantidad ?? 1),
        stock_unidad_id: l.stock_unidad_id ?? null,
        nro_serie: l.nro_serie ?? null,
        color: l.color ?? null,
        bateria_pct: l.bateria_pct ?? null,
        es_outlet: !!l.es_outlet,
        observaciones: l.observaciones ?? null,
        costo_unitario: l.costo_unitario != null ? Number(l.costo_unitario) : null,
        orden: idx,
      }))
      const { error: linErr } = await supabase.from("ajustes_stock_lineas").insert(lineasInsert)
      if (linErr) {
        return NextResponse.json(
          { error: `Ajuste actualizado pero error al reinsertar líneas: ${linErr.message}` },
          { status: 207 }
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
