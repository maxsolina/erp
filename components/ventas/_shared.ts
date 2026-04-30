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

// ─── Órdenes de Entrega ─────────────────────────────────────────────────────

export interface OrdenEntregaProducto {
  producto_id: number
  producto_nombre: string
  cantidad: number
  reserva?: number
  estado?: string
}

export interface OrdenEntrega {
  id: number
  numero: string
  nota_venta_id?: number
  nota_venta_numero?: string
  cliente_id?: number
  cliente_nombre?: string
  estado: string
  fecha_creacion?: string
  fecha_entrega?: string
  domicilio_envio?: string
  deposito?: string
  sucursal?: string
  remito_numero?: string | null
  productos?: OrdenEntregaProducto[]
  seguimiento?: unknown[]
  created_at?: string
}

const ESTADO_OE_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  esperando: "bg-yellow-100 text-yellow-700",
  parcial: "bg-orange-100 text-orange-700",
  disponible: "bg-blue-100 text-blue-700",
  confirmada: "bg-green-100 text-green-700",
  finalizada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
}

const ESTADO_OE_LABELS: Record<string, string> = {
  borrador: "Borrador",
  esperando: "Esperando Disponibilidad",
  parcial: "Parcialmente Disponible",
  disponible: "Disponible",
  confirmada: "Confirmada",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
}

export function getEstadoOEColor(estado: string) {
  return ESTADO_OE_COLORS[estado] ?? "bg-gray-100 text-gray-700"
}

export function getEstadoOELabel(estado: string) {
  return ESTADO_OE_LABELS[estado] ?? estado
}

// ─── Remitos ────────────────────────────────────────────────────────────────

export interface RemitoLinea {
  producto_id?: number
  producto_nombre: string
  cantidad: number
  requiere_serie?: boolean
  series_seleccionadas?: { id: number; serie: string; detalles?: string }[]
}

export interface Remito {
  id: number
  numero: string
  fecha?: string
  cliente_id?: number
  cliente_nombre?: string
  orden_entrega_id?: number
  orden_entrega_numero?: string
  nota_venta_id?: number
  nota_venta_numero?: string
  domicilio_envio?: string
  sucursal?: string
  deposito?: string
  ubicacion?: string
  estado?: string
  control_factura?: "facturado" | "pendiente"
  factura_numero?: string | null
  peso_kg?: number
  peso_neto_kg?: number
  bultos?: number
  valor_declarado?: number
  asiento_id?: string | null
  lineas?: RemitoLinea[]
  created_at?: string
}

const ESTADO_REMITO_COLORS: Record<string, string> = {
  en_ejecucion: "bg-yellow-100 text-yellow-700",
  aprobado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

const ESTADO_REMITO_LABELS: Record<string, string> = {
  en_ejecucion: "En Ejecución",
  aprobado: "Aprobado",
  cancelado: "Cancelado",
}

export function getEstadoRemitoColor(estado?: string) {
  if (!estado) return "bg-gray-100 text-gray-700"
  return ESTADO_REMITO_COLORS[estado] ?? "bg-gray-100 text-gray-700"
}

export function getEstadoRemitoLabel(estado?: string) {
  if (!estado) return "—"
  return ESTADO_REMITO_LABELS[estado] ?? estado
}

// ─── Facturas ───────────────────────────────────────────────────────────────

export interface FacturaLinea {
  id?: number
  factura_id?: number
  producto_id?: number
  producto_nombre: string
  descripcion?: string | null
  cantidad: number
  precio_unitario: number
  descuento?: number
  subtotal?: number
  iva?: number
}

export interface FacturaVencimiento {
  id?: number
  factura_id?: number
  descripcion?: string
  fecha: string
  total: number
}

export interface FacturaMedioPago {
  id?: number
  factura_id?: number
  medio?: string
  tarjeta_id?: number | null
  tarjeta?: { id: number; nombre: string; tipo: string } | null
  cuotas?: number
  monto_base?: number
  total_recargo?: number
  total_acreditar?: number
}

export interface Factura {
  id: number
  numero: string
  fecha: string
  cliente_id?: number
  cliente_nombre?: string
  cliente_documento?: string
  nota_venta_id?: number | null
  nota_venta_numero?: string
  vendedor_nombre?: string
  domicilio_facturacion?: string
  moneda?: string
  estado: string
  subtotal?: number
  descuento?: number
  impuestos?: number
  total: number
  saldo?: number
  sucursal?: string
  termino_pago?: string
  condicion_pago?: string
  fecha_vencimiento?: string
  cotizacion?: number
  tipo_cotizacion?: string
  facturas_lineas?: FacturaLinea[]
  facturas_vencimientos?: FacturaVencimiento[]
  factura_medios_pago?: FacturaMedioPago[]
  created_at?: string
}

const ESTADO_FACTURA_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  abierta: "bg-blue-100 text-blue-700",
  confirmada: "bg-indigo-100 text-indigo-700",
  parcial: "bg-amber-100 text-amber-700",
  cobrada: "bg-emerald-100 text-emerald-700",
  conciliada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
  esperando_confirmacion: "bg-amber-100 text-amber-700",
  ejecucion_senia: "bg-amber-100 text-amber-700",
}

