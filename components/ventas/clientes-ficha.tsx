"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { formatCurrency, type Cliente } from "./_shared"

export default function ClienteFicha({ clienteId }: { clienteId: number }) {
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/clientes/${clienteId}`)
      .then(async r => {
        if (!r.ok) {
          setError(r.status === 404 ? "Cliente no encontrado" : `Error ${r.status}`)
          setCliente(null)
          return
        }
        setCliente(await r.json())
      })
      .catch(err => {
        console.error(err)
        setError("Error de red")
        setCliente(null)
      })
  }, [clienteId])

  if (cliente === undefined) return <div className="p-12 text-center text-gray-500">Cargando...</div>
  if (cliente === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Cliente no encontrado"}</p>
        <Link href="/ventas/clientes" className="text-indigo-700 hover:underline">Volver al listado</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ventas/clientes")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
        {cliente.codigo && <span className="font-mono text-sm text-gray-500">{cliente.codigo}</span>}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cliente.activo ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
          {cliente.activo ? "Activo" : "Inactivo"}
        </span>
        <div className="ml-auto">
          <Link
            href={`/?module=ventas&view=listado`}
            className="text-sm text-indigo-700 hover:underline"
          >
            Editar en el módulo Ventas →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos Generales</h3>
          <div className="space-y-3 text-sm">
            <Row label="Razón social" value={cliente.razon_social ?? cliente.nombre} />
            <Row label="Documento" value={cliente.tipo_documento ? `${cliente.tipo_documento}: ${cliente.numero_documento ?? ""}` : (cliente.numero_documento ?? "")} />
            <Row label="CUIT" value={cliente.cuit ?? ""} />
            <Row label="Condición IVA" value={cliente.condicion_iva ?? ""} />
            <Row label="Email" value={cliente.email ?? ""} />
            <Row label="Teléfono" value={cliente.telefono ?? ""} />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Dirección y Cuenta</h3>
          <div className="space-y-3 text-sm">
            <Row label="Dirección" value={cliente.direccion ?? ""} />
            <Row label="Ciudad" value={cliente.ciudad ?? ""} />
            <Row label="Provincia" value={cliente.provincia ?? ""} />
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Saldo cuenta corriente</span>
                <span className={`font-bold ${(cliente.saldo_cuenta_corriente ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(cliente.saldo_cuenta_corriente ?? 0)}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">Total facturado</span>
                <span className="font-medium">{formatCurrency(cliente.total_facturado ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || "—"}</span>
    </div>
  )
}
