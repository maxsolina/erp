"use client"

// Ficha de Transferencia Interna (lectura).
// Extraído de components/modulo-stock.tsx → renderFichaTransferencia (~2132-2267).

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BotonVolver from "@/components/ui/boton-volver"
import { getTransferencia, SeguimientoPanel, type TransferenciaInterna } from "./_shared"

export default function TransferenciaFicha({ transferenciaId }: { transferenciaId: number }) {
  const router = useRouter()
  const [transferencia, setTransferencia] = useState<TransferenciaInterna | null | undefined>(undefined)

  useEffect(() => {
    setTransferencia(getTransferencia(transferenciaId) ?? null)
  }, [transferenciaId])

  if (transferencia === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando transferencia...</div>
  }

  if (transferencia === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">Transferencia no encontrada</p>
        <p className="text-sm text-gray-500 mb-3">
          Las transferencias se guardan por sesión del navegador. Si recargaste la pestaña o abriste otra, se reinician.
        </p>
        <Link href="/stock/transferencias" className="text-indigo-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  const t = transferencia

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/stock/transferencias" className="hover:text-amber-700">
          Transferencias Internas
        </Link>
        <span>/</span>
        <span className="font-medium text-gray-900">{t.numero}</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <BotonVolver onClick={() => router.push("/stock/transferencias")} variant="ghost" />
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span
            className={`px-3 py-1 rounded-l text-xs font-medium ${
              t.estado === "borrador" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Borrador
          </span>
          <span
            className={`px-3 py-1 rounded-r text-xs font-medium ${
              t.estado === "confirmada" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            Confirmada
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Transferencia Interna <span className="text-gray-400">X</span>{" "}
          <span className="text-blue-600">{t.numero.split("-")[1] ?? t.numero}</span>
        </h2>

        <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
          <div className="space-y-4">
            <Field label="Depósito" value={t.deposito_nombre} />
            <Field label="Ubicación Origen" value={t.ubicacion_origen_nombre} />
            <Field label="Ubicación Destino" value={t.ubicacion_destino_nombre} />
          </div>
          <div className="space-y-4">
            <Field label="Fecha creación" value={new Date(t.fecha_creacion).toLocaleDateString("es-AR")} />
            <Field label="Sucursal" value={t.sucursal} />
            {t.fecha_transferencia && (
              <Field label="Fecha transf." value={new Date(t.fecha_transferencia).toLocaleDateString("es-AR")} />
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Productos</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Producto</th>
                <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Stock Virtual</th>
                <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Cantidad</th>
                <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Observación</th>
              </tr>
            </thead>
            <tbody>
              {t.lineas.map((linea, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-sm">{linea.producto_nombre}</td>
                  <td className="py-2 px-2 text-center text-sm text-gray-600">{linea.stock_virtual}</td>
                  <td className="py-2 px-2 text-center text-sm font-medium">{linea.cantidad}</td>
                  <td className="py-2 px-2 text-sm text-gray-500">{linea.observacion || "-"}</td>
                </tr>
              ))}
              {t.lineas.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-gray-400">
                    Sin productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {t.observaciones && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Observaciones</h3>
            <p className="text-sm text-gray-600">{t.observaciones}</p>
          </div>
        )}

        <SeguimientoPanel seguimiento={t.seguimiento ?? []} collapsed={false} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-32 text-sm text-gray-600">{label}</label>
      <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">{value}</div>
    </div>
  )
}
