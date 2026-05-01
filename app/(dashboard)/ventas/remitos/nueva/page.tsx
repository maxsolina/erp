"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import RemitoForm from "@/components/ventas/remito-form"

function RemitoNuevoInner() {
  const router = useRouter()
  const { canSee } = useERP()
  const params = useSearchParams()
  const oeIdRaw = params.get("oe_id")
  const oeId = oeIdRaw ? parseInt(oeIdRaw, 10) : undefined

  useEffect(() => {
    if (!canSee("ventas", "remitos")) router.replace("/")
  }, [canSee, router])

  return <RemitoForm prefillOeId={oeId && !Number.isNaN(oeId) ? oeId : undefined} />
}

export default function RemitoNuevoPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Cargando…</div>}>
      <RemitoNuevoInner />
    </Suspense>
  )
}
