"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciaFormulario from "@/components/stock/transferencias-formulario"

export default function NuevaTransferenciaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "transferencias")) router.replace("/")
  }, [canSee, router])

  return (
    <TransferenciaFormulario
      onCancelar={() => router.push("/stock/transferencias")}
      onCreada={id => router.push(`/stock/transferencias/${id}`)}
    />
  )
}
