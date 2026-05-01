"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloCompras from "@/components/modulo-compras-v2"

export default function LegajosPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("compras", "legajos_importacion")) router.replace("/")
  }, [canSee, router])
  if (!canSee("compras", "legajos_importacion")) {
    return <div className="p-12 text-center text-gray-500">Sin permisos…</div>
  }
  return <ModuloCompras embedded forcedView="legajos_importacion" />
}
