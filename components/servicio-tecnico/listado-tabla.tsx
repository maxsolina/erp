"use client"

// Tabla genérica de listado para ABMs de Servicio Técnico, con la estética
// del resto del ERP: OdooFilterBar arriba, filas clickeables que llevan a
// la ficha de edición, paginación al pie. Reemplaza al viejo
// `CRUDTableWithFilter` (que solo tiraba alerts) en _shared.tsx.

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { usePaginacion } from "@/components/ui/paginacion"

export type ColumnDef<T> = {
  key: string
  label: string
  align?: "left" | "right" | "center"
  render?: (row: T) => React.ReactNode
  // valor para filtros y groupBy — si la columna tiene un renderer custom
  // (ej: badge, JSX), conviene pasar el valor "plano" acá.
  filterValue?: (row: T) => string | null | undefined
}

export interface TallerListadoTablaProps<T extends { id: string }> {
  title: string
  rows: T[]
  loading: boolean
  columns: ColumnDef<T>[]
  newHref: string
  newLabel?: string
  rowHrefBase: string                 // ej: "/servicio-tecnico/areas" → row href = `${rowHrefBase}/${id}`
  moduleName: string                  // namespace para favoritos de OdooFilterBar
  // qué columnas se exponen como filter dropdown / groupBy. Por default, todas
  // las columnas string con menos de 50 valores únicos.
  filterableFields?: string[]
  groupByFields?: string[]
  // función custom de búsqueda (si null, se buscará por todas las columnas
  // con valor primitivo).
  searchFields?: string[]
  emptyMessage?: string
}

export default function TallerListadoTabla<T extends { id: string }>({
  title,
  rows,
  loading,
  columns,
  newHref,
  newLabel = "Nuevo",
  rowHrefBase,
  moduleName,
  filterableFields,
  groupByFields,
  searchFields,
  emptyMessage = "Sin registros",
}: TallerListadoTablaProps<T>) {
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  // Helper para extraer el valor "plano" de una columna (para filtros/búsqueda)
  function plainValue(row: T, col: ColumnDef<T>): string {
    if (col.filterValue) return String(col.filterValue(row) ?? "")
    const v = (row as Record<string, unknown>)[col.key]
    if (v == null) return ""
    if (typeof v === "object") return ""
    if (typeof v === "boolean") return v ? "Sí" : "No"
    return String(v)
  }

  const filtered = useMemo(() => {
    let result = rows
    if (search) {
      const q = search.toLowerCase()
      const cols = searchFields
        ? columns.filter(c => searchFields.includes(c.key))
        : columns
      result = result.filter(row => cols.some(c => plainValue(row, c).toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => {
        const col = columns.find(c => c.key === f.field)
        if (!col) return true
        return plainValue(row, col) === f.value
      })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, activeFilters, columns, searchFields])

  const filterOptions = useMemo(() => {
    const cols = filterableFields
      ? columns.filter(c => filterableFields.includes(c.key))
      : columns
    return cols
      .map(c => {
        const vals = [...new Set(rows.map(r => plainValue(r, c)).filter(v => v !== ""))]
        return {
          field: c.key,
          label: c.label,
          values: vals.map(v => ({ value: v, label: v })),
        }
      })
      .filter(o => o.values.length > 0 && o.values.length < 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, filterableFields])

  const groupByOptions: GroupByOption[] = useMemo(() => {
    const cols = groupByFields
      ? columns.filter(c => groupByFields.includes(c.key))
      : columns
    return cols.map(c => ({ id: c.key, label: c.label, field: c.key }))
  }, [columns, groupByFields])

  const { paginated, controles } = usePaginacion(filtered)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        <Link
          href={newHref}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {newLabel}
        </Link>
      </div>

      <OdooFilterBar
        moduleName={moduleName}
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
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
        totalCount={rows.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map(c => (
                <th
                  key={c.key}
                  className={`py-3 px-4 text-xs font-semibold text-gray-600 uppercase ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-400">Cargando…</td>
              </tr>
            )}
            {!loading && paginated.map(row => {
              const href = `${rowHrefBase}/${row.id}`
              return (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map(c => (
                    <td key={c.key} className="p-0">
                      <Link
                        href={href}
                        className={`block py-3 px-4 text-sm ${
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                        }`}
                      >
                        {c.render ? c.render(row) : (() => {
                          const v = (row as Record<string, unknown>)[c.key]
                          if (v == null || v === "") return <span className="text-gray-400">—</span>
                          if (typeof v === "boolean") return v ? "✓" : "✗"
                          if (typeof v === "object") return ""
                          return String(v)
                        })()}
                      </Link>
                    </td>
                  ))}
                </tr>
              )
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-400 text-sm">{emptyMessage}</td>
              </tr>
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
