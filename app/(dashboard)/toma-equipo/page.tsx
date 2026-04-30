"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import TomaEquipoListado from "@/components/toma-equipo/listado"

export default function TomaEquipoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "toma_equipo")) router.replace("/")
  }, [canSee, router])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
        <span className="text-indigo-200">·</span>
        <span className="font-semibold">Toma de Equipo</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <TomaEquipoListado />
      </div>
    </div>
  )
}
