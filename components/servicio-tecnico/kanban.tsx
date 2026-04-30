"use client"

// Kanban del módulo Servicio Técnico.
// Extraído de components/modulo-taller.tsx → renderKanban (~1074-1111).

import { useEffect, useState } from "react"
import Link from "next/link"
import { fetchOrdenes, type TallerOrdenTrabajo } from "@/lib/taller-actions"

const COLUMNAS = [
  { estado: "asignada", label: "Pendientes" },
  { estado: "asignada_en_proceso", label: "En Proceso" },
  { estado: "re_presupuestacion", label: "Re-presupuestación" },
  { estado: "falta_repuestos", label: "Falta Repuestos" },
  { estado: "control_calidad", label: "Control Calidad" },
] as const

export default function ServicioTecnicoKanban() {
  const [ordenes, setOrdenes] = useState<TallerOrdenTrabajo[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    fetchOrdenes()
      .then(ords => {
        if (cancelado) return
        setOrdenes(Array.isArray(ords) ? ords : [])
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando kanban...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-4">Kanban Técnicos</h1>
      <div className="grid grid-cols-5 gap-3">
        {COLUMNAS.map(col => {
          const otsCol = ordenes.filter(o => o.estado === col.estado)
          return (
            <div key={col.estado} className="bg-gray-50 rounded-lg p-3 min-h-[400px]">
              <h3 className="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center justify-between">
                {col.label}
                <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                  {otsCol.length}
                </span>
              </h3>
              <div className="space-y-2">
                {otsCol.map(ot => (
                  <Link
                    key={ot.id}
                    href={`/servicio-tecnico/ot/${ot.id}`}
                    className="block bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4 border-indigo-400"
                  >
                    <div className="text-xs font-semibold text-indigo-600 mb-1">{ot.numero}</div>
                    <div className="text-xs text-gray-500 mb-1">{ot.taller_equipos?.nombre}</div>
                    <div className="text-xs text-gray-700 mb-1">{ot.taller_fallas?.nombre}</div>
                    <div className="text-[10px] text-gray-400">{ot.taller_tecnicos?.nombre ?? "Sin técnico"}</div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
