"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

// La creación de OC tiene un formulario complejo que sigue en el monolito.
// Esta ruta redirige al monolito Compras para mantener la URL "limpia".
export default function NuevaOcPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "ordenes_compra")) {
      router.replace("/")
      return
    }
    router.replace("/?module=compras&view=ordenes_compra")
  }, [canSee, router])

  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Compras...</div>
}
