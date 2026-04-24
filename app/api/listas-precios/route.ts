import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("listas_precios")
    .select("*")
    .order("nombre")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const baseCols = ["nombre", "moneda", "activa", "moneda_base"]
  const extendedCols = ["incluye_iva", "no_visible", "dias_validez", "estado",
    "usuarios_admin", "usuarios_habilitados", "observaciones_filtro"]

  const buildInsert = (cols: string[]) => {
    const ins: Record<string, unknown> = {}
    for (const col of cols) {
      if (col in body) ins[col] = body[col]
    }
    if (!ins.moneda && ins.moneda_base) ins.moneda = ins.moneda_base
    return ins
  }

  // Intentar con todos los campos; si falla por schema cache, reintentar solo con base
  let insert = buildInsert([...baseCols, ...extendedCols])
  let result = await supabase.from("listas_precios").insert(insert).select().single()

  if (result.error?.message?.includes("schema cache") || result.error?.message?.includes("Could not find")) {
    insert = buildInsert(baseCols)
    result = await supabase.from("listas_precios").insert(insert).select().single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function PATCH(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  // Columnas base (siempre existen) + columnas extendidas (requieren migración 070)
  const baseCols = ["nombre", "tipo", "moneda", "moneda_base", "activa"]
  const extendedCols = ["incluye_iva", "no_visible", "dias_validez", "estado",
    "usuarios_admin", "usuarios_habilitados", "observaciones_filtro"]

  const buildUpdate = (cols: string[]) => {
    const u: Record<string, unknown> = {}
    for (const key of cols) {
      if (key in fields) u[key] = fields[key]
    }
    return u
  }

  // Intentar con todos los campos; si falla por schema cache, reintentar solo con base
  let update = buildUpdate([...baseCols, ...extendedCols])
  let result = await supabase.from("listas_precios").update(update).eq("id", id).select().single()

  if (result.error?.message?.includes("schema cache") || result.error?.message?.includes("Could not find")) {
    update = buildUpdate(baseCols)
    result = await supabase.from("listas_precios").update(update).eq("id", id).select().single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}
