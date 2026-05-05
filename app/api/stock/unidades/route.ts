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
  const productoId = searchParams.get("producto_id")
  const depositoId = searchParams.get("deposito_id")
  const ubicacionId = searchParams.get("ubicacion_id")
  const estado = searchParams.get("estado")
  const nroSerie = searchParams.get("nro_serie")

  let query = supabase
    .from("stock_unidades")
    .select(`
      *,
      productos(id, nombre, codigo_interno, tiene_numero_serie, requiere_color, requiere_bateria),
      ubicaciones(id, codigo, nombre),
      depositos(id, codigo, nombre)
    `)
    .order("created_at", { ascending: false })
    .range(0, 49999)

  if (id) query = query.eq("id", Number(id))
  if (productoId) query = query.eq("producto_id", Number(productoId))
  if (depositoId) query = query.eq("deposito_id", Number(depositoId))
  if (ubicacionId) query = query.eq("ubicacion_id", Number(ubicacionId))
  if (estado) query = query.eq("estado", estado)
  if (nroSerie) query = query.ilike("nro_serie", `%${nroSerie}%`)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = getSupabase()
  const body = await req.json()

  // Soporta inserción individual o batch (array)
  const unidades = Array.isArray(body) ? body : [body]

  // ── Validación: IMEI/nro_serie no puede duplicarse con uno ya en stock ─────
  // Considera "en stock" a cualquier unidad con estado disponible o reservado
  // (no entregado ni cancelado). Ej: si la misma serie ya fue entregada y
  // vuelve por devolución, se podría re-ingresar; pero si aún está en stock,
  // se rechaza para evitar duplicados accidentales al recepcionar.
  const seriesNuevas = unidades
    .map((u: any) => (u.nro_serie ?? "").toString().trim())
    .filter(s => s.length > 0)

  // Detectar duplicados dentro del propio batch
  const seriesEnBatch = new Set<string>()
  for (const s of seriesNuevas) {
    if (seriesEnBatch.has(s)) {
      return NextResponse.json(
        { error: `IMEI/Serie duplicado en la recepción: "${s}". Cada unidad debe tener un número único.` },
        { status: 422 }
      )
    }
    seriesEnBatch.add(s)
  }

  // Detectar duplicados contra unidades existentes en stock
  if (seriesNuevas.length > 0) {
    const { data: existentes, error: dupErr } = await supabase
      .from("stock_unidades")
      .select("nro_serie, estado")
      .in("nro_serie", seriesNuevas)
      .in("estado", ["disponible", "reservado"])

    if (dupErr) return dbError(dupErr)
    if (existentes && existentes.length > 0) {
      const dups = existentes.map((u: any) => `${u.nro_serie} (${u.estado})`).join(", ")
      return NextResponse.json(
        { error: `Ya existe una unidad en stock con el mismo IMEI/Serie: ${dups}. No se puede recepcionar un duplicado.` },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from("stock_unidades")
    .insert(unidades.map((u: any) => ({
      producto_id: u.producto_id,
      ubicacion_id: u.ubicacion_id,
      deposito_id: u.deposito_id,
      nro_serie: u.nro_serie || null,
      color: u.color || null,
      bateria_pct: u.bateria_pct ?? null,
      es_outlet: u.es_outlet ?? false,
      observaciones: u.observaciones || null,
      estado: u.estado ?? "disponible",
      origen_tipo: u.origen_tipo || null,
      origen_id: u.origen_id || null,
      origen_numero: u.origen_numero || null,
    })))
    .select()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
