"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

export default function ConciliacionPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "conciliacion")) {
      router.replace("/")
      return
    }
    router.replace("/?module=ventas&view=conciliacion")
  }, [canSee, router])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Ventas...</div>
}
