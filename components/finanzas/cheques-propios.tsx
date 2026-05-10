"use client"

// ─── Cheques Propios ────────────────────────────────────────────────────────
// Extraído del monolito `modulo-finanzas.tsx`. Los cheques propios se generan
// al pagar con cheque en Compras → Órdenes de Pago.

import { useState } from "react"
import { Search } from "lucide-react"

interface ChequePropio {
  id: string
  numero_cheque: string
  banco_nombre: string
  importe: number
  moneda: string
  fecha_emision: string
  beneficiario: string
  estado: string
}

export default function ChequesPropios() {
  const [lista] = useState<ChequePropio[]>([])
  const [busqueda, setBusqueda] = useState("")

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b gap-2 flex-wrap">
        <h2 className="text-2xl font-bold text-amber-900">Cheques Propios</h2>
      </div>
      <div className="p-4">
        <div className="relative mb-3"><Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" /><input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full border rounded pl-8 h-9 text-sm" /></div>
        {lista.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No hay cheques propios registrados. Los cheques propios se generan al pagar con cheque en Compras → Órdenes de Pago.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="border-b text-left text-xs text-gray-500"><th className="py-2 px-2">N° Cheque</th><th>Banco</th><th>Beneficiario</th><th>Emisión</th><th className="text-right">Importe</th><th>Moneda</th><th className="text-center">Estado</th></tr></thead>
              <tbody>{lista.map(c => (
                <tr key={c.id} className="border-b"><td className="py-1.5 px-2 font-medium">{c.numero_cheque}</td><td>{c.banco_nombre}</td><td>{c.beneficiario}</td><td>{c.fecha_emision}</td><td className="text-right">${c.importe?.toLocaleString()}</td><td>{c.moneda}</td><td className="text-center">{c.estado}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
