"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Download, Edit } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  formatCurrency,
  formatDate,
  getEstadoFacturaColor,
  getEstadoFacturaLabel,
} from "./_shared"

interface Props {
  apiUrl: string
  backHref: string
  monolitoEditView: string // ej "facturas_compra", "nc_compra", "nd_compra", "ordenes_pago"
}

// Mapa de etiqueta visual según monolitoEditView (para breadcrumb / títulos)
const ETIQUETAS: Record<string, { plural: string; singular: string }> = {
  facturas_compra: { plural: "Facturas de Compra", singular: "Factura de Compra" },
  nc_compra:       { plural: "Notas de Crédito",   singular: "Nota de Crédito" },
  nd_compra:       { plural: "Notas de Débito",    singular: "Nota de Débito" },
  ordenes_pago:    { plural: "Órdenes de Pago",    singular: "Orden de Pago" },
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

export default function FacturasGenericoFicha({ apiUrl, backHref, monolitoEditView }: Props) {
  const router = useRouter()
  const [data, setData] = useState<any | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const etiqueta = ETIQUETAS[monolitoEditView] ?? { plural: "Documentos", singular: "Documento" }

  useEffect(() => {
    fetch(apiUrl)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "No encontrado" : `Error ${r.status}`)
          setData(null)
          return
        }
        setData(await r.json())
      })
      .catch(err => {
        console.error(err)
        setError("Error de red")
        setData(null)
      })
  }, [apiUrl])

  if (data === undefined) return <div className="p-12 text-center text-gray-500">Cargando...</div>
  if (data === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "No encontrado"}</p>
        <Link href={backHref} className="text-indigo-700 hover:underline">Volver</Link>
      </div>
    )
  }

  const moneda = data.moneda ?? "ARS"
  const editable = data.estado === "borrador"

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push(backHref)} className="hover:text-blue-700">
          {etiqueta.plural}
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{data.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push(backHref)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{data.numero}</h1>
            <p className="text-sm text-gray-500">
              {formatDateTime(data.fecha)}
              {data.sucursal && ` | ${data.sucursal}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editable && data.id && (
            <Link
              href={`${backHref}/${data.id}/editar`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Editar
            </Link>
          )}
          {data.estado && (
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoFacturaColor(data.estado)}`}>
              {getEstadoFacturaLabel(data.estado)}
            </span>
          )}
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
      </div>

      {/* Contenido — layout 3 columnas */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Main */}
        <div className="col-span-2 space-y-6">
          {/* Datos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Datos de {etiqueta.singular}</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-gray-500 block">Proveedor</label>
                <p className="font-medium">{data.proveedor_nombre ?? "—"}</p>
              </div>
              <div>
                <label className="text-gray-500 block">Fecha</label>
                <p className="font-medium">{formatDate(data.fecha)}</p>
              </div>
              {data.fecha_vencimiento && (
                <div>
                  <label className="text-gray-500 block">Vencimiento</label>
                  <p className="font-medium">{formatDate(data.fecha_vencimiento)}</p>
                </div>
              )}
              {data.tipo && (
                <div>
                  <label className="text-gray-500 block">Tipo</label>
                  <p className="font-medium">{data.tipo}</p>
                </div>
              )}
              <div>
                <label className="text-gray-500 block">Moneda</label>
                <p className="font-medium">
                  {moneda}
                  {moneda !== "ARS" && data.cotizacion && (
                    <span className="text-gray-500 ml-2 text-xs">
                      · 1 {moneda} = ${Number(data.cotizacion).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </p>
              </div>
              {data.sucursal && (
                <div>
                  <label className="text-gray-500 block">Sucursal</label>
                  <p className="font-medium">{data.sucursal}</p>
                </div>
              )}
              {data.deposito_destino && (
                <div>
                  <label className="text-gray-500 block">Depósito</label>
                  <p className="font-medium">{data.deposito_destino}</p>
                </div>
              )}
            </div>
            {data.observaciones && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-gray-500 block text-sm">Observaciones</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{data.observaciones}</p>
              </div>
            )}
          </div>

          {/* Detalle */}
          {Array.isArray(data.lineas) && data.lineas.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Detalle</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
                    <th className="text-left py-2 px-3">Descripción</th>
                    <th className="text-center py-2 px-3">Cant.</th>
                    <th className="text-right py-2 px-3">Precio</th>
                    <th className="text-right py-2 px-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineas.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">{l.descripcion ?? l.producto_nombre ?? "—"}</td>
                      <td className="py-2 px-3 text-center">{l.cantidad ?? 1}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(l.precio_unitario ?? l.precio ?? 0, moneda)}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(l.subtotal ?? l.importe ?? 0, moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Totales */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Totales</h3>
            <div className="space-y-3 text-sm">
              {data.subtotal != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatCurrency(data.subtotal, moneda)}</span>
                </div>
              )}
              {data.impuestos != null && Number(data.impuestos) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Impuestos:</span>
                  <span>{formatCurrency(data.impuestos, moneda)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200 text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-700">{formatCurrency(data.total, moneda)}</span>
              </div>
              {data.saldo !== undefined && (
                <div className="flex justify-between pt-2 text-red-600 font-medium">
                  <span>Saldo:</span>
                  <span>{formatCurrency(data.saldo, moneda)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* tipo_documento canónico según monolitoEditView (facturas_compra/nc_compra/nd_compra/ordenes_pago).
          Si no matchea, usa el view literal — peor caso: el panel queda vacío. */}
      <SeguimientoPanel
        tipoDocumento={
          monolitoEditView === "facturas_compra" ? "factura_compra"
          : monolitoEditView === "nc_compra" ? "nota_credito_compra"
          : monolitoEditView === "nd_compra" ? "nota_debito_compra"
          : monolitoEditView === "ordenes_pago" ? "orden_pago"
          : monolitoEditView
        }
        documentoId={data.id}
      />
    </div>
  )
}
