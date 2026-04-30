"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjustesListadoBase from "@/components/ventas/ajustes-listado-base"

export default function NcListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_credito")) router.replace("/")
  }, [canSee, router])

  return (
    <AjustesListadoBase
      tipo="credito"
      title="Notas de Crédito"
      view="notas_credito"
      permKey="notas_credito"
      baseHref="/ventas/nc"
      emptyText="No hay notas de crédito registradas"
    />
  )
}
