"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import StockDashboard from "@/components/stock/dashboard"

export default function StockPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    // Permiso a nivel módulo: si no tiene ningún sub-permiso de stock, sale
    if (
      !canSee("stock", "transferencias") &&
      !canSee("stock", "pedidos_abastecimiento") &&
      !canSee("stock", "productos")
    ) {
      router.replace("/")
    }
  }, [canSee, router])

  return <StockDashboard />
}
