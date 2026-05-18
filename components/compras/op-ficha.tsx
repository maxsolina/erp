"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, Download, Edit, X } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"
import { formatCurrency, formatDate } from "@/lib/format"

// ─── Helpers de estado OP ────────────────────────────────────────────────────
function getEstadoOpColor(estado?: string) {
  if (estado === "publicado") return "bg-green-100 text-green-700"
  if (estado === "cancelado") return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}
function getEstadoOpLabel(estado?: string) {
  const labels: Record<string, string> = {
    borrador: "Borrador",
    publicado: "Publicado",
    cancelado: "Cancelado",
  }
  return labels[estado ?? ""] ?? (estado ?? "—")
}

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

export default function OpFicha({ opId }: { opId: string }) {
  const router = useRouter()
  const [op, setOp] = useState<any | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [cancelando, setCancelando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [ocVinculadaId, setOcVinculadaId] = useState<number | null>(null)

  const confirmarOP = async () => {
    if (confirmando) return
    if (!confirm("¿Confirmar la OP? Se publicará y se generarán los movimientos de caja, asiento contable e imputaciones.")) return
    setConfirmando(true)
    try {
      const res = await fetch(`/api/compras/ordenes-pago/${opId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        alert(`No se pudo confirmar la OP: ${err.error ?? res.statusText}`)
        setConfirmando(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setConfirmando(false)
    }
  }

  const cancelarOP = async () => {
    if (!motivoCancel.trim()) { alert("Ingresá un motivo"); return }
    if (cancelando) return
    setCancelando(true)
    try {
      const res = await fetch(`/api/compras/ordenes-pago/${opId}/cancelar`, {
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
    fetch(`/api/compras/ordenes-pago/${opId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setOp(null)
          return
        }
        const data = await r.json()
        if (!data) {
          setError("OP no encontrada")
          setOp(null)
          return
        }
        setOp(data)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la OP")
        setOp(null)
      })
  }, [opId])

  useEffect(() => {
    if (!op) return
    if (op.orden_compra_id) {
      setOcVinculadaId(Number(op.orden_compra_id))
    }
  }, [op])

  if (op === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando OP...</div>
  }
  if (op === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "OP no encontrada"}</p>
        <Link href="/compras/op" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = (op.moneda ?? "ARS") as "ARS" | "USD"
  const importe = Number(op.importe ?? op.total ?? 0)
  const noConciliado = Number(op.importe_no_conciliado ?? 0)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push("/compras/op")} className="hover:text-emerald-700">
          Órdenes de Pago
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{op.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push("/compras/op")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{op.numero}</h1>
            <p className="text-sm text-gray-500">
              {formatDateTime(op.fecha)}
              {op.sucursal_nombre && ` | ${op.sucursal_nombre}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {op.estado === "borrador" && (
            <>
              <Link
                href={`/compras/op/${op.id}/editar`}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar
              </Link>
              <button
                onClick={confirmarOP}
                disabled={confirmando}
                className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                {confirmando ? "Confirmando..." : "Confirmar"}
              </button>
            </>
          )}
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoOpColor(op.estado)}`}>
            {getEstadoOpLabel(op.estado)}
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
        {ocVinculadaId && (
          <Link
            href={`/compras/oc/${ocVinculadaId}`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver Orden de Compra
          </Link>
        )}
        {op.estado === "publicado" && (
          <button
            onClick={() => setShowCancelarModal(true)}
            className="ml-auto px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cancelar OP
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-b-lg shadow-sm p-6">
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Datos de la OP</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Número:</span> <span className="font-medium">{op.numero}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(op.fecha)}</span></div>
              <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{op.sucursal_nombre ?? "-"}</span></div>
              <div><span className="text-gray-500">Caja:</span> <span className="font-medium">{op.caja_nombre ?? "-"}</span></div>
              <div className="col-span-2">
                <span className="text-gray-500">Moneda:</span>{" "}
                <span className="font-medium">{moneda}</span>
                {moneda !== "ARS" && Number(op.cotizacion ?? 0) > 0 && (
                  <span className="text-gray-500 ml-2">
                    · {op.tipo_cotizacion ?? "blue"} · 1 {moneda} = ${Number(op.cotizacion).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              {ocVinculadaId && (
                <div>
                  <span className="text-gray-500">OC:</span>{" "}
                  <Link href={`/compras/oc/${ocVinculadaId}`} className="font-medium text-emerald-700 hover:underline">
                    {op.orden_compra_numero ?? `#${ocVinculadaId}`}
                  </Link>
                </div>
              )}
              {op.concepto && (
                <div className="col-span-2"><span className="text-gray-500">Concepto:</span> <span className="font-medium">{op.concepto}</span></div>
              )}
              {op.periodo && (
                <div><span className="text-gray-500">Período:</span> <span className="font-medium">{op.periodo}</span></div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Proveedor</h3>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{op.proveedor_nombre ?? "—"}</span></div>
            </div>
          </div>
        </div>

        {/* Importe destacado */}
        <div className="grid grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-6">
          <div>
            <span className="text-gray-500 block">Importe</span>
            <span className="font-bold text-2xl text-emerald-600">{formatCurrency(importe, moneda)}</span>
          </div>
          {noConciliado > 0 && (
            <div>
              <span className="text-gray-500 block">Sin conciliar</span>
              <span className="font-medium text-amber-700">{formatCurrency(noConciliado, moneda)}</span>
            </div>
          )}
          {op.importe_a_cuenta != null && Number(op.importe_a_cuenta) > 0 && (
            <div>
              <span className="text-gray-500 block">A cuenta</span>
              <span className="font-medium">{formatCurrency(Number(op.importe_a_cuenta), moneda)}</span>
            </div>
          )}
          {op.updated_at && op.estado === "publicado" && (
            <div>
              <span className="text-gray-500 block">Publicado</span>
              <span className="font-medium">{formatDate(op.updated_at)}</span>
            </div>
          )}
        </div>

        {/* Medios de pago */}
        {Array.isArray(op.medios_pago) && op.medios_pago.length > 0 && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Medios de Pago</h3>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                  <th className="text-left py-2 px-3">Valor</th>
                  <th className="text-right py-2 px-3">Importe Comp.</th>
                  <th className="text-center py-2 px-3">Mon. Comp.</th>
                  <th className="text-right py-2 px-3">Importe</th>
                  <th className="text-center py-2 px-3">Moneda</th>
                </tr>
              </thead>
              <tbody>
                {op.medios_pago.map((m: any, i: number) => {
                  const monedaPropia = (m.moneda ?? "ARS") as "ARS" | "USD"
                  const monedaCmp = (m.moneda_comp ?? m.moneda ?? "ARS") as "ARS" | "USD"
                  return (
                    <tr key={m.id ?? i} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium">{m.forma_pago_nombre ?? m.nombre ?? "—"}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(Number(m.importe_comp ?? m.importe ?? 0), monedaCmp)}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{monedaCmp}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(Number(m.importe ?? 0), monedaPropia)}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{monedaPropia}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Comprobantes imputados */}
        {Array.isArray(op.comprobantes) && op.comprobantes.length > 0 && (
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
                {op.comprobantes.map((c: any, idx: number) => {
                  const tipoLabel = c.tipo === "debito" ? "Factura"
                    : c.tipo === "credito" ? "NC"
                    : (c.tipo ?? "—")
                  const tipoColor = c.tipo === "debito" ? "bg-blue-100 text-blue-700"
                    : c.tipo === "credito" ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-700"
                  const monedaCmp = (c.moneda_comp ?? "ARS") as "ARS" | "USD"
                  return (
                    <tr key={c.id ?? idx} className="border-b border-gray-100">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor}`}>{tipoLabel}</span>
                      </td>
                      <td className="py-2 px-3 font-mono">{c.referencia ?? "—"}</td>
                      <td className="py-2 px-3 text-gray-600">{c.fecha ? formatDate(c.fecha) : "—"}</td>
                      <td className="py-2 px-3 text-right text-gray-600">{formatCurrency(Number(c.saldo_original ?? c.saldo ?? 0), monedaCmp)}</td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-700">{formatCurrency(Number(c.importe ?? 0), monedaCmp)}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{monedaCmp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}

        {op.observaciones && (
          <>
            <h3 className="font-semibold text-gray-900 border-b pb-2 mb-3">Observaciones</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{op.observaciones}</p>
          </>
        )}
      </div>

      {/* Modal Cancelar */}
      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar OP {op.numero}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Se revertirán los movimientos de caja, los saldos de las facturas imputadas, las NCs aplicadas y el asiento contable.
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
                onClick={cancelarOP}
                disabled={cancelando || !motivoCancel.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {cancelando ? "Cancelando..." : "Cancelar OP"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SeguimientoPanel tipoDocumento="orden_pago" documentoId={op.id} />
    </div>
  )
}
