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
  getEstadoReciboColor,
  getEstadoReciboLabel,
  type Recibo,
} from "./_shared"

export default function RecibosListado() {
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/recibos")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRecibos(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = recibos
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        r =>
          r.numero?.toLowerCase().includes(q) ||
          (r.cliente_nombre ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(r => String(r[f.field as keyof Recibo] ?? "") === f.value)
    }
    return result
  }, [recibos, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(recibos.map(r => r.estado).filter(Boolean))]
    const monedas = [...new Set(recibos.map(r => r.moneda).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoReciboLabel(e) })) },
      { field: "moneda", label: "Moneda", values: monedas.map(m => ({ value: m, label: m })) },
    ].filter(f => f.values.length > 0)
  }, [recibos])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Recibos</h1>
        <Link
          href="/?module=ventas&view=recibos"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
          title="La creación de recibos se hace en el módulo Ventas"
        >
          <Plus className="w-4 h-4" />
          Nuevo Recibo
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_recibos"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "moneda", label: "Moneda", field: "moneda" },
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
        totalCount={recibos.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Caja</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Importe</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(r => {
              const href = `/ventas/recibos/${r.id}`
              const moneda = r.moneda ?? "ARS"
              return (
                <tr key={String(r.id)} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{r.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{formatDate(r.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{r.cliente_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{r.caja_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoReciboColor(r.estado)}`}>{getEstadoReciboLabel(r.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{moneda}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right font-semibold">{formatCurrency(r.importe, moneda)}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No hay recibos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
