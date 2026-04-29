"use client"

// Duplicado desde components/ventas-module.tsx (líneas ~2549-2680). Si la fuente
// cambia, mantener en sync. Mantengo el comportamiento exactamente igual.

import { useState } from "react"
import { ArrowRight, Star, MessageSquare, User } from "lucide-react"
import type { SeguimientoEntry } from "./_shared"

export default function SeguimientoPanel({
  seguimiento,
  collapsed = true,
}: {
  seguimiento: SeguimientoEntry[]
  collapsed?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsed)

  const formatFechaRelativa = (fecha: string) => {
    const now = new Date()
    const date = new Date(fecha)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "hace un momento"
    if (diffMins < 60) return `hace ${diffMins} minutos`
    if (diffHours < 24) return `hace ${diffHours} horas`
    if (diffDays < 7) return `hace ${diffDays} días`
    return date.toLocaleDateString("es-AR")
  }

  const renderEntryContent = (entry: SeguimientoEntry) => {
    switch (entry.tipo) {
      case "creacion":
        return (
          <div>
            <span className="font-medium text-gray-900">Documento creado</span>
            {entry.descripcion && <p className="text-gray-600 text-sm mt-1">{entry.descripcion}</p>}
          </div>
        )
      case "cambio_estado":
        return (
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Estado:</span>
            <span className="text-gray-900">{entry.valor_anterior}</span>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <span className="font-medium text-gray-900">{entry.valor_nuevo}</span>
          </div>
        )
      case "cambio_campo":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-gray-600">{entry.campo}:</span>
            {entry.valor_anterior && (
              <>
                <span className="text-gray-500 line-through">{entry.valor_anterior}</span>
                <ArrowRight className="w-3 h-3 text-gray-400" />
              </>
            )}
            <span className="font-medium text-gray-900">{entry.valor_nuevo}</span>
          </div>
        )
      case "nota":
        return (
          <div className="bg-amber-50 border-l-2 border-amber-400 pl-3 py-1">
            <span className="text-gray-800">{entry.descripcion}</span>
          </div>
        )
      case "mensaje":
        return (
          <div>
            <span className="text-gray-800">{entry.descripcion}</span>
          </div>
        )
      default:
        return <span>{entry.descripcion}</span>
    }
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 px-4 text-sm text-purple-700 hover:text-purple-800 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {isExpanded ? "Ocultar seguimiento" : "Ver seguimiento"}
      </button>

      {isExpanded && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {seguimiento.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No hay actividad registrada</div>
            ) : (
              seguimiento.map(entry => (
                <div key={entry.id} className="flex gap-3 p-4 hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{renderEntryContent(entry)}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-medium text-purple-700">{entry.usuario}</span>
                      <span>·</span>
                      <span>{formatFechaRelativa(entry.fecha)}</span>
                      <span>·</span>
                      <button className="hover:text-purple-700">Me gusta</button>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <button className="p-1 text-gray-400 hover:text-amber-500">
                      <Star className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-purple-600">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
