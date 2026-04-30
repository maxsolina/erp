"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RecepcionFicha from "@/components/compras/recepciones-ficha"

export default function RecepcionFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "recepciones")) router.replace("/")
  }, [canSee, router])

  const recId = parseInt(id, 10)
  if (Number.isNaN(recId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/compras/recepciones" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <RecepcionFicha recId={recId} />
}
