import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const tipo = searchParams.get("tipo")
  const activo = searchParams.get("activo")

  const moneda = searchParams.get("moneda")
  const sucursal_id = searchParams.get("sucursal_id")
  const es_automatico = searchParams.get("es_automatico")
  const cuenta_bancaria_id = searchParams.get("cuenta_bancaria_id")

  let query = supabase
    .from("contabilidad_diarios")
    .select(`
      *,
      sucursal:sucursales(id, nombre),
      cuenta_debito:cuenta_debito_predeterminada_id(id, codigo, nombre),
      cuenta_haber:cuenta_haber_predeterminada_id(id, codigo, nombre)
    `)
    .order("tipo")
    .order("nombre")

  if (id) query = query.eq("id", id)
  if (tipo) query = query.eq("tipo", tipo)
  if (moneda) query = query.eq("moneda", moneda)
  if (sucursal_id) query = query.eq("sucursal_id", sucursal_id)
  if (cuenta_bancaria_id) query = query.eq("cuenta_bancaria_id", cuenta_bancaria_id)
  if (es_automatico === "true") query = query.eq("es_automatico", true)
  if (es_automatico === "false") query = query.eq("es_automatico", false)
  if (activo === "true") query = query.eq("activo", true)
  if (activo === "false") query = query.eq("activo", false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(id ? (data?.[0] ?? null) : (data ?? []))
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const {
    nombre, codigo, tipo, moneda, sucursal_id, caja_id, cuenta_bancaria_id,
    cuenta_debito_predeterminada_id, cuenta_haber_predeterminada_id,
    cuenta_puente_conciliacion_id, filtrar_por_sucursal,
    filtrar_por_subcompania, permitir_cancelacion_asientos,
    agrupar_lineas_factura, numero_cuenta_requerido, activo, es_automatico,
  } = body

  const { data, error } = await supabase
    .from("contabilidad_diarios")
    .insert({
      nombre, codigo, tipo,
      moneda: moneda ?? "ARS",
      sucursal_id: sucursal_id ?? null,
      caja_id: caja_id ?? null,
      cuenta_bancaria_id: cuenta_bancaria_id ?? null,
      cuenta_debito_predeterminada_id: cuenta_debito_predeterminada_id ?? null,
      cuenta_haber_predeterminada_id: cuenta_haber_predeterminada_id ?? null,
      cuenta_puente_conciliacion_id: cuenta_puente_conciliacion_id ?? null,
      filtrar_por_sucursal: filtrar_por_sucursal ?? false,
      filtrar_por_subcompania: filtrar_por_subcompania ?? false,
      permitir_cancelacion_asientos: permitir_cancelacion_asientos ?? true,
      agrupar_lineas_factura: agrupar_lineas_factura ?? false,
      numero_cuenta_requerido: numero_cuenta_requerido ?? false,
      es_automatico: es_automatico ?? false,
      activo: activo ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const body = await req.json()
  const { data, error } = await supabase
    .from("contabilidad_diarios")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const { count } = await supabase
    .from("contabilidad_asientos")
    .select("id", { count: "exact", head: true })
    .eq("diario_id", id)

  if (count && count > 0)
    return NextResponse.json(
      { error: "No se puede eliminar un diario con asientos registrados." },
      { status: 409 }
    )

  const { error } = await supabase.from("contabilidad_diarios").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
