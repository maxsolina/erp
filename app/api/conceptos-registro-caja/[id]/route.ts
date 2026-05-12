import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, codigo, nombre, cuenta_contable_ingresos, cuenta_contable_egresos, requiere_observacion, visible_en_banco, visible_en_caja, visible_en_ajuste_cajas, visible_en_ajuste_banco, visible_en_transferencias, visible_en_cancelaciones, activo"

// GET /api/conceptos-registro-caja/[id] — incluye usuarios + cuentas_permitidas.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("conceptos_registro_caja")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) return dbError(error)
  if (!data) return apiError("Concepto no encontrado", 404)

  const [{ data: usuarios }, { data: cuentas }] = await Promise.all([
    supabase
      .from("concepto_usuarios")
      .select("id, usuario_id, usuarios:usuario_id (id, username, nombre, email)")
      .eq("concepto_id", id),
    supabase
      .from("concepto_cuentas_permitidas")
      .select("id, cuenta_codigo, cuenta_nombre")
      .eq("concepto_id", id),
  ])

  return NextResponse.json({
    ...data,
    usuarios: (usuarios ?? []).map((u: any) => ({
      id: u.id,
      usuario_id: u.usuario_id,
      username: u.usuarios?.username,
      nombre: u.usuarios?.nombre,
      email: u.usuarios?.email,
    })),
    cuentas_permitidas: cuentas ?? [],
  })
}

// PUT /api/conceptos-registro-caja/[id]
// Body: campos del concepto + opcional `usuarios` (array de usuario_id) + `cuentas_permitidas` (array de { cuenta_codigo, cuenta_nombre })
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const body = await req.json()
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (body.codigo !== undefined) update.codigo = body.codigo
  if (body.nombre !== undefined) update.nombre = body.nombre
  if (body.cuenta_contable_ingresos !== undefined) update.cuenta_contable_ingresos = body.cuenta_contable_ingresos || null
  if (body.cuenta_contable_egresos !== undefined) update.cuenta_contable_egresos = body.cuenta_contable_egresos || null
  for (const flag of [
    "visible_en_ajuste_cajas",
    "visible_en_ajuste_banco",
    "visible_en_caja",
    "visible_en_banco",
    "visible_en_transferencias",
    "visible_en_cancelaciones",
    "requiere_observacion",
    "activo",
  ]) {
    if (body[flag] !== undefined) update[flag] = !!body[flag]
  }

  const { data, error } = await supabase
    .from("conceptos_registro_caja")
    .update(update)
    .eq("id", id)
    .select(SELECT)
    .single()
  if (error) return dbError(error)

  // Sync usuarios si vienen en el body. usuarios.id es BIGINT — aceptamos number o string numérico.
  if (Array.isArray(body.usuarios)) {
    await supabase.from("concepto_usuarios").delete().eq("concepto_id", id)
    const rows = body.usuarios
      .map((u: any) => {
        const raw = typeof u === "object" && u !== null ? u.usuario_id : u
        const num = Number(raw)
        return Number.isFinite(num) ? { concepto_id: id, usuario_id: num } : null
      })
      .filter(Boolean)
    if (rows.length > 0) {
      const { error: e } = await supabase.from("concepto_usuarios").insert(rows as any[])
      if (e) return dbError(e)
    }
  }

  // Sync cuentas permitidas
  if (Array.isArray(body.cuentas_permitidas)) {
    await supabase.from("concepto_cuentas_permitidas").delete().eq("concepto_id", id)
    const rows = body.cuentas_permitidas
      .filter((c: any) => c && c.cuenta_codigo)
      .map((c: any) => ({
        concepto_id: id,
        cuenta_codigo: c.cuenta_codigo,
        cuenta_nombre: c.cuenta_nombre ?? null,
      }))
    if (rows.length > 0) {
      const { error: e } = await supabase.from("concepto_cuentas_permitidas").insert(rows)
      if (e) return dbError(e)
    }
  }

  return NextResponse.json(data)
}
