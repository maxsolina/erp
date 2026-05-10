"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { formatCurrency, formatDate, type Asiento } from "./_shared"

// Listado parametrizado por es_manual (true|false). Reutilizado por las
// vistas /contabilidad/asientos-manuales y /contabilidad/asientos-automaticos.

interface Props {
  esManual: boolean
  title: string
  monolithView: string
  emptyText?: string
}

export default function AsientosListadoBase({ esManual, title, monolithView, emptyText }: Props) {
  const [items, setItems] = useState<Asiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch(`/api/contabilidad/asientos?es_manual=${esManual}&sin_cancelados=true`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data)
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [esManual])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        a =>
          (a.numero ?? "").toLowerCase().includes(q) ||
          (a.descripcion ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      if (f.field === "diario_nombre") {
        result = result.filter(a => a.diario?.nombre === f.value)
      } else if (f.field === "periodo_nombre") {
        result = result.filter(a => a.periodo?.nombre === f.value)
      } else {
        result = result.filter(a => String(a[f.field as keyof Asiento] ?? "") === f.value)
      }
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(items.map(a => a.estado).filter(Boolean))]
    const diarios = [...new Set(items.map(a => a.diario?.nombre).filter(Boolean))] as string[]
    const periodos = [...new Set(items.map(a => a.periodo?.nombre).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: e })) },
      { field: "diario_nombre", label: "Diario", values: diarios.map(d => ({ value: d, label: d })) },
      { field: "periodo_nombre", label: "Período", values: periodos.map(p => ({ value: p, label: p })) },
    ].filter(f => f.values.length > 0)
  }, [items])

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        <Link
          href={`/?module=contabilidad&view=${monolithView}`}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
          title="Gestión completa en el módulo Contabilidad"
        >
          <Plus className="w-4 h-4" />
          {esManual ? "Nuevo Asiento" : "Ver Origen"}
        </Link>
      </div>

      <OdooFilterBar
        moduleName={`contabilidad_asientos_${esManual ? "manuales" : "automaticos"}`}
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "diario_nombre", label: "Diario", field: "diario_nombre" },
          { id: "periodo_nombre", label: "Período", field: "periodo_nombre" },
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

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Diario</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Período</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
              {!esManual && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Origen</th>}
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Debe</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Haber</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={esManual ? 8 : 9} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(a => {
              const href = `/contabilidad/asientos/${a.id}`
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{a.numero ?? `#${a.id}`}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{formatDate(a.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{a.diario?.nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{a.periodo?.nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm max-w-xs truncate">{a.descripcion ?? "—"}</Link></td>
                  {!esManual && (
                    <td className="p-0">
                      <Link href={href} className="block py-3 px-4 text-sm text-blue-600">
                        {a.documento_origen_numero ?? a.origen ?? "—"}
                      </Link>
                    </td>
                  )}
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right">{a.total_debe != null ? formatCurrency(a.total_debe) : "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-right">{a.total_haber != null ? formatCurrency(a.total_haber) : "—"}</Link></td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.estado === "publicado" ? "bg-green-100 text-green-700" :
                        a.estado === "cancelado" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {a.estado}
                      </span>
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={esManual ? 8 : 9} className="py-8 text-center text-gray-400 text-sm">{emptyText ?? "No hay asientos"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
