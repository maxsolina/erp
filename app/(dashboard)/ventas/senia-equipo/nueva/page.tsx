"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import SeniaForm from "@/components/ventas/senia-form"

export default function SeniaNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "senias_equipo")) router.replace("/")
  }, [canSee, router])

  return <SeniaForm />
}
