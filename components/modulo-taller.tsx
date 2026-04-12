"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Search, Plus, X, ChevronDown, ArrowLeft, CheckCircle, Clock, AlertCircle,
  XCircle, MoreHorizontal, Edit, Trash2, Eye, Save, Settings, User, Wrench,
  Calendar, Filter, FileText, Receipt, CreditCard, Truck, Package, RefreshCw,
  AlertTriangle, ChevronRight, Play, Pause, SkipForward, Printer
} from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import {
  fetchAreas, createArea, updateArea, deleteArea,
  fetchCategorias, createCategoria, updateCategoria, deleteCategoria,
  fetchTiposOT, createTipoOT, updateTipoOT, deleteTipoOT,
  fetchEquipos, createEquipo, updateEquipo, deleteEquipo,
  fetchFallas, createFalla, updateFalla, deleteFalla,
  fetchTecnicos, createTecnico, updateTecnico, deleteTecnico,
  fetchTurnos, createTurno, updateTurno, deleteTurno,
  fetchFeriados, createFeriado, deleteFeriado,
  fetchControles, createControl, updateControl, deleteControl,
  fetchMotivosCierre, createMotivoCierre,
  fetchFallasEquipo, createFallaEquipo, updateFallaEquipo, deleteFallaEquipo,
  fetchOrdenes, fetchOrden, createOrden, updateOrden,
  transicionarOT, crearControlOT, updateControlOT,
  fetchRepuestosOT, addRepuestoOT, replaceRepuestosOT,
  ejecutarAsignador,
  type TallerArea, type TallerCategoria, type TallerTipoOT,
  type TallerEquipo, type TallerFalla, type TallerTecnico,
  type TallerTurno, type TallerFeriado, type TallerControl,
  type TallerMotivoCierre, type TallerFallaEquipo,
  type TallerOrdenTrabajo, type TallerOrdenDetalle,
  type TallerOTRepuesto, type TallerOTControl, type TallerOTControlItem,
  type TallerOTHistorial,
} from "@/lib/taller-actions"

// ─── Estados ────────────────────────────────────────────────────────────────
const ESTADOS_OT = [
  { value: "borrador", label: "Borrador", color: "bg-gray-200 text-gray-700", step: 0 },
  { value: "sin_asignar", label: "Sin Asignar", color: "bg-yellow-100 text-yellow-800", step: 1 },
  { value: "asignada", label: "Asignada", color: "bg-blue-100 text-blue-700", step: 2 },
  { value: "asignada_en_proceso", label: "En Proceso", color: "bg-blue-200 text-blue-800", step: 3 },
  { value: "control_calidad", label: "Control Calidad", color: "bg-purple-100 text-purple-700", step: 4 },
  { value: "facturado", label: "Facturado", color: "bg-green-100 text-green-700", step: 5 },
  { value: "a_entregar", label: "A Entregar", color: "bg-teal-100 text-teal-700", step: 6 },
  { value: "entregado", label: "Entregado", color: "bg-emerald-200 text-emerald-800", step: 7 },
  { value: "re_presupuestacion", label: "Re-presupuestación", color: "bg-orange-100 text-orange-700", step: -1 },
  { value: "falta_repuestos", label: "Falta Repuestos", color: "bg-red-100 text-red-700", step: -2 },
  { value: "cancelada", label: "Cancelada", color: "bg-red-200 text-red-800", step: -3 },
]

const FLUJO_PRINCIPAL = ["borrador", "sin_asignar", "asignada", "asignada_en_proceso", "control_calidad", "facturado", "a_entregar", "entregado"]
const ESTADOS_PAUSA = ["re_presupuestacion", "falta_repuestos"]

function getEstado(val: string) { return ESTADOS_OT.find(e => e.value === val) }
function getBadgeClass(val: string) { return getEstado(val)?.color ?? "bg-gray-200 text-gray-700" }
function getEstadoLabel(val: string) { return getEstado(val)?.label ?? val }

