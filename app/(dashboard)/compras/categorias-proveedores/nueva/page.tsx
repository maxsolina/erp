"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CategoriaProveedorForm from "@/components/compras/categoria-proveedor-form"

export default function CategoriaProveedorNuevaPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "cat_proveedores")) router.replace("/")
  }, [canSee, router])

  return <CategoriaProveedorForm />
}
