"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NvForm from "@/components/ventas/nv-form"

export default function NvNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_venta")) router.replace("/")
  }, [canSee, router])

  return <NvForm />
}
