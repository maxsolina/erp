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
  return (
    <div className="p-6">
      <ModuloInformes />
    </div>
  )
}
