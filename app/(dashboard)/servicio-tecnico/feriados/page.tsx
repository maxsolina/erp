"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TallerListadoTabla from "@/components/servicio-tecnico/listado-tabla"
import { fetchFeriados, type TallerFeriado } from "@/lib/taller-actions"

export default function FeriadosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  const [data, setData] = useState<TallerFeriado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canSee("servicio_tecnico", "feriados")) router.replace("/")
  }, [canSee, router])

  useEffect(() => {
    fetchFeriados()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <TallerListadoTabla<TallerFeriado>
      title="Feriados"
      rows={data}
      loading={loading}
      moduleName="taller_feriados"
      newHref="/servicio-tecnico/feriados/nuevo"
      newLabel="Nuevo Feriado"
      rowHrefBase="/servicio-tecnico/feriados"
      columns={[
        { key: "fecha", label: "Fecha" },
        { key: "descripcion", label: "Descripción" },
      ]}
      searchFields={["descripcion", "fecha"]}
      emptyMessage="No hay feriados cargados"
    />
  )
}
