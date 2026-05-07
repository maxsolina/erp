"use client"

// Editor de repuestos para Fallas por Equipo. Lista de líneas
// `{ producto_id, cantidad }` con autocomplete por nombre/SKU contra
// /api/productos. Reutilizable desde el form de Fallas por Equipo.

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

interface Producto {
  id: string
  sku?: string
  nombre: string
}

export interface RepuestoLinea {
  producto_id: string
  cantidad: number
}

interface Props {
  value: RepuestoLinea[]
  onChange: (next: RepuestoLinea[]) => void
}

export default function RepuestosEditor({ value, onChange }: Props) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/productos")
      .then(r => r.json())
      .then(d => setProductos(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const productoLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of productos) {
      map.set(p.id, p.sku ? `${p.sku} — ${p.nombre}` : p.nombre)
    }
    return map
  }, [productos])

  function agregar() {
    onChange([...value, { producto_id: "", cantidad: 1 }])
  }

  function actualizar(idx: number, patch: Partial<RepuestoLinea>) {
    onChange(value.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function eliminar(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Repuestos sugeridos</h3>
        <button
          type="button"
          onClick={agregar}
          disabled={loading}
          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs flex items-center gap-1.5 border border-indigo-200 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar repuesto
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin repuestos definidos.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-gray-600 uppercase">Producto</th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase w-32">Cantidad</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {value.map((l, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 px-2">
                  <select
                    value={l.producto_id}
                    onChange={e => actualizar(idx, { producto_id: e.target.value })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">{loading ? "Cargando…" : "Seleccionar producto"}</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {productoLabel.get(p.id)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={l.cantidad}
                    onChange={e => actualizar(idx, { cantidad: Number(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </td>
                <td className="py-2 px-2 text-right">
                  <button
                    type="button"
                    onClick={() => eliminar(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
