"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, FileText, Truck } from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"
import SeguimientoPanel from "@/components/seguimiento-panel"
import {
  formatCurrency,
  formatDate,
  getEstadoOEColor,
  getEstadoOELabel,
  type OrdenEntrega,
} from "./_shared"

interface Cliente {
  id: number
  nombre: string
  tipo_documento?: string
  numero_documento?: string | null
  telefono?: string | null
  celular?: string | null
  email?: string | null
}

interface NotaVentaSimple {
  id: number
  numero: string
  fecha?: string
  total?: number
  moneda?: string
}

interface RemitoSimple {
  id: number
  numero: string
  fecha?: string
  estado?: string
  lineas?: { producto_id?: number; producto_nombre?: string; cantidad?: number; series_seleccionadas?: { id: number; serie: string }[] }[]
}

export default function OeFicha({ oeId }: { oeId: number }) {
  const router = useRouter()
  const [oe, setOe] = useState<OrdenEntrega | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [nv, setNv] = useState<NotaVentaSimple | null>(null)
  const [remito, setRemito] = useState<RemitoSimple | null>(null)

  useEffect(() => {
    fetch(`/api/ordenes-entrega?id=${oeId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setOe(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item) {
          setError("Orden de entrega no encontrada")
          setOe(null)
          return
        }
        setOe(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la OE")
        setOe(null)
      })
  }, [oeId])

  useEffect(() => {
    if (!oe) return
    Promise.all([
      oe.cliente_id
        ? fetch(`/api/clientes/${oe.cliente_id}`).then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null),
      oe.nota_venta_id
        ? fetch(`/api/notas-venta/${oe.nota_venta_id}`).then(r => r.ok ? r.json() : null).catch(() => null)
        : Promise.resolve(null),
      fetch("/api/remitos-venta").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([cli, nvData, remList]) => {
      if (cli) setCliente(cli)
      if (nvData) setNv({ id: nvData.id, numero: nvData.numero, fecha: nvData.fecha, total: nvData.total, moneda: nvData.moneda })
      if (Array.isArray(remList)) {
        // Match por orden_entrega_id (preferido) o por orden_entrega_numero (fallback
        // para remitos viejos creados antes de que la cascada vinculara el id).
        const r = remList.find((x: any) =>
          Number(x.orden_entrega_id) === oeId ||
          (oe.numero && x.orden_entrega_numero === oe.numero)
        )
        if (r) setRemito({ id: r.id, numero: r.numero, fecha: r.fecha, estado: r.estado, lineas: r.lineas })
      }
    })
  }, [oe, oeId])

  // Mapa producto_id → series entregadas vía remito vinculado
  const seriesPorProducto: Record<string, string[]> = {}
  if (remito?.lineas) {
    for (const l of remito.lineas) {
      const key = String(l.producto_id ?? l.producto_nombre ?? "")
      if (!key) continue
      const series = (l.series_seleccionadas ?? []).map(s => s.serie)
      if (series.length > 0) seriesPorProducto[key] = series
    }
  }

  if (oe === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando OE...</div>
  }
  if (oe === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Orden de entrega no encontrada"}</p>
        <Link href="/ventas/oe" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const productos = oe.productos ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push("/ventas/oe")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{oe.numero}</h1>
            <p className="text-sm text-gray-500">Orden de Entrega</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            remito ? "bg-green-100 text-green-700" : getEstadoOEColor(oe.estado)
          }`}>
            {remito ? "Finalizada" : getEstadoOELabel(oe.estado)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="col-span-2 space-y-6">
          {/* Documentos Vinculados */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Documentos Vinculados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Nota de Venta</span>
                </div>
                {nv ? (
                  <>
                    <p className="font-mono text-lg font-bold text-blue-700">{nv.numero}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      {formatDate(nv.fecha ?? "")} - {formatCurrency(nv.total ?? 0, nv.moneda)}
                    </p>
                    <Link
                      href={`/ventas/nv/${nv.id}`}
                      className="mt-2 text-xs text-blue-700 hover:underline inline-block"
                    >
                      Ver Nota de Venta
                    </Link>
                  </>
                ) : oe.nota_venta_numero ? (
                  <p className="font-mono text-lg font-bold text-blue-700">{oe.nota_venta_numero}</p>
                ) : (
                  <p className="text-sm text-gray-500">-</p>
                )}
              </div>

              <div className={`border rounded-lg p-4 ${remito ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-5 h-5 text-green-600" />
                  <span className={`text-sm font-medium ${remito ? "text-green-800" : "text-gray-500"}`}>
                    Remito
                  </span>
                </div>
                {remito ? (
                  <>
                    <p className="font-mono text-lg font-bold text-green-700">{remito.numero}</p>
                    <p className="text-xs text-green-600 mt-1">
                      {formatDate(remito.fecha ?? "")} - {remito.estado}
                    </p>
                    <Link
                      href={`/ventas/remitos/${remito.id}`}
                      className="mt-2 text-xs text-green-700 hover:underline inline-block"
                    >
                      Ver Remito
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">Sin remito generado</p>
                    {oe.estado !== "cancelada" && (
                      <Link
                        href={`/ventas/remitos/nueva?oe_id=${oe.id}`}
                        className="mt-2 text-xs text-emerald-700 hover:underline font-medium inline-block"
                      >
                        + Generar Remito
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
            {cliente ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Nombre</span>
                  <span className="font-medium">{cliente.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Documento</span>
                  <span className="font-medium">
                    {cliente.tipo_documento ?? ""}{cliente.numero_documento ? `: ${cliente.numero_documento}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Teléfono</span>
                  <span className="font-medium">{cliente.telefono || cliente.celular || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Email</span>
                  <span className="font-medium">{cliente.email || "-"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">{oe.cliente_nombre ?? "—"}</p>
            )}
          </div>

          {/* Productos a Entregar */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Productos a Entregar</h3>
              {remito && (
                <p className="text-xs text-gray-500 mt-0.5">IMEIs / series tomados del remito {remito.numero}</p>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-3 px-4">Producto</th>
                  <th className="text-center py-3 px-4">Cantidad</th>
                  <th className="text-left py-3 px-4">IMEI / Serie</th>
                  <th className="text-center py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, idx) => {
                  // El nombre puede venir como producto_nombre (NV) o como `nombre`
                  // (cuando la OE nace de una seña de equipo).
                  const nombre = p.producto_nombre ?? (p as { nombre?: string }).nombre ?? ""
                  const series = seriesPorProducto[String(p.producto_id ?? p.producto_nombre ?? nombre)] ?? []
                  const imeiDirecto = (p as { imei?: string | null }).imei ?? null
                  const imeiAMostrar = series.length > 0
                    ? series.join(", ")
                    : (imeiDirecto && String(imeiDirecto).trim() ? String(imeiDirecto) : null)
                  return (
                    <tr key={idx} className="border-b">
                      <td className="py-3 px-4 font-medium">{nombre}</td>
                      <td className="py-3 px-4 text-center">{p.cantidad}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-700">
                        {imeiAMostrar ? imeiAMostrar : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          // Estado por línea de OE (no es el de la cabecera).
                          // Hoy en DB: "confirmado" (NV→OE) o "reservado" (Seña→OE).
                          const est = String(p.estado ?? "").toLowerCase()
                          const cfg =
                            est === "confirmado"
                              ? { label: "Confirmado", cls: "bg-green-100 text-green-700" }
                              : est === "reservado"
                                ? { label: "Reservado", cls: "bg-amber-100 text-amber-700" }
                                : { label: "Pendiente", cls: "bg-gray-100 text-gray-700" }
                          return (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.cls}`}>
                              {cfg.label}
                            </span>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
                {productos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400 text-sm">Sin productos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Datos de Entrega */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Datos de Entrega</h3>
            <div className="space-y-4 text-sm">
              {oe.fecha_entrega && (
                <div>
                  <span className="text-gray-500 block">Fecha de Entrega</span>
                  <span className="font-medium">{formatDate(oe.fecha_entrega)}</span>
                </div>
              )}
              {oe.domicilio_envio && (
                <div>
                  <span className="text-gray-500 block">Domicilio de Envío</span>
                  <span className="font-medium">{oe.domicilio_envio}</span>
                </div>
              )}
              {oe.deposito && (
                <div>
                  <span className="text-gray-500 block">Depósito</span>
                  <span className="font-medium">{oe.deposito}</span>
                </div>
              )}
              {oe.sucursal && (
                <div>
                  <span className="text-gray-500 block">Sucursal</span>
                  <span className="font-medium">{oe.sucursal}</span>
                </div>
              )}
            </div>
          </div>

          {/* Acciones / Finalizada */}
          {!remito ? (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
              <div className="space-y-2">
                {oe.estado === "confirmada" && (
                  <Link
                    href={`/ventas/remitos/nueva?oe_id=${oe.id}`}
                    className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 text-center"
                  >
                    Generar Remito
                  </Link>
                )}
                <button
                  disabled
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 opacity-60 cursor-not-allowed"
                  title="Impresión próximamente"
                >
                  Imprimir OE
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Orden de Entrega Finalizada</span>
              </div>
              <p className="text-sm text-green-600 mt-1">Esta OE ya tiene remito generado.</p>
            </div>
          )}
        </div>
      </div>

      <SeguimientoPanel tipoDocumento="orden_entrega" documentoId={oe.id} />
    </div>
  )
}
