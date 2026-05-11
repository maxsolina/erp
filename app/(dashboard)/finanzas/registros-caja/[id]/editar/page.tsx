"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RegistroCajaForm from "@/components/finanzas/registro-caja-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "registros_caja")) router.replace("/")
  }, [canSee, router])

  return <RegistroCajaForm initialId={id} />
}
