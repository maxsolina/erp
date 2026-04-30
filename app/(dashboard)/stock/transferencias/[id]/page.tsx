"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TransferenciaFicha from "@/components/stock/transferencias-ficha"

export default function TransferenciaFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "transferencias")) router.replace("/")
  }, [canSee, router])

  const transferenciaId = parseInt(id, 10)
  if (Number.isNaN(transferenciaId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/stock/transferencias" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <TransferenciaFicha transferenciaId={transferenciaId} />
}
