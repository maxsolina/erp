"use client"

import { useState, useMemo, ReactNode } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"

// Shell para listings de configuración de Contabilidad.
// Reusa OdooFilterBar + tabla, con columns custom por entidad.

interface Column<T> {
  label: string
  align?: "left" | "center" | "right"
  className?: string
  render: (row: T) => ReactNode
}

interface Props<T> {
  title: string
  moduleName: string
  monolithView: string
  /** Módulo del monolito para construir el href: `/?module=<monolithModule>&view=<monolithView>`. Default: "contabilidad". */
  monolithModule?: string
  monolithLabel?: string
  /** Eyebrow opcional sobre el título (ej: "Configuración"). */
  eyebrow?: string
  /** Si está, el botón "Nuevo X" linkea acá en vez de al monolito. */
  newHref?: string
  /** Si está, el click en la fila linkea a editHref(row). Si devuelve null, no es clickeable. */
  editHref?: (row: T) => string | null
  data: T[]
  cargando: boolean
  searchTerm: string
  onSearchChange: (s: string) => void
  searchFilter: (row: T, q: string) => boolean
  filterOptions?: { field: string; label: string; values: { value: string; label: string }[] }[]
  groupByOptions?: { id: string; label: string; field: string }[]
  rowFilter?: (row: T, filters: FilterOption[]) => boolean
  columns: Column<T>[]
  emptyText?: string
  rowKey: (row: T) => string | number
  /** Si está, las filas se vuelven clickeables y disparan este handler (alternativa a `editHref`). */
  onRowClick?: (row: T) => void
  /** Si está, oculta el botón "Nuevo X" del header (útil cuando es vista read-only). */
  hideNewButton?: boolean
}

export function ContabilidadConfigList<T>({
  title,
  moduleName,
  monolithView,
  monolithModule = "contabilidad",
  monolithLabel = "Nuevo",
  eyebrow,
  newHref,
  editHref,
  data,
  cargando,
  searchTerm,
  onSearchChange,
  searchFilter,
  filterOptions = [],
  groupByOptions = [],
  rowFilter,
  columns,
  emptyText,
  rowKey,
  onRowClick,
  hideNewButton,
}: Props<T>) {
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const filtered = useMemo(() => {
    let result = data
    if (searchTerm) result = result.filter(r => searchFilter(r, searchTerm.toLowerCase()))
    if (rowFilter) result = result.filter(r => rowFilter(r, activeFilters))
    return result
  }, [data, searchTerm, activeFilters, searchFilter, rowFilter])

  const monolithHref = `/?module=${monolithModule}&view=${monolithView}`
  const nuevoHref = newHref ?? monolithHref

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          {eyebrow && <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{eyebrow}</p>}
          <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        </div>
        {!hideNewButton && (
          <Link
            href={nuevoHref}
            className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
            title={newHref ? undefined : "Gestión completa en el monolito"}
          >
            <Plus className="w-4 h-4" /> {monolithLabel}
          </Link>
        )}
      </div>

      <OdooFilterBar
        moduleName={moduleName}
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={searchTerm}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={onSearchChange}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={data.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`py-3 px-4 text-xs font-semibold text-gray-600 uppercase ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.className ?? ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={columns.length} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(row => {
              const href = editHref?.(row)
              const clickable = !!onRowClick || !!href
              return (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-gray-100 hover:bg-gray-50 ${clickable ? "cursor-pointer" : ""}`}
              >
                {columns.map((col, i) => (
                  <td
                    key={i}
                    className={`text-sm ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${href ? "p-0" : "py-3 px-4"}`}
                  >
                    {href ? (
                      <Link href={href} className={`block py-3 px-4 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}>
                        {col.render(row)}
                      </Link>
                    ) : col.render(row)}
                  </td>
                ))}
              </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={columns.length} className="py-8 text-center text-gray-400 text-sm">{emptyText ?? "Sin datos"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Filtros estándar para configs (estado activo/inactivo)
export const filtroActivoEstandar = {
  field: "activo",
  label: "Estado",
  values: [
    { value: "true", label: "Activo" },
    { value: "false", label: "Inactivo" },
  ],
}

export function rowFilterDefault(row: any, filters: FilterOption[]): boolean {
  for (const f of filters) {
    if (String(row[f.field] ?? "") !== f.value) return false
  }
  return true
}
