"use client"

// ─── Conceptos de Registro de Caja ──────────────────────────────────────────
// Extraído del monolito `modulo-finanzas.tsx` como parte de la migración total
// del módulo Finanzas a App Router.

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, X } from "lucide-react"

export interface ConceptoRegistroCaja {
  id: string
  codigo: string
  nombre: string
  cuenta_contable_ingresos: string | null
  cuenta_contable_egresos: string | null
  requiere_observacion: boolean
  visible_en_banco: boolean
  visible_en_caja: boolean
  visible_en_ajuste_cajas: boolean
  visible_en_ajuste_banco: boolean
  visible_en_transferencias: boolean
  visible_en_cancelaciones: boolean
  activo: boolean
}

export default function Conceptos() {
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<ConceptoRegistroCaja | null>(null)

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('conceptos_registro_caja').select('*').order('nombre')
    if (data) setConceptos(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const toggleActivo = async (c: ConceptoRegistroCaja) => {
    const supabase = createClient()
    await supabase.from('conceptos_registro_caja').update({ activo: !c.activo }).eq('id', c.id)
    await cargar()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
          <h1 className="text-2xl font-bold text-amber-900">Conceptos</h1>
        </div>
        <button onClick={() => { setEditando(null); setMostrarModal(true) }} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Concepto</button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Aj. Caja</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Aj. Banco</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Reg. Caja</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Reg. Banco</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Transf.</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Req. Obs.</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conceptos.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{c.codigo}</td>
                  <td className="py-3 px-4 font-medium">{c.nombre}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_ajuste_cajas ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_ajuste_banco ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_caja ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_banco ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.visible_en_transferencias ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-3 text-center">{c.requiere_observacion ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => { setEditando(c); setMostrarModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(c)} className="text-gray-500 hover:text-gray-700 text-sm">{c.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {conceptos.length === 0 && <div className="text-center py-12 text-gray-500">No hay conceptos configurados</div>}
        </div>
      )}

      {mostrarModal && (
        <ModalConcepto
          concepto={editando}
          onGuardar={async (datos) => {
            const supabase = createClient()
            if (editando) { await supabase.from('conceptos_registro_caja').update(datos).eq('id', editando.id) }
            else { await supabase.from('conceptos_registro_caja').insert(datos) }
            setMostrarModal(false); await cargar()
          }}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  )
}

function ModalConcepto({ concepto, onGuardar, onCerrar }: { concepto: ConceptoRegistroCaja | null; onGuardar: (datos: Partial<ConceptoRegistroCaja>) => Promise<void>; onCerrar: () => void }) {
  const [form, setForm] = useState({
    codigo: concepto?.codigo || '',
    nombre: concepto?.nombre || '',
    cuenta_contable_ingresos: concepto?.cuenta_contable_ingresos || '',
    cuenta_contable_egresos: concepto?.cuenta_contable_egresos || '',
    visible_en_ajuste_cajas: concepto?.visible_en_ajuste_cajas || false,
    visible_en_ajuste_banco: concepto?.visible_en_ajuste_banco || false,
    visible_en_caja: concepto?.visible_en_caja || false,
    visible_en_banco: concepto?.visible_en_banco || false,
    visible_en_transferencias: concepto?.visible_en_transferencias || false,
    visible_en_cancelaciones: concepto?.visible_en_cancelaciones || false,
    requiere_observacion: concepto?.requiere_observacion || false,
    activo: concepto?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!form.codigo || !form.nombre) return
    setGuardando(true)
    await onGuardar({ ...form, cuenta_contable_ingresos: form.cuenta_contable_ingresos || null, cuenta_contable_egresos: form.cuenta_contable_egresos || null })
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 mx-4">
        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">{concepto ? 'Editar Concepto' : 'Nuevo Concepto'}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Código *</label>
              <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: COM, DifCaja" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Contable de Ingresos</label>
              <input value={form.cuenta_contable_ingresos} onChange={e => setForm(f => ({ ...f, cuenta_contable_ingresos: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Contable de Egresos</label>
              <input value={form.cuenta_contable_egresos} onChange={e => setForm(f => ({ ...f, cuenta_contable_egresos: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Visible en</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_ajuste_cajas} onChange={e => setForm(f => ({ ...f, visible_en_ajuste_cajas: e.target.checked }))} className="rounded" /><span className="text-sm">Ajuste de Cajas</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_ajuste_banco} onChange={e => setForm(f => ({ ...f, visible_en_ajuste_banco: e.target.checked }))} className="rounded" /><span className="text-sm">Ajuste de Banco</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_caja} onChange={e => setForm(f => ({ ...f, visible_en_caja: e.target.checked }))} className="rounded" /><span className="text-sm">Registros de Caja</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_banco} onChange={e => setForm(f => ({ ...f, visible_en_banco: e.target.checked }))} className="rounded" /><span className="text-sm">Registros de Banco</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_transferencias} onChange={e => setForm(f => ({ ...f, visible_en_transferencias: e.target.checked }))} className="rounded" /><span className="text-sm">Transferencias entre Cajas</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.visible_en_cancelaciones} onChange={e => setForm(f => ({ ...f, visible_en_cancelaciones: e.target.checked }))} className="rounded" /><span className="text-sm">Cancelaciones Auto.</span></label>
            </div>
          </div>

          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.requiere_observacion} onChange={e => setForm(f => ({ ...f, requiere_observacion: e.target.checked }))} className="rounded" /><span className="text-sm">Requiere Observación</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" /><span className="text-sm">Activo</span></label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
