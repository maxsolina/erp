"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Edit, FileText, XCircle } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import {
  formatDate,
  type RecepcionDetalle,
} from "./_shared"

const ESTADO_COLOR: Record<string, string> = {
  borrador:             "bg-gray-100 text-gray-600",
  esperando_recepcion:  "bg-amber-100 text-amber-700",
  parcial:              "bg-orange-100 text-orange-700",
  recibida_parcial:     "bg-orange-100 text-orange-700",
  confirmada:           "bg-blue-100 text-blue-700",
  recibida:             "bg-green-100 text-green-700",
  completa:             "bg-green-100 text-green-700",
  cancelada:            "bg-red-100 text-red-700",
}
const ESTADO_LABEL: Record<string, string> = {
  borrador:             "Borrador",
  esperando_recepcion:  "Esperando recepción",
  recibida_parcial:     "Recibida parcial",
  parcial:              "Parcial",
  confirmada:           "Confirmada",
  recibida:             "Recibida",
  completa:             "Completa",
  cancelada:            "Cancelada",
}
const ESTADO_LINEA_COLOR: Record<string, string> = {
  pendiente:        "bg-gray-100 text-gray-600",
  recibido:         "bg-green-100 text-green-700",
  recibido_parcial: "bg-amber-100 text-amber-700",
}
const ESTADO_LINEA_LABEL: Record<string, string> = {
  pendiente:        "Pendiente",
  recibido:         "Recibido",
  recibido_parcial: "Parcial",
}
const ORIGEN_LABEL: Record<string, string> = {
  oc:            "Orden de Compra",
  toma_equipo:   "Toma de Equipo",
  transferencia: "Transferencia",
}

type TabKey = "info" | "detalles"

