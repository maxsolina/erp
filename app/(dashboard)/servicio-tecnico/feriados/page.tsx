"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { CRUDTableWithFilter } from "@/components/servicio-tecnico/_shared"
import { deleteFeriado, fetchFeriados, type TallerFeriado } from "@/lib/taller-actions"

export default function FeriadosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerFeriado[]>([])

  useEffect(() => {
    if (!canSee("servicio_tecnico", "feriados")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchFeriados().then(d => setData(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  return (
    <CRUDTableWithFilter
      title="Feriados"
      data={data as unknown as Record<string, unknown>[]}
      columns={[
        { key: "fecha", label: "Fecha" },
        { key: "descripcion", label: "Descripción" },
      ]}
      onNew={() => alert("Crear feriado — pendiente de UI dedicada")}
      onEdit={() => {}}
      onDelete={async id => {
        await deleteFeriado(id)
        setData(await fetchFeriados())
      }}
    />
  )
}
