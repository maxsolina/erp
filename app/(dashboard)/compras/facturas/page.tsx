"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasListado from "@/components/compras/facturas-listado"

export default function FacturasComprasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("compras", "facturas_compra")) router.replace("/") }, [canSee, router])
  return (
    <FacturasListado
      apiUrl="/api/compras/facturas"
      title="Facturas de Compra"
      newHref="/compras/facturas/nueva"
      fichaBaseHref="/compras/facturas"
      moduleName="compras_facturas"
    />
  )
}
