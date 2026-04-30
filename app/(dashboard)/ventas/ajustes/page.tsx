"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjustesListadoBase from "@/components/ventas/ajustes-listado-base"

export default function AjustesListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "ajustes")) router.replace("/")
  }, [canSee, router])

  return (
    <AjustesListadoBase
      tipo="todos"
      title="Ajustes de Cliente"
      view="ajustes"
      permKey="ajustes"
      baseHref="/ventas/ajustes"
    />
  )
}
