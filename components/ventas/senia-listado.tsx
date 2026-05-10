"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { usePaginacion } from "@/components/ui/paginacion"
import {
  diasRestantes,
  formatCurrency,
  formatDate,
  getEstadoSeniaColor,
  getEstadoSeniaLabel,
  type SeniaEquipo,
} from "./_shared"

export default function SeniaListado() {
  const [items, setItems] = useState<SeniaEquipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/senias-equipo")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        s =>
          s.numero?.toLowerCase().includes(q) ||
          (s.cliente_nombre ?? "").toLowerCase().includes(q) ||
          (s.equipo_nombre ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(s => String(s[f.field as keyof SeniaEquipo] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const stats = useMemo(() => {
    const total = items.length
    const enCurso = items.filter(s => s.estado === "en_curso").length
    const confirmadas = items.filter(s => s.estado === "confirmada").length
    const vencidas = items.filter(s => {
      if (s.estado !== "en_curso") return false
      const d = diasRestantes(s.fecha_limite)
      return d !== null && d < 0
    }).length
    return { total, enCurso, confirmadas, vencidas }
  }, [items])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(items.map(s => s.estado).filter(Boolean))]
    const estadoSenias = [...new Set(items.map(s => s.estado_senia).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoSeniaLabel(e) })) },
      { field: "estado_senia", label: "Estado Seña", values: estadoSenias.map(e => ({ value: e, label: e === "registrada" ? "Registrada" : "Sin seña" })) },
    ].filter(f => f.values.length > 0)
  }, [items])

  const { paginated, controles } = usePaginacion(filtered)

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Seña de Equipo</h1>
          <p className="text-sm text-gray-500">Gestione las reservas de equipos con seña</p>
        </div>
        <Link
          href="/ventas/senia-equipo/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Seña
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">En curso</p>
          <p className="text-2xl font-bold text-blue-600">{stats.enCurso}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Confirmadas</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.confirmadas}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Vencidas</p>
          <p className="text-2xl font-bold text-red-500">{stats.vencidas}</p>
        </div>
      </div>

      <OdooFilterBar
        moduleName="ventas_senias"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "cliente_nombre", label: "Cliente", field: "cliente_nombre" },
        ]}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">N° Seña</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Equipo</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Precio</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Seña</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Límite</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Días</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && paginated.map(s => {
              const href = `/ventas/senia-equipo/${s.id}`
              const moneda = s.moneda ?? "ARS"
              const dias = diasRestantes(s.fecha_limite)
              const vencida = dias !== null && dias < 0 && s.estado === "en_curso"
              return (
                <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 ${vencida ? "bg-red-50" : ""}`}>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{s.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{formatDate(s.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{s.cliente_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm max-w-[200px] truncate">{s.equipo_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right font-medium">{formatCurrency(s.precio_final, moneda)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right">
                    {s.estado_senia === "registrada"
                      ? <span className="text-emerald-600 font-medium">{formatCurrency(s.monto_senia ?? 0, moneda)}</span>
                      : <span className="text-gray-400 text-xs">Sin seña</span>}
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{s.fecha_limite ? formatDate(s.fecha_limite) : "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoSeniaColor(s.estado)}`}>{getEstadoSeniaLabel(s.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    {s.estado === "en_curso" && dias !== null ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        vencida ? "bg-red-100 text-red-700" :
                        dias <= 3 ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {vencida ? `−${Math.abs(dias)}d` : dias === 0 ? "Hoy" : `${dias}d`}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400 text-sm">No hay señas registradas</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex justify-end px-4 py-2 border-t border-gray-100 bg-gray-50">
            {controles}
          </div>
        )}
      </div>
    </div>
  )
}
