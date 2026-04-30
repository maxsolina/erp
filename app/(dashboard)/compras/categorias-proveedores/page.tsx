"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CategoriasProveedorListado from "@/components/compras/categorias-proveedor-listado"

export default function CategoriasProveedoresPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "cat_proveedores")) router.replace("/")
  }, [canSee, router])

  return <CategoriasProveedorListado />
}
