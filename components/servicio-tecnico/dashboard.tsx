"use client"

// Dashboard del módulo Servicio Técnico.
// Extraído de components/modulo-taller.tsx → renderDashboard (~463-516).

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle, Pause, Play, Wrench } from "lucide-react"
import {
  fetchOrdenes,
  fetchTecnicos,
  type TallerOrdenTrabajo,
  type TallerTecnico,
} from "@/lib/taller-actions"
import { ESTADOS_OT, ESTADOS_PAUSA } from "./_shared"

export default function ServicioTecnicoDashboard() {
  const [ordenes, setOrdenes] = useState<TallerOrdenTrabajo[]>([])
  const [tecnicos, setTecnicos] = useState<TallerTecnico[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false
    Promise.all([fetchOrdenes(), fetchTecnicos()])
      .then(([ords, tecs]) => {
        if (cancelado) return
        setOrdenes(Array.isArray(ords) ? ords : [])
        setTecnicos(Array.isArray(tecs) ? tecs : [])
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const stats = useMemo(
    () => ({
      total: ordenes.length,
      sin_asignar: ordenes.filter(o => o.estado === "sin_asignar").length,
      en_proceso: ordenes.filter(o => o.estado === "asignada_en_proceso").length,
      control: ordenes.filter(o => o.estado === "control_calidad").length,
      pausadas: ordenes.filter(o => (ESTADOS_PAUSA as readonly string[]).includes(o.estado)).length,
    }),
    [ordenes],
  )

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-6">Dashboard del Taller</h1>
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total OTs", value: stats.total, icon: Wrench, color: "indigo" },
          { label: "Sin Asignar", value: stats.sin_asignar, icon: AlertCircle, color: "yellow" },
          { label: "En Proceso", value: stats.en_proceso, icon: Play, color: "blue" },
          { label: "Control Calidad", value: stats.control, icon: CheckCircle, color: "purple" },
          { label: "En Pausa", value: stats.pausadas, icon: Pause, color: "orange" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 text-${stat.color}-500 opacity-50`} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">OTs por Estado</h3>
          <div className="space-y-2">
            {ESTADOS_OT.filter(e => e.step >= 0).map(est => {
              const count = ordenes.filter(o => o.estado === est.value).length
              return (
                <div key={est.value} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${est.color}`}>{est.label}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Técnicos Activos</h3>
          <div className="space-y-2">
            {tecnicos
              .filter(t => t.activo)
              .map(tec => {
                const otsAsignadas = ordenes.filter(
                  o => o.tecnico_id === tec.id && ["asignada", "asignada_en_proceso"].includes(o.estado),
                ).length
                return (
                  <div key={tec.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{tec.nombre}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {otsAsignadas} OTs
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
