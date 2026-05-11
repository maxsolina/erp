import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, banco_id, numero_cuenta, cbu, banco_nombre, tipo_cuenta, moneda, propietario, direccion_propietario, diario_nombre, disponible_facturas_credito, activo"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase.from("cuentas_bancarias").select(SELECT).eq("id", id).maybeSingle()
  if (error) return dbError(error)
  if (!data) return apiError("Cuenta bancaria no encontrada", 404)
  return NextResponse.json(data)
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()

  const supabase = await createClient()

  // Si nos cambian el banco_id, resolvemos el banco_nombre.
  const update: Record<string, unknown> = {}
  if (body.banco_id !== undefined) {
    update.banco_id = body.banco_id || null
    if (body.banco_id) {
      const { data: b } = await supabase.from("bancos").select("nombre").eq("id", body.banco_id).maybeSingle()
      update.banco_nombre = b?.nombre ?? body.propietario ?? "Sin banco"
    } else {
      update.banco_nombre = body.propietario ?? "Sin banco"
    }
  }
  if (body.numero_cuenta !== undefined) update.numero_cuenta = body.numero_cuenta
  if (body.cbu !== undefined) update.cbu = body.cbu || null
  if (body.tipo_cuenta !== undefined) update.tipo_cuenta = body.tipo_cuenta
  if (body.moneda !== undefined) update.moneda = body.moneda
  if (body.propietario !== undefined) update.propietario = body.propietario || null
  if (body.direccion_propietario !== undefined) update.direccion_propietario = body.direccion_propietario || null
  if (body.diario_nombre !== undefined) update.diario_nombre = body.diario_nombre || null
  if (body.disponible_facturas_credito !== undefined) update.disponible_facturas_credito = !!body.disponible_facturas_credito
  if (body.activo !== undefined) update.activo = !!body.activo

  const { data, error } = await supabase.from("cuentas_bancarias").update(update).eq("id", id).select(SELECT).single()
  if (error) return dbError(error)
  return NextResponse.json(data)
}
