"use client"

import { useState, useEffect, useMemo } from "react"
import { ArrowLeft, Plus, Search, ShieldCheck, User, Building2, Mail, AtSign, KeyRound, X, Trash2, AlertCircle, Lock, ChevronDown, ChevronRight } from "lucide-react"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface UsuarioRow {
  id: number
  auth_user_id: string | null
  nombre: string
  username: string
  email: string
  avatar_url: string | null
  sucursal_default_id: number | null
  sucursal_default_nombre: string | null
  is_superuser: boolean
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

interface Sucursal { id: number; codigo: string; nombre: string; activa: boolean }
interface Caja { id: string; nombre: string; codigo: string | null; sucursal: string; cierre_diario_obligatorio: boolean; activo: boolean }
interface Deposito { id: number; codigo: string; nombre: string; activo: boolean; sucursal_id?: number | null }

interface UsuarioCompleto extends UsuarioRow {
  accesos: {
    sucursales: (Sucursal & { es_principal: boolean })[]
    cajas: Caja[]
    depositos: Deposito[]
  }
  vistas: Record<string, boolean>
  permisos: Record<string, Record<string, string | boolean>>
}

interface PermisoCatalogo {
  id: string
  modulo: string
  tipo: "view" | "entity" | "slider" | "checkbox"
  label: string
  descripcion: string | null
  orden: number
  parent_id: string | null
}

type FiltroActivo = "activo" | "inactivo" | "todos"
type Modo = "lectura" | "edicion"
type TabActiva = "configuraciones" | "accesos" | "permisos" | "sesiones"

interface SesionRow {
  id: number
  usuario_id: number
  ip: string | null
  ubicacion: string | null
  sistema_operativo: string | null
  navegador: string | null
  version_navegador: string | null
  login_at: string
  last_activity_at: string
  logout_at: string | null
  expires_at: string | null
  tipo_cierre: string | null
  terminada_por: string | null
  terminada_por_user_id: number | null
  razon: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatRelative(iso: string | null): string {
  if (!iso) return "Nunca"
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "hace instantes"
  if (min < 60) return `hace ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `hace ${day} d`
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ModuloUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [creandoNuevo, setCreandoNuevo] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activo")
  const [soloSuperusuarios, setSoloSuperusuarios] = useState(false)

  // Cargar listado
  useEffect(() => {
    let cancelado = false
    setLoading(true)
    fetch("/api/usuarios")
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((data: UsuarioRow[]) => {
        if (cancelado) return
        setUsuarios(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        if (cancelado) return
        setError(err?.message ?? "Error al cargar usuarios")
        setLoading(false)
      })
    return () => { cancelado = true }
  }, [refreshTick])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return usuarios.filter(u => {
      if (filtroActivo === "activo" && !u.is_active) return false
      if (filtroActivo === "inactivo" && u.is_active) return false
      if (soloSuperusuarios && !u.is_superuser) return false
      if (q) {
        const hay = `${u.nombre} ${u.username} ${u.email}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [usuarios, busqueda, filtroActivo, soloSuperusuarios])

  if (creandoNuevo) {
    return (
      <FichaCrearUsuario
        onCancelar={() => setCreandoNuevo(false)}
        onCreado={(idNuevo) => {
          setCreandoNuevo(false)
          setRefreshTick(t => t + 1)
          setSeleccionadoId(idNuevo)
        }}
      />
    )
  }

  if (seleccionadoId !== null) {
    return (
      <FichaUsuario
        usuarioId={seleccionadoId}
        onVolver={() => setSeleccionadoId(null)}
        onActualizado={() => setRefreshTick(t => t + 1)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-amber-900">Usuarios</h1>
        <button
          onClick={() => setCreandoNuevo(true)}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Crear
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, usuario o email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          {(["activo", "inactivo", "todos"] as FiltroActivo[]).map(opt => (
            <button
              key={opt}
              onClick={() => setFiltroActivo(opt)}
              className={`px-3 py-2 capitalize ${filtroActivo === opt ? "bg-indigo-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {opt}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={soloSuperusuarios}
            onChange={e => setSoloSuperusuarios(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Solo superusuarios
        </label>

        <div className="ml-auto text-xs text-gray-500">
          {filtrados.length} de {usuarios.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Login</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal Default</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Última conexión</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">Cargando usuarios...</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-red-600">Error: {error}</td></tr>
            )}
            {!loading && !error && filtrados.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-500">No se encontraron usuarios con esos filtros.</td></tr>
            )}
            {!loading && !error && filtrados.map(u => (
              <tr
                key={u.id}
                onClick={() => setSeleccionadoId(u.id)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={u.nombre} url={u.avatar_url} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.nombre}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 font-mono">{u.username}</td>
                <td className="py-3 px-4 text-sm text-gray-700">{u.sucursal_default_nombre ?? "—"}</td>
                <td className="py-3 px-4 text-center">
                  {u.is_superuser ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Superusuario
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Estándar</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {u.is_active ? "Activado" : "Inactivo"}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{formatRelative(u.last_login_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export function Avatar({ nombre, url, size = "sm" }: { nombre: string; url: string | null; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-24 h-24 text-3xl" : "w-9 h-9 text-sm"
  if (url) return <img src={url} alt={nombre} className={`${dim} rounded-full object-cover bg-gray-200`} />
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold`}>
      {initials(nombre)}
    </div>
  )
}

// ─── Ficha de Usuario (lectura + edición + tabs) ─────────────────────────────

export function FichaUsuario({
  usuarioId,
  onVolver,
  onActualizado,
}: {
  usuarioId: number
  onVolver: () => void
  onActualizado: () => void
}) {
  const [usuario, setUsuario] = useState<UsuarioCompleto | null>(null)
  const [sucursalesAll, setSucursalesAll] = useState<Sucursal[]>([])
  const [cajasAll, setCajasAll] = useState<Caja[]>([])
  const [depositosAll, setDepositosAll] = useState<Deposito[]>([])
  const [catalogoPermisos, setCatalogoPermisos] = useState<PermisoCatalogo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>("lectura")
  const [tab, setTab] = useState<TabActiva>("configuraciones")
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  // Modales y feedback de los botones del header
  const [showVerMenu, setShowVerMenu] = useState(false)
  const [showCopiarDesde, setShowCopiarDesde] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [tienePortapapeles, setTienePortapapeles] = useState(false)

  // Detectar al montar si hay snapshot de permisos en sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    setTienePortapapeles(!!sessionStorage.getItem("erp:permisos:clipboard"))
  }, [])

  // Estado editable (espejo del usuario, se modifica en modo edición)
  const [draft, setDraft] = useState<{
    nombre: string
    username: string
    email: string
    avatar_url: string
    sucursal_default_id: number | null
    is_superuser: boolean
    is_active: boolean
    sucursales_ids: number[]
    cajas_ids: string[]
    depositos_ids: number[]
    vistas: Record<string, boolean>
    permisos: Record<string, Record<string, string | boolean>>
  } | null>(null)

  // Carga inicial
  useEffect(() => {
    let cancelado = false
    setCargando(true)
    Promise.all([
      fetch(`/api/usuarios/${usuarioId}`).then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))),
      fetch(`/api/sucursales`).then(r => r.ok ? r.json() : []),
      fetch(`/api/cajas`).then(r => r.ok ? r.json() : []),
      fetch(`/api/depositos`).then(r => r.ok ? r.json() : []),
      fetch(`/api/catalogo-permisos`).then(r => r.ok ? r.json() : []),
    ])
      .then(([u, s, c, d, cp]) => {
        if (cancelado) return
        setUsuario(u)
        setSucursalesAll(Array.isArray(s) ? s : [])
        setCajasAll(Array.isArray(c) ? c : [])
        setDepositosAll(Array.isArray(d) ? d : [])
        setCatalogoPermisos(Array.isArray(cp) ? cp : [])
        setCargando(false)
      })
      .catch(err => {
        if (cancelado) return
        setError(err?.message ?? "Error al cargar el usuario")
        setCargando(false)
      })
    return () => { cancelado = true }
  }, [usuarioId])

  const empezarEdicion = () => {
    if (!usuario) return
    setDraft({
      nombre: usuario.nombre,
      username: usuario.username,
      email: usuario.email,
      avatar_url: usuario.avatar_url ?? "",
      sucursal_default_id: usuario.sucursal_default_id,
      is_superuser: usuario.is_superuser,
      is_active: usuario.is_active,
      sucursales_ids: usuario.accesos.sucursales.map(s => s.id),
      cajas_ids: usuario.accesos.cajas.map(c => c.id),
      depositos_ids: usuario.accesos.depositos.map(d => d.id),
      vistas: { ...(usuario.vistas ?? {}) },
      permisos: JSON.parse(JSON.stringify(usuario.permisos ?? {})),
    })
    setModo("edicion")
    setErrorGuardado(null)
  }

  const cancelarEdicion = () => {
    setDraft(null)
    setModo("lectura")
    setErrorGuardado(null)
  }

  // ─── Acciones de los botones del header ─────────────────────────────────────

  const mostrarAviso = (msg: string) => {
    setAviso(msg)
    setTimeout(() => setAviso(null), 3000)
  }

  const handleCopiarPermisos = () => {
    if (!usuario) return
    const snapshot = {
      origen_email: usuario.email,
      origen_nombre: usuario.nombre,
      vistas:   modo === "edicion" && draft ? draft.vistas   : usuario.vistas,
      permisos: modo === "edicion" && draft ? draft.permisos : usuario.permisos,
      copiado_at: new Date().toISOString(),
    }
    sessionStorage.setItem("erp:permisos:clipboard", JSON.stringify(snapshot))
    setTienePortapapeles(true)
    mostrarAviso(`Permisos de ${usuario.nombre} copiados al portapapeles del ERP.`)
  }

  const handlePegarPermisos = () => {
    if (!draft) return
    const raw = sessionStorage.getItem("erp:permisos:clipboard")
    if (!raw) return
    try {
      const snapshot = JSON.parse(raw)
      const ok = window.confirm(`Esto va a sobreescribir las Vistas y los Permisos puntuales actuales con los de ${snapshot.origen_nombre ?? "otro usuario"}. ¿Continuar?`)
      if (!ok) return
      setDraft({ ...draft, vistas: snapshot.vistas ?? {}, permisos: snapshot.permisos ?? {} })
      mostrarAviso(`Permisos pegados desde ${snapshot.origen_nombre ?? "el portapapeles"}.`)
    } catch {
      mostrarAviso("El portapapeles está dañado. Probá copiar de nuevo.")
    }
  }

  const handleLimpiarPermisos = () => {
    if (!draft) return
    const ok = window.confirm("Esto va a apagar TODAS las Vistas y poner los Permisos puntuales en su valor por defecto. ¿Continuar?")
    if (!ok) return
    setDraft({ ...draft, vistas: {}, permisos: {} })
    mostrarAviso("Permisos limpiados. Recordá darle Guardar para confirmar el cambio.")
  }

  const aplicarCopiarDesde = (origen: { vistas: Record<string, boolean>; permisos: Record<string, Record<string, string | boolean>>; nombre: string }) => {
    if (!draft) return
    const ok = window.confirm(`Esto va a sobreescribir las Vistas y los Permisos puntuales actuales con los de ${origen.nombre}. ¿Continuar?`)
    if (!ok) return
    setDraft({ ...draft, vistas: origen.vistas ?? {}, permisos: origen.permisos ?? {} })
    setShowCopiarDesde(false)
    mostrarAviso(`Permisos copiados desde ${origen.nombre}.`)
  }

  const guardar = async () => {
    if (!draft) return
    setGuardando(true)
    setErrorGuardado(null)
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: draft.nombre.trim(),
          username: draft.username.trim().toLowerCase(),
          email: draft.email.trim(),
          avatar_url: draft.avatar_url.trim() || null,
          sucursal_default_id: draft.sucursal_default_id,
          is_superuser: draft.is_superuser,
          is_active: draft.is_active,
          sucursales_ids: draft.sucursales_ids,
          cajas_ids: draft.cajas_ids,
          depositos_ids: draft.depositos_ids,
          vistas: draft.vistas,
          permisos: draft.permisos,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorGuardado(body?.error ?? `Error HTTP ${res.status}`)
        setGuardando(false)
        return
      }
      // Recargar el detalle actualizado
      const fresh = await fetch(`/api/usuarios/${usuarioId}`).then(r => r.json())
      setUsuario(fresh)
      setDraft(null)
      setModo("lectura")
      setGuardando(false)
      onActualizado()
    } catch (err: any) {
      setErrorGuardado(err?.message ?? "Error de red al guardar")
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        Cargando usuario...
      </div>
    )
  }

  if (error || !usuario) {
    return (
      <div className="space-y-4">
        <button onClick={onVolver} className="text-indigo-700 hover:text-indigo-800 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error ?? "Usuario no encontrado"}
        </div>
      </div>
    )
  }

  // Datos para mostrar: si estamos en edición, vienen del draft; si no, del usuario.
  const v = modo === "edicion" && draft ? {
    nombre: draft.nombre,
    username: draft.username,
    email: draft.email,
    avatar_url: draft.avatar_url || null,
    sucursal_default_id: draft.sucursal_default_id,
    is_superuser: draft.is_superuser,
    is_active: draft.is_active,
  } : {
    nombre: usuario.nombre,
    username: usuario.username,
    email: usuario.email,
    avatar_url: usuario.avatar_url,
    sucursal_default_id: usuario.sucursal_default_id,
    is_superuser: usuario.is_superuser,
    is_active: usuario.is_active,
  }

  const sucursalDefaultNombre = sucursalesAll.find(s => s.id === v.sucursal_default_id)?.nombre ?? "—"

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={onVolver} className="hover:text-indigo-700">Usuarios</button>
        <span>/</span>
        <span className="font-medium text-gray-900">{usuario.nombre}</span>
      </div>

      {/* Header con botones */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onVolver} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-amber-900">{usuario.nombre}</h1>
        </div>
        <div className="flex items-center gap-3">
          {modo === "lectura" ? (
            <button
              onClick={empezarEdicion}
              className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={cancelarEdicion}
                disabled={guardando}
                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </>
          )}
        </div>
      </div>

      {errorGuardado && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorGuardado}</span>
        </div>
      )}

      {/* Card del header (datos principales) */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar nombre={v.nombre} url={v.avatar_url} size="lg" />
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {v.is_active ? "Activado" : "Inactivo"}
            </span>
            {v.is_superuser && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Superusuario
              </span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
            {modo === "lectura" ? (
              <>
                <CampoLectura icon={User}      label="Nombre"            value={v.nombre} />
                <CampoLectura icon={AtSign}    label="Usuario / Login"   value={v.username} mono />
                <CampoLectura icon={Mail}      label="Email"             value={v.email} />
                <CampoLectura icon={Building2} label="Sucursal default"  value={sucursalDefaultNombre} />
                <div className="col-span-2 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span>Última conexión: {formatRelative(usuario.last_login_at)}</span>
                  <button
                    disabled
                    title="Disponible en el próximo paso"
                    className="text-indigo-700 hover:text-indigo-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Enviar instrucciones de restablecimiento de contraseña
                  </button>
                </div>
              </>
            ) : draft && (
              <>
                <CampoEdit label="Nombre *" value={draft.nombre} onChange={v => setDraft({ ...draft, nombre: v })} />
                <CampoEdit label="Usuario / Login *" value={draft.username} mono lowercase onChange={v => setDraft({ ...draft, username: v.replace(/\s/g, "") })} />
                <CampoEdit label="Email *" value={draft.email} type="email" onChange={v => setDraft({ ...draft, email: v })} />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal default *</label>
                  <select
                    value={draft.sucursal_default_id ?? ""}
                    onChange={e => setDraft({ ...draft, sucursal_default_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">— Seleccionar —</option>
                    {sucursalesAll.filter(s => s.activa).map(s => (
                      <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.is_superuser}
                      onChange={e => setDraft({ ...draft, is_superuser: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Superusuario</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción (Ver Menú / Copiar / Limpiar / Copiar Desde) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setShowVerMenu(true)}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Ver Menú
        </button>
        <button
          onClick={handleCopiarPermisos}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Copiar Permisos
        </button>
        <button
          onClick={handlePegarPermisos}
          disabled={modo !== "edicion" || !tienePortapapeles}
          title={!tienePortapapeles ? "Antes hacé Copiar Permisos en otro usuario" : modo !== "edicion" ? "Solo disponible en modo edición" : ""}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pegar Permisos
        </button>
        <button
          onClick={handleLimpiarPermisos}
          disabled={modo !== "edicion"}
          title={modo !== "edicion" ? "Solo disponible en modo edición" : ""}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Limpiar Permisos
        </button>
        <button
          onClick={() => setShowCopiarDesde(true)}
          disabled={modo !== "edicion"}
          title={modo !== "edicion" ? "Solo disponible en modo edición" : ""}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Copiar Permisos Desde...
        </button>

        {aviso && (
          <span className="ml-auto inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md">
            {aviso}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex gap-1 border-b border-gray-200 px-4">
          {([
            { id: "configuraciones", label: "Configuraciones" },
            { id: "accesos",         label: "Accesos" },
            { id: "permisos",        label: "Permisos" },
            { id: "sesiones",        label: "Sesiones de Usuario" },
          ] as { id: TabActiva; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? "border-indigo-700 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "configuraciones" && (
            <TabConfiguraciones
              modo={modo}
              isActive={modo === "edicion" && draft ? draft.is_active : usuario.is_active}
              onChange={val => draft && setDraft({ ...draft, is_active: val })}
            />
          )}
          {tab === "accesos" && (
            <TabAccesos
              modo={modo}
              draft={draft}
              setDraft={setDraft}
              usuario={usuario}
              sucursalesAll={sucursalesAll}
              cajasAll={cajasAll}
              depositosAll={depositosAll}
            />
          )}
          {tab === "permisos" && (
            <TabPermisos
              modo={modo}
              isSuperuser={modo === "edicion" && draft ? draft.is_superuser : usuario.is_superuser}
              vistas={modo === "edicion" && draft ? draft.vistas : (usuario.vistas ?? {})}
              permisos={modo === "edicion" && draft ? draft.permisos : (usuario.permisos ?? {})}
              catalogo={catalogoPermisos}
              onChangeVista={(modulo, valor) => {
                if (!draft) return
                setDraft({ ...draft, vistas: { ...draft.vistas, [modulo]: valor } })
              }}
              onChangePermiso={(modulo, key, valor) => {
                if (!draft) return
                const nuevoModulo = { ...(draft.permisos[modulo] ?? {}), [key]: valor }
                setDraft({ ...draft, permisos: { ...draft.permisos, [modulo]: nuevoModulo } })
              }}
            />
          )}
          {tab === "sesiones" && (
            <TabSesiones usuarioId={usuarioId} esSuperusuarioActual={true /* todo: chequear con currentUser */} />
          )}
        </div>
      </div>

      {/* Modal: Ver Menú */}
      {showVerMenu && (
        <ModalVerMenu
          vistas={modo === "edicion" && draft ? draft.vistas : (usuario.vistas ?? {})}
          isSuperuser={modo === "edicion" && draft ? draft.is_superuser : usuario.is_superuser}
          catalogo={catalogoPermisos}
          onClose={() => setShowVerMenu(false)}
        />
      )}

      {/* Modal: Copiar Permisos Desde otro usuario */}
      {showCopiarDesde && (
        <ModalCopiarDesde
          usuarioActualId={usuarioId}
          onClose={() => setShowCopiarDesde(false)}
          onCopiar={aplicarCopiarDesde}
        />
      )}
    </div>
  )
}

// ─── Ficha Crear Usuario (pantalla completa, mismo layout que la ficha del existente) ──

export function FichaCrearUsuario({
  onCancelar,
  onCreado,
}: {
  onCancelar: () => void
  onCreado: (idNuevo: number) => void
}) {
  const [sucursales, setSucursales]               = useState<Sucursal[]>([])
  const [nombre, setNombre]                       = useState("")
  const [username, setUsername]                   = useState("")
  const [email, setEmail]                         = useState("")
  const [password, setPassword]                   = useState("")
  const [confirm, setConfirm]                     = useState("")
  const [sucursalDefaultId, setSucursalDefaultId] = useState<number | "">("")
  const [isSuperuser, setIsSuperuser]             = useState(false)
  const [showPwd, setShowPwd]                     = useState(false)
  const [enviando, setEnviando]                   = useState(false)
  const [error, setError]                         = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/sucursales")
      .then(r => r.ok ? r.json() : [])
      .then(data => setSucursales(Array.isArray(data) ? data.filter((s: Sucursal) => s.activa) : []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!nombre.trim())       return setError("El nombre es obligatorio.")
    if (!username.trim())     return setError("El usuario / login es obligatorio.")
    if (!email.trim())        return setError("El email es obligatorio.")
    if (password.length < 6)  return setError("La contraseña debe tener al menos 6 caracteres.")
    if (password !== confirm) return setError("Las contraseñas no coinciden.")
    if (!sucursalDefaultId)   return setError("Hay que elegir una sucursal por defecto.")

    setEnviando(true)
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
          sucursal_default_id: sucursalDefaultId,
          is_superuser: isSuperuser,
          is_active: true,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error ?? `Error HTTP ${res.status}`)
        setEnviando(false)
        return
      }
      onCreado(body.id)
    } catch (err: any) {
      setError(err?.message ?? "Error de red.")
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button type="button" onClick={onCancelar} className="hover:text-indigo-700">Usuarios</button>
        <span>/</span>
        <span className="font-medium text-gray-900">Nuevo</span>
      </div>

      {/* Header con back + título a la izquierda, botones a la derecha */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{nombre.trim() || "Nuevo Usuario"}</h1>
            <p className="text-sm text-gray-500">Completá los datos básicos para crearlo. Cajas, depósitos y permisos se configuran después.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 disabled:opacity-50"
          >
            {enviando ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Card del header (datos principales) */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-center gap-2">
            <Avatar nombre={nombre || "?"} url={null} size="lg" />
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              Activado
            </span>
            {isSuperuser && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Superusuario
              </span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
            <CampoEdit label="Nombre *" value={nombre} onChange={setNombre} />
            <CampoEdit
              label="Usuario / Login *"
              value={username}
              mono lowercase
              onChange={v => setUsername(v.replace(/\s/g, ""))}
            />
            <CampoEdit label="Email *" value={email} type="email" onChange={setEmail} />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal default *</label>
              <select
                value={sucursalDefaultId}
                onChange={e => setSucursalDefaultId(e.target.value ? parseInt(e.target.value, 10) : "")}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">— Seleccionar —</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.codigo} — {s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSuperuser}
                  onChange={e => setIsSuperuser(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Superusuario</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Card de contraseña — solo visible al crear */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-500" />
          Contraseña inicial
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña *</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required minLength={6}
                className="w-full pr-16 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                {showPwd ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Mínimo 6 caracteres. El usuario podrá cambiarla después.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Repetir contraseña *</label>
            <input
              type={showPwd ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* Tabs deshabilitadas como placeholder visual */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex gap-1 border-b border-gray-200 px-4">
          {["Configuraciones", "Accesos", "Permisos", "Sesiones de Usuario"].map(t => (
            <button
              key={t}
              type="button"
              disabled
              title="Disponible después de crear el usuario"
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-gray-300 cursor-not-allowed"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-6 text-sm text-gray-400 italic text-center">
          Una vez creado el usuario vas a poder configurar Cajas, Depósitos, Permisos y ver Sesiones desde la ficha del usuario.
        </div>
      </div>
    </form>
  )
}

// ─── Tab Sesiones de Usuario ─────────────────────────────────────────────────

function TabSesiones({ usuarioId, esSuperusuarioActual }: { usuarioId: number; esSuperusuarioActual: boolean }) {
  const [sesiones, setSesiones] = useState<SesionRow[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [cerrandoId, setCerrandoId] = useState<number | null>(null)

  // Filtros
  const [soloActivas, setSoloActivas] = useState(false)
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [tipoCierreFiltro, setTipoCierreFiltro] = useState("")

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    const params = new URLSearchParams()
    if (soloActivas)         params.set("solo_activas", "1")
    if (desde)               params.set("desde", desde)
    if (hasta)               params.set("hasta", hasta)
    if (tipoCierreFiltro)    params.set("tipo_cierre", tipoCierreFiltro)
    fetch(`/api/usuarios/${usuarioId}/sesiones?${params.toString()}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((data: SesionRow[]) => {
        if (cancelado) return
        setSesiones(Array.isArray(data) ? data : [])
        setCargando(false)
      })
      .catch(err => {
        if (cancelado) return
        setError(err?.message ?? "Error al cargar sesiones")
        setCargando(false)
      })
    return () => { cancelado = true }
  }, [usuarioId, soloActivas, desde, hasta, tipoCierreFiltro, refreshTick])

  const cerrarForzosamente = async (sesionId: number) => {
    const razon = window.prompt("(Opcional) Razón del cierre forzado:") ?? ""
    setCerrandoId(sesionId)
    try {
      const res = await fetch(`/api/usuarios/${usuarioId}/sesiones/${sesionId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo_cierre: "forzada", terminada_por: "administrador", razon: razon || null }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body?.error ?? `Error HTTP ${res.status}`)
      } else {
        setRefreshTick(t => t + 1)
      }
    } finally {
      setCerrandoId(null)
    }
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={soloActivas}
            onChange={e => setSoloActivas(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Solo sesiones activas
        </label>

        <div className="inline-flex items-center gap-1">
          <span className="text-gray-500 text-xs">Desde</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm" />
        </div>
        <div className="inline-flex items-center gap-1">
          <span className="text-gray-500 text-xs">Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm" />
        </div>

        <div className="inline-flex items-center gap-1">
          <span className="text-gray-500 text-xs">Tipo de cierre</span>
          <select value={tipoCierreFiltro} onChange={e => setTipoCierreFiltro(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-md text-sm">
            <option value="">Todos</option>
            <option value="logout_manual">Logout manual</option>
            <option value="expirada">Expirada</option>
            <option value="invalida">Inválida</option>
            <option value="forzada">Forzada</option>
          </select>
        </div>

        <button
          onClick={() => setRefreshTick(t => t + 1)}
          className="ml-auto px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Refrescar
        </button>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-center py-2 px-3">Activa</th>
              <th className="text-left py-2 px-3">IP</th>
              <th className="text-left py-2 px-3">Ubicación</th>
              <th className="text-left py-2 px-3">SO</th>
              <th className="text-left py-2 px-3">Navegador</th>
              <th className="text-left py-2 px-3">Login</th>
              <th className="text-left py-2 px-3">Última actividad</th>
              <th className="text-left py-2 px-3">Logout</th>
              <th className="text-left py-2 px-3">Duración</th>
              <th className="text-left py-2 px-3">Tipo de cierre</th>
              <th className="text-left py-2 px-3">Terminada por</th>
              <th className="text-left py-2 px-3">Razón</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={13} className="py-12 text-center text-gray-500">Cargando sesiones...</td></tr>
            )}
            {!cargando && error && (
              <tr><td colSpan={13} className="py-12 text-center text-red-600">Error: {error}</td></tr>
            )}
            {!cargando && !error && sesiones.length === 0 && (
              <tr><td colSpan={13} className="py-12 text-center text-gray-400 italic">Sin sesiones registradas con esos filtros.</td></tr>
            )}
            {!cargando && !error && sesiones.map(s => {
              const activa = s.logout_at == null
              return (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${activa ? "bg-green-500" : "bg-gray-300"}`} title={activa ? "Activa" : "Cerrada"} />
                  </td>
                  <td className="py-2 px-3 font-mono text-xs">{s.ip ?? "—"}</td>
                  <td className="py-2 px-3 text-xs text-gray-600">{s.ubicacion ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">{s.sistema_operativo ?? "—"}</td>
                  <td className="py-2 px-3 text-xs">
                    {s.navegador ?? "—"}
                    {s.version_navegador ? <span className="text-gray-400 ml-1">{s.version_navegador}</span> : null}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-700">{formatDateTime(s.login_at)}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{formatDateTime(s.last_activity_at)}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{s.logout_at ? formatDateTime(s.logout_at) : "—"}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{calcularDuracion(s.login_at, s.logout_at ?? s.last_activity_at)}</td>
                  <td className="py-2 px-3 text-xs">{labelTipoCierre(s.tipo_cierre)}</td>
                  <td className="py-2 px-3 text-xs">{labelTerminadaPor(s.terminada_por)}</td>
                  <td className="py-2 px-3 text-xs text-gray-600 max-w-[180px] truncate" title={s.razon ?? undefined}>{s.razon ?? "—"}</td>
                  <td className="py-2 px-3">
                    {activa && esSuperusuarioActual && (
                      <button
                        onClick={() => cerrarForzosamente(s.id)}
                        disabled={cerrandoId === s.id}
                        className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                        title="Cerrar sesión forzosamente"
                      >
                        {cerrandoId === s.id ? "..." : "Cerrar"}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 italic mt-3">
        Nota: el cierre forzado marca la sesión como cerrada en el log del ERP, pero por ahora no invalida el JWT de Supabase del usuario afectado (eso requiere acceso administrativo a Supabase Auth y se agrega en una mejora futura).
      </p>
    </div>
  )
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function calcularDuracion(loginIso: string, finIso: string): string {
  const ms = new Date(finIso).getTime() - new Date(loginIso).getTime()
  if (ms < 0) return "—"
  const min = Math.floor(ms / 60000)
  if (min < 1) return "menos de 1 min"
  if (min < 60) return `${min} min`
  const hr = Math.floor(min / 60)
  const restoMin = min % 60
  if (hr < 24) return `${hr}h ${restoMin}m`
  const day = Math.floor(hr / 24)
  return `${day}d ${hr % 24}h`
}

function labelTipoCierre(t: string | null): string {
  switch (t) {
    case "logout_manual": return "Logout manual"
    case "expirada":      return "Expirada"
    case "invalida":      return "Inválida"
    case "forzada":       return "Forzada"
    default:              return "—"
  }
}

function labelTerminadaPor(t: string | null): string {
  switch (t) {
    case "usuario":        return "Usuario"
    case "sistema":        return "Sistema"
    case "administrador":  return "Administrador"
    default:               return "—"
  }
}

// ─── Modal: Ver Menú (simulación de qué ve este usuario) ─────────────────────

function ModalVerMenu({
  vistas,
  isSuperuser,
  catalogo,
  onClose,
}: {
  vistas: Record<string, boolean>
  isSuperuser: boolean
  catalogo: PermisoCatalogo[]
  onClose: () => void
}) {
  // Construimos el árbol desde el catálogo para que la simulación use exactamente
  // las mismas vistas que el form. Default: si una sub-vista no fue tocada, se asume ON.
  const vistasView = catalogo.filter(p => p.tipo === "view")
  const modulos = vistasView.filter(p => p.parent_id == null).filter(m => !!vistas[m.id])

  const subvistasDe = (idMod: string) =>
    vistasView
      .filter(p => p.parent_id === idMod)
      .filter(s => vistas[s.id] !== false) // visible si no está explícitamente apagada
      .sort((a, b) => a.orden - b.orden)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-900">Vista previa del menú</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {isSuperuser && (
            <div className="mb-3 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
              Aviso: como el usuario es Superusuario, en la práctica ve TODO igual. Esta vista previa simula solo las Vistas configuradas, ignorando ese flag.
            </div>
          )}
          {modulos.length === 0 ? (
            <div className="text-sm text-gray-400 italic py-6 text-center">
              Este usuario no tiene ninguna vista habilitada. No vería ningún módulo en el menú principal.
            </div>
          ) : (
            <ul className="space-y-2">
              {modulos.map(m => {
                const subs = subvistasDe(m.id)
                return (
                  <li key={m.id}>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      {m.label}
                    </div>
                    {subs.length > 0 && (
                      <ul className="ml-6 mt-1 space-y-0.5">
                        {subs.map(s => (
                          <li key={s.id} className="text-xs text-gray-600">• {s.label}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="border-t p-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Copiar Permisos Desde ────────────────────────────────────────────

function ModalCopiarDesde({
  usuarioActualId,
  onClose,
  onCopiar,
}: {
  usuarioActualId: number
  onClose: () => void
  onCopiar: (origen: { vistas: Record<string, boolean>; permisos: Record<string, Record<string, string | boolean>>; nombre: string }) => void
}) {
  const [usuariosLista, setUsuariosLista] = useState<UsuarioRow[]>([])
  const [filtro, setFiltro] = useState("")
  const [cargando, setCargando] = useState(true)
  const [trayendo, setTrayendo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((data: UsuarioRow[]) => {
        setUsuariosLista(Array.isArray(data) ? data.filter(u => u.id !== usuarioActualId) : [])
        setCargando(false)
      })
      .catch(() => {
        setError("No se pudo cargar la lista de usuarios.")
        setCargando(false)
      })
  }, [usuarioActualId])

  const filtrados = usuariosLista.filter(u => {
    if (!filtro.trim()) return true
    const q = filtro.toLowerCase()
    return `${u.nombre} ${u.username} ${u.email}`.toLowerCase().includes(q)
  })

  const seleccionarOrigen = async (u: UsuarioRow) => {
    setTrayendo(u.id)
    setError(null)
    try {
      const res = await fetch(`/api/usuarios/${u.id}`)
      if (!res.ok) throw new Error("HTTP " + res.status)
      const data = await res.json()
      onCopiar({
        vistas: data.vistas ?? {},
        permisos: data.permisos ?? {},
        nombre: u.nombre,
      })
    } catch {
      setError(`No se pudieron leer los permisos de ${u.nombre}.`)
      setTrayendo(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-900">Copiar Permisos Desde...</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar usuario por nombre, login o email..."
              autoFocus
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Solo se copian Vistas y Permisos puntuales. Sucursales, cajas, depósitos y datos del header no se copian.</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {cargando && <div className="p-6 text-center text-sm text-gray-500">Cargando usuarios...</div>}
          {error && <div className="p-4 text-sm text-red-600">{error}</div>}
          {!cargando && filtrados.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400 italic">
              {usuariosLista.length === 0 ? "No hay otros usuarios en el sistema todavía." : "Sin resultados para esa búsqueda."}
            </div>
          )}
          {filtrados.map(u => (
            <button
              key={u.id}
              onClick={() => seleccionarOrigen(u)}
              disabled={trayendo === u.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left border-b border-gray-100 last:border-b-0 disabled:opacity-50"
            >
              <Avatar nombre={u.nombre} url={u.avatar_url} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{u.nombre}</div>
                <div className="text-xs text-gray-500 truncate">{u.email}</div>
              </div>
              {u.is_superuser && (
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Super
                </span>
              )}
              {trayendo === u.id && <span className="text-xs text-gray-500">Cargando...</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab Configuraciones ─────────────────────────────────────────────────────

function TabConfiguraciones({
  modo,
  isActive,
  onChange,
}: {
  modo: Modo
  isActive: boolean
  onChange: (v: boolean) => void
}) {
  const disabled = modo === "lectura"
  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="cfg-active"
          checked={isActive}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
        />
        <div>
          <label htmlFor="cfg-active" className="block text-sm font-medium text-gray-900">Activo</label>
          <p className="text-xs text-gray-500 mt-0.5">
            Si se desactiva, el usuario no puede loguearse y su sesión activa se cierra automáticamente.
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-400 italic pt-4 border-t border-gray-100">
        Próximamente: zona horaria, formato de fecha, idioma, theme.
      </p>
    </div>
  )
}

// ─── Tab Accesos ─────────────────────────────────────────────────────────────

function TabAccesos({
  modo,
  draft,
  setDraft,
  usuario,
  sucursalesAll,
  cajasAll,
  depositosAll,
}: {
  modo: Modo
  draft: any
  setDraft: (d: any) => void
  usuario: UsuarioCompleto
  sucursalesAll: Sucursal[]
  cajasAll: Caja[]
  depositosAll: Deposito[]
}) {
  const editing = modo === "edicion" && draft

  // Sucursales seleccionadas (lectura: del usuario / edición: del draft)
  const sucursalesIds: number[] = editing ? draft.sucursales_ids : usuario.accesos.sucursales.map(s => s.id)
  const cajasIds: string[]      = editing ? draft.cajas_ids      : usuario.accesos.cajas.map(c => c.id)
  const depositosIds: number[]  = editing ? draft.depositos_ids  : usuario.accesos.depositos.map(d => d.id)

  const sucursalesSel = sucursalesAll.filter(s => sucursalesIds.includes(s.id))
  const sucursalesNombresSel = sucursalesSel.map(s => s.nombre)

  // Para cajas filtramos las que pertenecen a sucursales permitidas (campo varchar `sucursal`)
  const cajasDisponibles = cajasAll.filter(c => sucursalesNombresSel.includes(c.sucursal))
  const cajasSel = cajasAll.filter(c => cajasIds.includes(c.id))

  // Para depósitos: pertenencia por sucursal_id (FK)
  const depositosDisponibles = depositosAll.filter(d => d.sucursal_id == null || sucursalesIds.includes(d.sucursal_id))
  const depositosSel = depositosAll.filter(d => depositosIds.includes(d.id))

  const removerSucursal = (sid: number) => {
    if (!editing) return
    const nuevasS = draft.sucursales_ids.filter((id: number) => id !== sid)
    const sucursal = sucursalesAll.find(s => s.id === sid)
    const nombreSucursal = sucursal?.nombre ?? ""

    // Cajas y depósitos vinculados a la sucursal que se quita
    const cajasACortar = cajasAll.filter(c => cajasIds.includes(c.id) && c.sucursal === nombreSucursal)
    const depositosACortar = depositosAll.filter(d => depositosIds.includes(d.id) && d.sucursal_id === sid)

    if (cajasACortar.length + depositosACortar.length > 0) {
      const detalle: string[] = []
      if (cajasACortar.length) detalle.push(`${cajasACortar.length} caja(s)`)
      if (depositosACortar.length) detalle.push(`${depositosACortar.length} depósito(s)`)
      const ok = window.confirm(`Esta sucursal tiene ${detalle.join(" y ")} asociado(s) al usuario. Si la quitás, también se quitan esos accesos. ¿Continuar?`)
      if (!ok) return
    }

    setDraft({
      ...draft,
      sucursales_ids: nuevasS,
      cajas_ids:     draft.cajas_ids.filter((cid: string) => !cajasACortar.some(c => c.id === cid)),
      depositos_ids: draft.depositos_ids.filter((did: number) => !depositosACortar.some(d => d.id === did)),
      // Si la sucursal default queda fuera, la limpiamos
      sucursal_default_id: nuevasS.includes(draft.sucursal_default_id) ? draft.sucursal_default_id : null,
    })
  }

  const agregarSucursal = (sid: number) => {
    if (!editing || draft.sucursales_ids.includes(sid)) return
    setDraft({ ...draft, sucursales_ids: [...draft.sucursales_ids, sid] })
  }

  const removerCaja = (cid: string) => {
    if (!editing) return
    setDraft({ ...draft, cajas_ids: draft.cajas_ids.filter((id: string) => id !== cid) })
  }
  const agregarCaja = (cid: string) => {
    if (!editing || draft.cajas_ids.includes(cid)) return
    setDraft({ ...draft, cajas_ids: [...draft.cajas_ids, cid] })
  }

  const removerDeposito = (did: number) => {
    if (!editing) return
    setDraft({ ...draft, depositos_ids: draft.depositos_ids.filter((id: number) => id !== did) })
  }
  const agregarDeposito = (did: number) => {
    if (!editing || draft.depositos_ids.includes(did)) return
    setDraft({ ...draft, depositos_ids: [...draft.depositos_ids, did] })
  }

  return (
    <div className="space-y-8">
      {/* SUCURSALES PERMITIDAS */}
      <Subseccion
        titulo="Sucursales Permitidas"
        descripcion="Sucursales en las que el usuario puede operar. Debe haber al menos una y debe incluir la Sucursal default."
        editing={!!editing}
        opcionesParaAgregar={sucursalesAll.filter(s => s.activa && !sucursalesIds.includes(s.id)).map(s => ({ id: String(s.id), label: `${s.codigo} — ${s.nombre}` }))}
        onAgregar={(id) => agregarSucursal(parseInt(id, 10))}
        columnas={["Código", "Nombre", "Default"]}
        filas={sucursalesSel.map(s => [
          <span key={`c-${s.id}`} className="font-mono text-xs text-gray-700">{s.codigo}</span>,
          <span key={`n-${s.id}`} className="text-sm text-gray-900">{s.nombre}</span>,
          <span key={`d-${s.id}`} className="text-xs">
            {s.id === (editing ? draft.sucursal_default_id : usuario.sucursal_default_id) ? (
              <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Default
              </span>
            ) : null}
          </span>,
        ])}
        onRemover={editing ? (idx) => removerSucursal(sucursalesSel[idx].id) : undefined}
      />

      {/* CAJAS PERMITIDAS */}
      <Subseccion
        titulo="Cajas Permitidas"
        descripcion="Solo se pueden seleccionar cajas que pertenezcan a una sucursal incluida arriba."
        editing={!!editing}
        opcionesParaAgregar={cajasDisponibles.filter(c => c.activo && !cajasIds.includes(c.id)).map(c => ({ id: c.id, label: `${c.nombre} (${c.sucursal})` }))}
        onAgregar={(id) => agregarCaja(id)}
        columnas={["Caja", "Sucursal", "Cierre diario", "Activo"]}
        filas={cajasSel.map(c => [
          <span key={`c1-${c.id}`} className="text-sm text-gray-900">{c.nombre}</span>,
          <span key={`c2-${c.id}`} className="text-sm text-gray-700">{c.sucursal}</span>,
          <span key={`c3-${c.id}`} className="text-xs">{c.cierre_diario_obligatorio ? "Sí" : "No"}</span>,
          <span key={`c4-${c.id}`} className={`text-xs ${c.activo ? "text-green-700" : "text-gray-400"}`}>{c.activo ? "Sí" : "No"}</span>,
        ])}
        onRemover={editing ? (idx) => removerCaja(cajasSel[idx].id) : undefined}
        emptyMsg={sucursalesIds.length === 0 ? "Agregá una sucursal antes para poder seleccionar cajas." : undefined}
      />

      {/* DEPÓSITOS PERMITIDOS */}
      <Subseccion
        titulo="Depósitos Permitidos"
        descripcion="Solo se pueden seleccionar depósitos que pertenezcan a una sucursal incluida arriba."
        editing={!!editing}
        opcionesParaAgregar={depositosDisponibles.filter(d => d.activo && !depositosIds.includes(d.id)).map(d => ({ id: String(d.id), label: `${d.codigo} — ${d.nombre}` }))}
        onAgregar={(id) => agregarDeposito(parseInt(id, 10))}
        columnas={["Código", "Nombre", "Activo"]}
        filas={depositosSel.map(d => [
          <span key={`d1-${d.id}`} className="font-mono text-xs text-gray-700">{d.codigo}</span>,
          <span key={`d2-${d.id}`} className="text-sm text-gray-900">{d.nombre}</span>,
          <span key={`d3-${d.id}`} className={`text-xs ${d.activo ? "text-green-700" : "text-gray-400"}`}>{d.activo ? "Sí" : "No"}</span>,
        ])}
        onRemover={editing ? (idx) => removerDeposito(depositosSel[idx].id) : undefined}
        emptyMsg={sucursalesIds.length === 0 ? "Agregá una sucursal antes para poder seleccionar depósitos." : undefined}
      />
    </div>
  )
}

// ─── Subsección reutilizable: tabla con +Agregar ─────────────────────────────

function Subseccion({
  titulo,
  descripcion,
  editing,
  opcionesParaAgregar,
  onAgregar,
  columnas,
  filas,
  onRemover,
  emptyMsg,
}: {
  titulo: string
  descripcion: string
  editing: boolean
  opcionesParaAgregar: { id: string; label: string }[]
  onAgregar: (id: string) => void
  columnas: string[]
  filas: React.ReactNode[][]
  onRemover?: (idx: number) => void
  emptyMsg?: string
}) {
  const [agregadorAbierto, setAgregadorAbierto] = useState(false)
  const [filtroAgregar, setFiltroAgregar] = useState("")

  const opcionesFiltradas = opcionesParaAgregar.filter(o =>
    o.label.toLowerCase().includes(filtroAgregar.trim().toLowerCase())
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{descripcion}</p>
        </div>
        {editing && (
          <button
            onClick={() => { setAgregadorAbierto(true); setFiltroAgregar("") }}
            className="text-sm text-indigo-700 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              {columnas.map(c => <th key={c} className="text-left py-2 px-3 font-semibold">{c}</th>)}
              {editing && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={columnas.length + (editing ? 1 : 0)} className="py-6 text-center text-sm text-gray-400 italic">
                  {emptyMsg ?? "Sin elementos asignados."}
                </td>
              </tr>
            ) : filas.map((fila, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                {fila.map((celda, ci) => <td key={ci} className="py-2 px-3">{celda}</td>)}
                {editing && onRemover && (
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => onRemover(idx)}
                      className="text-red-500 hover:text-red-700"
                      title="Quitar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de agregar */}
      {agregadorAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAgregadorAbierto(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Agregar a {titulo}</h2>
              <button onClick={() => setAgregadorAbierto(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={filtroAgregar}
                onChange={e => setFiltroAgregar(e.target.value)}
                placeholder="Buscar..."
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="overflow-y-auto flex-1 px-2 pb-2">
              {opcionesFiltradas.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">Sin opciones disponibles.</div>
              ) : opcionesFiltradas.map(o => (
                <button
                  key={o.id}
                  onClick={() => { onAgregar(o.id); setAgregadorAbierto(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 rounded-md"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Permisos ────────────────────────────────────────────────────────────

function TabPermisos({
  modo,
  isSuperuser,
  vistas,
  permisos,
  catalogo,
  onChangeVista,
  onChangePermiso,
}: {
  modo: Modo
  isSuperuser: boolean
  vistas: Record<string, boolean>
  permisos: Record<string, Record<string, string | boolean>>
  catalogo: PermisoCatalogo[]
  onChangeVista: (modulo: string, valor: boolean) => void
  onChangePermiso: (modulo: string, key: string, valor: string | boolean) => void
}) {
  const editing = modo === "edicion"
  const disabled = !editing || isSuperuser

  // Sección A: vistas tipo "view" — split entre módulos (parent_id == null) y sub-vistas
  const vistasCatalogo    = catalogo.filter(p => p.tipo === "view")
  const modulosVista      = vistasCatalogo.filter(p => p.parent_id == null)
  const subvistasPorModulo: Record<string, PermisoCatalogo[]> = {}
  for (const v of vistasCatalogo) {
    if (v.parent_id) {
      if (!subvistasPorModulo[v.parent_id]) subvistasPorModulo[v.parent_id] = []
      subvistasPorModulo[v.parent_id].push(v)
    }
  }
  for (const mid of Object.keys(subvistasPorModulo)) {
    subvistasPorModulo[mid].sort((a, b) => a.orden - b.orden)
  }

  // Default: si la sub-vista no está explícitamente seteada, se considera ON cuando el padre está ON.
  const subvistaActiva = (idSub: string): boolean => vistas[idSub] !== false
  const moduloActivo   = (idMod: string): boolean => !!vistas[idMod]

  // Sección B: agrupar permisos puntuales (no vistas) por módulo
  const puntualesPorModulo = useMemo(() => {
    const map: Record<string, PermisoCatalogo[]> = {}
    for (const p of catalogo) {
      if (p.tipo === "view") continue
      if (!map[p.modulo]) map[p.modulo] = []
      map[p.modulo].push(p)
    }
    return map
  }, [catalogo])

  // Mapa modulo → label legible (lo tomamos del catálogo de vistas)
  const labelModulo: Record<string, string> = {}
  for (const v of vistasCatalogo) labelModulo[v.modulo] = v.label

  return (
    <div className="space-y-8">
      {isSuperuser && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900">
            <p className="font-semibold">Este usuario es Superusuario.</p>
            <p className="text-purple-800 mt-1">Ignora todas las restricciones de Vistas y Permisos puntuales. Para que estos controles tengan efecto, primero hay que destildar "Superusuario" arriba en el header.</p>
          </div>
        </div>
      )}

      {/* SECCIÓN A — VISTAS */}
      <section>
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Vistas</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            El checkbox del módulo prende o apaga el acceso completo. Adentro, cada sub-checkbox prende o apaga una vista puntual del módulo.
            Si una sub-vista no se modifica, queda visible mientras el módulo esté prendido (default).
          </p>
        </header>

        <div className="space-y-3">
          {modulosVista.map(m => {
            const subvistas = subvistasPorModulo[m.id] ?? []
            const moduloOn = moduloActivo(m.id)
            return (
              <div key={m.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Cabecera del módulo */}
                <label
                  className={`flex items-start gap-3 p-3 border-b border-gray-100 ${
                    disabled ? "bg-gray-50/50" : "bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={moduloOn}
                    disabled={disabled}
                    onChange={e => onChangeVista(m.id, e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{m.label}</div>
                    {m.descripcion && <div className="text-xs text-gray-500 mt-0.5">{m.descripcion}</div>}
                  </div>
                  {subvistas.length > 0 && (
                    <span className="text-xs text-gray-400">{subvistas.length} sub-vistas</span>
                  )}
                </label>

                {/* Sub-vistas */}
                {subvistas.length > 0 && (
                  <div className={`p-3 grid grid-cols-1 md:grid-cols-2 gap-1.5 ${!moduloOn ? "opacity-50" : ""}`}>
                    {subvistas.map(s => {
                      const checked = subvistaActiva(s.id)
                      const subDisabled = disabled || !moduloOn
                      return (
                        <label
                          key={s.id}
                          className={`flex items-start gap-2 px-3 py-1.5 rounded ${
                            subDisabled ? "" : "hover:bg-gray-50 cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={subDisabled}
                            onChange={e => onChangeVista(s.id, e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800">{s.label}</div>
                            {s.descripcion && <div className="text-[11px] text-gray-500 leading-tight">{s.descripcion}</div>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* SECCIÓN B — PERMISOS PUNTUALES */}
      <section>
        <header className="mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Permisos puntuales</h3>
          <p className="text-xs text-gray-500 mt-0.5">Permisos finos por módulo (acciones puntuales y niveles de acceso a entidades).</p>
        </header>

        {Object.keys(puntualesPorModulo).length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400 italic">
            No hay permisos puntuales configurados todavía. Se irán sumando a medida que cada módulo lo necesite.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(puntualesPorModulo).map(([modulo, perms]) => (
              <ModuloAcordeon
                key={modulo}
                modulo={modulo}
                label={labelModulo[modulo] ?? modulo}
                permisos={perms}
                vistaActiva={!!vistas[modulo]}
                valores={permisos[modulo] ?? {}}
                disabled={disabled}
                onChangePermiso={(key, val) => onChangePermiso(modulo, key, val)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ModuloAcordeon({
  modulo,
  label,
  permisos,
  vistaActiva,
  valores,
  disabled,
  onChangePermiso,
}: {
  modulo: string
  label: string
  permisos: PermisoCatalogo[]
  vistaActiva: boolean
  valores: Record<string, string | boolean>
  disabled: boolean
  onChangePermiso: (key: string, val: string | boolean) => void
}) {
  const [abierto, setAbierto] = useState(true)
  const bloqueado = !vistaActiva || disabled

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setAbierto(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {abierto ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {!vistaActiva && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3" /> Vista apagada
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{permisos.length} {permisos.length === 1 ? "permiso" : "permisos"}</span>
      </button>

      {abierto && (
        <div className={`p-4 space-y-3 ${bloqueado ? "opacity-50" : ""}`}>
          {permisos.map(p => (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{p.label}</div>
                {p.descripcion && <div className="text-xs text-gray-500 mt-0.5">{p.descripcion}</div>}
              </div>
              <div>
                {p.tipo === "checkbox" ? (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={valores[obtenerKey(p)] === true}
                      disabled={bloqueado}
                      onChange={e => onChangePermiso(obtenerKey(p), e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700">{valores[obtenerKey(p)] ? "Permitido" : "No permitido"}</span>
                  </label>
                ) : (
                  // entity / slider — 3 niveles
                  <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-xs">
                    {([
                      { v: "none", label: "Sin ver" },
                      { v: "read", label: "Solo lectura" },
                      { v: "edit", label: "Edita" },
                    ] as { v: string; label: string }[]).map(opt => {
                      const actual = (valores[obtenerKey(p)] as string) || "none"
                      const sel = actual === opt.v
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          disabled={bloqueado}
                          onClick={() => onChangePermiso(obtenerKey(p), opt.v)}
                          className={`px-3 py-1.5 ${
                            sel ? "bg-indigo-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// El id del catálogo viene como "modulo.subkey" o solo "modulo" para la entidad principal.
// Para guardar usamos solo la subkey ("_entity" si es la entidad principal, o el sufijo).
function obtenerKey(p: PermisoCatalogo): string {
  if (p.tipo === "entity") return "_entity"
  // id típico: "productos.ver_costo" → key = "ver_costo"
  const idx = p.id.indexOf(".")
  return idx >= 0 ? p.id.slice(idx + 1) : p.id
}

// ─── Campos auxiliares ───────────────────────────────────────────────────────

function CampoLectura({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className={`text-sm text-gray-900 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  )
}

function CampoEdit({
  label,
  value,
  onChange,
  type = "text",
  mono,
  lowercase,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  mono?: boolean
  lowercase?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(lowercase ? e.target.value.toLowerCase() : e.target.value)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${mono ? "font-mono" : ""}`}
      />
    </div>
  )
}
