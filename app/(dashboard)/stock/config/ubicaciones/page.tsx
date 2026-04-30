"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConfigUbicacionesListado from "@/components/stock/config-ubicaciones-listado"

export default function ConfigUbicacionesPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_ubicaciones")) router.replace("/")
  }, [canSee, router])

  return <ConfigUbicacionesListado />
}
