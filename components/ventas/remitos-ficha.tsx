"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, X } from "lucide-react"
import {
  formatDate,
  getEstadoRemitoColor,
  getEstadoRemitoLabel,
  type Remito,
} from "./_shared"

interface DocLink { id: number | string; numero: string; href: string }

export default function RemitosFicha({ remitoId }: { remitoId: number }) {
  const router = useRouter()
  const [remito, setRemito] = useState<Remito | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const [nvLink, setNvLink] = useState<DocLink | null>(null)
  const [oeLink, setOeLink] = useState<DocLink | null>(null)
  const [facturaLink, setFacturaLink] = useState<DocLink | null>(null)

  useEffect(() => {
    fetch(`/api/remitos-venta?id=${remitoId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setRemito(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item) {
          setError("Remito no encontrado")
          setRemito(null)
          return
        }
        setRemito(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar el remito")
        setRemito(null)
      })
  }, [remitoId])

  // Cross-refs
  useEffect(() => {
    if (!remito) return
    if (remito.nota_venta_id) {
      setNvLink({ id: remito.nota_venta_id, numero: remito.nota_venta_numero ?? `#${remito.nota_venta_id}`, href: `/ventas/nv/${remito.nota_venta_id}` })
    }
    if (remito.orden_entrega_id) {
      setOeLink({ id: remito.orden_entrega_id, numero: remito.orden_entrega_numero ?? `#${remito.orden_entrega_id}`, href: `/ventas/oe/${remito.orden_entrega_id}` })
    }
    if (remito.factura_numero) {
      // Resolver id de factura por número
      fetch(`/api/facturas?numero=${encodeURIComponent(remito.factura_numero)}`)
        .then(r => r.json())
        .then((data: any) => {
          const f = Array.isArray(data) ? data[0] : data
          if (f?.id) setFacturaLink({ id: f.id, numero: remito.factura_numero!, href: `/ventas/facturas/${f.id}` })
        })
        .catch(() => {})
    }
  }, [remito])

  const confirmar = async () => {
    if (!remito) return
    if (accionando) return
    if (!confirm(`Confirmar el remito ${remito.numero}? Esto va a descontar stock y emitir el asiento contable de CMV.`)) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/remitos/${remitoId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remito_numero: remito.numero,
          nv_numero: remito.nota_venta_numero ?? null,
          oe_numero: remito.orden_entrega_numero ?? null,
          deposito_nombre: remito.deposito ?? null,
          ubicacion_nombre: remito.ubicacion ?? null,
          usuario: "sistema",
          lineas: (remito.lineas ?? []).map(l => ({
            producto_id: l.producto_id,
            producto_nombre: l.producto_nombre,
            cantidad: l.cantidad,
            requiere_serie: l.requiere_serie ?? false,
            series_seleccionadas: l.series_seleccionadas ?? [],
          })),
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al confirmar: ${text}`)
        setAccionando(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setAccionando(false)
    }
  }

  const cancelar = async () => {
    if (!remito) return
    if (accionando) return
    setAccionando(true)
    try {
      const res = await fetch(`/api/remitos/${remitoId}/cancelar`, { method: "POST" })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al cancelar: ${text}`)
        setAccionando(false)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
      setAccionando(false)
    }
  }

  if (remito === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando remito...</div>
  }
  if (remito === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Remito no encontrado"}</p>
        <Link href="/ventas/remitos" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const lineas = remito.lineas ?? []
  const esEmitido = remito.estado === "emitido" || remito.estado === "en_ejecucion"
  const esConfirmado = remito.estado === "entregado" || remito.estado === "aprobado"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/remitos")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{remito.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoRemitoColor(remito.estado)}`}>
          {getEstadoRemitoLabel(remito.estado)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {esEmitido && (
            <button
              onClick={confirmar}
              disabled={accionando}
              className="text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {accionando ? "Confirmando…" : "Confirmar"}
            </button>
          )}
          {(esEmitido || esConfirmado) && (
            <button
              onClick={() => setShowCancelarModal(true)}
              className="text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={remito.numero} />
            {remito.fecha && <Row label="Fecha" value={formatDate(remito.fecha)} />}
            <Row label="Cliente" value={remito.cliente_nombre ?? "—"} />
            {oeLink && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">OE</span>
                <Link href={oeLink.href} className="font-medium text-emerald-700 hover:underline font-mono text-right">
                  {oeLink.numero}
                </Link>
              </div>
            )}
            {nvLink && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">NV</span>
                <Link href={nvLink.href} className="font-medium text-emerald-700 hover:underline font-mono text-right">
                  {nvLink.numero}
                </Link>
              </div>
            )}
            {facturaLink && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Factura</span>
                <Link href={facturaLink.href} className="font-medium text-emerald-700 hover:underline font-mono text-right">
                  {facturaLink.numero}
                </Link>
              </div>
            )}
            {remito.domicilio_envio && <Row label="Domicilio" value={remito.domicilio_envio} />}
            {remito.deposito && <Row label="Depósito" value={remito.deposito} />}
            {remito.sucursal && <Row label="Sucursal" value={remito.sucursal} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Logística</h3>
          <div className="space-y-3 text-sm">
            {remito.peso_kg != null && <Row label="Peso bruto" value={`${remito.peso_kg} kg`} />}
            {remito.peso_neto_kg != null && <Row label="Peso neto" value={`${remito.peso_neto_kg} kg`} />}
            {remito.bultos != null && <Row label="Bultos" value={String(remito.bultos)} />}
            {remito.valor_declarado != null && <Row label="Valor declarado" value={String(remito.valor_declarado)} />}
            <Row label="Control Factura" value={remito.control_factura === "facturado" ? "Facturado" : "Pendiente"} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Líneas</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium">Producto</th>
              <th className="text-center py-2 px-2 font-medium">Cantidad</th>
              <th className="text-left py-2 px-2 font-medium">Series</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2 text-sm">{l.producto_nombre}</td>
                <td className="py-2 px-2 text-center text-sm">{l.cantidad}</td>
                <td className="py-2 px-2 text-sm font-mono text-xs text-gray-600">
                  {(l.series_seleccionadas ?? []).map(s => s.serie).join(", ") || "—"}
                </td>
              </tr>
            ))}
            {lineas.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-gray-400 text-sm">Sin líneas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Remito {remito.numero}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Si el remito está confirmado, se revertirán los movimientos de stock y el asiento contable.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelarModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={cancelar}
                disabled={accionando}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {accionando ? "Cancelando…" : "Cancelar Remito"}
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
