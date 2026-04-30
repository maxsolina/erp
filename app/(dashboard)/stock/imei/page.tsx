"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import LotesListado from "@/components/stock/lotes-listado"

export default function ImeiPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "lotes_stock")) router.replace("/")
  }, [canSee, router])

  return <LotesListado dataset="disponibles" title="IMEI en Stock" moduleName="imei_stock" />
}
