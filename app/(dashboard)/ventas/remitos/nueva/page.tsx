"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RemitoForm from "@/components/ventas/remito-form"

export default function RemitoNuevoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "remitos")) router.replace("/")
  }, [canSee, router])

  return <RemitoForm />
}
