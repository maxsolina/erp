"use client"

// Listado de Stock Reservado (unidades en estado="reservado").
// Extraído de components/modulo-stock.tsx → renderStockReservado (~4237-4402).
// Hace fetch a /api/stock/unidades?estado=reservado.

import { useEffect, useMemo, useState } from "react"
import { Package } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"

interface UnidadReservada {
  id: number
  nro_serie: string
  producto_nombre: string
  producto_codigo: string
  deposito_nombre: string
  ubicacion_nombre: string
  nota_venta_id: number | null
  nota_venta_numero: string
  color: string
  bateria_pct: number | null
  created_at: string
  updated_at: string
}

export default function ReservadoListado() {
  const [unidades, setUnidades] = useState<UnidadReservada[]>([])
  const [cargando, setCargando] = useState(false)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await fetch("/api/stock/unidades?estado=reservado").then(r => r.json())
      const enriched: UnidadReservada[] = (Array.isArray(data) ? data : []).map((u: any) => ({
        id: u.id,
        nro_serie: u.nro_serie ?? "",
        producto_nombre: u.productos?.nombre ?? "",
        producto_codigo: u.productos?.codigo_interno ?? "",
        deposito_nombre: u.depositos?.nombre ?? "",
        ubicacion_nombre: u.ubicaciones?.nombre ?? "",
        nota_venta_id: u.nota_venta_id ?? null,
        nota_venta_numero: u.nota_venta_numero ?? "",
        color: u.color ?? "",
        bateria_pct: u.bateria_pct ?? null,
        created_at: u.created_at ?? "",
        updated_at: u.updated_at ?? "",
      }))
      setUnidades(enriched)
    } catch {
      setUnidades([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    return unidades.filter(u => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !u.nro_serie.toLowerCase().includes(q) &&
          !u.producto_nombre.toLowerCase().includes(q) &&
          !u.producto_codigo.toLowerCase().includes(q) &&
          !(u.nota_venta_numero ?? "").toLowerCase().includes(q) &&
          !u.deposito_nombre.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      for (const f of activeFilters) {
        const v = (u as unknown as Record<string, unknown>)[f.field]
        if (String(v ?? "") !== f.value) return false
      }
      return true
    })
  }, [unidades, search, activeFilters])

  const filterOptions = useMemo(
    () => [
      {
        field: "deposito_nombre",
        label: "Depósito",
        values: [...new Set(unidades.map(u => u.deposito_nombre))].filter(Boolean).map(v => ({ value: v, label: v })),
      },
      {
        field: "ubicacion_nombre",
        label: "Ubicación",
        values: [...new Set(unidades.map(u => u.ubicacion_nombre))].filter(Boolean).map(v => ({ value: v, label: v })),
      },
      {
        field: "producto_nombre",
        label: "Producto",
        values: [...new Set(unidades.map(u => u.producto_nombre))].filter(Boolean).map(v => ({ value: v, label: v })),
      },
    ],
    [unidades],
  )

  const groupByOptions: GroupByOption[] = [
    { id: "deposito_nombre", label: "Depósito", field: "deposito_nombre" },
    { id: "ubicacion_nombre", label: "Ubicación", field: "ubicacion_nombre" },
    { id: "producto_nombre", label: "Producto", field: "producto_nombre" },
    { id: "nota_venta_numero", label: "Nota de Venta", field: "nota_venta_numero" },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Stock Reservado</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {filtrados.length} {filtrados.length === 1 ? "unidad reservada" : "unidades reservadas"}
          </span>
          <button
            onClick={cargar}
            disabled={cargando}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {cargando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {cargando && unidades.length === 0 ? (
        <div className="p-8 text-center text-gray-400">Cargando unidades reservadas…</div>
      ) : (
        <>
          <OdooFilterBar
            moduleName="stock_reservado"
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
              setSavedFilters(prev => [...prev, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])
            }
            onDeleteFilter={id => setSavedFilters(prev => prev.filter(f => f.id !== id))}
            onApplyFilter={f => {
              setActiveFilters(f.filters)
              setActiveGroupBy(f.groupBy)
            }}
            totalCount={unidades.length}
            filteredCount={filtrados.length}
          />

          <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
            {filtrados.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {unidades.length === 0
                    ? "No hay unidades reservadas en este momento"
                    : "No se encontraron unidades con los filtros aplicados"}
                </p>
                {(search || activeFilters.length > 0) && (
                  <button
                    onClick={() => {
                      setActiveFilters([])
                      setSearch("")
                    }}
                    className="mt-2 text-amber-600 hover:text-amber-700 text-sm"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">IMEI / Serie</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nota de Venta</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Color</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Batería</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha Reserva</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{u.producto_nombre}</div>
                        <div className="text-xs text-gray-500">{u.producto_codigo}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-amber-700">
                        {u.nro_serie || <span className="text-gray-400 italic text-xs">sin serie</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{u.deposito_nombre}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{u.ubicacion_nombre}</td>
                      <td className="py-3 px-4">
                        {u.nota_venta_numero ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {u.nota_venta_numero}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">sin NV</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{u.color || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        {u.bateria_pct !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              u.bateria_pct >= 90
                                ? "bg-green-100 text-green-700"
                                : u.bateria_pct >= 80
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {u.bateria_pct}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {u.updated_at ? new Date(u.updated_at).toLocaleDateString("es-AR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
