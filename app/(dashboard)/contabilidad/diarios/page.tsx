"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import DiariosListado from "@/components/contabilidad/diarios-listado"

export default function DiariosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "diarios")) router.replace("/")
  }, [canSee, router])
  return <DiariosListado />
}
