"use client"

// ─── Cheques de Terceros ────────────────────────────────────────────────────
// Extraído del monolito `modulo-finanzas.tsx`. Solo listado read-only — los
// cheques de terceros entran automáticamente desde Ventas (recibos con cheque).

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Search } from "lucide-react"

export interface ChequeTercero {
  id: string
  numero_cheque: string
  fecha_vencimiento: string
  origen_nombre: string
  banco_nombre: string
  banco_codigo: string
  serie: string
  es_electronico: boolean
  es_propio: boolean
  es_endosable: boolean
  importe: number
  moneda: string
  caja_id: string
  caja_nombre: string
  fecha_ingreso: string
  fecha_egreso: string | null
  destino_tipo: string | null
  destino_nombre: string | null
  estado: 'en_cartera' | 'negociado' | 'depositado' | 'endosado' | 'rechazado' | 'cancelado'
}

export default function ChequesTerceros() {
  const [lista, setLista] = useState<ChequeTercero[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("cheques_terceros").select("*").order("fecha_vencimiento", { ascending: false }).then(({ data }) => {
      if (data) setLista(data as ChequeTercero[])
    })
  }, [])

  const listaFiltrada = lista.filter(c => {
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false
    if (busqueda) { const b = busqueda.toLowerCase(); return c.numero_cheque.toLowerCase().includes(b) || c.banco_nombre?.toLowerCase().includes(b) || c.origen_nombre?.toLowerCase().includes(b) }
    return true
  })

  const badgeEstado = (e: string) => {
    const m: Record<string, string> = { en_cartera: "bg-blue-100 text-blue-700", negociado: "bg-green-100 text-green-700", depositado: "bg-teal-100 text-teal-700", endosado: "bg-purple-100 text-purple-700", rechazado: "bg-red-100 text-red-700", cancelado: "bg-gray-100 text-gray-700" }
    const l: Record<string, string> = { en_cartera: "En Cartera", negociado: "Negociado", depositado: "Depositado", endosado: "Endosado", rechazado: "Rechazado", cancelado: "Cancelado" }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[e] || ""}`}>{l[e] || e}</span>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b gap-2 flex-wrap">
        <h2 className="text-2xl font-bold text-amber-900">Cheques de Terceros</h2>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar por número, banco, origen..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full border rounded pl-8 h-9 text-sm" /></div>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="text-sm border rounded px-2">
            <option value="todos">Todos</option><option value="en_cartera">En Cartera</option><option value="negociado">Negociado</option><option value="depositado">Depositado</option><option value="endosado">Endosado</option><option value="rechazado">Rechazado</option>
          </select>
        </div>
        <div className="text-xs text-gray-500">{listaFiltrada.length} cheque(s)</div>
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2 px-2">N° Cheque</th><th>Banco</th><th>Origen</th><th>Vencimiento</th><th className="text-right">Importe</th><th>Moneda</th><th>Caja</th><th className="text-center">Estado</th></tr></thead>
            <tbody>{listaFiltrada.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="py-1.5 px-2 font-medium">{c.numero_cheque}</td><td>{c.banco_nombre}</td><td>{c.origen_nombre}</td><td>{c.fecha_vencimiento}</td>
                <td className="text-right">${c.importe?.toLocaleString()}</td><td>{c.moneda}</td><td>{c.caja_nombre}</td><td className="text-center">{badgeEstado(c.estado)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {listaFiltrada.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay cheques de terceros registrados. Los cheques ingresan automáticamente desde Ventas cuando el cliente paga con cheque.</p>}
      </div>
    </div>
  )
}
