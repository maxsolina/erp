"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"

const CUENTAS: { key: keyof Form; label: string; placeholder?: string }[] = [
  { key: "cuenta_prestamo", label: "Cuenta Préstamo", placeholder: "ej: 21010705 Préstamo SGR" },
  { key: "cuenta_intereses", label: "Cuenta de Intereses", placeholder: "ej: 62010103 Intereses Préstamos Bancarios Recibidos" },
  { key: "cuenta_intereses_devengar", label: "Cuenta de Intereses a Devengar", placeholder: "ej: 11040403 Intereses Bancarios a Devengar" },
  { key: "cuenta_iva_devengar", label: "Cuenta de IVA a Devengar", placeholder: "ej: 11040101 I.V.A. Crédito Fiscal" },
  { key: "cuenta_percepciones_devengar", label: "Cuenta de Percepciones a Devengar", placeholder: "ej: 11040102 I.V.A. Percepciones" },
  { key: "cuenta_refinanciacion", label: "Cuenta para Saldos Cancelados / Refinanciación", placeholder: "ej: 99999998 Cuenta Puente para Movimientos Bancarios" },
  { key: "cuenta_preexistente", label: "Cuenta para Préstamos Preexistentes", placeholder: "ej: 21010704 Préstamos Bancarios" },
  { key: "concepto_liquidacion", label: "Concepto por Defecto en Liquidación" },
]

type Form = {
  nombre: string
  cuenta_prestamo: string
  cuenta_intereses: string
  cuenta_intereses_devengar: string
  cuenta_iva_devengar: string
  cuenta_percepciones_devengar: string
  cuenta_refinanciacion: string
  cuenta_preexistente: string
  concepto_liquidacion: string
  activo: boolean
}

const empty: Form = {
  nombre: "",
  cuenta_prestamo: "",
  cuenta_intereses: "",
  cuenta_intereses_devengar: "",
  cuenta_iva_devengar: "",
  cuenta_percepciones_devengar: "",
  cuenta_refinanciacion: "",
  cuenta_preexistente: "",
  concepto_liquidacion: "",
  activo: true,
}

export default function TipoPrestamoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/tipos-prestamo/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: any) => {
        setForm({
          ...empty,
          nombre: data.nombre ?? "",
          cuenta_prestamo: data.cuenta_prestamo ?? "",
          cuenta_intereses: data.cuenta_intereses ?? "",
          cuenta_intereses_devengar: data.cuenta_intereses_devengar ?? "",
          cuenta_iva_devengar: data.cuenta_iva_devengar ?? "",
          cuenta_percepciones_devengar: data.cuenta_percepciones_devengar ?? "",
          cuenta_refinanciacion: data.cuenta_refinanciacion ?? "",
          cuenta_preexistente: data.cuenta_preexistente ?? "",
          concepto_liquidacion: data.concepto_liquidacion ?? "",
          activo: data.activo ?? true,
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Tipo de préstamo no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/tipos-prestamo/${initialId}` : "/api/tipos-prestamo",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      )
      if (!res.ok) {
        const body = await res.text()
        setError(`Error: ${body}`)
        setGuardando(false)
        return
      }
      router.push("/finanzas/tipos-prestamos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/tipos-prestamos")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-amber-900">
            {isEdit ? "Editar Tipo de Préstamo" : "Nuevo Tipo de Préstamo"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
            <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
          <input value={form.nombre} onChange={e => set("nombre", e.target.value)} autoFocus
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="ej: SGR, Bancario" />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Cuentas Contables</p>
          <div className="space-y-3">
            {CUENTAS.map(c => (
              <div key={c.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{c.label}</label>
                <input
                  value={form[c.key] as string}
                  onChange={e => set(c.key, e.target.value as Form[typeof c.key])}
                  placeholder={c.placeholder}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t">
          <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Activo</span>
        </label>
      </div>
    </div>
  )
}
