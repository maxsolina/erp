"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturacionesListado from "@/components/contabilidad/facturaciones-listado"

export default function FacturacionesPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("contabilidad")) router.replace("/")
  }, [canSee, router])

  return <FacturacionesListado />
}
