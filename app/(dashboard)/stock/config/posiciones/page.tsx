"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { StockListSection } from "@/components/stock/_shared"

interface Posicion {
  id: number
  codigo: string
  nombre: string
  ubicacion: string
  capacidad: number
}

const posiciones: Posicion[] = [
  { id: 1, codigo: "A1", nombre: "Estante A - Nivel 1", ubicacion: "CC/Stock/Estantería-A", capacidad: 100 },
  { id: 2, codigo: "A2", nombre: "Estante A - Nivel 2", ubicacion: "CC/Stock/Estantería-A", capacidad: 100 },
  { id: 3, codigo: "B1", nombre: "Estante B - Nivel 1", ubicacion: "CC/Stock/Estantería-B", capacidad: 80 },
  { id: 4, codigo: "B2", nombre: "Estante B - Nivel 2", ubicacion: "CC/Stock/Estantería-B", capacidad: 80 },
  { id: 5, codigo: "C1", nombre: "Pallet C", ubicacion: "PN/Stock/Pallet-C", capacidad: 200 },
]

export default function PosicionesPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_posiciones")) router.replace("/")
  }, [canSee, router])

  return (
    <StockListSection<Posicion>
      title="Posiciones de Ubicaciones"
      moduleName="config_posiciones"
      data={posiciones}
      searchFields={["codigo", "nombre", "ubicacion"]}
      filterFields={[{ field: "ubicacion", label: "Ubicación" }]}
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Capacidad (uds)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono text-amber-700">{p.codigo}</td>
                  <td className="py-3 px-4 text-sm font-medium">{p.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{p.ubicacion}</td>
                  <td className="py-3 px-4 text-sm text-right">{p.capacidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StockListSection>
  )
}
