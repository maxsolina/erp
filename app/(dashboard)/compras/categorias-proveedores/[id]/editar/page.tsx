"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CategoriaProveedorForm from "@/components/compras/categoria-proveedor-form"

export default function CategoriaProveedorEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "cat_proveedores")) router.replace("/")
  }, [canSee, router])

  const catId = parseInt(id, 10)
  if (Number.isNaN(catId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID inválido</p>
        <Link href="/compras/categorias-proveedores" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return <CategoriaProveedorForm initialId={catId} />
}
