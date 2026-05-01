"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, DollarSign, Trash2, X } from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getEstadoFacturaColor,
  getEstadoFacturaLabel,
  type Factura,
} from "./_shared"

export default function FacturasFicha({ facturaId }: { facturaId: number }) {
  const router = useRouter()
  const [factura, setFactura] = useState<Factura | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [accionando, setAccionando] = useState(false)
  const [recibosVinculados, setRecibosVinculados] = useState<{ id: string | number; numero: string; estado: string; importe: number; moneda: string }[]>([])
  const [nvVinculadaId, setNvVinculadaId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/facturas?id=${facturaId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setFactura(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item) {
          setError("Factura no encontrada")
          setFactura(null)
          return
        }
        setFactura(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la factura")
        setFactura(null)
      })
  }, [facturaId])

  // Cargar recibos vinculados + resolver NV id desde número
  useEffect(() => {
    if (!factura) return
    fetch("/api/recibos")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        setRecibosVinculados(data
          .filter(r => Number(r.factura_id) === Number(factura.id))
          .map(r => ({
            id: r.id, numero: r.numero, estado: r.estado,
            importe: Number(r.importe ?? 0), moneda: r.moneda ?? "ARS",
          })))
      })
      .catch(() => {})
    if (factura.nota_venta_numero && !factura.nota_venta_id) {
      fetch(`/api/notas-venta?numero=${encodeURIComponent(factura.nota_venta_numero)}`)
        .then(r => r.json())
        .then((data: any) => {
          const nv = Array.isArray(data) ? data[0] : data
          if (nv?.id) setNvVinculadaId(nv.id)
        })
        .catch(() => {})
    } else if (factura.nota_venta_id) {
      setNvVinculadaId(factura.nota_venta_id)
    }
  }, [factura])

  const cancelarFactura = async () => {
    if (!motivoCancel.trim()) { alert("Ingresá un motivo"); return }
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/facturas/${facturaId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoCancel }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al cancelar: ${text}`)
        setAccionando(false)
        return
      }
      // Recargar
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setAccionando(false)
    }
  }

  const suprimirBorrador = async () => {
    if (!confirm("¿Suprimir definitivamente esta factura borrador? Esta acción no se puede deshacer.")) return
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/facturas/${facturaId}`, { method: "DELETE" })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al suprimir: ${text}`)
        setAccionando(false)
        return
      }
      router.push("/ventas/facturas")
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setAccionando(false)
    }
  }

  if (factura === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando factura...</div>
  }
  if (factura === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Factura no encontrada"}</p>
        <Link href="/ventas/facturas" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = factura.moneda ?? "ARS"
  const lineas = factura.facturas_lineas ?? []
  const vencimientos = factura.facturas_vencimientos ?? []
  const mediosPago = factura.factura_medios_pago ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/facturas")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{factura.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoFacturaColor(factura.estado)}`}>
          {getEstadoFacturaLabel(factura.estado)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {factura.estado === "borrador" && (
            <>
              <Link
                href={`/ventas/facturas/${factura.id}/editar`}
                className="text-sm text-indigo-700 hover:underline px-3 py-1.5"
              >
                Editar →
              </Link>
              <button
                onClick={suprimirBorrador}
                disabled={accionando}
                className="text-sm border border-red-300 text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Suprimir
              </button>
            </>
          )}
          {(factura.estado === "abierta" || factura.estado === "confirmada" || factura.estado === "parcial") && (
            <>
              <Link
                href={`/ventas/recibos/nueva?factura_id=${factura.id}`}
                className="text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
              >
                <DollarSign className="w-4 h-4" />
                Registrar Cobro
              </Link>
              <button
                onClick={() => setShowCancelarModal(true)}
                className="text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-1.5 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={factura.numero} />
            <Row label="Fecha" value={formatDate(factura.fecha)} />
            <Row label="Cliente" value={factura.cliente_nombre ?? "—"} />
            {factura.cliente_documento && <Row label="Documento" value={factura.cliente_documento} />}
            {factura.nota_venta_numero && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Nota de Venta</span>
                {nvVinculadaId ? (
                  <Link href={`/ventas/nv/${nvVinculadaId}`} className="font-medium text-emerald-700 hover:underline font-mono text-right">
                    {factura.nota_venta_numero}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-900 text-right">{factura.nota_venta_numero}</span>
                )}
              </div>
            )}
            {factura.vendedor_nombre && <Row label="Vendedor" value={factura.vendedor_nombre} />}
            {factura.domicilio_facturacion && <Row label="Domicilio" value={factura.domicilio_facturacion} />}
            {factura.termino_pago && <Row label="Término de pago" value={factura.termino_pago} />}
            {factura.fecha_vencimiento && <Row label="Vencimiento" value={formatDate(factura.fecha_vencimiento)} />}
            <Row label="Moneda" value={moneda} />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Total</h3>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(factura.total, moneda)}</p>
          <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
            {factura.subtotal != null && <Row label="Subtotal" value={formatCurrency(factura.subtotal, moneda)} />}
            {factura.descuento != null && factura.descuento > 0 && <Row label="Descuento" value={formatCurrency(factura.descuento, moneda)} />}
            {factura.impuestos != null && <Row label="Impuestos" value={formatCurrency(factura.impuestos, moneda)} />}
            {factura.saldo != null && <Row label="Saldo pendiente" value={formatCurrency(factura.saldo, moneda)} />}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5 mb-6">
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

      {vencimientos.length > 0 && (
        <div className="bg-white rounded-lg border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Vencimientos</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2 font-medium">Descripción</th>
                <th className="text-left py-2 px-2 font-medium">Fecha</th>
                <th className="text-right py-2 px-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {vencimientos.map((v, i) => (
                <tr key={v.id ?? i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-sm">{v.descripcion ?? "—"}</td>
                  <td className="py-2 px-2 text-sm">{formatDate(v.fecha)}</td>
                  <td className="py-2 px-2 text-right text-sm font-medium">{formatCurrency(v.total, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recibosVinculados.length > 0 && (
        <div className="bg-white rounded-lg border p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Recibos asociados</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2 font-medium">Número</th>
                <th className="text-center py-2 px-2 font-medium">Estado</th>
                <th className="text-right py-2 px-2 font-medium">Importe</th>
              </tr>
            </thead>
            <tbody>
              {recibosVinculados.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <Link href={`/ventas/recibos/${r.id}`} className="text-emerald-700 hover:underline font-mono text-sm">
                      {r.numero}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-center text-xs text-gray-600">{r.estado}</td>
                  <td className="py-2 px-2 text-right text-sm font-medium">{formatCurrency(r.importe, r.moneda as "ARS" | "USD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Factura {factura.numero}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Se generará un asiento de reversa por el total y la factura quedará en estado <strong>cancelada</strong>.
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
                onClick={cancelarFactura}
                disabled={accionando || !motivoCancel.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {accionando ? "Cancelando…" : "Cancelar Factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mediosPago.length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Medios de Pago</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2 font-medium">Medio</th>
                <th className="text-left py-2 px-2 font-medium">Tarjeta</th>
                <th className="text-center py-2 px-2 font-medium">Cuotas</th>
                <th className="text-right py-2 px-2 font-medium">Monto base</th>
                <th className="text-right py-2 px-2 font-medium">Recargo</th>
                <th className="text-right py-2 px-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {mediosPago.map((m, i) => (
                <tr key={m.id ?? i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-sm">{m.medio ?? "—"}</td>
                  <td className="py-2 px-2 text-sm">{m.tarjeta?.nombre ?? "—"}</td>
                  <td className="py-2 px-2 text-center text-sm">{m.cuotas ?? "—"}</td>
                  <td className="py-2 px-2 text-right text-sm">{m.monto_base != null ? formatCurrency(m.monto_base, moneda) : "—"}</td>
                  <td className="py-2 px-2 text-right text-sm">{m.total_recargo != null ? formatCurrency(m.total_recargo, moneda) : "—"}</td>
                  <td className="py-2 px-2 text-right text-sm font-medium">{m.total_acreditar != null ? formatCurrency(m.total_acreditar, moneda) : "—"}</td>
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
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value || "—"}</span>
    </div>
  )
}
