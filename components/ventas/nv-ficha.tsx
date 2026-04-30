"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getEstadoNVColor,
  getEstadoNVLabel,
  type NotaVentaDetalle,
} from "./_shared"

export default function NvFicha({ nvId }: { nvId: number }) {
  const router = useRouter()
  const [nv, setNv] = useState<NotaVentaDetalle | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/notas-venta/${nvId}`)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "Nota de venta no encontrada" : `Error ${r.status}`)
          setNv(null)
          return
        }
        const data = await r.json()
        setNv(data)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la NV")
        setNv(null)
      })
  }, [nvId])

  if (nv === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando NV...</div>
  }
  if (nv === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Nota de venta no encontrada"}</p>
        <Link href="/ventas/nv" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = nv.moneda ?? "ARS"
  const lineas = nv.notas_venta_lineas ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/nv")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{nv.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoNVColor(nv.estado)}`}>
          {getEstadoNVLabel(nv.estado)}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/?module=ventas&view=notas_venta&id=${nv.id}`}
            className="text-sm text-indigo-700 hover:underline"
          >
            Editar en el módulo Ventas →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={nv.numero} />
            <Row label="Fecha" value={formatDate(nv.fecha)} />
            <Row label="Cliente" value={nv.cliente_nombre ?? "—"} />
            {nv.cliente_codigo && <Row label="Código cliente" value={nv.cliente_codigo} />}
            {nv.vendedor_nombre && <Row label="Vendedor" value={nv.vendedor_nombre} />}
            {(nv.deposito || nv.sucursal) && <Row label="Depósito" value={nv.deposito ?? nv.sucursal ?? "—"} />}
            <Row label="Moneda" value={moneda} />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Total</h3>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(nv.total, moneda)}</p>
          {(nv.subtotal != null || nv.impuestos != null) && (
            <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
              {nv.subtotal != null && <Row label="Subtotal" value={formatCurrency(nv.subtotal, moneda)} />}
              {nv.impuestos != null && <Row label="Impuestos" value={formatCurrency(nv.impuestos, moneda)} />}
            </div>
          )}
          {nv.notas && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Notas</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{nv.notas}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Líneas</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium">Producto</th>
              <th className="text-center py-2 px-2 font-medium">Cantidad</th>
              <th className="text-right py-2 px-2 font-medium">Precio</th>
              <th className="text-right py-2 px-2 font-medium">Descuento</th>
              <th className="text-right py-2 px-2 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={l.id ?? i} className="border-b border-gray-100">
                <td className="py-2 px-2 text-sm">
                  <p>{l.producto_nombre}</p>
                  {l.descripcion && <p className="text-xs text-gray-500">{l.descripcion}</p>}
                </td>
                <td className="py-2 px-2 text-center text-sm">{l.cantidad}</td>
                <td className="py-2 px-2 text-right text-sm">{formatCurrency(l.precio_unitario, moneda)}</td>
                <td className="py-2 px-2 text-right text-sm">{l.descuento ? formatCurrency(l.descuento, moneda) : "—"}</td>
                <td className="py-2 px-2 text-right text-sm font-medium">
                  {formatCurrency(l.subtotal ?? l.cantidad * l.precio_unitario, moneda)}
                </td>
              </tr>
            ))}
            {lineas.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-sm">Sin líneas</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
