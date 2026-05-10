"use client"

// Listado de Depósitos (config).
// Versión simplificada: solo lectura. Crear/Editar → alert "pendiente de UI dedicada".
// El monolito (renderConfigDepositos ~3040-3318) tenía ficha + form de creación con API.

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { mapDeposito, StockListSection, type Deposito } from "./_shared"

interface DepositoExtendido extends Deposito {
  direccion?: string
  deposito_distribucion?: boolean
  deposito_tercero?: boolean
}

export default function ConfigDepositosListado() {
  const [data, setData] = useState<DepositoExtendido[]>([])

  useEffect(() => {
    fetch("/api/depositos")
      .then(r => r.json())
      .then(d => {
        const mapped: DepositoExtendido[] = (Array.isArray(d) ? d : []).map((raw: any) => ({
          ...mapDeposito(raw),
          direccion: raw.direccion ?? "",
          deposito_distribucion: !!raw.deposito_distribucion,
          deposito_tercero: !!raw.deposito_tercero,
        }))
        setData(mapped)
      })
      .catch(console.error)
  }, [])

  return (
    <StockListSection<DepositoExtendido>
      title="Depósitos"
      moduleName="config_depositos"
      data={data}
      searchFields={["codigo", "nombre", "sucursal", "direccion"]}
      filterFields={[
        { field: "sucursal", label: "Sucursal" },
        { field: "activo", label: "Activo" },
      ]}
      actions={
        <button
          onClick={() => alert("Crear depósito — pendiente de UI dedicada")}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Depósito
        </button>
      }
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Dirección</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Distribución</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">De Tercero</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Activo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono text-amber-700">{d.codigo}</td>
                  <td className="py-3 px-4 text-sm font-medium">{d.nombre}</td>
                  <td className="py-3 px-4 text-sm">{d.sucursal}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{d.direccion || "—"}</td>
                  <td className="py-3 px-4 text-center text-sm">{d.deposito_distribucion ? "Sí" : "—"}</td>
                  <td className="py-3 px-4 text-center text-sm">{d.deposito_tercero ? "Sí" : "—"}</td>
                  <td className="py-3 px-4 text-center text-sm">{d.activo ? "✓" : "✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay depósitos cargados</div>
          )}
        </div>
      )}
    </StockListSection>
  )
}
