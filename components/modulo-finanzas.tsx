"use client"

import React, { useState, useMemo } from "react"
import {
  Plus, Trash2, Edit, X, Check, Search, ChevronDown, AlertCircle,
  CreditCard, Building2, Percent, Calendar, ToggleLeft, ToggleRight,
  Calculator, Info
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Tarjeta {
  id: number
  nombre: string
  tipo: "credito" | "debito"
  dias_presentacion: number
  dias_pago: number
  activa: boolean
}

export interface CargosGrupo {
  id: number
  nombre: string
  tipo: string
  arancel: number
  es_porcentaje: boolean
  cuenta_contable: string
}

export interface GrupoTarjeta {
  id: number
  nombre: string
  banco: string
  tipo_movimiento: string
  activo: boolean
  tarjetas_ids: number[]
  cargos: CargosGrupo[]
}

export interface RecargoTarjeta {
  id: number
  sucursal: string
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  fecha_desde: string
  fecha_hasta: string
  recargo_pct: number
  dias: { lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean; dom: boolean }
  activo: boolean
}

// ─── Initial Data ───────────────────────────────────────────────────────────

const tarjetasIniciales: Tarjeta[] = [
  { id: 1, nombre: "Visa", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true },
  { id: 2, nombre: "Mastercard", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true },
  { id: 3, nombre: "American Express", tipo: "credito", dias_presentacion: 7, dias_pago: 21, activa: true },
  { id: 4, nombre: "Cabal", tipo: "credito", dias_presentacion: 5, dias_pago: 15, activa: true },
  { id: 5, nombre: "Naranja", tipo: "credito", dias_presentacion: 5, dias_pago: 15, activa: true },
  { id: 6, nombre: "Visa Electron", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
  { id: 7, nombre: "Master Debit", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
  { id: 8, nombre: "Maestro", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
  { id: 9, nombre: "Cabal Débito", tipo: "debito", dias_presentacion: 2, dias_pago: 3, activa: true },
]

const gruposIniciales: GrupoTarjeta[] = [
  {
    id: 1, nombre: "Viumi", banco: "Banco Macro CC ARS", tipo_movimiento: "Acreditación de Tarjeta", activo: true,
    tarjetas_ids: [1, 2, 6, 7],
    cargos: [
      { id: 1, nombre: "Comisión", tipo: "Gasto", arancel: 2.75, es_porcentaje: true, cuenta_contable: "Comisiones Tarjeta" },
      { id: 2, nombre: "IVA sobre comisión", tipo: "Gasto", arancel: 21, es_porcentaje: true, cuenta_contable: "IVA Crédito Fiscal" },
    ]
  },
  {
    id: 2, nombre: "Payway", banco: "Banco Galicia ARS", tipo_movimiento: "Acreditación de Tarjeta", activo: true,
    tarjetas_ids: [1, 2, 3, 6, 7],
    cargos: [
      { id: 1, nombre: "Comisión", tipo: "Gasto", arancel: 2.5, es_porcentaje: true, cuenta_contable: "Comisiones Tarjeta" },
      { id: 2, nombre: "IVA sobre comisión", tipo: "Gasto", arancel: 21, es_porcentaje: true, cuenta_contable: "IVA Crédito Fiscal" },
      { id: 3, nombre: "Retención IIBB", tipo: "Gasto", arancel: 3, es_porcentaje: true, cuenta_contable: "Retenciones IIBB" },
    ]
  },
]

const recargosIniciales: RecargoTarjeta[] = [
  {
    id: 1, sucursal: "Puerto Norte", tarjeta_id: 1, grupo_id: 1,
    desde_cuota: 1, hasta_cuota: 1, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31",
    recargo_pct: 0, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
  {
    id: 2, sucursal: "Puerto Norte", tarjeta_id: 1, grupo_id: 1,
    desde_cuota: 2, hasta_cuota: 3, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31",
    recargo_pct: 9, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
  {
    id: 3, sucursal: "Puerto Norte", tarjeta_id: 1, grupo_id: 1,
    desde_cuota: 4, hasta_cuota: 6, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31",
    recargo_pct: 18, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
  {
    id: 4, sucursal: "Puerto Norte", tarjeta_id: 2, grupo_id: 1,
    desde_cuota: 1, hasta_cuota: 3, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31",
    recargo_pct: 8, activo: true,
    dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPct(n: number) {
  return `${n.toFixed(2)}%`
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)
}

const DIAS_LABELS = [
  { key: "lun", label: "L" }, { key: "mar", label: "M" }, { key: "mie", label: "X" },
  { key: "jue", label: "J" }, { key: "vie", label: "V" }, { key: "sab", label: "S" },
  { key: "dom", label: "D" },
] as const

const SUCURSALES = ["Puerto Norte", "Centro", "Rosario Central"]
const CUOTAS_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "gray" | "emerald" | "blue" | "amber" | "red" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>{children}</span>
}

// ─── Sección Tarjetas ────────────────────────────────────────────────────────

function SeccionTarjetas({ tarjetas, setTarjetas }: { tarjetas: Tarjeta[]; setTarjetas: React.Dispatch<React.SetStateAction<Tarjeta[]>> }) {
  const [editando, setEditando] = useState<Tarjeta | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<Tarjeta>>({})

  const abrirCrear = () => {
    setForm({ nombre: "", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true })
    setCreando(true)
    setEditando(null)
  }

  const abrirEditar = (t: Tarjeta) => {
    setForm({ ...t })
    setEditando(t)
    setCreando(false)
  }

  const guardar = () => {
    if (!form.nombre?.trim()) return
    if (creando) {
      setTarjetas(prev => [...prev, { ...form, id: Date.now() } as Tarjeta])
    } else if (editando) {
      setTarjetas(prev => prev.map(t => t.id === editando.id ? { ...t, ...form } as Tarjeta : t))
    }
    setCreando(false)
    setEditando(null)
    setForm({})
  }

  const cancelar = () => { setCreando(false); setEditando(null); setForm({}) }
  const eliminar = (id: number) => setTarjetas(prev => prev.filter(t => t.id !== id))

  return (
    <div>
      <SectionHeader title="Tarjetas">
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800 transition-colors">
          <Plus className="w-4 h-4" /> Nueva Tarjeta
        </button>
      </SectionHeader>

      {/* Form inline */}
      {(creando || editando) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-emerald-900 mb-4">{creando ? "Nueva Tarjeta" : "Editar Tarjeta"}</h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.tipo || "credito"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as "credito" | "debito" }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Días presentación</label>
              <input type="number" value={form.dias_presentacion ?? ""} onChange={e => setForm(f => ({ ...f, dias_presentacion: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Días pago</label>
              <input type="number" value={form.dias_pago ?? ""} onChange={e => setForm(f => ({ ...f, dias_pago: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))}
                className="rounded" />
              Activa
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={cancelar} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Nombre</th>
              <th className="text-left py-3 px-4">Tipo</th>
              <th className="text-center py-3 px-4">Días Presentación</th>
              <th className="text-center py-3 px-4">Días Pago</th>
              <th className="text-center py-3 px-4">Estado</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {tarjetas.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" /> {t.nombre}
                </td>
                <td className="py-3 px-4">
                  <Badge color={t.tipo === "credito" ? "blue" : "emerald"}>{t.tipo === "credito" ? "Crédito" : "Débito"}</Badge>
                </td>
                <td className="py-3 px-4 text-center text-sm">{t.dias_presentacion} días</td>
                <td className="py-3 px-4 text-center text-sm">{t.dias_pago} días</td>
                <td className="py-3 px-4 text-center">
                  <Badge color={t.activa ? "emerald" : "gray"}>{t.activa ? "Activa" : "Inactiva"}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrirEditar(t)} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => eliminar(t.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tarjetas.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay tarjetas configuradas</div>}
      </div>
    </div>
  )
}

// ─── Sección Grupos de Tarjetas ──────────────────────────────────────────────

function SeccionGrupos({ tarjetas, grupos, setGrupos }: { tarjetas: Tarjeta[]; grupos: GrupoTarjeta[]; setGrupos: React.Dispatch<React.SetStateAction<GrupoTarjeta[]>> }) {
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoTarjeta | null>(null)
  const [tab, setTab] = useState<"tarjetas" | "cargos">("tarjetas")
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<GrupoTarjeta>>({})
  const [editandoCargo, setEditandoCargo] = useState<CargosGrupo | null>(null)
  const [creandoCargo, setCreandoCargo] = useState(false)
  const [formCargo, setFormCargo] = useState<Partial<CargosGrupo>>({})

  const abrirCrear = () => {
    setForm({ nombre: "", banco: "", tipo_movimiento: "Acreditación de Tarjeta", activo: true, tarjetas_ids: [], cargos: [] })
    setCreando(true)
    setSelectedGrupo(null)
  }

  const guardarGrupo = () => {
    if (!form.nombre?.trim()) return
    if (creando) {
      const nuevo: GrupoTarjeta = { ...form, id: Date.now() } as GrupoTarjeta
      setGrupos(prev => [...prev, nuevo])
      setSelectedGrupo(nuevo)
    } else if (selectedGrupo) {
      const updated = { ...selectedGrupo, ...form } as GrupoTarjeta
      setGrupos(prev => prev.map(g => g.id === selectedGrupo.id ? updated : g))
      setSelectedGrupo(updated)
    }
    setCreando(false)
  }

  const toggleTarjeta = (id: number) => {
    const ids = form.tarjetas_ids || []
    setForm(f => ({ ...f, tarjetas_ids: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] }))
  }

  const guardarCargo = () => {
    if (!formCargo.nombre?.trim()) return
    if (creandoCargo) {
      const nuevo = { ...formCargo, id: Date.now() } as CargosGrupo
      const cargos = [...(form.cargos || []), nuevo]
      setForm(f => ({ ...f, cargos }))
    } else if (editandoCargo) {
      const cargos = (form.cargos || []).map(c => c.id === editandoCargo.id ? { ...c, ...formCargo } as CargosGrupo : c)
      setForm(f => ({ ...f, cargos }))
    }
    setCreandoCargo(false)
    setEditandoCargo(null)
    setFormCargo({})
  }

  const eliminarCargo = (id: number) => {
    setForm(f => ({ ...f, cargos: (f.cargos || []).filter(c => c.id !== id) }))
  }

  const seleccionarGrupo = (g: GrupoTarjeta) => {
    setSelectedGrupo(g)
    setForm({ ...g })
    setCreando(false)
    setTab("tarjetas")
  }

  const guardarCambios = () => {
    if (!selectedGrupo) return
    const updated = { ...selectedGrupo, ...form } as GrupoTarjeta
    setGrupos(prev => prev.map(g => g.id === selectedGrupo.id ? updated : g))
    setSelectedGrupo(updated)
  }

  return (
    <div>
      <SectionHeader title="Grupos de Tarjetas">
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">
          <Plus className="w-4 h-4" /> Nuevo Grupo
        </button>
      </SectionHeader>

      <div className="grid grid-cols-4 gap-6">
        {/* Lista de grupos */}
        <div className="col-span-1 space-y-2">
          {grupos.map(g => (
            <button key={g.id} onClick={() => seleccionarGrupo(g)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selectedGrupo?.id === g.id && !creando ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-white border-gray-200 hover:border-gray-300"}`}>
              <div className="font-medium text-sm">{g.nombre}</div>
              <div className="text-xs text-gray-500 mt-0.5">{g.banco}</div>
              <Badge color={g.activo ? "emerald" : "gray"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
            </button>
          ))}
          {grupos.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin grupos</p>}
        </div>

        {/* Detalle del grupo */}
        <div className="col-span-3">
          {(selectedGrupo || creando) ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Header del grupo */}
              <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                    <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
                    <input value={form.banco || ""} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm mb-1.5">
                      <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                      Activo
                    </label>
                    {creando ? (
                      <button onClick={guardarGrupo} className="ml-auto px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Crear Grupo</button>
                    ) : (
                      <button onClick={guardarCambios} className="ml-auto px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Guardar</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                {(["tarjetas", "cargos"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t === "tarjetas" ? "Tarjetas" : "Cargos"}
                  </button>
                ))}
              </div>

              {tab === "tarjetas" && (
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3">Seleccioná las tarjetas asociadas a este grupo:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {tarjetas.map(t => (
                      <label key={t.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${(form.tarjetas_ids || []).includes(t.id) ? "bg-emerald-50 border-emerald-300" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="checkbox" checked={(form.tarjetas_ids || []).includes(t.id)} onChange={() => toggleTarjeta(t.id)} className="rounded" />
                        <span className="text-sm">{t.nombre}</span>
                        <Badge color={t.tipo === "credito" ? "blue" : "emerald"}>{t.tipo === "credito" ? "C" : "D"}</Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tab === "cargos" && (
                <div className="p-4">
                  {(creandoCargo || editandoCargo) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del cargo</label>
                          <input value={formCargo.nombre || ""} onChange={e => setFormCargo(f => ({ ...f, nombre: e.target.value }))}
                            placeholder="Ej: Comisión, IVA, Retención IIBB"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Arancel %</label>
                          <input type="number" step="0.01" value={formCargo.arancel ?? ""} onChange={e => setFormCargo(f => ({ ...f, arancel: parseFloat(e.target.value) }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta contable</label>
                          <input value={formCargo.cuenta_contable || ""} onChange={e => setFormCargo(f => ({ ...f, cuenta_contable: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-end">
                        <button onClick={() => { setCreandoCargo(false); setEditandoCargo(null); setFormCargo({}) }} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
                        <button onClick={guardarCargo} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Guardar cargo</button>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2 px-3">Nombre</th>
                        <th className="text-right py-2 px-3">Arancel %</th>
                        <th className="text-left py-2 px-3">Cuenta Contable</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.cargos || []).map(c => (
                        <tr key={c.id} className="border-b">
                          <td className="py-2 px-3 font-medium">{c.nombre}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatPct(c.arancel)}</td>
                          <td className="py-2 px-3 text-gray-500">{c.cuenta_contable}</td>
                          <td className="py-2 px-3">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditandoCargo(c); setFormCargo({ ...c }); setCreandoCargo(false) }} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => eliminarCargo(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(form.cargos || []).length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin cargos configurados</p>}
                  <button onClick={() => { setCreandoCargo(true); setEditandoCargo(null); setFormCargo({ tipo: "Gasto", es_porcentaje: true }) }}
                    className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    <Plus className="w-4 h-4" /> Agregar cargo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              Seleccioná un grupo para editarlo o creá uno nuevo
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sección Recargos ────────────────────────────────────────────────────────

function SeccionRecargos({ tarjetas, grupos, recargos, setRecargos }: {
  tarjetas: Tarjeta[]; grupos: GrupoTarjeta[]
  recargos: RecargoTarjeta[]; setRecargos: React.Dispatch<React.SetStateAction<RecargoTarjeta[]>>
}) {
  const [editando, setEditando] = useState<RecargoTarjeta | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<RecargoTarjeta>>({})
  const [soloActivos, setSoloActivos] = useState(true)

  const recFiltrados = useMemo(() => soloActivos ? recargos.filter(r => r.activo) : recargos, [recargos, soloActivos])

  const diasDefault = { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }

  const abrirCrear = () => {
    setForm({ sucursal: "Puerto Norte", desde_cuota: 1, hasta_cuota: 1, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31", recargo_pct: 0, activo: true, dias: { ...diasDefault } })
    setCreando(true)
    setEditando(null)
  }

  const guardar = () => {
    if (!form.tarjeta_id || !form.grupo_id) return
    if (creando) {
      setRecargos(prev => [...prev, { ...form, id: Date.now() } as RecargoTarjeta])
    } else if (editando) {
      setRecargos(prev => prev.map(r => r.id === editando.id ? { ...r, ...form } as RecargoTarjeta : r))
    }
    setCreando(false)
    setEditando(null)
    setForm({})
  }

  const cancelar = () => { setCreando(false); setEditando(null); setForm({}) }

  const tarjetaById = (id: number) => tarjetas.find(t => t.id === id)
  const grupoById = (id: number) => grupos.find(g => g.id === id)

  return (
    <div>
      <SectionHeader title="Recargos de Tarjetas">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} className="rounded" />
          Solo vigentes
        </label>
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">
          <Plus className="w-4 h-4" /> Nuevo Recargo
        </button>
      </SectionHeader>

      {(creando || editando) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-emerald-900 mb-4">{creando ? "Nuevo Recargo" : "Editar Recargo"}</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={form.sucursal || ""} onChange={e => setForm(f => ({ ...f, sucursal: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta</label>
              <select value={form.tarjeta_id || ""} onChange={e => setForm(f => ({ ...f, tarjeta_id: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {tarjetas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Banco / Grupo</label>
              <select value={form.grupo_id || ""} onChange={e => setForm(f => ({ ...f, grupo_id: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recargo %</label>
              <input type="number" step="0.01" value={form.recargo_pct ?? ""} onChange={e => setForm(f => ({ ...f, recargo_pct: parseFloat(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Desde cuota</label>
              <input type="number" min="1" value={form.desde_cuota ?? ""} onChange={e => setForm(f => ({ ...f, desde_cuota: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hasta cuota</label>
              <input type="number" min="1" value={form.hasta_cuota ?? ""} onChange={e => setForm(f => ({ ...f, hasta_cuota: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha desde</label>
              <input type="date" value={form.fecha_desde || ""} onChange={e => setForm(f => ({ ...f, fecha_desde: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input type="date" value={form.fecha_hasta || ""} onChange={e => setForm(f => ({ ...f, fecha_hasta: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-medium text-gray-700">Días que aplica:</span>
            {DIAS_LABELS.map(({ key, label }) => (
              <label key={key} className={`flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer text-sm font-medium transition-colors ${form.dias?.[key] ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"}`}>
                <input type="checkbox" className="hidden" checked={form.dias?.[key] ?? false}
                  onChange={e => setForm(f => ({ ...f, dias: { ...(f.dias || diasDefault), [key]: e.target.checked } }))} />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm ml-4">
              <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
              Activo
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelar} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
            <button onClick={guardar} className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800">Guardar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Sucursal</th>
              <th className="text-left py-3 px-4">Tarjeta</th>
              <th className="text-left py-3 px-4">Grupo</th>
              <th className="text-center py-3 px-4">Cuotas</th>
              <th className="text-center py-3 px-4">Vigencia</th>
              <th className="text-center py-3 px-4">Recargo</th>
              <th className="text-center py-3 px-4">Días</th>
              <th className="text-center py-3 px-4">Estado</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {recFiltrados.map(r => {
              const tarj = tarjetaById(r.tarjeta_id)
              const grp = grupoById(r.grupo_id)
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{r.sucursal}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{tarj?.nombre ?? r.tarjeta_id}</div>
                    {tarj && <Badge color={tarj.tipo === "credito" ? "blue" : "emerald"}>{tarj.tipo === "credito" ? "Crédito" : "Débito"}</Badge>}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{grp?.nombre ?? r.grupo_id}</td>
                  <td className="py-3 px-4 text-center font-mono">{r.desde_cuota === r.hasta_cuota ? `${r.desde_cuota}c` : `${r.desde_cuota}-${r.hasta_cuota}c`}</td>
                  <td className="py-3 px-4 text-center text-xs text-gray-500">{r.fecha_desde} → {r.fecha_hasta}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-bold text-sm ${r.recargo_pct > 0 ? "text-amber-700" : "text-gray-500"}`}>{formatPct(r.recargo_pct)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-0.5 justify-center">
                      {DIAS_LABELS.map(({ key, label }) => (
                        <span key={key} className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium ${r.dias[key] ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-300"}`}>{label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge color={r.activo ? "emerald" : "gray"}>{r.activo ? "Vigente" : "Inactivo"}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditando(r); setForm({ ...r }); setCreando(false) }} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setRecargos(prev => prev.filter(x => x.id !== r.id))} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {recFiltrados.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay recargos configurados</div>}
      </div>
    </div>
  )
}

// ─── Sección Simulador ───────────────────────────────────────────────────────

function SeccionSimulador({ tarjetas, grupos, recargos }: { tarjetas: Tarjeta[]; grupos: GrupoTarjeta[]; recargos: RecargoTarjeta[] }) {
  const [tarjetaId, setTarjetaId] = useState<number | "">("")
  const [cuotas, setCuotas] = useState<number>(1)
  const [monto, setMonto] = useState<string>("")
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [resultado, setResultado] = useState<null | { recargo: RecargoTarjeta; grupo: GrupoTarjeta; totalRecargo: number; desglose: { nombre: string; pct: number; importe: number }[]; totalConRecargo: number }>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)

  const calcular = () => {
    if (!tarjetaId || !monto) return
    const montoNum = parseFloat(monto.replace(/\./g, "").replace(",", "."))
    const fechaDate = new Date(fecha)
    const diaSemana = fechaDate.getDay() // 0=dom, 1=lun...
    const diasKeys: (keyof RecargoTarjeta["dias"])[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]
    const diaKey = diasKeys[diaSemana]

    const candidatos = recargos.filter(r =>
      r.tarjeta_id === tarjetaId &&
      r.activo &&
      cuotas >= r.desde_cuota &&
      cuotas <= r.hasta_cuota &&
      fecha >= r.fecha_desde &&
      fecha <= r.fecha_hasta &&
      r.dias[diaKey]
    )

    if (candidatos.length === 0) { setResultado(null); setNoEncontrado(true); return }
    // Toma el más específico (menor rango de cuotas)
    const mejor = candidatos.sort((a, b) => (a.hasta_cuota - a.desde_cuota) - (b.hasta_cuota - b.desde_cuota))[0]
    const grupo = grupos.find(g => g.id === mejor.grupo_id)!
    const importeRecargo = montoNum * (mejor.recargo_pct / 100)
    const desglose = (grupo?.cargos || []).map(c => ({
      nombre: c.nombre, pct: c.arancel, importe: montoNum * (c.arancel / 100)
    }))
    const totalRecargo = importeRecargo + desglose.reduce((s, d) => s + d.importe, 0)
    setResultado({ recargo: mejor, grupo, totalRecargo, desglose: [{ nombre: `Recargo ${mejor.recargo_pct}%`, pct: mejor.recargo_pct, importe: importeRecargo }, ...desglose], totalConRecargo: montoNum + totalRecargo })
    setNoEncontrado(false)
  }

  const montoNum = parseFloat(monto.replace(/\./g, "").replace(",", ".")) || 0

  return (
    <div>
      <SectionHeader title="Simulador de Recargos" />

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-600" /> Parámetros</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarjeta</label>
            <select value={tarjetaId} onChange={e => setTarjetaId(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="">Seleccionar tarjeta...</option>
              {tarjetas.filter(t => t.activa).map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.tipo})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas</label>
            <div className="flex gap-2 flex-wrap">
              {CUOTAS_OPTIONS.map(c => (
                <button key={c} onClick={() => setCuotas(c)}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors ${cuotas === c ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"}`}>
                  {c}c
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto (ARS)</label>
            <input type="text" placeholder="Ej: 50000" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>
          <button onClick={calcular} disabled={!tarjetaId || !monto}
            className="w-full py-2 bg-emerald-700 text-white rounded-md font-medium hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            Calcular recargo
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-amber-600" /> Resultado</h3>
          {!resultado && !noEncontrado && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Calculator className="w-10 h-10 text-gray-300" />
              <p className="text-sm">Completá los parámetros y calculá</p>
            </div>
          )}
          {noEncontrado && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">No se encontró un recargo configurado para la combinación seleccionada. Verificá la configuración.</p>
            </div>
          )}
          {resultado && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Tarjeta:</span><span className="font-medium">{tarjetas.find(t => t.id === tarjetaId)?.nombre} — {cuotas} cuota{cuotas > 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Grupo:</span><span className="font-medium">{resultado.grupo?.nombre}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Monto base:</span><span className="font-medium">{formatCurrency(montoNum)}</span>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-800 text-white text-xs font-semibold uppercase px-4 py-2">Desglose de recargo</div>
                <table className="w-full text-sm">
                  <tbody>
                    {resultado.desglose.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 px-4 text-gray-700">{d.nombre}</td>
                        <td className="py-2 px-4 text-right text-gray-500 font-mono">{formatPct(d.pct)}</td>
                        <td className="py-2 px-4 text-right font-medium">{formatCurrency(d.importe)}</td>
                      </tr>
                    ))}
                    <tr className="bg-amber-50">
                      <td className="py-2.5 px-4 font-semibold text-amber-900">Total recargo</td>
                      <td className="py-2.5 px-4"></td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-700">{formatCurrency(resultado.totalRecargo)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-900 rounded-lg p-4 text-white flex justify-between items-center">
                <span className="font-semibold">Total con recargo:</span>
                <span className="text-xl font-bold">{formatCurrency(resultado.totalConRecargo)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { key: "tarjetas", label: "Tarjetas", icon: CreditCard },
  { key: "grupos", label: "Grupos de Tarjetas", icon: Building2 },
  { key: "recargos", label: "Recargos de Tarjetas", icon: Percent },
  { key: "simulador", label: "Simulador de Recargos", icon: Calculator },
] as const

type MenuKey = typeof MENU_ITEMS[number]["key"]

// Export de los datos para que ventas-module pueda usarlos
export { tarjetasIniciales, gruposIniciales, recargosIniciales }
export type { RecargoTarjeta as RecargoTarjetaType }

export default function ModuloFinanzas() {
  const [activeItem, setActiveItem] = useState<MenuKey>("tarjetas")
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(tarjetasIniciales)
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>(gruposIniciales)
  const [recargos, setRecargos] = useState<RecargoTarjeta[]>(recargosIniciales)

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 fixed top-11 left-0 bottom-0 overflow-y-auto shadow-sm">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Finanzas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configuración</p>
          </div>
          <nav className="p-2">
            {MENU_ITEMS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveItem(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors mb-0.5 ${activeItem === key ? "bg-emerald-50 text-emerald-800 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"}`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${activeItem === key ? "text-emerald-600" : "text-gray-400"}`} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="ml-56 flex-1 p-6 min-h-[calc(100vh-44px)]">
          {activeItem === "tarjetas" && <SeccionTarjetas tarjetas={tarjetas} setTarjetas={setTarjetas} />}
          {activeItem === "grupos" && <SeccionGrupos tarjetas={tarjetas} grupos={grupos} setGrupos={setGrupos} />}
          {activeItem === "recargos" && <SeccionRecargos tarjetas={tarjetas} grupos={grupos} recargos={recargos} setRecargos={setRecargos} />}
          {activeItem === "simulador" && <SeccionSimulador tarjetas={tarjetas} grupos={grupos} recargos={recargos} />}
        </main>
      </div>
    </div>
  )
}
