"use client"

import { useState, useEffect, useMemo } from "react"
import { useERP, Sucursal } from "@/contexts/erp-context"
import { Plus, Pencil, Trash2, Check, X, Building2, Users } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface UsuarioSucursalRow {
  id: number
  usuario_id: number
  sucursal_id: number
  es_principal: boolean
  ver_nv_otras_sucursales: boolean
}

export const FORM_SUCURSAL_VACIO = {
  codigo: "",
  nombre: "",
  direccion: "",
  telefono: "",
  deposito_id: "" as number | "",
  activa: true,
}

// alias interno
const FORM_VACIO = FORM_SUCURSAL_VACIO

// ─── Formulario Sucursal ─────────────────────────────────────────────────────

export function FormSucursal({
  initial,
  depositos,
  onGuardar,
  onCancelar,
  guardando,
  error,
}: {
  initial: typeof FORM_VACIO
  depositos: { id: number; nombre: string }[]
  onGuardar: (data: typeof FORM_VACIO) => void
  onCancelar: () => void
  guardando: boolean
  error: string | null
}) {
  const [form, setForm] = useState(initial)
  const set = (k: keyof typeof FORM_VACIO, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700">
          {initial.codigo ? `Editar sucursal: ${initial.nombre}` : "Nueva Sucursal"}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(form)}
            disabled={guardando}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Codigo *</label>
          <input
            value={form.codigo}
            onChange={e => set("codigo", e.target.value.toUpperCase())}
            placeholder="PN"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
          <input
            value={form.nombre}
            onChange={e => set("nombre", e.target.value)}
            placeholder="Puerto Norte"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Direccion</label>
          <input
            value={form.direccion}
            onChange={e => set("direccion", e.target.value)}
            placeholder="Av. Rivadavia 1234"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Telefono</label>
          <input
            value={form.telefono}
            onChange={e => set("telefono", e.target.value)}
            placeholder="0341-4561234"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Deposito principal</label>
          <select
            value={form.deposito_id}
            onChange={e => set("deposito_id", e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Sin deposito</option>
            {depositos.map(d => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            id="activa-check"
            type="checkbox"
            checked={form.activa}
            onChange={e => set("activa", e.target.checked)}
            className="rounded border-gray-300 text-indigo-600"
          />
          <label htmlFor="activa-check" className="text-sm text-gray-700">Activa</label>
        </div>
      </div>
    </div>
  )
}

// ─── Panel asignación de usuarios ────────────────────────────────────────────

export function PanelUsuarios({
  sucursal,
  onClose,
}: {
  sucursal: Sucursal
  onClose: () => void
}) {
  const { usuarios } = useERP()
  const [asignaciones, setAsignaciones] = useState<UsuarioSucursalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/usuario-sucursales?sucursal_id=${sucursal.id}`)
      .then(r => r.json())
      .then(asig => setAsignaciones(asig ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sucursal.id])

  const toggleAsignacion = async (usuarioId: number, campo: "es_principal" | "ver_nv_otras_sucursales", valor: boolean) => {
    setGuardando(usuarioId)
    const existe = asignaciones.find(a => a.usuario_id === usuarioId)
    if (!existe && valor === false) { setGuardando(null); return }
    try {
      if (!existe) {
        const res = await fetch("/api/usuario-sucursales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: usuarioId, sucursal_id: sucursal.id, [campo]: valor }),
        })
        const created = await res.json()
        setAsignaciones(prev => [created, ...prev])
      } else {
        const updated = { ...existe, [campo]: valor }
        await fetch("/api/usuario-sucursales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario_id: usuarioId, sucursal_id: sucursal.id, es_principal: updated.es_principal, ver_nv_otras_sucursales: updated.ver_nv_otras_sucursales }),
        })
        setAsignaciones(prev => prev.map(a => a.usuario_id === usuarioId ? updated : a))
      }
    } catch (e) { console.error(e) }
    setGuardando(null)
  }

  const quitarAsignacion = async (usuarioId: number) => {
    setGuardando(usuarioId)
    await fetch(`/api/usuario-sucursales?usuario_id=${usuarioId}&sucursal_id=${sucursal.id}`, { method: "DELETE" })
    setAsignaciones(prev => prev.filter(a => a.usuario_id !== usuarioId))
    setGuardando(null)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Usuarios — {sucursal.nombre}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-gray-400 py-10 text-sm">Cargando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                  <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Habilitado</th>
                  <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal principal</th>
                  <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Ver NV otras sucursales</th>
                  <th className="py-2 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const asig = asignaciones.find(a => a.usuario_id === u.id)
                  const habilitado = !!asig
                  const loading = guardando === u.id
                  return (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{u.nombre} <span className="text-gray-400 font-normal">({u.username})</span></td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={habilitado}
                          disabled={loading}
                          onChange={e => {
                            if (e.target.checked) {
                              fetch("/api/usuario-sucursales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario_id: u.id, sucursal_id: sucursal.id }) })
                                .then(r => r.json()).then(created => setAsignaciones(prev => [created, ...prev]))
                            } else {
                              quitarAsignacion(u.id)
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={asig?.es_principal ?? false}
                          disabled={!habilitado || loading}
                          onChange={e => toggleAsignacion(u.id, "es_principal", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={asig?.ver_nv_otras_sucursales ?? false}
                          disabled={!habilitado || loading}
                          onChange={e => toggleAsignacion(u.id, "ver_nv_otras_sucursales", e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {habilitado && (
                          <button
                            onClick={() => quitarAsignacion(u.id)}
                            disabled={loading}
                            className="text-red-400 hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ModuloConfigSucursales() {
  const { sucursales, setSucursales } = useERP()
  const [depositos, setDepositos] = useState<{ id: number; nombre: string }[]>([])
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Sucursal | null>(null)
  const [verUsuarios, setVerUsuarios] = useState<Sucursal | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/depositos")
      .then(r => r.ok ? r.json() : [])
      .then(d => setDepositos(Array.isArray(d) ? d : []))
      .catch(() => setDepositos([]))
  }, [])

  const handleGuardar = async (form: typeof FORM_VACIO) => {
    if (!form.codigo.trim() || !form.nombre.trim()) { setError("Codigo y nombre son obligatorios"); return }
    setError(null)
    setGuardando(true)
    try {
      const payload = { ...form, deposito_id: form.deposito_id === "" ? null : form.deposito_id }
      if (editando) {
        const res = await fetch(`/api/sucursales/${editando.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const updated = await res.json()
        setSucursales(prev => prev.map(s => s.id === editando.id ? updated : s))
        setEditando(null)
      } else {
        const res = await fetch("/api/sucursales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        const created = await res.json()
        setSucursales(prev => [created, ...prev])
        setCreando(false)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta sucursal?")) return
    const res = await fetch(`/api/sucursales/${id}`, { method: "DELETE" })
    if (res.ok) setSucursales(prev => prev.filter(s => s.id !== id))
  }

  const sucursalesFiltradas = useMemo(() => {
    let result = [...sucursales]

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(s =>
        s.codigo.toLowerCase().includes(q)
        || s.nombre.toLowerCase().includes(q)
        || String(s.direccion ?? "").toLowerCase().includes(q)
        || String(s.telefono ?? "").toLowerCase().includes(q),
      )
    }

    for (const filter of activeFilters) {
      result = result.filter(s => String((s as any)[filter.field] ?? "") === filter.value)
    }

    return result
  }, [sucursales, searchTerm, activeFilters])

  const filterOptions = useMemo(
    () => [
      {
        field: "activa",
        label: "Estado",
        values: [
          { value: "true", label: "Activas" },
          { value: "false", label: "Inactivas" },
        ],
      },
    ],
    [],
  )

  const groupByOptions: GroupByOption[] = [
    { id: "activa", label: "Estado", field: "activa" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-amber-900">Sucursales</h2>
        {!creando && !editando && (
          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"
          >
            <Plus className="w-4 h-4" />
            Nueva sucursal
          </button>
        )}
      </div>

      <OdooFilterBar
        moduleName="sucursales"
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={searchTerm}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearchTerm}
        savedFilters={savedFilters}
        onSaveFilter={(filter) => setSavedFilters(prev => [...prev, { ...filter, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
        onApplyFilter={(filter) => {
          setActiveFilters(filter.filters)
          setActiveGroupBy(filter.groupBy)
        }}
        totalCount={sucursales.length}
        filteredCount={sucursalesFiltradas.length}
      />

      {creando && (
        <FormSucursal
          initial={FORM_VACIO}
          depositos={depositos}
          onGuardar={handleGuardar}
          onCancelar={() => { setCreando(false); setError(null) }}
          guardando={guardando}
          error={error}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Codigo</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Direccion</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Telefono</th>
              <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Activa</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {sucursalesFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10">
                  No hay sucursales. Crea la primera.
                </td>
              </tr>
            )}
            {sucursalesFiltradas.map(s => (
              <>
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-gray-600">{s.codigo}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{s.nombre}</td>
                  <td className="px-5 py-3 text-gray-500">{s.direccion ?? "—"}</td>
                  <td className="px-5 py-3 text-gray-500">{s.telefono ?? "—"}</td>
                  <td className="px-3 py-3 text-center">
                    {s.activa
                      ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                      : <X className="w-4 h-4 text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setVerUsuarios(s)}
                        title="Usuarios"
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditando(s)
                          setCreando(false)
                          setError(null)
                        }}
                        title="Editar"
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(s.id)}
                        title="Eliminar"
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {editando?.id === s.id && (
                  <tr key={`edit-${s.id}`}>
                    <td colSpan={6} className="px-4 py-3 bg-gray-50">
                      <FormSucursal
                        initial={{
                          codigo: s.codigo,
                          nombre: s.nombre,
                          direccion: s.direccion ?? "",
                          telefono: s.telefono ?? "",
                          deposito_id: s.deposito_id ?? "",
                          activa: s.activa,
                        }}
                        depositos={depositos}
                        onGuardar={handleGuardar}
                        onCancelar={() => { setEditando(null); setError(null) }}
                        guardando={guardando}
                        error={error}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {verUsuarios && (
        <PanelUsuarios sucursal={verUsuarios} onClose={() => setVerUsuarios(null)} />
      )}
    </div>
  )
}
