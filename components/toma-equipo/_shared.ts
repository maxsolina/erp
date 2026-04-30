// Tipos y helpers compartidos para Toma de Equipo.
// Extraídos de components/ventas-module.tsx (estado ~1713-1745, ~1976, helper ~5963-5975).

export interface TomaEquipoEvaluacionItem {
  categoria_id: string
  categoria_nombre: string
  accion: "descuento" | "whatsapp" | "cartel_sistema"
  criterio_id: string | null
  etiqueta: string
  descuento_usd: number
  whatsapp_flag: boolean
}

export interface TomaEquipo {
  id: number
  numero: string
  fecha: string
  cliente_id: number
  cliente_nombre: string
  modelo_equipo: string
  precio_base: number
  descuentos: number
  precio_final: number
  estado: "borrador" | "confirmado" | "cancelado"
  estado_recepcion: "pendiente" | "recibido" | "cancelado"
  recepcion_numero?: string
  nota_credito_numero?: string
  // Compat con formato legacy {componente, estado, descuento} y nuevo {categoria, etiqueta, descuento_usd, ...}
  evaluacion: Array<{
    componente?: string
    categoria?: string
    estado?: string
    etiqueta?: string
    descuento?: number
    descuento_usd?: number
    accion?: string
    whatsapp_flag?: boolean
  }>
}

export interface CotizadorModelo {
  id: string
  producto_id: number
  producto_nombre: string
  valor_base_usd: number
}

export interface CotizadorCategoria {
  id: string
  nombre: string
  orden: number
  accion: "descuento" | "whatsapp" | "cartel_sistema"
}

export interface CotizadorCriterio {
  id: string
  categoria_id: string
  etiqueta: string
  descuento_usd: number
  descuento_porcentaje: number | null
}

export { formatCurrency } from "@/lib/format"

export function calcularPrecioFinalUsd(
  base: number,
  evaluacion: TomaEquipoEvaluacionItem[],
): { final: number; descuentoTotal: number; aplicaCartel: boolean } {
  const aplicaCartel = evaluacion.some(e => e.accion === "cartel_sistema" && e.descuento_usd > 0)
  const baseAjustada = aplicaCartel ? base * 0.5 : base
  const descuentosNominales = evaluacion
    .filter(e => e.accion !== "cartel_sistema" && e.criterio_id)
    .reduce((s, e) => s + Number(e.descuento_usd || 0), 0)
  const final = Math.max(0, baseAjustada - descuentosNominales)
  const descuentoTotal = base - final
  return {
    final: Number(final.toFixed(2)),
    descuentoTotal: Number(descuentoTotal.toFixed(2)),
    aplicaCartel,
  }
}
