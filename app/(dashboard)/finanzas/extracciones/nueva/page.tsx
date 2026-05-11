"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ExtraccionForm from "@/components/finanzas/extraccion-form"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "extracciones")) router.replace("/")
  }, [canSee, router])

  return <ExtraccionForm />
}
