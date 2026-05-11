"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, Plus, Trash2 } from "lucide-react"
import { type Tarjeta } from "./_shared"

interface Cargo {
  id?: number
  nombre: string
  tipo: string
  arancel: number
  es_porcentaje: boolean
  cuenta_contable: string
}

type Form = {
  nombre: string
  banco: string
  tipo_movimiento: string
  activo: boolean
  tarjeta_ids: number[]
  cargos: Cargo[]
}

const empty: Form = {
  nombre: "",
  banco: "",
  tipo_movimiento: "",
  activo: true,
  tarjeta_ids: [],
  cargos: [],
}

export default function GrupoForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/tarjetas")
      .then(r => r.json())
      .then((d: Tarjeta[]) => { if (Array.isArray(d)) setTarjetas(d) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || initialId == null) return
    fetch("/api/grupos-tarjeta")
      .then(r => r.json())
      .then((data: any[]) => {
        const g = Array.isArray(data) ? data.find(x => x.id === initialId) : null
        if (g) {
          setForm({
            nombre: g.nombre ?? "",
            banco: g.banco ?? "",
            tipo_movimiento: g.tipo_movimiento ?? "",
            activo: g.activo ?? true,
            tarjeta_ids: g.tarjetas_ids ?? [],
            cargos: (g.cargos ?? []).map((c: any) => ({
              id: c.id,
              nombre: c.nombre ?? "",
              tipo: c.tipo ?? "",
              arancel: Number(c.arancel ?? 0),
              es_porcentaje: c.es_porcentaje ?? true,
              cuenta_contable: c.cuenta_contable ?? "",
            })),
          })
        } else {
          setErrorCarga("Grupo no encontrado")
        }
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Error de red"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleTarjeta = (id: number) => {
    setForm(f => ({
      ...f,
      tarjeta_ids: f.tarjeta_ids.includes(id) ? f.tarjeta_ids.filter(t => t !== id) : [...f.tarjeta_ids, id],
    }))
  }

  const addCargo = () => setForm(f => ({
    ...f,
    cargos: [...f.cargos, { nombre: "", tipo: "", arancel: 0, es_porcentaje: true, cuenta_contable: "" }],
  }))

  const updCargo = (idx: number, patch: Partial<Cargo>) => setForm(f => ({
    ...f,
    cargos: f.cargos.map((c, i) => i === idx ? { ...c, ...patch } : c),
  }))

  const delCargo = (idx: number) => setForm(f => ({ ...f, cargos: f.cargos.filter((_, i) => i !== idx) }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const payload = { ...form }
      const res = await fetch(
        isEdit ? `/api/grupos-tarjeta/${initialId}` : "/api/grupos-tarjeta",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      router.push("/finanzas/grupos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/grupos")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Editar Grupo" : "Nuevo Grupo"}</h1>
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)} autoFocus
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
            <input value={form.banco} onChange={e => set("banco", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Movimiento</label>
            <input value={form.tipo_movimiento} onChange={e => set("tipo_movimiento", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tarjetas del Grupo</p>
          <div className="grid grid-cols-3 gap-2">
            {tarjetas.map(t => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer border rounded px-3 py-2 hover:bg-gray-50">
                <input type="checkbox" checked={form.tarjeta_ids.includes(t.id)} onChange={() => toggleTarjeta(t.id)} className="w-4 h-4" />
                <span className="text-sm">{t.nombre}</span>
              </label>
            ))}
            {tarjetas.length === 0 && <p className="text-xs text-gray-400 col-span-3">No hay tarjetas configuradas</p>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Cargos</p>
            <button onClick={addCargo} className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar cargo
            </button>
          </div>
          {form.cargos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 border border-dashed rounded">Sin cargos</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left py-2 px-2">Nombre</th>
                    <th className="text-left px-2">Tipo</th>
                    <th className="text-right px-2">Arancel</th>
                    <th className="px-2 w-20">%/$</th>
                    <th className="text-left px-2">Cta. Contable</th>
                    <th className="px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.cargos.map((c, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-1 px-2"><input value={c.nombre} onChange={e => updCargo(idx, { nombre: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                      <td className="px-2"><input value={c.tipo} onChange={e => updCargo(idx, { tipo: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                      <td className="px-2"><input type="number" step="0.0001" value={c.arancel} onChange={e => updCargo(idx, { arancel: Number(e.target.value) })} className="w-24 border rounded px-2 py-1 text-sm text-right" /></td>
                      <td className="px-2">
                        <select value={c.es_porcentaje ? "%" : "$"} onChange={e => updCargo(idx, { es_porcentaje: e.target.value === "%" })} className="border rounded px-1 py-1 text-sm">
                          <option value="%">%</option>
                          <option value="$">$</option>
                        </select>
                      </td>
                      <td className="px-2"><input value={c.cuenta_contable} onChange={e => updCargo(idx, { cuenta_contable: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                      <td className="px-2"><button onClick={() => delCargo(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer pt-2 border-t">
          <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="w-4 h-4" />
          <span className="text-sm">Activo</span>
        </label>
      </div>
    </div>
  )
}
