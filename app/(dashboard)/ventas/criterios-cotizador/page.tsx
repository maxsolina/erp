"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import CriteriosCotizador from "@/components/criterios-cotizador"

// Criterios para Cotizador es un componente complejo con su propio estado
// (drag-drop reorder, modales de edición, etc) ya autocontenido en
// components/criterios-cotizador.tsx. Mismo patrón que /informes (PR 18):
// montamos el componente directamente.
export default function CriteriosCotizadorPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "criterios_cotizador")) router.replace("/")
  }, [canSee, router])

  return <CriteriosCotizador />
}
