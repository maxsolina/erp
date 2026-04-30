"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import SeniaListado from "@/components/ventas/senia-listado"

export default function SeniaListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "senia_equipo")) router.replace("/")
  }, [canSee, router])

  return <SeniaListado />
}
