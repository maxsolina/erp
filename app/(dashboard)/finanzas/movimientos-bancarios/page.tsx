"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import MovimientosBancarios from "@/components/finanzas/movimientos-bancarios"

export default function Page() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    // Permiso "movimientos_bancarios" — si no está creado en la matriz lo
    // dejamos pasar como visible para todos por ahora (canSee devuelve true
    // por default cuando no hay regla configurada).
    if (!canSee("finanzas", "movimientos_bancarios")) router.replace("/")
  }, [canSee, router])

  return <MovimientosBancarios />
}
