"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasFicha from "@/components/ventas/facturas-ficha"

export default function FacturasFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "facturas")) router.replace("/")
  }, [canSee, router])

  const facturaId = parseInt(id, 10)
  if (Number.isNaN(facturaId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/facturas" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <FacturasFicha facturaId={facturaId} />
}
