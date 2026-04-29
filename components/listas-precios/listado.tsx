"use client"

// Extraído de components/ventas-module.tsx → renderListaListasPrecios (~13675-13778)
// y el dispatcher renderListasPrecios (~13668-13674).
// Mantiene comportamiento idéntico: mismos search/filter, mismo toggle "mostrar archivadas",
// misma columna "Versiones" mostrando el conteo. La única diferencia es que las filas y el botón
// "Crear" ahora son <Link> en vez de mutar state.

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Plus, Eye } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { normalizarLista, type ListaPrecios, type VersionListaPrecios } from "./_shared"

export default function ListasPreciosListado() {
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [versionesLista, setVersionesLista] = useState<VersionListaPrecios[]>([])
  const [mostrarInactivasListas, setMostrarInactivasListas] = useState(false)

  // Filtros / búsqueda — replica el comportamiento de VentasListSection embebido
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  // Carga inicial — equivalente a los useEffect de ventas-module.tsx (líneas 2220-2245)
  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setListasPrecios(data.map(normalizarLista))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/listas-precios/versiones")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setVersionesLista(data)
      })
      .catch(() => {})
  }, [])

  // Solo ocultar las que tienen activa=false explícito; null/undefined = activas (legacy)
  const dataListasFiltrada = useMemo(
    () => (mostrarInactivasListas ? listasPrecios : listasPrecios.filter(l => l.activa !== false)),
    [listasPrecios, mostrarInactivasListas],
  )

  const searchFields: (keyof ListaPrecios)[] = ["nombre", "tipo"]
  const filterFields: { field: keyof ListaPrecios; label: string }[] = [
    { field: "tipo", label: "Tipo" },
    { field: "moneda_base", label: "Moneda" },
    { field: "estado", label: "Estado" },
  ]

  const filtered = useMemo(() => {
    let result = [...dataListasFiltrada]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row => searchFields.some(f => String(row[f] ?? "").toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field as keyof ListaPrecios] ?? "") === f.value)
    }
    return result
  }, [dataListasFiltrada, search, activeFilters])

  const filterOptions = useMemo(
    () =>
      filterFields
        .map(ff => {
          const vals = [
            ...new Set(
              dataListasFiltrada
                .map(row => String(row[ff.field] ?? ""))
                .filter(v => v && v !== "null" && v !== "undefined"),
            ),
          ]
          return { field: String(ff.field), label: ff.label, values: vals.sort().map(v => ({ value: v, label: v })) }
        })
        .filter(f => f.values.length > 0),
    [dataListasFiltrada],
  )

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({
    id: String(ff.field),
    label: ff.label,
    field: String(ff.field),
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Listas de Precios</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarInactivasListas(v => !v)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm border transition-colors ${
              mostrarInactivasListas
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title="Incluir listas archivadas"
          >
            {mostrarInactivasListas ? "Ocultar archivadas" : "Mostrar archivadas"}
          </button>
          <Link
            href="/listas-precios/nueva"
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Crear
          </Link>
        </div>
      </div>

      <OdooFilterBar
        moduleName="listas_precios"
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f =>
          setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])
        }
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={dataListasFiltrada.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Nombre</th>
              <th className="text-center py-3 px-4 font-medium">Tipo</th>
              <th className="text-center py-3 px-4 font-medium">Moneda</th>
              <th className="text-center py-3 px-4 font-medium">Días Validez</th>
              <th className="text-center py-3 px-4 font-medium">Estado</th>
              <th className="text-center py-3 px-4 font-medium">Versiones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lista, idx) => {
              const versionesCount = versionesLista.filter(v => v.lista_precios_id === lista.id).length
              const rowClass = `border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`
              return (
                <tr key={lista.id} className={rowClass}>
                  <td className="p-0">
                    <Link href={`/listas-precios/${lista.id}`} className="block py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{lista.nombre}</span>
                        {lista.no_visible && <Eye className="w-4 h-4 text-gray-400" aria-label="No visible" />}
                      </div>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/listas-precios/${lista.id}`} className="block py-3 px-4 text-center text-sm text-gray-600">
                      {lista.tipo}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/listas-precios/${lista.id}`} className="block py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lista.moneda_base === "USD" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {lista.moneda_base}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/listas-precios/${lista.id}`} className="block py-3 px-4 text-center text-sm">
                      {lista.dias_validez}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/listas-precios/${lista.id}`} className="block py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lista.estado === "activa"
                            ? "bg-green-100 text-green-800"
                            : lista.estado === "creada"
                            ? "bg-blue-100 text-blue-800"
                            : lista.estado === "borrador"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {lista.estado.charAt(0).toUpperCase() + lista.estado.slice(1)}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/listas-precios/${lista.id}`} className="block py-3 px-4 text-center text-sm text-gray-600">
                      {versionesCount}
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No se encontraron listas de precios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
