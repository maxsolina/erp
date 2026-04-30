"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AnosFiscalesListado from "@/components/contabilidad/anos-fiscales-listado"

export default function AnosFiscalesPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "anos_fiscales")) router.replace("/")
  }, [canSee, router])
  return <AnosFiscalesListado />
}