const ESTADO_FACTURA_LABELS: Record<string, string> = {
  borrador: "Borrador",
  abierta: "Abierta",
  confirmada: "Confirmada",
  parcial: "Parcial",
  cobrada: "Cobrada",
  conciliada: "Conciliada",
  cancelada: "Cancelada",
  esperando_confirmacion: "Esperando confirmación",
  ejecucion_senia: "Ejecución Seña",
}

export function getEstadoFacturaColor(estado: string) {
  return ESTADO_FACTURA_COLORS[estado] ?? "bg-gray-100 text-gray-700"
}

export function getEstadoFacturaLabel(estado: string) {
  return ESTADO_FACTURA_LABELS[estado] ?? estado
}

// ─── Recibos ────────────────────────────────────────────────────────────────

export interface Recibo {
  id: number | string
  numero: string
  fecha: string
  sucursal?: string
  cliente_id?: string | number | null
  cliente_nombre?: string | null
  caja_id?: string | number | null
  caja_nombre?: string | null
  factura_id?: number | null
  nota_venta_id?: string | number | null
  nota_venta_numero?: string | null
  cobrador_id?: string | number | null
  cobrador_nombre?: string | null
  concepto?: string | null
  importe: number
  importe_no_conciliado?: number
  importe_no_conciliado_ars?: number
  moneda?: string
  tipo_cotizacion?: string | null
  cotizacion?: number | null
  estado: string
  fecha_publicacion?: string | null
  fecha_cancelacion?: string | null
  motivo_cancelacion?: string | null
  observaciones?: string | null
  asiento_id?: string | null
  created_at?: string
}

const ESTADO_RECIBO_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  publicado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

const ESTADO_RECIBO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  cancelado: "Cancelado",
}

export function getEstadoReciboColor(estado: string) {
  return ESTADO_RECIBO_COLORS[estado] ?? "bg-gray-100 text-gray-700"
}

export function getEstadoReciboLabel(estado: string) {
  return ESTADO_RECIBO_LABELS[estado] ?? estado
}

// ─── Ajustes de Cliente / Notas de Crédito / Notas de Débito ────────────────
// Las 3 viven en la misma tabla `ajustes_clientes`. La distinción es por
// prefijo en `numero`:
//   - NC-*  → Nota de Crédito
//   - ND-*  → Nota de Débito
//   - resto → Ajuste de Cliente "puro"

export interface AjusteClienteLinea {
  descripcion?: string
  fecha_vencimiento?: string
  importe: number
}

export interface AjusteCliente {
  id: number
  numero: string
  fecha: string
  cliente_id?: number
  cliente_nombre?: string
  estado: string
  concepto?: string | null
  moneda?: string
  nota_venta_numero?: string | null
  sucursal?: string
  sucursal_id?: number | null
  categoria?: string | null
  toma_equipo_id?: number | null
  es_automatica?: boolean | null
  lineas?: AjusteClienteLinea[]
  total: number
  saldo_disponible?: number
  created_at?: string
}

const ESTADO_AJUSTE_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  activo: "bg-green-100 text-green-700",
  publicado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

const ESTADO_AJUSTE_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activo: "Activo",
  publicado: "Publicado",
  cancelado: "Cancelado",
}

export function getEstadoAjusteColor(estado: string) {
  return ESTADO_AJUSTE_COLORS[estado] ?? "bg-gray-100 text-gray-700"
}

export function getEstadoAjusteLabel(estado: string) {
  return ESTADO_AJUSTE_LABELS[estado] ?? estado
}
