"use client"

// ─── Tipos de Préstamos ─────────────────────────────────────────────────────
// Extraído del monolito `modulo-finanzas.tsx`.

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, X } from "lucide-react"

export interface TipoPrestamo {
  id: string
  nombre: string
  cuenta_prestamo: string
  cuenta_intereses: string
  cuenta_intereses_devengar: string | null
  cuenta_iva_devengar: string | null
  cuenta_percepciones_devengar: string | null
  cuenta_refinanciacion: string | null
  cuenta_preexistente: string | null
  concepto_liquidacion: string | null
  activo: boolean
}

export default function TiposPrestamos() {
  const [tipos, setTipos] = useState<TipoPrestamo[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<TipoPrestamo | null>(null)

  const cargar = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('tipos_prestamo').select('*').order('nombre')
    if (data) setTipos(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const toggleActivo = async (t: TipoPrestamo) => {
    const supabase = createClient()
    await supabase.from('tipos_prestamo').update({ activo: !t.activo }).eq('id', t.id)
    await cargar()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuración</p>
          <h1 className="text-2xl font-bold text-amber-900">Tipos de Préstamos</h1>
        </div>
        <button onClick={() => { setEditando(null); setMostrarModal(true) }} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo Tipo</button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cuenta Préstamo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cuenta Intereses</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Activo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditando(t); setMostrarModal(true) }}>
                  <td className="py-3 px-4 font-medium text-indigo-900">{t.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{t.cuenta_prestamo || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{t.cuenta_intereses || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditando(t); setMostrarModal(true) }} className="text-indigo-600 hover:text-indigo-800 text-sm mr-3">Editar</button>
                    <button onClick={() => toggleActivo(t)} className="text-gray-500 hover:text-gray-700 text-sm">{t.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tipos.length === 0 && <div className="text-center py-12 text-gray-500">No hay tipos de préstamo configurados</div>}
        </div>
      )}

      {mostrarModal && (
        <ModalTipoPrestamo
          tipo={editando}
          onGuardar={async (datos) => {
            const supabase = createClient()
            if (editando) { await supabase.from('tipos_prestamo').update(datos).eq('id', editando.id) }
            else { await supabase.from('tipos_prestamo').insert(datos) }
            setMostrarModal(false); await cargar()
          }}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  )
}

function ModalTipoPrestamo({ tipo, onGuardar, onCerrar }: { tipo: TipoPrestamo | null; onGuardar: (datos: Partial<TipoPrestamo>) => Promise<void>; onCerrar: () => void }) {
  const [form, setForm] = useState({
    nombre: tipo?.nombre || '',
    cuenta_prestamo: tipo?.cuenta_prestamo || '',
    cuenta_intereses: tipo?.cuenta_intereses || '',
    cuenta_intereses_devengar: tipo?.cuenta_intereses_devengar || '',
    cuenta_iva_devengar: tipo?.cuenta_iva_devengar || '',
    cuenta_percepciones_devengar: tipo?.cuenta_percepciones_devengar || '',
    cuenta_refinanciacion: tipo?.cuenta_refinanciacion || '',
    cuenta_preexistente: tipo?.cuenta_preexistente || '',
    concepto_liquidacion: tipo?.concepto_liquidacion || '',
    activo: tipo?.activo ?? true,
  })
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!form.nombre) return
    setGuardando(true)
    const datos: Partial<TipoPrestamo> = {
      ...form,
      cuenta_intereses_devengar: form.cuenta_intereses_devengar || null,
      cuenta_iva_devengar: form.cuenta_iva_devengar || null,
      cuenta_percepciones_devengar: form.cuenta_percepciones_devengar || null,
      cuenta_refinanciacion: form.cuenta_refinanciacion || null,
      cuenta_preexistente: form.cuenta_preexistente || null,
      concepto_liquidacion: form.concepto_liquidacion || null,
    }
    await onGuardar(datos)
    setGuardando(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">{tipo ? 'Editar Tipo de Préstamo' : 'Nuevo Tipo de Préstamo'}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: SGR, Bancario" />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cuentas Contables</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Préstamo</label>
                <input value={form.cuenta_prestamo} onChange={e => setForm(f => ({ ...f, cuenta_prestamo: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 21010705 Préstamo SGR" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Intereses</label>
                <input value={form.cuenta_intereses} onChange={e => setForm(f => ({ ...f, cuenta_intereses: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 62010103 Intereses Préstamos Bancarios Recibidos" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Intereses a Devengar</label>
                <input value={form.cuenta_intereses_devengar} onChange={e => setForm(f => ({ ...f, cuenta_intereses_devengar: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 11040403 Intereses Bancarios a Devengar" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de IVA a Devengar</label>
                <input value={form.cuenta_iva_devengar} onChange={e => setForm(f => ({ ...f, cuenta_iva_devengar: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 11040101 I.V.A. Crédito Fiscal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Percepciones a Devengar</label>
                <input value={form.cuenta_percepciones_devengar} onChange={e => setForm(f => ({ ...f, cuenta_percepciones_devengar: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 11040102 I.V.A. Percepciones" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta para Saldos Cancelados / Refinanciación</label>
                <input value={form.cuenta_refinanciacion} onChange={e => setForm(f => ({ ...f, cuenta_refinanciacion: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 99999998 Cuenta Puente para Movimientos Bancarios" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta para Préstamos Preexistentes</label>
                <input value={form.cuenta_preexistente} onChange={e => setForm(f => ({ ...f, cuenta_preexistente: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="ej: 21010704 Préstamos Bancarios" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Concepto por Defecto en Liquidación</label>
                <input value={form.concepto_liquidacion} onChange={e => setForm(f => ({ ...f, concepto_liquidacion: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
            <span className="text-sm">Activo</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCerrar} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">{guardando ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
