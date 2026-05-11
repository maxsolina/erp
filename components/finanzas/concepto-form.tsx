"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"

const VISIBILITY_FLAGS = [
  { key: "visible_en_ajuste_cajas", label: "Ajuste de Cajas" },
  { key: "visible_en_ajuste_banco", label: "Ajuste de Banco" },
  { key: "visible_en_caja", label: "Registros de Caja" },
  { key: "visible_en_banco", label: "Registros de Banco" },
  { key: "visible_en_transferencias", label: "Transferencias entre Cajas" },
  { key: "visible_en_cancelaciones", label: "Cancelaciones Auto." },
] as const

type Form = {
  codigo: string
  nombre: string
  cuenta_contable_ingresos: string
  cuenta_contable_egresos: string
  visible_en_ajuste_cajas: boolean
  visible_en_ajuste_banco: boolean
  visible_en_caja: boolean
  visible_en_banco: boolean
  visible_en_transferencias: boolean
  visible_en_cancelaciones: boolean
  requiere_observacion: boolean
  activo: boolean
}

const empty: Form = {
  codigo: "",
  nombre: "",
  cuenta_contable_ingresos: "",
  cuenta_contable_egresos: "",
  visible_en_ajuste_cajas: false,
  visible_en_ajuste_banco: false,
  visible_en_caja: false,
  visible_en_banco: false,
  visible_en_transferencias: false,
  visible_en_cancelaciones: false,
  requiere_observacion: false,
  activo: true,
}

export default function ConceptoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/conceptos-registro-caja/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: Partial<Form>) => {
        setForm({
          ...empty,
          ...data,
          cuenta_contable_ingresos: data.cuenta_contable_ingresos ?? "",
          cuenta_contable_egresos: data.cuenta_contable_egresos ?? "",
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Concepto no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }))

  const guardar = async () => {
    if (!form.codigo.trim()) return setError("El código es obligatorio")
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/conceptos-registro-caja/${initialId}` : "/api/conceptos-registro-caja",
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
      router.push("/finanzas/conceptos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/conceptos")} className="text-indigo-700 hover:underline">Volver</button>
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
            {isEdit ? "Editar Concepto" : "Nuevo Concepto"}
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
            <input value={form.codigo} onChange={e => set("codigo", e.target.value)} autoFocus
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ej: COM, DifCaja" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Contable de Ingresos</label>
            <input value={form.cuenta_contable_ingresos} onChange={e => set("cuenta_contable_ingresos", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Contable de Egresos</label>
            <input value={form.cuenta_contable_egresos} onChange={e => set("cuenta_contable_egresos", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Visible en</p>
          <div className="grid grid-cols-3 gap-3">
            {VISIBILITY_FLAGS.map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[f.key]} onChange={e => set(f.key, e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-6 pt-2 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.requiere_observacion} onChange={e => set("requiere_observacion", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Requiere observación</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Activo</span>
          </label>
        </div>
      </div>
    </div>
  )
}
