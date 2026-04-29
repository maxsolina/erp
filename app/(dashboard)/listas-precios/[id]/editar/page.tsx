"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import ListaPreciosFormulario from "@/components/listas-precios/formulario"
import type { ListaPrecios } from "@/components/listas-precios/_shared"

export default function EditarListaPreciosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("ventas", "listas_precios")) router.replace("/")
  }, [canSee, router])

  const listaId = parseInt(id, 10)
  const [inicial, setInicial] = useState<ListaPrecios | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Number.isNaN(listaId)) {
      setError("ID inválido")
      setCargando(false)
      return
    }
    let cancelado = false
    fetch("/api/listas-precios")
      .then(r => r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)))
      .then((data: ListaPrecios[]) => {
        if (cancelado) return
        const found = (data ?? []).find(l => l.id === listaId) ?? null
        if (!found) setError("Lista no encontrada")
        else setInicial(found)
        setCargando(false)
      })
      .catch(err => { if (!cancelado) { setError(err?.message ?? "Error"); setCargando(false) } })
    return () => { cancelado = true }
  }, [listaId])

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
          {inicial?.nombre ?? `#${listaId}`}
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
            <Link href="/listas-precios" className="text-indigo-700 hover:underline">Volver</Link>
          </div>
        ) : inicial && (
          <ListaPreciosFormulario
            inicial={inicial}
            onCancelar={() => router.push(`/listas-precios/${listaId}`)}
            onGuardar={() => router.push(`/listas-precios/${listaId}`)}
          />
        )}
      </div>
    </div>
  )
}
