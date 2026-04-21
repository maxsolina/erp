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
  const soloActivos = searchParams.get("activo") !== "false"

  let query = supabase
    .from("contabilidad_monedas")
    .select(`
      *,
      contabilidad_cotizaciones (
        id, fecha, tipo, tasa, created_at
      )
    `)
    .order("es_base", { ascending: false })
    .order("codigo")

  if (soloActivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ordenar cotizaciones de cada moneda por fecha desc
  const result = (data ?? []).map((m: any) => ({
    ...m,
    cotizaciones: (m.contabilidad_cotizaciones ?? []).sort(
      (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    ),
    cotizacion_actual: (m.contabilidad_cotizaciones ?? []).sort(
      (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )[0]?.tasa ?? (m.es_base ? 1 : null),
    fecha_tasa: (m.contabilidad_cotizaciones ?? []).sort(
      (a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )[0]?.fecha ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const { data, error } = await supabase
    .from("contabilidad_monedas")
    .insert({
      codigo: body.codigo,
      nombre: body.nombre,
      simbolo: body.simbolo,
      moneda_afip: body.moneda_afip ?? null,
      es_base: body.es_base ?? false,
      posicion_simbolo: body.posicion_simbolo ?? "antes",
      factor_redondeo: body.factor_redondeo ?? 0.01,
      precision_calculo: body.precision_calculo ?? 0.000001,
      tipo_cotizacion_defecto: body.tipo_cotizacion_defecto ?? "oficial",
      cotizacion_automatica: body.cotizacion_automatica ?? false,
      activo: body.activo ?? true,
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
    .from("contabilidad_monedas")
    .update({
      codigo: body.codigo,
      nombre: body.nombre,
      simbolo: body.simbolo,
      moneda_afip: body.moneda_afip ?? null,
      es_base: body.es_base,
      posicion_simbolo: body.posicion_simbolo,
      factor_redondeo: body.factor_redondeo,
      precision_calculo: body.precision_calculo,
      tipo_cotizacion_defecto: body.tipo_cotizacion_defecto,
      cotizacion_automatica: body.cotizacion_automatica,
      activo: body.activo,
    })
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

  // Verificar que no sea moneda base
  const { data: moneda } = await supabase
    .from("contabilidad_monedas")
    .select("es_base, codigo")
    .eq("id", id)
    .single()

  if (!moneda) return NextResponse.json({ error: "Moneda no encontrada" }, { status: 404 })
  if (moneda.es_base) return NextResponse.json({ error: "No se puede eliminar la moneda base del sistema." }, { status: 422 })

  // Verificar movimientos: asientos con cotizaciones de esta moneda
  const { count: countAsientos } = await supabase
    .from("contabilidad_asientos")
    .select("id", { count: "exact", head: true })
    .eq("moneda_codigo", moneda.codigo)

  if ((countAsientos ?? 0) > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: la moneda tiene ${countAsientos} asiento(s) contable(s) asociado(s).` },
      { status: 422 }
    )
  }

  // Verificar en recibos
  const { count: countRecibos } = await supabase
    .from("recibos")
    .select("id", { count: "exact", head: true })
    .eq("moneda", moneda.codigo)

  if ((countRecibos ?? 0) > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: la moneda tiene ${countRecibos} recibo(s) asociado(s).` },
      { status: 422 }
    )
  }

  // Sin movimientos: eliminar físicamente la moneda (y sus cotizaciones en cascada)
  const { error: errCot } = await supabase
    .from("contabilidad_cotizaciones")
    .delete()
    .eq("moneda_id", id)

  if (errCot) return NextResponse.json({ error: errCot.message }, { status: 500 })

  const { error } = await supabase
    .from("contabilidad_monedas")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
