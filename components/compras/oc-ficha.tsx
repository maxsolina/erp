"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, ChevronRight, FileText, Truck } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  formatCurrency,
  formatDate,
  type OrdenCompraDetalle,
} from "./_shared"
import { guardarOrdenCompra, guardarRecepcion } from "@/lib/compras-actions"

const ESTADO_COLOR: Record<string, string> = {
  borrador:         "bg-gray-100 text-gray-700",
  confirmada:       "bg-blue-100 text-blue-700",
  recibida_parcial: "bg-amber-100 text-amber-700",
  recibida:         "bg-green-100 text-green-700",
  completa:         "bg-green-100 text-green-700",
  cancelada:        "bg-red-100 text-red-700",
}
const ESTADO_LABEL: Record<string, string> = {
  borrador:         "Borrador",
  confirmada:       "Confirmada",
  recibida_parcial: "Recibida parcial",
  recibida:         "Recibida",
  completa:         "Completa",
  cancelada:        "Cancelada",
}

type TabKey = "productos" | "recepciones" | "facturas" | "observaciones"

export default function OcFicha({ ocId }: { ocId: number }) {
  const router = useRouter()
  const [oc, setOc] = useState<OrdenCompraDetalle | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [recepciones, setRecepciones] = useState<any[]>([])
  const [facturas, setFacturas] = useState<any[]>([])
  const [tab, setTab] = useState<TabKey>("productos")

  useEffect(() => {
    fetch(`/api/compras/ordenes-compra/${ocId}`)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "OC no encontrada" : `Error ${r.status}`)
          setOc(null)
          return
        }
        setOc(await r.json())
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la OC")
        setOc(null)
      })
  }, [ocId])

  useEffect(() => {
    if (!oc) return
    fetch("/api/compras/recepciones")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        setRecepciones(data.filter(x =>
          Number(x.documento_origen_id) === ocId ||
          Number(x.orden_compra_id) === ocId
        ))
      })
      .catch(() => {})
    fetch("/api/compras/facturas")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        setFacturas(data.filter(x => Number(x.orden_compra_id) === ocId))
      })
      .catch(() => {})
  }, [oc, ocId])

  const confirmarOC = async () => {
    if (!oc || confirmando) return
    if (!confirm(`Confirmar la OC ${oc.numero}? Se generará la Recepción asociada.`)) return
    setConfirmando(true)
    try {
      const provRes = await fetch(`/api/compras/proveedores/${oc.proveedor_id}`)
      const prov = provRes.ok ? await provRes.json() : null
      const aplicaCircuito = prov?.aplica_circuito_compras === true

      if (aplicaCircuito) {
        const res = await fetch(`/api/compras/ordenes-compra/${oc.id}/confirmar`, { method: "POST" })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          alert(`Error al confirmar OC: ${json.error ?? res.statusText}`)
          setConfirmando(false)
          return
        }
        window.location.reload()
        return
      }

      const ahora = new Date().toISOString()
      const esInmediato = (oc as any).metodo_compra === "inmediato"
      const lineas = (oc as any).lineas ?? (oc as any).items ?? []
      const recPayload = {
        fecha: ahora,
        orden_compra_id: oc.id,
        orden_compra_numero: oc.numero,
        proveedor_id: oc.proveedor_id,
        proveedor_nombre: oc.proveedor_nombre,
        estado: esInmediato ? "confirmada" : "borrador",
        documento_origen_tipo: "oc",
        documento_origen_id: oc.id,
        documento_origen_ref: oc.numero,
        sucursal: (oc as any).sucursal ?? "",
        deposito_destino: (oc as any).deposito_destino ?? "",
        deposito_destino_id: (oc as any).deposito_destino_id ?? null,
        ubicacion: (oc as any).ubicacion ?? "",
        fecha_esperada: (oc as any).fecha_entrega_esperada ?? null,
        items: lineas.map((l: any) => ({
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          producto_sku: l.producto_sku ?? "",
          cantidad_pedida: l.cantidad,
          cantidad_recibida: esInmediato ? l.cantidad : 0,
          precio_unitario: l.precio_unitario,
          udm: l.udm ?? "un",
          estado_linea: esInmediato ? "recibido" : "pendiente",
          tiene_serie: l.tiene_serie ?? false,
          requiere_color: l.requiere_color ?? false,
          requiere_bateria: l.requiere_bateria ?? false,
          requiere_outlet: l.requiere_outlet ?? false,
          requiere_observaciones: l.requiere_observaciones ?? false,
          nac: l.nac ?? false,
        })),
        total: esInmediato ? oc.total : 0,
      }
      const ocEstadoNuevo = esInmediato ? "completa" : "confirmada"
      await Promise.all([
        guardarRecepcion(recPayload),
        guardarOrdenCompra({ estado: ocEstadoNuevo }, oc.id),
      ])
      window.location.reload()
    } catch (e: any) {
      alert(`Error al confirmar OC: ${e?.message ?? e}`)
      setConfirmando(false)
    }
  }

  if (oc === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando OC...</div>
  }
  if (oc === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "OC no encontrada"}</p>
        <Link href="/compras/oc" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = oc.moneda ?? "ARS"
  const lineas: any[] = (oc as any).lineas ?? (oc as any).items ?? []
  const editable = oc.estado === "borrador"
  const totalPedido = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0), 0)
  const totalRecibido = lineas.reduce((s, l) => s + (Number(l.cantidad_recibida) || 0), 0)

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: "productos",     label: "Productos",                count: lineas.length },
    { key: "recepciones",   label: "Entregas / Recepciones",   count: recepciones.length },
    { key: "facturas",      label: "Facturas vinculadas",      count: facturas.length },
    { key: "observaciones", label: "Observaciones",            count: null },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
        <button onClick={() => router.push("/compras/oc")} className="hover:text-blue-600">
          Órdenes de Compra
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{oc.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push("/compras/oc")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{oc.numero}</h1>
            <p className="text-sm text-gray-500">{formatDate(oc.fecha)} | {oc.proveedor_nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <button
                onClick={confirmarOC}
                disabled={confirmando}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {confirmando ? "Confirmando..." : "Confirmar"}
              </button>
              <Link
                href={`/compras/oc/${oc.id}/editar`}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Editar
              </Link>
            </>
          )}
          {(oc.estado === "confirmada" || oc.estado === "recibida_parcial") && recepciones.length > 0 && (
            <Link
              href={`/compras/recepciones/${recepciones[0].id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-lg text-xs font-medium hover:bg-emerald-100"
            >
              <Truck className="w-3.5 h-3.5" />
              Ir a Recepción · {recepciones[0].numero}
            </Link>
          )}
          {(oc as any).factura_circuito_id && facturas.find((f: any) => f.id === (oc as any).factura_circuito_id) && (() => {
            const fc = facturas.find((f: any) => f.id === (oc as any).factura_circuito_id)
            return (
              <Link
                href={`/compras/facturas/${fc.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100"
              >
                <FileText className="w-3.5 h-3.5" />
                Factura {fc.numero} · {fc.estado}
              </Link>
            )
          })()}
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${ESTADO_COLOR[oc.estado] ?? "bg-gray-100 text-gray-700"}`}>
            {ESTADO_LABEL[oc.estado] ?? oc.estado}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white rounded-lg border px-6 py-4 mb-4">
        <div className="flex items-center gap-0">
          {(["borrador", "confirmada", "recibida"] as const).map((step, idx) => {
            const stepLabel = { borrador: "Borrador", confirmada: "Confirmada", recibida: "Recibida" }[step]
            const orden = ["borrador", "confirmada", "recibida"]
            const stepsDone = orden.indexOf(oc.estado === "completa" ? "recibida" : oc.estado)
            const isCurrent = oc.estado === step || (oc.estado === "recibida_parcial" && step === "confirmada")
            const isDone = stepsDone > idx || oc.estado === "recibida" || oc.estado === "completa"
            return (
              <Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    oc.estado === "cancelada" ? "bg-red-100 text-red-600" :
                    isDone ? "bg-blue-600 text-white" :
                    isCurrent ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {isDone && oc.estado !== "cancelada" ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent || isDone ? "text-gray-900" : "text-gray-400"}`}>
                    {stepLabel}
                  </span>
                </div>
                {idx < 2 && <div className={`flex-1 h-0.5 mx-3 ${isDone ? "bg-blue-400" : "bg-gray-200"}`} />}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* Cabecera datos */}
      <div className="bg-white rounded-lg border p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <DatoLabel label="Sucursal" valor={(oc as any).sucursal} />
          <DatoLabel label="Proveedor" valor={oc.proveedor_nombre} />
          <DatoLabel label="Término de Pago" valor={(oc as any).termino_pago} />
          <DatoLabel label="Tipo de Compra" valor={(oc as any).tipo_compra} />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Método de Compra</p>
            <p className={`font-medium ${(oc as any).metodo_compra === "inmediato" ? "text-cyan-700" : "text-indigo-700"}`}>
              {(oc as any).metodo_compra === "inmediato" ? "Inmediato" : "Estándar"}
            </p>
          </div>
          <DatoLabel label="Moneda" valor={moneda} />
          <DatoLabel label="Fecha de Pedido" valor={formatDate(oc.fecha)} />
          <DatoLabel label="Entrega Estimada" valor={oc.fecha_entrega_estimada ? formatDate(oc.fecha_entrega_estimada) : "-"} />
          <DatoLabel
            label="Depósito Destino"
            valor={`${(oc as any).deposito_destino || "-"}${(oc as any).ubicacion_destino ? ` / ${(oc as any).ubicacion_destino}` : ""}`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex border-b">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                  tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Productos */}
        {tab === "productos" && (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Producto</th>
                  <th className="text-left py-3 px-4">Descripción</th>
                  <th className="text-right py-3 px-4">Cant.</th>
                  <th className="text-right py-3 px-4">Recibido</th>
                  <th className="text-right py-3 px-4">Precio Unit.</th>
                  <th className="text-right py-3 px-4">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineas.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">Sin líneas</td></tr>
                )}
                {lineas.map((l, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{l.producto_nombre ?? l.nombre}</td>
                    <td className="py-3 px-4 text-gray-500">{l.descripcion || "-"}</td>
                    <td className="py-3 px-4 text-right">{l.cantidad}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={Number(l.cantidad_recibida ?? 0) > 0 ? "text-green-600 font-medium" : "text-gray-400"}>
                        {l.cantidad_recibida ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(l.precio_unitario ?? l.precio, moneda)}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(l.subtotal ?? (Number(l.precio_unitario ?? l.precio ?? 0) * Number(l.cantidad ?? 0)), moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-sm text-gray-500">
                    {totalPedido > 0 && (
                      <span>{totalRecibido} de {totalPedido} unidades recibidas</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Total</td>
                  <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                    {formatCurrency(oc.total, moneda)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Tab: Recepciones */}
        {tab === "recepciones" && (
          <div className="p-4">
            {recepciones.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No hay recepciones generadas aún</p>
            ) : (
              <div className="space-y-2">
                {recepciones.map(r => (
                  <Link
                    key={r.id}
                    href={`/compras/recepciones/${r.id}`}
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm border border-gray-100"
                  >
                    <span className="font-medium text-emerald-700">{r.numero}</span>
                    <span className="text-gray-500">{formatDate(r.fecha)}</span>
                    <span className="text-gray-500">{(r.lineas ?? r.items ?? []).length} producto{(r.lineas ?? r.items ?? []).length !== 1 ? "s" : ""}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.estado === "recibida" ? "bg-green-100 text-green-700" :
                      r.estado === "esperando_recepcion" ? "bg-amber-100 text-amber-700" :
                      r.estado === "confirmada" ? "bg-blue-100 text-blue-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {r.estado === "recibida" ? "Recibida" :
                       r.estado === "esperando_recepcion" ? "Esperando recepción" :
                       r.estado === "confirmada" ? "Confirmada" : "Cancelada"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
            {(oc.estado === "confirmada" || oc.estado === "recibida_parcial") && (oc as any).metodo_compra === "estandar" && (
              <div className="mt-4 text-xs text-gray-400 text-center">
                Las recepciones se generan automáticamente al confirmar la OC
              </div>
            )}
          </div>
        )}

        {/* Tab: Facturas */}
        {tab === "facturas" && (
          <div className="p-4">
            {facturas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No hay facturas vinculadas aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {facturas.map(f => (
                  <Link
                    key={f.id}
                    href={`/compras/facturas/${f.id}`}
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm border border-gray-100"
                  >
                    <span className="font-medium text-blue-700">{f.numero}</span>
                    <span className="text-gray-500">{formatDate(f.fecha)}</span>
                    <span className="font-medium">{formatCurrency(f.total, moneda)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.estado === "pagada" ? "bg-green-100 text-green-700" :
                      f.estado === "pendiente" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>{f.estado}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Observaciones */}
        {tab === "observaciones" && (
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {oc.observaciones || "Sin observaciones."}
            </p>
          </div>
        )}
      </div>

      <SeguimientoPanel tipoDocumento="orden_compra" documentoId={oc.id} />
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
