"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturaCompraForm from "@/components/compras/factura-compra-form"

export default function FacturaCompraEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "facturas_compra")) router.replace("/")
  }, [canSee, router])

  const facId = parseInt(id, 10)
  if (Number.isNaN(facId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/compras/facturas" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return <FacturaCompraForm initialId={facId} />
}
