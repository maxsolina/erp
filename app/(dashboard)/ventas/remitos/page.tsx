"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RemitosListado from "@/components/ventas/remitos-listado"

export default function RemitosListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "remitos")) router.replace("/")
  }, [canSee, router])

  return <RemitosListado />
}
