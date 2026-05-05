"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { FormularioProducto, type FormProducto } from "@/components/modulo-productos"
import { useERP } from "@/contexts/erp-context"

export default function NuevoProductoPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("productos")) router.replace("/")
  }, [canSee, router])

  async function handleGuardar(form: FormProducto) {
    const { id: _ignored, ...payload } = form
    payload.historial_costos = payload.historial_costos ?? []
    if (payload.imagen_url?.startsWith("blob:")) payload.imagen_url = null

    // Vamos por el API (no Supabase directo) para que filtre el payload con
    // whitelist de columnas y registre el evento de creación en seguimiento.
    const res = await fetch("/api/productos", {
      method: "POST",
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
        <span className="text-gray-900 font-medium">Nuevo producto</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <FormularioProducto
          inicial={null}
          onGuardar={handleGuardar}
          onCancelar={() => router.push("/productos")}
        />
      </div>
    </div>
  )
}
