"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjusteBancoForm from "@/components/finanzas/ajuste-banco-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "ajustes_banco")) router.replace("/")
  }, [canSee, router])

  return <AjusteBancoForm />
}
