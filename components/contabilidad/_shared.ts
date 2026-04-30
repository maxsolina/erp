// Tipos compartidos para Contabilidad (top-level migradas).

export interface TipoCuenta {
  id: number
  codigo: string
  nombre: string
  es_resultado?: boolean
}

export interface CuentaPadre {
  id: number
  codigo: string
  nombre: string
}

export interface PlanCuenta {
  id: number
  codigo: string
  nombre: string
  descripcion?: string | null
  cuenta_padre_id?: number | null
  tipo_cuenta_id?: number | null
  es_imputable?: boolean
  acepta_movimientos?: boolean
  moneda?: string
  activo: boolean
  tipo_cuenta?: TipoCuenta | null
  padre?: CuentaPadre | null
  created_at?: string
}

export { formatCurrency, formatDate } from "@/lib/format"
