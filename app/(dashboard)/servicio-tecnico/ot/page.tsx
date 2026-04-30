"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OtListado from "@/components/servicio-tecnico/ot-listado"

export default function OtListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "ordenes_trabajo")) router.replace("/")
  }, [canSee, router])

  return <OtListado />
}
