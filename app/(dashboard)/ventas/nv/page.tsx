"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NvListado from "@/components/ventas/nv-listado"

export default function NvListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_venta")) router.replace("/")
  }, [canSee, router])

  return <NvListado />
}
