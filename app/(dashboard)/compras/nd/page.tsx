"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasListado from "@/components/compras/facturas-listado"

export default function NdComprasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("compras", "nd_compra")) router.replace("/") }, [canSee, router])
  return (
    <FacturasListado
      apiUrl="/api/compras/notas-debito"
      title="Notas de Débito (Compras)"
      newHref="/?module=compras&view=nd_compra"
      fichaBaseHref="/compras/nd"
      moduleName="compras_nd"
    />
  )
}
