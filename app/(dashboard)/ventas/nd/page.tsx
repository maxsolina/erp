"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjustesListadoBase from "@/components/ventas/ajustes-listado-base"

export default function NdListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_debito")) router.replace("/")
  }, [canSee, router])

  return (
    <AjustesListadoBase
      tipo="debito"
      title="Notas de Débito"
      view="notas_debito"
      permKey="notas_debito"
      baseHref="/ventas/nd"
      emptyText="No hay notas de débito registradas"
    />
  )
}
