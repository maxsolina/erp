"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ServicioTecnicoDashboard from "@/components/servicio-tecnico/dashboard"

export default function ServicioTecnicoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("servicio_tecnico", "dashboard")) router.replace("/")
  }, [canSee, router])

  return <ServicioTecnicoDashboard />
}
