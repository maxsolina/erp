import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("taller_ordenes_trabajo")
    .select(`
      *,
      taller_areas_reparacion(id, nombre, codigo),
      taller_tipos_ot(id, nombre, codigo, tipo_tecnico, es_garantia_compra, es_garantia_reparacion),
      taller_equipos(id, nombre, marca, modelo, dias_garantia_compra, dias_garantia_reparacion),
      taller_fallas!taller_ordenes_trabajo_falla_principal_id_fkey(id, nombre),
      taller_categorias_reparacion(id, nombre),
      taller_tecnicos(id, nombre, tipo),
      taller_motivos_cierre(id, nombre)
    `)
    .eq("id", id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fallas secundarias
  const { data: fallaSec } = await supabase
    .from("taller_ot_fallas_secundarias")
    .select("falla_id, taller_fallas(nombre)")
    .eq("ot_id", id)

  // Repuestos
  const { data: repuestos } = await supabase
    .from("taller_ot_repuestos")
    .select("*")
    .eq("ot_id", id)
    .order("id")

  // Controles
  const { data: controles } = await supabase
    .from("taller_ot_controles")
    .select("*, taller_ot_control_items(*)")
    .eq("ot_id", id)
    .order("created_at")

  // Historial
  const { data: historial } = await supabase
    .from("taller_ot_historial")
    .select("*")
    .eq("ot_id", id)
    .order("fecha", { ascending: true })

  // Comprobantes vinculados
  const { data: notasVenta } = await supabase
    .from("notas_venta")
    .select("id, numero, estado, total")
    .eq("ot_id", id)

  const { data: facturas } = await supabase
    .from("facturas")
    .select("id, numero, estado, total")
    .eq("ot_id", id)

  const { data: recibos } = await supabase
    .from("recibos")
    .select("id, numero, estado, importe_total")
    .eq("ot_id", id)

  const { data: remitos } = await supabase
    .from("remitos")
    .select("id, numero, estado")
    .eq("ot_id", id)

  const { data: ordenesCompra } = await supabase
    .from("ordenes_compra")
    .select("id, numero, estado, total")
    .eq("ot_id", id)

  const result = {
    ...data,
    fallas_secundarias: (fallaSec ?? []).map(f => ({
      falla_id: f.falla_id,
      nombre: (f.taller_fallas as { nombre: string } | null)?.nombre ?? "",
    })),
    repuestos: repuestos ?? [],
    controles: controles ?? [],
    historial: historial ?? [],
    comprobantes: {
      notas_venta: notasVenta ?? [],
      facturas: facturas ?? [],
      recibos: recibos ?? [],
      remitos: remitos ?? [],
      ordenes_compra: ordenesCompra ?? [],
    },
  }

  return NextResponse.json(result)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { fallas_secundarias, ...fields } = body

  const { data, error } = await supabase
    .from("taller_ordenes_trabajo")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (fallas_secundarias !== undefined) {
    await supabase.from("taller_ot_fallas_secundarias").delete().eq("ot_id", id)
    if (fallas_secundarias?.length) {
      const rows = fallas_secundarias.map((fid: string) => ({
        ot_id: id,
        falla_id: fid,
      }))
      await supabase.from("taller_ot_fallas_secundarias").insert(rows)
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("taller_ordenes_trabajo").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
