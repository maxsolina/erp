"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NotaCompraForm from "@/components/compras/nota-compra-form"

export default function NdCompraNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "nd_compra")) router.replace("/")
  }, [canSee, router])

  return <NotaCompraForm tipo="debito" />
}
