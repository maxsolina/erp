"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciaCajaForm from "@/components/finanzas/transferencia-caja-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "transferencias_caja")) router.replace("/")
  }, [canSee, router])

  return <TransferenciaCajaForm />
}
