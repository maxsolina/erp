"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"
import { type Tarjeta } from "./_shared"

type Form = {
  nombre: string
  tipo: "credito" | "debito"
  dias_presentacion: number
  dias_pago: number
  activa: boolean
}

const empty: Form = { nombre: "", tipo: "credito", dias_presentacion: 1, dias_pago: 18, activa: true }

export default function TarjetaForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || initialId == null) return
    fetch("/api/tarjetas")
      .then(r => r.json())
      .then((data: Tarjeta[]) => {
        const t = Array.isArray(data) ? data.find(x => x.id === initialId) : null
        if (t) {
          setForm({
            nombre: t.nombre,
            tipo: t.tipo,
            dias_presentacion: t.dias_presentacion ?? 1,
            dias_pago: t.dias_pago ?? 18,
            activa: t.activa,
          })
        } else {
          setErrorCarga("Tarjeta no encontrada")
        }
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Error de red"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/tarjetas/${initialId}` : "/api/tarjetas",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      router.push("/finanzas/tarjetas")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/tarjetas")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Editar Tarjeta" : "Nueva Tarjeta"}</h1>
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
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => set("tipo", e.target.value as Form["tipo"])}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="credito">Crédito</option>
              <option value="debito">Débito</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Días Presentación</label>
            <input type="number" value={form.dias_presentacion} onChange={e => set("dias_presentacion", Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Días Pago</label>
            <input type="number" value={form.dias_pago} onChange={e => set("dias_pago", Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t">
          <input type="checkbox" checked={form.activa} onChange={e => set("activa", e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Activa</span>
        </label>
      </div>
    </div>
  )
}
