"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteEquipo, fetchEquipos, type TallerEquipo } from "@/lib/taller-actions"

export default function EquiposPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerEquipo[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "equipos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchEquipos().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Equipos"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        { key: "marca", label: "Marca" },
        { key: "modelo", label: "Modelo" },
        {
          key: "taller_areas_reparacion",
          label: "Área",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "dias_garantia_compra", label: "Garantía Compra (días)" },
        { key: "dias_garantia_reparacion", label: "Garantía Rep. (días)" },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear equipo — pendiente de UI dedicada")}
      onEdit={() => alert("Editar equipo — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteEquipo(id)
        setData(await fetchEquipos())
      }}
    />
  )
}
