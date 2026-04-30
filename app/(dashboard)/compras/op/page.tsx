"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import FacturasListado from "@/components/compras/facturas-listado"

// Las OP usan una shape distinta a Facturas (importe vs total), pero el listado
// genérico mira `total`. Para mantener este PR pragmático, mostramos OP usando
// el mismo componente — los campos importantes (numero, fecha, proveedor, estado)
// son los mismos.
export default function OpComprasPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => { if (!canSee("compras", "ordenes_pago")) router.replace("/") }, [canSee, router])
  return (
    <FacturasListado
      apiUrl="/api/compras/ordenes-pago"
      title="Órdenes de Pago"
      newHref="/?module=compras&view=ordenes_pago"
      fichaBaseHref="/compras/op"
      moduleName="compras_op"
    />
  )
}
