"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import DepositoForm from "@/components/finanzas/deposito-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "depositos")) router.replace("/")
  }, [canSee, router])

  return <DepositoForm />
}
