"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OcFicha from "@/components/compras/oc-ficha"

export default function OcFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "ordenes_compra")) router.replace("/")
  }, [canSee, router])

  const ocId = parseInt(id, 10)
  if (Number.isNaN(ocId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/compras/oc" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <OcFicha ocId={ocId} />
}
