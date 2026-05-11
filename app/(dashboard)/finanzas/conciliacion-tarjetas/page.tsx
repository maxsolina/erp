"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConciliacionTarjetas from "@/components/finanzas/conciliacion-tarjetas"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "conciliacion_tarjetas")) router.replace("/")
  }, [canSee, router])

  return <ConciliacionTarjetas />
}
