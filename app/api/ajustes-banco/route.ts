import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT_LIST = "id, numero, cuenta_bancaria_nombre, sucursal, concepto_nombre, importe, fecha, estado"
const SELECT_FULL = "id, numero, cuenta_bancaria_id, cuenta_bancaria_nombre, sucursal, concepto_id, concepto_nombre, importe, fecha, cuenta_analitica, observaciones, estado"

// GET /api/ajustes-banco
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get("limit") ?? 200)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ajustes_banco")
    .select(SELECT_LIST)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/ajustes-banco — crea un ajuste de banco. Genera número via RPC.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.cuenta_bancaria_id || !body.concepto_id || body.importe == null) {
    return apiError("cuenta_bancaria_id, concepto_id e importe son requeridos", 400)
  }

  const supabase = await createClient()

  // Resolver nombre del banco a partir del id
  const { data: cuenta } = await supabase
    .from("cuentas_bancarias")
    .select("banco_nombre, numero_cuenta")
    .eq("id", body.cuenta_bancaria_id)
    .maybeSingle()
  if (!cuenta) return apiError("Cuenta bancaria no encontrada", 400)

  // Resolver concepto_nombre del concepto seleccionado.
  const { data: concepto } = await supabase
    .from("conceptos_registro_caja")
    .select("nombre")
    .eq("id", body.concepto_id)
    .maybeSingle()

  // Generar número via RPC.
  const { data: numero, error: rpcErr } = await supabase.rpc("generar_numero_ajuste_banco", {
    p_sucursal: body.sucursal || "",
  })
  if (rpcErr) return dbError(rpcErr)

  const { data, error } = await supabase
    .from("ajustes_banco")
    .insert({
      numero,
      cuenta_bancaria_id: body.cuenta_bancaria_id,
      cuenta_bancaria_nombre: `${cuenta.banco_nombre} - ${cuenta.numero_cuenta}`,
      concepto_id: body.concepto_id,
      concepto_nombre: concepto?.nombre ?? "",
      importe: body.importe,
      fecha: body.fecha,
      sucursal: body.sucursal || "",
      cuenta_analitica: body.cuenta_analitica || null,
      observaciones: body.observaciones || "",
      estado: "borrador",
    })
    .select(SELECT_FULL)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
