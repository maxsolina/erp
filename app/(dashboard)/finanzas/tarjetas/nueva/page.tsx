"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TarjetaForm from "@/components/finanzas/tarjeta-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "tarjetas")) router.replace("/")
  }, [canSee, router])

  return <TarjetaForm />
}
