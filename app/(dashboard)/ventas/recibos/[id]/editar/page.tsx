"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ReciboForm from "@/components/ventas/recibo-form"

export default function ReciboEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "recibos")) router.replace("/")
  }, [canSee, router])

  if (!id) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/recibos" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return <ReciboForm initialId={id} />
}
