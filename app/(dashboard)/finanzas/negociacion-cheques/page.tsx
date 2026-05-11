"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NegociacionChequesListado from "@/components/finanzas/negociacion-cheques-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "negociacion_cheques")) router.replace("/")
  }, [canSee, router])

  return <NegociacionChequesListado />
}
