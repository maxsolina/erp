import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, banco_id, numero_cuenta, cbu, banco_nombre, tipo_cuenta, moneda, propietario, direccion_propietario, diario_nombre, disponible_facturas_credito, activo"

// GET /api/cuentas-bancarias → listado de cuentas bancarias (?incluir_inactivos=1 trae todas)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("cuentas_bancarias")
    .select(SELECT)
    .order("banco_nombre")
    .order("numero_cuenta")

  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/cuentas-bancarias
// El cliente envía banco_id; resolvemos banco_nombre desde la tabla bancos.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.numero_cuenta) return apiError("numero_cuenta es requerido", 400)

  const supabase = await createClient()
  let bancoNombre: string | null = null
  if (body.banco_id) {
    const { data: b } = await supabase.from("bancos").select("nombre").eq("id", body.banco_id).maybeSingle()
    bancoNombre = b?.nombre ?? null
  }

  const { data, error } = await supabase
    .from("cuentas_bancarias")
    .insert({
      banco_id: body.banco_id || null,
      banco_nombre: bancoNombre ?? body.propietario ?? "Sin banco",
      numero_cuenta: body.numero_cuenta,
      cbu: body.cbu || null,
      tipo_cuenta: body.tipo_cuenta || "cuenta_corriente",
      moneda: body.moneda || "ARS",
      propietario: body.propietario || null,
      direccion_propietario: body.direccion_propietario || null,
      diario_nombre: body.diario_nombre || null,
      disponible_facturas_credito: !!body.disponible_facturas_credito,
      activo: body.activo ?? true,
    })
    .select(SELECT)
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
