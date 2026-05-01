"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getEstadoReciboColor,
  getEstadoReciboLabel,
  type Recibo,
} from "./_shared"

export default function RecibosFicha({ reciboId }: { reciboId: string }) {
  const router = useRouter()
  const [recibo, setRecibo] = useState<Recibo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/recibos?id=${encodeURIComponent(reciboId)}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setRecibo(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item) {
          setError("Recibo no encontrado")
          setRecibo(null)
          return
        }
        setRecibo(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar el recibo")
        setRecibo(null)
      })
  }, [reciboId])

  if (recibo === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando recibo...</div>
  }
  if (recibo === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Recibo no encontrado"}</p>
        <Link href="/ventas/recibos" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = recibo.moneda ?? "ARS"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/recibos")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{recibo.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoReciboColor(recibo.estado)}`}>
          {getEstadoReciboLabel(recibo.estado)}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {recibo.estado === "borrador" && (
            <Link
              href={`/ventas/recibos/${recibo.id}/editar`}
              className="text-sm text-indigo-700 hover:underline"
            >
              Editar →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={recibo.numero} />
            <Row label="Fecha" value={formatDate(recibo.fecha)} />
            <Row label="Cliente" value={recibo.cliente_nombre ?? "—"} />
            {recibo.caja_nombre && <Row label="Caja" value={recibo.caja_nombre} />}
            {recibo.cobrador_nombre && <Row label="Cobrador" value={recibo.cobrador_nombre} />}
            {recibo.nota_venta_numero && <Row label="Nota de Venta" value={recibo.nota_venta_numero} />}
            {recibo.concepto && <Row label="Concepto" value={recibo.concepto} />}
            {recibo.sucursal && <Row label="Sucursal" value={recibo.sucursal} />}
            <Row label="Moneda" value={moneda} />
            {recibo.cotizacion != null && <Row label="Cotización" value={String(recibo.cotizacion)} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Importe</h3>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(recibo.importe, moneda)}</p>
          {(recibo.importe_no_conciliado != null || recibo.importe_no_conciliado_ars != null) && (
            <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
              {recibo.importe_no_conciliado != null && (
                <Row label="Sin conciliar" value={formatCurrency(recibo.importe_no_conciliado, moneda)} />
              )}
              {recibo.importe_no_conciliado_ars != null && moneda !== "ARS" && (
                <Row label="Sin conciliar (ARS)" value={formatCurrency(recibo.importe_no_conciliado_ars, "ARS")} />
              )}
            </div>
          )}
          {recibo.fecha_publicacion && (
            <div className="mt-4 pt-4 border-t text-sm">
              <Row label="Publicado" value={formatDate(recibo.fecha_publicacion)} />
            </div>
          )}
          {recibo.fecha_cancelacion && (
            <div className="mt-2 text-sm">
              <Row label="Cancelado" value={formatDate(recibo.fecha_cancelacion)} />
              {recibo.motivo_cancelacion && (
                <p className="text-xs text-gray-500 mt-1">{recibo.motivo_cancelacion}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {recibo.observaciones && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-2 pb-2 border-b">Observaciones</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{recibo.observaciones}</p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value || "—"}</span>
    </div>
  )
}
