"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import PrestamoForm from "@/components/finanzas/prestamo-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "prestamos")) router.replace("/")
  }, [canSee, router])

  return <PrestamoForm initialId={id} />
}
