"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloContabilidad from "@/components/modulo-contabilidad"

// Monta inline ModuloContabilidad con la sub-vista forzada — la URL queda
// /contabilidad/X (clean) y no rebota al monolito /?module=contabilidad.
export default function ContabilidadRedirectStub({ view }: { view: string }) {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("contabilidad")) router.replace("/")
  }, [canSee, router])

  if (!canSee("contabilidad")) {
    return <div className="p-12 text-center text-gray-500">Sin permisos…</div>
  }

  return <ModuloContabilidad embedded forcedView={view} />
}
