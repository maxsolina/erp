"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useERP } from "@/contexts/erp-context"
import { StockListSection } from "@/components/stock/_shared"

interface TipoOperacion {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  secuencia: string
}

const tiposOperacion: TipoOperacion[] = [
  { id: 1, codigo: "IN", nombre: "Recepción", descripcion: "Entrada de mercadería", secuencia: "STK/IN/" },
  { id: 2, codigo: "OUT", nombre: "Salida", descripcion: "Salida de mercadería", secuencia: "STK/OUT/" },
  { id: 3, codigo: "INT", nombre: "Transferencia Interna", descripcion: "Movimiento entre ubicaciones", secuencia: "STK/INT/" },
  { id: 4, codigo: "ADJ", nombre: "Ajuste", descripcion: "Ajuste de stock", secuencia: "STK/ADJ/" },
  { id: 5, codigo: "INV", nombre: "Inventario", descripcion: "Control físico", secuencia: "STK/INV/" },
]

export default function TiposOperacionPage() {
  const router = useRouter()
  const { canSee } = useERP()

  useEffect(() => {
    if (!canSee("stock", "config_tipos_operacion")) router.replace("/")
  }, [canSee, router])

  return (
    <StockListSection<TipoOperacion>
      title="Tipos de Operación"
      moduleName="config_tipos_operacion"
      data={tiposOperacion}
      searchFields={["codigo", "nombre", "descripcion"]}
      filterFields={[]}
    >
      {filtered => (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Secuencia</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-mono text-amber-700">{t.codigo}</td>
                  <td className="py-3 px-4 text-sm font-medium">{t.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{t.descripcion}</td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600">{t.secuencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StockListSection>
  )
}
