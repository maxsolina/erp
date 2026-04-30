// Tipos compartidos para Compras (top-level migradas en PR 10).
// Las creaciones/ediciones siguen en el monolito components/modulo-compras-v2.tsx.
// Las páginas migradas son listados + ficha read-only.

export interface OrdenCompra {
  id: number
  numero: string
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "confirmada" | "parcial" | "completa"
  moneda?: "ARS" | "USD"
  sucursal?: string
  total: number
  fecha_entrega_estimada?: string
}

export interface OrdenCompraDetalle extends OrdenCompra {
  items?: Array<{
    producto_id: number
    sku?: string
    codigo?: string
    nombre: string
    cantidad: number
    cantidad_recibida?: number
    precio: number
    subtotal?: number
  }>
  observaciones?: string
}

export interface Recepcion {
  id: number
  numero: string
  fecha: string
  orden_compra_id?: number
  orden_compra_numero?: string
  proveedor_id?: number
  proveedor_nombre: string
  sucursal?: string
  deposito_destino?: string
  estado: "borrador" | "confirmada" | "recibida" | "esperando_recepcion" | "cancelada"
  total?: number
}

export interface RecepcionDetalle extends Recepcion {
  lineas?: Array<{
    producto_id: number
    producto_nombre: string
    cantidad: number
    precio_unitario?: number
    unidades_serie?: Array<{ nro_serie: string; color?: string; bateria_pct?: number; outlet?: boolean }>
  }>
  ubicacion?: string
  observaciones?: string
  documento_origen_ref?: string
}

export { formatCurrency, formatDate } from "@/lib/format"

export function getEstadoOcColor(estado: OrdenCompra["estado"]) {
  if (estado === "confirmada" || estado === "completa") return "bg-green-100 text-green-700"
  if (estado === "parcial") return "bg-yellow-100 text-yellow-700"
  return "bg-gray-100 text-gray-600"
}

export function getEstadoOcLabel(estado: string) {
  const labels: Record<string, string> = {
    borrador: "Borrador",
    confirmada: "Confirmada",
    parcial: "Parcial",
    completa: "Completa",
  }
  return labels[estado] ?? estado
}

export function getEstadoRecepcionColor(estado: string) {
  if (estado === "recibida" || estado === "confirmada") return "bg-green-100 text-green-700"
  if (estado === "cancelada") return "bg-red-100 text-red-700"
  return "bg-amber-100 text-amber-700"
}

export function getEstadoRecepcionLabel(estado: string) {
  const labels: Record<string, string> = {
    borrador: "Borrador",
    confirmada: "Confirmada",
    recibida: "Recibida",
    esperando_recepcion: "Esperando recepción",
    cancelada: "Cancelada",
  }
  return labels[estado] ?? estado
}

export interface FacturaCompra {
  id: number
  numero: string
  tipo?: "A" | "B" | "C"
  fecha: string
  fecha_vencimiento?: string
  proveedor_id: number
  proveedor_nombre: string
  estado: string
  total: number
  saldo?: number
  moneda?: string
}

export function getEstadoFacturaColor(estado: string) {
  if (estado === "pagada" || estado === "publicado" || estado === "publicada") return "bg-green-100 text-green-700"
  if (estado === "vencida" || estado === "cancelado" || estado === "cancelada") return "bg-red-100 text-red-700"
  if (estado === "pendiente" || estado === "borrador") return "bg-amber-100 text-amber-700"
  return "bg-gray-100 text-gray-600"
}

export function getEstadoFacturaLabel(estado: string) {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    pagada: "Pagada",
    vencida: "Vencida",
    borrador: "Borrador",
    publicado: "Publicado",
    publicada: "Publicada",
    cancelado: "Cancelado",
    cancelada: "Cancelada",
  }
  return labels[estado] ?? estado
}
