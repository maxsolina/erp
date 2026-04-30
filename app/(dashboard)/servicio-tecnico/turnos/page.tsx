"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteTurno, fetchTurnos, type TallerTurno } from "@/lib/taller-actions"

export default function TurnosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerTurno[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "turnos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchTurnos().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Turnos de Técnicos"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "hora_entrada", label: "Entrada" },
        { key: "hora_salida", label: "Salida" },
        { key: "trabaja_sabado", label: "Sábado", render: v => (v ? "Sí" : "No") },
        { key: "trabaja_domingo", label: "Domingo", render: v => (v ? "Sí" : "No") },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear turno — pendiente de UI dedicada")}
      onEdit={() => alert("Editar turno — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteTurno(id)
        setData(await fetchTurnos())
      }}
    />
  )
}
