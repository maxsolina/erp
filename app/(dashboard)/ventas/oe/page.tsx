"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OeListado from "@/components/ventas/oe-listado"

export default function OeListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "ordenes_entrega")) router.replace("/")
  }, [canSee, router])

  return <OeListado />
}
