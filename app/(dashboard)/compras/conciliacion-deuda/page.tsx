"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloCompras from "@/components/modulo-compras-v2"

export default function ConciliacionDeudaPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("compras", "conciliacion_deuda")) router.replace("/")
  }, [canSee, router])
  if (!canSee("compras", "conciliacion_deuda")) {
    return <div className="p-12 text-center text-gray-500">Sin permisos…</div>
  }
  return <ModuloCompras embedded forcedView="conciliacion_deuda" />
}
