"use client"

// Listado de Transferencias Internas.
// Extraído de components/modulo-stock.tsx → renderTransferencias (~1615-1701).

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
  getEstadoLabel,
  getEstadoTransferenciaColor,
  loadTransferencias,
  type TransferenciaInterna,
} from "./_shared"

export default function TransferenciasListado() {
  const [transferencias, setTransferencias] = useState<TransferenciaInterna[]>([])
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    setTransferencias(loadTransferencias())
  }, [])

  const filtered = useMemo(() => {
    let result = transferencias
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        t =>
          t.numero.toLowerCase().includes(q) ||
          t.ubicacion_origen_nombre.toLowerCase().includes(q) ||
          t.ubicacion_destino_nombre.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(t => {
        if (f.field === "estado") return t.estado === f.value
        if (f.field === "origen") return t.ubicacion_origen_nombre === f.value
        return true
      })
    }
    return result
  }, [transferencias, search, activeFilters])

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-900">Transferencias Internas</h1>
        <Link
          href="/stock/transferencias/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Transferencia
        </Link>
      </div>

      <div className="mb-4">
        <OdooFilterBar
          moduleName="transferencias-stock"
          filterOptions={[
            {
              field: "estado",
              label: "Estado",
              values: [
                { value: "borrador", label: "Borrador" },
                { value: "confirmada", label: "Confirmada" },
                { value: "cancelada", label: "Cancelada" },
              ],
            },
          ]}
          groupByOptions={[{ id: "estado", label: "Estado", field: "estado" }]}
          activeFilters={activeFilters}
          activeGroupBy={activeGroupBy}
          searchTerm={search}
          onFiltersChange={setActiveFilters}
          onGroupByChange={setActiveGroupBy}
          onSearchChange={setSearch}
          savedFilters={savedFilters}
          onSaveFilter={f =>
            setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])
          }
          onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
          onApplyFilter={f => {
            setActiveFilters(f.filters)
            setActiveGroupBy(f.groupBy)
          }}
          totalCount={transferencias.length}
          filteredCount={filtered.length}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha Creación</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha Transferencia</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación Origen</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación Destino</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const href = `/stock/transferencias/${t.id}`
              return (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 font-mono text-sm text-amber-700 font-medium">
                      {t.numero}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">
                      {formatDate(t.fecha_creacion)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">
                      {t.fecha_transferencia ? formatDate(t.fecha_transferencia) : "-"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoTransferenciaColor(t.estado)}`}
                      >
                        {getEstadoLabel(t.estado)}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">
                      {t.ubicacion_origen_nombre}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-sm">
                      {t.ubicacion_destino_nombre}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">No hay transferencias</div>
        )}
      </div>
    </div>
  )
}
