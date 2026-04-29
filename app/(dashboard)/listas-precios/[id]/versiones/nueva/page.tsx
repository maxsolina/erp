"use client"

import { useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import VersionFormulario from "@/components/listas-precios/version-formulario"

export default function NuevaVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "versiones_lista")) router.replace("/")
  }, [canSee, router])

  const listaId = parseInt(id, 10)
  if (Number.isNaN(listaId)) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">ID de lista inválido</p>
        <Link href="/listas-precios" className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
      </div>
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <Link href="/listas-precios" className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium">
          <ChevronLeft className="w-4 h-4" />
          Listas de Precios
        </Link>
        <span className="text-gray-400">/</span>
        <Link href={`/listas-precios/${listaId}`} className="text-indigo-700 hover:text-indigo-900 font-medium">
          #{listaId}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Nueva versión</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <VersionFormulario
          listaId={listaId}
          inicial={null}
          onCancelar={() => router.push(`/listas-precios/${listaId}`)}
          onGuardar={(creada) => router.push(`/listas-precios/${listaId}/versiones/${creada.id}`)}
        />
      </div>
    </div>
  )
}
