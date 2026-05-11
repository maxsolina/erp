"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import PrestamoForm from "@/components/finanzas/prestamo-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "prestamos")) router.replace("/")
  }, [canSee, router])

  return <PrestamoForm />
}
