"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConciliacionBancaria from "@/components/finanzas/conciliacion-bancaria"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "conciliacion_bancaria")) router.replace("/")
  }, [canSee, router])

  return <ConciliacionBancaria />
}
