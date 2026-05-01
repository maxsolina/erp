"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasListado from "@/components/compras/facturas-listado"

export default function NcComprasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("compras", "nc_compra")) router.replace("/") }, [canSee, router])
  return (
    <FacturasListado
      apiUrl="/api/compras/notas-credito"
      title="Notas de Crédito (Compras)"
      newHref="/compras/nc/nueva"
      fichaBaseHref="/compras/nc"
      moduleName="compras_nc"
    />
  )
}
