"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, X } from "lucide-react"
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
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [cancelando, setCancelando] = useState(false)

  const cancelarRecibo = async () => {
    if (!motivoCancel.trim()) { alert("Ingresá un motivo"); return }
    if (cancelando) return
    setCancelando(true)
    try {
      const res = await fetch(`/api/recibos/${reciboId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoCancel }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al cancelar: ${text}`)
        setCancelando(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setCancelando(false)
    }
  }

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
        <div className="ml-auto flex items-center gap-2">
          {recibo.estado === "borrador" && (
            <Link
              href={`/ventas/recibos/${recibo.id}/editar`}
              className="text-sm text-indigo-700 hover:underline px-3 py-1.5"
            >
              Editar →
            </Link>
          )}
          {recibo.estado === "publicado" && (
            <button
              onClick={() => setShowCancelarModal(true)}
              className="text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancelar Recibo
            </button>
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

      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Recibo {recibo.numero}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Se revertirán los movimientos de caja, los saldos de las facturas imputadas, los cupones y el asiento contable.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo *</label>
            <textarea
              value={motivoCancel}
              onChange={e => setMotivoCancel(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowCancelarModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={cancelarRecibo}
                disabled={cancelando || !motivoCancel.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {cancelando ? "Cancelando…" : "Cancelar Recibo"}
              </button>
            </div>
          </div>
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
