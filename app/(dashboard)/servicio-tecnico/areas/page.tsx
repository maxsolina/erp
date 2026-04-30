"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteArea, fetchAreas, type TallerArea } from "@/lib/taller-actions"

export default function AreasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerArea[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "areas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchAreas().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Áreas de Reparación"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "codigo", label: "Código" },
        { key: "nombre", label: "Nombre" },
        { key: "descripcion", label: "Descripción" },
        { key: "orden", label: "Orden" },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear área — pendiente de UI dedicada")}
      onEdit={() => alert("Editar área — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteArea(id)
        setData(await fetchAreas())
      }}
    />
  )
}
