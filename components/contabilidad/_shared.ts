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

// ─── Años fiscales / Períodos ──────────────────────────────────────────────

export interface AnoFiscal {
  id: number
  nombre: string
  codigo?: string
  fecha_inicio: string
  fecha_fin: string
  estado?: string
  activo?: boolean
  contabilidad_periodos?: PeriodoContable[]
}

export interface PeriodoContable {
  id: number
  ano_fiscal_id: number
  nombre: string
  codigo?: string
  fecha_inicio: string
  fecha_fin: string
  estado: string
  contabilidad_anos_fiscales?: { nombre: string; codigo?: string }
}

// ─── Diarios ───────────────────────────────────────────────────────────────

export interface Diario {
  id: number
  codigo: string
  nombre: string
  tipo?: string
  moneda?: string
  activo: boolean
  es_automatico?: boolean
  sucursal?: { id: number; nombre: string } | null
  cuenta_debito?: { id: number; codigo: string; nombre: string } | null
  cuenta_haber?: { id: number; codigo: string; nombre: string } | null
}

// ─── Monedas ───────────────────────────────────────────────────────────────

export interface Moneda {
  id: number
  codigo: string
  nombre: string
  simbolo?: string
  es_base?: boolean
  decimales?: number
  activo: boolean
}

// ─── Tipos de cotización / Tipos de cuenta ──────────────────────────────────

export interface TipoCotizacion {
  id: number
  codigo?: string
  nombre: string
  descripcion?: string | null
  activo: boolean
}

export interface TipoCuentaConfig {
  id: number
  codigo: string
  nombre: string
  es_resultado?: boolean
  activo: boolean
}
