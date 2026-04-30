"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { formatCurrency, type Cliente } from "./_shared"

export default function ClientesListado() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/clientes")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setClientes(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = clientes
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        c =>
          c.nombre?.toLowerCase().includes(q) ||
          (c.codigo ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.numero_documento ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(c => String(c[f.field as keyof Cliente] ?? "") === f.value)
    }
    return result
  }, [clientes, search, activeFilters])

  const filterOptions = useMemo(() => {
    const condIva = [...new Set(clientes.map(c => c.condicion_iva).filter(Boolean) as string[])]
    return [
      {
        field: "activo",
        label: "Estado",
        values: [
          { value: "true", label: "Activos" },
          { value: "false", label: "Inactivos" },
        ],
      },
      { field: "condicion_iva", label: "Condición IVA", values: condIva.map(c => ({ value: c, label: c })) },
    ].filter(f => f.values.length > 0)
  }, [clientes])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Clientes</h1>
        <Link
          href="/ventas/clientes/nuevo"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_clientes"
        filterOptions={filterOptions}
        groupByOptions={[{ id: "condicion_iva", label: "Condición IVA", field: "condicion_iva" }]}
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
        totalCount={clientes.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Documento</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Condición IVA</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Saldo CC</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Activo</th>
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Cargando...</td></tr>}
            {!cargando && filtered.map(c => {
              const href = `/ventas/clientes/${c.id}`
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-xs text-gray-500">{c.codigo ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm font-medium text-indigo-900">{c.nombre}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{c.tipo_documento ? `${c.tipo_documento}: ${c.numero_documento ?? ""}` : (c.numero_documento ?? "—")}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{c.condicion_iva ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right">{formatCurrency(c.saldo_cuenta_corriente ?? 0)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{c.activo ? "✓" : "✗"}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No hay clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
