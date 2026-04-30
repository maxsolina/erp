"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasListado from "@/components/ventas/facturas-listado"

export default function FacturasListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "facturas")) router.replace("/")
  }, [canSee, router])

  return <FacturasListado />
}
