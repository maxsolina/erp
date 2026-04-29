"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { ChevronLeft } from "lucide-react"
import { FormularioProducto, type FormProducto, type Producto } from "@/components/modulo-productos"
import { useERP } from "@/contexts/erp-context"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("productos")) router.replace("/")
  }, [canSee, router])

  const [producto, setProducto] = useState<Producto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    const idNum = parseInt(id, 10)
    if (Number.isNaN(idNum)) {
      setError("ID inválido")
      setCargando(false)
      return
    }
    supabase
      .from("productos")
      .select("*")
      .eq("id", idNum)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelado) return
        if (err) setError(err.message)
        else if (!data) setError("Producto no encontrado")
        else setProducto(data as Producto)
        setCargando(false)
      })
    return () => { cancelado = true }
  }, [id])

  async function handleGuardar(form: FormProducto) {
    const { id: productoId, ...payload } = form
    payload.historial_costos = payload.historial_costos ?? []
    if (payload.imagen_url?.startsWith("blob:")) payload.imagen_url = null
    if (!productoId) return

    const { error: err } = await supabase
      .from("productos")
      .update(payload)
      .eq("id", productoId)
    if (err) {
      alert(err.message)
      return
    }
    router.push("/productos")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mini-topbar */}
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors">← Volver al ERP</Link>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <Link
          href="/productos"
          className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Productos
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">
          {cargando ? "Cargando..." : producto?.nombre ?? "Producto"}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando producto...</div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-red-600 text-sm">{error}</p>
            <Link href="/productos" className="text-sm text-indigo-700 hover:text-indigo-900 hover:underline">Volver a productos</Link>
          </div>
        ) : producto && (
          <FormularioProducto
            inicial={producto}
            onGuardar={handleGuardar}
            onCancelar={() => router.push("/productos")}
          />
        )}
      </div>
    </div>
  )
}
