"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ValoresCajaListado from "@/components/contabilidad/valores-caja-listado"

export default function ValoresCajaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad")) router.replace("/")
  }, [canSee, router])
  return <ValoresCajaListado />
}
