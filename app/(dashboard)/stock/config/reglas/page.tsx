"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { StockListSection } from "@/components/stock/_shared"

interface Regla {
  id: number
  nombre: string
  accion: string
  ruta: string
  activa: boolean
}

const reglas: Regla[] = [
  { id: 1, nombre: "Comprar", accion: "Comprar", ruta: "Recepción → Stock", activa: true },
  { id: 2, nombre: "Tomar de Stock", accion: "Tomar", ruta: "Stock → Salida", activa: true },
  { id: 3, nombre: "Producir", accion: "Producir", ruta: "Producción → Stock", activa: false },
  { id: 4, nombre: "Empujar a Distribución", accion: "Empujar", ruta: "Stock → Distribución", activa: true },
]

export default function ReglasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_reglas")) router.replace("/")
  }, [canSee, router])

  return (
    <StockListSection<Regla>
      title="Reglas"
      moduleName="config_reglas"
      data={reglas}
      searchFields={["nombre", "accion", "ruta"]}
      filterFields={[{ field: "accion", label: "Acción" }]}
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Acción</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ruta</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Activa</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{r.nombre}</td>
                  <td className="py-3 px-4 text-sm">{r.accion}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{r.ruta}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${r.activa ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {r.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StockListSection>
  )
}
