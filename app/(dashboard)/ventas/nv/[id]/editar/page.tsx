"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NvForm from "@/components/ventas/nv-form"

export default function NvEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_venta")) router.replace("/")
  }, [canSee, router])

  const nvId = parseInt(id, 10)
  if (Number.isNaN(nvId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/nv" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return <NvForm initialId={nvId} />
}
