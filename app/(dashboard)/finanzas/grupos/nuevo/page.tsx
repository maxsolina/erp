"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import GrupoForm from "@/components/finanzas/grupo-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "grupos")) router.replace("/")
  }, [canSee, router])

  return <GrupoForm />
}
