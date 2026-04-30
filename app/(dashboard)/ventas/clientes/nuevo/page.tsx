"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

export default function NuevoClientePage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "listado")) {
      router.replace("/")
      return
    }
    router.replace("/?module=ventas&view=listado")
  }, [canSee, router])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Ventas...</div>
}
