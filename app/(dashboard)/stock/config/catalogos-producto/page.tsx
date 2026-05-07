"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CatalogosProductoListado from "@/components/stock/catalogos-producto-listado"

export default function CatalogosProductoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    // Reusa el permiso de productos: si el usuario puede ver productos,
    // también puede gestionar las categorías/marcas/colores que usan.
    if (!canSee("stock", "productos")) router.replace("/")
  }, [canSee, router])

  return <CatalogosProductoListado />
}
