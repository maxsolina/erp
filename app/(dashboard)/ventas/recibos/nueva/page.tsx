"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ReciboForm from "@/components/ventas/recibo-form"

export default function ReciboNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "recibos")) router.replace("/")
  }, [canSee, router])

  return <ReciboForm />
}
