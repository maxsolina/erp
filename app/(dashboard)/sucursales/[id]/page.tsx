"use client"

import { useEffect, useMemo, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Users } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { FormSucursal, FORM_SUCURSAL_VACIO, PanelUsuarios } from "@/components/modulo-config-sucursales"

export default function EditarSucursalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { canSee, sucursales, setSucursales } = useERP()

  useEffect(() => {
    if (!canSee("configuracion", "sucursales")) router.replace("/")
  }, [canSee, router])

  const sucursal = useMemo(
    () => sucursales.find(s => String(s.id) === id) ?? null,
    [sucursales, id],
  )

  const [depositos, setDepositos] = useState<{ id: number; nombre: string }[]>([])
  const [verUsuarios, setVerUsuarios] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/depositos")
      .then(r => r.ok ? r.json() : [])
      .then(d => setDepositos(Array.isArray(d) ? d : []))
      .catch(() => setDepositos([]))
  }, [])

  const handleGuardar = async (form: typeof FORM_SUCURSAL_VACIO) => {
    if (!sucursal) return
    if (!form.codigo.trim() || !form.nombre.trim()) { setError("Código y nombre son obligatorios"); return }
    setError(null)
    setGuardando(true)
    try {
      const payload = { ...form, deposito_id: form.deposito_id === "" ? null : form.deposito_id }
      const res = await fetch(`/api/sucursales/${sucursal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const updated = await res.json()
      setSucursales(prev => prev.map(s => s.id === sucursal.id ? updated : s))
      router.push("/sucursales")
    } catch (e: any) {
      setError(e?.message ?? "Error al guardar")
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white text-sm">
        <div className="flex items-center gap-2">
          <Link
            href="/sucursales"
            className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Sucursales
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">{sucursal?.nombre ?? "Sucursal"}</span>
        </div>
        {sucursal && (
          <button
            onClick={() => setVerUsuarios(true)}
            className="flex items-center gap-1.5 text-sm text-indigo-700 hover:text-indigo-900 font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            Usuarios asignados
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">
          {!sucursal ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-3">Sucursal no encontrada.</p>
              <Link href="/sucursales" className="text-indigo-700 hover:text-indigo-900 hover:underline">
                Volver a sucursales
              </Link>
            </div>
          ) : (
            <FormSucursal
              initial={{
                codigo: sucursal.codigo,
                nombre: sucursal.nombre,
                direccion: sucursal.direccion ?? "",
                telefono: sucursal.telefono ?? "",
                deposito_id: sucursal.deposito_id ?? "",
                activa: sucursal.activa,
              }}
              depositos={depositos}
              onGuardar={handleGuardar}
              onCancelar={() => router.push("/sucursales")}
              guardando={guardando}
              error={error}
            />
          )}
        </div>
      </div>

      {sucursal && verUsuarios && (
        <PanelUsuarios sucursal={sucursal} onClose={() => setVerUsuarios(false)} />
      )}
    </div>
  )
}
