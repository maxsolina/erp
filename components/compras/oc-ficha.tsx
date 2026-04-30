"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getEstadoOcColor,
  getEstadoOcLabel,
  type OrdenCompraDetalle,
} from "./_shared"

export default function OcFicha({ ocId }: { ocId: number }) {
  const router = useRouter()
  const [oc, setOc] = useState<OrdenCompraDetalle | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/compras/ordenes-compra/${ocId}`)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "OC no encontrada" : `Error ${r.status}`)
          setOc(null)
          return
        }
        const data = await r.json()
        setOc(data)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la OC")
        setOc(null)
      })
  }, [ocId])

  if (oc === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando OC...</div>
  }
  if (oc === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "OC no encontrada"}</p>
        <Link href="/compras/oc" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/compras/oc")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{oc.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoOcColor(oc.estado)}`}>
          {getEstadoOcLabel(oc.estado)}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/?module=compras&view=ordenes_compra`}
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
            <Row label="Número" value={oc.numero} />
            <Row label="Fecha" value={formatDate(oc.fecha)} />
            <Row label="Proveedor" value={oc.proveedor_nombre} />
            {oc.sucursal && <Row label="Sucursal" value={oc.sucursal} />}
            <Row label="Moneda" value={oc.moneda ?? "ARS"} />
            {oc.fecha_entrega_estimada && (
              <Row label="Fecha entrega estimada" value={formatDate(oc.fecha_entrega_estimada)} />
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Total</h3>
          <p className="text-3xl font-bold text-emerald-600">
            {formatCurrency(oc.total, oc.moneda ?? "ARS")}
          </p>
          {oc.observaciones && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{oc.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Productos</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium">Código</th>
              <th className="text-left py-2 px-2 font-medium">Producto</th>
              <th className="text-center py-2 px-2 font-medium">Cantidad</th>
              <th className="text-center py-2 px-2 font-medium">Recibida</th>
              <th className="text-right py-2 px-2 font-medium">Precio</th>
              <th className="text-right py-2 px-2 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(oc.items ?? []).map((it, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2 font-mono text-xs text-gray-500">{it.sku ?? it.codigo ?? "—"}</td>
                <td className="py-2 px-2 text-sm">{it.nombre}</td>
                <td className="py-2 px-2 text-center text-sm">{it.cantidad}</td>
                <td className="py-2 px-2 text-center text-sm">{it.cantidad_recibida ?? 0}</td>
                <td className="py-2 px-2 text-right text-sm">{formatCurrency(it.precio, oc.moneda ?? "ARS")}</td>
                <td className="py-2 px-2 text-right text-sm font-medium">
                  {formatCurrency(it.subtotal ?? it.precio * it.cantidad, oc.moneda ?? "ARS")}
                </td>
              </tr>
            ))}
            {(!oc.items || oc.items.length === 0) && (
              <tr><td colSpan={6} className="py-4 text-center text-gray-400 text-sm">Sin items</td></tr>
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
