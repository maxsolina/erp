"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { type CategoriaCliente } from "./_shared"

export default function CategoriasClienteListado() {
  const [items, setItems] = useState<CategoriaCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/categorias-cliente")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        c =>
          c.nombre?.toLowerCase().includes(q) ||
          (c.descripcion ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(c => String(c[f.field as keyof CategoriaCliente] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    return [
      {
        field: "activa",
        label: "Estado",
        values: [
          { value: "true", label: "Activa" },
          { value: "false", label: "Inactiva" },
        ],
      },
    ]
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Categorías de Clientes</h1>
        <Link
          href="/ventas/categorias-cliente/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </Link>
      </div>

      <OdooFilterBar
        moduleName="ventas_cat_cliente"
        filterOptions={filterOptions}
        groupByOptions={[]}
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
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cuenta a Cobrar</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-0">
                  <Link href={`/ventas/categorias-cliente/${c.id}/editar`} className="block py-3 px-4 font-medium text-sm text-amber-900">{c.nombre}</Link>
                </td>
                <td className="p-0">
                  <Link href={`/ventas/categorias-cliente/${c.id}/editar`} className="block py-3 px-4 text-sm text-gray-600">{c.descripcion ?? "—"}</Link>
                </td>
                <td className="p-0">
                  <Link href={`/ventas/categorias-cliente/${c.id}/editar`} className="block py-3 px-4 text-sm">
                    {c.cuenta_cobrar_codigo
                      ? <span><span className="font-mono text-xs text-gray-500">{c.cuenta_cobrar_codigo}</span> <span className="text-gray-700">{c.cuenta_cobrar_nombre}</span></span>
                      : <span className="text-gray-400">—</span>}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={`/ventas/categorias-cliente/${c.id}/editar`} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.activa ? "Activa" : "Inactiva"}
                    </span>
                  </Link>
                </td>
              </tr>
            ))}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No hay categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
