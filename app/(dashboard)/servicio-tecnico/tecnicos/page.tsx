"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteTecnico, fetchTecnicos, type TallerTecnico } from "@/lib/taller-actions"

export default function TecnicosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerTecnico[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "tecnicos")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchTecnicos().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Técnicos"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "nombre", label: "Nombre" },
        {
          key: "tipo",
          label: "Tipo",
          render: v => (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                v === "propio" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {v as string}
            </span>
          ),
        },
        {
          key: "taller_areas_reparacion",
          label: "Área",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        {
          key: "taller_categorias_reparacion",
          label: "Cat. Principal",
          render: v => (v as { nombre: string } | null)?.nombre ?? "—",
        },
        { key: "complejidad_tope", label: "Complejidad Tope" },
        { key: "activo", label: "Activo", render: v => (v ? "✓" : "✗") },
      ]}
      onNew={() => alert("Crear técnico — pendiente de UI dedicada")}
      onEdit={() => alert("Editar técnico — pendiente de UI dedicada")}
      onDelete={async id => {
        await deleteTecnico(id)
        setData(await fetchTecnicos())
      }}
    />
  )
}
