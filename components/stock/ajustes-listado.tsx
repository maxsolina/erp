"use client"

// Listado de Ajustes Positivos / Negativos — wired al API real.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import {
  formatDate,
  StockListSection,
  type AjusteInventario,
} from "./_shared"

const ESTADO_COLOR: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  pendiente: "bg-amber-100 text-amber-700",
  confirmado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
}

export default function AjustesListado({ tipo }: { tipo: "positivo" | "negativo" }) {
  const router = useRouter()
  const [ajustes, setAjustes] = useState<AjusteInventario[]>([])
  const [cargando, setCargando] = useState(true)
  const titulo = tipo === "positivo" ? "Ajustes Positivos" : "Ajustes Negativos"

  useEffect(() => {
    setCargando(true)
    fetch(`/api/stock/ajustes?tipo=${tipo}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setAjustes(Array.isArray(data) ? data : []))
      .catch(() => setAjustes([]))
      .finally(() => setCargando(false))
  }, [tipo])

  return (
    <StockListSection<AjusteInventario>
      title={titulo}
      moduleName={`ajustes-${tipo}`}
      data={ajustes}
      searchFields={["numero", "deposito_nombre", "ubicacion_nombre", "concepto"]}
      filterFields={[
        { field: "estado", label: "Estado" },
        { field: "deposito_nombre", label: "Depósito" },
      ]}
      actions={
        <Link
          href={`/stock/ajustes/${tipo}s/nuevo`}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Ajuste
        </Link>
      }
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr
                  key={a.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/stock/ajustes/${tipo}s/${a.id}`)}
                >
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{a.numero}</td>
                  <td className="py-3 px-4 text-sm">{a.deposito_nombre}</td>
                  <td className="py-3 px-4 text-sm">{a.ubicacion_nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(a.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{a.concepto}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[a.estado] ?? "bg-gray-100 text-gray-700"}`}>
                      {ESTADO_LABEL[a.estado] ?? a.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {cargando
                ? "Cargando ajustes..."
                : `No hay ajustes ${tipo === "positivo" ? "positivos" : "negativos"}`}
            </div>
          )}
        </div>
      )}
    </StockListSection>
  )
}
