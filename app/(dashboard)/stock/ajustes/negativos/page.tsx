"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjustesListado from "@/components/stock/ajustes-listado"

export default function AjustesNegativosPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "ajustes_negativos")) router.replace("/")
  }, [canSee, router])

  return <AjustesListado tipo="negativo" />
}
