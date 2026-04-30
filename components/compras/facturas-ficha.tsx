"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getEstadoFacturaColor,
  getEstadoFacturaLabel,
} from "./_shared"

interface Props {
  apiUrl: string
  backHref: string
  monolitoEditView: string // ej "facturas_compra"
}

export default function FacturasGenericoFicha({ apiUrl, backHref, monolitoEditView }: Props) {
  const router = useRouter()
  const [data, setData] = useState<any | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(apiUrl)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "No encontrado" : `Error ${r.status}`)
          setData(null)
          return
        }
        setData(await r.json())
      })
      .catch(err => {
        console.error(err)
        setError("Error de red")
        setData(null)
      })
  }, [apiUrl])

  if (data === undefined) return <div className="p-12 text-center text-gray-500">Cargando...</div>
  if (data === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "No encontrado"}</p>
        <Link href={backHref} className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(backHref)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{data.numero}</h1>
        {data.estado && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoFacturaColor(data.estado)}`}>
            {getEstadoFacturaLabel(data.estado)}
          </span>
        )}
        <div className="ml-auto">
          <Link
            href={`/?module=compras&view=${monolitoEditView}`}
            className="text-sm text-indigo-700 hover:underline"
          >
            Editar en el módulo Compras →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={data.numero} />
            <Row label="Fecha" value={formatDate(data.fecha)} />
            {data.fecha_vencimiento && <Row label="Vencimiento" value={formatDate(data.fecha_vencimiento)} />}
            <Row label="Proveedor" value={data.proveedor_nombre} />
            {data.tipo && <Row label="Tipo" value={data.tipo} />}
            {data.moneda && <Row label="Moneda" value={data.moneda} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Importe</h3>
          <p className="text-3xl font-bold text-emerald-600">
            {formatCurrency(data.total, data.moneda ?? "ARS")}
          </p>
          {data.saldo !== undefined && (
            <p className="text-sm text-gray-500 mt-2">Saldo: {formatCurrency(data.saldo, data.moneda ?? "ARS")}</p>
          )}
          {data.observaciones && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      {Array.isArray(data.lineas) && data.lineas.length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Detalle</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2 font-medium">Descripción</th>
                <th className="text-center py-2 px-2 font-medium">Cant.</th>
                <th className="text-right py-2 px-2 font-medium">Precio</th>
                <th className="text-right py-2 px-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.lineas.map((l: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-sm">{l.descripcion ?? l.producto_nombre ?? "—"}</td>
                  <td className="py-2 px-2 text-center text-sm">{l.cantidad ?? 1}</td>
                  <td className="py-2 px-2 text-right text-sm">{formatCurrency(l.precio_unitario ?? l.precio ?? 0, data.moneda ?? "ARS")}</td>
                  <td className="py-2 px-2 text-right text-sm font-medium">{formatCurrency(l.subtotal ?? l.importe ?? 0, data.moneda ?? "ARS")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || "—"}</span>
    </div>
  )
}
