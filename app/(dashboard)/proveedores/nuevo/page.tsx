"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import ProveedorFormulario from "@/components/proveedores/formulario"

export default function NuevoProveedorPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "proveedores")) router.replace("/")
  }, [canSee, router])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <Link href="/proveedores" className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Proveedores
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Nuevo proveedor</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <ProveedorFormulario
          inicial={null}
          onCancelar={() => router.push("/proveedores")}
          onGuardar={(creado) => router.push(`/proveedores/${creado.id}`)}
        />
      </div>
    </div>
  )
}
