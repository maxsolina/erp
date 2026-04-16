"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import ReactDOM from "react-dom"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import {
  BookOpen, ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Check,
  Calendar, FileText, Layers, BarChart2, Settings, TrendingUp, Coins,
  DollarSign, ArrowLeft, AlertCircle, Eye, RefreshCw, Search,
  Building2, ListOrdered, Scale, PieChart, BookMarked, Archive, Save,
} from "lucide-react"

// â”€â”€â”€ TIPOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AnoFiscal {
  id: string
  nombre: string
  codigo: string
  fecha_inicio: string
  fecha_fin: string
  estado: "aprobado" | "cerrado"
  contabilidad_periodos?: Periodo[]
}

interface Periodo {
  id: string
  ano_fiscal_id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: "aprobado" | "para_cerrar" | "cerrado"
  volcado: boolean
}

interface TipoCuenta {
  id: string
  nombre: string
  codigo: string
  es_resultado: boolean
  categoria_balance_pyg?: string
  metodo_diferimiento: "ninguno" | "mensual" | "anual"
  activo: boolean
}

interface CuentaContable {
  id: string
  codigo: string
  nombre: string
  cuenta_padre_id?: string
  tipo_interno: "regular" | "liquidez" | "a_cobrar" | "a_pagar"
  tipo_cuenta_id?: string
  tipo_cuenta?: TipoCuenta
  padre?: { id: string; codigo: string; nombre: string }
  activo: boolean
  permite_conciliacion: boolean
  es_cuenta_puente: boolean
  es_cuenta_ventas: boolean
  es_cuenta_compras: boolean
}

interface Diario {
  id: string
  nombre: string
  codigo: string
  tipo: string
  moneda: string
  secuencia?: number
  sucursal_id?: string
  sucursal?: { id: string; nombre: string }
  caja_id?: string
  cuenta_bancaria_id?: string
  cuenta_bancaria?: { id: string; banco_nombre: string; numero_cuenta: string; moneda: string }
  es_automatico?: boolean
  cuenta_debito?: { id: string; codigo: string; nombre: string }
  cuenta_haber?: { id: string; codigo: string; nombre: string }
  cuenta_debito_predeterminada_id?: string
  cuenta_haber_predeterminada_id?: string
  filtrar_por_sucursal?: boolean
  filtrar_por_subcompania?: boolean
  permitir_cancelacion_asientos?: boolean
  agrupar_lineas_factura?: boolean
  numero_cuenta_requerido?: boolean
  activo: boolean
}

interface LineaAsiento {
  id?: string
  cuenta_id: string
  cuenta_codigo: string
  cuenta_nombre: string
  debe: number
  haber: number
  descripcion?: string
}

interface Asiento {
  id: string
  numero?: string
  diario_id: string
  diario?: { id: string; nombre: string; codigo: string; tipo: string }
  periodo_id?: string
  periodo?: { id: string; nombre: string }
  fecha: string
  sucursal_id?: string
  sucursal?: { id: string; nombre: string }
  concepto?: string
  referencia?: string
  comprobante_tipo?: string
  partner_id?: string
  partner_tipo?: string
  estado: "no_asentado" | "publicado" | "cancelado"
  es_manual: boolean
  a_revisar: boolean
  lineas?: LineaAsiento[]
}

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmtDate(d?: string) {
  if (!d) return ""
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR")
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

const ESTADO_ASIENTO_LABEL: Record<string, { label: string; color: string }> = {
  no_asentado: { label: "Borrador",  color: "bg-gray-100 text-gray-700" },
  publicado:   { label: "Publicado", color: "bg-green-100 text-green-800" },
  cancelado:   { label: "Cancelado", color: "bg-red-100 text-red-700" },
}

const ESTADO_PERIODO_LABEL: Record<string, { label: string; color: string }> = {
  aprobado:    { label: "Abierto",     color: "bg-green-100 text-green-800" },
  para_cerrar: { label: "Para Cerrar", color: "bg-yellow-100 text-yellow-800" },
  cerrado:     { label: "Cerrado",     color: "bg-red-100 text-red-700" },
}

const TIPO_DIARIO_LABEL: Record<string, string> = {
  venta:             "Venta",
  devolucion_venta:  "Dev. Venta",
  compra:            "Compra",
  devolucion_compra: "Dev. Compra",
  efectivo:          "Efectivo",
  banco_cheques:     "Banco/Cheques",
  general:           "General",
  libro_diario:      "Libro Diario",
  stock:             "Stock",
}

// â”€â”€â”€ WRAPPER LISTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ContabilidadListSection<T extends object>({
  title, moduleName, data, searchFields, filterFields, actions, children, emptyMessage,
}: {
  title: string
  moduleName: string
  data: T[]
  searchFields: (keyof T)[]
  filterFields: { field: keyof T; label: string }[]
  actions?: React.ReactNode
  children: (filtered: T[]) => React.ReactNode
  emptyMessage?: string
}) {
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const filtered = useMemo(() => {
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row => searchFields.some(f => String((row as any)[f] ?? "").toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => String((row as any)[f.field] ?? "") === f.value)
    }
    return result
  }, [data, search, activeFilters, searchFields])

  const filterOptions = useMemo(() =>
    filterFields.map(ff => {
      const vals = [...new Set(data.map(row => String((row as any)[ff.field] ?? "")).filter(v => v && v !== "null" && v !== "undefined"))]
      return { field: String(ff.field), label: ff.label, values: vals.sort().map(v => ({ value: v, label: v })) }
    }).filter(f => f.values.length > 0),
  [data, filterFields])

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({ id: String(ff.field), label: ff.label, field: String(ff.field) }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        {actions}
      </div>
      <OdooFilterBar
        moduleName={moduleName}
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(sf => sf.id !== id))}
        onApplyFilter={f => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }}
        totalCount={data.length}
        filteredCount={filtered.length}
      />
      <div className="mt-4">
        {filtered.length === 0
          ? <div className="text-center text-gray-400 py-12 text-sm">{emptyMessage ?? "Sin resultados."}</div>
          : children(filtered)}
      </div>
    </div>
  )
}

// â”€â”€â”€ PLACEHOLDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlaceholderView({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
      <Icon className="w-16 h-16 text-gray-200" />
      <h2 className="text-xl font-semibold text-gray-400">{title}</h2>
      <p className="text-sm text-gray-400">En desarrollo. Disponible próximamente.</p>
    </div>
  )
}

