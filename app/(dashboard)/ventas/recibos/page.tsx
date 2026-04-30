"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RecibosListado from "@/components/ventas/recibos-listado"

export default function RecibosListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "recibos")) router.replace("/")
  }, [canSee, router])

  return <RecibosListado />
}
