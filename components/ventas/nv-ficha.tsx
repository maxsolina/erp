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
  getEstadoNVColor,
  getEstadoNVLabel,
  type NotaVentaDetalle,
} from "./_shared"

interface DocVinculado {
  id: number | string
  numero: string
  estado?: string
  href: string
}

interface Vendedor {
  id: number
  nombre: string
}

interface ListaPrecios {
  id: number
  nombre: string
}

interface ClienteEnriquecido {
  id: number
  nombre: string
  categoria_id?: number | null
  categoria_nombre?: string | null
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

export default function NvFicha({ nvId }: { nvId: number }) {
  const router = useRouter()
  const [nv, setNv] = useState<NotaVentaDetalle | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [oes, setOes] = useState<DocVinculado[]>([])
  const [remitos, setRemitos] = useState<DocVinculado[]>([])
  const [facturas, setFacturas] = useState<DocVinculado[]>([])
  const [recibos, setRecibos] = useState<DocVinculado[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [cliente, setCliente] = useState<ClienteEnriquecido | null>(null)

  useEffect(() => {
    fetch(`/api/notas-venta/${nvId}`)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "Nota de venta no encontrada" : `Error ${r.status}`)
          setNv(null)
          return
        }
        const data = await r.json()
        setNv(data)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la NV")
        setNv(null)
      })
  }, [nvId])

  // Cargar catálogos auxiliares + docs vinculados después de tener la NV
  useEffect(() => {
    if (!nv) return
    Promise.all([
      fetch("/api/ordenes-entrega").then(r => r.json()).catch(() => []),
      fetch("/api/remitos-venta").then(r => r.json()).catch(() => []),
      fetch(`/api/facturas?nota_venta_id=${nvId}`).then(r => r.json()).catch(() => []),
      fetch("/api/recibos").then(r => r.json()).catch(() => []),
      fetch("/api/vendedores").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios").then(r => r.json()).catch(() => []),
    ]).then(([oeList, remList, facList, recList, venList, lpList]) => {
      if (Array.isArray(oeList)) {
        setOes(oeList
          .filter((oe: any) => Number(oe.nota_venta_id) === nvId)
          .map((oe: any) => ({ id: oe.id, numero: oe.numero, estado: oe.estado, href: `/ventas/oe/${oe.id}` })))
      }
      if (Array.isArray(remList)) {
        setRemitos(remList
          .filter((r: any) => Number(r.nota_venta_id) === nvId || r.nota_venta_numero === nv.numero)
          .map((r: any) => ({ id: r.id, numero: r.numero, estado: r.estado, href: `/ventas/remitos/${r.id}` })))
      }
      if (Array.isArray(facList)) {
        setFacturas(facList.map((f: any) => ({
          id: f.id, numero: f.numero, estado: f.estado, href: `/ventas/facturas/${f.id}`,
        })))
      }
      if (Array.isArray(recList)) {
        setRecibos(recList
          .filter((r: any) => r.nota_venta_id === nvId || r.nota_venta_numero === nv.numero)
          .map((r: any) => ({ id: r.id, numero: r.numero, estado: r.estado, href: `/ventas/recibos/${r.id}` })))
      }
      if (Array.isArray(venList)) setVendedores(venList)
      if (Array.isArray(lpList)) setListasPrecios(lpList)
    })
    if (nv.cliente_id) {
      fetch(`/api/clientes/${nv.cliente_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(c => { if (c) setCliente(c) })
        .catch(() => {})
    }
  }, [nv, nvId])

  if (nv === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando NV...</div>
  }
  if (nv === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Nota de venta no encontrada"}</p>
        <Link href="/ventas/nv" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = nv.moneda ?? "ARS"
  const lineas = nv.notas_venta_lineas ?? []
  const editable = nv.estado === "borrador" || nv.estado === "abierta"

  const vendedorNombre =
    (nv as any).vendedor_nombre ??
    (nv.vendedor_id ? vendedores.find(v => v.id === nv.vendedor_id)?.nombre : null) ??
    "—"

  const listaPreciosNombre =
    (nv as any).lista_precios_id
      ? listasPrecios.find(l => l.id === (nv as any).lista_precios_id)?.nombre ?? "—"
      : "—"

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push("/ventas/nv")} className="hover:text-emerald-700">
          Notas de Venta
        </button>
        <span>/</span>
        <span className="font-medium text-gray-900">{nv.numero}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BotonVolver onClick={() => router.push("/ventas/nv")} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{nv.numero}</h1>
            <p className="text-sm text-gray-500">
              {formatDateTime(nv.fecha)}
              {(nv.deposito || nv.sucursal) && ` | ${nv.deposito ?? nv.sucursal}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editable && (
            <Link
              href={`/ventas/nv/${nv.id}/editar`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Editar
            </Link>
          )}
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoNVColor(nv.estado)}`}>
            {getEstadoNVLabel(nv.estado)}
          </span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
        <div className="flex flex-wrap gap-2">
          <button
            disabled
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1 opacity-60 cursor-not-allowed"
            title="Descarga de PDF próximamente"
          >
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          {facturas.length > 0 && (
            <Link
              href={facturas[0].href}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver factura ({facturas.length})
            </Link>
          )}
          {remitos.length > 0 && (
            <Link
              href={remitos[0].href}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver remitos ({remitos.length})
            </Link>
          )}
          {oes.length > 0 && (
            <Link
              href={oes[0].href}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver Ord. de Entrega ({oes.length})
            </Link>
          )}
          {recibos.length > 0 && (
            <Link
              href={recibos[0].href}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver recibos ({recibos.length})
            </Link>
          )}
        </div>
      </div>

      {/* Content — layout 3 columnas */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Datos de la Venta */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Datos de la Venta</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-gray-500 block">Cliente</label>
                <p className="font-medium">{nv.cliente_nombre ?? "—"}</p>
                {nv.cliente_codigo && (
                  <p className="text-xs text-gray-500">{nv.cliente_codigo}</p>
                )}
              </div>
              <div>
                <label className="text-gray-500 block">Categoría</label>
                <p className="font-medium">{cliente?.categoria_nombre ?? "—"}</p>
              </div>
              <div>
                <label className="text-gray-500 block">Vendedor</label>
                <p className="font-medium">{vendedorNombre}</p>
              </div>
              <div>
                <label className="text-gray-500 block">Lista de Precios</label>
                <p className="font-medium">{listaPreciosNombre}</p>
              </div>
              <div>
                <label className="text-gray-500 block">Depósito</label>
                <p className="font-medium">{nv.deposito ?? nv.sucursal ?? "—"}</p>
              </div>
              <div>
                <label className="text-gray-500 block">Moneda</label>
                <p className="font-medium">{moneda}</p>
              </div>
              <div>
                <label className="text-gray-500 block">Fecha</label>
                <p className="font-medium">{formatDate(nv.fecha)}</p>
              </div>
            </div>
            {nv.notas && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-gray-500 block text-sm">Notas</label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{nv.notas}</p>
              </div>
            )}
          </div>

          {/* Líneas de Productos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Líneas de Productos</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Precio Unit.</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Dto.</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={l.id ?? i} className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium">{l.producto_nombre}</p>
                      {l.descripcion && <p className="text-xs text-gray-500">{l.descripcion}</p>}
                    </td>
                    <td className="py-3 text-right">{l.cantidad}</td>
                    <td className="py-3 text-right">{formatCurrency(l.precio_unitario, moneda)}</td>
                    <td className="py-3 text-right">{l.descuento ? `${l.descuento}%` : "—"}</td>
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(l.subtotal ?? l.cantidad * l.precio_unitario, moneda)}
                    </td>
                  </tr>
                ))}
                {lineas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400 text-sm">
                      Sin líneas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Totales */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Totales</h3>
            <div className="space-y-3 text-sm">
              {nv.subtotal != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatCurrency(nv.subtotal, moneda)}</span>
                </div>
              )}
              {nv.impuestos != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Impuestos:</span>
                  <span>{formatCurrency(nv.impuestos, moneda)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200 text-lg font-bold">
                <span>Total:</span>
                <span className="text-emerald-700">{formatCurrency(nv.total, moneda)}</span>
              </div>
            </div>
          </div>

          {/* Moneda */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Moneda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Moneda:</span>
                <span className="font-medium">{moneda}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Seguimiento */}
      <SeguimientoPanel tipoDocumento="nota_venta" documentoId={nv.id} />
    </div>
  )
}
