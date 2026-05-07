"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchTurnos, type TallerTurno } from "@/lib/taller-actions"

export default function TurnosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerTurno[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "turnos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchTurnos()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerTurno>
      title="Turnos de Técnicos"
      rows={data}
      loading={loading}
      moduleName="taller_turnos"
      newHref="/servicio-tecnico/turnos/nuevo"
      newLabel="Nuevo Turno"
      rowHrefBase="/servicio-tecnico/turnos"
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "horario",
          label: "Horario",
          render: r => `${r.hora_entrada} – ${r.hora_salida}`,
          filterValue: r => `${r.hora_entrada} – ${r.hora_salida}`,
        },
        {
          key: "trabaja_sabado",
          label: "Sábado",
          align: "center",
          render: r => (r.trabaja_sabado ? "✓" : "—"),
          filterValue: r => (r.trabaja_sabado ? "Sí" : "No"),
        },
        {
          key: "trabaja_domingo",
          label: "Domingo",
          align: "center",
          render: r => (r.trabaja_domingo ? "✓" : "—"),
          filterValue: r => (r.trabaja_domingo ? "Sí" : "No"),
        },
        {
          key: "activo",
          label: "Estado",
          align: "center",
          render: r => (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                r.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
              }`}
            >
              {r.activo ? "Activo" : "Inactivo"}
            </span>
          ),
          filterValue: r => (r.activo ? "Sí" : "No"),
        },
      ]}
      filterableFields={["activo", "trabaja_sabado", "trabaja_domingo"]}
      groupByFields={["activo"]}
      searchFields={["nombre"]}
      emptyMessage="No hay turnos cargados"
    />
  )
}
