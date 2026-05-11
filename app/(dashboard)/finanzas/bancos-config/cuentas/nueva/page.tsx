"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CuentaBancariaForm from "@/components/finanzas/cuenta-bancaria-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "bancos_config")) router.replace("/")
  }, [canSee, router])

  return <CuentaBancariaForm />
}
