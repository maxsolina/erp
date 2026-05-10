"use client"

// ─── Grupos de Tarjetas ─────────────────────────────────────────────────────
// Extraído del monolito (SeccionGrupos). Self-contained: carga tarjetas, grupos
// y plan-cuentas. Form de edición con tabs (tarjetas, cargos).

import { useEffect, useState } from "react"
import { ArrowLeft, Building2, Edit, Plus, Trash2 } from "lucide-react"
import { Badge, SectionHeader, formatPct, type Tarjeta, type GrupoTarjeta, type CargosGrupo } from "./_shared"

export default function Grupos() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [grupos, setGrupos] = useState<GrupoTarjeta[]>([])
  const [planCuentas, setPlanCuentas] = useState<{ id: string; codigo: string; nombre: string }[]>([])

  const [selectedGrupo, setSelectedGrupo] = useState<GrupoTarjeta | null>(null)
  const [tab, setTab] = useState<"tarjetas" | "cargos">("tarjetas")
  const [creando, setCreando] = useState(false)
  const [form, setForm] = useState<Partial<GrupoTarjeta>>({})
  const [editandoCargo, setEditandoCargo] = useState<CargosGrupo | null>(null)
  const [creandoCargo, setCreandoCargo] = useState(false)
  const [formCargo, setFormCargo] = useState<Partial<CargosGrupo>>({})
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    fetch("/api/tarjetas").then(r => r.json()).then(d => Array.isArray(d) && setTarjetas(d))
    fetch("/api/grupos-tarjeta").then(r => r.json()).then(d => Array.isArray(d) && setGrupos(d))
    fetch("/api/contabilidad/plan-cuentas?activo=true").then(r => r.json()).then(d => Array.isArray(d) && setPlanCuentas(d)).catch(() => {})
  }, [])

  const abrirCrear = () => {
    setForm({ nombre: "", banco: "", tipo_movimiento: "Acreditación de Tarjeta", activo: true, tarjetas_ids: [], cargos: [] })
    setCreando(true)
    setSelectedGrupo(null)
  }

  const guardarGrupo = async () => {
    if (!form.nombre?.trim() || guardando) return
    setGuardando(true)
    try {
      if (creando) {
        const res = await fetch("/api/grupos-tarjeta", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: form.nombre, banco: form.banco ?? null, tipo_movimiento: form.tipo_movimiento ?? null }),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo crear: ${e.error ?? "error"}`); return }
        const creado = await res.json()
        if ((form.tarjetas_ids?.length || form.cargos?.length)) {
          const r2 = await fetch(`/api/grupos-tarjeta/${creado.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tarjeta_ids: form.tarjetas_ids ?? [], cargos: form.cargos ?? [] }),
          })
          if (r2.ok) { const completo = await r2.json(); setGrupos(prev => [completo, ...prev]) }
          else { setGrupos(prev => [{ ...creado, tarjetas_ids: [], cargos: [] } as GrupoTarjeta, ...prev]) }
        } else {
          setGrupos(prev => [{ ...creado, tarjetas_ids: [], cargos: [] } as GrupoTarjeta, ...prev])
        }
      } else if (selectedGrupo) {
        const res = await fetch(`/api/grupos-tarjeta/${selectedGrupo.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: form.nombre, banco: form.banco ?? null, tipo_movimiento: form.tipo_movimiento ?? null, activo: form.activo, tarjeta_ids: form.tarjetas_ids ?? [], cargos: form.cargos ?? [] }),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo guardar: ${e.error ?? "error"}`); return }
        const actualizado = await res.json()
        setGrupos(prev => prev.map(g => g.id === selectedGrupo.id ? actualizado : g))
      }
      cancelarEdicion()
    } finally { setGuardando(false) }
  }

  const toggleTarjeta = (id: number) => {
    const ids = form.tarjetas_ids || []
    setForm(f => ({ ...f, tarjetas_ids: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id] }))
  }

  const guardarCargo = () => {
    if (!formCargo.nombre?.trim()) return
    if (creandoCargo) {
      const nuevo = { ...formCargo, id: Date.now() } as CargosGrupo
      setForm(f => ({ ...f, cargos: [...(f.cargos || []), nuevo] }))
    } else if (editandoCargo) {
      setForm(f => ({ ...f, cargos: (f.cargos || []).map(c => c.id === editandoCargo.id ? { ...c, ...formCargo } as CargosGrupo : c) }))
    }
    setCreandoCargo(false); setEditandoCargo(null); setFormCargo({})
  }

  const eliminarCargo = (id: number) => {
    setForm(f => ({ ...f, cargos: (f.cargos || []).filter(c => c.id !== id) }))
  }

  const seleccionarGrupo = (g: GrupoTarjeta) => {
    setSelectedGrupo(g); setForm({ ...g }); setCreando(false); setTab("tarjetas")
  }

  const eliminarGrupo = async (g?: GrupoTarjeta) => {
    const obj = g ?? selectedGrupo
    if (!obj || eliminando) return
    if (!confirm(`¿Eliminar el grupo "${obj.nombre}"? Se borrarán también sus cargos y recargos.`)) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/grupos-tarjeta/${obj.id}`, { method: "DELETE" })
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(`No se pudo eliminar: ${e.error ?? "error"}`); return }
      setGrupos(prev => prev.filter(x => x.id !== obj.id))
      if (selectedGrupo?.id === obj.id) cancelarEdicion()
    } finally { setEliminando(false) }
  }

  const cancelarEdicion = () => {
    setCreando(false); setSelectedGrupo(null); setForm({})
    setCreandoCargo(false); setEditandoCargo(null); setFormCargo({})
  }

  if (creando || selectedGrupo) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={cancelarEdicion} disabled={guardando || eliminando} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50" title="Volver"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
            <h2 className="text-2xl font-bold text-amber-900">{creando ? "Nuevo Grupo de Tarjetas" : `Editar grupo: ${selectedGrupo?.nombre ?? ""}`}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={cancelarEdicion} disabled={guardando || eliminando} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
            {!creando && selectedGrupo && (
              <button onClick={() => eliminarGrupo()} disabled={guardando || eliminando} className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50">{eliminando ? "Eliminando…" : "Eliminar"}</button>
            )}
            <button onClick={guardarGrupo} disabled={guardando || eliminando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50">{guardando ? (creando ? "Creando…" : "Guardando…") : (creando ? "Crear Grupo" : "Guardar")}</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Banco</label>
                <input value={form.banco || ""} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm mb-1.5"><input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />Activo</label>
              </div>
            </div>
          </div>

          <div className="flex border-b border-emerald-200 bg-white">
            {(["tarjetas", "cargos"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t === "tarjetas" ? "Tarjetas" : "Cargos"}
              </button>
            ))}
          </div>

          {tab === "tarjetas" && (
            <div className="p-4 bg-white">
              <p className="text-xs text-gray-500 mb-3">Seleccioná las tarjetas asociadas a este grupo:</p>
              {tarjetas.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No hay tarjetas cargadas. Andá a la sección Tarjetas para crear.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {tarjetas.map(t => (
                    <label key={t.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${(form.tarjetas_ids || []).includes(t.id) ? "bg-emerald-50 border-emerald-300" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="checkbox" checked={(form.tarjetas_ids || []).includes(t.id)} onChange={() => toggleTarjeta(t.id)} className="rounded" />
                      <span className="text-sm">{t.nombre}</span>
                      <Badge color={t.tipo === "credito" ? "blue" : "emerald"}>{t.tipo === "credito" ? "C" : "D"}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "cargos" && (
            <div className="p-4 bg-white">
              {(creandoCargo || editandoCargo) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del cargo</label>
                      <input value={formCargo.nombre || ""} onChange={e => setFormCargo(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Comisión, IVA, Retención IIBB" className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Arancel %</label>
                      <input type="number" step="0.01" value={formCargo.arancel ?? ""} onChange={e => setFormCargo(f => ({ ...f, arancel: parseFloat(e.target.value) }))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta contable</label>
                      <select value={formCargo.cuenta_contable || ""} onChange={e => setFormCargo(f => ({ ...f, cuenta_contable: e.target.value }))} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option value="">Seleccionar cuenta...</option>
                        {planCuentas.map(c => <option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button onClick={() => { setCreandoCargo(false); setEditandoCargo(null); setFormCargo({}) }} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancelar</button>
                    <button onClick={guardarCargo} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Guardar cargo</button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                      <th className="text-left py-2 px-3">Nombre</th><th className="text-right py-2 px-3">Arancel %</th><th className="text-left py-2 px-3">Cuenta Contable</th><th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.cargos || []).map(c => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2 px-3 font-medium">{c.nombre}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatPct(c.arancel)}</td>
                        <td className="py-2 px-3 text-gray-500">{c.cuenta_contable}</td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditandoCargo(c); setFormCargo({ ...c }); setCreandoCargo(false) }} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={() => eliminarCargo(c.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(form.cargos || []).length === 0 && <p className="text-sm text-gray-500 text-center py-4">Sin cargos configurados</p>}
              <button onClick={() => { setCreandoCargo(true); setEditandoCargo(null); setFormCargo({ tipo: "Gasto", es_porcentaje: true }) }} className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                <Plus className="w-4 h-4" /> Agregar cargo
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title="Grupos de Tarjetas">
        <button onClick={abrirCrear} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800"><Plus className="w-4 h-4" /> Nuevo Grupo</button>
      </SectionHeader>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Nombre</th><th className="text-left py-3 px-4">Banco</th>
              <th className="text-center py-3 px-4">Tarjetas</th><th className="text-center py-3 px-4">Cargos</th>
              <th className="text-center py-3 px-4">Estado</th><th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(g => (
              <tr key={g.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> {g.nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{g.banco || "-"}</td>
                <td className="py-3 px-4 text-center text-sm">{g.tarjetas_ids?.length ?? 0}</td>
                <td className="py-3 px-4 text-center text-sm">{g.cargos?.length ?? 0}</td>
                <td className="py-3 px-4 text-center"><Badge color={g.activo ? "emerald" : "gray"}>{g.activo ? "Activo" : "Inactivo"}</Badge></td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => seleccionarGrupo(g)} className="p-1 text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => eliminarGrupo(g)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {grupos.length === 0 && <div className="text-center py-12 text-gray-500 text-sm">No hay grupos configurados.</div>}
      </div>
    </div>
  )
}
