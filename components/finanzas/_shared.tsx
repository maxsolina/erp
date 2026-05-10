"use client"

// ─── Helpers compartidos del módulo Finanzas ────────────────────────────────
// Extraídos del monolito para no duplicarlos en cada componente migrado.

import type { ReactNode } from "react"

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
      <h2 className="text-2xl font-bold text-amber-900">{title}</h2>
      <div className="flex gap-2">{children}</div>
    </div>
  )
}

export function Badge({ children, color = "gray" }: { children: ReactNode; color?: "gray" | "emerald" | "blue" | "amber" | "red" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>{children}</span>
}

export function formatPct(n: number) {
  return `${n.toFixed(2)}%`
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)
}

export const CUOTAS_OPTIONS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

export const DIAS_LABELS = [
  { key: "lun", label: "L" }, { key: "mar", label: "M" }, { key: "mie", label: "X" },
  { key: "jue", label: "J" }, { key: "vie", label: "V" }, { key: "sab", label: "S" },
  { key: "dom", label: "D" },
] as const

// ─── Types compartidos ──────────────────────────────────────────────────────

export interface Tarjeta {
  id: number
  nombre: string
  tipo: "credito" | "debito"
  dias_presentacion: number
  dias_pago: number
  activa: boolean
}

export interface CargosGrupo {
  id: number
  nombre: string
  tipo: string
  arancel: number
  es_porcentaje: boolean
  cuenta_contable: string
}

export interface GrupoTarjeta {
  id: number
  nombre: string
  banco: string
  tipo_movimiento: string
  activo: boolean
  tarjetas_ids: number[]
  cargos: CargosGrupo[]
}

export interface RecargoTarjeta {
  id: number
  sucursal: string
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  fecha_desde: string
  fecha_hasta: string
  recargo_pct: number
  dias: { lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean; dom: boolean }
  activo: boolean
}

export interface Banco {
  id: string
  codigo: string
  nombre: string
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  activo: boolean
}
