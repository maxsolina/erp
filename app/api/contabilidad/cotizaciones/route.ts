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
  const monedaId     = searchParams.get("moneda_id")
  const monedaCodigo = searchParams.get("moneda_codigo")
  const tipo         = searchParams.get("tipo")
  const latest       = searchParams.get("latest") === "true"

  let query = supabase
    .from("contabilidad_cotizaciones")
    .select("*, contabilidad_monedas!inner(codigo)")

  if (monedaId) {
    query = query.eq("moneda_id", monedaId)
  } else if (monedaCodigo) {
    query = query.eq("contabilidad_monedas.codigo", monedaCodigo)
  } else {
    return NextResponse.json({ error: "moneda_id o moneda_codigo requerido" }, { status: 400 })
  }

  if (tipo) query = query.eq("tipo", tipo)

  query = query.order("fecha", { ascending: false }).order("id", { ascending: false })

  if (latest) query = query.limit(1)

  const { data, error } = await query

  if (error) return dbError(error)
  return NextResponse.json(latest ? (data?.[0] ?? null) : (data ?? []))
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  if (!body.moneda_id || !body.fecha || !body.tipo || !body.tasa) {
    return NextResponse.json({ error: "moneda_id, fecha, tipo y tasa son requeridos" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("contabilidad_cotizaciones")
    .insert({
      moneda_id: body.moneda_id,
      fecha: body.fecha,
      tipo: body.tipo,
      tasa: body.tasa,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  const { error } = await supabase
    .from("contabilidad_cotizaciones")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
