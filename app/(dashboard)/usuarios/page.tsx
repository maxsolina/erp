"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, ShieldCheck } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { Avatar, formatRelative, type UsuarioRow } from "@/components/modulo-usuarios"

type FiltroActivo = "activo" | "inactivo" | "todos"

const GRID_COLS = "1.6fr 140px 160px 130px 110px 140px"

export default function UsuariosListingPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("configuracion", "usuarios")) router.replace("/")
  }, [canSee, router])

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("activo")
  const [soloSuperusuarios, setSoloSuperusuarios] = useState(false)

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
  }, [])

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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-amber-900">Usuarios</h1>
          <Link
            href="/usuarios/nuevo"
            className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear
          </Link>
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

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Cabecera */}
          <div className="grid border-b bg-gray-50 sticky top-0 z-10" style={{ gridTemplateColumns: GRID_COLS }}>
            <div className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Usuario</div>
            <div className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Login</div>
            <div className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal Default</div>
            <div className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</div>
            <div className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</div>
            <div className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Última conexión</div>
          </div>

          {loading && (
            <div className="py-12 text-center text-sm text-gray-500">Cargando usuarios...</div>
          )}
          {!loading && error && (
            <div className="py-12 text-center text-sm text-red-600">Error: {error}</div>
          )}
          {!loading && !error && filtrados.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-500">No se encontraron usuarios con esos filtros.</div>
          )}

          {/* Filas */}
          {!loading && !error && filtrados.map(u => (
            <Link
              key={u.id}
              href={`/usuarios/${u.id}`}
              className="grid border-b border-gray-100 hover:bg-gray-50 transition-colors"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <span className="py-3 px-4 self-center">
                <span className="flex items-center gap-3">
                  <Avatar nombre={u.nombre} url={u.avatar_url} />
                  <span>
                    <span className="text-sm font-medium text-gray-900 block">{u.nombre}</span>
                    <span className="text-xs text-gray-500 block">{u.email}</span>
                  </span>
                </span>
              </span>
              <span className="py-3 px-4 text-sm text-gray-700 font-mono self-center">{u.username}</span>
              <span className="py-3 px-4 text-sm text-gray-700 self-center">{u.sucursal_default_nombre ?? "—"}</span>
              <span className="py-3 px-4 text-center self-center">
                {u.is_superuser ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Superusuario
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Estándar</span>
                )}
              </span>
              <span className="py-3 px-4 text-center self-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {u.is_active ? "Activado" : "Inactivo"}
                </span>
              </span>
              <span className="py-3 px-4 text-sm text-gray-600 self-center">{formatRelative(u.last_login_at)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
