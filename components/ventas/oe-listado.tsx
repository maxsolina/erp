"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import {
  formatDate,
  getEstadoOEColor,
  getEstadoOELabel,
  type OrdenEntrega,
} from "./_shared"

export default function OeListado() {
  const [oes, setOes] = useState<OrdenEntrega[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/ordenes-entrega")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setOes(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = oes
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        o =>
          o.numero?.toLowerCase().includes(q) ||
          o.cliente_nombre?.toLowerCase().includes(q) ||
          o.nota_venta_numero?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(o => String(o[f.field as keyof OrdenEntrega] ?? "") === f.value)
    }
    return result
  }, [oes, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(oes.map(o => o.estado).filter(Boolean))]
    const clientes = [...new Set(oes.map(o => o.cliente_nombre).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoOELabel(e) })) },
      { field: "cliente_nombre", label: "Cliente", values: clientes.map(c => ({ value: c, label: c })) },
    ].filter(f => f.values.length > 0)
  }, [oes])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Órdenes de Entrega</h1>
        <Link
          href="/ventas/oe/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva OE
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_oe"
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
        totalCount={oes.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">NV</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha Entrega</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Domicilio</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Remito</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(oe => {
              const href = `/ventas/oe/${oe.id}`
              return (
                <tr key={oe.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{oe.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-blue-600">{oe.nota_venta_numero ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{oe.cliente_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{oe.fecha_entrega ? formatDate(oe.fecha_entrega) : "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{oe.domicilio_envio ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoOEColor(oe.estado)}`}>{getEstadoOELabel(oe.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-emerald-600 font-medium">{oe.remito_numero || "—"}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No hay órdenes de entrega</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
