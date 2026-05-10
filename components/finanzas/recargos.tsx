"use client"

// ─── Recargos de Tarjetas ───────────────────────────────────────────────────
// Extraído del monolito (SeccionRecargos). Self-contained.

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { Badge, DIAS_LABELS, SectionHeader, formatPct, type Tarjeta, type GrupoTarjeta, type RecargoTarjeta } from "./_shared"

export default function Recargos() {
  const { sucursales, sucursalActiva } = useERP()
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>([])
  const [recargos, setRecargos] = useState<RecargoTarjeta[]>([])

  const [editando, setEditando] = useState<RecargoTarjeta | null>(null)
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<RecargoTarjeta>>({})
  const [soloActivos, setSoloActivos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    fetch("/api/tarjetas").then(r => r.json()).then(d => Array.isArray(d) && setTarjetas(d))
    fetch("/api/grupos-tarjeta").then(r => r.json()).then(d => Array.isArray(d) && setGrupos(d))
    fetch("/api/recargos-tarjeta").then(r => r.json()).then(d => Array.isArray(d) && setRecargos(d))
  }, [])

  const recFiltrados = useMemo(() => soloActivos ? recargos.filter(r => r.activo) : recargos, [recargos, soloActivos])
  const diasDefault = { lun: true, mar: true, mie: true, jue: true, vie: true, sab: true, dom: true }

  const abrirCrear = () => {
    setForm({ sucursal: sucursalActiva?.nombre ?? sucursales[0]?.nombre ?? "", desde_cuota: 1, hasta_cuota: 1, fecha_desde: "2025-01-01", fecha_hasta: "2025-12-31", recargo_pct: 0, activo: true, dias: { ...diasDefault } })
    setCreando(true); setEditando(null)
  }
  const abrirEditar = (r: RecargoTarjeta) => { setEditando(r); setForm({ ...r }); setCreando(false) }
  const cancelar = () => { setCreando(false); setEditando(null); setForm({}) }

  const guardar = async () => {
    if (!form.tarjeta_id || !form.grupo_id || guardando) return
    setGuardando(true)
    try {
      if (creando) {
        const res = await fetch("/api/recargos-tarjeta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo crear: ${e.error ?? "error"}`); return }
        const nuevo = await res.json()
        setRecargos(prev => [nuevo, ...prev])
      } else if (editando) {
        const res = await fetch(`/api/recargos-tarjeta/${editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo actualizar: ${e.error ?? "error"}`); return }
        const upd = await res.json()
        setRecargos(prev => prev.map(r => r.id === editando.id ? upd : r))
      }
      cancelar()
    } finally { setGuardando(false) }
  }

  const eliminar = async (r?: RecargoTarjeta) => {
    const obj = r ?? editando
    if (!obj || eliminando) return
    if (!confirm("¿Eliminar este recargo?")) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/recargos-tarjeta/${obj.id}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo eliminar: ${e.error ?? "error"}`); return }
      setRecargos(prev => prev.filter(x => x.id !== obj.id))
      if (editando?.id === obj.id) cancelar()
    } finally { setEliminando(false) }
  }

  const tarjetaById = (id: number) => tarjetas.find(t => t.id === id)
  const grupoById = (id: number) => grupos.find(g => g.id === id)

  if (creando || editando) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={cancelar} disabled={guardando || eliminando} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
            <h2 className="text-2xl font-bold text-amber-900">{creando ? "Nuevo Recargo" : "Editar Recargo"}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={cancelar} disabled={guardando || eliminando} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            {!creando && editando && (
              <button onClick={() => eliminar()} disabled={guardando || eliminando} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50">{eliminando ? "Eliminando…" : "Eliminar"}</button>
            )}
            <button onClick={guardar} disabled={guardando || eliminando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50">{guardando ? (creando ? "Creando…" : "Guardando…") : (creando ? "Crear Recargo" : "Guardar")}</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={form.sucursal || ""} onChange={e => setForm(f => ({ ...f, sucursal: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {sucursales.filter(s => s.activa).map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tarjeta</label>
              <select value={form.tarjeta_id || ""} onChange={e => setForm(f => ({ ...f, tarjeta_id: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {tarjetas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Banco / Grupo</label>
              <select value={form.grupo_id || ""} onChange={e => setForm(f => ({ ...f, grupo_id: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recargo %</label>
              <input type="number" step="0.01" value={form.recargo_pct ?? ""} onChange={e => setForm(f => ({ ...f, recargo_pct: parseFloat(e.target.value) }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Desde cuota</label>
              <input type="number" min="1" value={form.desde_cuota ?? ""} onChange={e => setForm(f => ({ ...f, desde_cuota: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hasta cuota</label>
              <input type="number" min="1" value={form.hasta_cuota ?? ""} onChange={e => setForm(f => ({ ...f, hasta_cuota: parseInt(e.target.value) }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha desde</label>
              <input type="date" value={form.fecha_desde || ""} onChange={e => setForm(f => ({ ...f, fecha_desde: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input type="date" value={form.fecha_hasta || ""} onChange={e => setForm(f => ({ ...f, fecha_hasta: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-gray-700">Días que aplica:</span>
            {DIAS_LABELS.map(({ key, label }) => (
              <label key={key} className={`flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer text-sm font-medium transition-colors ${form.dias?.[key] ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500 border-gray-300 hover:border-emerald-400"}`}>
                <input type="checkbox" className="hidden" checked={form.dias?.[key] ?? false} onChange={e => setForm(f => ({ ...f, dias: { ...(f.dias || diasDefault), [key]: e.target.checked } }))} />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm ml-4"><input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />Activo</label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title="Recargos de Tarjetas">
        <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} className="rounded" />Solo vigentes</label>
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800"><Plus className="w-4 h-4" /> Nuevo Recargo</button>
      </SectionHeader>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Sucursal</th><th className="text-left py-3 px-4">Tarjeta</th><th className="text-left py-3 px-4">Grupo</th>
              <th className="text-center py-3 px-4">Cuotas</th><th className="text-center py-3 px-4">Vigencia</th>
              <th className="text-center py-3 px-4">Recargo</th><th className="text-center py-3 px-4">Días</th>
              <th className="text-center py-3 px-4">Estado</th><th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {recFiltrados.map(r => {
              const tarj = tarjetaById(r.tarjeta_id)
              const grp = grupoById(r.grupo_id)
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{r.sucursal}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{tarj?.nombre ?? r.tarjeta_id}</div>
                    {tarj && <Badge color={tarj.tipo === "credito" ? "blue" : "emerald"}>{tarj.tipo === "credito" ? "Crédito" : "Débito"}</Badge>}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{grp?.nombre ?? r.grupo_id}</td>
                  <td className="py-3 px-4 text-center font-mono">{r.desde_cuota === r.hasta_cuota ? `${r.desde_cuota}c` : `${r.desde_cuota}-${r.hasta_cuota}c`}</td>
                  <td className="py-3 px-4 text-center text-xs text-gray-500">{r.fecha_desde} → {r.fecha_hasta}</td>
                  <td className="py-3 px-4 text-center"><span className={`font-bold text-sm ${r.recargo_pct > 0 ? "text-amber-700" : "text-gray-500"}`}>{formatPct(r.recargo_pct)}</span></td>
                  <td className="py-3 px-4">
                    <div className="flex gap-0.5 justify-center">
                      {DIAS_LABELS.map(({ key, label }) => (
                        <span key={key} className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium ${r.dias[key] ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-300"}`}>{label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center"><Badge color={r.activo ? "emerald" : "gray"}>{r.activo ? "Vigente" : "Inactivo"}</Badge></td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => abrirEditar(r)} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => eliminar(r)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {recFiltrados.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay recargos configurados.</div>}
      </div>
    </div>
  )
}
