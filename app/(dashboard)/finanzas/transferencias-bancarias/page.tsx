"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciasBancariasListado from "@/components/finanzas/transferencias-bancarias-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "transferencias_bancarias")) router.replace("/")
  }, [canSee, router])

  return <TransferenciasBancariasListado />
}
