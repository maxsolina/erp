"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatDate,
  getEstadoRecepcionColor,
  getEstadoRecepcionLabel,
  type RecepcionDetalle,
} from "./_shared"

export default function RecepcionFicha({ recId }: { recId: number }) {
  const router = useRouter()
  const [rec, setRec] = useState<RecepcionDetalle | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/compras/recepciones/${recId}`)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "Recepción no encontrada" : `Error ${r.status}`)
          setRec(null)
          return
        }
        setRec(await r.json())
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la recepción")
        setRec(null)
      })
  }, [recId])

  if (rec === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando recepción...</div>
  }
  if (rec === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Recepción no encontrada"}</p>
        <Link href="/compras/recepciones" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/compras/recepciones")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{rec.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoRecepcionColor(rec.estado)}`}>
          {getEstadoRecepcionLabel(rec.estado)}
        </span>
        <div className="ml-auto">
          <Link
            href={`/?module=compras&view=recepciones`}
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
            <Row label="Número" value={rec.numero} />
            <Row label="Fecha" value={formatDate(rec.fecha)} />
            <Row label="Proveedor" value={rec.proveedor_nombre} />
            {rec.orden_compra_numero && <Row label="OC Origen" value={rec.orden_compra_numero} />}
            {rec.sucursal && <Row label="Sucursal" value={rec.sucursal} />}
            {rec.deposito_destino && <Row label="Depósito destino" value={rec.deposito_destino} />}
            {rec.ubicacion && <Row label="Ubicación" value={rec.ubicacion} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Origen</h3>
          <p className="text-sm text-gray-700">{rec.documento_origen_ref ?? rec.orden_compra_numero ?? "—"}</p>
          {rec.observaciones && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{rec.observaciones}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Productos recibidos</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium">Producto</th>
              <th className="text-center py-2 px-2 font-medium">Cantidad</th>
              <th className="text-left py-2 px-2 font-medium">Series / IMEI</th>
            </tr>
          </thead>
          <tbody>
            {(rec.lineas ?? []).map((l, i) => (
              <tr key={i} className="border-b border-gray-100 align-top">
                <td className="py-2 px-2 text-sm">{l.producto_nombre}</td>
                <td className="py-2 px-2 text-center text-sm">{l.cantidad}</td>
                <td className="py-2 px-2 text-sm">
                  {l.unidades_serie?.length
                    ? l.unidades_serie.map((u, j) => (
                        <div key={j} className="font-mono text-xs text-gray-600">
                          {u.nro_serie}
                          {u.color && ` · ${u.color}`}
                          {u.bateria_pct !== undefined && ` · ${u.bateria_pct}%`}
                          {u.outlet && " · Outlet"}
                        </div>
                      ))
                    : <span className="text-gray-400 text-xs">—</span>}
                </td>
              </tr>
            ))}
            {(!rec.lineas || rec.lineas.length === 0) && (
              <tr><td colSpan={3} className="py-4 text-center text-gray-400 text-sm">Sin productos</td></tr>
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
