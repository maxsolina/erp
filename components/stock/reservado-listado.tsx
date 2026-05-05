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
  /** Comprobante que reservó la unidad (preferentemente seña; si no, NV) */
  comprobante_tipo: "senia" | "nota_venta" | null
  comprobante_numero: string
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
      // Traemos las unidades reservadas + las señas en curso para vincular cada
      // unidad con el comprobante que la reservó (preferimos seña si existe;
      // sino caemos a la NV).
      const [unidadesData, seniasData] = await Promise.all([
        fetch("/api/stock/unidades?estado=reservado").then(r => r.json()).catch(() => []),
        fetch("/api/senias-equipo").then(r => r.json()).catch(() => []),
      ])
      const senias: Array<{ stock_item_id: number; numero: string; estado: string }> = Array.isArray(seniasData) ? seniasData : []
      const seniaPorStockId = new Map<number, { numero: string }>()
      for (const s of senias) {
        if (s.stock_item_id && s.estado === "en_curso") {
          seniaPorStockId.set(Number(s.stock_item_id), { numero: s.numero })
        }
      }
      const enriched: UnidadReservada[] = (Array.isArray(unidadesData) ? unidadesData : []).map((u: any) => {
        const senia = seniaPorStockId.get(Number(u.id))
        const tipo: "senia" | "nota_venta" | null = senia
          ? "senia"
          : (u.nota_venta_numero ? "nota_venta" : null)
        const numero = senia
          ? senia.numero
          : (u.nota_venta_numero ?? "")
        return {
          id: u.id,
          nro_serie: u.nro_serie ?? "",
          producto_nombre: u.productos?.nombre ?? "",
          producto_codigo: u.productos?.codigo_interno ?? "",
          deposito_nombre: u.depositos?.nombre ?? "",
          ubicacion_nombre: u.ubicaciones?.nombre ?? "",
          nota_venta_id: u.nota_venta_id ?? null,
          nota_venta_numero: u.nota_venta_numero ?? "",
          comprobante_tipo: tipo,
          comprobante_numero: numero,
          color: u.color ?? "",
          bateria_pct: u.bateria_pct ?? null,
          created_at: u.created_at ?? "",
          updated_at: u.updated_at ?? "",
        }
      })
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
          !(u.comprobante_numero ?? "").toLowerCase().includes(q) &&
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
    { id: "comprobante_numero", label: "Comprobante", field: "comprobante_numero" },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Stock Reservado</h1>
        <span className="text-sm text-gray-500">
          {filtrados.length} {filtrados.length === 1 ? "unidad reservada" : "unidades reservadas"}
        </span>
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
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
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
                        {u.comprobante_numero ? (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            u.comprobante_tipo === "senia"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            <span className="opacity-70 mr-1 font-semibold">
                              {u.comprobante_tipo === "senia" ? "Seña" : "NV"}
                            </span>
                            {u.comprobante_numero}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">sin comprobante</span>
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
