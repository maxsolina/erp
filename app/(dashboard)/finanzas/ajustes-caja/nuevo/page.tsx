"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjusteCajaForm from "@/components/finanzas/ajuste-caja-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "ajustes_caja")) router.replace("/")
  }, [canSee, router])

  return <AjusteCajaForm />
}
