"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteFallaEquipo, fetchFallasEquipo, type TallerFallaEquipo } from "@/lib/taller-actions"

export default function FallasEquipoPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerFallaEquipo[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "fallas_equipo")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchFallasEquipo().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Fallas por Equipos"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        {
          key: "taller_equipos",
          label: "Equipo",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        {
          key: "taller_fallas",
          label: "Falla",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        {
          key: "taller_categorias_reparacion",
          label: "Categoría",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "complejidad_principal", label: "Compl. Princ." },
        { key: "complejidad_secundaria", label: "Compl. Sec." },
        { key: "tiempo_reparacion_principal", label: "Tiempo Princ. (min)" },
        { key: "puntaje_base", label: "Puntaje Base" },
      ]}
      onNew={() => alert("Crear falla-equipo — pendiente de UI dedicada")}
      onEdit={() => alert("Editar falla-equipo — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteFallaEquipo(id)
        setData(await fetchFallasEquipo())
      }}
    />
  )
}
