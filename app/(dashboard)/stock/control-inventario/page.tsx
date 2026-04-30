"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ControlInventarioListado from "@/components/stock/control-inventario-listado"

export default function ControlInventarioPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "control_inventario")) router.replace("/")
  }, [canSee, router])

  return <ControlInventarioListado />
}
