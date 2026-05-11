"use client"

// Cheques Propios — placeholder.
//
// Los cheques propios se generan automáticamente cuando se paga con cheque
// desde Compras → Órdenes de Pago. Cuando exista la tabla `cheques_propios`
// y el endpoint correspondiente, este componente se reemplaza por un listado
// real (similar a cheques-terceros-listado.tsx).

import { FileText, Info } from "lucide-react"

export default function ChequesPropios() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-900">Cheques Propios</h1>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center max-w-2xl mx-auto">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-gray-700 mb-2">No hay cheques propios registrados</h2>
        <p className="text-sm text-gray-500 mb-4">
          Los cheques propios se generan automáticamente cuando pagás con cheque desde
          <strong> Compras → Órdenes de Pago</strong>.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2 text-left">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Feature pendiente de implementación: hace falta crear la tabla <code className="font-mono text-xs bg-blue-100 px-1">cheques_propios</code> y conectar la cascada desde OP.</span>
        </div>
      </div>
    </div>
  )
}
