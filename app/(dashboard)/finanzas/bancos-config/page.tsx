"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import BancosConfigListado from "@/components/finanzas/bancos-config-listado"

export default function BancosConfigPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "bancos_config")) router.replace("/")
  }, [canSee, router])

  return <BancosConfigListado />
}
