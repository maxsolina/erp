"use client"

// Listado de Ajustes Positivos / Negativos.
// Extraído de components/modulo-stock.tsx → renderAjustes (~2911-2970).
// Sin persistencia Supabase: data vacía. "Nuevo Ajuste" → alert.

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  formatDate,
  getEstadoControlColor,
  getEstadoLabel,
  StockListSection,
  type AjusteInventario,
} from "./_shared"

export default function AjustesListado({ tipo }: { tipo: "positivo" | "negativo" }) {
  const [ajustes] = useState<AjusteInventario[]>([])
  const data = ajustes.filter(a => a.tipo === tipo)
  const titulo = tipo === "positivo" ? "Ajustes Positivos" : "Ajustes Negativos"

  return (
    <StockListSection<AjusteInventario>
      title={titulo}
      moduleName={`ajustes-${tipo}`}
      data={data}
      searchFields={["numero", "deposito_nombre", "ubicacion_nombre", "concepto"]}
      filterFields={[
        { field: "estado", label: "Estado" },
        { field: "deposito_nombre", label: "Depósito" },
        { field: "concepto", label: "Concepto" },
      ]}
      actions={
        <button
          onClick={() => alert(`Nuevo Ajuste ${tipo === "positivo" ? "Positivo" : "Negativo"} — pendiente de UI dedicada con persistencia Supabase`)}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Ajuste
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{a.numero}</td>
                  <td className="py-3 px-4 text-sm">{a.deposito_nombre}</td>
                  <td className="py-3 px-4 text-sm">{a.ubicacion_nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(a.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{a.concepto}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoControlColor(a.estado)}`}>
                      {getEstadoLabel(a.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay ajustes {tipo === "positivo" ? "positivos" : "negativos"}
            </div>
          )}
        </div>
      )}
    </StockListSection>
  )
}
