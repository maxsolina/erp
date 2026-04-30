"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import PedidosListado from "@/components/stock/pedidos-listado"

export default function PedidosAbastecimientoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "pedidos_abastecimiento")) router.replace("/")
  }, [canSee, router])

  return <PedidosListado />
}
