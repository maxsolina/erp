"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NegociacionChequesForm from "@/components/finanzas/negociacion-cheques-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "negociacion_cheques")) router.replace("/")
  }, [canSee, router])

  return <NegociacionChequesForm initialId={id} />
}
