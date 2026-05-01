"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NotaCompraForm from "@/components/compras/nota-compra-form"

export default function NcCompraNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "nc_compra")) router.replace("/")
  }, [canSee, router])

  return <NotaCompraForm tipo="credito" />
}
