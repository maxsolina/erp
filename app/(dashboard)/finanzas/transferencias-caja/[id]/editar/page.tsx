"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciaCajaForm from "@/components/finanzas/transferencia-caja-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "transferencias_caja")) router.replace("/")
  }, [canSee, router])

  return <TransferenciaCajaForm initialId={id} />
}
