"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import ProveedorFormulario, { proveedorAForm, type ProveedorForm } from "@/components/proveedores/formulario"
import { fetchProveedores } from "@/lib/compras-actions"

export default function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("compras", "proveedores")) router.replace("/")
  }, [canSee, router])

  const proveedorId = parseInt(id, 10)
  const [inicial, setInicial] = useState<ProveedorForm | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (Number.isNaN(proveedorId)) {
      setError("ID inválido")
      setCargando(false)
      return
    }
    let cancelado = false
    fetchProveedores()
      .then(list => {
        if (cancelado) return
        const p = list.find((x: any) => x.id === proveedorId)
        if (!p) {
          setError("Proveedor no encontrado")
        } else {
          setInicial(proveedorAForm(p))
        }
        setCargando(false)
      })
      .catch(err => {
        if (cancelado) return
        setError(err?.message ?? "Error al cargar")
        setCargando(false)
      })
    return () => { cancelado = true }
  }, [proveedorId])

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
        <Link href={`/proveedores/${proveedorId}`} className="text-indigo-700 hover:text-indigo-900 font-medium transition-colors">
          {inicial?.nombre ?? `#${proveedorId}`}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Editar</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {cargando ? (
          <div className="text-center text-gray-500 py-12">Cargando proveedor...</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-3">{error}</p>
            <Link href="/proveedores" className="text-indigo-700 hover:underline">Volver a proveedores</Link>
          </div>
        ) : inicial && (
          <ProveedorFormulario
            inicial={inicial}
            onCancelar={() => router.push(`/proveedores/${proveedorId}`)}
            onGuardar={() => router.push(`/proveedores/${proveedorId}`)}
          />
        )}
      </div>
    </div>
  )
}
