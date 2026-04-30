"use client"

// Listado de Categorías de Ubicaciones (config).
// Datos mock (el monolito usaba mockCategoriasUbicacion). Crear/Editar → alert.

import { Plus } from "lucide-react"
import { mockCategoriasUbicacion, StockListSection, type CategoriaUbicacion } from "./_shared"

export default function ConfigCategoriasListado() {
  return (
    <StockListSection<CategoriaUbicacion>
      title="Categorías de Ubicaciones"
      moduleName="config_categorias"
      data={mockCategoriasUbicacion}
      searchFields={["codigo", "nombre", "descripcion"]}
      filterFields={[]}
      actions={
        <button
          onClick={() => alert("Crear categoría — pendiente de UI dedicada")}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Categoría
        </button>
      }
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono text-amber-700">{c.codigo}</td>
                  <td className="py-3 px-4 text-sm font-medium">{c.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{c.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay categorías cargadas</div>
          )}
        </div>
      )}
    </StockListSection>
  )
}
