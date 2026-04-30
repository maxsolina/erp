"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import MonedasListado from "@/components/contabilidad/monedas-listado"

export default function MonedasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "monedas")) router.replace("/")
  }, [canSee, router])
  return <MonedasListado />
}