// ─── CRUDTableWithFilter (tabla genérica con OdooFilterBar) ──────────────
function CRUDTableWithFilter({
  title, data, columns, onNew, onEdit, onDelete,
}: {
  title: string
  data: Record<string, unknown>[]
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }[]
  onNew: () => void
  onEdit: (item: Record<string, unknown>) => void
  onDelete: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const filtered = useMemo(() => {
    let result = data
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row =>
        columns.some(c => String(row[c.key] ?? "").toLowerCase().includes(q))
      )
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field] ?? "") === f.value)
    }
    return result
  }, [data, search, activeFilters, columns])

  const filterOptions = useMemo(() =>
    columns.map(c => {
      const vals = [...new Set(data.map(row => String(row[c.key] ?? "")).filter(v => v && v !== "—"))]
      return { field: c.key, label: c.label, values: vals.map(v => ({ value: v, label: v })) }
    }).filter(f => f.values.length > 0 && f.values.length < 50),
  [data, columns])

  const groupByOptions: GroupByOption[] = columns.map(c => ({ id: c.key, label: c.label, field: c.key }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        <button onClick={onNew} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>
      <OdooFilterBar
        moduleName={`taller_${title.toLowerCase().replace(/\s/g, "_")}`}
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={(f) => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={(id) => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={(f) => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }}
        totalCount={data.length}
        filteredCount={filtered.length}
      />
      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map(c => <th key={c.key} className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase text-left">{c.label}</th>)}
              <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id as string} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3 text-sm text-gray-700">
                    {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onEdit(row)} className="text-indigo-600 hover:text-indigo-800 mr-2"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { if (confirm("¿Eliminar?")) onDelete(row.id as string) }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400 text-sm">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function ModuloTaller() {
  const [view, setView] = useState("dashboard")
  const [loading, setLoading] = useState(false)

  // ── Datos maestros ──
  const [areas, setAreas] = useState<TallerArea[]>([])
  const [categorias, setCategorias] = useState<TallerCategoria[]>([])
  const [tiposOT, setTiposOT] = useState<TallerTipoOT[]>([])
  const [equipos, setEquipos] = useState<TallerEquipo[]>([])
  const [fallas, setFallas] = useState<TallerFalla[]>([])
  const [tecnicos, setTecnicos] = useState<TallerTecnico[]>([])
  const [turnos, setTurnos] = useState<TallerTurno[]>([])
  const [feriados, setFeriados] = useState<TallerFeriado[]>([])
  const [controles, setControles] = useState<TallerControl[]>([])
  const [motivosCierre, setMotivosCierre] = useState<TallerMotivoCierre[]>([])
  const [fallasEquipo, setFallasEquipo] = useState<TallerFallaEquipo[]>([])

  // ── OTs ──
  const [ordenes, setOrdenes] = useState<TallerOrdenTrabajo[]>([])
  const [selectedOT, setSelectedOT] = useState<TallerOrdenDetalle | null>(null)
  const [activeTab, setActiveTab] = useState("equipo")

  // ── Búsqueda/filtros OdooFilterBar ──
  const [searchQuery, setSearchQuery] = useState("")
  const [otActiveFilters, setOtActiveFilters] = useState<FilterOption[]>([])
  const [otActiveGroupBy, setOtActiveGroupBy] = useState<GroupByOption[]>([])
  const [otSavedFilters, setOtSavedFilters] = useState<SavedFilter[]>([])
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroArea, setFiltroArea] = useState("")

  // ── Modales ──
  const [showModal, setShowModal] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null)
  const [showAsignador, setShowAsignador] = useState(false)
  const [showControlRecepcion, setShowControlRecepcion] = useState(false)
  const [showControlCalidad, setShowControlCalidad] = useState(false)
  const [showCancelar, setShowCancelar] = useState(false)

  // ── Form Nueva OT ──
  const [formOT, setFormOT] = useState<Record<string, unknown>>({})

  // ── Carga inicial ──
  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      try {
        const [a, c, t, e, f, tec, tu, fer, con, mc, fe] = await Promise.all([
          fetchAreas(), fetchCategorias(), fetchTiposOT(), fetchEquipos(),
          fetchFallas(), fetchTecnicos(), fetchTurnos(), fetchFeriados(),
          fetchControles(), fetchMotivosCierre(), fetchFallasEquipo(),
        ])
        setAreas(a); setCategorias(c); setTiposOT(t); setEquipos(e)
        setFallas(f); setTecnicos(tec); setTurnos(tu); setFeriados(fer)
        setControles(con); setMotivosCierre(mc); setFallasEquipo(fe)

        const ords = await fetchOrdenes()
        setOrdenes(ords)
      } catch (err) {
        console.error("Error cargando datos:", err)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  // ── Recargar ordenes ──
  const recargarOrdenes = useCallback(async () => {
    try {
      const ords = await fetchOrdenes()
      setOrdenes(ords)
    } catch (err) { console.error(err) }
  }, [])

  // ── Abrir detalle ──
  const abrirDetalle = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const det = await fetchOrden(id)
      setSelectedOT(det)
      setActiveTab("equipo")
      setView("detalle_ot")
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  // ── Recargar detalle ──
  const recargarDetalle = useCallback(async () => {
    if (!selectedOT) return
    try {
      const det = await fetchOrden(selectedOT.id)
      setSelectedOT(det)
    } catch (err) { console.error(err) }
  }, [selectedOT])

  // ── Transicionar ──
  const handleTransicion = useCallback(async (nuevoEstado: string, nota?: string, extras?: Record<string, string>) => {
    if (!selectedOT) return
    try {
      await transicionarOT(selectedOT.id, {
        nuevo_estado: nuevoEstado,
        usuario: "Admin",
        nota,
        ...extras,
      })
      await recargarDetalle()
      await recargarOrdenes()
    } catch (err) {
      alert((err as Error).message)
    }
  }, [selectedOT, recargarDetalle, recargarOrdenes])

  // ── Crear OT ──
  const handleCrearOT = useCallback(async () => {
    try {
      setLoading(true)
      const data = await createOrden({
        ...formOT,
        usuario: "Admin",
      })
      setFormOT({})
      await recargarOrdenes()
      // Abrir detalle y lanzar control de recepción
      await abrirDetalle(data.id)
      setShowControlRecepcion(true)
    } catch (err) {
      alert((err as Error).message)
    } finally { setLoading(false) }
  }, [formOT, recargarOrdenes, abrirDetalle])

  // ── Ordenes filtradas ──
  const ordenesFiltradas = useMemo(() => {
    let result = ordenes
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.numero?.toLowerCase().includes(q) ||
        o.taller_equipos?.nombre?.toLowerCase().includes(q) ||
        o.taller_fallas?.nombre?.toLowerCase().includes(q) ||
        o.taller_tecnicos?.nombre?.toLowerCase().includes(q)
      )
    }
    // Aplicar filtros OdooFilterBar
    for (const f of otActiveFilters) {
      result = result.filter(o => {
        if (f.field === "estado") return o.estado === f.value
        if (f.field === "area") return o.taller_areas_reparacion?.nombre === f.value
        if (f.field === "tecnico") return (o.taller_tecnicos?.nombre ?? "Sin asignar") === f.value
        if (f.field === "tipo_ot") return o.taller_tipos_ot?.nombre === f.value
        if (f.field === "equipo") return o.taller_equipos?.nombre === f.value
        return true
      })
    }
    if (filtroEstado) result = result.filter(o => o.estado === filtroEstado)
    if (filtroArea) result = result.filter(o => o.area_id === filtroArea)
    return result
  }, [ordenes, searchQuery, filtroEstado, filtroArea, otActiveFilters])

  // ── OdooFilterBar opciones para OTs ──
  const otFilterOptions = useMemo(() => {
    const estados = [...new Set(ordenes.map(o => o.estado))]
    const areasOp = [...new Set(ordenes.map(o => o.taller_areas_reparacion?.nombre).filter(Boolean))] as string[]
    const tecnicosOp = [...new Set(ordenes.map(o => o.taller_tecnicos?.nombre ?? "Sin asignar"))]
    const tiposOtOp = [...new Set(ordenes.map(o => o.taller_tipos_ot?.nombre).filter(Boolean))] as string[]
    const equiposOp = [...new Set(ordenes.map(o => o.taller_equipos?.nombre).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoLabel(e) })) },
      { field: "area", label: "Área", values: areasOp.map(a => ({ value: a, label: a })) },
      { field: "tecnico", label: "Técnico", values: tecnicosOp.map(t => ({ value: t, label: t })) },
      { field: "tipo_ot", label: "Tipo OT", values: tiposOtOp.map(t => ({ value: t, label: t })) },
      { field: "equipo", label: "Equipo", values: equiposOp.map(e => ({ value: e, label: e })) },
    ]
  }, [ordenes])

  const otGroupByOptions: GroupByOption[] = [
    { id: "estado", label: "Estado", field: "estado" },
    { id: "area", label: "Área", field: "area" },
    { id: "tecnico", label: "Técnico", field: "tecnico" },
    { id: "tipo_ot", label: "Tipo OT", field: "tipo_ot" },
    { id: "equipo", label: "Equipo", field: "equipo" },
  ]

  const handleOtSaveFilter = (filter: Omit<SavedFilter, "id" | "createdBy">) => {
    setOtSavedFilters(prev => [...prev, { ...filter, id: `f-${Date.now()}`, createdBy: "current_user" }])
  }
  const handleOtDeleteFilter = (id: string) => setOtSavedFilters(prev => prev.filter(f => f.id !== id))
  const handleOtApplyFilter = (filter: SavedFilter) => { setOtActiveFilters(filter.filters); setOtActiveGroupBy(filter.groupBy) }

  // ── Stats ──
  const stats = useMemo(() => ({
    total: ordenes.length,
    sin_asignar: ordenes.filter(o => o.estado === "sin_asignar").length,
    en_proceso: ordenes.filter(o => o.estado === "asignada_en_proceso").length,
    control: ordenes.filter(o => o.estado === "control_calidad").length,
    pausadas: ordenes.filter(o => ESTADOS_PAUSA.includes(o.estado)).length,
  }), [ordenes])

  // ════════════════════════════════════════════════════════════════════════
  // SIDEBAR
  // ════════════════════════════════════════════════════════════════════════
  const renderSidebar = () => (
    <div className="p-4">
      <div className="mb-6">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Principal</h3>
        {[
          { key: "dashboard", label: "Dashboard" },
          { key: "ordenes", label: "Órdenes de Trabajo" },
        ].map(item => (
          <button key={item.key} onClick={() => setView(item.key)}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${view === item.key ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mb-6">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Catálogos</h3>
        {[
          { key: "cat_tecnicos", label: "Técnicos" },
          { key: "cat_equipos", label: "Equipos" },
          { key: "cat_fallas", label: "Fallas" },
        ].map(item => (
          <button key={item.key} onClick={() => setView(item.key)}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${view === item.key ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mb-6">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Configuración</h3>
        {[
          { key: "cfg_areas", label: "Áreas de Reparación" },
          { key: "cfg_categorias", label: "Categorías Reparación" },
          { key: "cfg_tipos_ot", label: "Tipos de OT" },
          { key: "cfg_fallas_equipo", label: "Fallas por Equipos" },
          { key: "cfg_turnos", label: "Turnos de Técnicos" },
          { key: "cfg_feriados", label: "Feriados" },
          { key: "cfg_controles", label: "Controles / Checklist" },
          { key: "cfg_motivos_cierre", label: "Motivos de Cierre" },
        ].map(item => (
          <button key={item.key} onClick={() => setView(item.key)}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${view === item.key ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="mb-6">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Vistas Técnico</h3>
        <button onClick={() => setView("kanban")}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${view === "kanban" ? "bg-indigo-100 text-indigo-800 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
          Kanban Técnicos
        </button>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════════════════
  const renderDashboard = () => (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-6">Dashboard del Taller</h1>
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total OTs", value: stats.total, icon: Wrench, color: "indigo" },
          { label: "Sin Asignar", value: stats.sin_asignar, icon: AlertCircle, color: "yellow" },
          { label: "En Proceso", value: stats.en_proceso, icon: Play, color: "blue" },
          { label: "Control Calidad", value: stats.control, icon: CheckCircle, color: "purple" },
          { label: "En Pausa", value: stats.pausadas, icon: Pause, color: "orange" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 text-${stat.color}-500 opacity-50`} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">OTs por Estado</h3>
          <div className="space-y-2">
            {ESTADOS_OT.filter(e => e.step >= 0).map(est => {
              const count = ordenes.filter(o => o.estado === est.value).length
              return (
                <div key={est.value} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Técnicos Activos</h3>
          <div className="space-y-2">
            {tecnicos.filter(t => t.activo).map(tec => {
              const otsAsignadas = ordenes.filter(o => o.tecnico_id === tec.id && ["asignada", "asignada_en_proceso"].includes(o.estado)).length
              return (
                <div key={tec.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{tec.nombre}</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{otsAsignadas} OTs</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════
  // LISTA DE ÓRDENES
  // ════════════════════════════════════════════════════════════════════════
  const renderOrdenes = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Órdenes de Trabajo</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowAsignador(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600">
            <RefreshCw className="w-4 h-4" /> Asignador
          </button>
          <button onClick={() => { setFormOT({}); setView("nueva_ot") }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nueva OT
          </button>
        </div>
      </div>

      <OdooFilterBar
        moduleName="taller_ordenes"
        filterOptions={otFilterOptions}
        groupByOptions={otGroupByOptions}
        activeFilters={otActiveFilters}
        activeGroupBy={otActiveGroupBy}
        searchTerm={searchQuery}
        onFiltersChange={setOtActiveFilters}
        onGroupByChange={setOtActiveGroupBy}
        onSearchChange={setSearchQuery}
        savedFilters={otSavedFilters}
        onSaveFilter={handleOtSaveFilter}
        onDeleteFilter={handleOtDeleteFilter}
        onApplyFilter={handleOtApplyFilter}
        totalCount={ordenes.length}
        filteredCount={ordenesFiltradas.length}
      />

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {["Número", "Fecha", "Cliente", "Equipo", "Falla", "Estado", "Técnico", "Presupuesto"].map(h =>
                <th key={h} className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase text-left">{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.map(ot => (
              <tr key={ot.id} onClick={() => abrirDetalle(ot.id)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 text-sm font-medium text-indigo-600">{ot.numero}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{ot.fecha_creacion?.split("T")[0]}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ot.cliente_id}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ot.taller_equipos?.nombre}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ot.taller_fallas?.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeClass(ot.estado)}`}>{getEstadoLabel(ot.estado)}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{ot.taller_tecnicos?.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-700 text-right">{ot.presupuesto_estimado ? `$${Number(ot.presupuesto_estimado).toLocaleString()}` : "—"}</td>
              </tr>
            ))}
            {ordenesFiltradas.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No se encontraron órdenes de trabajo</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════
  // NUEVA OT
  // ════════════════════════════════════════════════════════════════════════
  const renderNuevaOT = () => {
    const areaId = formOT.area_id as string
    const tipoOtId = formOT.tipo_ot_id as string
    const equipoId = formOT.equipo_id as string
    const fallaId = formOT.falla_principal_id as string

    const tipoOTSeleccionado = tiposOT.find(t => t.id === tipoOtId)
    const tiposFiltrados = tiposOT.filter(t => t.area_id === areaId && t.activo)
    const equiposFiltrados = equipos.filter(e => e.area_id === areaId && e.activo)
    const fallasFiltradas = fallas.filter(f => f.area_id === areaId && f.activo)
    const categoriaRep = fallas.find(f => f.id === fallaId)?.categoria_id
    const categoriaNombre = categorias.find(c => c.id === categoriaRep)?.nombre ?? ""

    const areaSeleccionada = areas.find(a => a.id === areaId)
    const mostrarIMEI = areaSeleccionada?.codigo === "CEL"
    const mostrarSerial = areaSeleccionada?.codigo === "LAP"

    const setField = (key: string, value: unknown) => setFormOT(prev => ({ ...prev, [key]: value }))

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView("ordenes")} className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <ArrowLeft className="w-4 h-4" /> Volver a Órdenes
          </button>
          <h1 className="text-2xl font-bold text-amber-900">Nueva Orden de Trabajo</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Col izquierda */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área de Reparación *</label>
                <select value={areaId ?? ""} onChange={e => {
                  setFormOT({ area_id: e.target.value })  // reset todo al cambiar área
                }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {areas.filter(a => a.activo).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de OT *</label>
                <select value={tipoOtId ?? ""} onChange={e => setField("tipo_ot_id", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {tiposFiltrados.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>

              {tipoOTSeleccionado?.es_garantia_compra && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Factura de Origen</label>
                  <input placeholder="Buscar factura X-XXXXXX" value={formOT.factura_origen_id as string ?? ""}
                    onChange={e => setField("factura_origen_id", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              {tipoOTSeleccionado?.es_garantia_reparacion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OT de Origen</label>
                  <input placeholder="Buscar OT por número" value={formOT.ot_origen_id as string ?? ""}
                    onChange={e => setField("ot_origen_id", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipo *</label>
                <select value={equipoId ?? ""} onChange={e => setField("equipo_id", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {equiposFiltrados.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre} {eq.marca ? `(${eq.marca})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Falla Principal *</label>
                <select value={fallaId ?? ""} onChange={e => {
                  const fid = e.target.value
                  const cat = fallas.find(f => f.id === fid)?.categoria_id
                  setFormOT(prev => ({ ...prev, falla_principal_id: fid, categoria_reparacion_id: cat }))
                }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {fallasFiltradas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría de Reparación</label>
                <input value={categoriaNombre} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50" />
              </div>
            </div>

            {/* Col derecha */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <input placeholder="Buscar cliente..." value={formOT.cliente_id as string ?? ""}
                  onChange={e => setField("cliente_id", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Celular de Contacto *</label>
                <input value={formOT.celular_contacto as string ?? ""}
                  onChange={e => setField("celular_contacto", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              {mostrarIMEI && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IMEI</label>
                  <input value={formOT.imei as string ?? ""} onChange={e => setField("imei", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              {mostrarSerial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input value={formOT.serial_number as string ?? ""} onChange={e => setField("serial_number", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Desbloqueo</label>
                <input value={formOT.codigo_desbloqueo as string ?? ""} onChange={e => setField("codigo_desbloqueo", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "ingresa_apagado", label: "Ingresa Apagado" },
                  { key: "ingresa_mojado", label: "Ingresa Mojado" },
                  { key: "deja_cargador", label: "Deja Cargador" },
                  { key: "requerido_mkt", label: "Requerido por MKT" },
                ].map(cb => (
                  <label key={cb.key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={!!formOT[cb.key]} onChange={e => setField(cb.key, e.target.checked)} className="rounded" />
                    {cb.label}
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto Estimado</label>
                <input type="number" value={formOT.presupuesto_estimado as string ?? ""} onChange={e => setField("presupuesto_estimado", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Observaciones</label>
                <textarea rows={3} value={formOT.descripcion as string ?? ""} onChange={e => setField("descripcion", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button onClick={() => setView("ordenes")} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleCrearOT} disabled={loading} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50">
              {loading ? "Creando..." : "Crear Orden"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // DETALLE OT
  // ════════════════════════════════════════════════════════════════════════
  const renderDetalleOT = () => {
    if (!selectedOT) return null
    const ot = selectedOT
    const estadoInfo = getEstado(ot.estado)

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => { setView("ordenes"); setSelectedOT(null) }} className="text-indigo-700 hover:text-indigo-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-amber-900">{ot.numero}</h1>
            <span className={`text-xs px-3 py-1 rounded-full ${estadoInfo?.color}`}>{estadoInfo?.label}</span>
          </div>
          <div className="flex gap-2">
            {/* Botones de comprobantes */}
            {["asignada", "asignada_en_proceso", "control_calidad", "facturado", "a_entregar", "entregado"].includes(ot.estado) && (
              <>
                <button className="px-3 py-1.5 border rounded text-xs flex items-center gap-1">
                  <Receipt className="w-3 h-3" /> Recibos ({ot.comprobantes?.recibos?.length ?? 0})
                </button>
                <button className="px-3 py-1.5 border rounded text-xs flex items-center gap-1">
                  <FileText className="w-3 h-3" /> NV ({ot.comprobantes?.notas_venta?.length ?? 0})
                </button>
                <button className="px-3 py-1.5 border rounded text-xs flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Facturas ({ot.comprobantes?.facturas?.length ?? 0})
                </button>
              </>
            )}
            <button onClick={() => setShowCancelar(true)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs hover:bg-red-100">
              <XCircle className="w-3 h-3 inline mr-1" /> Cancelar OT
            </button>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-1">
            {FLUJO_PRINCIPAL.map((est, i) => {
              const info = getEstado(est)!
              const currentIdx = FLUJO_PRINCIPAL.indexOf(ot.estado)
              const isPaused = ESTADOS_PAUSA.includes(ot.estado)
              const isActive = est === ot.estado
              const isCompleted = i < currentIdx
              return (
                <React.Fragment key={est}>
                  <div className={`flex-1 text-center text-[10px] py-1.5 rounded ${
                    isActive ? "bg-indigo-600 text-white font-medium" :
                    isCompleted ? "bg-indigo-100 text-indigo-700" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {info.label}
                  </div>
                  {i < FLUJO_PRINCIPAL.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                </React.Fragment>
              )
            })}
          </div>
          {ESTADOS_PAUSA.includes(ot.estado) && (
            <div className="mt-2 flex gap-2">
              {ESTADOS_PAUSA.map(est => {
                const info = getEstado(est)!
                return (
                  <span key={est} className={`text-[10px] px-2 py-1 rounded ${est === ot.estado ? "bg-orange-500 text-white font-medium" : "bg-orange-50 text-orange-400"}`}>
                    {info.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones contextuales */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {ot.estado === "borrador" && (
              <button onClick={() => setShowControlRecepcion(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                Completar Control de Recepción
              </button>
            )}
            {ot.estado === "sin_asignar" && (
              <button onClick={() => setShowAsignador(true)} className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs hover:bg-amber-600">
                Ejecutar Asignador
              </button>
            )}
            {ot.estado === "asignada" && (
              <button onClick={() => handleTransicion("asignada_en_proceso", "Técnico inició trabajo")} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                <Play className="w-3 h-3 inline mr-1" /> Iniciar Trabajo
              </button>
            )}
            {ot.estado === "asignada_en_proceso" && (
              <>
                <button onClick={() => handleTransicion("control_calidad", "Enviado a control de calidad")} className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs hover:bg-purple-700">
                  Enviar a Control de Calidad
                </button>
                <button onClick={() => {
                  const texto = prompt("Motivo de re-presupuestación:")
                  if (texto) handleTransicion("re_presupuestacion", texto)
                }} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600">
                  Re-presupuestar
                </button>
                <button onClick={() => handleTransicion("falta_repuestos", "Falta de repuestos")} className="px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                  Falta de Repuestos
                </button>
              </>
            )}
            {ot.estado === "re_presupuestacion" && (
              <>
                <button onClick={() => handleTransicion("asignada_en_proceso", "Cliente aceptó re-presupuestación")} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                  Cliente Aceptó
                </button>
                <button onClick={() => setShowCancelar(true)} className="px-3 py-1.5 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                  Cliente No Aceptó
                </button>
              </>
            )}
            {ot.estado === "falta_repuestos" && (
              <>
                <button onClick={() => handleTransicion("asignada_en_proceso", "Repuestos recibidos")} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                  Repuestos Recibidos
                </button>
                <button onClick={() => {
                  const texto = prompt("Motivo de re-presupuestación:")
                  if (texto) handleTransicion("re_presupuestacion", texto)
                }} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600">
                  Requiere Re-presupuestación
                </button>
              </>
            )}
            {ot.estado === "control_calidad" && (
              <>
                <button onClick={() => handleTransicion("facturado", "Control de calidad aprobado")} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                  <CheckCircle className="w-3 h-3 inline mr-1" /> Aprobar Control
                </button>
                <button onClick={() => handleTransicion("asignada_en_proceso", "Retrabajo solicitado")} className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs hover:bg-orange-600">
                  Retrabajo
                </button>
              </>
            )}
            {ot.estado === "a_entregar" && (
              <button onClick={() => handleTransicion("entregado", "Entregado al cliente")} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">
                Marcar como Entregado
              </button>
            )}
          </div>
        </div>

        {/* Info de la OT — dos columnas */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
            {[
              ["Área", ot.taller_areas_reparacion?.nombre],
              ["Tipo de OT", ot.taller_tipos_ot?.nombre],
              ["Tipo Técnico", ot.tipo_tecnico],
              ["Cliente", ot.cliente_id],
              ["Categoría Cliente", ot.categoria_cliente],
              ["Código Desbloqueo", ot.codigo_desbloqueo],
              ["Serial", ot.serial_number],
              ["IMEI", ot.imei],
            ].map(([label, val]) => val ? (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{val as string}</span>
              </div>
            ) : null)}
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
            {[
              ["Fecha Creación", ot.fecha_creacion?.split("T")[0]],
              ["Fecha Asignación", ot.fecha_asignacion?.split("T")[0]],
              ["Celular", ot.celular_contacto],
              ["Ingresa Apagado", ot.ingresa_apagado ? "Sí" : "No"],
              ["Ingresa Mojado", ot.ingresa_mojado ? "Sí" : "No"],
              ["Deja Cargador", ot.deja_cargador ? "Sí" : "No"],
              ["Requerido MKT", ot.requerido_mkt ? "Sí" : "No"],
              ["Retrabajo", ot.retrabajo ? "Sí" : "No"],
              ["Tiempo Teórico", ot.tiempo_reparacion_teorico ? `${ot.tiempo_reparacion_teorico} min` : "—"],
              ["Tiempo Real", ot.tiempo_reparacion_real ? `${ot.tiempo_reparacion_real} min` : "—"],
              ["Puntaje", ot.puntaje != null ? String(ot.puntaje) : "—"],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{val as string}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b flex">
            {[
              { key: "equipo", label: "Equipo" },
              { key: "repuestos", label: "Repuestos y Servicios" },
              { key: "control", label: "Control" },
              { key: "descripcion", label: "Descripción" },
              { key: "historial", label: "Etapas / Historial" },
              { key: "faltantes", label: "Repuestos Faltantes" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            {activeTab === "equipo" && (
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Equipo</span><span className="font-medium">{ot.taller_equipos?.nombre} {ot.taller_equipos?.marca ? `(${ot.taller_equipos.marca} ${ot.taller_equipos.modelo ?? ""})` : ""}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Falla Principal</span><span className="font-medium">{ot.taller_fallas?.nombre}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Fallas Secundarias</span><span className="font-medium">{ot.fallas_secundarias?.map(f => f.nombre).join(", ") || "—"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Técnico</span><span className="font-medium">{ot.taller_tecnicos?.nombre ?? "Sin asignar"}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Categoría Reparación</span><span className="font-medium">{ot.taller_categorias_reparacion?.nombre ?? "—"}</span></div>
              </div>
            )}
            {activeTab === "repuestos" && (
              <div>
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b">
                    {["Producto", "Cant.", "Unidad", "Precio Unit.", "Desc.%", "Subtotal", "Total"].map(h =>
                      <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>
                    {(ot.repuestos ?? []).map(r => (
                      <tr key={r.id} className="border-b">
                        <td className="px-2 py-2">{r.producto_nombre}</td>
                        <td className="px-2 py-2">{r.cantidad}</td>
                        <td className="px-2 py-2">{r.unidad}</td>
                        <td className="px-2 py-2 text-right">${Number(r.precio_unitario).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right">{r.descuento_pct}%</td>
                        <td className="px-2 py-2 text-right">${Number(r.subtotal).toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-medium">${Number(r.total).toLocaleString()}</td>
                      </tr>
                    ))}
                    {(!ot.repuestos || ot.repuestos.length === 0) && (
                      <tr><td colSpan={7} className="px-2 py-4 text-center text-gray-400">Sin repuestos cargados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === "control" && (
              <div>
                {(ot.controles ?? []).map(ctrl => (
                  <div key={ctrl.id} className="mb-4 border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{ctrl.tipo === "inicial" ? "Control de Recepción" : "Control de Calidad"}</span>
                      <div className="flex gap-2">
                        {ctrl.historico && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Histórico</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded ${ctrl.completado ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {ctrl.completado ? "Completado" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead><tr className="border-b">
                        <th className="px-2 py-1 text-left text-xs text-gray-500">Control</th>
                        <th className="px-2 py-1 text-left text-xs text-gray-500">Obs. Inicial</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500">Inicial</th>
                        <th className="px-2 py-1 text-left text-xs text-gray-500">Obs. Final</th>
                        <th className="px-2 py-1 text-center text-xs text-gray-500">Final</th>
                      </tr></thead>
                      <tbody>
                        {(ctrl.taller_ot_control_items ?? []).map(item => (
                          <tr key={item.id} className="border-b">
                            <td className="px-2 py-1">{item.nombre}</td>
                            <td className="px-2 py-1 text-gray-500">{item.obs_inicial ?? "—"}</td>
                            <td className="px-2 py-1 text-center">{item.check_inicial ? "✓" : "—"}</td>
                            <td className="px-2 py-1 text-gray-500">{item.obs_final ?? "—"}</td>
                            <td className="px-2 py-1 text-center">{item.check_final ? "✓" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
                {(!ot.controles || ot.controles.length === 0) && (
                  <p className="text-center text-gray-400 py-4 text-sm">Sin controles registrados</p>
                )}
              </div>
            )}
            {activeTab === "descripcion" && (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {ot.descripcion || "Sin descripción"}
              </div>
            )}
            {activeTab === "historial" && (
              <div>
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b">
                    {["Fecha", "Usuario", "Estado Ant.", "Estado Nuevo", "Nota"].map(h =>
                      <th key={h} className="px-2 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                    )}
                  </tr></thead>
                  <tbody>
                    {(ot.historial ?? []).map(h => (
                      <tr key={h.id} className="border-b">
                        <td className="px-2 py-2 text-gray-500">{h.fecha?.split("T")[0]} {h.fecha?.split("T")[1]?.substring(0, 5)}</td>
                        <td className="px-2 py-2">{h.usuario}</td>
                        <td className="px-2 py-2">{h.estado_anterior ? getEstadoLabel(h.estado_anterior) : "—"}</td>
                        <td className="px-2 py-2">{h.estado_nuevo ? getEstadoLabel(h.estado_nuevo) : "—"}</td>
                        <td className="px-2 py-2 text-gray-600">{h.nota ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {activeTab === "faltantes" && (
              <div className="text-sm text-gray-500 text-center py-8">
                {ot.estado === "falta_repuestos"
                  ? "Cargar repuestos faltantes desde aquí. (Funcionalidad pendiente de integración con módulo Compras)"
                  : "Esta pestaña se activa cuando la OT está en estado Falta de Repuestos"}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // KANBAN
  // ════════════════════════════════════════════════════════════════════════
  const renderKanban = () => {
    const columnas = [
      { estado: "asignada", label: "Pendientes" },
      { estado: "asignada_en_proceso", label: "En Proceso" },
      { estado: "re_presupuestacion", label: "Re-presupuestación" },
      { estado: "falta_repuestos", label: "Falta Repuestos" },
      { estado: "control_calidad", label: "Control Calidad" },
    ]

    return (
      <div>
        <h1 className="text-2xl font-bold text-amber-900 mb-4">Kanban Técnicos</h1>
        <div className="grid grid-cols-5 gap-3">
          {columnas.map(col => {
            const otsCol = ordenes.filter(o => o.estado === col.estado)
            return (
              <div key={col.estado} className="bg-gray-50 rounded-lg p-3 min-h-[400px]">
                <h3 className="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center justify-between">
                  {col.label}
                  <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{otsCol.length}</span>
                </h3>
                <div className="space-y-2">
                  {otsCol.map(ot => (
                    <div key={ot.id} onClick={() => abrirDetalle(ot.id)} className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4 border-indigo-400">
                      <div className="text-xs font-semibold text-indigo-600 mb-1">{ot.numero}</div>
                      <div className="text-xs text-gray-500 mb-1">{ot.taller_equipos?.nombre}</div>
                      <div className="text-xs text-gray-700 mb-1">{ot.taller_fallas?.nombre}</div>
                      <div className="text-[10px] text-gray-400">{ot.taller_tecnicos?.nombre ?? "Sin técnico"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // CRUD GENÉRICO PARA CATÁLOGOS
  // ════════════════════════════════════════════════════════════════════════
  const renderCRUDTable = (
    title: string,
    data: Record<string, unknown>[],
    columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }[],
    onNew: () => void,
    onEdit: (item: Record<string, unknown>) => void,
    onDelete: (id: string) => void,
  ) => (
    <CRUDTableWithFilter
      title={title}
      data={data}
      columns={columns}
      onNew={onNew}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  )

  // ════════════════════════════════════════════════════════════════════════
  // CATÁLOGOS
  // ════════════════════════════════════════════════════════════════════════
  const renderCatTecnicos = () => renderCRUDTable(
    "Técnicos", tecnicos as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "tipo", label: "Tipo", render: v => <span className={`text-xs px-2 py-0.5 rounded-full ${v === "propio" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{v as string}</span> },
      { key: "taller_areas_reparacion", label: "Área", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "taller_categorias_reparacion", label: "Cat. Principal", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "complejidad_tope", label: "Complejidad Tope" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("tecnico") },
    (item) => { setEditingItem(item); setShowModal("tecnico") },
    async (id) => { await deleteTecnico(id); setTecnicos(await fetchTecnicos()) }
  )

  const renderCatEquipos = () => renderCRUDTable(
    "Equipos", equipos as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "marca", label: "Marca" },
      { key: "modelo", label: "Modelo" },
      { key: "taller_areas_reparacion", label: "Área", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "dias_garantia_compra", label: "Garantía Compra (días)" },
      { key: "dias_garantia_reparacion", label: "Garantía Rep. (días)" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("equipo") },
    (item) => { setEditingItem(item); setShowModal("equipo") },
    async (id) => { await deleteEquipo(id); setEquipos(await fetchEquipos()) }
  )

  const renderCatFallas = () => renderCRUDTable(
    "Fallas", fallas as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "taller_areas_reparacion", label: "Área", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "taller_categorias_reparacion", label: "Categoría", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("falla") },
    (item) => { setEditingItem(item); setShowModal("falla") },
    async (id) => { await deleteFalla(id); setFallas(await fetchFallas()) }
  )

  // ════════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ════════════════════════════════════════════════════════════════════════
  const renderCfgAreas = () => renderCRUDTable(
    "Áreas de Reparación", areas as unknown as Record<string, unknown>[],
    [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" },
      { key: "descripcion", label: "Descripción" },
      { key: "orden", label: "Orden" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("area") },
    (item) => { setEditingItem(item); setShowModal("area") },
    async (id) => { await deleteArea(id); setAreas(await fetchAreas()) }
  )

  const renderCfgCategorias = () => renderCRUDTable(
    "Categorías de Reparación", categorias as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "taller_areas_reparacion", label: "Área", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "orden_asignacion", label: "Orden Asignación" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("categoria") },
    (item) => { setEditingItem(item); setShowModal("categoria") },
    async (id) => { await deleteCategoria(id); setCategorias(await fetchCategorias()) }
  )

  const renderCfgTiposOT = () => renderCRUDTable(
    "Tipos de OT", tiposOT as unknown as Record<string, unknown>[],
    [
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Nombre" },
      { key: "taller_areas_reparacion", label: "Área", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "tipo_tecnico", label: "Tipo Técnico" },
      { key: "es_garantia_compra", label: "Gar. Compra", render: v => v ? "Sí" : "No" },
      { key: "es_garantia_reparacion", label: "Gar. Rep.", render: v => v ? "Sí" : "No" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("tipo_ot") },
    (item) => { setEditingItem(item); setShowModal("tipo_ot") },
    async (id) => { await deleteTipoOT(id); setTiposOT(await fetchTiposOT()) }
  )

  const renderCfgTurnos = () => renderCRUDTable(
    "Turnos de Técnicos", turnos as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "hora_entrada", label: "Entrada" },
      { key: "hora_salida", label: "Salida" },
      { key: "trabaja_sabado", label: "Sábado", render: v => v ? "Sí" : "No" },
      { key: "trabaja_domingo", label: "Domingo", render: v => v ? "Sí" : "No" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("turno") },
    (item) => { setEditingItem(item); setShowModal("turno") },
    async (id) => { await deleteTurno(id); setTurnos(await fetchTurnos()) }
  )

  const renderCfgFeriados = () => renderCRUDTable(
    "Feriados", feriados as unknown as Record<string, unknown>[],
    [
      { key: "fecha", label: "Fecha" },
      { key: "descripcion", label: "Descripción" },
    ],
    () => { setEditingItem(null); setShowModal("feriado") },
    () => {},
    async (id) => { await deleteFeriado(id); setFeriados(await fetchFeriados()) }
  )

  const renderCfgControles = () => renderCRUDTable(
    "Controles / Checklist", controles as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "taller_areas_reparacion", label: "Área", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "disponible_recepcion", label: "Recepción", render: v => v ? "✓" : "—" },
      { key: "disponible_calidad", label: "Calidad", render: v => v ? "✓" : "—" },
      { key: "orden", label: "Orden" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("control") },
    (item) => { setEditingItem(item); setShowModal("control") },
    async (id) => { await deleteControl(id); setControles(await fetchControles()) }
  )

  const renderCfgMotivosCierre = () => renderCRUDTable(
    "Motivos de Cierre", motivosCierre as unknown as Record<string, unknown>[],
    [
      { key: "nombre", label: "Nombre" },
      { key: "activo", label: "Activo", render: v => v ? "✓" : "✗" },
    ],
    () => { setEditingItem(null); setShowModal("motivo_cierre") },
    () => {},
    () => {}
  )

  const renderCfgFallasEquipo = () => renderCRUDTable(
    "Fallas por Equipos", fallasEquipo as unknown as Record<string, unknown>[],
    [
      { key: "taller_equipos", label: "Equipo", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "taller_fallas", label: "Falla", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "taller_categorias_reparacion", label: "Categoría", render: v => (v as { nombre: string } | null)?.nombre ?? "—" },
      { key: "complejidad_principal", label: "Compl. Princ." },
      { key: "complejidad_secundaria", label: "Compl. Sec." },
      { key: "tiempo_reparacion_principal", label: "Tiempo Princ. (min)" },
      { key: "puntaje_base", label: "Puntaje Base" },
    ],
    () => { setEditingItem(null); setShowModal("falla_equipo") },
    (item) => { setEditingItem(item); setShowModal("falla_equipo") },
    async (id) => { await deleteFallaEquipo(id); setFallasEquipo(await fetchFallasEquipo()) }
  )

  // ════════════════════════════════════════════════════════════════════════
  // MODAL ASIGNADOR
  // ════════════════════════════════════════════════════════════════════════
  const renderModalAsignador = () => {
    const [tecSeleccionados, setTecSeleccionados] = useState<string[]>(tecnicos.filter(t => t.activo).map(t => t.id))
    const [tope, setTope] = useState(4)
    const [resultado, setResultado] = useState<{ asignadas: number; detalle: { ot_numero: string; tecnico_nombre: string }[] } | null>(null)
    const [running, setRunning] = useState(false)

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">Asignador Automático de Técnicos</h3>
          
          {!resultado ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Técnicos a incluir:</label>
                <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
                  {tecnicos.filter(t => t.activo).map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={tecSeleccionados.includes(t.id)}
                        onChange={e => setTecSeleccionados(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))} />
                      {t.nombre} ({t.tipo})
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tope de OTs por técnico:</label>
                <input type="number" value={tope} onChange={e => setTope(Number(e.target.value))} className="border rounded px-3 py-2 text-sm w-24" min={1} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAsignador(false)} className="px-4 py-2 border rounded text-sm">Cerrar</button>
                <button onClick={async () => {
                  setRunning(true)
                  try {
                    const res = await ejecutarAsignador({ tecnico_ids: tecSeleccionados, tope_por_tecnico: tope, usuario: "Admin" })
                    setResultado(res)
                    await recargarOrdenes()
                  } catch (err) { alert((err as Error).message) }
                  finally { setRunning(false) }
                }} disabled={running} className="px-4 py-2 bg-amber-500 text-white rounded text-sm hover:bg-amber-600 disabled:opacity-50">
                  {running ? "Ejecutando..." : "Ejecutar Asignación"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm mb-3">Se asignaron <strong>{resultado.asignadas}</strong> órdenes:</p>
              <div className="max-h-60 overflow-y-auto border rounded p-2 mb-4">
                {resultado.detalle.map((d, i) => (
                  <div key={i} className="text-sm py-1 border-b last:border-0">
                    <span className="font-medium text-indigo-600">{d.ot_numero}</span> → {d.tecnico_nombre}
                  </div>
                ))}
                {resultado.asignadas === 0 && <p className="text-sm text-gray-400 text-center py-2">No había OTs sin asignar o técnicos disponibles</p>}
              </div>
              <div className="flex justify-end">
                <button onClick={() => { setShowAsignador(false); setResultado(null) }} className="px-4 py-2 bg-indigo-900 text-white rounded text-sm hover:bg-indigo-800">Cerrar</button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // MODAL CANCELAR OT
  // ════════════════════════════════════════════════════════════════════════
  const renderModalCancelar = () => {
    const [motivoId, setMotivoId] = useState("")
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">Cancelar OT</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cierre *</label>
            <select value={motivoId} onChange={e => setMotivoId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
              {motivosCierre.filter(m => m.activo).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCancelar(false)} className="px-4 py-2 border rounded text-sm">Volver</button>
            <button onClick={async () => {
              if (!motivoId) { alert("Seleccione un motivo"); return }
              await handleTransicion("cancelada", "OT cancelada", { motivo_cierre_id: motivoId })
              setShowCancelar(false)
            }} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Confirmar Cancelación
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ════════════════════════════════════════════════════════════════════════
  const renderContent = () => {
    switch (view) {
      case "dashboard": return renderDashboard()
      case "ordenes": return renderOrdenes()
      case "nueva_ot": return renderNuevaOT()
      case "detalle_ot": return renderDetalleOT()
      case "kanban": return renderKanban()
      case "cat_tecnicos": return renderCatTecnicos()
      case "cat_equipos": return renderCatEquipos()
      case "cat_fallas": return renderCatFallas()
      case "cfg_areas": return renderCfgAreas()
      case "cfg_categorias": return renderCfgCategorias()
      case "cfg_tipos_ot": return renderCfgTiposOT()
      case "cfg_fallas_equipo": return renderCfgFallasEquipo()
      case "cfg_turnos": return renderCfgTurnos()
      case "cfg_feriados": return renderCfgFeriados()
      case "cfg_controles": return renderCfgControles()
      case "cfg_motivos_cierre": return renderCfgMotivosCierre()
      default: return renderDashboard()
    }
  }

  return (
    <div className="flex">
      <aside className="w-52 bg-white border-r border-gray-200 fixed top-11 left-0 bottom-0 overflow-y-auto">
        {renderSidebar()}
      </aside>
      <main className="ml-52 flex-1 p-6 min-h-[calc(100vh-44px)]">
        {loading && view !== "detalle_ot" && view !== "nueva_ot" ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : renderContent()}
      </main>

      {/* Modales */}
      {showAsignador && renderModalAsignador()}
      {showCancelar && renderModalCancelar()}
    </div>
  )
}
