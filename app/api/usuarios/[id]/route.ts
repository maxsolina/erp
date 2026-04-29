import { apiError, dbError } from "@/lib/api-utils"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/usuarios/[id] → usuario completo con accesos (sucursales, cajas, depósitos)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuarioId = parseInt(id, 10)
  if (Number.isNaN(usuarioId)) return apiError("id inválido", 400)

  const supabase = await createClient()

  const [
    { data: usuario, error: errU },
    { data: sucs, error: errS },
    { data: cjs, error: errC },
    { data: deps, error: errD },
    { data: perms, error: errP },
  ] = await Promise.all([
    supabase
      .from("usuarios")
      .select(`
        id, auth_user_id, nombre, username, email, avatar_url,
        sucursal_default_id, is_superuser, is_active, last_login_at, created_at, updated_at,
        sucursales:sucursal_default_id ( id, nombre )
      `)
      .eq("id", usuarioId)
      .maybeSingle(),
    supabase
      .from("usuario_sucursales")
      .select(`sucursal_id, es_principal, ver_nv_otras_sucursales, sucursales ( id, codigo, nombre, activa )`)
      .eq("usuario_id", usuarioId),
    supabase
      .from("usuario_cajas")
      .select(`caja_id, cajas ( id, nombre, codigo, sucursal, cierre_diario_obligatorio, activo )`)
      .eq("usuario_id", usuarioId),
    supabase
      .from("usuario_depositos")
      .select(`deposito_id, depositos ( id, codigo, nombre, activo )`)
      .eq("usuario_id", usuarioId),
    supabase
      .from("usuario_permisos")
      .select("vistas, permisos")
      .eq("usuario_id", usuarioId)
      .maybeSingle(),
  ])

  if (errU) return dbError(errU)
  if (errS) return dbError(errS)
  if (errC) return dbError(errC)
  if (errD) return dbError(errD)
  if (errP) return dbError(errP)
  if (!usuario) return apiError("Usuario no encontrado", 404)

  const u = usuario as any
  return NextResponse.json({
    ...u,
    sucursal_default_nombre: u.sucursales?.nombre ?? null,
    sucursales: undefined,
    accesos: {
      sucursales: (sucs ?? []).map((r: any) => ({
        id: r.sucursales?.id ?? r.sucursal_id,
        codigo: r.sucursales?.codigo ?? "",
        nombre: r.sucursales?.nombre ?? "",
        activa: r.sucursales?.activa ?? false,
        es_principal: r.es_principal,
      })),
      cajas: (cjs ?? []).map((r: any) => ({
        id: r.cajas?.id ?? r.caja_id,
        nombre: r.cajas?.nombre ?? "",
        codigo: r.cajas?.codigo ?? "",
        sucursal: r.cajas?.sucursal ?? "",
        cierre_diario_obligatorio: r.cajas?.cierre_diario_obligatorio ?? true,
        activo: r.cajas?.activo ?? false,
      })),
      depositos: (deps ?? []).map((r: any) => ({
        id: r.depositos?.id ?? r.deposito_id,
        codigo: r.depositos?.codigo ?? "",
        nombre: r.depositos?.nombre ?? "",
        activo: r.depositos?.activo ?? false,
      })),
    },
    vistas:   (perms?.vistas   ?? {}) as Record<string, boolean>,
    permisos: (perms?.permisos ?? {}) as Record<string, Record<string, string | boolean>>,
  })
}

