"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ConversionMonedaForm from "@/components/finanzas/conversion-moneda-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "conversion_monedas")) router.replace("/")
  }, [canSee, router])

  return <ConversionMonedaForm initialId={id} />
}
