"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CajasListado from "@/components/finanzas/cajas-listado"

export default function CajasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "cajas")) router.replace("/")
  }, [canSee, router])

  return <CajasListado />
}
