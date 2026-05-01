"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloFinanzas from "@/components/modulo-finanzas"

// Monta inline ModuloFinanzas con la sub-vista forzada — la URL queda /finanzas/X
// (clean) y no rebota al monolito /?module=finanzas.
export default function FinanzasRedirectStub({ view, permKey }: { view: string; permKey: string }) {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("finanzas", permKey)) router.replace("/")
  }, [canSee, permKey, router])

  if (!canSee("finanzas", permKey)) {
    return <div className="p-12 text-center text-gray-500">Sin permisos…</div>
  }

  return <ModuloFinanzas embedded forcedView={view} />
}
