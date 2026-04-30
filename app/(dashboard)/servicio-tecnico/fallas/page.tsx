"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteFalla, fetchFallas, type TallerFalla } from "@/lib/taller-actions"

export default function FallasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerFalla[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchFallas().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Fallas"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "taller_areas_reparacion",
          label: "Área",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        {
          key: "taller_categorias_reparacion",
          label: "Categoría",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear falla — pendiente de UI dedicada")}
      onEdit={() => alert("Editar falla — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteFalla(id)
        setData(await fetchFallas())
      }}
    />
  )
}
