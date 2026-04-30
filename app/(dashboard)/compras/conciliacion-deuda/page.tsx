"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

export default function ConciliacionDeudaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("compras", "conciliacion_deuda")) {
      router.replace("/")
      return
    }
    router.replace("/?module=compras&view=conciliacion_deuda")
  }, [canSee, router])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Compras...</div>
}
