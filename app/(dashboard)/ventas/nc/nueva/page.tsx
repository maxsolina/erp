"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjusteForm from "@/components/ventas/ajuste-form"

export default function NcNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_credito")) router.replace("/")
  }, [canSee, router])

  return <AjusteForm tipo="nota_credito" />
}
