"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConfigDepositosListado from "@/components/stock/config-depositos-listado"

export default function ConfigDepositosPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_depositos")) router.replace("/")
  }, [canSee, router])

  return <ConfigDepositosListado />
}
