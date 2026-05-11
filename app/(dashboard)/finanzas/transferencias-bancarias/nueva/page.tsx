"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciaBancariaForm from "@/components/finanzas/transferencia-bancaria-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "transferencias_bancarias")) router.replace("/")
  }, [canSee, router])

  return <TransferenciaBancariaForm />
}
