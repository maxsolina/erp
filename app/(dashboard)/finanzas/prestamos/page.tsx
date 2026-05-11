"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import PrestamosListado from "@/components/finanzas/prestamos-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "prestamos")) router.replace("/")
  }, [canSee, router])

  return <PrestamosListado />
}
