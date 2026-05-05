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
    // Vamos por el API (no Supabase directo) — el endpoint enriquece `stock_real`
    // en vivo desde stock_unidades para productos con número de serie. Si vamos
    // por Supabase directo leemos la columna stale.
    fetch(`/api/productos/${idNum}`)
      .then(async r => {
        if (cancelado) return
        if (!r.ok) {
          if (r.status === 404) setError("Producto no encontrado")
          else setError(`HTTP ${r.status}`)
          setCargando(false)
          return
        }
        const data = await r.json()
        setProducto(data as Producto)
        setCargando(false)
      })
      .catch(err => {
        if (cancelado) return
        setError(err instanceof Error ? err.message : "Error cargando producto")
        setCargando(false)
      })
    return () => { cancelado = true }
  }, [id])

  async function handleGuardar(form: FormProducto) {
    const { id: productoId, ...payload } = form
    payload.historial_costos = payload.historial_costos ?? []
    if (payload.imagen_url?.startsWith("blob:")) payload.imagen_url = null
    if (!productoId) return

    // Vamos por el API (no Supabase directo) — filtra payload con whitelist
    // y mantiene la lógica de stock_real recomputado en vivo.
    const res = await fetch(`/api/productos/${productoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data?.error ?? `HTTP ${res.status}`)
      return
    }
    router.push("/productos")
  }

  return (
    <div className="flex flex-col h-full">
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
