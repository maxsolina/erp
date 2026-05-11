"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RegistrosCajaListado from "@/components/finanzas/registros-caja-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "registros_caja")) router.replace("/")
  }, [canSee, router])

  return <RegistrosCajaListado />
}
