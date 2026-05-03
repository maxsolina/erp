"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, Download, X } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import {
  formatCurrency,
  formatDate,
  type Remito,
} from "./_shared"

interface DocLink { id: number | string; numero: string; href: string }

interface Cliente {
  id: number
  nombre: string
  tipo_documento?: string
  numero_documento?: string | null
  telefono?: string | null
  celular?: string | null
  email?: string | null
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

function getEstadoColorRem(estado?: string) {
  switch (estado) {
    case "entregado": return "bg-green-100 text-green-700"
    case "en_transito": return "bg-blue-100 text-blue-700"
    case "aprobado": return "bg-emerald-100 text-emerald-700"
    case "borrador": return "bg-amber-100 text-amber-700"
    case "emitido": return "bg-amber-100 text-amber-700"
    case "en_ejecucion": return "bg-yellow-100 text-yellow-700"
    case "cancelado": return "bg-red-100 text-red-700"
    default: return "bg-gray-100 text-gray-700"
  }
}

function getEstadoLabelRem(estado?: string) {
  switch (estado) {
    case "entregado": return "Entregado"
    case "en_transito": return "En Tránsito"
    case "aprobado": return "Aprobado"
    case "borrador": return "Borrador"
    case "emitido": return "Emitido"
    case "en_ejecucion": return "En Ejecución"
    case "cancelado": return "Cancelado"
    default: return estado ?? "—"
  }
}

export default function RemitosFicha({ remitoId }: { remitoId: number }) {
  const router = useRouter()
  const [remito, setRemito] = useState<Remito | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [accionando, setAccionando] = useState(false)
  const [nvLink, setNvLink] = useState<DocLink | null>(null)
  const [oeLink, setOeLink] = useState<DocLink | null>(null)
  const [facturaLink, setFacturaLink] = useState<DocLink | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)

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

