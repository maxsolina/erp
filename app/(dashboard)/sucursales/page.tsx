"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Check, X, Trash2 } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { useERP } from "@/contexts/erp-context"

const GRID_COLS = "100px 1fr 1.4fr 140px 80px 60px"

export default function SucursalesListingPage() {
  const router = useRouter()
  const { canSee, sucursales, setSucursales } = useERP()

  useEffect(() => {
    if (!canSee("configuracion", "sucursales")) router.replace("/")
  }, [canSee, router])

  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const sucursalesFiltradas = useMemo(() => {
    let result = [...sucursales]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(s =>
        s.codigo.toLowerCase().includes(q)
        || s.nombre.toLowerCase().includes(q)
        || String(s.direccion ?? "").toLowerCase().includes(q)
        || String(s.telefono ?? "").toLowerCase().includes(q),
      )
    }
    for (const filter of activeFilters) {
      result = result.filter(s => String((s as any)[filter.field] ?? "") === filter.value)
    }
    return result
  }, [sucursales, searchTerm, activeFilters])

  const filterOptions = useMemo(() => [{
    field: "activa",
    label: "Estado",
    values: [
      { value: "true", label: "Activas" },
      { value: "false", label: "Inactivas" },
    ],
  }], [])

  const groupByOptions: GroupByOption[] = [{ id: "activa", label: "Estado", field: "activa" }]

  const handleEliminar = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("¿Eliminar esta sucursal?")) return
    const res = await fetch(`/api/sucursales/${id}`, { method: "DELETE" })
    if (res.ok) setSucursales(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Sucursales</h1>
          <p className="text-xs text-gray-500 mt-0.5">{sucursalesFiltradas.length} resultado{sucursalesFiltradas.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/sucursales/nueva"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-indigo-900 text-white hover:bg-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva sucursal
        </Link>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <OdooFilterBar
          moduleName="sucursales"
          filterOptions={filterOptions}
          groupByOptions={groupByOptions}
          activeFilters={activeFilters}
          activeGroupBy={activeGroupBy}
          searchTerm={searchTerm}
          onFiltersChange={setActiveFilters}
          onGroupByChange={setActiveGroupBy}
          onSearchChange={setSearchTerm}
          savedFilters={savedFilters}
          onSaveFilter={(filter) => setSavedFilters(prev => [...prev, { ...filter, id: `f-${Date.now()}`, createdBy: "current_user" }])}
          onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
          onApplyFilter={(filter) => {
            setActiveFilters(filter.filters)
            setActiveGroupBy(filter.groupBy)
          }}
          totalCount={sucursales.length}
          filteredCount={sucursalesFiltradas.length}
        />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-auto">
        {sucursalesFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm text-gray-400">No hay sucursales que coincidan</p>
            <Link href="/sucursales/nueva" className="mt-1 text-sm text-indigo-700 hover:text-indigo-900 hover:underline">
              Crear primera sucursal
            </Link>
          </div>
        ) : (
          <div className="text-sm">
            {/* Cabecera */}
            <div className="grid border-b bg-gray-50 sticky top-0 z-10" style={{ gridTemplateColumns: GRID_COLS }}>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Código</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Dirección</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Teléfono</div>
              <div className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Activa</div>
              <div className="py-2 px-4"></div>
            </div>

            {/* Filas */}
            {sucursalesFiltradas.map(s => (
              <Link
                key={s.id}
                href={`/sucursales/${s.id}`}
                className="grid border-b border-gray-100 hover:bg-gray-50 transition-colors text-gray-700"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="px-4 py-3 font-mono text-xs font-medium text-gray-600 self-center">{s.codigo}</span>
                <span className="px-4 py-3 font-medium text-gray-900 self-center">{s.nombre}</span>
                <span className="px-4 py-3 text-gray-500 self-center">{s.direccion ?? "—"}</span>
                <span className="px-4 py-3 text-gray-500 self-center">{s.telefono ?? "—"}</span>
                <span className="px-4 py-3 text-center self-center">
                  {s.activa
                    ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    : <X className="w-4 h-4 text-gray-300 mx-auto" />}
                </span>
                <span className="px-4 py-3 self-center text-right">
                  <button
                    onClick={(e) => handleEliminar(e, s.id)}
                    title="Eliminar"
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
