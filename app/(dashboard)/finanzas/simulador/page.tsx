"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import Simulador from "@/components/finanzas/simulador"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "simulador")) router.replace("/")
  }, [canSee, router])

  return <Simulador />
}
