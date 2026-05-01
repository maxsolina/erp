"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ReciboForm from "@/components/ventas/recibo-form"

function ReciboNuevoInner() {
  const router = useRouter()
  const { canSee } = useERP()
  const params = useSearchParams()
  const facturaIdRaw = params.get("factura_id")
  const facturaId = facturaIdRaw ? parseInt(facturaIdRaw, 10) : undefined

  useEffect(() => {
    if (!canSee("ventas", "recibos")) router.replace("/")
  }, [canSee, router])

  return <ReciboForm prefillFacturaId={facturaId && !Number.isNaN(facturaId) ? facturaId : undefined} />
}

export default function ReciboNuevoPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Cargando…</div>}>
      <ReciboNuevoInner />
    </Suspense>
  )
}
