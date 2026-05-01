"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OeForm from "@/components/ventas/oe-form"

export default function OeNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "ordenes_entrega")) router.replace("/")
  }, [canSee, router])

  return <OeForm />
}