  useEffect(() => {
    if (!remito) return
    if (remito.nota_venta_id) {
      setNvLink({ id: remito.nota_venta_id, numero: remito.nota_venta_numero ?? `#${remito.nota_venta_id}`, href: `/ventas/nv/${remito.nota_venta_id}` })
    }
    if (remito.orden_entrega_id) {
      setOeLink({ id: remito.orden_entrega_id, numero: remito.orden_entrega_numero ?? `#${remito.orden_entrega_id}`, href: `/ventas/oe/${remito.orden_entrega_id}` })
    }
    if (remito.factura_numero) {
      fetch(`/api/facturas?numero=${encodeURIComponent(remito.factura_numero)}`)
        .then(r => r.json())
        .then((data: any) => {
          const f = Array.isArray(data) ? data[0] : data
          if (f?.id) setFacturaLink({ id: f.id, numero: remito.factura_numero!, href: `/ventas/facturas/${f.id}` })
        })
        .catch(() => {})
    }
    if (remito.cliente_id) {
      fetch(`/api/clientes/${remito.cliente_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(c => { if (c) setCliente(c) })
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
  // Si el remito ya tiene asiento CMV vinculado, está confirmado de hecho
  // (aunque la columna "estado" pueda haber quedado en "emitido" por un bug
  // previo). Tratamos asiento_id como fuente de verdad.
  const yaConfirmadoPorAsiento = !!remito.asiento_id
  const estadoEfectivo =
    yaConfirmadoPorAsiento && (remito.estado === "emitido" || remito.estado === "en_ejecucion")
      ? "entregado"
      : (remito.estado ?? "")
  const esEmitido =
    !yaConfirmadoPorAsiento &&
    (remito.estado === "emitido" || remito.estado === "en_ejecucion")
  const esConfirmado =
    yaConfirmadoPorAsiento ||
    remito.estado === "entregado" ||
    remito.estado === "aprobado"

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push("/ventas/remitos")} className="hover:text-emerald-700">
          Remitos
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{remito.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push("/ventas/remitos")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{remito.numero}</h1>
            <p className="text-sm text-gray-500">
              {formatDateTime(remito.fecha)}
              {remito.sucursal && ` | ${remito.sucursal}`}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoColorRem(estadoEfectivo)}`}>
          {getEstadoLabelRem(estadoEfectivo)}
        </span>
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
        {nvLink && (
          <Link href={nvLink.href} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Ver Nota de Venta
          </Link>
        )}
        {oeLink && (
          <Link href={oeLink.href} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Ver Orden de Entrega
          </Link>
        )}
        {facturaLink && (
          <Link href={facturaLink.href} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Ver Factura
          </Link>
        )}
        {esEmitido && (
          <button
            onClick={confirmar}
            disabled={accionando}
            className="ml-auto px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {accionando ? "Confirmando..." : "Confirmar Entrega"}
          </button>
        )}
        {(esEmitido || esConfirmado) && (
          <button
            onClick={() => setShowCancelarModal(true)}
            className={`${esEmitido ? "" : "ml-auto"} px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1`}
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-b-lg shadow-sm p-6">
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Datos del Remito</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Número:</span> <span className="font-medium">{remito.numero}</span></div>
              <div>
                <span className="text-gray-500">OE:</span>{" "}
                {oeLink ? (
                  <Link href={oeLink.href} className="font-medium text-emerald-700 hover:underline">{oeLink.numero}</Link>
                ) : (
                  <span className="font-medium">{remito.orden_entrega_numero ?? "-"}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500">NV:</span>{" "}
                {nvLink ? (
                  <Link href={nvLink.href} className="font-medium text-emerald-700 hover:underline">{nvLink.numero}</Link>
                ) : (
                  <span className="font-medium">{remito.nota_venta_numero ?? "-"}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500">Factura:</span>{" "}
                {facturaLink ? (
                  <Link href={facturaLink.href} className="font-medium text-emerald-700 hover:underline">{facturaLink.numero}</Link>
                ) : (
                  <span className="font-medium">{remito.factura_numero ?? "-"}</span>
                )}
              </div>
              <div><span className="text-gray-500">Depósito:</span> <span className="font-medium">{remito.deposito ?? "-"}</span></div>
              <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{remito.sucursal ?? "-"}</span></div>
              <div className="col-span-2">
                <span className="text-gray-500">Asiento CMV:</span>{" "}
                {remito.asiento_id ? (
                  <span className="font-medium text-indigo-700" title={remito.asiento_id}>Generado</span>
                ) : (
                  <span className="text-gray-400">Sin asiento generado</span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Entrega</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Fecha Entrega:</span> <span className="font-medium">{remito.fecha ? formatDate(remito.fecha) : "-"}</span></div>
              <div><span className="text-gray-500">Bultos:</span> <span className="font-medium">{remito.bultos ?? "-"}</span></div>
              <div><span className="text-gray-500">Control Factura:</span> <span className="font-medium">{remito.control_factura === "facturado" ? "Facturado" : "Pendiente"}</span></div>
              <div><span className="text-gray-500">Ubicación:</span> <span className="font-medium">{remito.ubicacion ?? "-"}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Domicilio:</span> <span className="font-medium">{remito.domicilio_envio ?? "-"}</span></div>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Cliente</h3>
        {cliente ? (
          <div className="grid grid-cols-4 gap-4 text-sm mb-6">
            <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{cliente.nombre}</span></div>
            <div>
              <span className="text-gray-500">Documento:</span>{" "}
              <span className="font-medium">
                {cliente.tipo_documento ?? ""}{cliente.numero_documento ? `: ${cliente.numero_documento}` : ""}
              </span>
            </div>
            <div><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{cliente.telefono || cliente.celular || "-"}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{cliente.email || "-"}</span></div>
          </div>
        ) : (
          <div className="text-sm mb-6 text-gray-500">{remito.cliente_nombre ?? "—"}</div>
        )}

        <div className="grid grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg mb-6">
          <div><span className="text-gray-500">Peso Bruto:</span> <span className="font-medium">{remito.peso_kg ?? 0} kg</span></div>
          <div><span className="text-gray-500">Peso Neto:</span> <span className="font-medium">{remito.peso_neto_kg ?? 0} kg</span></div>
          <div><span className="text-gray-500">Bultos:</span> <span className="font-medium">{remito.bultos ?? 0}</span></div>
          <div><span className="text-gray-500">Valor Declarado:</span> <span className="font-medium">{formatCurrency(remito.valor_declarado ?? 0)}</span></div>
        </div>

        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Líneas</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 font-semibold">Producto</th>
              <th className="text-center py-2 font-semibold">Cantidad</th>
              <th className="text-left py-2 font-semibold">Series / IMEI</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3">
                  <p className="font-medium">{l.producto_nombre}</p>
                </td>
                <td className="py-3 text-center">{l.cantidad}</td>
                <td className="py-3 font-mono text-xs text-gray-600">
                  {(l.series_seleccionadas ?? []).map(s => s.serie).join(", ") || "—"}
                </td>
              </tr>
            ))}
            {lineas.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400">Sin líneas</td>
              </tr>
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
                {accionando ? "Cancelando..." : "Cancelar Remito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
