"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ModuloInformes from "@/components/modulo-informes"

export default function InformesPage() {
  const router = useRouter()
  const { canSee } = useERP()
  useEffect(() => {
    if (!canSee("reportes")) router.replace("/")
  }, [canSee, router])
  // El padding lo provee app/(dashboard)/informes/layout.tsx vía ModuleSidebar
  return <ModuloInformes />
}