export default function RecepcionFicha({ recId }: { recId: number }) {
  const router = useRouter()
  const [rec, setRec] = useState<RecepcionDetalle | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [ocId, setOcId] = useState<number | null>(null)
  const [tab, setTab] = useState<TabKey>("info")

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

  // Resolver id de OC vinculada
  useEffect(() => {
    if (!rec) return
    const id = (rec as any).orden_compra_id ?? (rec as any).documento_origen_id
    if (id && (rec as any).documento_origen_tipo === "oc") setOcId(Number(id))
    else if ((rec as any).orden_compra_id) setOcId(Number((rec as any).orden_compra_id))
  }, [rec])

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

  const lineas: any[] = (rec as any).lineas ?? (rec as any).items ?? []
  const canEdit = ["borrador", "esperando_recepcion"].includes(rec.estado ?? "")
  const origen = (rec as any).documento_origen_tipo ?? "oc"
  const origenRef = (rec as any).documento_origen_ref ?? rec.orden_compra_numero ?? "—"

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <button onClick={() => router.push("/compras/recepciones")} className="hover:text-emerald-600">
          Recepciones
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{rec.numero}</span>
      </div>

      {/* Smart button: Ver OC */}
      {ocId && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Link
            href={`/compras/oc/${ocId}`}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Ver OC: {rec.orden_compra_numero ?? origenRef}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push("/compras/recepciones")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{rec.numero}</h1>
            <p className="text-sm text-gray-500">
              {new Date(rec.fecha).toLocaleDateString("es-AR")} | {rec.proveedor_nombre || "Sin proveedor"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              href={`/?module=compras&view=recepciones&id=${rec.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800"
              title="La gestión de cantidades recibidas (con series, colores, etc.) está en el módulo Compras"
            >
              <Edit className="w-4 h-4" />
              Recibir / Editar
            </Link>
          )}
          {rec.estado === "recibida" && (
            <Link
              href={`/?module=compras&view=recepciones&id=${rec.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </Link>
          )}
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${ESTADO_COLOR[rec.estado] ?? "bg-gray-100 text-gray-600"}`}>
            {ESTADO_LABEL[rec.estado] ?? rec.estado}
          </span>
        </div>
      </div>

      {/* Tabs estilo Odoo */}
      <div className="border-b mb-6">
        <div className="flex gap-1">
          {(["info", "detalles"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t === "info" ? "Información" : "Detalles"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Información */}
      {tab === "info" && (
        <>
          {/* Cabecera datos */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm">
              <DatoLabel label="Sucursal" valor={rec.sucursal} />
              <DatoLabel label="Depósito Destino" valor={rec.deposito_destino} />
              <DatoLabel label="Ubicación" valor={(rec as any).ubicacion} />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Documento Origen</p>
                {ocId ? (
                  <Link href={`/compras/oc/${ocId}`} className="text-blue-600 font-medium hover:underline">
                    {ORIGEN_LABEL[origen] ?? origen}: {origenRef}
                  </Link>
                ) : (
                  <p className="font-medium">{ORIGEN_LABEL[origen] ?? origen}: {origenRef}</p>
                )}
              </div>
              <DatoLabel
                label="Fecha Pedido"
                valor={(rec as any).fecha_pedido ? formatDate((rec as any).fecha_pedido) : "-"}
              />
              <DatoLabel
                label="Entrega Esperada"
                valor={(rec as any).fecha_entrega_esperada ? formatDate((rec as any).fecha_entrega_esperada) : "-"}
              />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha Recepción Real</p>
                <p className={`font-medium ${(rec as any).fecha_recepcion_real ? "text-green-700" : "text-gray-400"}`}>
                  {(rec as any).fecha_recepcion_real
                    ? new Date((rec as any).fecha_recepcion_real).toLocaleString("es-AR")
                    : "Pendiente"}
                </p>
              </div>
              <DatoLabel label="Remito N°" valor={(rec as any).remito_numero} />
              <DatoLabel
                label="Fecha Remito"
                valor={(rec as any).remito_fecha ? formatDate((rec as any).remito_fecha) : "-"}
              />
            </div>
            {rec.observaciones && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{rec.observaciones}</p>
              </div>
            )}
            {(rec as any).cancelacion && (
              <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Cancelación</p>
                <p className="text-sm text-red-700">
                  <span className="font-medium">{(rec as any).cancelacion.usuario}</span>
                  {" — "}
                  {new Date((rec as any).cancelacion.fecha).toLocaleString("es-AR")}
                </p>
                <p className="text-sm text-red-600 mt-1">{(rec as any).cancelacion.motivo}</p>
              </div>
            )}
          </div>

          {/* Líneas de Recepción */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">Líneas de Recepción</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4">Producto</th>
                  <th className="text-left py-2.5 px-4">SKU</th>
                  <th className="text-center py-2.5 px-4">Cant. Pedida</th>
                  <th className="text-center py-2.5 px-4">Cant. Recibida</th>
                  <th className="text-center py-2.5 px-4">UdM</th>
                  <th className="text-center py-2.5 px-4">Estado</th>
                  <th className="text-left py-2.5 px-4">Series / IMEI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineas.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-400">Sin líneas</td></tr>
                )}
                {lineas.map((linea, idx) => {
                  const estadoLinea = linea.estado_linea ?? "pendiente"
                  const series: any[] = linea.unidades_serie ?? linea.unidades ?? []
                  return (
                    <tr key={idx} className="hover:bg-gray-50 align-top">
                      <td className="py-3 px-4 font-medium text-gray-900">{linea.producto_nombre}</td>
                      <td className="py-3 px-4 text-gray-500">{linea.producto_sku ?? "-"}</td>
                      <td className="py-3 px-4 text-center">{linea.cantidad_pedida ?? linea.cantidad}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">{linea.cantidad_recibida ?? 0}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500">{linea.udm ?? "un"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_LINEA_COLOR[estadoLinea] ?? "bg-gray-100 text-gray-600"}`}>
                          {ESTADO_LINEA_LABEL[estadoLinea] ?? estadoLinea}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {series.length > 0 ? (
                          <div className="space-y-0.5">
                            {series.map((u: any, j: number) => (
                              <div key={j} className="font-mono text-xs text-gray-600">
                                {u.nro_serie}
                                {u.color && ` · ${u.color}`}
                                {u.bateria_pct !== undefined && u.bateria_pct !== null && ` · ${u.bateria_pct}%`}
                                {u.outlet && " · Outlet"}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab: Detalles (asientos contables) — placeholder por ahora */}
      {tab === "detalles" && (
        <div className="bg-white rounded-lg border p-12 text-center text-sm text-gray-500">
          La vista de asientos contables de la recepción está disponible en el módulo monolito.
          <div className="mt-4">
            <Link
              href={`/?module=compras&view=recepciones&id=${rec.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800"
            >
              Ver detalles contables →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function DatoLabel({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="font-medium">{valor || "-"}</p>
    </div>
  )
}
