"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturaCompraForm from "@/components/compras/factura-compra-form"

export default function FacturaCompraNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "facturas_compra")) router.replace("/")
  }, [canSee, router])

  return <FacturaCompraForm />
}
