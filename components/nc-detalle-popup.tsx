"use client"

import { X } from "lucide-react"

interface LineaNC {
  descripcion: string
  importe: number
}

export interface NcDetalleData {
  numero: string
  fecha: string
  estado: string
  cliente_nombre: string
  sucursal: string
  concepto: string
  nota_venta_numero?: string
  lineas: LineaNC[]
  total: number
  moneda: string
}

interface NcDetallePopupProps {
  nc: NcDetalleData | null
  onClose: () => void
}

function formatCurrency(amount: number, moneda: string) {
  const symbol = moneda === "USD" ? "US$" : "$"
  return `${symbol} ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
}

export default function NcDetallePopup({ nc, onClose }: NcDetallePopupProps) {
  if (!nc) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-emerald-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded px-2 py-0.5">
                NOTA DE CREDITO
              </span>
              <span className="font-mono font-bold text-emerald-800 text-lg">{nc.numero}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(nc.fecha).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                nc.estado === "publicado"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {nc.estado === "publicado" ? "Publicada" : "Borrador"}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Datos generales */}
        <div className="px-6 py-4 border-b grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-400 text-xs uppercase font-medium">Cliente</span>
            <p className="font-semibold text-gray-900 mt-0.5">{nc.cliente_nombre}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase font-medium">Sucursal</span>
            <p className="font-semibold text-gray-900 mt-0.5">{nc.sucursal}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs uppercase font-medium">Concepto</span>
            <p className="font-semibold text-gray-900 mt-0.5">{nc.concepto}</p>
          </div>
          {nc.nota_venta_numero && (
            <div>
              <span className="text-gray-400 text-xs uppercase font-medium">Nota de Venta</span>
              <p className="font-semibold text-emerald-700 mt-0.5">{nc.nota_venta_numero}</p>
            </div>
          )}
        </div>

        {/* Lineas */}
        {nc.lineas && nc.lineas.length > 0 && (
          <div className="px-6 py-4 border-b">
            <p className="text-xs uppercase font-semibold text-gray-400 mb-3">Detalle</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b">
                  <th className="text-left pb-2">Descripcion</th>
                  <th className="text-right pb-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {nc.lineas.map((l, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-700">{l.descripcion}</td>
                    <td className="py-2 text-right font-medium">
                      {formatCurrency(l.importe, nc.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total */}
        <div className="px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Moneda: <span className="font-semibold text-gray-800">{nc.moneda}</span>
          </span>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase font-medium">Total Nota de Credito</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(nc.total, nc.moneda)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
