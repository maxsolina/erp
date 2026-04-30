"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import ListaPreciosFormulario from "@/components/listas-precios/formulario"

export default function NuevaListaPreciosPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "listas_precios")) router.replace("/")
  }, [canSee, router])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <Link href="/listas-precios" className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Listas de Precios
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Nueva lista</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <ListaPreciosFormulario
          inicial={null}
          onCancelar={() => router.push("/listas-precios")}
          onGuardar={(creada) => router.push(`/listas-precios/${creada.id}`)}
        />
      </div>
    </div>
  )
}
