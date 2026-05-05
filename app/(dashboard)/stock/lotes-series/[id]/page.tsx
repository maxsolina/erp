"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ImeiFicha from "@/components/stock/imei-ficha"

export default function ImeiFichaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "lotes_series")) router.replace("/")
  }, [canSee, router])

  const unidadId = Number(id)
  if (!Number.isFinite(unidadId) || unidadId <= 0) {
    return <div className="p-12 text-center text-red-600">ID de unidad inválido</div>
  }
  return <ImeiFicha unidadId={unidadId} />
}
