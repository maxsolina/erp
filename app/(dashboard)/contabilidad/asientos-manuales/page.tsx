"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AsientosListadoBase from "@/components/contabilidad/asientos-listado-base"

export default function AsientosManualesPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "asientos_manuales")) router.replace("/")
  }, [canSee, router])
  return (
    <AsientosListadoBase
      esManual={true}
      title="Asientos Manuales"
      monolithView="asientos-manuales"
      emptyText="No hay asientos manuales registrados"
    />
  )
}
