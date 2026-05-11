"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TipoPrestamoForm from "@/components/finanzas/tipo-prestamo-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "tipos_prestamos")) router.replace("/")
  }, [canSee, router])

  return <TipoPrestamoForm initialId={id} />
}
