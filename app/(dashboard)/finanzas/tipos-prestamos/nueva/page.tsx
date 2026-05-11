"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TipoPrestamoForm from "@/components/finanzas/tipo-prestamo-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "tipos_prestamos")) router.replace("/")
  }, [canSee, router])

  return <TipoPrestamoForm />
}
