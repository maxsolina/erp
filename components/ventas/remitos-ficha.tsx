"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatDate,
  getEstadoRemitoColor,
  getEstadoRemitoLabel,
  type Remito,
} from "./_shared"

export default function RemitosFicha({ remitoId }: { remitoId: number }) {
  const router = useRouter()
  const [remito, setRemito] = useState<Remito | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

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
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/?module=ventas&view=remitos&id=${remito.id}`}
            className="text-sm text-indigo-700 hover:underline"
          >
            Editar en el módulo Ventas →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={remito.numero} />
            {remito.fecha && <Row label="Fecha" value={formatDate(remito.fecha)} />}
            <Row label="Cliente" value={remito.cliente_nombre ?? "—"} />
            {remito.orden_entrega_numero && <Row label="OE" value={remito.orden_entrega_numero} />}
            {remito.nota_venta_numero && <Row label="NV" value={remito.nota_venta_numero} />}
            {remito.factura_numero && <Row label="Factura" value={remito.factura_numero} />}
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
