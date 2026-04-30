"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OcListado from "@/components/compras/oc-listado"

export default function OcListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "ordenes_compra")) router.replace("/")
  }, [canSee, router])

  return <OcListado />
}
