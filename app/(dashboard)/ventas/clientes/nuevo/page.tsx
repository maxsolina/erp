"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ClienteForm from "@/components/ventas/cliente-form"

export default function NuevoClientePage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "listado")) router.replace("/")
  }, [canSee, router])

  return <ClienteForm />
}
