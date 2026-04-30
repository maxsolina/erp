"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RemitosFicha from "@/components/ventas/remitos-ficha"

export default function RemitosFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "remitos")) router.replace("/")
  }, [canSee, router])

  const remitoId = parseInt(id, 10)
  if (Number.isNaN(remitoId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/remitos" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <RemitosFicha remitoId={remitoId} />
}
