"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { type PlanCuenta } from "./_shared"

export default function PlanCuentasListado() {
  const router = useRouter()
  const [items, setItems] = useState<PlanCuenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/contabilidad/plan-cuentas")
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
          c.codigo?.toLowerCase().includes(q) ||
          c.nombre?.toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      if (f.field === "tipo_cuenta_nombre") {
        result = result.filter(c => c.tipo_cuenta?.nombre === f.value)
      } else {
        result = result.filter(c => String(c[f.field as keyof PlanCuenta] ?? "") === f.value)
      }
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    const tipos = [...new Set(items.map(c => c.tipo_cuenta?.nombre).filter(Boolean))] as string[]
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
        field: "es_imputable",
        label: "Imputable",
        values: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      },
      {
        field: "tipo_cuenta_nombre",
        label: "Tipo",
        values: tipos.map(t => ({ value: t, label: t })),
      },
    ].filter(f => f.values.length > 0)
  }, [items])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Plan de Cuentas</h1>
        <Link
          href="/?module=contabilidad&view=plan-cuentas"
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
          title="La gestión del plan se hace en el módulo Contabilidad"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </Link>
      </div>

      <OdooFilterBar
        moduleName="contabilidad_plan"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "tipo_cuenta_nombre", label: "Tipo", field: "tipo_cuenta_nombre" },
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
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cuenta Padre</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Imputable</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(c => (
              <tr
                key={c.id}
                onClick={() => router.push(`/?module=contabilidad&view=plan-cuentas&editar=${c.id}`)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{c.codigo}</td>
                <td className="py-3 px-4 text-sm">{c.nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{c.tipo_cuenta?.nombre ?? "—"}</td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {c.padre
                    ? <span><span className="font-mono text-xs text-gray-500">{c.padre.codigo}</span> <span>{c.padre.nombre}</span></span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="py-3 px-4 text-center text-sm">{c.es_imputable ? "Sí" : "No"}</td>
                <td className="py-3 px-4 text-center text-sm">{c.moneda ?? "—"}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
              </tr>
            ))}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">No hay cuentas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
