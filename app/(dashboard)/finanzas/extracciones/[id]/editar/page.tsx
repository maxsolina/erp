"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ExtraccionForm from "@/components/finanzas/extraccion-form"

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", "extracciones")) router.replace("/")
  }, [canSee, router])

  return <ExtraccionForm initialId={id} />
}
