"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import LotesListado from "@/components/stock/lotes-listado"

export default function LotesSeriesPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "lotes_series")) router.replace("/")
  }, [canSee, router])

  return <LotesListado dataset="todos" title="Lotes y Series" moduleName="lotes_series" />
}
