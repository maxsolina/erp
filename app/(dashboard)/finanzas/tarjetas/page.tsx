"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TarjetasListado from "@/components/finanzas/tarjetas-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "tarjetas")) router.replace("/")
  }, [canSee, router])

  return <TarjetasListado />
}
