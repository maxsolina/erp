"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import ProveedoresListado from "@/components/proveedores/listado"

export default function ProveedoresListPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "proveedores")) router.replace("/")
  }, [canSee, router])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Mini-topbar */}
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
        <span className="text-indigo-200">·</span>
        <span className="font-semibold">Proveedores</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <ProveedoresListado />
      </div>
    </div>
  )
}
