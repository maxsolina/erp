"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OpForm from "@/components/compras/op-form"

export default function OpNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "ordenes_pago")) router.replace("/")
  }, [canSee, router])

  return <OpForm />
}
