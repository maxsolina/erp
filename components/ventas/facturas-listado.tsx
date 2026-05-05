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
  formatCurrency,
  formatDate,
  getEstadoFacturaColor,
  getEstadoFacturaLabel,
  type Factura,
} from "./_shared"

export default function FacturasListado() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/facturas")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setFacturas(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = facturas
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        f =>
          f.numero?.toLowerCase().includes(q) ||
          f.cliente_nombre?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(x => String(x[f.field as keyof Factura] ?? "") === f.value)
    }
    return result
  }, [facturas, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(facturas.map(f => f.estado).filter(Boolean))]
    const monedas = [...new Set(facturas.map(f => f.moneda).filter(Boolean))] as string[]
    const clientes = [...new Set(facturas.map(f => f.cliente_nombre).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoFacturaLabel(e) })) },
      { field: "moneda", label: "Moneda", values: monedas.map(m => ({ value: m, label: m })) },
      { field: "cliente_nombre", label: "Cliente", values: clientes.map(c => ({ value: c, label: c })) },
    ].filter(f => f.values.length > 0)
  }, [facturas])

  const { paginated, controles } = usePaginacion(filtered)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Facturas</h1>
        <Link
          href="/ventas/facturas/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Factura
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_facturas"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "cliente_nombre", label: "Cliente", field: "cliente_nombre" },
          { id: "moneda", label: "Moneda", field: "moneda" },
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
        totalCount={facturas.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">NV</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && paginated.map(f => {
              const href = `/ventas/facturas/${f.id}`
              const moneda = f.moneda ?? "ARS"
              return (
                <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{f.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">
                    <div>
                      <p className="font-medium">{f.cliente_nombre ?? "—"}</p>
                      {f.cliente_documento && <p className="text-xs text-gray-500">{f.cliente_documento}</p>}
                    </div>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{formatDate(f.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-blue-600">{f.nota_venta_numero ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoFacturaColor(f.estado)}`}>{getEstadoFacturaLabel(f.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{moneda}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right font-semibold">{formatCurrency(f.total, moneda)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right">{f.saldo != null ? formatCurrency(f.saldo, moneda) : "—"}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400 text-sm">No hay facturas</td></tr>
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
