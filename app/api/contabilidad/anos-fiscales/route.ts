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

  let query = supabase
    .from("contabilidad_anos_fiscales")
    .select(`*, contabilidad_periodos(*)`)
    .order("fecha_inicio", { ascending: false })

  if (id) query = query.eq("id", id)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(id ? (data?.[0] ?? null) : (data ?? []))
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()
  const { nombre, codigo, fecha_inicio, fecha_fin, estado = "aprobado" } = body

  const { data, error } = await supabase
    .from("contabilidad_anos_fiscales")
    .insert({ nombre, codigo, fecha_inicio, fecha_fin, estado })
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
  const { action, ...fields } = body

  // Acción especial: generar períodos mensuales automáticamente
  if (action === "generar_periodos") {
    const { data: ano } = await supabase
      .from("contabilidad_anos_fiscales")
      .select("fecha_inicio, fecha_fin")
      .eq("id", id)
      .single()

    if (!ano) return NextResponse.json({ error: "Año fiscal no encontrado" }, { status: 404 })

    const periodos = []
    const cursor = new Date(ano.fecha_inicio)
    const fin = new Date(ano.fecha_fin)

    while (cursor <= fin) {
      const year = cursor.getFullYear()
      const month = cursor.getMonth()
      const inicioMes = new Date(year, month, 1)
      const finMes = new Date(year, month + 1, 0)
      const finEfectivo = finMes > fin ? fin : finMes

      const mm = String(month + 1).padStart(2, "0")
      periodos.push({
        ano_fiscal_id: id,
        nombre: `${mm}/${year}`,
        fecha_inicio: inicioMes.toISOString().split("T")[0],
        fecha_fin: finEfectivo.toISOString().split("T")[0],
        estado: "aprobado",
      })

      cursor.setMonth(month + 1)
    }

    const { error: errP } = await supabase
      .from("contabilidad_periodos")
      .upsert(periodos, { onConflict: "ano_fiscal_id,nombre" })

    if (errP) return NextResponse.json({ error: errP.message }, { status: 500 })
    return NextResponse.json({ generados: periodos.length })
  }

  const { data, error } = await supabase
    .from("contabilidad_anos_fiscales")
    .update({ ...fields, updated_at: new Date().toISOString() })
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

  const { error } = await supabase
    .from("contabilidad_anos_fiscales")
    .delete()
    .eq("id", id)

  if (error) return dbError(error)
  return NextResponse.json({ ok: true })
}
