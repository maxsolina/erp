import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SELECT = "id, codigo, nombre, cuenta_contable_ingresos, cuenta_contable_egresos, requiere_observacion, visible_en_banco, visible_en_caja, visible_en_ajuste_cajas, visible_en_ajuste_banco, visible_en_transferencias, visible_en_cancelaciones, activo"

// GET /api/conceptos-registro-caja → conceptos para registros/ajustes/transferencias.
// ?incluir_inactivos=1 trae los inactivos también.
// ?con_relaciones=1 incluye usuarios + cuentas_permitidas en cada concepto.
// ?for_user=<usuarioId> filtra a los conceptos cuyo concepto_usuarios incluye al usuario,
//   más los que no tienen ningún usuario asignado (visibles para todos).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const incluirInactivos = searchParams.get("incluir_inactivos") === "1"
  const conRelaciones = searchParams.get("con_relaciones") === "1"
  const forUser = searchParams.get("for_user")

  const supabase = await createClient()
  let query = supabase.from("conceptos_registro_caja").select(SELECT).order("nombre")
  if (!incluirInactivos) query = query.eq("activo", true)

  const { data, error } = await query
  if (error) return dbError(error)
  let conceptos: any[] = data ?? []

  if (conRelaciones || forUser) {
    const ids = conceptos.map(c => c.id)
    if (ids.length === 0) return NextResponse.json([])

    const [{ data: usuarios }, { data: cuentas }] = await Promise.all([
      supabase
        .from("concepto_usuarios")
        .select("concepto_id, usuario_id")
        .in("concepto_id", ids),
      supabase
        .from("concepto_cuentas_permitidas")
        .select("concepto_id, cuenta_codigo, cuenta_nombre")
        .in("concepto_id", ids),
    ])

    const usuariosByConcepto = new Map<string, string[]>()
    for (const u of usuarios ?? []) {
      const list = usuariosByConcepto.get(u.concepto_id) ?? []
      list.push(u.usuario_id)
      usuariosByConcepto.set(u.concepto_id, list)
    }

    const cuentasByConcepto = new Map<string, any[]>()
    for (const c of cuentas ?? []) {
      const list = cuentasByConcepto.get(c.concepto_id) ?? []
      list.push({ cuenta_codigo: c.cuenta_codigo, cuenta_nombre: c.cuenta_nombre })
      cuentasByConcepto.set(c.concepto_id, list)
    }

    conceptos = conceptos.map(c => ({
      ...c,
      usuario_ids: usuariosByConcepto.get(c.id) ?? [],
      cuentas_permitidas: cuentasByConcepto.get(c.id) ?? [],
    }))

    // Filtro por usuario: el concepto debe tener al usuario asignado explícitamente.
    // Conceptos sin usuarios asignados NO se muestran (regla estricta).
    if (forUser) {
      const forUserNum = Number(forUser)
      conceptos = conceptos.filter(c => {
        const lista = (c.usuario_ids ?? []) as number[]
        return lista.includes(forUserNum)
      })
    }
  }

  return NextResponse.json(conceptos)
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
  const conceptoId = (data as { id: string }).id

  // Persistir usuarios y cuentas si vienen en el body (creación inicial)
  if (Array.isArray(body.usuarios) && body.usuarios.length > 0) {
    const rows = body.usuarios
      .map((u: any) => {
        const raw = typeof u === "object" && u !== null ? u.usuario_id : u
        const num = Number(raw)
        return Number.isFinite(num) ? { concepto_id: conceptoId, usuario_id: num } : null
      })
      .filter(Boolean)
    if (rows.length > 0) await supabase.from("concepto_usuarios").insert(rows as any[])
  }
  if (Array.isArray(body.cuentas_permitidas) && body.cuentas_permitidas.length > 0) {
    const rows = body.cuentas_permitidas
      .filter((c: any) => c && c.cuenta_codigo)
      .map((c: any) => ({ concepto_id: conceptoId, cuenta_codigo: c.cuenta_codigo, cuenta_nombre: c.cuenta_nombre ?? null }))
    if (rows.length > 0) await supabase.from("concepto_cuentas_permitidas").insert(rows)
  }

  return NextResponse.json(data, { status: 201 })
}
