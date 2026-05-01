"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import NcCategoriaForm from "@/components/ventas/nc-categoria-form"

export default function NcCategoriaEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "nc_categorias")) router.replace("/")
  }, [canSee, router])

  const catId = parseInt(id, 10)
  if (Number.isNaN(catId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/nc-categorias" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }
  return <NcCategoriaForm initialId={catId} />
}
