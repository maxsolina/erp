"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RecepcionesListado from "@/components/compras/recepciones-listado"

export default function RecepcionesListadoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "recepciones")) router.replace("/")
  }, [canSee, router])

  return <RecepcionesListado />
}
