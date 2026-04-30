"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  diasRestantes,
  formatCurrency,
  formatDate,
  getEstadoSeniaColor,
  getEstadoSeniaLabel,
  type SeniaEquipo,
} from "./_shared"

export default function SeniaFicha({ seniaId }: { seniaId: number }) {
  const router = useRouter()
  const [senia, setSenia] = useState<SeniaEquipo | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/senias-equipo?id=${seniaId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setSenia(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item || !item.id) {
          setError("Seña no encontrada")
          setSenia(null)
          return
        }
        setSenia(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red al cargar la seña")
        setSenia(null)
      })
  }, [seniaId])

  if (senia === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando seña...</div>
  }
  if (senia === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Seña no encontrada"}</p>
        <Link href="/ventas/senia-equipo" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = senia.moneda ?? "ARS"
  const dias = diasRestantes(senia.fecha_limite)
  const vencida = dias !== null && dias < 0 && senia.estado === "en_curso"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/senia-equipo")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-amber-900">{senia.numero}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoSeniaColor(senia.estado)}`}>
          {getEstadoSeniaLabel(senia.estado)}
        </span>
        {vencida && (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700">
            Vencida hace {Math.abs(dias!)} días
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={`/?module=ventas&view=senia_equipo&id=${senia.id}`}
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
            <Row label="Número" value={senia.numero} />
            <Row label="Fecha" value={formatDate(senia.fecha)} />
            <Row label="Cliente" value={senia.cliente_nombre ?? "—"} />
            <Row label="Fecha límite" value={senia.fecha_limite ? formatDate(senia.fecha_limite) : "—"} />
            {dias !== null && senia.estado === "en_curso" && (
              <Row label="Días restantes" value={vencida ? `Vencida hace ${Math.abs(dias)} días` : dias === 0 ? "Hoy" : `${dias} días`} />
            )}
            <Row label="Moneda" value={moneda} />
            {senia.cotizacion != null && <Row label="Cotización" value={String(senia.cotizacion)} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Equipo</h3>
          <div className="space-y-3 text-sm">
            <Row label="Equipo" value={senia.equipo_nombre ?? "—"} />
            {senia.equipo_imei && <Row label="IMEI" value={senia.equipo_imei} />}
            {senia.equipo_color && <Row label="Color" value={senia.equipo_color} />}
            {senia.equipo_bateria != null && <Row label="Batería" value={`${senia.equipo_bateria}%`} />}
            {senia.precio_venta != null && <Row label="Precio venta" value={formatCurrency(senia.precio_venta, moneda)} />}
            {senia.descuento != null && senia.descuento > 0 && <Row label="Descuento" value={formatCurrency(senia.descuento, moneda)} />}
            <Row label="Precio final" value={formatCurrency(senia.precio_final, moneda)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Seña</h3>
          <div className="space-y-3 text-sm">
            <Row label="Estado seña" value={senia.estado_senia === "registrada" ? "Registrada" : "Sin seña"} />
            {senia.monto_senia != null && <Row label="Monto" value={formatCurrency(senia.monto_senia, moneda)} />}
            {senia.medio_pago_senia && <Row label="Medio de pago" value={senia.medio_pago_senia} />}
            {senia.recibo_senia_numero && <Row label="Recibo" value={senia.recibo_senia_numero} />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Documentos vinculados</h3>
          <div className="space-y-3 text-sm">
            {senia.nota_venta_numero && <Row label="Nota de Venta" value={senia.nota_venta_numero} />}
            {senia.oe_numero && <Row label="OE" value={senia.oe_numero} />}
            {senia.remito_numero && <Row label="Remito" value={senia.remito_numero} />}
            {senia.factura_numero && <Row label="Factura" value={senia.factura_numero} />}
            {!senia.nota_venta_numero && !senia.oe_numero && !senia.remito_numero && !senia.factura_numero && (
              <p className="text-xs text-gray-400">Aún sin documentos asociados</p>
            )}
          </div>
        </div>
      </div>

      {senia.medios_pago_cierre && senia.medios_pago_cierre.length > 0 && (
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Medios de pago al cierre</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-2 font-medium">Medio</th>
                <th className="text-right py-2 px-2 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {senia.medios_pago_cierre.map((m, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-sm">{m.medio}</td>
                  <td className="py-2 px-2 text-right text-sm font-medium">{formatCurrency(m.monto, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
