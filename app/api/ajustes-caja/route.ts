import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, caja_nombre, sucursal, concepto_nombre, tipo_ajuste, importe, fecha, es_automatico, estado"
const SELECT_FULL = "id, numero, caja_id, caja_nombre, sucursal, concepto_id, concepto_nombre, tipo_ajuste, importe, fecha, cuenta_analitica, es_automatico, observaciones, estado"

interface ValorLinea { valor_id: string; valor_nombre: string; tipo_movimiento: "entrada" | "salida"; importe: number }

// GET /api/ajustes-caja
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ajustes_caja")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/ajustes-caja — crea ajuste + sus líneas.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.caja_id || !body.concepto_id) return apiError("caja_id y concepto_id son requeridos", 400)
  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  if (valores.length === 0) return apiError("Agregar al menos una línea de valor", 400)

  const supabase = await createClient()
  const [{ data: caja }, { data: concepto }] = await Promise.all([
    supabase.from("cajas").select("nombre, sucursal").eq("id", body.caja_id).maybeSingle(),
    supabase.from("conceptos_registro_caja").select("nombre, requiere_observacion").eq("id", body.concepto_id).maybeSingle(),
  ])
  if (!caja || !concepto) return apiError("Caja o concepto inválido", 400)
  if (concepto.requiere_observacion && !(body.observaciones ?? "").trim()) {
    return apiError("El concepto requiere observación", 400)
  }

  const sucursal = body.sucursal ?? caja.sucursal ?? ""
  const importeTotal = valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)

  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_ajuste_caja", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("ajustes_caja")
    .insert({
      numero: numero || `AJ-${Date.now()}`,
      caja_id: body.caja_id,
      caja_nombre: caja.nombre,
      sucursal,
      concepto_id: body.concepto_id,
      concepto_nombre: concepto.nombre,
      tipo_ajuste: body.tipo_ajuste || null,
      importe: importeTotal,
      fecha: body.fecha,
      cuenta_analitica: body.cuenta_analitica || null,
      es_automatico: !!body.es_automatico,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()
  if (error) return dbError(error)

  const filas = valores.map(v => ({
    ajuste_id: (data as { id: string }).id,
    valor_id: v.valor_id,
    valor_nombre: v.valor_nombre,
    tipo_movimiento: v.tipo_movimiento,
    importe: v.importe,
  }))
  const { error: vErr } = await supabase.from("ajuste_caja_valores").insert(filas)
  if (vErr) return dbError(vErr)

  return NextResponse.json(data, { status: 201 })
}
