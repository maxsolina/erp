"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloVentas from "@/components/ventas-module"

export default function ConciliacionPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "conciliacion")) router.replace("/")
  }, [canSee, router])
  if (!canSee("ventas", "conciliacion")) {
    return <div className="p-12 text-center text-gray-500">Sin permisos…</div>
  }
  return <ModuloVentas embedded forcedView="conciliacion" />
}
