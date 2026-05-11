"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"
import { type Tarjeta, type GrupoTarjeta } from "./_shared"

const DIAS = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mie", label: "Mié" },
  { key: "jue", label: "Jue" },
  { key: "vie", label: "Vie" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const

type Dia = typeof DIAS[number]["key"]

type Form = {
  tarjeta_id: number | ""
  grupo_id: number | ""
  sucursal_id: string
  desde_cuota: number
  hasta_cuota: number
  fecha_desde: string
  fecha_hasta: string
  recargo_pct: number
  activo: boolean
  dias: Record<Dia, boolean>
}

const empty: Form = {
  tarjeta_id: "",
  grupo_id: "",
  sucursal_id: "",
  desde_cuota: 1,
  hasta_cuota: 1,
  fecha_desde: "",
  fecha_hasta: "",
  recargo_pct: 0,
  activo: true,
  dias: { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true },
}

export default function RecargoForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>([])
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/tarjetas").then(r => r.json()),
      fetch("/api/grupos-tarjeta").then(r => r.json()),
    ]).then(([t, g]: [Tarjeta[], GrupoTarjeta[]]) => {
      if (Array.isArray(t)) setTarjetas(t)
      if (Array.isArray(g)) setGrupos(g)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || initialId == null) return
    fetch("/api/recargos-tarjeta")
      .then(r => r.json())
      .then((data: any[]) => {
        const r = Array.isArray(data) ? data.find(x => x.id === initialId) : null
        if (r) {
          setForm({
            tarjeta_id: r.tarjeta_id,
            grupo_id: r.grupo_id,
            sucursal_id: r.sucursal_id ?? "",
            desde_cuota: r.desde_cuota ?? 1,
            hasta_cuota: r.hasta_cuota ?? 1,
            fecha_desde: r.fecha_desde ?? "",
            fecha_hasta: r.fecha_hasta ?? "",
            recargo_pct: Number(r.recargo_pct ?? 0),
            activo: r.activo ?? true,
            dias: r.dias ?? empty.dias,
          })
        } else {
          setErrorCarga("Recargo no encontrado")
        }
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Error de red"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const toggleDia = (d: Dia) => setForm(f => ({ ...f, dias: { ...f.dias, [d]: !f.dias[d] } }))

  const guardar = async () => {
    if (!form.tarjeta_id) return setError("Seleccionar tarjeta")
    if (!form.grupo_id) return setError("Seleccionar grupo")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const payload = {
        ...form,
        sucursal_id: form.sucursal_id || null,
        fecha_desde: form.fecha_desde || null,
        fecha_hasta: form.fecha_hasta || null,
      }
      const res = await fetch(
        isEdit ? `/api/recargos-tarjeta/${initialId}` : "/api/recargos-tarjeta",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      router.push("/finanzas/recargos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/recargos")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Editar Recargo" : "Nuevo Recargo"}</h1>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarjeta *</label>
            <select value={form.tarjeta_id} onChange={e => set("tarjeta_id", e.target.value ? Number(e.target.value) : "")}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {tarjetas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grupo *</label>
            <select value={form.grupo_id} onChange={e => set("grupo_id", e.target.value ? Number(e.target.value) : "")}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde Cuota</label>
            <input type="number" value={form.desde_cuota} onChange={e => set("desde_cuota", Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta Cuota</label>
            <input type="number" value={form.hasta_cuota} onChange={e => set("hasta_cuota", Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recargo %</label>
            <input type="number" step="0.01" value={form.recargo_pct} onChange={e => set("recargo_pct", Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
            <input value={form.sucursal_id} onChange={e => set("sucursal_id", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="ID (vacío = todas)" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Desde</label>
            <input type="date" value={form.fecha_desde} onChange={e => set("fecha_desde", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Hasta</label>
            <input type="date" value={form.fecha_hasta} onChange={e => set("fecha_hasta", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Días Aplicables</p>
          <div className="flex gap-2">
            {DIAS.map(d => (
              <button key={d.key} type="button" onClick={() => toggleDia(d.key)}
                className={`px-3 py-2 rounded text-xs font-medium border ${form.dias[d.key] ? "bg-indigo-900 text-white border-indigo-900" : "border-gray-300 text-gray-500 hover:bg-gray-50"}`}>
                {d.label}
              </button>
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
