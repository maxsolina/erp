"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { type CategoriaProveedor } from "./_shared"

export default function CategoriasProveedorListado() {
  const [items, setItems] = useState<CategoriaProveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/categorias-proveedor")
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
      result = result.filter(c => c.nombre?.toLowerCase().includes(q))
    }
    for (const f of activeFilters) {
      result = result.filter(c => String(c[f.field as keyof CategoriaProveedor] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-900">Categorías de Proveedores</h1>
        <Link
          href="/compras/categorias-proveedores/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </Link>
      </div>

      <OdooFilterBar
        moduleName="compras_cat_prov"
        filterOptions={[]}
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

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cuenta a Cobrar</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cuenta a Pagar</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Requiere OC</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Confidencial</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-0">
                  <Link href={`/compras/categorias-proveedores/${c.id}/editar`} className="block py-3 px-4 font-medium text-sm text-amber-900">{c.nombre}</Link>
                </td>
                <td className="p-0">
                  <Link href={`/compras/categorias-proveedores/${c.id}/editar`} className="block py-3 px-4 text-sm text-gray-600">{c.cuenta_cobrar_defecto ?? "—"}</Link>
                </td>
                <td className="p-0">
                  <Link href={`/compras/categorias-proveedores/${c.id}/editar`} className="block py-3 px-4 text-sm text-gray-600">{c.cuenta_pagar_defecto ?? "—"}</Link>
                </td>
                <td className="p-0">
                  <Link href={`/compras/categorias-proveedores/${c.id}/editar`} className="block py-3 px-4 text-center text-sm">{c.requiere_oc_para_facturar ? "Sí" : "No"}</Link>
                </td>
                <td className="p-0">
                  <Link href={`/compras/categorias-proveedores/${c.id}/editar`} className="block py-3 px-4 text-center text-sm">{c.comprobantes_confidenciales ? "Sí" : "No"}</Link>
                </td>
              </tr>
            ))}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No hay categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
