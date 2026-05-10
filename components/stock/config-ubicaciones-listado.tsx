"use client"

// Listado de Ubicaciones (config).
// Versión simplificada: solo lectura. Crear/Editar → alert "pendiente de UI dedicada".
// El monolito (renderConfigUbicaciones ~3320-3644) tenía ficha + form con API.

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { mapDeposito, mapUbicacion, StockListSection, type Deposito, type Ubicacion } from "./_shared"

interface UbicacionExtendida extends Ubicacion {
  deposito_nombre: string
  sucursal: string
}

export default function ConfigUbicacionesListado() {
  const [data, setData] = useState<UbicacionExtendida[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/depositos").then(r => r.json()),
      fetch("/api/ubicaciones").then(r => r.json()),
    ])
      .then(([deps, ubics]) => {
        const depos: Deposito[] = (Array.isArray(deps) ? deps : []).map(mapDeposito)
        const depMap = new Map(depos.map(d => [d.id, d]))
        const mapped: UbicacionExtendida[] = (Array.isArray(ubics) ? ubics : []).map((raw: any) => {
          const u = mapUbicacion(raw)
          const dep = depMap.get(u.deposito_id)
          return {
            ...u,
            tipo: raw.tipo ?? "interna",
            categoria_nombre: raw.tipo === "reparacion" ? "En Reparación" : "Stock",
            disponible_venta: raw.tipo === "interna",
            deposito_nombre: dep?.nombre ?? "",
            sucursal: dep?.sucursal ?? "",
          }
        })
        setData(mapped)
      })
      .catch(console.error)
  }, [])

  return (
    <StockListSection<UbicacionExtendida>
      title="Ubicaciones"
      moduleName="config_ubicaciones"
      data={data}
      searchFields={["codigo", "nombre", "deposito_nombre", "sucursal"]}
      filterFields={[
        { field: "tipo", label: "Tipo" },
        { field: "deposito_nombre", label: "Depósito" },
        { field: "sucursal", label: "Sucursal" },
      ]}
      actions={
        <button
          onClick={() => alert("Crear ubicación — pendiente de UI dedicada")}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Ubicación
        </button>
      }
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Disp. NV</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{u.nombre}</td>
                  <td className="py-3 px-4 text-sm capitalize">{u.tipo}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{u.categoria_nombre}</td>
                  <td className="py-3 px-4 text-sm">{u.deposito_nombre}</td>
                  <td className="py-3 px-4 text-sm">{u.sucursal}</td>
                  <td className="py-3 px-4 text-center text-sm">{u.disponible_venta ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay ubicaciones cargadas</div>
          )}
        </div>
      )}
    </StockListSection>
  )
}
