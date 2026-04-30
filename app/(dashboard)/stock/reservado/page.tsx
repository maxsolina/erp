"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ReservadoListado from "@/components/stock/reservado-listado"

export default function ReservadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "stock_reservado")) router.replace("/")
  }, [canSee, router])

  return <ReservadoListado />
}
