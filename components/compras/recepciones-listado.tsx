"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import {
  formatDate,
  getEstadoRecepcionColor,
  getEstadoRecepcionLabel,
  type Recepcion,
} from "./_shared"

export default function RecepcionesListado() {
  const [recs, setRecs] = useState<Recepcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/compras/recepciones")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRecs(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = recs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        r =>
          r.numero?.toLowerCase().includes(q) ||
          r.proveedor_nombre?.toLowerCase().includes(q) ||
          (r.orden_compra_numero ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(r => String(r[f.field as keyof Recepcion] ?? "") === f.value)
    }
    return result
  }, [recs, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(recs.map(r => r.estado))]
    const provs = [...new Set(recs.map(r => r.proveedor_nombre).filter(Boolean))]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoRecepcionLabel(e) })) },
      { field: "proveedor_nombre", label: "Proveedor", values: provs.map(p => ({ value: p, label: p })) },
    ].filter(f => f.values.length > 0)
  }, [recs])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Recepciones</h1>
          <p className="text-xs text-gray-500 mt-1">
            Las recepciones se generan automáticamente al confirmar una OC, una Toma de Equipo o una Transferencia.
          </p>
        </div>
      </div>

      <OdooFilterBar
        moduleName="compras_recepciones"
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
        totalCount={recs.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Proveedor</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">OC Origen</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Cargando...</td></tr>}
            {!cargando && filtered.map(r => {
              const href = `/compras/recepciones/${r.id}`
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-amber-700 font-medium">{r.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{formatDate(r.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{r.proveedor_nombre}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm font-mono text-gray-600">{r.orden_compra_numero ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoRecepcionColor(r.estado)}`}>{getEstadoRecepcionLabel(r.estado)}</span>
                  </Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No hay recepciones</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
