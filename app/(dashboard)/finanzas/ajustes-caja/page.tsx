"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjustesCajaListado from "@/components/finanzas/ajustes-caja-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "ajustes_caja")) router.replace("/")
  }, [canSee, router])

  return <AjustesCajaListado />
}
