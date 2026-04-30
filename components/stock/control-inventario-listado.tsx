"use client"

// Listado de Control de Inventario.
// Extraído de components/modulo-stock.tsx → renderControlInventario (~2843-2908).
// Sin persistencia Supabase: data vacía por defecto. "Nuevo Control" → alert.

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  formatDate,
  getEstadoControlColor,
  getEstadoLabel,
  StockListSection,
  type ControlInventario,
} from "./_shared"

export default function ControlInventarioListado() {
  const [controles] = useState<ControlInventario[]>([])

  return (
    <StockListSection<ControlInventario>
      title="Control de Inventario"
      moduleName="control-inventario"
      data={controles}
      searchFields={["numero", "deposito_nombre", "concepto", "ubicacion_nombre", "sucursal"]}
      filterFields={[
        { field: "estado", label: "Estado" },
        { field: "deposito_nombre", label: "Depósito" },
        { field: "sucursal", label: "Sucursal" },
      ]}
      actions={
        <button
          onClick={() => alert("Nuevo Control de Inventario — pendiente de UI dedicada con persistencia Supabase")}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Control
        </button>
      }
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{c.numero}</td>
                  <td className="py-3 px-4 text-sm">{c.deposito_nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(c.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{c.concepto}</td>
                  <td className="py-3 px-4 text-sm">{c.ubicacion_nombre}</td>
                  <td className="py-3 px-4 text-sm">{c.sucursal}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoControlColor(c.estado)}`}>
                      {getEstadoLabel(c.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay controles de inventario</div>
          )}
        </div>
      )}
    </StockListSection>
  )
}
