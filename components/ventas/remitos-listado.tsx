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
  formatDate,
  getEstadoRemitoColor,
  getEstadoRemitoLabel,
  type Remito,
} from "./_shared"

export default function RemitosListado() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/remitos-venta")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRemitos(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = remitos
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        r =>
          r.numero?.toLowerCase().includes(q) ||
          r.cliente_nombre?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(r => String(r[f.field as keyof Remito] ?? "") === f.value)
    }
    return result
  }, [remitos, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(remitos.map(r => r.estado).filter(Boolean))] as string[]
    const controles = [...new Set(remitos.map(r => r.control_factura).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoRemitoLabel(e) })) },
      { field: "control_factura", label: "Control Factura", values: controles.map(c => ({ value: c, label: c === "facturado" ? "Facturado" : "Pendiente" })) },
    ].filter(f => f.values.length > 0)
  }, [remitos])

  const { paginated, controles } = usePaginacion(filtered)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Remitos</h1>
        <Link
          href="/ventas/remitos/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Remito
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_remitos"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "control_factura", label: "Control Factura", field: "control_factura" },
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
        totalCount={remitos.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Domicilio</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Factura</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Control</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && paginated.map(r => {
              const href = `/ventas/remitos/${r.id}`
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{r.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{r.cliente_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{r.fecha ? formatDate(r.fecha) : "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{r.domicilio_envio ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-blue-600">{r.factura_numero || "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoRemitoColor(r.estado)}`}>{getEstadoRemitoLabel(r.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.control_factura === "facturado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {r.control_factura === "facturado" ? "Facturado" : "Pendiente"}
                    </span>
                  </Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No hay remitos</td></tr>
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