// PUT /api/usuarios/[id] → actualización atómica (header + Activo + accesos)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuarioId = parseInt(id, 10)
  if (Number.isNaN(usuarioId)) return apiError("id inválido", 400)

  const body = await req.json()
  const supabase = await createClient()

  // ───── Validaciones de negocio ─────
  const sucursalesIds: number[] = Array.isArray(body.sucursales_ids) ? body.sucursales_ids : []
  const cajasIds: string[]      = Array.isArray(body.cajas_ids)      ? body.cajas_ids      : []
  const depositosIds: number[]  = Array.isArray(body.depositos_ids)  ? body.depositos_ids  : []

  if (sucursalesIds.length === 0) {
    return apiError("Debe haber al menos una sucursal permitida", 400)
  }

  if (body.sucursal_default_id != null && !sucursalesIds.includes(body.sucursal_default_id)) {
    return apiError("La Sucursal default debe estar incluida en Sucursales Permitidas", 400)
  }

  // Validar último superusuario activo: no se puede dejar el sistema sin ningún superusuario.
  if (body.is_superuser === false || body.is_active === false) {
    const { data: actuales } = await supabase
      .from("usuarios")
      .select("id, is_superuser, is_active")
      .eq("id", usuarioId)
      .maybeSingle()
    const seraSuper  = body.is_superuser ?? (actuales?.is_superuser ?? false)
    const seraActivo = body.is_active    ?? (actuales?.is_active    ?? true)
    if (actuales?.is_superuser && (!seraSuper || !seraActivo)) {
      const { count } = await supabase
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("is_superuser", true)
        .eq("is_active", true)
      if ((count ?? 0) <= 1) {
        return apiError("No se puede desactivar al último superusuario activo del sistema", 400)
      }
    }
  }

  // ───── Update del registro principal ─────
  const updateFields: Record<string, any> = {}
  if (typeof body.nombre               === "string")  updateFields.nombre = body.nombre.trim()
  if (typeof body.username             === "string")  updateFields.username = body.username.trim().toLowerCase()
  if (typeof body.email                === "string")  updateFields.email = body.email.trim()
  if (typeof body.avatar_url           === "string" || body.avatar_url === null) updateFields.avatar_url = body.avatar_url
  if (typeof body.sucursal_default_id  === "number" || body.sucursal_default_id === null) updateFields.sucursal_default_id = body.sucursal_default_id
  if (typeof body.is_superuser         === "boolean") updateFields.is_superuser = body.is_superuser
  if (typeof body.is_active            === "boolean") updateFields.is_active = body.is_active

  if (Object.keys(updateFields).length > 0) {
    const { error: errUp } = await supabase.from("usuarios").update(updateFields).eq("id", usuarioId)
    if (errUp) return dbError(errUp)
  }

  // ───── Diff y sync de accesos a sucursales ─────
  if (Array.isArray(body.sucursales_ids)) {
    const { data: actualesS } = await supabase.from("usuario_sucursales").select("sucursal_id").eq("usuario_id", usuarioId)
    const setActuales = new Set((actualesS ?? []).map((r: any) => r.sucursal_id))
    const setNuevos = new Set(sucursalesIds)
    const aAgregar = sucursalesIds.filter(sid => !setActuales.has(sid))
    const aQuitar  = [...setActuales].filter(sid => !setNuevos.has(sid as number))
    if (aAgregar.length > 0) {
      const rows = aAgregar.map(sid => ({
        usuario_id: usuarioId,
        sucursal_id: sid,
        es_principal: sid === body.sucursal_default_id,
      }))
      const { error } = await supabase.from("usuario_sucursales").insert(rows)
      if (error) return dbError(error)
    }
    if (aQuitar.length > 0) {
      const { error } = await supabase
        .from("usuario_sucursales")
        .delete()
        .eq("usuario_id", usuarioId)
        .in("sucursal_id", aQuitar)
      if (error) return dbError(error)
    }
    // Reescribir es_principal del default
    if (body.sucursal_default_id != null) {
      await supabase.from("usuario_sucursales").update({ es_principal: false }).eq("usuario_id", usuarioId)
      await supabase.from("usuario_sucursales").update({ es_principal: true }).eq("usuario_id", usuarioId).eq("sucursal_id", body.sucursal_default_id)
    }
  }

  // ───── Diff y sync de accesos a cajas ─────
  if (Array.isArray(body.cajas_ids)) {
    const { data: actualesC } = await supabase.from("usuario_cajas").select("caja_id").eq("usuario_id", usuarioId)
    const setActuales = new Set((actualesC ?? []).map((r: any) => r.caja_id))
    const setNuevos = new Set(cajasIds)
    const aAgregar = cajasIds.filter(cid => !setActuales.has(cid))
    const aQuitar  = [...setActuales].filter(cid => !setNuevos.has(cid as string))
    if (aAgregar.length > 0) {
      const rows = aAgregar.map(cid => ({ usuario_id: usuarioId, caja_id: cid }))
      const { error } = await supabase.from("usuario_cajas").insert(rows)
      if (error) return dbError(error)
    }
    if (aQuitar.length > 0) {
      const { error } = await supabase
        .from("usuario_cajas")
        .delete()
        .eq("usuario_id", usuarioId)
        .in("caja_id", aQuitar)
      if (error) return dbError(error)
    }
  }

  // ───── Update de vistas y permisos puntuales ─────
  if (body.vistas !== undefined || body.permisos !== undefined) {
    const upsertRow: Record<string, any> = { usuario_id: usuarioId }
    if (body.vistas   !== undefined) upsertRow.vistas   = body.vistas   ?? {}
    if (body.permisos !== undefined) upsertRow.permisos = body.permisos ?? {}
    upsertRow.updated_at = new Date().toISOString()
    const { error: errPerm } = await supabase
      .from("usuario_permisos")
      .upsert(upsertRow, { onConflict: "usuario_id" })
    if (errPerm) return dbError(errPerm)
  }

  // ───── Diff y sync de accesos a depósitos ─────
  if (Array.isArray(body.depositos_ids)) {
    const { data: actualesD } = await supabase.from("usuario_depositos").select("deposito_id").eq("usuario_id", usuarioId)
    const setActuales = new Set((actualesD ?? []).map((r: any) => r.deposito_id))
    const setNuevos = new Set(depositosIds)
    const aAgregar = depositosIds.filter(did => !setActuales.has(did))
    const aQuitar  = [...setActuales].filter(did => !setNuevos.has(did as number))
    if (aAgregar.length > 0) {
      const rows = aAgregar.map(did => ({ usuario_id: usuarioId, deposito_id: did }))
      const { error } = await supabase.from("usuario_depositos").insert(rows)
      if (error) return dbError(error)
    }
    if (aQuitar.length > 0) {
      const { error } = await supabase
        .from("usuario_depositos")
        .delete()
        .eq("usuario_id", usuarioId)
        .in("deposito_id", aQuitar)
      if (error) return dbError(error)
    }
  }

  return NextResponse.json({ ok: true })
}
