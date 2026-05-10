"use client"

// Extraído de components/ventas-module.tsx → renderListaVersiones (~14100-14162)
// y dispatcher renderVersionesLista (~14095-14099).
//
// Si se pasa `listaId`, filtra por esa lista. Sin prop, lista todas. El botón "Crear"
// va a /listas-precios/<X>/versiones/nueva: si hay listaId usa ese, sino usa la primera
// lista activa que encuentre (consistente con `crearNuevaVersion(undefined)` que usaba
// `selectedListaPrecios` o iba a la primera lista).

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { normalizarLista, type ListaPrecios, type VersionListaPrecios } from "./_shared"

interface VersionesListadoProps {
  listaId?: number
}

export default function VersionesListado({ listaId }: VersionesListadoProps) {
  const [versionesLista, setVersionesLista] = useState<VersionListaPrecios[]>([])
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [mostrarInactivasVersiones, setMostrarInactivasVersiones] = useState(false)

  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    const url = listaId
      ? `/api/listas-precios/versiones?lista_id=${listaId}`
      : "/api/listas-precios/versiones"
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setVersionesLista(data)
      })
      .catch(() => {})
  }, [listaId])

  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setListasPrecios(data.map(normalizarLista))
      })
      .catch(() => {})
  }, [])

  const dataVersionesFiltrada = useMemo(
    () => (mostrarInactivasVersiones ? versionesLista : versionesLista.filter(v => v.activa !== false)),
    [versionesLista, mostrarInactivasVersiones],
  )

  const searchFields: (keyof VersionListaPrecios)[] = ["nombre", "lista_precios_nombre"]
  const filterFields: { field: keyof VersionListaPrecios; label: string }[] = [
    { field: "lista_precios_nombre", label: "Lista" },
  ]

  const filtered = useMemo(() => {
    let result = [...dataVersionesFiltrada]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row => searchFields.some(f => String(row[f] ?? "").toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field as keyof VersionListaPrecios] ?? "") === f.value)
    }
    return result
  }, [dataVersionesFiltrada, search, activeFilters])

  const filterOptions = useMemo(
    () =>
      filterFields
        .map(ff => {
          const vals = [
            ...new Set(
              dataVersionesFiltrada
                .map(row => String(row[ff.field] ?? ""))
                .filter(v => v && v !== "null" && v !== "undefined"),
            ),
          ]
          return { field: String(ff.field), label: ff.label, values: vals.sort().map(v => ({ value: v, label: v })) }
        })
        .filter(f => f.values.length > 0),
    [dataVersionesFiltrada],
  )

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({
    id: String(ff.field),
    label: ff.label,
    field: String(ff.field),
  }))

  // Determinar a qué lista navega el botón "Crear" cuando no hay listaId
  // (en el original, crearNuevaVersion sin listaId usaba selectedListaPrecios o ninguna).
  // Acá, por simplicidad, dirigimos a la primera lista activa.
  const listaParaCrear = useMemo(() => {
    if (listaId) return listaId
    const primera = listasPrecios.find(l => l.activa !== false) ?? listasPrecios[0]
    return primera?.id ?? null
  }, [listaId, listasPrecios])

  const crearHref =
    listaParaCrear !== null ? `/listas-precios/${listaParaCrear}/versiones/nueva` : "#"

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-900">
          {listaId ? "Versiones de la Lista" : "Versiones de Lista de Precios"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarInactivasVersiones(v => !v)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm border transition-colors ${
              mostrarInactivasVersiones
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
            title="Incluir versiones archivadas"
          >
            {mostrarInactivasVersiones ? "Ocultar archivadas" : "Mostrar archivadas"}
          </button>
          {listaParaCrear !== null ? (
            <Link
              href={crearHref}
              className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Crear
            </Link>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded text-sm font-medium opacity-50 cursor-not-allowed"
              title="No hay listas de precios disponibles"
            >
              <Plus className="w-4 h-4" /> Crear
            </button>
          )}
        </div>
      </div>

      <OdooFilterBar
        moduleName="versiones_lista"
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
        totalCount={dataVersionesFiltrada.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white border border-gray-200 rounded overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Lista</th>
              <th className="text-left py-3 px-4 font-medium">Versión</th>
              <th className="text-center py-3 px-4 font-medium">Fecha Inicial</th>
              <th className="text-center py-3 px-4 font-medium">Fecha Final</th>
              <th className="text-center py-3 px-4 font-medium">Líneas</th>
              <th className="text-center py-3 px-4 font-medium">Última Actualización</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((version, idx) => {
              const rowCls = `border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              }`
              const href = `/listas-precios/${version.lista_precios_id}/versiones/${version.id}`
              return (
                <tr key={version.id} className={rowCls}>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-gray-600">
                      {version.lista_precios_nombre}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 font-medium text-gray-900">
                      {version.nombre}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center text-gray-600">
                      {new Date(version.fecha_inicial).toLocaleDateString("es-AR")}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center text-gray-600">
                      {version.fecha_final ? new Date(version.fecha_final).toLocaleDateString("es-AR") : "-"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center text-gray-600">
                      {version.lineas.length}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={href} className="block py-3 px-4 text-center text-gray-500 text-xs">
                      {new Date(version.ultima_actualizacion).toLocaleString("es-AR")}
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No se encontraron versiones
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
