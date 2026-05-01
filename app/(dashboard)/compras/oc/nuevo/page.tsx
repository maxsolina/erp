"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OcForm from "@/components/compras/oc-form"

export default function OcNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "ordenes_compra")) router.replace("/")
  }, [canSee, router])

  return <OcForm />
}
