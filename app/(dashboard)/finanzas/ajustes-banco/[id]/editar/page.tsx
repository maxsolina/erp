"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjusteBancoForm from "@/components/finanzas/ajuste-banco-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "ajustes_banco")) router.replace("/")
  }, [canSee, router])

  return <AjusteBancoForm initialId={id} />
}