// â”€â”€â”€ VISTA: AÃ‘OS FISCALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnosFiscalesView() {
  const [anos, setAnos] = useState<AnoFiscal[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AnoFiscal | null>(null)
  const [periodoTab, setPeriodoTab] = useState<"periodos" | "apertura_cierre">("periodos")
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState({ nombre: "", codigo: "", fecha_inicio: "", fecha_fin: "" })
  const [guardando, setGuardando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/contabilidad/anos-fiscales")
    const d = await r.json()
    setAnos(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!form.nombre || !form.codigo || !form.fecha_inicio || !form.fecha_fin) {
      setError("Completá todos los campos."); return
    }
    setGuardando(true); setError(null)
    const r = await fetch("/api/contabilidad/anos-fiscales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? "Error al guardar"); setGuardando(false); return }
    setCreando(false); setGuardando(false)
    await cargar()
    setSelected(d)
  }

  const generarPeriodos = async (id: string) => {
    setGenerando(true)
    const r = await fetch(`/api/contabilidad/anos-fiscales?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generar_periodos" }),
    })
    const d = await r.json()
    if (!r.ok) { alert(d.error ?? "Error"); setGenerando(false); return }
    setGenerando(false)
    await cargar()
    if (selected?.id === id) {
      const updated = await fetch(`/api/contabilidad/anos-fiscales?id=${id}`).then(x => x.json())
      setSelected(Array.isArray(updated) ? updated[0] : updated)
    }
  }

  const cambiarEstado = async (id: string, estado: string) => {
    await fetch(`/api/contabilidad/anos-fiscales?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    })
    await cargar()
    setSelected(prev => prev ? { ...prev, estado: estado as any } : null)
  }

  if (selected) return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setSelected(null)}
          className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Años Fiscales
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-semibold">{selected.nombre}</span>
      </div>
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-amber-900">{selected.nombre}</h2>
            <p className="text-sm text-gray-500 mt-1">{fmtDate(selected.fecha_inicio)} — {fmtDate(selected.fecha_fin)}</p>
            <span className={`mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${selected.estado === "aprobado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
              {selected.estado === "aprobado" ? "Abierto" : "Cerrado"}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generarPeriodos(selected.id)} disabled={generando}
              className="bg-indigo-900 hover:bg-indigo-800 text-white text-xs px-3 py-2 rounded flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {generando ? "Generando…" : "Crear Períodos Mensuales"}
            </button>
            {selected.estado === "aprobado" && (
              <button onClick={() => cambiarEstado(selected.id, "cerrado")}
                className="border border-red-300 text-red-600 hover:bg-red-50 text-xs px-3 py-2 rounded">
                Cerrar Año
              </button>
            )}
          </div>
        </div>
        <div className="flex border-b">
          {(["periodos", "apertura_cierre"] as const).map(t => (
            <button key={t} onClick={() => setPeriodoTab(t)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${periodoTab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "periodos" ? "Períodos" : "Asientos Apertura / Cierre"}
            </button>
          ))}
        </div>
        {periodoTab === "periodos" && (
          <div className="p-4">
            {(selected.contabilidad_periodos ?? []).length === 0
              ? <p className="text-sm text-gray-400 text-center py-8">Sin períodos. Usá "Crear Períodos Mensuales".</p>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {["Período", "Desde", "Hasta", "Estado"].map(h => (
                        <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.contabilidad_periodos ?? []).map(p => {
                      const est = ESTADO_PERIODO_LABEL[p.estado] ?? { label: p.estado, color: "bg-gray-100 text-gray-600" }
                      return (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{p.nombre}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(p.fecha_inicio)}</td>
                          <td className="px-3 py-2 text-gray-500">{fmtDate(p.fecha_fin)}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
          </div>
        )}
        {periodoTab === "apertura_cierre" && (
          <div className="p-8 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">Los asientos de apertura y cierre se generarán al finalizar el ejercicio.</p>
          </div>
        )}
      </div>
    </div>
  )

  if (creando) return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setCreando(false)}
          className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Años Fiscales
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-semibold">Nuevo Año Fiscal</span>
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-6 max-w-lg">
        <h2 className="text-lg font-bold text-amber-900 mb-4">Nuevo Año Fiscal</h2>
        {error && <div className="text-sm text-red-600 mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="ej: 2026" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="ej: 2026" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Inicio *</label>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Fin *</label>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={guardar} disabled={guardando}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={() => setCreando(false)} className="border text-gray-600 hover:bg-gray-50 px-4 py-2 rounded text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )

  return (
    <ContabilidadListSection<AnoFiscal>
      title="Años Fiscales"
      moduleName="contabilidad-anos-fiscales"
      data={anos}
      searchFields={["nombre", "codigo"]}
      filterFields={[{ field: "estado", label: "Estado" }]}
      actions={
        <button onClick={() => { setForm({ nombre: "", codigo: "", fecha_inicio: "", fecha_fin: "" }); setCreando(true); setError(null) }}
          className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nuevo Año Fiscal
        </button>
      }
      emptyMessage={loading ? "Cargando…" : "No hay años fiscales registrados."}
    >
      {filtered => (
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Código", "Nombre", "Desde", "Hasta", "Estado", "Períodos", ""].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(a)}>
                <td className="px-3 py-2 font-mono text-xs">{a.codigo}</td>
                <td className="px-3 py-2 font-medium">{a.nombre}</td>
                <td className="px-3 py-2 text-gray-500">{fmtDate(a.fecha_inicio)}</td>
                <td className="px-3 py-2 text-gray-500">{fmtDate(a.fecha_fin)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.estado === "aprobado" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                    {a.estado === "aprobado" ? "Abierto" : "Cerrado"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-gray-500">{a.contabilidad_periodos?.length ?? 0}</td>
                <td className="px-3 py-2"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ContabilidadListSection>
  )
}

// â”€â”€â”€ VISTA: TIPOS DE CUENTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TiposCuentaView() {
  const [tipos, setTipos] = useState<TipoCuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TipoCuenta | null>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<TipoCuenta>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch("/api/contabilidad/tipos-cuenta")
    const d = await r.json()
    setTipos(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!form.nombre || !form.codigo) { setError("Nombre y Código son obligatorios."); return }
    setGuardando(true); setError(null)
    const method = selected ? "PATCH" : "POST"
    const url = selected ? `/api/contabilidad/tipos-cuenta?id=${selected.id}` : "/api/contabilidad/tipos-cuenta"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? "Error al guardar"); setGuardando(false); return }
    setEditando(false); setSelected(null); setGuardando(false)
    await cargar()
  }

  if (editando) return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => { setEditando(false); setSelected(null) }}
          className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Tipos de Cuenta
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-semibold">{selected ? selected.nombre : "Nuevo Tipo de Cuenta"}</span>
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-6 max-w-lg">
        {error && <div className="text-sm text-red-600 mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.nombre ?? ""} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.codigo ?? ""} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dif. de Período</label>
            <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.metodo_diferimiento ?? "ninguno"} onChange={e => setForm(p => ({ ...p, metodo_diferimiento: e.target.value as any }))}>
              <option value="ninguno">Ninguno</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría Balance/PyG</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.categoria_balance_pyg ?? ""} onChange={e => setForm(p => ({ ...p, categoria_balance_pyg: e.target.value }))} />
          </div>
          <div className="col-span-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.es_resultado ?? false} onChange={e => setForm(p => ({ ...p, es_resultado: e.target.checked }))} />
              Es Resultado (PyG)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} />
              Activo
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={guardar} disabled={guardando}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={() => { setEditando(false); setSelected(null) }}
            className="border text-gray-600 hover:bg-gray-50 px-4 py-2 rounded text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )

  return (
    <ContabilidadListSection<TipoCuenta>
      title="Tipos de Cuenta"
      moduleName="contabilidad-tipos-cuenta"
      data={tipos}
      searchFields={["nombre", "codigo"]}
      filterFields={[{ field: "activo", label: "Activo" }]}
      actions={
        <button onClick={() => { setForm({ activo: true, metodo_diferimiento: "ninguno", es_resultado: false }); setSelected(null); setEditando(true); setError(null) }}
          className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      }
      emptyMessage={loading ? "Cargando…" : "No hay tipos de cuenta."}
    >
      {filtered => (
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Nombre", "Código", "Es Resultado", "Categoría", "Activo", ""].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => { setSelected(t); setForm({ ...t }); setEditando(true) }}>
                <td className="px-3 py-2 font-medium">{t.nombre}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.codigo}</td>
                <td className="px-3 py-2">{t.es_resultado ? <Check className="w-4 h-4 text-green-600" /> : ""}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{t.categoria_balance_pyg ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {t.activo ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-3 py-2"><Pencil className="w-3 h-3 text-gray-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ContabilidadListSection>
  )
}

// â”€â”€â”€ VISTA: PLAN DE CUENTAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlanCuentasView() {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [tipos, setTipos] = useState<TipoCuenta[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CuentaContable | null>(null)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<Partial<CuentaContable & { tipo_cuenta_id: string }>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [c, t] = await Promise.all([
      fetch("/api/contabilidad/plan-cuentas").then(r => r.json()),
      fetch("/api/contabilidad/tipos-cuenta").then(r => r.json()),
    ])
    setCuentas(Array.isArray(c) ? c : [])
    setTipos(Array.isArray(t) ? t : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!form.codigo || !form.nombre) { setError("Código y Nombre son obligatorios."); return }
    setGuardando(true); setError(null)
    const method = selected ? "PATCH" : "POST"
    const url = selected ? `/api/contabilidad/plan-cuentas?id=${selected.id}` : "/api/contabilidad/plan-cuentas"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? "Error al guardar"); setGuardando(false); return }
    setEditando(false); setSelected(null); setGuardando(false)
    await cargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta?")) return
    const r = await fetch(`/api/contabilidad/plan-cuentas?id=${id}`, { method: "DELETE" })
    const d = await r.json()
    if (!r.ok) { alert(d.error ?? "No se puede eliminar."); return }
    setEditando(false); setSelected(null)
    await cargar()
  }

  if (editando) return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => { setEditando(false); setSelected(null) }}
          className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Plan de Cuentas
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-semibold">{selected ? `${selected.codigo} · ${selected.nombre}` : "Nueva Cuenta"}</span>
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-6 max-w-2xl">
        {error && <div className="text-sm text-red-600 mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.codigo ?? ""} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.nombre ?? ""} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cuenta</label>
            <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.tipo_cuenta_id ?? ""} onChange={e => setForm(p => ({ ...p, tipo_cuenta_id: e.target.value || undefined }))}>
              <option value="">— Sin tipo —</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Interno</label>
            <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.tipo_interno ?? "regular"} onChange={e => setForm(p => ({ ...p, tipo_interno: e.target.value as any }))}>
              <option value="regular">Regular</option>
              <option value="liquidez">Liquidez</option>
              <option value="a_cobrar">A Cobrar</option>
              <option value="a_pagar">A Pagar</option>
            </select>
          </div>
          <div className="col-span-2 flex flex-wrap gap-4">
            {([
              ["activo", "Activo"],
              ["permite_conciliacion", "Permite Conciliación"],
              ["es_cuenta_puente", "Cuenta Puente"],
              ["es_cuenta_ventas", "Cuenta Ventas"],
              ["es_cuenta_compras", "Cuenta Compras"],
              ["es_cuenta_impuestos", "Cuenta Impuestos"],
              ["es_cuenta_existencias", "Cuenta Existencias"],
              ["es_cuenta_cmv", "Cuenta CMV"],
            ] as [keyof typeof form, string][]).map(([field, label]) => (
              <label key={String(field)} className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={(form as any)[field] ?? false}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={guardar} disabled={guardando}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={() => { setEditando(false); setSelected(null) }}
            className="border text-gray-600 hover:bg-gray-50 px-4 py-2 rounded text-sm">Cancelar</button>
          {selected && (
            <button onClick={() => eliminar(selected.id)}
              className="ml-auto border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded text-sm flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <ContabilidadListSection<CuentaContable>
      title="Plan de Cuentas"
      moduleName="contabilidad-plan-cuentas"
      data={cuentas}
      searchFields={["codigo", "nombre"]}
      filterFields={[
        { field: "tipo_interno", label: "Tipo Interno" },
        { field: "activo", label: "Activo" },
      ]}
      actions={
        <button onClick={() => { setForm({ activo: true, tipo_interno: "regular" }); setSelected(null); setEditando(true); setError(null) }}
          className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nueva Cuenta
        </button>
      }
      emptyMessage={loading ? "Cargando…" : "Sin cuentas. Importá el plan de cuentas o creá manualmente."}
    >
      {filtered => (
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Código", "Nombre", "Tipo de Cuenta", "Tipo Interno", "Conc.", "Activo", ""].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const esVista = c.tipo_cuenta?.codigo?.startsWith("vista") || c.tipo_cuenta?.codigo === "raiz"
              return (
                <tr key={c.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${esVista ? "bg-blue-50/30" : ""}`}
                  onClick={() => { setSelected(c); setForm({ ...c, tipo_cuenta_id: c.tipo_cuenta?.id }); setEditando(true) }}>
                  <td className={`px-3 py-2 font-mono text-xs ${esVista ? "text-blue-700 font-bold" : ""}`}>{c.codigo}</td>
                  <td className={`px-3 py-2 ${esVista ? "font-bold text-blue-800" : "font-medium"}`}>{c.nombre}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{c.tipo_cuenta?.nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{c.tipo_interno}</td>
                  <td className="px-3 py-2">{c.permite_conciliacion ? <Check className="w-3 h-3 text-green-600" /> : ""}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {c.activo ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2"><Pencil className="w-3 h-3 text-gray-300" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </ContabilidadListSection>
  )
}

