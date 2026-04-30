"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import VersionFormulario from "@/components/listas-precios/version-formulario"
import type { VersionListaPrecios } from "@/components/listas-precios/_shared"

export default function EditarVersionPage({ params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "versiones_lista")) router.replace("/")
  }, [canSee, router])

  const listaId = parseInt(id, 10)
  const versionId = parseInt(vid, 10)
  const [inicial, setInicial] = useState<VersionListaPrecios | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Number.isNaN(versionId)) { setError("ID inválido"); setCargando(false); return }
    let cancelado = false
    fetch(`/api/listas-precios/versiones?lista_id=${listaId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((data: VersionListaPrecios[]) => {
        if (cancelado) return
        const found = (data ?? []).find(v => v.id === versionId) ?? null
        if (!found) setError("Versión no encontrada")
        else setInicial(found)
        setCargando(false)
      })
      .catch(err => { if (!cancelado) { setError(err?.message ?? "Error"); setCargando(false) } })
    return () => { cancelado = true }
  }, [listaId, versionId])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <Link href={`/listas-precios/${listaId}`} className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium">
          <ChevronLeft className="w-4 h-4" />
          Lista #{listaId}
        </Link>
        <span className="text-gray-400">/</span>
        <Link href={`/listas-precios/${listaId}/versiones/${versionId}`} className="text-indigo-700 hover:text-indigo-900 font-medium">
          {inicial?.nombre ?? `Versión #${versionId}`}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Editar</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {cargando ? (
          <div className="text-center text-gray-500 py-12">Cargando...</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-3">{error}</p>
            <Link href={`/listas-precios/${listaId}`} className="text-indigo-700 hover:underline">Volver a la lista</Link>
          </div>
        ) : inicial && (
          <VersionFormulario
            listaId={listaId}
            inicial={inicial}
            onCancelar={() => router.push(`/listas-precios/${listaId}/versiones/${versionId}`)}
            onGuardar={() => router.push(`/listas-precios/${listaId}/versiones/${versionId}`)}
          />
        )}
      </div>
    </div>
  )
}
