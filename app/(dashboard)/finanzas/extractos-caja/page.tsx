"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ExtractosCajaListado from "@/components/finanzas/extractos-caja-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "extractos_caja")) router.replace("/")
  }, [canSee, router])

  return <ExtractosCajaListado />
}