// â”€â”€â”€ VISTA: DIARIOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DiariosView() {
  type DiarioRow = Diario & { _sucursal_nombre: string; _activo_label: string }
  type DiarioUsuario = { id: string; usuario_nombre?: string; rol: string }

  const [diarios, setDiarios] = useState<DiarioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Diario | null>(null)
  const [detalle, setDetalle] = useState(false)
  const [editando, setEditando] = useState(false)
  const [tab, setTab] = useState<"ajustes" | "usuarios">("ajustes")
  const [usuarios, setUsuarios] = useState<DiarioUsuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [form, setForm] = useState<Partial<Diario>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])

  const cargar = useCallback(async () => {
    setLoading(true)
    const [d, s] = await Promise.all([
      fetch("/api/contabilidad/diarios").then(r => r.json()),
      fetch("/api/sucursales").then(r => r.json()),
    ])
    const raw: Diario[] = Array.isArray(d) ? d.filter((x: Diario) => x.tipo !== "libro_diario") : []
    setDiarios(raw.map(diario => ({
      ...diario,
      _sucursal_nombre: diario.sucursal?.nombre ?? "",
      _activo_label: diario.activo ? "Activo" : "Inactivo",
    })))
    setSucursales(Array.isArray(s) ? s : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirDetalle = async (d: Diario) => {
    setSelected(d); setDetalle(true); setEditando(false); setTab("ajustes"); setError(null)
    setLoadingUsuarios(true)
    const r = await fetch(`/api/contabilidad/diarios/usuarios?diario_id=${d.id}`).then(r => r.json()).catch(() => [])
    setUsuarios(Array.isArray(r) ? r : [])
    setLoadingUsuarios(false)
  }

  const iniciarEdicion = () => {
    setForm({ ...selected, permitir_cancelacion_asientos: selected?.permitir_cancelacion_asientos ?? true })
    setEditando(true); setError(null)
  }

  const volver = () => { setDetalle(false); setEditando(false); setSelected(null) }

  const guardar = async () => {
    if (!form.nombre || !form.codigo || !form.tipo) { setError("Nombre, Código y Tipo son obligatorios."); return }
    setGuardando(true); setError(null)
    const method = selected ? "PATCH" : "POST"
    const url = selected ? `/api/contabilidad/diarios?id=${selected.id}` : "/api/contabilidad/diarios"
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const data = await r.json()
    if (!r.ok) { setError(data.error ?? "Error al guardar"); setGuardando(false); return }
    setGuardando(false)
    await cargar()
    // Recargar el detalle desde la lista actualizada
    if (selected) {
      const fresh = await fetch(`/api/contabilidad/diarios?id=${selected.id}`).then(r => r.json())
      if (fresh?.id) { setSelected(fresh); setEditando(false) }
      else volver()
    } else volver()
  }

  const Campo = ({ label, valor }: { label: string; valor?: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{valor ?? <span className="text-gray-300">—</span>}</span>
    </div>
  )

  const Check = ({ label, valor }: { label: string; valor?: boolean }) => (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${valor ? "bg-indigo-900 border-indigo-900" : "border-gray-300"}`}>
        {valor && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </div>
  )

  // ── NUEVO DIARIO (sin selected) ──
  if (editando && !selected) return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={volver} className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Diarios
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-semibold">Nuevo Diario</span>
      </div>
      <div className="bg-white border rounded-lg shadow-sm p-6 max-w-2xl">
        {error && <div className="text-sm text-red-600 mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.nombre ?? ""} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
            <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.codigo ?? ""} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
            <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.tipo ?? ""} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {Object.entries(TIPO_DIARIO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.moneda ?? "ARS"} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))}>
              <option>ARS</option><option>USD</option><option>EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
            <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={form.sucursal_id ?? ""} onChange={e => setForm(p => ({ ...p, sucursal_id: e.target.value || undefined }))}>
              <option value="">— Todas —</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={guardar} disabled={guardando}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button onClick={volver} className="border text-gray-600 hover:bg-gray-50 px-4 py-2 rounded text-sm">Descartar</button>
        </div>
      </div>
    </div>
  )

  // ── DETALLE / EDICIÓN INLINE ──
  if (detalle && selected) {
    const inp = "w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={volver} className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Diarios
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-semibold">{editando ? (form.nombre || selected.nombre) : selected.nombre}</span>
          {selected.es_automatico && !editando && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">Automático</span>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 mb-5">
          {editando ? (
            <>
              <button onClick={guardar} disabled={guardando}
                className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-1">
                <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button onClick={() => setEditando(false)}
                className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded text-sm font-medium text-gray-700">
                Descartar
              </button>
            </>
          ) : (
            <>
              <button onClick={iniciarEdicion}
                className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded text-sm font-medium text-gray-700">
                Editar
              </button>
              <button onClick={() => { setForm({ moneda: "ARS", activo: true, tipo: "general", permitir_cancelacion_asientos: true }); setSelected(null); setEditando(true); setDetalle(false) }}
                className="border border-gray-300 hover:bg-gray-50 px-4 py-1.5 rounded text-sm font-medium text-gray-700">
                Crear
              </button>
            </>
          )}
        </div>

        {error && <div className="text-sm text-red-600 mb-3 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</div>}

        {/* Card principal */}
        <div className="bg-white border rounded-lg shadow-sm">
          {/* Cabecera */}
          <div className="px-6 pt-5 pb-4 border-b">
            {editando
              ? <input className={inp + " text-xl font-semibold"} value={form.nombre ?? ""} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del diario *" />
              : <h2 className="text-xl font-semibold text-gray-900">{selected.nombre}</h2>
            }
          </div>

          {/* Campos principales: 2 columnas */}
          <div className="px-6 py-5 grid grid-cols-2 gap-x-12 gap-y-5">
            {/* Col izquierda */}
            <div className="flex flex-col gap-5">
              {editando ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Código *</label>
                    <input className={inp} value={form.codigo ?? ""} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
                    <select className={inp} value={form.tipo ?? ""} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                      <option value="">— Seleccionar —</option>
                      {Object.entries(TIPO_DIARIO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} />
                    Activo
                  </label>
                </>
              ) : (
                <>
                  <Campo label="Código" valor={<span className="font-mono">{selected.codigo}</span>} />
                  <Campo label="Tipo" valor={TIPO_DIARIO_LABEL[selected.tipo] ?? selected.tipo} />
                  <Campo label="Activo" valor={
                    <span className={`text-xs px-2 py-0.5 rounded-full ${selected.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                      {selected.activo ? "Activo" : "Inactivo"}
                    </span>
                  } />
                </>
              )}
            </div>
            {/* Col derecha */}
            <div className="flex flex-col gap-5">
              {editando ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                    <select className={inp} value={form.moneda ?? "ARS"} onChange={e => setForm(p => ({ ...p, moneda: e.target.value }))}>
                      <option>ARS</option><option>USD</option><option>EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sucursal</label>
                    <select className={inp} value={form.sucursal_id ?? ""} onChange={e => setForm(p => ({ ...p, sucursal_id: e.target.value || undefined }))}>
                      <option value="">— Todas —</option>
                      {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <Campo label="Cuenta de débito predeterminada"
                    valor={selected.cuenta_debito ? `${selected.cuenta_debito.codigo} ${selected.cuenta_debito.nombre}` : undefined} />
                  <Campo label="Cuenta de haber predeterminada"
                    valor={selected.cuenta_haber ? `${selected.cuenta_haber.codigo} ${selected.cuenta_haber.nombre}` : undefined} />
                  <Campo label="Moneda" valor={selected.moneda || undefined} />
                  <Campo label="Secuencia" valor={selected.secuencia ?? 1} />
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t">
            <div className="flex gap-0 px-6">
              {[{ id: "ajustes", label: "Ajustes avanzados" }, { id: "usuarios", label: "Usuarios" }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id as "ajustes" | "usuarios")}
                  className={`px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${tab === t.id
                    ? "border-indigo-900 text-indigo-900 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Ajustes avanzados */}
            {tab === "ajustes" && (
              <div className="px-6 py-5 grid grid-cols-2 gap-x-12 gap-y-4">
                {editando ? (
                  <>
                    <div className="flex flex-col gap-3">
                      <Campo label="Caja" valor={selected.caja_id ? <span className="text-indigo-700 text-sm">Caja vinculada</span> : undefined} />
                      {[
                        { key: "filtrar_por_sucursal", label: "Filtrar por Sucursal" },
                        { key: "filtrar_por_subcompania", label: "Filtrar por Subcompañía" },
                        { key: "numero_cuenta_requerido", label: "Número de Cuenta Requerido" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={(form as any)[key] ?? false}
                            onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      {[
                        { key: "permitir_cancelacion_asientos", label: "Permitir cancelación de Asientos" },
                        { key: "agrupar_lineas_factura", label: "Agrupar líneas de factura" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox"
                            checked={(form as any)[key] ?? (key === "permitir_cancelacion_asientos")}
                            onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-4">
                      <Campo label="Caja" valor={selected.caja_id ? <span className="text-indigo-700 text-sm">Caja vinculada</span> : undefined} />
                      <Campo label="Sucursal" valor={selected.sucursal?.nombre} />
                      <Check label="Filtrar por Sucursal" valor={selected.filtrar_por_sucursal} />
                      <Check label="Filtrar por Subcompañía" valor={selected.filtrar_por_subcompania} />
                    </div>
                    <div className="flex flex-col gap-4">
                      <Check label="Permitir cancelación de Asientos" valor={selected.permitir_cancelacion_asientos ?? true} />
                      <Check label="Agrupar líneas de factura" valor={selected.agrupar_lineas_factura} />
                      <Check label="Número de Cuenta Requerido" valor={selected.numero_cuenta_requerido} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Usuarios */}
            {tab === "usuarios" && (
              <div className="px-6 py-5">
                {loadingUsuarios ? (
                  <p className="text-sm text-gray-400">Cargando usuarios…</p>
                ) : usuarios.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin usuarios asignados.</p>
                ) : (
                  <table className="w-full text-sm border rounded overflow-hidden">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {["Nombre", "Rol"].map(h => (
                          <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(u => (
                        <tr key={u.id} className="border-b border-gray-100">
                          <td className="px-3 py-2">{u.usuario_nombre ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-500 capitalize">{u.rol}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── LISTA ──
  return (
    <ContabilidadListSection<DiarioRow>
      title="Diarios"
      moduleName="contabilidad-diarios"
      data={diarios}
      searchFields={["nombre", "codigo", "_sucursal_nombre"]}
      filterFields={[
        { field: "tipo", label: "Tipo" },
        { field: "moneda", label: "Moneda" },
        { field: "_sucursal_nombre", label: "Sucursal" },
        { field: "_activo_label", label: "Estado" },
      ]}
      actions={
        <button onClick={() => { setForm({ moneda: "ARS", activo: true, tipo: "general", permitir_cancelacion_asientos: true }); setSelected(null); setDetalle(false); setEditando(true); setError(null) }}
          className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Nuevo Diario
        </button>
      }
      emptyMessage={loading ? "Cargando…" : "Sin diarios configurados."}
    >
      {filtered => (
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Código", "Nombre", "Tipo", "Moneda", "Sucursal", "Estado", ""].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => abrirDetalle(d)}>
                <td className="px-3 py-2 font-mono text-xs">{d.codigo}</td>
                <td className="px-3 py-2 font-medium">
                  <span>{d.nombre}</span>
                  {d.es_automatico && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-normal border border-blue-100">
                      Automático
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{TIPO_DIARIO_LABEL[d.tipo] ?? d.tipo}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{d.moneda}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{d.sucursal?.nombre ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${d.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                    {d.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-3 py-2"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ContabilidadListSection>
  )
}

// â”€â”€â”€ VISTA: ASIENTOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AsientosView({ soloManuales = false }: { soloManuales?: boolean }) {
  const [asientos, setAsientos] = useState<Asiento[]>([])
  const [diarios, setDiarios] = useState<Diario[]>([])
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Asiento | null>(null)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"resumen" | "observaciones">("resumen")
  const [formAsiento, setFormAsiento] = useState<{
    diario_id: string; fecha: string; referencia: string; concepto: string
    a_revisar: boolean; lineas: LineaAsiento[]
  }>({ diario_id: "", fecha: new Date().toISOString().split("T")[0], referencia: "", concepto: "", a_revisar: false, lineas: [] })

  const cargar = useCallback(async () => {
    setLoading(true)
    const url = soloManuales
      ? "/api/contabilidad/asientos?sin_cancelados=false&es_manual=true"
      : "/api/contabilidad/asientos?sin_cancelados=false&es_manual=false"
    const [a, d, c] = await Promise.all([
      fetch(url).then(r => r.json()),
      fetch("/api/contabilidad/diarios?activo=true").then(r => r.json()),
      fetch("/api/contabilidad/plan-cuentas?activo=true").then(r => r.json()),
    ])
    setAsientos(Array.isArray(a) ? a : [])
    setDiarios(Array.isArray(d) ? d : [])
    setCuentas(Array.isArray(c) ? c : [])
    setLoading(false)
  }, [soloManuales])

  useEffect(() => { cargar() }, [cargar])

  const sumaDebe  = formAsiento.lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0)
  const sumaHaber = formAsiento.lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0)
  const diferencia = sumaDebe - sumaHaber

  const agregarLinea = () => setFormAsiento(p => ({
    ...p, lineas: [...p.lineas, { cuenta_id: "", cuenta_codigo: "", cuenta_nombre: "", debe: 0, haber: 0 }]
  }))

  const updateLinea = (idx: number, field: keyof LineaAsiento, value: string | number) => {
    setFormAsiento(p => {
      const lineas = [...p.lineas]
      lineas[idx] = { ...lineas[idx], [field]: value }
      if (field === "cuenta_id") {
        const cuenta = cuentas.find(c => c.id === value)
        if (cuenta) { lineas[idx].cuenta_codigo = cuenta.codigo; lineas[idx].cuenta_nombre = cuenta.nombre }
      }
      return { ...p, lineas }
    })
  }

  const eliminarLinea = (idx: number) => setFormAsiento(p => ({ ...p, lineas: p.lineas.filter((_, i) => i !== idx) }))

  const enviarAsiento = async (publicar: boolean) => {
    if (!formAsiento.diario_id || !formAsiento.fecha) { setError("Diario y Fecha son obligatorios."); return }
    if (publicar && formAsiento.lineas.length === 0) { setError("Agregá al menos una línea."); return }
    if (publicar && Math.abs(diferencia) > 0.01) { setError(`Diferencia: $${fmtMoney(diferencia)}. El asiento no cuadra.`); return }
    setGuardando(true); setError(null)
    // Forzar borrador si no se quiere publicar directamente
    const payload = { ...formAsiento, es_manual: true, _force_borrador: !publicar }
    const r = await fetch("/api/contabilidad/asientos", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? "Error"); setGuardando(false); return }
    setCreando(false); setGuardando(false)
    await cargar()
  }

  const accionAsiento = async (id: string, action: "publicar" | "cancelar") => {
    if (action === "cancelar" && !confirm("¿Cancelar este asiento? Se generará una reversión automática.")) return
    const r = await fetch(`/api/contabilidad/asientos?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    })
    const d = await r.json()
    if (!r.ok) { alert(d.error ?? "Error"); return }
    setSelected(null)
    await cargar()
  }

  // â”€â”€ Detalle â”€â”€
  if (selected) {
    const lineas = selected.lineas ?? []
    const totalDebe  = lineas.reduce((s, l) => s + Number(l.debe), 0)
    const totalHaber = lineas.reduce((s, l) => s + Number(l.haber), 0)
    const est = ESTADO_ASIENTO_LABEL[selected.estado]
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setSelected(null)}
            className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> {soloManuales ? "Asientos Manuales" : "Asientos Contables"}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 font-semibold">{selected.numero ?? "Borrador"}</span>
        </div>
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-6 border-b flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-900">{selected.numero ?? "Sin número"}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${est.color}`}>{est.label}</span>
                {selected.a_revisar && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">⚠ A Revisar</span>}
              </div>
              <p className="text-sm text-gray-500 mt-1">{selected.diario?.nombre} · {fmtDate(selected.fecha)}</p>
              {selected.referencia && <p className="text-xs text-gray-400 mt-0.5">Ref: {selected.referencia}</p>}
              {selected.concepto && <p className="text-xs text-gray-600 mt-1">{selected.concepto}</p>}
            </div>
            <div className="flex gap-2">
              {selected.estado === "no_asentado" && (
                <button onClick={() => accionAsiento(selected.id, "publicar")}
                  className="bg-indigo-900 hover:bg-indigo-800 text-white px-3 py-2 rounded text-sm flex items-center gap-1">
                  <Check className="w-4 h-4" /> Publicar
                </button>
              )}
              {selected.estado === "publicado" && (
                <button onClick={() => accionAsiento(selected.id, "cancelar")}
                  className="border border-red-300 text-red-600 hover:bg-red-50 px-3 py-2 rounded text-sm flex items-center gap-1">
                  <X className="w-4 h-4" /> Cancelar Asiento
                </button>
              )}
            </div>
          </div>
          <div className="flex border-b">
            {(["resumen", "observaciones"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t === "resumen" ? "Resumen" : "Observaciones"}
              </button>
            ))}
          </div>
          {activeTab === "resumen" && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {["Cuenta", "Nombre", "Debe", "Haber"].map(h => (
                      <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, i) => (
                    <tr key={l.id ?? i} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">{l.cuenta_codigo}</td>
                      <td className="px-3 py-2">{l.cuenta_nombre}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{Number(l.debe) > 0 ? fmtMoney(Number(l.debe)) : ""}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{Number(l.haber) > 0 ? fmtMoney(Number(l.haber)) : ""}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-50 border-t-2">
                    <td colSpan={2} className="px-3 py-2 text-xs">TOTALES</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(totalDebe)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(totalHaber)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {activeTab === "observaciones" && (
            <div className="p-4">
              <p className="text-sm text-gray-500">{selected.concepto ?? "Sin observaciones."}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // â”€â”€ Formulario â”€â”€
  if (creando) return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => { setCreando(false); setError(null) }}
          className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Asientos Manuales
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 font-semibold">Nuevo Asiento Manual</span>
      </div>
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          {error && <div className="text-sm text-red-600 mb-4 flex items-center gap-2 bg-red-50 px-3 py-2 rounded"><AlertCircle className="w-4 h-4" />{error}</div>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Diario *</label>
              <select className="w-full border rounded px-3 py-2 text-sm"
                value={formAsiento.diario_id} onChange={e => setFormAsiento(p => ({ ...p, diario_id: e.target.value }))}>
                <option value="">— Seleccionar —</option>
                {diarios.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" className="w-full border rounded px-3 py-2 text-sm"
                value={formAsiento.fecha} onChange={e => setFormAsiento(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Referencia</label>
              <input className="w-full border rounded px-3 py-2 text-sm"
                value={formAsiento.referencia} onChange={e => setFormAsiento(p => ({ ...p, referencia: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Concepto</label>
              <input className="w-full border rounded px-3 py-2 text-sm"
                value={formAsiento.concepto} onChange={e => setFormAsiento(p => ({ ...p, concepto: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={formAsiento.a_revisar}
                onChange={e => setFormAsiento(p => ({ ...p, a_revisar: e.target.checked }))} />
              Marcar para revisar
            </label>
            <span className={`ml-auto text-sm font-semibold ${Math.abs(diferencia) > 0.01 ? "text-red-600" : "text-green-700"}`}>
              Diferencia: ${fmtMoney(diferencia)}
            </span>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="border-b bg-gray-50">
                {["Cuenta", "Descripción", "Debe", "Haber", ""].map(h => (
                  <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-2 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formAsiento.lineas.map((l, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="px-2 py-1">
                    <select className="w-full border rounded px-2 py-1 text-xs"
                      value={l.cuenta_id} onChange={e => updateLinea(idx, "cuenta_id", e.target.value)}>
                      <option value="">— Cuenta —</option>
                      {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input className="w-full border rounded px-2 py-1 text-xs" placeholder="Descripción"
                      value={l.descripcion ?? ""} onChange={e => updateLinea(idx, "descripcion", e.target.value)} />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <input type="number" min="0" step="0.01" className="w-full border rounded px-2 py-1 text-xs text-right"
                      value={l.debe || ""} onChange={e => updateLinea(idx, "debe", parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <input type="number" min="0" step="0.01" className="w-full border rounded px-2 py-1 text-xs text-right"
                      value={l.haber || ""} onChange={e => updateLinea(idx, "haber", parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-2 py-1">
                    <button onClick={() => eliminarLinea(idx)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-gray-50 border-t-2">
                <td colSpan={2} className="px-2 py-2 text-xs">TOTALES</td>
                <td className="px-2 py-2 text-right text-xs font-mono">{fmtMoney(sumaDebe)}</td>
                <td className="px-2 py-2 text-right text-xs font-mono">{fmtMoney(sumaHaber)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <button onClick={agregarLinea} className="text-indigo-700 hover:text-indigo-900 text-xs flex items-center gap-1">
            <Plus className="w-3 h-3" /> Añadir un elemento
          </button>
        </div>
        <div className="p-4 border-t flex gap-2">
          <button onClick={() => enviarAsiento(true)} disabled={guardando}
            className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> {guardando ? "Publicando…" : "Publicar"}
          </button>
          <button onClick={() => enviarAsiento(false)} disabled={guardando}
            className="border text-gray-600 hover:bg-gray-50 px-4 py-2 rounded text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> Guardar Borrador
          </button>
          <button onClick={() => { setCreando(false); setError(null) }}
            className="border text-gray-600 hover:bg-gray-50 px-4 py-2 rounded text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )

  // â”€â”€ Lista â”€â”€
  return (
    <ContabilidadListSection<Asiento>
      title={soloManuales ? "Asientos Manuales" : "Asientos Contables"}
      moduleName={soloManuales ? "asientos-manuales" : "asientos-contables"}
      data={asientos}
      searchFields={["numero", "referencia", "concepto"]}
      filterFields={[{ field: "estado", label: "Estado" }]}
      actions={
        soloManuales ? (
          <button onClick={() => {
            setFormAsiento({ diario_id: "", fecha: new Date().toISOString().split("T")[0], referencia: "", concepto: "", a_revisar: false, lineas: [] })
            setCreando(true); setError(null)
          }} className="bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Crear Asiento
          </button>
        ) : (
          <button onClick={cargar} className="border text-gray-600 hover:bg-gray-50 px-3 py-2 rounded text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        )
      }
      emptyMessage={loading ? "Cargando…" : "Sin asientos registrados."}
    >
      {filtered => (
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Número", "Fecha", "Período", "Diario", "Concepto / Ref.", "Estado", "Importe", ""].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const est = ESTADO_ASIENTO_LABEL[a.estado]
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(a)}>
                  <td className="px-3 py-2 font-mono text-xs">{a.numero ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(a.fecha)}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{a.periodo?.nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{a.diario?.nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-xs truncate">{a.concepto ?? a.referencia ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {a.lineas && a.lineas.length > 0
                      ? fmtMoney(a.lineas.reduce((s, l) => s + (l.debe ?? 0), 0))
                      : "—"}
                  </td>
                  <td className="px-3 py-2"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </ContabilidadListSection>
  )
}

// â”€â”€â”€ VISTA: LIBRO MAYOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── COMBOBOX: selector de cuenta con búsqueda ───────────────────────────────
const GRUPOS_CUENTA_CONT: Record<string, string> = {
  "1": "Activo", "2": "Pasivo", "3": "Patrimonio Neto",
  "4": "Resultado – Ingresos", "5": "Costo de Ventas", "6": "Gastos",
  "7": "Otros Ingresos", "8": "Otros Egresos", "9": "Cuentas de Orden",
}

function LibroMayorCuentaCombo({
  cuentas, value, onChange,
}: { cuentas: CuentaContable[]; value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [modalSearch, setModalSearch] = React.useState("")
  const [modalFilters, setModalFilters] = React.useState<FilterOption[]>([])
  const [modalGroupBy, setModalGroupBy] = React.useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([])
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0, width: 0 })
  const refTrigger = React.useRef<HTMLDivElement>(null)

  const selected = cuentas.find(c => c.id === value)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const dropdown = document.getElementById("lm-cuenta-dropdown")
      if (refTrigger.current && !refTrigger.current.contains(target) && !dropdown?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const abrirDropdown = () => {
    if (refTrigger.current) {
      const rect = refTrigger.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    }
    setOpen(v => !v)
  }

  const opciones = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtradas = q ? cuentas.filter(c => c.codigo.includes(q) || c.nombre.toLowerCase().includes(q)) : cuentas
    return filtradas.slice(0, 5)
  }, [cuentas, query])

  const modalFiltradas = React.useMemo(() => {
    let result = cuentas
    const q = modalSearch.trim().toLowerCase()
    if (q) result = result.filter(c => c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q))
    for (const f of modalFilters) {
      if (f.field === "prefijo") result = result.filter(c => c.codigo.startsWith(f.value))
    }
    return result
  }, [cuentas, modalSearch, modalFilters])

  const agrupadoPorTipo = modalGroupBy.some(g => g.field === "tipo")
  const grupos = React.useMemo(() => {
    if (!agrupadoPorTipo) return null
    const map: Record<string, CuentaContable[]> = {}
    for (const c of modalFiltradas) {
      const k = c.codigo[0] ?? "?"
      if (!map[k]) map[k] = []
      map[k].push(c)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [modalFiltradas, agrupadoPorTipo])

  const seleccionar = (id: string) => { onChange(id); setOpen(false); setQuery(""); setModalOpen(false) }

  const dropdown = open ? (
    <div id="lm-cuenta-dropdown"
      style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 360), zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
      <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Código o nombre..." className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none rounded-t-lg" />
      {value && (
        <div onMouseDown={e => { e.preventDefault(); seleccionar("") }}
          className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b">— Limpiar selección —</div>
      )}
      {opciones.map(c => (
        <div key={c.id} onMouseDown={e => { e.preventDefault(); seleccionar(c.id) }}
          className={`px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 transition-colors ${c.id === value ? "bg-indigo-100 font-semibold" : ""}`}>
          <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
          <span className="text-gray-800">{c.nombre}</span>
        </div>
      ))}
      {opciones.length === 0 && query.trim() && (
        <div className="px-3 py-2 text-sm text-gray-400 italic">Sin resultados</div>
      )}
      <div role="button"
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setOpen(false); requestAnimationFrame(() => setModalOpen(true)) }}
        className="px-3 py-2 text-sm font-medium flex items-center gap-2 rounded-b-lg cursor-pointer"
        style={{ backgroundColor: '#eef2ff', color: '#3730a3', borderTop: '2px solid #c7d2fe' }}>
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>Buscar en todas las cuentas...</span>
      </div>
    </div>
  ) : null

  return (
    <>
      <div ref={refTrigger}>
        <div className="w-full px-3 py-2 border border-gray-300 rounded bg-white cursor-pointer flex items-center justify-between text-sm"
          onClick={abrirDropdown}>
          <span className={selected ? "text-gray-900 font-mono text-xs" : "text-gray-400 text-sm"}>
            {selected ? `${selected.codigo} · ${selected.nombre}` : "— Buscar cuenta por código o nombre —"}
          </span>
          {selected ? (
            <button type="button" className="text-gray-400 hover:text-red-500 ml-2"
              onClick={e => { e.stopPropagation(); onChange("") }}>
              <X className="w-3 h-3" /></button>
          ) : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {typeof document !== "undefined" && open && ReactDOM.createPortal(dropdown, document.body)}

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          onMouseDown={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-amber-900">Seleccionar cuenta contable</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="border-b">
              <OdooFilterBar
                moduleName="lm-cuentas-selector"
                filterOptions={[{ field: "prefijo", label: "Tipo de cuenta",
                  values: Object.entries(GRUPOS_CUENTA_CONT).map(([v, l]) => ({ value: v, label: `${v} — ${l}` })) }]}
                groupByOptions={[{ id: "tipo", label: "Tipo de cuenta", field: "tipo" }]}
                activeFilters={modalFilters} activeGroupBy={modalGroupBy} searchTerm={modalSearch}
                onFiltersChange={setModalFilters} onGroupByChange={setModalGroupBy} onSearchChange={setModalSearch}
                savedFilters={savedFilters}
                onSaveFilter={f => setSavedFilters(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "usuario" }])}
                onDeleteFilter={id => setSavedFilters(prev => prev.filter(f => f.id !== id))}
                onApplyFilter={f => { setModalFilters(f.filters); setModalGroupBy(f.groupBy) }}
                totalCount={cuentas.length} filteredCount={modalFiltradas.length} hideFavorites />
            </div>
            <div className="flex-1 overflow-y-auto">
              {grupos ? grupos.map(([prefijo, cs]) => (
                <div key={prefijo}>
                  <div className="px-5 py-2 bg-gray-50 border-b border-t text-xs font-semibold text-gray-500 uppercase sticky top-0">
                    {prefijo} — {GRUPOS_CUENTA_CONT[prefijo] ?? `Grupo ${prefijo}`}
                    <span className="ml-2 font-normal text-gray-400">({cs.length})</span>
                  </div>
                  {cs.map(c => (
                    <button key={c.id} type="button" onClick={() => seleccionar(c.id)}
                      className={`w-full text-left px-5 py-2.5 hover:bg-indigo-50 border-b border-gray-50 flex items-center gap-3 transition-colors ${c.id === value ? "bg-indigo-100" : ""}`}>
                      <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
                      <span className="text-sm text-gray-800">{c.nombre}</span>
                    </button>
                  ))}
                </div>
              )) : modalFiltradas.length === 0
                ? <div className="px-5 py-8 text-center text-sm text-gray-400">Sin resultados</div>
                : modalFiltradas.map(c => (
                  <button key={c.id} type="button" onClick={() => seleccionar(c.id)}
                    className={`w-full text-left px-5 py-2.5 hover:bg-indigo-50 border-b border-gray-50 flex items-center gap-3 transition-colors ${c.id === value ? "bg-indigo-100" : ""}`}>
                    <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
                    <span className="text-sm text-gray-800">{c.nombre}</span>
                  </button>
                ))
              }
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LibroMayorView() {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [lineas, setLineas] = useState<any[]>([])
  const [filtros, setFiltros] = useState({
    cuenta_id: "",
    fecha_desde: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    fecha_hasta: new Date().toISOString().split("T")[0],
  })
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  useEffect(() => {
    fetch("/api/contabilidad/plan-cuentas?activo=true")
      .then(r => r.json())
      .then(d => setCuentas(Array.isArray(d) ? d : []))
  }, [])

  const buscar = async () => {
    if (!filtros.cuenta_id) { alert("Seleccioná una cuenta para consultar."); return }
    setLoading(true)
    const params = new URLSearchParams({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta })
    const asientos: Asiento[] = await fetch(`/api/contabilidad/asientos?${params}&sin_cancelados=false`).then(r => r.json())
    const resultado: any[] = []
    let saldo = 0
    for (const a of (Array.isArray(asientos) ? asientos : []).sort((x, y) => x.fecha.localeCompare(y.fecha))) {
      for (const l of (a.lineas ?? [])) {
        if (l.cuenta_id === filtros.cuenta_id) {
          saldo += Number(l.debe) - Number(l.haber)
          resultado.push({ ...l, asiento: a, saldo })
        }
      }
    }
    setLineas(resultado)
    setBuscado(true)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-4">Libro Mayor por Cuenta</h1>
      <div className="bg-white border rounded-lg shadow-sm p-6 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta *</label>
            <LibroMayorCuentaCombo
              cuentas={cuentas}
              value={filtros.cuenta_id}
              onChange={id => setFiltros(p => ({ ...p, cuenta_id: id }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm"
              value={filtros.fecha_desde} onChange={e => setFiltros(p => ({ ...p, fecha_desde: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" className="w-full border rounded px-3 py-2 text-sm"
              value={filtros.fecha_hasta} onChange={e => setFiltros(p => ({ ...p, fecha_hasta: e.target.value }))} />
          </div>
        </div>
        <button onClick={buscar} disabled={loading}
          className="mt-4 bg-indigo-900 hover:bg-indigo-800 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
          <Eye className="w-4 h-4" /> {loading ? "Buscando…" : "Ver Libro Mayor"}
        </button>
      </div>
      {buscado && (
        <div className="bg-white border rounded-lg shadow-sm overflow-auto">
          {lineas.length === 0
            ? <p className="text-center text-gray-400 text-sm py-12">Sin movimientos para los filtros seleccionados.</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    {["Fecha", "Asiento", "Concepto", "Debe", "Haber", "Saldo"].map(h => (
                      <th key={h} className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{fmtDate(l.asiento.fecha)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{l.asiento.numero ?? "—"}</td>
                      <td className="px-3 py-2 text-xs max-w-xs truncate">{l.descripcion ?? l.asiento.concepto ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{Number(l.debe) > 0 ? fmtMoney(Number(l.debe)) : ""}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{Number(l.haber) > 0 ? fmtMoney(Number(l.haber)) : ""}</td>
                      <td className={`px-3 py-2 text-right font-mono text-xs font-bold ${l.saldo >= 0 ? "text-blue-700" : "text-red-600"}`}>
                        {fmtMoney(Math.abs(l.saldo))} {l.saldo >= 0 ? "D" : "H"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ MENÃš â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const menuConfig = [
  {
    id: "asientos",
    label: "Asientos Contables",
    icon: BookOpen,
    items: [
      { id: "asientos-automaticos", label: "Asientos Contables" },
      { id: "asientos-manuales",    label: "Asientos Manuales" },
      { id: "libro-mayor",          label: "Libro Mayor por Cuenta" },
    ],
  },
  {
    id: "presupuestos",
    label: "Presupuestos",
    icon: BarChart2,
    items: [{ id: "control-presupuestario", label: "Control Presupuestario" }],
  },
  {
    id: "activos",
    label: "Activos",
    icon: Archive,
    items: [
      { id: "amortizaciones",             label: "Amortizaciones" },
      { id: "devengamientos-diferidos",   label: "Devengamientos Diferidos" },
    ],
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: TrendingUp,
    items: [
      { id: "balance-general",      label: "Balance General" },
      { id: "balance-sumas-saldos", label: "Balance de Sumas y Saldos" },
      { id: "estado-resultados",    label: "Estado de Resultados (PyG)" },
      { id: "libro-iva-digital",    label: "Libro IVA Digital" },
      { id: "informes-contables",   label: "Informes Contables" },
    ],
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings,
    items: [
      { id: "anos-fiscales", label: "Años Fiscales" },
      { id: "periodos",      label: "Períodos" },
      { id: "plan-cuentas",  label: "Plan de Cuentas" },
      { id: "tipos-cuenta",  label: "Tipos de Cuentas" },
      { id: "diarios",       label: "Diarios" },
    ],
  },
]

// â”€â”€â”€ COMPONENTE PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ModuloContabilidad() {
  const [activeView, setActiveView] = useState("asientos-automaticos")
  const [expandedSections, setExpandedSections] = useState<string[]>(["asientos", "configuracion"])

  const toggleSection = (id: string) =>
    setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const renderView = () => {
    switch (activeView) {
      case "asientos-automaticos":        return <AsientosView />
      case "asientos-manuales":           return <AsientosView soloManuales />
      case "libro-mayor":                 return <LibroMayorView />
      case "anos-fiscales":               return <AnosFiscalesView />
      case "periodos":                    return <PlaceholderView title="Períodos" icon={Calendar} />
      case "plan-cuentas":
      case "plan-cuentas-view":          return <PlanCuentasView />
      case "tipos-cuenta":                return <TiposCuentaView />
      case "diarios":                     return <DiariosView />
      case "balance-general":             return <PlaceholderView title="Balance General" icon={Scale} />
      case "balance-sumas-saldos":        return <PlaceholderView title="Balance de Sumas y Saldos" icon={ListOrdered} />
      case "estado-resultados":           return <PlaceholderView title="Estado de Resultados (PyG)" icon={PieChart} />
      case "libro-iva-digital":           return <PlaceholderView title="Libro IVA Digital" icon={BookMarked} />
      case "informes-contables":          return <PlaceholderView title="Informes Contables" icon={FileText} />
      case "control-presupuestario":      return <PlaceholderView title="Control Presupuestario" icon={BarChart2} />
      case "amortizaciones":              return <PlaceholderView title="Amortizaciones" icon={TrendingUp} />
      case "devengamientos-diferidos":    return <PlaceholderView title="Devengamientos Diferidos" icon={Archive} />
      case "diagrama-impuestos":          return <PlaceholderView title="Diagrama de Impuestos" icon={Layers} />
      default:                            return <PlaceholderView title="Vista no encontrada" icon={BookOpen} />
    }
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-600" /> Contabilidad
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {menuConfig.map(section => {
            const Icon = section.icon
            const expanded = expandedSections.includes(section.id)
            return (
              <div key={section.id}>
                <button onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors">
                  <Icon className="w-3 h-3" />
                  <span className="flex-1 text-left">{section.label}</span>
                  {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {expanded && section.items.map(item => (
                  <button key={item.id} onClick={() => setActiveView(item.id)}
                    className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                      activeView === item.id
                        ? "bg-indigo-50 text-indigo-800 font-medium border-r-2 border-indigo-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                    }`}>
                    {item.label}
                  </button>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {renderView()}
      </main>
    </div>
  )
}
