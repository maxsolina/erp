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

// ─── Types compartidos ──────────────────────────────────────────────────────

export interface Tarjeta {
  id: string
  nombre: string
  tipo: "credito" | "debito"
  dias_presentacion: number
  dias_pago: number
  activa: boolean
}

export interface GrupoTarjeta {
  id: string
  nombre: string
  tarjeta_id: string
  activo: boolean
}

export interface CargosGrupo {
  id: string
  grupo_id: string
  nombre: string
  arancel: number
  iibb: number
  iva: number
  costo_financiero: number
  retencion: number
  ganancias: number
}

export interface RecargoTarjeta {
  id: string
  grupo_id: string
  tarjeta_id: string
  cantidad_cuotas: number
  porcentaje_recargo: number
  cft_efectivo_anual: number
  tea_efectivo_anual: number
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
