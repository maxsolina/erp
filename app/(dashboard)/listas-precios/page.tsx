"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ListasPreciosListado from "@/components/listas-precios/listado"

export default function ListasPreciosPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "listas_precios")) router.replace("/")
  }, [canSee, router])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
        <span className="text-indigo-200">·</span>
        <span className="font-semibold">Listas de Precios</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <ListasPreciosListado />
      </div>
    </div>
  )
}
