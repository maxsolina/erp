"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturaForm from "@/components/ventas/factura-form"

export default function FacturaNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "facturas")) router.replace("/")
  }, [canSee, router])

  return <FacturaForm />
}
