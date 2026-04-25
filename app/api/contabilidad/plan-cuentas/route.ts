import { dbError } from "@/lib/api-utils"
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
  const search = searchParams.get("q")
  const activo = searchParams.get("activo")
  const tipo_cuenta_id = searchParams.get("tipo_cuenta_id")

  let query = supabase
    .from("contabilidad_plan_cuentas")
    .select(`
      *,
      tipo_cuenta:contabilidad_tipos_cuenta(id, nombre, codigo, es_resultado),
      padre:cuenta_padre_id(id, codigo, nombre)
    `)
    .order("codigo", { ascending: true })

  if (id) query = query.eq("id", id)
  if (activo === "true") query = query.eq("activo", true)
  if (activo === "false") query = query.eq("activo", false)
  if (tipo_cuenta_id) query = query.eq("tipo_cuenta_id", tipo_cuenta_id)
  if (search) query = query.or(`codigo.ilike.%${search}%,nombre.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(id ? (data?.[0] ?? null) : (data ?? []))
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const {
    codigo, nombre, cuenta_padre_id, tipo_interno, tipo_cuenta_id,
    permite_movimientos_analiticos, impuestos_predeterminados,
    permite_conciliacion, es_cuenta_puente, moneda_secundaria, activo,
    disponible_registro_banco, disponible_registro_caja,
    disponible_ajuste_cheque_rechazado, disponible_rendicion_gastos,
    disponible_rendicion_fondos_fijos, es_cuenta_ventas, es_cuenta_compras,
    es_cuenta_resultado_tenencia_positivo, es_cuenta_resultado_tenencia_negativo,
    es_cuenta_impuestos, es_cuenta_existencias, es_cuenta_mercaderia_transito,
    es_cuenta_mercaderia_produccion, es_cuenta_cmv,
  } = body

  const { data, error } = await supabase
    .from("contabilidad_plan_cuentas")
    .insert({
      codigo, nombre,
      cuenta_padre_id: cuenta_padre_id ?? null,
      tipo_interno: tipo_interno ?? "regular",
      tipo_cuenta_id: tipo_cuenta_id ?? null,
      permite_movimientos_analiticos: permite_movimientos_analiticos ?? false,
      impuestos_predeterminados: impuestos_predeterminados ?? [],
      permite_conciliacion: permite_conciliacion ?? false,
      es_cuenta_puente: es_cuenta_puente ?? false,
      moneda_secundaria: moneda_secundaria ?? null,
      activo: activo ?? true,
      disponible_registro_banco: disponible_registro_banco ?? false,
      disponible_registro_caja: disponible_registro_caja ?? false,
      disponible_ajuste_cheque_rechazado: disponible_ajuste_cheque_rechazado ?? false,
      disponible_rendicion_gastos: disponible_rendicion_gastos ?? false,
      disponible_rendicion_fondos_fijos: disponible_rendicion_fondos_fijos ?? false,
      es_cuenta_ventas: es_cuenta_ventas ?? false,
      es_cuenta_compras: es_cuenta_compras ?? false,
      es_cuenta_resultado_tenencia_positivo: es_cuenta_resultado_tenencia_positivo ?? false,
      es_cuenta_resultado_tenencia_negativo: es_cuenta_resultado_tenencia_negativo ?? false,
      es_cuenta_impuestos: es_cuenta_impuestos ?? false,
      es_cuenta_existencias: es_cuenta_existencias ?? false,
      es_cuenta_mercaderia_transito: es_cuenta_mercaderia_transito ?? false,
      es_cuenta_mercaderia_produccion: es_cuenta_mercaderia_produccion ?? false,
      es_cuenta_cmv: es_cuenta_cmv ?? false,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const body = await req.json()
  const { data, error } = await supabase
    .from("contabilidad_plan_cuentas")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  // Verificar que no tenga movimientos
  const { count } = await supabase
    .from("contabilidad_asientos_lineas")
    .select("id", { count: "exact", head: true })
    .eq("cuenta_id", id)

  if (count && count > 0)
    return NextResponse.json(
      { error: "No se puede eliminar una cuenta con movimientos registrados." },
      { status: 409 }
    )

  const { error } = await supabase
    .from("contabilidad_plan_cuentas")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
