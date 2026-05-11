"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CajaForm from "@/components/finanzas/caja-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "cajas")) router.replace("/")
  }, [canSee, router])

  return <CajaForm />
}
