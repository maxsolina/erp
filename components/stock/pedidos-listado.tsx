"use client"

// Listado de Pedidos de Abastecimiento.
// Extraído de components/modulo-stock.tsx → renderPedidosAbastecimiento (~2973-3037).
// El monolito no tiene ficha ni formulario implementados, así que las filas no
// son clickables y el botón "Solicitar Abastecimiento" muestra un alert.

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import {
  formatDate,
  getEstadoLabel,
  getEstadoPedidoColor,
  loadPedidos,
  type PedidoAbastecimiento,
} from "./_shared"

export default function PedidosListado() {
  const [pedidos, setPedidos] = useState<PedidoAbastecimiento[]>([])
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    setPedidos(loadPedidos())
  }, [])

  const filtered = useMemo(() => {
    let result = pedidos
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        p =>
          p.numero.toLowerCase().includes(q) ||
          p.deposito_origen_nombre.toLowerCase().includes(q) ||
          p.deposito_destino_nombre.toLowerCase().includes(q) ||
          p.categoria_ubicacion.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(p => {
        if (f.field === "estado") return p.estado === f.value
        if (f.field === "deposito_origen_nombre") return p.deposito_origen_nombre === f.value
        if (f.field === "deposito_destino_nombre") return p.deposito_destino_nombre === f.value
        if (f.field === "sucursal") return p.sucursal === f.value
        return true
      })
    }
    return result
  }, [pedidos, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(pedidos.map(p => p.estado))]
    const orig = [...new Set(pedidos.map(p => p.deposito_origen_nombre).filter(Boolean))]
    const dest = [...new Set(pedidos.map(p => p.deposito_destino_nombre).filter(Boolean))]
    const sucs = [...new Set(pedidos.map(p => p.sucursal).filter(Boolean))]
    return [
      { field: "estado", label: "Estado", values: estados.map(v => ({ value: v, label: getEstadoLabel(v) })) },
      { field: "deposito_origen_nombre", label: "Depósito Origen", values: orig.map(v => ({ value: v, label: v })) },
      { field: "deposito_destino_nombre", label: "Depósito Destino", values: dest.map(v => ({ value: v, label: v })) },
      { field: "sucursal", label: "Sucursal", values: sucs.map(v => ({ value: v, label: v })) },
    ].filter(f => f.values.length > 0)
  }, [pedidos])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Pedidos de Abastecimiento</h1>
        <button
          onClick={() => alert("Solicitar Abastecimiento — pendiente de UI dedicada")}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Solicitar Abastecimiento
        </button>
      </div>

      <div className="mb-4">
        <OdooFilterBar
          moduleName="pedidos-abastecimiento"
          filterOptions={filterOptions}
          groupByOptions={[
            { id: "estado", label: "Estado", field: "estado" },
            { id: "deposito_origen_nombre", label: "Depósito Origen", field: "deposito_origen_nombre" },
            { id: "deposito_destino_nombre", label: "Depósito Destino", field: "deposito_destino_nombre" },
          ]}
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
          totalCount={pedidos.length}
          filteredCount={filtered.length}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito Origen</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito Destino</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Categoría</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{p.numero}</td>
                <td className="py-3 px-4 text-sm">{formatDate(p.fecha)}</td>
                <td className="py-3 px-4 text-sm">{p.deposito_origen_nombre}</td>
                <td className="py-3 px-4 text-sm">{p.deposito_destino_nombre}</td>
                <td className="py-3 px-4 text-sm">{p.categoria_ubicacion}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoPedidoColor(p.estado)}`}>
                    {getEstadoLabel(p.estado)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">No hay pedidos de abastecimiento</div>
        )}
      </div>
    </div>
  )
}
