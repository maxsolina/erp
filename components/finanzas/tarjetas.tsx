"use client"

// ─── Tarjetas ───────────────────────────────────────────────────────────────
// Extraído del monolito `modulo-finanzas.tsx` (SeccionTarjetas).
// Self-contained: carga sus tarjetas y maneja su estado.

import { useEffect, useState } from "react"
import { ArrowLeft, CreditCard, Edit, Plus, Trash2 } from "lucide-react"
import { Badge, SectionHeader, type Tarjeta } from "./_shared"

export default function Tarjetas() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [editando, setEditando] = useState<Tarjeta | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<Tarjeta>>({})
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    fetch("/api/tarjetas").then(r => r.json()).then(d => Array.isArray(d) && setTarjetas(d))
  }, [])

  const abrirCrear = () => { setForm({ nombre: "", tipo: "credito", dias_presentacion: 7, dias_pago: 18, activa: true }); setCreando(true); setEditando(null) }
  const abrirEditar = (t: Tarjeta) => { setForm({ ...t }); setEditando(t); setCreando(false) }
  const cancelar = () => { setCreando(false); setEditando(null); setForm({}) }

  const guardar = async () => {
    if (!form.nombre?.trim() || guardando) return
    setGuardando(true)
    try {
      if (creando) {
        const res = await fetch("/api/tarjetas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo crear: ${e.error ?? "error"}`); return }
        const nueva = await res.json()
        setTarjetas(prev => [nueva, ...prev])
      } else if (editando) {
        const res = await fetch(`/api/tarjetas/${editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo actualizar: ${e.error ?? "error"}`); return }
        const upd = await res.json()
        setTarjetas(prev => prev.map(t => t.id === editando.id ? upd : t))
      }
      cancelar()
    } finally { setGuardando(false) }
  }

  const eliminar = async (t?: Tarjeta) => {
    const obj = t ?? editando
    if (!obj || eliminando) return
    if (!confirm(`¿Eliminar la tarjeta "${obj.nombre}"? Esta acción no se puede deshacer.`)) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/tarjetas/${obj.id}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo eliminar: ${e.error ?? "error"}`); return }
      setTarjetas(prev => prev.filter(x => x.id !== obj.id))
      if (editando?.id === obj.id) cancelar()
    } finally { setEliminando(false) }
  }

  if (creando || editando) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={cancelar} disabled={guardando || eliminando} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50" title="Volver"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
            <h2 className="text-2xl font-bold text-amber-900">{creando ? "Nueva Tarjeta" : `Editar tarjeta: ${editando?.nombre ?? ""}`}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={cancelar} disabled={guardando || eliminando} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            {!creando && editando && (
              <button onClick={() => eliminar()} disabled={guardando || eliminando} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50">{eliminando ? "Eliminando…" : "Eliminar"}</button>
            )}
            <button onClick={guardar} disabled={guardando || eliminando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50">{guardando ? (creando ? "Creando…" : "Guardando…") : (creando ? "Crear Tarjeta" : "Guardar")}</button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.tipo || "credito"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as "credito" | "debito" }))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="credito">Crédito</option><option value="debito">Débito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Días presentación</label>
              <input type="number" value={form.dias_presentacion ?? ""} onChange={e => setForm(f => ({ ...f, dias_presentacion: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Días pago</label>
              <input type="number" value={form.dias_pago ?? ""} onChange={e => setForm(f => ({ ...f, dias_pago: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="rounded" />Activa</label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title="Tarjetas">
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800"><Plus className="w-4 h-4" /> Nueva Tarjeta</button>
      </SectionHeader>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Nombre</th><th className="text-left py-3 px-4">Tipo</th>
              <th className="text-center py-3 px-4">Días Presentación</th><th className="text-center py-3 px-4">Días Pago</th>
              <th className="text-center py-3 px-4">Estado</th><th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {tarjetas.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> {t.nombre}</td>
                <td className="py-3 px-4"><Badge color={t.tipo === "credito" ? "blue" : "emerald"}>{t.tipo === "credito" ? "Crédito" : "Débito"}</Badge></td>
                <td className="py-3 px-4 text-center text-sm">{t.dias_presentacion} días</td>
                <td className="py-3 px-4 text-center text-sm">{t.dias_pago} días</td>
                <td className="py-3 px-4 text-center"><Badge color={t.activa ? "emerald" : "gray"}>{t.activa ? "Activa" : "Inactiva"}</Badge></td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrirEditar(t)} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => eliminar(t)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tarjetas.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay tarjetas configuradas.</div>}
      </div>
    </div>
  )
}
