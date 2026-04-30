"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import PeriodosListado from "@/components/contabilidad/periodos-listado"

export default function PeriodosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "periodos")) router.replace("/")
  }, [canSee, router])
  return <PeriodosListado />
}
