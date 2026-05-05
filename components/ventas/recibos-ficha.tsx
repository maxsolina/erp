"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, Download, Edit, X } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  formatCurrency,
  formatDate,
  getEstadoReciboColor,
  getEstadoReciboLabel,
  type Recibo,
} from "./_shared"

function formatDateTime(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function RecibosFicha({ reciboId }: { reciboId: string }) {
  const router = useRouter()
  const [recibo, setRecibo] = useState<Recibo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [cancelando, setCancelando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [nvVinculadaId, setNvVinculadaId] = useState<number | null>(null)
  const [facturaVinculadaId, setFacturaVinculadaId] = useState<number | null>(null)

  const confirmarRecibo = async () => {
    if (confirmando) return
    if (!confirm("¿Confirmar el recibo? Se publicará y se generarán los movimientos de caja, asiento contable e imputaciones.")) return
    setConfirmando(true)
    try {
      const res = await fetch(`/api/recibos/${reciboId}/publicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        alert(`No se pudo confirmar el recibo: ${err.error ?? res.statusText}`)
        setConfirmando(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setConfirmando(false)
    }
  }

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

  useEffect(() => {
    if (!recibo) return
    if (recibo.factura_id) {
      setFacturaVinculadaId(Number(recibo.factura_id))
    }
    if (recibo.nota_venta_id) {
      setNvVinculadaId(Number(recibo.nota_venta_id))
    } else if (recibo.nota_venta_numero) {
      fetch(`/api/notas-venta?numero=${encodeURIComponent(recibo.nota_venta_numero)}`)
        .then(r => r.json())
        .then((data: any) => {
          const nv = Array.isArray(data) ? data[0] : data
          if (nv?.id) setNvVinculadaId(nv.id)
        })
        .catch(() => {})
    }
  }, [recibo])

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push("/ventas/recibos")} className="hover:text-emerald-700">
          Recibos
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{recibo.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push("/ventas/recibos")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{recibo.numero}</h1>
            <p className="text-sm text-gray-500">
              {formatDateTime(recibo.fecha)}
              {recibo.sucursal && ` | ${recibo.sucursal}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recibo.estado === "borrador" && (
            <>
              <Link
                href={`/ventas/recibos/${recibo.id}/editar`}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar
              </Link>
              <button
                onClick={confirmarRecibo}
                disabled={confirmando}
                className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                {confirmando ? "Confirmando..." : "Confirmar"}
              </button>
            </>
          )}
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoReciboColor(recibo.estado)}`}>
            {getEstadoReciboLabel(recibo.estado)}
          </span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center gap-2 mb-0">
        <button
          disabled
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1 opacity-60 cursor-not-allowed"
          title="Descarga de PDF próximamente"
        >
          <Download className="w-4 h-4" /> Descargar PDF
        </button>
        {nvVinculadaId && (
          <Link
            href={`/ventas/nv/${nvVinculadaId}`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver Nota de Venta
          </Link>
        )}
        {facturaVinculadaId && (
          <Link
            href={`/ventas/facturas/${facturaVinculadaId}`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver Factura
          </Link>
        )}
        {recibo.estado === "publicado" && recibo.cliente_id && (
          <Link
            href={`/ventas/conciliacion?cliente_id=${recibo.cliente_id}&tab=historial`}
            className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
          >
            Ver Conciliación de Deuda
          </Link>
        )}
        {recibo.estado === "publicado" && (
          <button
            onClick={() => setShowCancelarModal(true)}
            className="ml-auto px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cancelar Recibo
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-b-lg shadow-sm p-6">
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Datos del Recibo</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Número:</span> <span className="font-medium">{recibo.numero}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(recibo.fecha)}</span></div>
              <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{recibo.sucursal ?? "-"}</span></div>
              <div><span className="text-gray-500">Caja:</span> <span className="font-medium">{recibo.caja_nombre ?? "-"}</span></div>
              {recibo.cobrador_nombre && (
                <div><span className="text-gray-500">Cobrador:</span> <span className="font-medium">{recibo.cobrador_nombre}</span></div>
              )}
              <div className="col-span-2">
                <span className="text-gray-500">Moneda:</span>{" "}
                <span className="font-medium">{moneda}</span>
                {moneda !== "ARS" && (recibo.cotizacion ?? 0) > 0 && (
                  <span className="text-gray-500 ml-2">
                    · {recibo.tipo_cotizacion ?? "blue"} · 1 {moneda} = ${(recibo.cotizacion ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div>
                <span className="text-gray-500">NV:</span>{" "}
                {nvVinculadaId ? (
                  <Link href={`/ventas/nv/${nvVinculadaId}`} className="font-medium text-emerald-700 hover:underline">
                    {recibo.nota_venta_numero ?? `#${nvVinculadaId}`}
                  </Link>
                ) : (
                  <span className="font-medium">{recibo.nota_venta_numero ?? "-"}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500">Factura:</span>{" "}
                {facturaVinculadaId ? (
                  <Link href={`/ventas/facturas/${facturaVinculadaId}`} className="font-medium text-emerald-700 hover:underline">
                    Ver →
                  </Link>
                ) : (
                  <span className="font-medium">-</span>
                )}
              </div>
              {recibo.concepto && (
                <div className="col-span-2"><span className="text-gray-500">Concepto:</span> <span className="font-medium">{recibo.concepto}</span></div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Cliente</h3>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{recibo.cliente_nombre ?? "—"}</span></div>
            </div>
          </div>
        </div>

        {/* Importe destacado */}
        <div className="grid grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-6">
          <div>
            <span className="text-gray-500 block">Importe</span>
            <span className="font-bold text-2xl text-emerald-600">{formatCurrency(recibo.importe, moneda)}</span>
          </div>
          {recibo.importe_no_conciliado != null && (
            <div>
              <span className="text-gray-500 block">Sin conciliar</span>
              <span className="font-medium">{formatCurrency(recibo.importe_no_conciliado, moneda)}</span>
            </div>
          )}
          {recibo.importe_no_conciliado_ars != null && moneda !== "ARS" && (
            <div>
              <span className="text-gray-500 block">Sin conciliar (ARS)</span>
              <span className="font-medium">{formatCurrency(recibo.importe_no_conciliado_ars, "ARS")}</span>
            </div>
          )}
          {recibo.fecha_publicacion && (
            <div>
              <span className="text-gray-500 block">Publicado</span>
              <span className="font-medium">{formatDate(recibo.fecha_publicacion)}</span>
            </div>
          )}
          {recibo.fecha_cancelacion && (
            <div>
              <span className="text-gray-500 block">Cancelado</span>
              <span className="font-medium">{formatDate(recibo.fecha_cancelacion)}</span>
            </div>
          )}
        </div>

        {recibo.motivo_cancelacion && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm">
            <span className="text-red-700 font-medium">Motivo de cancelación: </span>
            <span className="text-red-600">{recibo.motivo_cancelacion}</span>
          </div>
        )}

        {/* Pagos / Medios de pago */}
        {Array.isArray((recibo as any).recibo_pagos) && (recibo as any).recibo_pagos.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Pagos</h3>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                  <th className="text-left py-2 px-3">Valor</th>
                  <th className="text-left py-2 px-3">Tarjeta</th>
                  <th className="text-center py-2 px-3">Cuotas</th>
                  <th className="text-right py-2 px-3">Importe Comp.</th>
                  <th className="text-center py-2 px-3">Mon. Comp.</th>
                  <th className="text-right py-2 px-3">Importe</th>
                  <th className="text-center py-2 px-3">Moneda</th>
                </tr>
              </thead>
              <tbody>
                {(recibo as any).recibo_pagos.map((p: any, i: number) => (
                  <tr key={p.id ?? i} className="border-b border-gray-100">
                    <td className="py-2 px-3 font-medium">{p.valor_nombre ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-600">{p.es_tarjeta ? (p.tarjeta_nombre ?? "Tarjeta") : "—"}</td>
                    <td className="py-2 px-3 text-center">{p.es_tarjeta ? p.cantidad_cuotas ?? 1 : "—"}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(Number(p.importe_comprobante ?? p.importe ?? 0), (p.moneda_comprobante ?? p.moneda) as "ARS" | "USD")}</td>
                    <td className="py-2 px-3 text-center text-gray-500">{p.moneda_comprobante ?? p.moneda}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(Number(p.importe ?? 0), p.moneda as "ARS" | "USD")}</td>
                    <td className="py-2 px-3 text-center text-gray-500">{p.moneda}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Comprobantes imputados */}
        {Array.isArray((recibo as any).recibo_imputaciones) && (recibo as any).recibo_imputaciones.filter((i: any) => Number(i.asignacion ?? 0) > 0).length > 0 && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Comprobantes conciliados</h3>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                  <th className="text-left py-2 px-3">Tipo</th>
                  <th className="text-left py-2 px-3">Comprobante</th>
                  <th className="text-left py-2 px-3">Fecha</th>
                  <th className="text-right py-2 px-3">Saldo</th>
                  <th className="text-right py-2 px-3">Asignación</th>
                  <th className="text-center py-2 px-3">Moneda</th>
                </tr>
              </thead>
              <tbody>
                {(recibo as any).recibo_imputaciones
                  .filter((i: any) => Number(i.asignacion ?? 0) > 0)
                  .map((i: any, idx: number) => {
                    const tipoLabel = i.tipo_comprobante === "factura" ? "Factura"
                      : i.tipo_comprobante === "nota_credito" ? "NC"
                      : i.tipo_comprobante === "nota_debito"  ? "ND"
                      : i.tipo_comprobante === "ajuste"       ? "Ajuste"
                      : (i.tipo_comprobante ?? "—")
                    const tipoColor = i.tipo_comprobante === "factura" ? "bg-blue-100 text-blue-700"
                      : i.tipo_comprobante === "nota_credito" ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-700"
                    return (
                      <tr key={i.id ?? idx} className="border-b border-gray-100">
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor}`}>{tipoLabel}</span>
                        </td>
                        <td className="py-2 px-3 font-mono">{i.comprobante_referencia ?? "—"}</td>
                        <td className="py-2 px-3 text-gray-600">{i.fecha_comprobante ? formatDate(i.fecha_comprobante) : "—"}</td>
                        <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(Number(i.saldo_actual ?? i.saldo_moneda ?? 0), (i.moneda_comprobante ?? "ARS") as "ARS" | "USD")}</td>
                        <td className="py-2 px-3 text-right font-medium text-emerald-700">{formatCurrency(Number(i.asignacion ?? 0), (i.moneda_comprobante ?? "ARS") as "ARS" | "USD")}</td>
                        <td className="py-2 px-3 text-center text-gray-500">{i.moneda_comprobante ?? "ARS"}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </>
        )}

        {recibo.observaciones && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Observaciones</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{recibo.observaciones}</p>
          </>
        )}
      </div>

      {/* Modal Cancelar */}
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
                {cancelando ? "Cancelando..." : "Cancelar Recibo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SeguimientoPanel tipoDocumento="recibo" documentoId={recibo.id} />
    </div>
  )
}
