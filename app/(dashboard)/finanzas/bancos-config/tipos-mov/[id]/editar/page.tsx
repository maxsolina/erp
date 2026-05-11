"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TipoMovimientoBancarioForm from "@/components/finanzas/tipo-movimiento-bancario-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "bancos_config")) router.replace("/")
  }, [canSee, router])

  return <TipoMovimientoBancarioForm initialId={id} />
}
