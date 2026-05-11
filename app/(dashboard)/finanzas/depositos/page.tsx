"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import DepositosListado from "@/components/finanzas/depositos-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "depositos")) router.replace("/")
  }, [canSee, router])

  return <DepositosListado />
}
