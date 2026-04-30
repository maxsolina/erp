"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { StockListSection } from "@/components/stock/_shared"

interface Ruta {
  id: number
  nombre: string
  activa: boolean
  secuencia: number
}

const rutas: Ruta[] = [
  { id: 1, nombre: "Recepción → Stock", activa: true, secuencia: 10 },
  { id: 2, nombre: "Stock → Salida", activa: true, secuencia: 20 },
  { id: 3, nombre: "Recepción → Control de Calidad → Stock", activa: true, secuencia: 30 },
  { id: 4, nombre: "Devolución → Cliente", activa: false, secuencia: 40 },
]

export default function RutasPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_rutas")) router.replace("/")
  }, [canSee, router])

  return (
    <StockListSection<Ruta>
      title="Rutas"
      moduleName="config_rutas"
      data={rutas}
      searchFields={["nombre"]}
      filterFields={[]}
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Secuencia</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Activa</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium">{r.nombre}</td>
                  <td className="py-3 px-4 text-sm text-right">{r.secuencia}</td>
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
