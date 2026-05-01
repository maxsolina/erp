"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Truck } from "lucide-react"
import {
  formatDate,
  getEstadoOEColor,
  getEstadoOELabel,
  type OrdenEntrega,
} from "./_shared"

export default function OeFicha({ oeId }: { oeId: number }) {
  const router = useRouter()
  const [oe, setOe] = useState<OrdenEntrega | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [remitoVinculado, setRemitoVinculado] = useState<{ id: number; numero: string; estado: string } | null>(null)

  useEffect(() => {
    // /api/ordenes-entrega no tiene subroute [id]; usa ?id= y devuelve un array.
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

  // Buscar remito vinculado (la OE solo tiene remito_numero, falta el id)
  useEffect(() => {
    if (!oe) return
    fetch("/api/remitos-venta")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        const r = data.find(x => Number(x.orden_entrega_id) === oeId)
        if (r) setRemitoVinculado({ id: r.id, numero: r.numero, estado: r.estado })
      })
      .catch(() => {})
  }, [oe, oeId])

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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/oe")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{oe.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoOEColor(oe.estado)}`}>
          {getEstadoOELabel(oe.estado)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {!remitoVinculado && oe.estado !== "cancelada" && (
            <Link
              href={`/ventas/remitos/nueva?oe_id=${oe.id}`}
              className="text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg px-3 py-1.5 flex items-center gap-1"
            >
              <Truck className="w-4 h-4" />
              Generar Remito
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={oe.numero} />
            {oe.nota_venta_numero && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Nota de Venta</span>
                {oe.nota_venta_id ? (
                  <Link href={`/ventas/nv/${oe.nota_venta_id}`} className="font-medium text-emerald-700 hover:underline font-mono text-right">
                    {oe.nota_venta_numero}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-900 text-right">{oe.nota_venta_numero}</span>
                )}
              </div>
            )}
            <Row label="Cliente" value={oe.cliente_nombre ?? "—"} />
            {oe.fecha_creacion && <Row label="Fecha creación" value={formatDate(oe.fecha_creacion)} />}
            {oe.fecha_entrega && <Row label="Fecha entrega" value={formatDate(oe.fecha_entrega)} />}
            {oe.domicilio_envio && <Row label="Domicilio" value={oe.domicilio_envio} />}
            {oe.deposito && <Row label="Depósito" value={oe.deposito} />}
            {oe.sucursal && <Row label="Sucursal" value={oe.sucursal} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Remito</h3>
          {remitoVinculado ? (
            <Link href={`/ventas/remitos/${remitoVinculado.id}`} className="text-2xl font-bold text-emerald-600 font-mono hover:underline">
              {remitoVinculado.numero}
            </Link>
          ) : oe.remito_numero ? (
            <p className="text-2xl font-bold text-emerald-600 font-mono">{oe.remito_numero}</p>
          ) : (
            <p className="text-sm text-gray-400">Sin remito generado</p>
          )}
          {remitoVinculado && (
            <p className="text-xs text-gray-500 mt-1">Estado: {remitoVinculado.estado}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Productos</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium">Producto</th>
              <th className="text-center py-2 px-2 font-medium">Cantidad</th>
              <th className="text-center py-2 px-2 font-medium">Reserva</th>
              <th className="text-center py-2 px-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2 text-sm">{p.producto_nombre}</td>
                <td className="py-2 px-2 text-center text-sm">{p.cantidad}</td>
                <td className="py-2 px-2 text-center text-sm">{p.reserva ?? "—"}</td>
                <td className="py-2 px-2 text-center text-sm">{p.estado ?? "—"}</td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-gray-400 text-sm">Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
