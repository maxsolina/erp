"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ExtractoCajaForm from "@/components/finanzas/extracto-caja-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "extractos_caja")) router.replace("/")
  }, [canSee, router])

  return <ExtractoCajaForm />
}
