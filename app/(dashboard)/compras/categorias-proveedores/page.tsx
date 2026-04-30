"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

export default function CategoriasProveedoresPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("compras", "cat_proveedores")) {
      router.replace("/")
      return
    }
    router.replace("/?module=compras&view=cat_proveedores")
  }, [canSee, router])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Compras...</div>
}
