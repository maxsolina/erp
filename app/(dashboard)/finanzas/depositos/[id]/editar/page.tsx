"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import DepositoForm from "@/components/finanzas/deposito-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "depositos")) router.replace("/")
  }, [canSee, router])

  return <DepositoForm initialId={id} />
}
