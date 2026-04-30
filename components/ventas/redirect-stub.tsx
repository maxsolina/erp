"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"

// Stub que redirige a la vista correspondiente del monolito Ventas.
// Útil para rutas top-level de Ventas que aún no tienen extracción completa
// (mantiene la URL "limpia" como punto de entrada).
export default function VentasRedirectStub({
  view,
  permKey,
}: {
  view: string
  permKey: string
}) {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", permKey)) {
      router.replace("/")
      return
    }
    router.replace(`/?module=ventas&view=${view}`)
  }, [canSee, permKey, router, view])
  return <div className="p-12 text-center text-gray-500">Redirigiendo al módulo Ventas...</div>
}
