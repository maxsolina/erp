// Tipos y helpers compartidos para Ventas (top-level migradas).

export interface Cliente {
  id: number
  codigo?: string
  nombre: string
  razon_social?: string | null
  tipo_documento?: string
  numero_documento?: string | null
  cuit?: string | null
  condicion_iva?: string
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  ciudad?: string | null
  provincia?: string | null
  saldo_cuenta_corriente?: number
  total_facturado?: number
  activo: boolean
  categoria_id?: number | null
  vendedor_id?: number | null
  lista_precios_id?: number | null
}

export { formatCurrency, formatDate } from "@/lib/format"

// ─── Notas de Venta ─────────────────────────────────────────────────────────

export interface NotaVenta {
  id: number
  numero: string
  fecha: string
  cliente_id?: number | null
  cliente_nombre?: string
  cliente_codigo?: string
  vendedor_id?: number | null
  vendedor_nombre?: string
  sucursal_id?: number | null
  sucursal?: string
  deposito?: string
  moneda?: string
  estado: string
  subtotal?: number
  impuestos?: number
  total: number
  notas?: string | null
  created_at?: string
}

export interface NotaVentaLinea {
  id?: number
  nota_venta_id?: number
  producto_id?: number | null
  producto_nombre: string
  descripcion?: string | null
  cantidad: number
  precio_unitario: number
  descuento?: number
  subtotal?: number
  iva?: number
}

export interface NotaVentaDetalle extends NotaVenta {
  notas_venta_lineas?: NotaVentaLinea[]
}

const ESTADO_NV_COLORS: Record<string, string> = {
  abierta: "bg-blue-100 text-blue-700",
  borrador: "bg-gray-100 text-gray-700",
  a_facturar: "bg-blue-100 text-blue-700",
  verificacion_factura: "bg-yellow-100 text-yellow-700",
  verificacion_oe: "bg-orange-100 text-orange-700",
  facturada: "bg-purple-100 text-purple-700",
  finalizada: "bg-green-100 text-green-700",
  parcial: "bg-yellow-100 text-yellow-700",
  cancelada: "bg-red-100 text-red-700",
}

const ESTADO_NV_LABELS: Record<string, string> = {
  abierta: "Abierta",
  borrador: "Borrador",
  a_facturar: "A Facturar",
  verificacion_factura: "Verif. Factura",
  verificacion_oe: "Verif. OE",
  facturada: "Facturada",
  finalizada: "Finalizada",
  parcial: "Parcial",
  cancelada: "Cancelada",
}

export function getEstadoNVColor(estado: string) {
  return ESTADO_NV_COLORS[estado] ?? "bg-gray-100 text-gray-700"
}

export function getEstadoNVLabel(estado: string) {
  return ESTADO_NV_LABELS[estado] ?? estado
}
