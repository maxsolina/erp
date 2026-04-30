"use client"

// Cubo de Stock — vista simplificada.
// El cubo original (components/modulo-stock.tsx → renderCuboStock ~4404-4820) es un pivot
// interactivo con drag-and-drop. PR 9 entrega una versión simplificada: KPIs + tabla
// productos × depósitos (cantidad). La versión con dimensiones configurables queda
// pendiente de migración (puede ir en un PR posterior).

import { useEffect, useMemo, useState } from "react"
import { Activity, Info } from "lucide-react"
import { mapDeposito, mapProducto, type Deposito, type ProductoStock } from "./_shared"

interface UnidadStock {
  id: number
  producto_id: number
  deposito_id: number
  estado: string
}

export default function CuboStock() {
  const [productos, setProductos] = useState<ProductoStock[]>([])
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [unidades, setUnidades] = useState<UnidadStock[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      fetch("/api/productos").then(r => r.json()),
      fetch("/api/depositos").then(r => r.json()),
      fetch("/api/stock/unidades").then(r => r.json()),
    ])
      .then(([prods, deps, unids]) => {
        if (cancelado) return
        setProductos((Array.isArray(prods) ? prods : []).map(mapProducto))
        setDepositos((Array.isArray(deps) ? deps : []).map(mapDeposito))
        setUnidades(
          (Array.isArray(unids) ? unids : []).map((u: any) => ({
            id: u.id,
            producto_id: u.producto_id,
            deposito_id: u.deposito_id,
            estado: u.estado,
          })),
        )
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const formatNumber = (n: number) =>
    n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const formatCurrency = (n: number) =>
    "$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Pivot productos × depositos basado en unidades disponibles
  const pivot = useMemo(() => {
    const matrix: Record<number, Record<number, number>> = {}
    for (const u of unidades) {
      if (u.estado !== "disponible") continue
      if (!matrix[u.producto_id]) matrix[u.producto_id] = {}
      matrix[u.producto_id][u.deposito_id] = (matrix[u.producto_id][u.deposito_id] ?? 0) + 1
    }
    return matrix
  }, [unidades])

  const totalUnidades = unidades.filter(u => u.estado === "disponible").length
  const valorTotal = productos.reduce(
    (sum, p) => sum + (p.stock_real ?? 0) * (p.precio_costo ?? 0),
    0,
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Cubo de Stock
        </h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2 text-sm text-blue-900">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          Vista simplificada: KPIs + matriz Producto × Depósito (cantidad disponible). La vista
          interactiva con drag-and-drop, dimensiones y medidas configurables queda pendiente de
          migración.
        </div>
      </div>

      {/* KPIs */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-4 border-amber-500">
          <span className="text-gray-500 uppercase text-xs">Productos:</span>
          <span className="font-bold text-gray-900 text-base">{productos.length}</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-4 border-blue-500">
          <span className="text-gray-500 uppercase text-xs">Depósitos:</span>
          <span className="font-bold text-gray-900 text-base">{depositos.length}</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-4 border-emerald-500">
          <span className="text-gray-500 uppercase text-xs">Unidades disponibles:</span>
          <span className="font-bold text-gray-900 text-base">{formatNumber(totalUnidades)}</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-4 border-violet-500">
          <span className="text-gray-500 uppercase text-xs">Valor total (al costo):</span>
          <span className="font-bold text-gray-900 text-base">{formatCurrency(valorTotal)}</span>
        </div>
      </div>

      {/* Tabla pivot */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-400">Cargando datos...</div>
        ) : productos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay productos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                    Producto
                  </th>
                  {depositos.map(d => (
                    <th
                      key={d.id}
                      className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 bg-blue-50"
                    >
                      {d.nombre}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-gray-900 border-b border-gray-200 bg-amber-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, idx) => {
                  const row = pivot[p.id] ?? {}
                  const total = depositos.reduce((sum, d) => sum + (row[d.id] ?? 0), 0)
                  if (total === 0) return null
                  const bg = idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  return (
                    <tr key={p.id} className={`${bg} hover:bg-amber-100/50`}>
                      <td className={`px-4 py-2 text-gray-900 border-r border-gray-100 sticky left-0 z-10 ${bg}`}>
                        <div className="font-medium">{p.nombre}</div>
                        <div className="text-xs text-gray-500">{p.codigo}</div>
                      </td>
                      {depositos.map(d => (
                        <td key={d.id} className="px-4 py-2 text-right text-gray-700">
                          {row[d.id] ? formatNumber(row[d.id]) : "-"}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-semibold text-amber-700 bg-amber-50">
                        {formatNumber(total)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-amber-100 font-semibold border-t-2 border-amber-300">
                  <td className="px-4 py-3 text-gray-900 border-r border-amber-200 sticky left-0 bg-amber-100 z-10">
                    Total General
                  </td>
                  {depositos.map(d => {
                    let totalCol = 0
                    for (const p of productos) totalCol += pivot[p.id]?.[d.id] ?? 0
                    return (
                      <td key={d.id} className="px-4 py-3 text-right text-gray-900">
                        {formatNumber(totalCol)}
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right text-amber-900 bg-amber-200">
                    {formatNumber(totalUnidades)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
