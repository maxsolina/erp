import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, sucursal, caja_desde_id, caja_desde_nombre, caja_hasta_id, caja_hasta_nombre, fecha, estado, importe"
const SELECT_FULL = "id, numero, sucursal, caja_desde_id, caja_desde_nombre, caja_hasta_id, caja_hasta_nombre, importe, concepto, fecha, observaciones, estado, comprobante_salida_id, comprobante_entrada_id"

interface ValorLinea {
  valor_id?: string | null
  valor_nombre?: string | null
  importe?: number
  moneda?: string | null
}

// GET /api/transferencias-caja
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transferencias_caja")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/transferencias-caja
// Body: { caja_desde_id, caja_hasta_id, sucursal, valores: [{valor_id, importe}], fecha, observaciones }
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.caja_desde_id || !body.caja_hasta_id) return apiError("Seleccionar caja origen y destino", 400)
  if (body.caja_desde_id === body.caja_hasta_id) return apiError("Origen y destino deben ser distintos", 400)
  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  if (valores.length === 0) return apiError("Agregar al menos un valor", 400)
  for (const v of valores) {
    if (!v.valor_id) return apiError("Todos los valores deben tener un valor seleccionado", 400)
    if (!v.importe || Number(v.importe) <= 0) return apiError("Todos los importes deben ser mayores a 0", 400)
  }

  const supabase = await createClient()
  const [{ data: cd }, { data: ch }] = await Promise.all([
    supabase.from("cajas").select("nombre").eq("id", body.caja_desde_id).maybeSingle(),
    supabase.from("cajas").select("nombre").eq("id", body.caja_hasta_id).maybeSingle(),
  ])
  if (!cd || !ch) return apiError("Caja inválida", 400)

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_transferencia_caja", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  // Suma total para mantener el campo legacy `importe` en la cabecera.
  const importeTotal = valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)

  const { data, error } = await supabase
    .from("transferencias_caja")
    .insert({
      numero: numero || `TRC-${Date.now()}`,
      sucursal,
      caja_desde_id: body.caja_desde_id,
      caja_desde_nombre: cd.nombre,
      caja_hasta_id: body.caja_hasta_id,
      caja_hasta_nombre: ch.nombre,
      importe: importeTotal,
      concepto: body.concepto ?? "Transferencia",
      fecha: body.fecha,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()
  if (error) return dbError(error)

  const trId = (data as { id: string }).id
  const valorIds = valores.map(v => v.valor_id!).filter(Boolean)
  const { data: cvs } = await supabase
    .from("caja_valores")
    .select("id, nombre, moneda")
    .in("id", valorIds)
  const cvMap = new Map((cvs ?? []).map((c: any) => [c.id, c]))

  const filas = valores.map(v => {
    const cv = cvMap.get(v.valor_id as string) as any
    return {
      transferencia_id: trId,
      valor_id: v.valor_id,
      valor_nombre: cv?.nombre ?? v.valor_nombre ?? null,
      importe: Number(v.importe),
      moneda: cv?.moneda ?? v.moneda ?? null,
    }
  })
  const { error: eVal } = await supabase.from("transferencia_caja_valores").insert(filas)
  if (eVal) {
    await supabase.from("transferencias_caja").delete().eq("id", trId)
    return dbError(eVal)
  }

  return NextResponse.json(data, { status: 201 })
}
