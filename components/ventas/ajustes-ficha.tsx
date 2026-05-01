"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getEstadoAjusteColor,
  getEstadoAjusteLabel,
  type AjusteCliente,
} from "./_shared"

interface Props {
  ajusteId: number
  // Ruta a la que vuelve el botón "back" — depende de si vino de
  // /ventas/ajustes, /ventas/nc o /ventas/nd
  backHref: string
  // Sección del monolito a la que abre el botón "Editar"
  view: string
}

export default function AjustesFicha({ ajusteId, backHref, view }: Props) {
  const router = useRouter()
  const [ajuste, setAjuste] = useState<AjusteCliente | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/ajustes-clientes?id=${ajusteId}`)
      .then(async r => {
        if (!r.ok) {
          setError(`Error ${r.status}`)
          setAjuste(null)
          return
        }
        const data = await r.json()
        const item = Array.isArray(data) ? data[0] : data
        if (!item) {
          setError("Registro no encontrado")
          setAjuste(null)
          return
        }
        setAjuste(item)
      })
      .catch(err => {
        console.error(err)
        setError("Error de red")
        setAjuste(null)
      })
  }, [ajusteId])

  if (ajuste === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando...</div>
  }
  if (ajuste === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Registro no encontrado"}</p>
        <Link href={backHref} className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  const moneda = ajuste.moneda ?? "ARS"
  const lineas = ajuste.lineas ?? []
  const esNC = ajuste.numero.startsWith("NC-")
  const esND = ajuste.numero.startsWith("ND-")
  const tituloTipo = esNC ? "Nota de Crédito" : esND ? "Nota de Débito" : "Ajuste de Cliente"

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(backHref)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-amber-900">{ajuste.numero}</h1>
          <p className="text-sm text-gray-500">{tituloTipo}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoAjusteColor(ajuste.estado)}`}>
          {getEstadoAjusteLabel(ajuste.estado)}
        </span>
        <div className="ml-auto flex items-center gap-3" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos</h3>
          <div className="space-y-3 text-sm">
            <Row label="Número" value={ajuste.numero} />
            <Row label="Fecha" value={formatDate(ajuste.fecha)} />
            <Row label="Cliente" value={ajuste.cliente_nombre ?? "—"} />
            {ajuste.concepto && <Row label="Concepto" value={ajuste.concepto} />}
            {ajuste.nota_venta_numero && <Row label="Nota de Venta" value={ajuste.nota_venta_numero} />}
            {ajuste.categoria && <Row label="Categoría" value={ajuste.categoria} />}
            {ajuste.sucursal && <Row label="Sucursal" value={ajuste.sucursal} />}
            <Row label="Moneda" value={moneda} />
            {ajuste.es_automatica && <Row label="Automática" value="Sí" />}
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Total</h3>
          <p className={`text-3xl font-bold ${ajuste.total < 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(ajuste.total, moneda)}
          </p>
          {ajuste.saldo_disponible != null && ajuste.saldo_disponible !== ajuste.total && (
            <div className="mt-4 pt-4 border-t">
              <Row label="Saldo disponible" value={formatCurrency(ajuste.saldo_disponible, moneda)} />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Líneas</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b text-xs text-gray-500 uppercase">
              <th className="text-left py-2 px-2 font-medium">Descripción</th>
              <th className="text-left py-2 px-2 font-medium">Vencimiento</th>
              <th className="text-right py-2 px-2 font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 px-2 text-sm">{l.descripcion ?? "—"}</td>
                <td className="py-2 px-2 text-sm">{l.fecha_vencimiento ? formatDate(l.fecha_vencimiento) : "—"}</td>
                <td className="py-2 px-2 text-right text-sm font-medium">{formatCurrency(l.importe, moneda)}</td>
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
