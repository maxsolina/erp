"use client"

// ─── Cupones de Tarjeta ─────────────────────────────────────────────────────
// Extraído del monolito (Cupones). Listado read-only: los cupones se generan
// automáticamente desde Ventas (al cobrar con tarjeta).

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Info, Search, X } from "lucide-react"

interface CuponTarjeta {
  id: string
  numero_cupon: string
  numero_lote: string | null
  tarjeta_nombre: string
  forma_pago_nombre: string
  cliente_nombre: string
  sucursal: string
  importe: number
  moneda: string
  fecha_ing_egr: string
  estado: 'en_cartera' | 'conciliado' | 'rechazado' | 'cancelado'
  fecha_conciliacion: string | null
  venta_numero: string | null
}

export default function Cupones() {
  const [cupones, setCupones] = useState<CuponTarjeta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [sinCancelados, setSinCancelados] = useState(true)
  const [sinRechazados, setSinRechazados] = useState(true)
  const [sinConciliados, setSinConciliados] = useState(true)
  const [detalle, setDetalle] = useState<CuponTarjeta | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let query = supabase.from('cupones_tarjeta').select('*').order('fecha_ing_egr', { ascending: false })
    if (sinCancelados) query = query.neq('estado', 'cancelado')
    if (sinRechazados) query = query.neq('estado', 'rechazado')
    if (sinConciliados) query = query.neq('estado', 'conciliado')
    query.then(({ data }) => setCupones((data as CuponTarjeta[]) || []))
  }, [sinCancelados, sinRechazados, sinConciliados])

  const filtrados = useMemo(() => {
    if (!busqueda) return cupones
    const b = busqueda.toLowerCase()
    return cupones.filter(c => (c.numero_cupon || '').toLowerCase().includes(b) || (c.tarjeta_nombre || '').toLowerCase().includes(b) || (c.cliente_nombre || '').toLowerCase().includes(b) || (c.forma_pago_nombre || '').toLowerCase().includes(b))
  }, [cupones, busqueda])

  const badgeEstado = (e: string) => {
    const map: Record<string, string> = { en_cartera: 'bg-blue-100 text-blue-700', conciliado: 'bg-green-100 text-green-700', rechazado: 'bg-red-100 text-red-700', cancelado: 'bg-gray-100 text-gray-600' }
    const labels: Record<string, string> = { en_cartera: 'En cartera', conciliado: 'Conciliado', rechazado: 'Rechazado', cancelado: 'Cancelado' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[e] || ''}`}>{labels[e] || e}</span>
  }

  if (detalle) {
    return (
      <div className="p-3 md:p-6 max-w-3xl">
        <button onClick={() => setDetalle(null)} className="text-sm text-indigo-600 hover:underline mb-4 flex items-center gap-1"><X className="w-3 h-3" />Volver al listado</button>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Cupón — {detalle.tarjeta_nombre} {detalle.numero_cupon}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Tarjeta:</span> <strong>{detalle.tarjeta_nombre}</strong></div>
            <div><span className="text-gray-500">N° Cupón:</span> <strong>{detalle.numero_cupon}</strong></div>
            <div><span className="text-gray-500">N° Lote:</span> <strong>{detalle.numero_lote || '—'}</strong></div>
            <div><span className="text-gray-500">Fecha:</span> <strong>{detalle.fecha_ing_egr ? new Date(detalle.fecha_ing_egr).toLocaleDateString() : '—'}</strong></div>
            <div><span className="text-gray-500">Cliente:</span> <strong>{detalle.cliente_nombre}</strong></div>
            <div><span className="text-gray-500">Forma de Pago:</span> <strong>{detalle.forma_pago_nombre}</strong></div>
            <div><span className="text-gray-500">Sucursal:</span> <strong>{detalle.sucursal}</strong></div>
            <div><span className="text-gray-500">Importe:</span> <strong>${detalle.importe?.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {detalle.moneda}</strong></div>
            <div><span className="text-gray-500">Estado:</span> {badgeEstado(detalle.estado)}</div>
            <div><span className="text-gray-500">Venta:</span> <strong>{detalle.venta_numero || '—'}</strong></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-amber-900 mb-4">Cupones de Tarjeta</h2>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar por tarjeta, cupón, cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-8 h-9 border rounded text-sm" /></div>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sinCancelados} onChange={e => setSinCancelados(e.target.checked)} className="rounded" />Sin Cancelados</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sinRechazados} onChange={e => setSinRechazados(e.target.checked)} className="rounded" />Sin Rechazados</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sinConciliados} onChange={e => setSinConciliados(e.target.checked)} className="rounded" />Sin Conciliados</label>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700 flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" />Los cupones se generan automáticamente cuando el cliente paga con tarjeta en Ventas.</div>
      {filtrados.length === 0 ? (
        <p className="text-center py-8 text-gray-400">No hay cupones que coincidan con los filtros</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500">
              <th className="py-2 px-2">Tarjeta</th><th className="px-2">N° Cupón</th><th className="px-2">N° Lote</th><th className="px-2">Fecha</th><th className="px-2">Cliente</th><th className="px-2">Forma de Pago</th><th className="px-2">Sucursal</th><th className="px-2 text-center">Estado</th><th className="px-2 text-right">Importe</th>
            </tr></thead>
            <tbody>{filtrados.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setDetalle(c)}>
                <td className="py-1.5 px-2 font-medium">{c.tarjeta_nombre}</td>
                <td className="px-2">{c.numero_cupon || '—'}</td>
                <td className="px-2">{c.numero_lote || '—'}</td>
                <td className="px-2">{c.fecha_ing_egr ? new Date(c.fecha_ing_egr).toLocaleDateString() : '—'}</td>
                <td className="px-2">{c.cliente_nombre}</td>
                <td className="px-2">{c.forma_pago_nombre}</td>
                <td className="px-2">{c.sucursal}</td>
                <td className="px-2 text-center">{badgeEstado(c.estado)}</td>
                <td className="px-2 text-right font-medium">${c.importe?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
