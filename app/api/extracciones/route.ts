import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, cuenta_bancaria_nombre, sucursal, caja_ingreso_nombre, importe, tipo_operacion, fecha_operacion, estado"
const SELECT_FULL = "id, numero, cuenta_bancaria_id, cuenta_bancaria_nombre, sucursal, caja_ingreso_id, caja_ingreso_nombre, importe, tipo_operacion, numero_operacion, fecha_operacion, observaciones, estado"

interface ValorLinea { valor_id: string; valor_nombre: string; importe: number }

// GET /api/extracciones
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("extracciones")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/extracciones — crea extracción + líneas de valores.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.cuenta_bancaria_id || !body.caja_ingreso_id) {
    return apiError("cuenta_bancaria_id y caja_ingreso_id son requeridos", 400)
  }
  const valores: ValorLinea[] = Array.isArray(body.valores) ? body.valores : []
  const importeTotal = valores.length > 0
    ? valores.reduce((s, v) => s + Number(v.importe ?? 0), 0)
    : Number(body.importe ?? 0)
  if (importeTotal <= 0) return apiError("Importe debe ser mayor a 0", 400)

  const supabase = await createClient()
  const [{ data: cuenta }, { data: caja }] = await Promise.all([
    supabase.from("cuentas_bancarias").select("banco_nombre, numero_cuenta").eq("id", body.cuenta_bancaria_id).maybeSingle(),
    supabase.from("cajas").select("nombre").eq("id", body.caja_ingreso_id).maybeSingle(),
  ])
  if (!cuenta || !caja) return apiError("Cuenta o caja inválida", 400)

  const sucursal = body.sucursal ?? ""
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_extraccion", { p_sucursal: sucursal })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("extracciones")
    .insert({
      numero: numero || `EXT-${Date.now()}`,
      cuenta_bancaria_id: body.cuenta_bancaria_id,
      cuenta_bancaria_nombre: `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}`,
      importe: importeTotal,
      sucursal,
      caja_ingreso_id: body.caja_ingreso_id,
      caja_ingreso_nombre: caja.nombre,
      tipo_operacion: body.tipo_operacion ?? "Extracción",
      numero_operacion: body.numero_operacion || null,
      fecha_operacion: body.fecha_operacion || null,
      observaciones: body.observaciones ?? "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()
  if (error) return dbError(error)

  if (valores.length > 0) {
    const filas = valores.map(v => ({
      extraccion_id: (data as { id: string }).id,
      valor_id: v.valor_id,
      valor_nombre: v.valor_nombre,
      importe: v.importe,
    }))
    const { error: vErr } = await supabase.from("extraccion_valores").insert(filas)
    if (vErr) return dbError(vErr)
  }

  return NextResponse.json(data, { status: 201 })
}
