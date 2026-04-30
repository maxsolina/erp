"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import AjustesFicha from "@/components/ventas/ajustes-ficha"

export default function NcFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "notas_credito")) router.replace("/")
  }, [canSee, router])

  const ajusteId = parseInt(id, 10)
  if (Number.isNaN(ajusteId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/ventas/nc" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <AjustesFicha ajusteId={ajusteId} backHref="/ventas/nc" view="notas_credito" />
}
