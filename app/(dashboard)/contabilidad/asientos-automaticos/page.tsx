"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AsientosListadoBase from "@/components/contabilidad/asientos-listado-base"

export default function AsientosAutomaticosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "asientos_automaticos")) router.replace("/")
  }, [canSee, router])
  return (
    <AsientosListadoBase
      esManual={false}
      title="Asientos Automáticos"
      monolithView="asientos-automaticos"
      emptyText="No hay asientos automáticos registrados"
    />
  )
}
