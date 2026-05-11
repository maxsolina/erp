"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CuentaBancariaForm from "@/components/finanzas/cuenta-bancaria-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "bancos_config")) router.replace("/")
  }, [canSee, router])

  return <CuentaBancariaForm initialId={id} />
}
