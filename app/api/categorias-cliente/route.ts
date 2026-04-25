import { dbError } from "@/lib/api-utils"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — categorías de clientes
export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("categorias_cliente")
    .select("id, nombre, descripcion, lista_precios_defecto_id, cuenta_cobrar_id, activa")
    .order("nombre")
  if (error) return dbError(error)

  const cats = data ?? []

  // Enriquecer con codigo+nombre de la cuenta contable
  const uuids = [...new Set(cats.map((c: any) => c.cuenta_cobrar_id).filter(Boolean))]
  let cuentasMap: Record<string, { codigo: string; nombre: string }> = {}
  if (uuids.length > 0) {
    const { data: cuentas } = await supabase
      .from("contabilidad_plan_cuentas")
      .select("id, codigo, nombre")
      .in("id", uuids)
    for (const c of cuentas ?? []) {
      cuentasMap[c.id] = { codigo: c.codigo, nombre: c.nombre }
    }
  }

  const result = cats.map((r: any) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    lista_precios_defecto_id: r.lista_precios_defecto_id,
    cuenta_cobrar_id: r.cuenta_cobrar_id,
    activa: r.activa,
    cuenta_cobrar_codigo: r.cuenta_cobrar_id ? (cuentasMap[r.cuenta_cobrar_id]?.codigo ?? null) : null,
    cuenta_cobrar_nombre: r.cuenta_cobrar_id ? (cuentasMap[r.cuenta_cobrar_id]?.nombre ?? null) : null,
  }))

  return NextResponse.json(result)
}

// POST — crear nueva categoría de cliente
export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const { data, error } = await supabase
    .from("categorias_cliente")
    .insert({
      nombre: body.nombre,
      descripcion: body.descripcion ?? null,
      lista_precios_defecto_id: body.lista_precios_defecto_id ?? null,
      cuenta_cobrar_id: body.cuenta_cobrar_id ?? null,
      activa: true,
    })
    .select("id")
    .single()

  if (error) return dbError(error)
  return NextResponse.json({ ok: true, id: data.id })
}
