"use client"

// Tipos, constantes, helpers y CRUDTableWithFilter compartidos para Servicio Técnico.
// Extraídos de components/modulo-taller.tsx (líneas 38-153).

import { useMemo, useState } from "react"
import { Edit, Plus, Trash2 } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"

// ─── Estados OT ─────────────────────────────────────────────────────────────

export const ESTADOS_OT = [
  { value: "borrador", label: "Borrador", color: "bg-gray-200 text-gray-700", step: 0 },
  { value: "sin_asignar", label: "Sin Asignar", color: "bg-yellow-100 text-yellow-800", step: 1 },
  { value: "asignada", label: "Asignada", color: "bg-blue-100 text-blue-700", step: 2 },
  { value: "asignada_en_proceso", label: "En Proceso", color: "bg-blue-200 text-blue-800", step: 3 },
  { value: "control_calidad", label: "Control Calidad", color: "bg-purple-100 text-purple-700", step: 4 },
  { value: "facturado", label: "Facturado", color: "bg-green-100 text-green-700", step: 5 },
  { value: "a_entregar", label: "A Entregar", color: "bg-teal-100 text-teal-700", step: 6 },
  { value: "entregado", label: "Entregado", color: "bg-emerald-200 text-emerald-800", step: 7 },
  { value: "re_presupuestacion", label: "Re-presupuestación", color: "bg-orange-100 text-orange-700", step: -1 },
  { value: "falta_repuestos", label: "Falta Repuestos", color: "bg-red-100 text-red-700", step: -2 },
  { value: "cancelada", label: "Cancelada", color: "bg-red-200 text-red-800", step: -3 },
] as const

export const FLUJO_PRINCIPAL = [
  "borrador",
  "sin_asignar",
  "asignada",
  "asignada_en_proceso",
  "control_calidad",
  "facturado",
  "a_entregar",
  "entregado",
] as const

export const ESTADOS_PAUSA = ["re_presupuestacion", "falta_repuestos"] as const

export function getEstado(val: string) {
  return ESTADOS_OT.find(e => e.value === val)
}
export function getBadgeClass(val: string) {
  return getEstado(val)?.color ?? "bg-gray-200 text-gray-700"
}
export function getEstadoLabel(val: string) {
  return getEstado(val)?.label ?? val
}

// ─── CRUDTableWithFilter (tabla genérica con OdooFilterBar) ─────────────────

export type CRUDColumn = {
  key: string
  label: string
  render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode
}

export function CRUDTableWithFilter({
  title,
  data,
  columns,
  onNew,
  onEdit,
  onDelete,
}: {
  title: string
  data: Record<string, unknown>[]
  columns: CRUDColumn[]
  onNew: () => void
  onEdit: (item: Record<string, unknown>) => void
  onDelete: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const filtered = useMemo(() => {
    let result = data
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row =>
        columns.some(c => String(row[c.key] ?? "").toLowerCase().includes(q)),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field] ?? "") === f.value)
    }
    return result
  }, [data, search, activeFilters, columns])

  const filterOptions = useMemo(
    () =>
      columns
        .map(c => {
          const vals = [
            ...new Set(data.map(row => String(row[c.key] ?? "")).filter(v => v && v !== "—")),
          ]
          return {
            field: c.key,
            label: c.label,
            values: vals.map(v => ({ value: v, label: v })),
          }
        })
        .filter(f => f.values.length > 0 && f.values.length < 50),
    [data, columns],
  )

  const groupByOptions: GroupByOption[] = columns.map(c => ({
    id: c.key,
    label: c.label,
    field: c.key,
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>
      <OdooFilterBar
        moduleName={`taller_${title.toLowerCase().replace(/\s/g, "_")}`}
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
        totalCount={data.length}
        filteredCount={filtered.length}
      />
      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-[640px] w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map(c => (
                <th key={c.key} className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase text-left">
                  {c.label}
                </th>
              ))}
              <th className="py-2 px-4 text-xs font-semibold text-gray-600 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => (
              <tr key={row.id as string} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3 text-sm text-gray-700">
                    {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onEdit(row)} className="text-indigo-600 hover:text-indigo-800 mr-2">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("¿Eliminar?")) onDelete(row.id as string)
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
