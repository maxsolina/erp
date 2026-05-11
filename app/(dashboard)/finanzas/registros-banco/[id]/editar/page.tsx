"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RegistroBancoForm from "@/components/finanzas/registro-banco-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "registros_banco")) router.replace("/")
  }, [canSee, router])

  return <RegistroBancoForm initialId={id} />
}
