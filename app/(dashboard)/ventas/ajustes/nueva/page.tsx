"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjusteForm from "@/components/ventas/ajuste-form"

export default function AjusteNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "ajustes")) router.replace("/")
  }, [canSee, router])

  return <AjusteForm tipo="ajuste" />
}
