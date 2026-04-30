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
  getEstadoFacturaColor,
  getEstadoFacturaLabel,
  type FacturaCompra,
} from "./_shared"

interface Props {
  apiUrl: string
  title: string
  newHref: string
  fichaBaseHref: string
  moduleName: string
}

export default function FacturasGenericoListado({
  apiUrl,
  title,
  newHref,
  fichaBaseHref,
  moduleName,
}: Props) {
  const [items, setItems] = useState<FacturaCompra[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [apiUrl])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        i => i.numero?.toLowerCase().includes(q) || i.proveedor_nombre?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(i => String(i[f.field as keyof FacturaCompra] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(items.map(i => i.estado))]
    const provs = [...new Set(items.map(i => i.proveedor_nombre).filter(Boolean))]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoFacturaLabel(e) })) },
      { field: "proveedor_nombre", label: "Proveedor", values: provs.map(p => ({ value: p, label: p })) },
    ].filter(f => f.values.length > 0)
  }, [items])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        <Link
          href={newHref}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </Link>
      </div>

      <OdooFilterBar
        moduleName={moduleName}
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "proveedor_nombre", label: "Proveedor", field: "proveedor_nombre" },
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

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Proveedor</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Cargando...</td></tr>}
            {!cargando && filtered.map(i => {
              const href = `${fichaBaseHref}/${i.id}`
              return (
                <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-amber-700 font-medium">{i.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{formatDate(i.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{i.proveedor_nombre}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoFacturaColor(i.estado)}`}>{getEstadoFacturaLabel(i.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right font-semibold">{formatCurrency(i.total, i.moneda ?? "ARS")}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
