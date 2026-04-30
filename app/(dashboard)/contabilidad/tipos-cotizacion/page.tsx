"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TiposCotizacionListado from "@/components/contabilidad/tipos-cotizacion-listado"

export default function TiposCotizacionPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("contabilidad", "tipos_cotizacion")) router.replace("/")
  }, [canSee, router])
  return <TiposCotizacionListado />
}
