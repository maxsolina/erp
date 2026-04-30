"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { FormSucursal, FORM_SUCURSAL_VACIO } from "@/components/modulo-config-sucursales"

export default function NuevaSucursalPage() {
  const router = useRouter()
  const { canSee, setSucursales } = useERP()

  useEffect(() => {
    if (!canSee("configuracion", "sucursales")) router.replace("/")
  }, [canSee, router])

  const [depositos, setDepositos] = useState<{ id: number; nombre: string }[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/depositos")
      .then(r => r.ok ? r.json() : [])
      .then(d => setDepositos(Array.isArray(d) ? d : []))
      .catch(() => setDepositos([]))
  }, [])

  const handleGuardar = async (form: typeof FORM_SUCURSAL_VACIO) => {
    if (!form.codigo.trim() || !form.nombre.trim()) { setError("Código y nombre son obligatorios"); return }
    setError(null)
    setGuardando(true)
    try {
      const payload = { ...form, deposito_id: form.deposito_id === "" ? null : form.deposito_id }
      const res = await fetch("/api/sucursales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const created = await res.json()
      setSucursales(prev => [created, ...prev])
      router.push("/sucursales")
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar")
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <Link
          href="/sucursales"
          className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Sucursales
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Nueva sucursal</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">
          <FormSucursal
            initial={FORM_SUCURSAL_VACIO}
            depositos={depositos}
            onGuardar={handleGuardar}
            onCancelar={() => router.push("/sucursales")}
            guardando={guardando}
            error={error}
          />
        </div>
      </div>
    </div>
  )
}
