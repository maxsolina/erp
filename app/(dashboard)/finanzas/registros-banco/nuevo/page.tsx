"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RegistroBancoForm from "@/components/finanzas/registro-banco-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "registros_banco")) router.replace("/")
  }, [canSee, router])

  return <RegistroBancoForm />
}
