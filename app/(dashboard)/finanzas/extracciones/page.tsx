"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ExtraccionesListado from "@/components/finanzas/extracciones-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "extracciones")) router.replace("/")
  }, [canSee, router])

  return <ExtraccionesListado />
}
