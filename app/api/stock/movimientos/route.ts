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
  const productoId = searchParams.get("producto_id")
  const tipo = searchParams.get("tipo")
  const origenTipo = searchParams.get("origen_tipo")
  const origenId = searchParams.get("origen_id")
  const limit = Number(searchParams.get("limit") ?? 50)

  let query = supabase
    .from("movimientos_stock")
    .select(`
      *,
      productos(nombre, codigo_interno),
      ubicaciones_origen:ubicacion_origen_id(codigo, nombre),
      ubicaciones_destino:ubicacion_destino_id(codigo, nombre),
      depositos_origen:deposito_origen_id(codigo, nombre),
      depositos_destino:deposito_destino_id(codigo, nombre)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (productoId) query = query.eq("producto_id", Number(productoId))
  if (tipo) query = query.eq("tipo", tipo)
  if (origenTipo) query = query.eq("origen_tipo", origenTipo)
  if (origenId) query = query.eq("origen_id", Number(origenId))

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  const movimientos = Array.isArray(body) ? body : [body]

  const { data, error } = await supabase
    .from("movimientos_stock")
    .insert(movimientos.map((m: any) => ({
      tipo: m.tipo,
      producto_id: m.producto_id || null,
      producto_nombre: m.producto_nombre,
      ubicacion_origen_id: m.ubicacion_origen_id || null,
      ubicacion_destino_id: m.ubicacion_destino_id || null,
      deposito_origen_id: m.deposito_origen_id || null,
      deposito_destino_id: m.deposito_destino_id || null,
      cantidad: m.cantidad ?? 1,
      stock_unidad_id: m.stock_unidad_id || null,
      nro_serie: m.nro_serie || null,
      origen_tipo: m.origen_tipo || null,
      origen_id: m.origen_id || null,
      origen_numero: m.origen_numero || null,
      usuario: m.usuario ?? "Admin",
      observaciones: m.observaciones || null,
    })))
    .select()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
