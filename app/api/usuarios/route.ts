import { apiError, dbError } from "@/lib/api-utils"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { registrarEvento } from "@/lib/seguimiento"

// GET /api/usuarios → listado completo de usuarios del ERP con su sucursal default
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("usuarios")
    .select(`
      id,
      auth_user_id,
      nombre,
      username,
      email,
      avatar_url,
      sucursal_default_id,
      is_superuser,
      is_active,
      last_login_at,
      created_at,
      updated_at,
      sucursales:sucursal_default_id ( id, nombre )
    `)
    .order("last_login_at", { ascending: false, nullsFirst: false })

  if (error) return dbError(error)

  const mapped = (data ?? []).map((u: any) => ({
    ...u,
    sucursal_default_nombre: u.sucursales?.nombre ?? null,
    sucursales: undefined,
  }))

  return NextResponse.json(mapped)
}

// POST /api/usuarios → crea un usuario nuevo (en auth.users + en la tabla `usuarios`).
// Body esperado:
//   { nombre, username, email, password, sucursal_default_id, is_superuser?, is_active? }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const nombre              = (body?.nombre ?? "").toString().trim()
  const username            = (body?.username ?? "").toString().trim().toLowerCase().replace(/\s/g, "")
  const email               = (body?.email ?? "").toString().trim().toLowerCase()
  const password            = (body?.password ?? "").toString()
  const sucursal_default_id = body?.sucursal_default_id ?? null
  const is_superuser        = !!body?.is_superuser
  const is_active           = body?.is_active === false ? false : true

  // Validaciones básicas
  if (!nombre)            return apiError("El nombre es obligatorio", 400)
  if (!username)          return apiError("El usuario / login es obligatorio", 400)
  if (!email)             return apiError("El email es obligatorio", 400)
  if (!password || password.length < 6) return apiError("La contraseña debe tener al menos 6 caracteres", 400)
  if (!sucursal_default_id) return apiError("Hay que elegir una sucursal por defecto", 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("El email no tiene un formato válido", 400)

  const supabase = await createClient()
  const admin    = createAdminClient()

  // Chequeo previo de unicidad en la tabla `usuarios` para tirar un error claro
  const { data: yaExiste } = await supabase
    .from("usuarios")
    .select("id, email, username")
    .or(`email.eq.${email},username.eq.${username}`)
    .maybeSingle()
  if (yaExiste) {
    if (yaExiste.email === email)       return apiError("Ya existe un usuario con ese email", 409)
    if (yaExiste.username === username) return apiError("Ya existe un usuario con ese login", 409)
  }

  // 1) Crear el usuario en auth.users vía admin API (con email confirmado para que pueda loguear)
  const { data: authCreated, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: nombre },
  })
  if (errAuth || !authCreated?.user) {
    return apiError(errAuth?.message ?? "No se pudo crear el usuario en Supabase Auth", 500)
  }

  const authUserId = authCreated.user.id

  // 2) Crear la fila en `usuarios` (rollback de auth.users si falla)
  const { data: insertado, error: errIns } = await admin
    .from("usuarios")
    .insert({
      auth_user_id: authUserId,
      nombre,
      username,
      email,
      sucursal_default_id,
      is_superuser,
      is_active,
    })
    .select("id")
    .single()
  if (errIns || !insertado) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {})
    return dbError(errIns ?? new Error("No se pudo insertar la fila en `usuarios`"))
  }

  const nuevoId = insertado.id as number

  // 3) Crear fila vacía en usuario_permisos
  await admin.from("usuario_permisos").insert({ usuario_id: nuevoId, vistas: {}, permisos: {} }).select().maybeSingle()

  // 4) Asociar al menos a la sucursal default (la spec exige que la default esté en las permitidas)
  await admin.from("usuario_sucursales").insert({
    usuario_id: nuevoId,
    sucursal_id: sucursal_default_id,
    es_principal: true,
  })

  await registrarEvento(admin, {
    tipo_documento: "usuario",
    documento_id: nuevoId,
    tipo_evento: "creacion",
    usuario: null,
    descripcion: `Usuario ${body.username ?? body.email ?? `#${nuevoId}`}`,
  })

  return NextResponse.json({ ok: true, id: nuevoId, auth_user_id: authUserId }, { status: 201 })
}
