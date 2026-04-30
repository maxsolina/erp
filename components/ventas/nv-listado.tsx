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
  formatCurrency,
  formatDate,
  getEstadoNVColor,
  getEstadoNVLabel,
  type NotaVenta,
} from "./_shared"

export default function NvListado() {
  const [nvs, setNvs] = useState<NotaVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/notas-venta")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setNvs(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = nvs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        n =>
          n.numero?.toLowerCase().includes(q) ||
          n.cliente_nombre?.toLowerCase().includes(q) ||
          n.cliente_codigo?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(n => String(n[f.field as keyof NotaVenta] ?? "") === f.value)
    }
    return result
  }, [nvs, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(nvs.map(n => n.estado).filter(Boolean))]
    const clientes = [...new Set(nvs.map(n => n.cliente_nombre).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoNVLabel(e) })) },
      { field: "cliente_nombre", label: "Cliente", values: clientes.map(c => ({ value: c, label: c })) },
    ].filter(f => f.values.length > 0)
  }, [nvs])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Notas de Venta</h1>
        <Link
          href="/?module=ventas&view=notas_venta"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
          title="La creación de NV se hace en el módulo Ventas"
        >
          <Plus className="w-4 h-4" />
          Nueva NV
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_nv"
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
        totalCount={nvs.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(nv => {
              const href = `/ventas/nv/${nv.id}`
              return (
                <tr key={nv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{nv.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{formatDate(nv.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">
                    <div>
                      <p className="font-medium">{nv.cliente_nombre || "—"}</p>
                      {nv.cliente_codigo && <p className="text-xs text-gray-500">{nv.cliente_codigo}</p>}
                    </div>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoNVColor(nv.estado)}`}>{getEstadoNVLabel(nv.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{nv.moneda ?? "ARS"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right font-semibold">{formatCurrency(nv.total, nv.moneda ?? "ARS")}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No hay notas de venta</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
