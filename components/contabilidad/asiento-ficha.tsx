"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import { formatCurrency, formatDate, type Asiento } from "./_shared"

interface Props { id: string | number }

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

function getEstadoColor(estado?: string) {
  switch (estado) {
    case "publicado": return "bg-green-100 text-green-700"
    case "cancelado": return "bg-red-100 text-red-700"
    case "no_asentado": return "bg-yellow-100 text-yellow-700"
    default: return "bg-gray-100 text-gray-700"
  }
}

function getEstadoLabel(estado?: string) {
  if (!estado) return "—"
  if (estado === "no_asentado") return "Borrador"
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

// Map de tipo de comprobante → ruta del front. Si no hay match, no se linkea.
function hrefDocOrigen(tipo?: string | null, id?: number | null): string | null {
  if (!tipo || !id) return null
  const t = tipo.toLowerCase()
  if (t === "factura" || t === "factura_venta") return `/ventas/facturas/${id}`
  if (t === "remito" || t === "remito_venta") return `/ventas/remitos/${id}`
  if (t === "recibo") return `/ventas/recibos/${id}`
  if (t === "nota_venta" || t === "notaventa") return `/ventas/nv/${id}`
  if (t === "orden_entrega") return `/ventas/oe/${id}`
  if (t === "factura_compra") return `/compras/facturas/${id}`
  if (t === "orden_compra") return `/compras/oc/${id}`
  if (t === "recepcion") return `/compras/recepciones/${id}`
  if (t === "orden_pago") return `/compras/op/${id}`
  return null
}

export default function AsientoFicha({ id }: Props) {
  const router = useRouter()
  const [asiento, setAsiento] = useState<Asiento | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [accionando, setAccionando] = useState(false)

  const cargar = async () => {
    try {
      const r = await fetch(`/api/contabilidad/asientos?id=${encodeURIComponent(String(id))}`)
      if (!r.ok) {
        setError(`Error ${r.status}`)
        setAsiento(null)
        return
      }
      const data = await r.json()
      if (!data) {
        setError("Asiento no encontrado")
        setAsiento(null)
        return
      }
      setAsiento(data)
    } catch (err) {
      console.error(err)
      setError("Error de red al cargar el asiento")
      setAsiento(null)
    }
  }

  useEffect(() => { cargar() }, [id])

  const accionAsiento = async (action: "publicar" | "cancelar") => {
    if (!asiento) return
    if (action === "cancelar" && !confirm("¿Cancelar este asiento? Se generará una reversión automática.")) return
    if (accionando) return
    setAccionando(true)
    try {
      const r = await fetch(`/api/contabilidad/asientos?id=${encodeURIComponent(String(asiento.id))}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const d = await r.json()
      if (!r.ok) {
        alert(d.error ?? `Error al ${action}`)
        setAccionando(false)
        return
      }
      await cargar()
    } catch (err: any) {
      alert(`Error de red: ${err?.message ?? err}`)
    } finally {
      setAccionando(false)
    }
  }

  if (asiento === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando asiento...</div>
  }
  if (asiento === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Asiento no encontrado"}</p>
        <Link href="/contabilidad/asientos-automaticos" className="text-indigo-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  const lineas = asiento.lineas ?? []
  const totalDebe = asiento.total_debe ?? lineas.reduce((s, l) => s + Number(l.debe ?? 0), 0)
  const totalHaber = asiento.total_haber ?? lineas.reduce((s, l) => s + Number(l.haber ?? 0), 0)
  const ruta = asiento.es_manual ? "/contabilidad/asientos-manuales" : "/contabilidad/asientos-automaticos"
  const labelListado = asiento.es_manual ? "Asientos Manuales" : "Asientos Automáticos"

  // origen — si existe comprobante_tipo + comprobante_id, intentamos linkear
  const a = asiento as any
  const linkOrigen = hrefDocOrigen(a.comprobante_tipo, a.comprobante_id)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push(ruta)} className="hover:text-emerald-700">
          {labelListado}
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{asiento.numero ?? `#${asiento.id}`}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push(ruta)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{asiento.numero ?? `Asiento #${asiento.id}`}</h1>
            <p className="text-sm text-gray-500">
              {formatDateTime(asiento.fecha)}
              {asiento.diario?.nombre && ` | ${asiento.diario.nombre}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(a.a_revisar) && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⚠ A Revisar
            </span>
          )}
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoColor(asiento.estado)}`}>
            {getEstadoLabel(asiento.estado)}
          </span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center gap-2 mb-0">
        {linkOrigen && (
          <Link
            href={linkOrigen}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Ver origen ({a.comprobante_tipo})
          </Link>
        )}
        {asiento.estado === "no_asentado" && (
          <button
            onClick={() => accionAsiento("publicar")}
            disabled={accionando}
            className="ml-auto px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            {accionando ? "Publicando..." : "Publicar"}
          </button>
        )}
        {asiento.estado === "publicado" && (
          <button
            onClick={() => accionAsiento("cancelar")}
            disabled={accionando}
            className="ml-auto px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            {accionando ? "Cancelando..." : "Cancelar Asiento"}
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-b-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Datos del Asiento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Número:</span> <span className="font-medium">{asiento.numero ?? "—"}</span></div>
              <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(asiento.fecha)}</span></div>
              <div><span className="text-gray-500">Diario:</span> <span className="font-medium">{asiento.diario?.nombre ?? "—"}</span></div>
              <div><span className="text-gray-500">Período:</span> <span className="font-medium">{asiento.periodo?.nombre ?? "—"}</span></div>
              <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{asiento.sucursal?.nombre ?? "—"}</span></div>
              <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">{asiento.es_manual ? "Manual" : "Automático"}</span></div>
              {asiento.descripcion && (
                <div className="col-span-2">
                  <span className="text-gray-500">Descripción:</span>{" "}
                  <span className="font-medium">{asiento.descripcion}</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Origen</h3>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Documento origen:</span>{" "}
                {linkOrigen ? (
                  <Link href={linkOrigen} className="font-medium text-emerald-700 hover:underline">
                    {asiento.documento_origen_numero ?? a.referencia ?? "—"}
                  </Link>
                ) : (
                  <span className="font-medium">{asiento.documento_origen_numero ?? a.referencia ?? "—"}</span>
                )}
              </div>
              {a.comprobante_tipo && (
                <div>
                  <span className="text-gray-500">Tipo de comprobante:</span>{" "}
                  <span className="font-medium capitalize">{a.comprobante_tipo}</span>
                </div>
              )}
              {a.moneda_original && a.moneda_original !== "ARS" && (
                <div>
                  <span className="text-gray-500">Moneda original:</span>{" "}
                  <span className="font-medium">{a.moneda_original}</span>
                  {a.cotizacion_aplicada && (
                    <span className="text-gray-500 ml-2">
                      · 1 {a.moneda_original} = ${Number(a.cotizacion_aplicada).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Líneas del Asiento</h3>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-3">Cuenta</th>
              <th className="text-left py-2 px-3">Descripción</th>
              <th className="text-right py-2 px-3 w-32">Debe</th>
              <th className="text-right py-2 px-3 w-32">Haber</th>
            </tr>
          </thead>
          <tbody>
            {lineas
              .slice()
              .sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0))
              .map((l, idx) => (
                <tr key={l.id ?? idx} className="border-b border-gray-100">
                  <td className="py-2 px-3">
                    {l.cuenta_codigo && (
                      <span className="font-mono text-xs text-gray-500 mr-2">{l.cuenta_codigo}</span>
                    )}
                    <span className="font-medium">{l.cuenta_nombre ?? "—"}</span>
                  </td>
                  <td className="py-2 px-3 text-gray-700">{l.descripcion ?? "—"}</td>
                  <td className="py-2 px-3 text-right">
                    {Number(l.debe ?? 0) > 0 ? formatCurrency(Number(l.debe)) : "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {Number(l.haber ?? 0) > 0 ? formatCurrency(Number(l.haber)) : "—"}
                  </td>
                </tr>
              ))}
            {lineas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400">Sin líneas</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t font-semibold text-sm">
              <td colSpan={2} className="py-2 px-3 text-right">Totales</td>
              <td className="py-2 px-3 text-right">{formatCurrency(totalDebe)}</td>
              <td className="py-2 px-3 text-right">{formatCurrency(totalHaber)}</td>
            </tr>
            {Math.abs(totalDebe - totalHaber) > 0.01 && (
              <tr>
                <td colSpan={4} className="py-2 px-3 text-xs text-red-600 text-right">
                  Diferencia: {formatCurrency(totalDebe - totalHaber)}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}
