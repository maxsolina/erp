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

export function formatCurrency(amount: number, moneda: string = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatDate(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("es-AR")
}

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
