"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteControl, fetchControles, type TallerControl } from "@/lib/taller-actions"

export default function ControlesPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerControl[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "controles")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchControles().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Controles / Checklist"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "taller_areas_reparacion",
          label: "Área",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "disponible_recepcion", label: "Recepción", render: v => (v ? "✓" : "—") },
        { key: "disponible_calidad", label: "Calidad", render: v => (v ? "✓" : "—") },
        { key: "orden", label: "Orden" },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear control — pendiente de UI dedicada")}
      onEdit={() => alert("Editar control — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteControl(id)
        setData(await fetchControles())
      }}
    />
  )
}
