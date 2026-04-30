// Tipos compartidos para Finanzas (top-level migradas).

export interface Caja {
  id: number
  nombre: string
  codigo?: string
  sucursal?: string
  cierre_diario_obligatorio?: boolean
  activo: boolean
}

export { formatCurrency, formatDate } from "@/lib/format"
