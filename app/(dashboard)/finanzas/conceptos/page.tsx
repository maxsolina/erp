"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConceptosListado from "@/components/finanzas/conceptos-listado"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "conceptos")) router.replace("/")
  }, [canSee, router])

  return <ConceptosListado />
}
