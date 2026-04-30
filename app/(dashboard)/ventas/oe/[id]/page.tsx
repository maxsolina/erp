"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OeFicha from "@/components/ventas/oe-ficha"

export default function OeFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "ordenes_entrega")) router.replace("/")
  }, [canSee, router])

  const oeId = parseInt(id, 10)
  if (Number.isNaN(oeId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/oe" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <OeFicha oeId={oeId} />
}
