"use client"

// Listado de Lotes y Series con filtros + agrupación multinivel.
// Cubre /stock/lotes-series (todos los lotes) y /stock/imei (solo disponibles)
// según el prop `dataset`.
// Extraído de components/modulo-stock.tsx → renderLotesSeries (~2270-2558)
// y renderLotesStock (~2561-2841) — comparten la misma lógica.

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Package } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { mapLoteSerie, type LoteSerie } from "./_shared"

interface Props {
  dataset: "todos" | "disponibles"
  title: string
  moduleName: string
}

type GroupedData = {
  items: LoteSerie[]
  subgroups?: Record<string, GroupedData>
  totalCantidad: number
}

export default function LotesListado({ dataset, title, moduleName }: Props) {
  const [todos, setTodos] = useState<LoteSerie[]>([])
  const [cargando, setCargando] = useState(true)

  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>(
    dataset === "disponibles" ? [{ id: "ubicacion", label: "Ubicación", field: "ubicacion_nombre" }] : [],
  )
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelado = false
    Promise.all([
      fetch("/api/stock/unidades").then(r => r.json()),
      fetch("/api/productos").then(r => r.json()),
    ])
      .then(([unidades, prods]) => {
        if (cancelado) return
        const prodMap = new Map<number, any>(
          (Array.isArray(prods) ? prods : []).map((p: any) => [p.id, p]),
        )
        const lotes = (Array.isArray(unidades) ? unidades : []).map((u: any) => mapLoteSerie(u, prodMap))
        setTodos(lotes)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Filtrar dataset: "todos" o solo disponibles
  const baseDataset = useMemo(
    () => (dataset === "disponibles" ? todos.filter(l => l.estado === "disponible") : todos),
    [todos, dataset],
  )

  // Aplicar búsqueda + filtros activos
  const filtrados = useMemo(() => {
    return baseDataset.filter(lote => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !lote.producto_nombre.toLowerCase().includes(q) &&
          !lote.numero.toLowerCase().includes(q) &&
          !lote.ubicacion_nombre.toLowerCase().includes(q) &&
          !lote.sucursal.toLowerCase().includes(q) &&
          !lote.producto_codigo.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      for (const f of activeFilters) {
        const v = (lote as unknown as Record<string, unknown>)[f.field]
        if (String(v ?? "") !== f.value) return false
      }
      return true
    })
  }, [baseDataset, search, activeFilters])

  // Filtros y agrupaciones disponibles, derivados de los datos
  const filterOptions = useMemo(() => {
    const ubics = [...new Set(baseDataset.map(l => l.ubicacion_nombre))].filter(Boolean)
    const sucs = [...new Set(baseDataset.map(l => l.sucursal))].filter(Boolean)
    const deps = [...new Set(baseDataset.map(l => l.deposito_nombre))].filter(Boolean)
    const cats = [...new Set(baseDataset.map(l => l.producto_categoria))].filter(Boolean)
    const prods = [...new Set(baseDataset.map(l => l.producto_nombre))].filter(Boolean)
    const marcas = [...new Set(baseDataset.map(l => l.marca))].filter(Boolean)
    const colores = [...new Set(baseDataset.map(l => l.color).filter(c => c !== null))] as string[]
    const estados = [...new Set(baseDataset.map(l => l.estado))]
    return [
      { field: "ubicacion_nombre", label: "Ubicación", values: ubics.map(u => ({ value: u, label: u })) },
      { field: "producto_nombre", label: "Producto", values: prods.map(p => ({ value: p, label: p })) },
      { field: "marca", label: "Marca", values: marcas.map(m => ({ value: m, label: m })) },
      { field: "color", label: "Color", values: colores.map(c => ({ value: c, label: c })) },
      { field: "producto_categoria", label: "Categoría", values: cats.map(c => ({ value: c, label: c })) },
      { field: "sucursal", label: "Sucursal", values: sucs.map(s => ({ value: s, label: s })) },
      { field: "deposito_nombre", label: "Depósito", values: deps.map(d => ({ value: d, label: d })) },
      ...(dataset === "todos"
        ? [
            {
              field: "estado",
              label: "Estado",
              values: estados.map(e => ({
                value: e,
                label: e === "disponible" ? "Disponible" : e === "reservado" ? "Reservado" : "Vendido",
              })),
            },
          ]
        : []),
    ].filter(f => f.values.length > 0)
  }, [baseDataset, dataset])

  const groupByOptions: GroupByOption[] = [
    { id: "ubicacion", label: "Ubicación", field: "ubicacion_nombre" },
    { id: "producto", label: "Producto", field: "producto_nombre" },
    { id: "lote", label: "Lote", field: "numero" },
    { id: "marca", label: "Marca", field: "marca" },
    { id: "color", label: "Color", field: "color" },
    { id: "categoria", label: "Categoría", field: "producto_categoria" },
    { id: "sucursal", label: "Sucursal", field: "sucursal" },
    { id: "deposito", label: "Depósito", field: "deposito_nombre" },
    ...(dataset === "todos" ? [{ id: "estado", label: "Estado", field: "estado" }] : []),
  ]

  // Función recursiva para agrupar en múltiples niveles
  const groupDataMultiLevel = (data: LoteSerie[], groupByFields: GroupByOption[], level: number = 0): Record<string, GroupedData> => {
    if (level >= groupByFields.length || groupByFields.length === 0) {
      return { all: { items: data, totalCantidad: data.reduce((sum, l) => sum + l.cantidad, 0) } }
    }
    const currentField = groupByFields[level].field
    const grouped: Record<string, GroupedData> = {}
    data.forEach(item => {
      let key = String((item as unknown as Record<string, unknown>)[currentField] || "Sin definir")
      if (currentField === "estado") {
        key = key === "disponible" ? "Disponible" : key === "reservado" ? "Reservado" : "Vendido"
      }
      if (!grouped[key]) grouped[key] = { items: [], totalCantidad: 0 }
      grouped[key].items.push(item)
      grouped[key].totalCantidad += item.cantidad
    })
    if (level < groupByFields.length - 1) {
      Object.keys(grouped).forEach(key => {
        grouped[key].subgroups = groupDataMultiLevel(grouped[key].items, groupByFields, level + 1)
      })
    }
    return grouped
  }

  const groupedData = useMemo(
    () => groupDataMultiLevel(filtrados, activeGroupBy),
    [filtrados, activeGroupBy],
  )

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const renderGroup = (
    groupName: string,
    groupData: GroupedData,
    level: number = 0,
    parentKey: string = "",
  ) => {
    const fullKey = parentKey ? `${parentKey}/${groupName}` : groupName
    const isExpanded = expandedGroups.has(fullKey)
    const hasSubgroups = groupData.subgroups && Object.keys(groupData.subgroups).length > 0
    const indent = level * 24
    const bateriaItems = groupData.items.filter(l => l.bateria !== null)
    const bateriaProm = bateriaItems.length > 0
      ? Math.round(bateriaItems.reduce((s, l) => s + (l.bateria || 0), 0) / bateriaItems.length)
      : null

    return (
      <div key={fullKey}>
        <div
          className={`flex items-center gap-2 py-2 px-4 cursor-pointer hover:bg-gray-100 ${
            level === 0 ? "bg-gray-50 border-b font-semibold" : "border-b border-gray-100"
          }`}
          style={{ paddingLeft: `${16 + indent}px` }}
          onClick={() => toggleGroup(fullKey)}
        >
          <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          <span className={level === 0 ? "text-gray-900" : "text-gray-700"}>{groupName}</span>
          <span className="text-gray-500 font-normal">({groupData.items.length})</span>
          <span className="ml-auto flex items-center gap-6 text-sm text-gray-500">
            <span>Cant: {groupData.totalCantidad}</span>
            {bateriaProm !== null && <span>Bat: {bateriaProm}%</span>}
          </span>
        </div>
        {isExpanded && (
          <>
            {hasSubgroups ? (
              Object.entries(groupData.subgroups!).map(([subName, subData]) =>
                renderGroup(subName, subData, level + 1, fullKey),
              )
            ) : (
              <div className="bg-white">
                {groupData.items.map(lote => (
                  <div
                    key={lote.id}
                    className="flex items-center py-2 px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm"
                    style={{ paddingLeft: `${16 + indent + 28}px` }}
                  >
                    <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                      <div className="col-span-2">
                        <span className="font-medium text-gray-900">{lote.producto_nombre}</span>
                        <span className="text-gray-400 ml-2 text-xs">{lote.producto_codigo}</span>
                      </div>
                      <div className="text-gray-600">{lote.ubicacion_nombre}</div>
                      <div className="font-mono text-amber-700 text-xs">{lote.numero}</div>
                      <div className="text-center font-medium">{lote.cantidad}</div>
                      <div className="text-center">
                        {lote.bateria !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              lote.bateria >= 90
                                ? "bg-green-100 text-green-700"
                                : lote.bateria >= 80
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {lote.bateria}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            lote.estado === "disponible"
                              ? "bg-green-100 text-green-700"
                              : lote.estado === "reservado"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {lote.estado === "disponible"
                            ? "Disponible"
                            : lote.estado === "reservado"
                            ? "Reservado"
                            : "Vendido"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
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
        totalCount={baseDataset.length}
        filteredCount={filtrados.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-400">Cargando unidades...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No se encontraron series con los filtros aplicados</p>
            <button
              onClick={() => {
                setActiveFilters([])
                setSearch("")
              }}
              className="mt-2 text-amber-600 hover:text-amber-700 text-sm"
            >
              Limpiar filtros
            </button>
          </div>
        ) : activeGroupBy.length === 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">IMEI/Serie</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                  <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                  <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Batería</th>
                  <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Color</th>
                  {dataset === "todos" && (
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(lote => (
                  <tr key={lote.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4">
                      <div className="text-sm font-medium text-gray-900">{lote.producto_nombre}</div>
                      <div className="text-xs text-gray-500">{lote.producto_codigo}</div>
                    </td>
                    <td className="py-2 px-4 font-mono text-sm text-amber-700">{lote.numero}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">{lote.ubicacion_nombre}</td>
                    <td className="py-2 px-4 text-sm text-gray-600">{lote.sucursal}</td>
                    <td className="py-2 px-4 text-sm text-center font-medium">{lote.cantidad}</td>
                    <td className="py-2 px-4 text-sm text-center">
                      {lote.bateria !== null ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            lote.bateria >= 90
                              ? "bg-green-100 text-green-700"
                              : lote.bateria >= 80
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {lote.bateria}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600">{lote.color || "-"}</td>
                    {dataset === "todos" && (
                      <td className="py-2 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            lote.estado === "disponible"
                              ? "bg-green-100 text-green-700"
                              : lote.estado === "reservado"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {lote.estado === "disponible"
                            ? "Disponible"
                            : lote.estado === "reservado"
                            ? "Reservado"
                            : "Vendido"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          Object.entries(groupedData).map(([groupName, groupData]) => renderGroup(groupName, groupData))
        )}
      </div>
    </div>
  )
}
