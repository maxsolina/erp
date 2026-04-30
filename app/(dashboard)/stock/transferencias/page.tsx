"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciasListado from "@/components/stock/transferencias-listado"

export default function TransferenciasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "transferencias")) router.replace("/")
  }, [canSee, router])

  return <TransferenciasListado />
}
