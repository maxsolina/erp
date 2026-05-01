"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloVentas from "@/components/ventas-module"

export default function NuevoClientePage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("ventas", "listado")) router.replace("/")
  }, [canSee, router])
  if (!canSee("ventas", "listado")) {
    return <div className="p-12 text-center text-gray-500">Sin permisos…</div>
  }
  // El form de cliente nuevo sigue en el monolito Ventas; lo montamos inline.
  return <ModuloVentas embedded forcedView="listado" />
}
