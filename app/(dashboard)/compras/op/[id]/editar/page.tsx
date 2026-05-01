"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import OpForm from "@/components/compras/op-form"

export default function OpEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "ordenes_pago")) router.replace("/")
  }, [canSee, router])

  const opId = parseInt(id, 10)
  if (Number.isNaN(opId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/compras/op" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return <OpForm initialId={opId} />
}
