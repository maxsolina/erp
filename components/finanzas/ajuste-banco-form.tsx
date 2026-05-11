"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { type ConceptoRegistroCaja, type CuentaBancaria } from "./_shared"

type Form = {
  cuenta_bancaria_nombre: string
  concepto_id: string
  importe: string
  fecha: string
  sucursal: string
  cuenta_analitica: string
  observaciones: string
}

const empty = (): Form => ({
  cuenta_bancaria_nombre: "",
  concepto_id: "",
  importe: "",
  fecha: new Date().toISOString().split("T")[0],
  sucursal: "",
  cuenta_analitica: "",
  observaciones: "",
})

export default function AjusteBancoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/conceptos-registro-caja").then(r => r.json()),
      fetch("/api/cuentas-bancarias").then(r => r.json()),
    ]).then(([c, cb]) => {
      // El monolito filtra conceptos por visible_en_banco; replicamos.
      if (Array.isArray(c)) setConceptos(c.filter((x: ConceptoRegistroCaja) => x.visible_en_banco))
      if (Array.isArray(cb)) setCuentas(cb)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/ajustes-banco/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setForm({
          cuenta_bancaria_nombre: d.cuenta_bancaria_nombre ?? "",
          concepto_id: d.concepto_id ?? "",
          importe: String(d.importe ?? ""),
          fecha: d.fecha ?? new Date().toISOString().split("T")[0],
          sucursal: d.sucursal ?? "",
          cuenta_analitica: d.cuenta_analitica ?? "",
          observaciones: d.observaciones ?? "",
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Ajuste no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const conceptoSel = conceptos.find(c => c.id === form.concepto_id)
  const requiereObs = conceptoSel?.requiere_observacion

  const guardar = async () => {
    if (!form.cuenta_bancaria_nombre) return setError("Seleccionar cuenta bancaria")
    if (!form.concepto_id) return setError("Seleccionar concepto")
    if (!form.importe || isNaN(Number(form.importe))) return setError("Importe inválido")
    if (requiereObs && !form.observaciones.trim()) return setError("Observaciones obligatorias para este concepto")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const payload = { ...form, importe: Number(form.importe) }
      const res = await fetch(
        isEdit ? `/api/ajustes-banco/${initialId}` : "/api/ajustes-banco",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      router.push("/finanzas/ajustes-banco")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/ajustes-banco")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Editar Ajuste de Banco" : "Nuevo Ajuste de Banco"}</h1>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria *</label>
            <select value={form.cuenta_bancaria_nombre} onChange={e => set("cuenta_bancaria_nombre", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.banco_nombre}>{c.numero_cuenta} - {c.banco_nombre} ({c.moneda})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Concepto *</label>
            <select value={form.concepto_id} onChange={e => set("concepto_id", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Importe *</label>
            <input type="number" step="0.01" value={form.importe} onChange={e => set("importe", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
            <select value={form.sucursal} onChange={e => set("sucursal", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">—</option>
              {sucursales.map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Analítica</label>
          <input value={form.cuenta_analitica} onChange={e => set("cuenta_analitica", e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Observaciones{requiereObs && " *"}
          </label>
          <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {requiereObs && <p className="text-xs text-amber-700 mt-1">Este concepto requiere observación.</p>}
        </div>
      </div>
    </div>
  )
}
