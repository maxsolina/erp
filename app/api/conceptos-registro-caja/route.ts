import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/conceptos-registro-caja → conceptos para registros/ajustes/transferencias.
// ?incluir_inactivos=1 trae los inactivos también.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"

  const supabase = await createClient()
  let query = supabase
    .from("conceptos_registro_caja")
    .select(
      "id, codigo, nombre, cuenta_contable_ingresos, cuenta_contable_egresos, requiere_observacion, visible_en_banco, visible_en_caja, visible_en_ajuste_cajas, visible_en_ajuste_banco, visible_en_transferencias, visible_en_cancelaciones, activo",
    )
    .order("nombre")

  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data ?? [])
}

// POST /api/conceptos-registro-caja → crea un concepto.
export async function POST(req: Request) {
  const body = await req.json()
  if (!body.codigo || !body.nombre) return apiError("codigo y nombre son requeridos", 400)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("conceptos_registro_caja")
    .insert({
      codigo: body.codigo,
      nombre: body.nombre,
      cuenta_contable_ingresos: body.cuenta_contable_ingresos || null,
      cuenta_contable_egresos: body.cuenta_contable_egresos || null,
      visible_en_ajuste_cajas: !!body.visible_en_ajuste_cajas,
      visible_en_ajuste_banco: !!body.visible_en_ajuste_banco,
      visible_en_caja: !!body.visible_en_caja,
      visible_en_banco: !!body.visible_en_banco,
      visible_en_transferencias: !!body.visible_en_transferencias,
      visible_en_cancelaciones: !!body.visible_en_cancelaciones,
      requiere_observacion: !!body.requiere_observacion,
      activo: body.activo ?? true,
    })
    .select()
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data, { status: 201 })
}
