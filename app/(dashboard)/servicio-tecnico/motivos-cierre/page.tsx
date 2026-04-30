"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { fetchMotivosCierre, type TallerMotivoCierre } from "@/lib/taller-actions"

export default function MotivosCierrePage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerMotivoCierre[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "motivos_cierre")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchMotivosCierre().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Motivos de Cierre"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear motivo — pendiente de UI dedicada")}
      onEdit={() => {}}
      onDelete={() => {}}
    />
  )
}
