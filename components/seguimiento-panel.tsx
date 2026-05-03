"use client"

// Panel de seguimiento / auditoría de un documento.
// Muestra una timeline colapsable con creación, cambios de estado, ediciones,
// y notas/mensajes manuales. Lee de /api/seguimiento.

import { useEffect, useState } from "react"
import { ArrowRight, FileText, Pencil, MessageSquare, RefreshCw } from "lucide-react"

interface SeguimientoEntry {
  id: number
  tipo_documento: string
  documento_id: string
  fecha: string
  tipo_evento: "creacion" | "cambio_estado" | "cambio_campo" | "nota" | "mensaje"
  campo: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  descripcion: string | null
  usuario: string | null
}

interface Props {
  tipoDocumento: string
  documentoId: number | string
  collapsed?: boolean
}

export default function SeguimientoPanel({ tipoDocumento, documentoId, collapsed = true }: Props) {
  const [isExpanded, setIsExpanded] = useState(!collapsed)
  const [entries, setEntries] = useState<SeguimientoEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isExpanded) return
    setLoading(true)
    setError(null)
    fetch(`/api/seguimiento?tipo=${encodeURIComponent(tipoDocumento)}&id=${encodeURIComponent(String(documentoId))}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setEntries([])
          return
        }
        const data = await r.json()
        setEntries(Array.isArray(data) ? data : [])
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar el seguimiento")
        setEntries([])
      })
      .finally(() => setLoading(false))
  }, [isExpanded, tipoDocumento, documentoId])

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
          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Cargando seguimiento...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 text-sm">{error}</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No hay actividad registrada.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {entries.map(entry => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry }: { entry: SeguimientoEntry }) {
  const Icon = iconForEvento(entry.tipo_evento)
  return (
    <div className="flex gap-3 p-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">{renderEntryContent(entry)}</div>
        <p className="text-xs text-gray-500 mt-1">
          {entry.usuario ?? "sistema"} · {formatFechaRelativa(entry.fecha)}
        </p>
      </div>
    </div>
  )
}

function iconForEvento(tipo: SeguimientoEntry["tipo_evento"]) {
  switch (tipo) {
    case "creacion": return FileText
    case "cambio_estado": return RefreshCw
    case "cambio_campo": return Pencil
    case "nota":
    case "mensaje": return MessageSquare
    default: return FileText
  }
}

function renderEntryContent(entry: SeguimientoEntry) {
  switch (entry.tipo_evento) {
    case "creacion":
      return (
        <div>
          <span className="font-medium text-gray-900">Documento creado</span>
          {entry.descripcion && <p className="text-gray-600 text-xs mt-0.5">{entry.descripcion}</p>}
        </div>
      )
    case "cambio_estado":
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-gray-600">Estado:</span>
          <span className="text-gray-700">{entry.valor_anterior ?? "—"}</span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="font-medium text-gray-900">{entry.valor_nuevo ?? "—"}</span>
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
          <span className="font-medium text-gray-900">{entry.valor_nuevo ?? "—"}</span>
        </div>
      )
    case "nota":
      return (
        <div className="bg-amber-50 border-l-2 border-amber-400 pl-3 py-1">
          <span className="text-gray-800">{entry.descripcion ?? ""}</span>
        </div>
      )
    case "mensaje":
      return <span className="text-gray-800">{entry.descripcion ?? ""}</span>
  }
}

function formatFechaRelativa(fecha: string) {
  const now = new Date()
  const date = new Date(fecha)
  if (isNaN(date.getTime())) return fecha
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return "hace un momento"
  if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
  if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
