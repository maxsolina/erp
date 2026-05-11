"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { type Caja } from "./_shared"

export default function CajasListado() {
  const [items, setItems] = useState<Caja[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/cajas?incluir_inactivos=1")
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
          (c.codigo ?? "").toLowerCase().includes(q) ||
          (c.sucursal ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(c => String(c[f.field as keyof Caja] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    const sucursales = [...new Set(items.map(c => c.sucursal).filter(Boolean))] as string[]
    return [
      {
        field: "activo",
        label: "Estado",
        values: [
          { value: "true", label: "Activa" },
          { value: "false", label: "Inactiva" },
        ],
      },
      {
        field: "sucursal",
        label: "Sucursal",
        values: sucursales.map(s => ({ value: s, label: s })),
      },
    ].filter(f => f.values.length > 0)
  }, [items])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Cajas</h1>
        <Link
          href="/finanzas/cajas/nueva"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Caja
        </Link>
      </div>

      <OdooFilterBar
        moduleName="finanzas_cajas"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "sucursal", label: "Sucursal", field: "sucursal" },
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
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cierre Diario</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(c => {
              // Click en la fila → ficha de la caja en su ruta propia.
              // Los tabs avanzados (valores/bancos/usuarios) siguen en el monolito.
              const href = `/finanzas/cajas/${c.id}/editar`
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-gray-500">{c.codigo ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-medium text-sm text-amber-900">{c.nombre}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{c.sucursal ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{c.cierre_diario_obligatorio ? "Sí" : "No"}</Link></td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.activo ? "Activa" : "Inactiva"}
                      </span>
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No hay cajas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
