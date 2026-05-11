"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RecargosListado from "@/components/finanzas/recargos-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "recargos")) router.replace("/")
  }, [canSee, router])

  return <RecargosListado />
}
