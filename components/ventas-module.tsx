"use client"

// Modulo de Ventas - Cell Home ERP v5
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useClientes } from "@/hooks/use-clientes"
import { crearCliente as apiCrearCliente, actualizarCliente as apiActualizarCliente } from "@/hooks/use-clientes"
import type { ClienteDB } from "@/hooks/use-clientes"
import { useERP } from "@/contexts/erp-context"
import { fetchDepositos } from "@/lib/stock-actions"
import { Search, Filter, ChevronDown, ChevronRight, X, Plus, FileText, Truck, Receipt, CreditCard, Users, DollarSign, Package, ArrowRight, ArrowLeft, Eye, Edit, Trash2, Download, Mail, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Phone, Globe, Calendar, Tag, Percent, Star, TrendingUp, RefreshCw, User, Warehouse, Save, MessageSquare, Repeat, Smartphone, Battery, Camera, Monitor, Layers, Copy, Upload, History } from "lucide-react"
 import BotonVolver from "./ui/boton-volver"
import ProductoDropdown from "./producto-dropdown"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import { tarjetasIniciales, gruposIniciales, recargosIniciales } from "./modulo-finanzas"
import type { Tarjeta as TarjetaFinanzas, GrupoTarjeta as GrupoTarjetaFinanzas, RecargoTarjeta as RecargoTarjetaFinanzas, RecargoTarjeta } from "./modulo-finanzas"

// Types para Ventas
interface ClienteVenta {
  id: number
  codigo: string
  nombre: string
  nombre_fantasia: string
  tipo_documento: "DNI" | "CUIT" | "CUIL"
  numero_documento: string
  posicion_fiscal: "consumidor_final" | "responsable_inscripto" | "monotributista" | "exento"
  direccion: string
  ciudad: string
  provincia: string
  codigo_postal: string
  zona: string
  telefono: string
  celular: string
  email: string
  categoria: "publico" | "mercadolibre" | "mayorista"
  vendedor_id: number | null
  cobrador_id: number | null
  lista_precios_id: number
  descuento_default: number
  moneda_cuenta_corriente: "ARS" | "USD"
  termino_pago_id: number
  activo: boolean
  es_confidencial: boolean
  sucursal_origen: string
  fecha_alta: string
  saldo_cuenta_corriente: number
  total_facturado: number
  seguimiento?: SeguimientoEntry[]
}

interface Vendedor {
  id: number
  nombre: string
  activo: boolean
}

interface CategoriaCliente {
  id: number
  nombre: string
  lista_precios_defecto_id: number | null
  descripcion: string
  activa: boolean
  seguimiento?: SeguimientoEntry[]
}

interface ListaPrecios {
  id: number
  nombre: string
  tipo: string
  moneda_base: "ARS" | "USD"
  incluye_iva: boolean
  activa: boolean
  no_visible: boolean
  dias_validez: number
  estado: "borrador" | "creada" | "activa" | "inactiva"
  usuarios_admin: number[]
  usuarios_habilitados: number[]
  observaciones_filtro: string
  seguimiento?: SeguimientoEntry[]
}

interface VersionListaPrecios {
  id: number
  lista_precios_id: number
  lista_precios_nombre: string
  nombre: string
  fecha_inicial: string
  fecha_final: string | null
  activa: boolean
  estado: "borrador" | "confirmada" | "activa" | "cerrada"
  ultima_actualizacion: string
  lineas: LineaListaPrecios[]
  seguimiento?: SeguimientoEntry[]
}

interface LineaListaPrecios {
  id: number
  producto_id: number
  producto_codigo: string
  producto_nombre: string
  costo_moneda: "ARS" | "USD"
  costo_importe: number
  cotizacion_dolar: number
  markup_porcentaje: number
  markup_nominal: number
  forzar_precio_pesos: boolean
  precio_forzado_ars: number | null
  precio_venta: number
  precio_venta_moneda: "ARS" | "USD"
  iva: 0 | 10.5 | 21
}

interface TerminoPago {
  id: number
  nombre: string
  dias: number
}

interface ProductoVenta {
  id: number
  sku: string
  nombre: string
  descripcion: string
  precio_venta: number
  costo?: number
  stock: number
  categoria: string
  requiere_serie: boolean // Si requiere selección de IMEI/Serie
  precios?: { lista_id: number; precio: number }[]
}

// Tipo para el sistema de seguimiento (tracking de cambios estilo Odoo)
interface SeguimientoEntry {
  id: number
  fecha: string
  usuario: string
  usuario_avatar?: string
  tipo: "creacion" | "cambio_estado" | "cambio_campo" | "nota" | "mensaje"
  campo?: string
  valor_anterior?: string
  valor_nuevo?: string
  descripcion?: string
}

interface SerieDisponible {
  id: number
  producto_id: number
  serie: string // IMEI o número de serie
  lote: string | null
  estado: "disponible" | "reservado" | "vendido"
  ubicacion_id: number
  ubicacion_nombre: string
  detalles: string // Ej: "128GB Space Gray - Batería 92%"
  fecha_ingreso: string
}

interface LineaNV {
  id: number
  producto_id: number
  producto_nombre: string
  producto_sku: string
  cantidad: number
  precio_unitario: number
  precio_unitario_moneda: "ARS" | "USD"
  precio_unitario_usd: number
  precio_unitario_ars: number
  descuento: number
  subtotal: number
  fecha_entrega: string
  requiere_serie?: boolean
  series_seleccionadas?: { id: number; serie: string; detalles: string }[]
}

interface NotaVenta {
  id: number
  numero: string
  cliente_id: number
  cliente_nombre: string
  cliente_codigo: string
  vendedor_id: number
  vendedor_nombre: string
  fecha: string
  estado: "borrador" | "a_facturar" | "verificacion_factura" | "verificacion_oe" | "finalizada" | "cancelada"
  moneda: "ARS" | "USD"
  tipo_cotizacion: "blue" | "oficial"
  cotizacion: number
  lista_precios_id: number
  termino_pago_id: number
  termino_pago_nombre: string
  deposito: string
  tipo_venta: "inmediata" | "pedido"
  lineas: LineaNV[]
  subtotal: number
  descuento_global: number
  impuestos: number
  total: number
  sucursal: string
  punto_venta: string
  seguimiento?: SeguimientoEntry[]
}

interface OrdenEntrega {
  id: number
  numero: string
  nota_venta_id: number
  nota_venta_numero: string
  cliente_id: number
  cliente_nombre: string
  estado: "borrador" | "esperando" | "parcial" | "disponible" | "confirmada"
  fecha_creacion: string
  fecha_entrega: string
  domicilio_envio: string
  deposito: string
  sucursal: string
  remito_numero: string | null
  productos: {
    producto_id: number
    producto_nombre: string
    cantidad: number
    reserva: number
    estado: "pendiente" | "confirmado"
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface Remito {
  id: number
  numero: string
  orden_entrega_id: number
  orden_entrega_numero: string
  cliente_id: number
  cliente_nombre: string
  estado: "en_ejecucion" | "aprobado"
  fecha: string
  fecha_entrega: string
  domicilio_envio: string
  transporte: string
  chofer: string
  factura_numero: string | null
  nota_venta_numero: string
  sucursal: string
  deposito: string
  peso_kg: number
  peso_neto_kg: number
  bultos: number
  valor_declarado: number
  control_factura: "facturado" | "pendiente"
  seguimiento?: SeguimientoEntry[]
}

interface Factura {
  id: number
  numero: string
  tipo: "A" | "B" | "C"
  nota_venta_id: number
  nota_venta_numero: string
  cliente_id: number
  cliente_nombre: string
  cliente_documento: string
  estado: "borrador" | "abierta" | "conciliada"
  fecha: string
  vendedor_nombre: string
  domicilio_facturacion: string
  moneda: "ARS" | "USD"
  tipo_cotizacion: "blue" | "oficial"
  cotizacion: number
  termino_pago: string
  condicion_pago?: string
  fecha_vencimiento?: string
  subtotal: number
  descuento: number
  impuestos: number
  total: number
  saldo: number
  sucursal: string
  lineas: {
    producto_nombre: string
    descripcion: string
    cantidad: number
    precio_unitario: number
    descuento: number
    subtotal: number
  }[]
  vencimientos: {
    descripcion: string
    fecha: string
    total: number
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface Recibo {
  id: number
  numero: string
  cliente_id: number
  cliente_nombre: string
  estado: "borrador" | "publicado" | "cancelado"
  fecha: string
  importe: number
  importe_no_conciliado: number
  moneda: "ARS" | "USD"
  sucursal: string
  caja: string
  cobrador_nombre: string
  nota_venta_numero: string | null
  factura_id?: number
  concepto: string
  pagos: {
    forma_pago: string
    importe: number
    moneda: "ARS" | "USD"
  }[]
  cancelacion?: {
    motivo: string
    descripcion: string
    fecha: string
    usuario: string
  }
  seguimiento?: SeguimientoEntry[]
}

interface AjusteCliente {
  id: number
  numero: string
  cliente_id: number
  cliente_nombre: string
  estado: "borrador" | "publicado"
  fecha: string
  concepto: string
  moneda: "ARS" | "USD"
  nota_venta_numero: string | null
  sucursal: string
  categoria: string | null
  lineas: {
    descripcion: string
    fecha_vencimiento: string
    importe: number
  }[]
  total: number
}

interface NcCategoria {
  id: number
  nombre: string
  activa: boolean
  created_at: string
}

interface MovimientoCuentaCorriente {
  id: number
  cliente_id: number
  fecha: string
  tipo: "debito" | "credito"
  concepto: string
  documento_tipo: "factura" | "nota_credito" | "nota_debito" | "recibo" | "ajuste"
  documento_numero: string
  documento_id: number
  moneda: "ARS" | "USD"
  importe: number
  saldo_posterior: number
}

// Mock data
const mockVendedores: Vendedor[] = [
  { id: 1, nombre: "Max Solina", activo: true },
]

const mockCategoriasCliente: CategoriaCliente[] = []

const mockListasPrecios: ListaPrecios[] = []

const mockVersionesLista: VersionListaPrecios[] = []

const mockTiposListaPrecios = ["Minorista", "Mayorista", "Distribuidor", "Especial", "Promocional"]

const mockUsuariosVentas = [
  { id: 1, nombre: "Max Solina" },
  { id: 2, nombre: "Laura García" },
  { id: 3, nombre: "Carlos Méndez" },
]

// Cotización del dólar mock (se conectará al módulo Contabilidad)
const COTIZACION_DOLAR_MOCK = 1200

const mockTerminosPago: TerminoPago[] = [
  { id: 1, nombre: "Contado Efectivo", dias: 0 },
  { id: 2, nombre: "Cuenta Corriente 30 días", dias: 30 },
  { id: 3, nombre: "Cuenta Corriente 60 días", dias: 60 },
]

// Depósitos y ubicaciones para selector en NV
const depositosVenta = [
  { id: 1, codigo: "CC", nombre: "Casa Central" },
  { id: 2, codigo: "PN", nombre: "Puerto Norte" },
  { id: 3, codigo: "CS", nombre: "Casilda" },
]

const ubicacionesVenta = [
  // Casa Central - disponibles para venta
  { id: 1, deposito_id: 1, codigo: "CC/Stock", nombre: "Stock", disponible_venta: true },
  { id: 2, deposito_id: 1, codigo: "CC/Usados", nombre: "Usados", disponible_venta: true },
  { id: 3, deposito_id: 1, codigo: "CC/Deposito B", nombre: "Depósito B", disponible_venta: true },
  // Puerto Norte
  { id: 8, deposito_id: 2, codigo: "PN/Stock", nombre: "Stock", disponible_venta: true },
  { id: 9, deposito_id: 2, codigo: "PN/Outlet", nombre: "Outlet", disponible_venta: true },
  // Casilda
  { id: 12, deposito_id: 3, codigo: "CS/Stock", nombre: "Stock", disponible_venta: true },
]

// Motivos de cancelación de recibo (configurable en módulo)
const motivosCancelacionRecibo = [
  { id: 1, codigo: "ERROR_MONTO", nombre: "Error en el monto" },
  { id: 2, codigo: "ERROR_CLIENTE", nombre: "Error de cliente" },
  { id: 3, codigo: "DUPLICADO", nombre: "Recibo duplicado" },
  { id: 4, codigo: "DEVOLUCION", nombre: "Devolución de pago" },
  { id: 5, codigo: "OTRO", nombre: "Otro motivo" },
]

// Array vacío — los productos reales se cargan desde Supabase via productosMaestro (estado del componente)
const productosConSerie: ProductoVenta[] = []

// Series/IMEI disponibles por producto y ubicación
const seriesDisponibles: SerieDisponible[] = [
  // iPhone 12 Usado - Casa Central/Usados
  { id: 1, producto_id: 1, serie: "353912108456721", lote: null, estado: "disponible", ubicacion_id: 2, ubicacion_nombre: "CC/Usados", detalles: "64GB Negro - Batería 89%", fecha_ingreso: "2024-01-10" },
  { id: 2, producto_id: 1, serie: "353912108456722", lote: null, estado: "disponible", ubicacion_id: 2, ubicacion_nombre: "CC/Usados", detalles: "128GB Blanco - Batería 92%", fecha_ingreso: "2024-01-12" },
  { id: 3, producto_id: 1, serie: "353912108456723", lote: null, estado: "disponible", ubicacion_id: 2, ubicacion_nombre: "CC/Usados", detalles: "64GB Azul - Batería 85%", fecha_ingreso: "2024-01-15" },
  { id: 4, producto_id: 1, serie: "353912108456724", lote: null, estado: "reservado", ubicacion_id: 2, ubicacion_nombre: "CC/Usados", detalles: "128GB Negro - Batería 95%", fecha_ingreso: "2024-01-08" },
  // iPhone 12 Usado - Puerto Norte/Stock
  { id: 5, producto_id: 1, serie: "353912108456725", lote: null, estado: "disponible", ubicacion_id: 8, ubicacion_nombre: "PN/Stock", detalles: "64GB Rojo - Batería 88%", fecha_ingreso: "2024-01-05" },
  // iPhone 13 Usado
  { id: 6, producto_id: 2, serie: "354789123456001", lote: null, estado: "disponible", ubicacion_id: 2, ubicacion_nombre: "CC/Usados", detalles: "128GB Midnight - Batería 94%", fecha_ingreso: "2024-01-18" },
  { id: 7, producto_id: 2, serie: "354789123456002", lote: null, estado: "disponible", ubicacion_id: 2, ubicacion_nombre: "CC/Usados", detalles: "256GB Starlight - Batería 91%", fecha_ingreso: "2024-01-20" },
  { id: 8, producto_id: 2, serie: "354789123456003", lote: null, estado: "disponible", ubicacion_id: 8, ubicacion_nombre: "PN/Stock", detalles: "128GB Blue - Batería 96%", fecha_ingreso: "2024-01-22" },
  // iPhone 15 Pro Max
  { id: 9, producto_id: 3, serie: "356123789012001", lote: "LOTE2024A", estado: "disponible", ubicacion_id: 1, ubicacion_nombre: "CC/Stock", detalles: "256GB Natural Titanium", fecha_ingreso: "2024-02-01" },
  { id: 10, producto_id: 3, serie: "356123789012002", lote: "LOTE2024A", estado: "disponible", ubicacion_id: 1, ubicacion_nombre: "CC/Stock", detalles: "256GB Blue Titanium", fecha_ingreso: "2024-02-01" },
  { id: 11, producto_id: 3, serie: "356123789012003", lote: "LOTE2024A", estado: "disponible", ubicacion_id: 8, ubicacion_nombre: "PN/Stock", detalles: "256GB Black Titanium", fecha_ingreso: "2024-02-01" },
  // Samsung Galaxy S24 Ultra
  { id: 12, producto_id: 4, serie: "R58T12345678", lote: null, estado: "disponible", ubicacion_id: 1, ubicacion_nombre: "CC/Stock", detalles: "256GB Titanium Gray", fecha_ingreso: "2024-02-05" },
  { id: 13, producto_id: 4, serie: "R58T12345679", lote: null, estado: "disponible", ubicacion_id: 1, ubicacion_nombre: "CC/Stock", detalles: "512GB Titanium Violet", fecha_ingreso: "2024-02-05" },
  // AirPods Pro 2
  { id: 14, producto_id: 7, serie: "FVFXN123456A", lote: "LOTE2024B", estado: "disponible", ubicacion_id: 1, ubicacion_nombre: "CC/Stock", detalles: "Con estuche MagSafe", fecha_ingreso: "2024-01-25" },
  { id: 15, producto_id: 7, serie: "FVFXN123456B", lote: "LOTE2024B", estado: "disponible", ubicacion_id: 1, ubicacion_nombre: "CC/Stock", detalles: "Con estuche MagSafe", fecha_ingreso: "2024-01-25" },
  { id: 16, producto_id: 7, serie: "FVFXN123456C", lote: "LOTE2024B", estado: "disponible", ubicacion_id: 8, ubicacion_nombre: "PN/Stock", detalles: "Con estuche Lightning", fecha_ingreso: "2024-01-20" },
]

const mockClientesVenta: ClienteVenta[] = [
  { 
    id: 1, codigo: "C015517", nombre: "Alejandra Gallo", nombre_fantasia: "", 
    tipo_documento: "DNI", numero_documento: "32456789", posicion_fiscal: "consumidor_final",
    direccion: "Av. Rivadavia 1234", ciudad: "Rosario", provincia: "Santa Fe", codigo_postal: "2000",
    zona: "Centro", telefono: "0341-4561234", celular: "341-5551234", email: "agallo@email.com",
    categoria: "publico", vendedor_id: 1, cobrador_id: 1, lista_precios_id: 1, descuento_default: 0,
    moneda_cuenta_corriente: "ARS", termino_pago_id: 1, activo: true, es_confidencial: false,
    sucursal_origen: "Puerto Norte", fecha_alta: "2023-01-15", saldo_cuenta_corriente: 0, total_facturado: 125000
  },
  { 
    id: 2, codigo: "C015518", nombre: "TechStore SRL", nombre_fantasia: "TechStore", 
    tipo_documento: "CUIT", numero_documento: "30-71234567-8", posicion_fiscal: "responsable_inscripto",
    direccion: "San Martín 567", ciudad: "Rosario", provincia: "Santa Fe", codigo_postal: "2000",
    zona: "Microcentro", telefono: "0341-4567890", celular: "341-5557890", email: "ventas@techstore.com",
    categoria: "mayorista", vendedor_id: 2, cobrador_id: 1, lista_precios_id: 2, descuento_default: 10,
    moneda_cuenta_corriente: "USD", termino_pago_id: 2, activo: true, es_confidencial: false,
    sucursal_origen: "Puerto Norte", fecha_alta: "2022-06-20", saldo_cuenta_corriente: 1500, total_facturado: 2850000
  },
  { 
    id: 3, codigo: "C015519", nombre: "Juan Carlos Méndez", nombre_fantasia: "", 
    tipo_documento: "DNI", numero_documento: "28765432", posicion_fiscal: "monotributista",
    direccion: "Córdoba 890", ciudad: "Rosario", provincia: "Santa Fe", codigo_postal: "2000",
    zona: "Centro", telefono: "", celular: "341-5559999", email: "jcmendez@gmail.com",
    categoria: "mercadolibre", vendedor_id: 1, cobrador_id: null, lista_precios_id: 1, descuento_default: 5,
    moneda_cuenta_corriente: "ARS", termino_pago_id: 1, activo: true, es_confidencial: false,
    sucursal_origen: "Puerto Norte", fecha_alta: "2024-01-10", saldo_cuenta_corriente: 45000, total_facturado: 320000
  },
]

const mockNotasVenta: NotaVenta[] = [
  {
    id: 1, numero: "NV X 10000-00010735", cliente_id: 1, cliente_nombre: "Alejandra Gallo", cliente_codigo: "C015517",
    vendedor_id: 1, vendedor_nombre: "Max Solina", fecha: "2024-01-20T10:30:00", estado: "a_facturar",
    moneda: "ARS", tipo_cotizacion: "blue", cotizacion: 1150, lista_precios_id: 1, termino_pago_id: 1,
    termino_pago_nombre: "Contado Efectivo", deposito: "Puerto Norte", tipo_venta: "inmediata",
    lineas: [
      { id: 1, producto_id: 1, producto_nombre: "iPhone 15 Pro Max 256GB", producto_sku: "IPH15PM256", cantidad: 1, precio_unitario: 1850000, descuento: 0, subtotal: 1850000, fecha_entrega: "2024-01-20" }
    ],
    subtotal: 1850000, descuento_global: 0, impuestos: 388500, total: 2238500, sucursal: "Puerto Norte", punto_venta: "10000"
  },
  {
    id: 2, numero: "NV X 10000-00010736", cliente_id: 2, cliente_nombre: "TechStore SRL", cliente_codigo: "C015518",
    vendedor_id: 2, vendedor_nombre: "Laura García", fecha: "2024-01-20T14:15:00", estado: "borrador",
    moneda: "USD", tipo_cotizacion: "blue", cotizacion: 1150, lista_precios_id: 3, termino_pago_id: 2,
    termino_pago_nombre: "Cuenta Corriente 30 días", deposito: "Puerto Norte", tipo_venta: "pedido",
    lineas: [
      { id: 1, producto_id: 2, producto_nombre: "Samsung Galaxy S24 Ultra", producto_sku: "SGS24U", cantidad: 5, precio_unitario: 1200, descuento: 10, subtotal: 5400, fecha_entrega: "2024-01-25" },
      { id: 2, producto_id: 3, producto_nombre: "Funda Silicona Galaxy S24", producto_sku: "FUNDGS24", cantidad: 10, precio_unitario: 15, descuento: 0, subtotal: 150, fecha_entrega: "2024-01-25" }
    ],
    subtotal: 5550, descuento_global: 5, impuestos: 1108.73, total: 6381.23, sucursal: "Puerto Norte", punto_venta: "10000"
  },
  {
    id: 3, numero: "NV X 10000-00010734", cliente_id: 3, cliente_nombre: "Juan Carlos Méndez", cliente_codigo: "C015519",
    vendedor_id: 1, vendedor_nombre: "Max Solina", fecha: "2024-01-19T16:45:00", estado: "finalizada",
    moneda: "ARS", tipo_cotizacion: "blue", cotizacion: 1145, lista_precios_id: 1, termino_pago_id: 1,
    termino_pago_nombre: "Contado Efectivo", deposito: "Puerto Norte", tipo_venta: "inmediata",
    lineas: [
      { id: 1, producto_id: 4, producto_nombre: "AirPods Pro 2", producto_sku: "APP2", cantidad: 1, precio_unitario: 450000, descuento: 5, subtotal: 427500, fecha_entrega: "2024-01-19" }
    ],
    subtotal: 427500, descuento_global: 0, impuestos: 89775, total: 517275, sucursal: "Puerto Norte", punto_venta: "10000"
  },
]

const mockOrdenesEntrega: OrdenEntrega[] = [
  {
    id: 1, numero: "OE X 10000-00011502", nota_venta_id: 1, nota_venta_numero: "NV X 10000-00010735",
    cliente_id: 1, cliente_nombre: "Alejandra Gallo", estado: "disponible",
    fecha_creacion: "2024-01-20T10:35:00", fecha_entrega: "2024-01-20", domicilio_envio: "Av. Rivadavia 1234, Rosario",
    deposito: "Puerto Norte", sucursal: "Puerto Norte", remito_numero: null,
    productos: [
      { producto_id: 1, producto_nombre: "iPhone 15 Pro Max 256GB", cantidad: 1, reserva: 1, estado: "confirmado" }
    ]
  },
]

const mockRemitos: Remito[] = [
  {
    id: 1, numero: "RE R 10000-00011196", orden_entrega_id: 2, orden_entrega_numero: "OE X 10000-00011500",
    cliente_id: 3, cliente_nombre: "Juan Carlos Méndez", estado: "aprobado",
    fecha: "2024-01-19T17:00:00", fecha_entrega: "2024-01-19", domicilio_envio: "Córdoba 890, Rosario",
    transporte: "Retira en local", chofer: "", factura_numero: "FC C 10000-00012375",
    nota_venta_numero: "NV X 10000-00010734", sucursal: "Puerto Norte", deposito: "Puerto Norte",
    peso_kg: 0.5, peso_neto_kg: 0.3, bultos: 1, valor_declarado: 517275, control_factura: "facturado"
  },
]

const mockFacturas: Factura[] = [
  {
    id: 1, numero: "FC C 10000-00012375", tipo: "C", nota_venta_id: 3, nota_venta_numero: "NV X 10000-00010734",
    cliente_id: 3, cliente_nombre: "Juan Carlos Méndez", cliente_documento: "DNI 28765432",
    estado: "conciliada", fecha: "2024-01-19T17:15:00", vendedor_nombre: "Max Solina",
    domicilio_facturacion: "Córdoba 890, Rosario", moneda: "ARS", tipo_cotizacion: "blue", cotizacion: 1145,
    termino_pago: "Contado Efectivo", condicion_pago: "Contado", fecha_vencimiento: "2024-01-19",
    subtotal: 427500, descuento: 0, impuestos: 89775, total: 517275, saldo: 0,
    sucursal: "Puerto Norte",
    lineas: [
      { producto_nombre: "AirPods Pro 2", descripcion: "", cantidad: 1, precio_unitario: 450000, descuento: 5, subtotal: 427500 }
    ],
    vencimientos: [
      { descripcion: "Contado", fecha: "2024-01-19", total: 517275 }
    ]
  },
  {
    id: 2, numero: "FC C 20000-00023950", tipo: "C", nota_venta_id: 1, nota_venta_numero: "NV X 20000-00023950",
    cliente_id: 1, cliente_nombre: "Alejandra Gallo", cliente_documento: "DNI 32456789",
    estado: "conciliada", fecha: "2024-03-08T10:00:00", vendedor_nombre: "Max Solina",
    domicilio_facturacion: "Av. Libertador 1234, CABA", moneda: "ARS", tipo_cotizacion: "blue", cotizacion: 1145,
    termino_pago: "Contado", condicion_pago: "Contado", fecha_vencimiento: "2024-03-08",
    subtotal: 14462.81, descuento: 0, impuestos: 3037.19, total: 17500, saldo: 0,
    sucursal: "Puerto Norte",
    lineas: [
      { producto_nombre: "iPhone 15 Pro Max", descripcion: "", cantidad: 1, precio_unitario: 14462.81, descuento: 0, subtotal: 14462.81 }
    ],
    vencimientos: [
      { descripcion: "Contado", fecha: "2024-03-08", total: 17500 }
    ]
  },
  {
    id: 3, numero: "FC C 20000-00029837", tipo: "C", nota_venta_id: 1, nota_venta_numero: "NV X 20000-00029111",
    cliente_id: 1, cliente_nombre: "Alejandra Gallo", cliente_documento: "DNI 32456789",
    estado: "abierta", fecha: "2024-09-12T14:30:00", vendedor_nombre: "Max Solina",
    domicilio_facturacion: "Av. Libertador 1234, CABA", moneda: "USD", tipo_cotizacion: "blue", cotizacion: 1145,
    termino_pago: "Contado", condicion_pago: "Contado", fecha_vencimiento: "2024-09-12",
    subtotal: 0.83, descuento: 0, impuestos: 0.17, total: 1, saldo: 1,
    sucursal: "Puerto Norte",
    lineas: [
      { producto_nombre: "Servicio Tech", descripcion: "", cantidad: 1, precio_unitario: 0.83, descuento: 0, subtotal: 0.83 }
    ],
    vencimientos: [
      { descripcion: "Contado", fecha: "2024-09-12", total: 1 }
    ]
  },
  {
    id: 4, numero: "FC C 20000-00029808", tipo: "C", nota_venta_id: 1, nota_venta_numero: "NV X 20000-00029111",
    cliente_id: 1, cliente_nombre: "Alejandra Gallo", cliente_documento: "DNI 32456789",
    estado: "abierta", fecha: "2024-09-12T14:35:00", vendedor_nombre: "Max Solina",
    domicilio_facturacion: "Av. Libertador 1234, CABA", moneda: "USD", tipo_cotizacion: "blue", cotizacion: 1145,
    termino_pago: "Contado", condicion_pago: "Contado", fecha_vencimiento: "2024-09-12",
    subtotal: 0.83, descuento: 0, impuestos: 0.17, total: 1, saldo: 1,
    sucursal: "Puerto Norte",
    lineas: [
      { producto_nombre: "Servicio Tech", descripcion: "", cantidad: 1, precio_unitario: 0.83, descuento: 0, subtotal: 0.83 }
    ],
    vencimientos: [
      { descripcion: "Contado", fecha: "2024-09-12", total: 1 }
    ]
  },
  {
    id: 5, numero: "FC C 20000-00038235", tipo: "C", nota_venta_id: 1, nota_venta_numero: "NV X 20000-00038791",
    cliente_id: 1, cliente_nombre: "Alejandra Gallo", cliente_documento: "DNI 32456789",
    estado: "abierta", fecha: "2025-06-02T11:00:00", vendedor_nombre: "Max Solina",
    domicilio_facturacion: "Av. Libertador 1234, CABA", moneda: "ARS", tipo_cotizacion: "blue", cotizacion: 1145,
    termino_pago: "Contado", condicion_pago: "Contado", fecha_vencimiento: "2025-06-02",
    subtotal: 30247.93, descuento: 0, impuestos: 6352.07, total: 36600, saldo: 36600,
    sucursal: "Puerto Norte",
    lineas: [
      { producto_nombre: "MacBook Air M3", descripcion: "", cantidad: 1, precio_unitario: 30247.93, descuento: 0, subtotal: 30247.93 }
    ],
    vencimientos: [
      { descripcion: "Contado", fecha: "2025-06-02", total: 36600 }
    ]
  },
]

const mockRecibos: Recibo[] = [
  {
    id: 1, numero: "RC X Norte-00011734", cliente_id: 3, cliente_nombre: "Juan Carlos Méndez",
    estado: "publicado", fecha: "2024-01-19T17:20:00", importe: 517275, importe_no_conciliado: 0,
    moneda: "ARS", sucursal: "Puerto Norte", caja: "Caja Principal", cobrador_nombre: "Max Solina",
    nota_venta_numero: "NV X 10000-00010734", concepto: "Cobro de venta",
    pagos: [
      { forma_pago: "Efectivo", importe: 517275, moneda: "ARS" }
    ]
  },
  {
    id: 2, numero: "RC X Norte-00023456", cliente_id: 1, cliente_nombre: "Alejandra Gallo",
    estado: "publicado", fecha: "2024-03-15T10:00:00", importe: 10000, importe_no_conciliado: 10000,
    moneda: "ARS", sucursal: "Puerto Norte", caja: "Caja Principal", cobrador_nombre: "Max Solina",
    nota_venta_numero: null, concepto: "Seña de pedido",
    pagos: [
      { forma_pago: "Transferencia", importe: 10000, moneda: "ARS" }
    ]
  },
  {
    id: 3, numero: "RC X Norte-00029555", cliente_id: 1, cliente_nombre: "Alejandra Gallo",
    estado: "publicado", fecha: "2024-09-20T15:30:00", importe: 25000, importe_no_conciliado: 25000,
    moneda: "ARS", sucursal: "Puerto Norte", caja: "Caja Principal", cobrador_nombre: "Max Solina",
    nota_venta_numero: null, concepto: "Pago a cuenta",
    pagos: [
      { forma_pago: "Efectivo", importe: 25000, moneda: "ARS" }
    ]
  },
]

const mockAjustes: AjusteCliente[] = [
  {
    id: 1, numero: "AJ X 10000-00000123", cliente_id: 2, cliente_nombre: "TechStore SRL",
    estado: "publicado", fecha: "2024-01-15", concepto: "Bonificación especial",
    moneda: "USD", nota_venta_numero: null, sucursal: "Puerto Norte",
    lineas: [
      { descripcion: "Bonificación por volumen de compras Q4 2023", fecha_vencimiento: "2024-01-15", importe: -500 }
    ],
    total: -500
  },
]

const mockMovimientosCC: MovimientoCuentaCorriente[] = [
  // Cliente 3 - Juan Carlos Méndez: Factura pagada
  {
    id: 1, cliente_id: 3, fecha: "2024-01-19T17:15:00", tipo: "debito",
    concepto: "Factura de venta", documento_tipo: "factura", documento_numero: "FC C 10000-00012375",
    documento_id: 1, moneda: "ARS", importe: 517275, saldo_posterior: 517275
  },
  {
    id: 2, cliente_id: 3, fecha: "2024-01-19T17:20:00", tipo: "credito",
    concepto: "Pago recibido", documento_tipo: "recibo", documento_numero: "RC X Norte-00011734",
    documento_id: 1, moneda: "ARS", importe: 517275, saldo_posterior: 0
  },
  // Cliente 2 - TechStore: Saldo pendiente USD
  {
    id: 3, cliente_id: 2, fecha: "2024-01-10T10:00:00", tipo: "debito",
    concepto: "Factura de venta", documento_tipo: "factura", documento_numero: "FC A 10000-00012370",
    documento_id: 2, moneda: "USD", importe: 2000, saldo_posterior: 2000
  },
  {
    id: 4, cliente_id: 2, fecha: "2024-01-15T09:00:00", tipo: "credito",
    concepto: "Ajuste - Bonificación especial", documento_tipo: "ajuste", documento_numero: "AJ X 10000-00000123",
    documento_id: 1, moneda: "USD", importe: 500, saldo_posterior: 1500
  },
  // Cliente 3 - Deuda actual de 45000
  {
    id: 5, cliente_id: 3, fecha: "2024-01-25T11:00:00", tipo: "debito",
    concepto: "Factura de venta", documento_tipo: "factura", documento_numero: "FC C 10000-00012380",
    documento_id: 3, moneda: "ARS", importe: 45000, saldo_posterior: 45000
  },
]

// ─── Bloque Medios de Pago (dentro de ficha de Factura) ────────────────������─────

interface LineaPago {
  id: number
  medio: "efectivo" | "transferencia" | "tarjeta"
  tarjeta_id?: number
  cuotas?: number
  monto: number
}

interface ResultadoCalculo {
  recargo: RecargoTarjetaFinanzas
  grupo: GrupoTarjetaFinanzas | undefined
  tarjeta: TarjetaFinanzas | undefined
  // recargo principal (monto × recargo_pct%)
  importeRecargo: number
  // cargos del grupo (comisión, IVA, IIBB — cada uno sobre el monto base)
  cargos: { nombre: string; pct: number; importe: number }[]
  totalRecargo: number
  totalConRecargo: number
}

function MontoInputField({ value, onChange, disabled, title, hasError }: {
  value: number
  onChange: (val: number) => void
  disabled?: boolean
  title?: string
  hasError?: boolean
}) {
  const [editando, setEditando] = React.useState(false)
  const [rawValue, setRawValue] = React.useState("")

  const formatted = value
    ? `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : ""

  return (
    <input
      type="text"
      inputMode="numeric"
      value={editando ? rawValue : formatted}
      placeholder="$ 0,00"
      disabled={disabled}
      title={title}
      onFocus={() => {
        setRawValue(value ? String(value) : "")
        setEditando(true)
      }}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9]/g, "")
        setRawValue(v)
        onChange(v ? parseInt(v, 10) : 0)
      }}
      onBlur={() => setEditando(false)}
      className={`border rounded px-2 py-1.5 text-sm text-right w-36 focus:ring-2 focus:outline-none ${
        disabled
          ? "border-red-300 bg-red-50 cursor-not-allowed text-gray-400 focus:ring-red-300"
          : hasError
          ? "border-red-500 bg-red-50 text-red-700 focus:ring-red-400"
          : "border-gray-300 focus:ring-emerald-500"
      }`}
    />
  )
}

// BloquesMediosPago fue movido a bloques-medios-pago.tsx
function BloquesMediosPago({ factura, onConfirmarCobro, onCobroConfirmado, onEstadoPagoChange }: {
  factura: Factura
  onConfirmarCobro?: (lineas: LineaPago[], totalConRecargos: number, totalRecargos: number) => void
  onCobroConfirmado?: (totalRecargos: number, desglose: { nombre: string; importe: number }[]) => void
  onEstadoPagoChange?: (estado: { cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }) => void
}) {
  const [lineas, setLineas] = useState<LineaPago[]>([])
  const [cobrado, setCobrado] = useState(false)
  const tarjetas = tarjetasIniciales

  // Notificar estado al padre cada vez que cambie algo relevante
  useEffect(() => {
    const totalIngresado = lineas.reduce((s, l) => s + (l.monto || 0), 0)
    const diferencia = totalIngresado - factura.total
    onEstadoPagoChange?.({
      cobrado,
      tieneLineas: lineas.length > 0 && totalIngresado > 0,
      diferenciaOk: Math.abs(diferencia) <= 0.5,
    })
  }, [lineas, cobrado, factura.total])
  const grupos = gruposIniciales
  const recargos = recargosIniciales
  const CUOTAS_OPTS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

  const formatARS = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

  // Busca el recargo configurado para tarjeta + cuotas + fecha (sin filtro de fecha para demo)
  const buscarRecargo = (tarjetaId: number, cuotas: number): RecargoTarjetaFinanzas | null => {
    const hoy = new Date()
    const diasKeys: (keyof RecargoTarjetaFinanzas["dias"])[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]
    const diaKey = diasKeys[hoy.getDay()]
    // Busca primero con vigencia estricta, si no encuentra usa cualquier activo que coincida
    const candidatos = recargos.filter(r =>
      r.tarjeta_id === tarjetaId &&
      r.activo &&
      cuotas >= r.desde_cuota &&
      cuotas <= r.hasta_cuota &&
      r.dias[diaKey]
    )
    if (!candidatos.length) return null
    // Más específico = rango de cuotas más chico
    return candidatos.sort((a, b) => (a.hasta_cuota - a.desde_cuota) - (b.hasta_cuota - b.desde_cuota))[0]
  }

  const calcularLinea = (linea: LineaPago): ResultadoCalculo | null => {
    if (linea.medio !== "tarjeta" || !linea.tarjeta_id || linea.monto <= 0) return null
    const cuotas = linea.cuotas || 1
    const rec = buscarRecargo(linea.tarjeta_id, cuotas)
    if (!rec) return null
    const grupo = grupos.find(g => g.id === rec.grupo_id)
    const tarjeta = tarjetas.find(t => t.id === linea.tarjeta_id)
    // Recargo principal: monto × recargo_pct%
    const importeRecargo = linea.monto * (rec.recargo_pct / 100)
    // Cargos del grupo: cada uno sobre el monto base (no sobre el recargo)
    const cargos = (grupo?.cargos || []).map(c => ({
      nombre: c.nombre,
      pct: c.arancel,
      importe: linea.monto * (c.arancel / 100)
    }))
    const totalRecargo = importeRecargo + cargos.reduce((s, c) => s + c.importe, 0)
    return { recargo: rec, grupo, tarjeta, importeRecargo, cargos, totalRecargo, totalConRecargo: linea.monto + totalRecargo }
  }

  const agregarLinea = () => {
    const esLaPrimera = lineas.length === 0
    const yaIngresado = lineas.reduce((s, l) => s + (l.monto || 0), 0)
    const restante = esLaPrimera ? 0 : Math.max(0, factura.total - yaIngresado)
    setLineas(prev => [...prev, { id: Date.now(), medio: "efectivo", monto: restante }])
  }

  const actualizarLinea = (id: number, cambios: Partial<LineaPago>) => {
    setLineas(prev => prev.map(l => l.id === id ? { ...l, ...cambios } : l))
  }

  const eliminarLinea = (id: number) => {
    setLineas(prev => prev.filter(l => l.id !== id))
  }

  // Totales
  const totalRecargos = lineas.reduce((sum, l) => {
    const c = calcularLinea(l)
    return sum + (c?.totalRecargo || 0)
  }, 0)
  const totalIngresado = lineas.reduce((s, l) => s + (l.monto || 0), 0)
  const totalConRecargos = totalIngresado + totalRecargos
  // Diferencia: lo que ingresó el operador vs lo que debería sumar (total factura + recargos)
  const totalEsperado = factura.total + totalRecargos
  const diferencia = totalIngresado - factura.total  // cuánto ingresó vs el total de factura sin recargo

  if (cobrado) {
    return (
      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
          <CheckCircle className="w-4 h-4" />
          Cobro registrado — movimientos generados en cuenta corriente.
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 border-t pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Medios de Pago</h3>
        <button onClick={agregarLinea}
          className="flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          <Plus className="w-4 h-4" /> Agregar medio de pago
        </button>
      </div>

      {lineas.length === 0 && (
        <p className="text-sm text-gray-400 italic">Sin medios de pago ingresados.</p>
      )}

      {/* Líneas */}
      <div className="space-y-3">
        {lineas.map((linea, idx) => {
          const calc = calcularLinea(linea)
          const esPrimeraLineaEfectivo = linea.medio === "efectivo" && lineas.findIndex(l => l.medio === "efectivo") === idx
          // Monto ingresado por las OTRAS líneas (excluye esta)
          const montoOtras = lineas.filter(l => l.id !== linea.id).reduce((s, l) => s + (l.monto || 0), 0)
          const restanteParaEstaLinea = factura.total - montoOtras
          const excedeLimite = (linea.monto || 0) > restanteParaEstaLinea + 0.5
          return (
            <div key={linea.id} className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Fila de inputs */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50">
                <select
                  value={linea.medio}
                  onChange={e => actualizarLinea(linea.id, { medio: e.target.value as LineaPago["medio"], tarjeta_id: undefined, cuotas: undefined })}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>

                {linea.medio === "tarjeta" && (
                  <>
                    <select
                      value={linea.tarjeta_id || ""}
                      onChange={e => actualizarLinea(linea.id, { tarjeta_id: parseInt(e.target.value), cuotas: 1 })}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">Tarjeta...</option>
                      {tarjetas.filter(t => t.activa).map(t => (
                        <option key={t.id} value={t.id}>{t.nombre} ({t.tipo === "credito" ? "Crédito" : "Débito"})</option>
                      ))}
                    </select>
                    <select
                      value={linea.cuotas || 1}
                      onChange={e => actualizarLinea(linea.id, { cuotas: parseInt(e.target.value) })}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none w-24"
                    >
                      {CUOTAS_OPTS.map(c => <option key={c} value={c}>{c} cuota{c > 1 ? "s" : ""}</option>)}
                    </select>
                  </>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {esPrimeraLineaEfectivo && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={linea.monto === factura.total}
                        onChange={e => actualizarLinea(linea.id, { monto: e.target.checked ? factura.total : 0 })}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Todo efectivo</span>
                    </label>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <MontoInputField
                      value={linea.monto || 0}
                      onChange={val => actualizarLinea(linea.id, { monto: val })}
                      disabled={linea.medio === "tarjeta" && !linea.tarjeta_id}
                      title={linea.medio === "tarjeta" && !linea.tarjeta_id ? "Seleccioná una tarjeta primero" : undefined}
                      hasError={excedeLimite}
                    />
                    {excedeLimite && (
                      <span className="text-xs text-red-600 font-medium">
                        Supera el total a abonar ({formatARS(restanteParaEstaLinea)})
                      </span>
                    )}
                  </div>
                  <button onClick={() => eliminarLinea(linea.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error: tarjeta no seleccionada */}
              {linea.medio === "tarjeta" && !linea.tarjeta_id && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Seleccioná una tarjeta para poder ingresar el monto.
                </div>
              )}

              {/* Desglose de recargo para tarjeta */}
              {linea.medio === "tarjeta" && linea.tarjeta_id && linea.monto > 0 && (
                <div className="px-4 pb-3 pt-2.5 bg-white border-t border-gray-100 text-xs">
                  {calc ? (
                    <div className="space-y-1">
                      {/* Header tarjeta */}
                      <div className="flex items-center gap-1.5 mb-2 text-gray-500 font-medium">
                        <CreditCard className="w-3.5 h-3.5" />
                        {calc.tarjeta?.nombre} {calc.tarjeta?.tipo === "credito" ? "Crédito" : "Débito"} — {linea.cuotas} cuota{(linea.cuotas || 1) > 1 ? "s" : ""} · {calc.grupo?.nombre}
                      </div>
                      {/* Monto base */}
                      <div className="flex justify-between text-gray-500">
                        <span>Monto abonado c/tarjeta:</span>
                        <span>{formatARS(linea.monto)}</span>
                      </div>
                      {/* Recargo principal */}
                      {calc.recargo.recargo_pct > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Recargo ({calc.recargo.recargo_pct}%):</span>
                          <span>{formatARS(calc.importeRecargo)}</span>
                        </div>
                      )}
                      {/* Cargos del grupo (comisión, IVA, IIBB, etc.) */}
                      {calc.cargos.map((c, i) => (
                        <div key={i} className="flex justify-between text-gray-500">
                          <span>{c.nombre} ({c.pct}%):</span>
                          <span>{formatARS(c.importe)}</span>
                        </div>
                      ))}
                      {/* Separador */}
                      <div className="border-t border-gray-200 my-1" />
                      {/* Total recargo */}
                      <div className="flex justify-between text-amber-700 font-semibold">
                        <span>Total recargo:</span>
                        <span>{formatARS(calc.totalRecargo)}</span>
                      </div>
                      {/* Total a acreditar */}
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>Total a acreditar:</span>
                        <span>{formatARS(calc.totalConRecargo)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      No hay recargo configurado para esta combinación. Revisá Finanzas → Recargos de Tarjetas.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalIngresado > 0 && Math.abs(diferencia) <= 0.5 && (
        <button
          onClick={() => {
            const desgloseRecargos: { nombre: string; importe: number }[] = []
            lineas.forEach(l => {
              const c = calcularLinea(l)
              if (!c) return
              if (c.recargo.recargo_pct > 0) {
                desgloseRecargos.push({ nombre: `Recargo tarjeta (${c.tarjeta?.nombre} ${c.recargo.recargo_pct}%)`, importe: c.importeRecargo })
              }
              c.cargos.forEach(cargo => {
                desgloseRecargos.push({ nombre: cargo.nombre, importe: cargo.importe })
              })
            })
            onConfirmarCobro?.(lineas, totalConRecargos, totalRecargos)
            onCobroConfirmado?.(totalRecargos, desgloseRecargos)
            setCobrado(true)
          }}
          className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Confirmar cobro y registrar en cuenta corriente
        </button>
      )}
    </div>
  )
}

// === Componente ModuloVentas ===
export type { ClienteVenta }

interface ModuloVentasProps {
  clientesIniciales?: ClienteVenta[]
  onNuevoCliente?: (c: ClienteVenta) => void
}



export default function ModuloVentas({ clientesIniciales, onNuevoCliente }: ModuloVentasProps = {}) {
  const { sucursales } = useERP()
  const [depositos, setDepositos] = useState<{ id: number; nombre: string; codigo: string }[]>([])
  useEffect(() => {
    fetchDepositos().then(d => setDepositos(Array.isArray(d) ? d : [])).catch(console.error)
  }, [])

  // Navigation state
  const [activeSection, setActiveSection] = useState<string>("clientes")
  const [activeView, setActiveView] = useState<string>("listado")
  const [menuExpandido, setMenuExpandido] = useState<{ [key: string]: boolean }>({
    clientes: true,
    ventas: true,
    logistica: true,
    comprobantes: true,
    cobranzas: true,
    configuracion: true
  })
  
  // Data states — clientes desde Supabase vía SWR
  const { clientes: clientesDB, isLoading: clientesLoading, mutate: mutateClientes } = useClientes()
  // Mapear ClienteDB → ClienteVenta para compatibilidad con el resto del módulo
  const clientes: ClienteVenta[] = useMemo(() => (Array.isArray(clientesDB) ? clientesDB : []).map(c => ({
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    nombre_fantasia: c.razon_social || "",
    tipo_documento: (c.tipo_documento as "DNI" | "CUIT" | "CUIL") || "DNI",
    numero_documento: c.numero_documento || "",
    posicion_fiscal: (c.condicion_iva === "Responsable Inscripto" ? "responsable_inscripto"
      : c.condicion_iva === "Monotributista" ? "monotributista"
      : c.condicion_iva === "Exento" ? "exento"
      : "consumidor_final") as ClienteVenta["posicion_fiscal"],
    direccion: c.direccion || "",
    ciudad: c.ciudad || "",
    provincia: c.provincia || "Santa Fe",
    codigo_postal: "",
    zona: "",
    telefono: c.telefono || "",
    celular: "",
    email: c.email || "",
    categoria: "publico" as ClienteVenta["categoria"],
    vendedor_id: c.vendedor_id,
    cobrador_id: null,
    lista_precios_id: 1,
    descuento_default: 0,
    moneda_cuenta_corriente: "ARS" as "ARS" | "USD",
    termino_pago_id: c.termino_pago_id || 1,
    activo: c.activo,
    es_confidencial: false,
    sucursal_origen: "Puerto Norte",
    fecha_alta: c.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    saldo_cuenta_corriente: c.saldo_cuenta_corriente,
    total_facturado: c.total_facturado,
    seguimiento: []
  })), [clientesDB])
  const setClientes = useCallback((_updater: any) => {
    // Los cambios ahora se persisten via API y se refresca con mutateClientes
    mutateClientes()
  }, [mutateClientes])

  // Helper para construir ClienteVenta desde form
  const buildClienteFromForm = useCallback((formData: FormData, editingItem: ClienteVenta | null, formClienteCategoriaId: number | null, categoriasCliente: { id: number, nombre: string }[]): ClienteVenta => {
    const catNombre = categoriasCliente.find(c => c.id === formClienteCategoriaId)?.nombre?.toLowerCase() as ClienteVenta["categoria"] | undefined
    return {
      id: editingItem?.id || clientes.length + 1,
      codigo: editingItem?.codigo || `C0${15520 + clientes.length}`,
      nombre: formData.get("nombre") as string,
      nombre_fantasia: formData.get("nombre_fantasia") as string || "",
      tipo_documento: formData.get("tipo_documento") as "DNI" | "CUIT" | "CUIL",
      numero_documento: formData.get("numero_documento") as string,
      posicion_fiscal: formData.get("posicion_fiscal") as ClienteVenta["posicion_fiscal"],
      direccion: formData.get("direccion") as string,
      ciudad: formData.get("ciudad") as string || "Rosario",
      provincia: formData.get("provincia") as string || "Santa Fe",
      codigo_postal: formData.get("codigo_postal") as string || "",
      zona: formData.get("zona") as string || "",
      telefono: formData.get("telefono") as string || "",
      celular: formData.get("celular") as string || "",
      email: formData.get("email") as string || "",
      categoria: catNombre ?? (editingItem?.categoria ?? null),
      vendedor_id: parseInt(formData.get("vendedor_id") as string) || null,
      cobrador_id: null,
      lista_precios_id: parseInt(formData.get("lista_precios_id") as string) || 1,
      descuento_default: parseFloat(formData.get("descuento_default") as string) || 0,
      moneda_cuenta_corriente: formData.get("moneda_cuenta_corriente") as "ARS" | "USD",
      termino_pago_id: parseInt(formData.get("termino_pago_id") as string) || 1,
      activo: true, es_confidencial: false, sucursal_origen: "Puerto Norte",
      fecha_alta: editingItem?.fecha_alta || new Date().toISOString().split('T')[0],
      saldo_cuenta_corriente: editingItem?.saldo_cuenta_corriente || 0,
      total_facturado: editingItem?.total_facturado || 0,
      seguimiento: editingItem?.seguimiento || [{ id: Date.now(), fecha: new Date().toISOString(), usuario: "Max Solina", tipo: "creacion" as const, descripcion: "Cliente creado" }]
    }
  }, [clientes.length])

  // Helper para construir payload DB desde ClienteVenta
  const buildClientePayload = (newCliente: ClienteVenta) => {
    const condicion = newCliente.posicion_fiscal === "responsable_inscripto" ? "Responsable Inscripto"
      : newCliente.posicion_fiscal === "monotributista" ? "Monotributista"
      : newCliente.posicion_fiscal === "exento" ? "Exento" : "Consumidor Final"
    return {
      nombre: newCliente.nombre, razon_social: newCliente.nombre_fantasia || null,
      tipo_documento: newCliente.tipo_documento, numero_documento: newCliente.numero_documento || null,
      condicion_iva: condicion, email: newCliente.email || null, telefono: newCliente.telefono || null,
      direccion: newCliente.direccion || null, ciudad: newCliente.ciudad || null, provincia: newCliente.provincia || null,
      termino_pago_id: newCliente.termino_pago_id || null, vendedor_id: newCliente.vendedor_id || null, activo: true,
    }
  }

  // Handler para guardar cliente (formulario página completa) — sin await
  const handleSubmitClienteForm = useCallback((e: React.FormEvent<HTMLFormElement>, editingItem: ClienteVenta | null, formClienteCategoriaId: number | null, categoriasCliente: { id: number, nombre: string }[], setCreandoCliente: (v: boolean) => void, setEditingItem: (v: ClienteVenta | null) => void, setSelectedCliente: (v: ClienteVenta) => void, onNuevoCliente?: (c: ClienteVenta) => void) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newCliente = buildClienteFromForm(formData, editingItem, formClienteCategoriaId, categoriasCliente)
    const payload = buildClientePayload(newCliente)

    const promise = editingItem
      ? apiActualizarCliente(editingItem.id, payload).then((updated) => {
          mutateClientes()
          setSelectedCliente({ ...newCliente, id: updated.id })
        })
      : ((): Promise<void> => {
          const maxId = clientesDB.length > 0 ? Math.max(...clientesDB.map(c => c.id)) : 0
          const codigo = `C0${String(15517 + maxId).padStart(5, "0")}`
          return apiCrearCliente({ ...payload, codigo, saldo_cuenta_corriente: 0, total_facturado: 0 }).then((created) => {
            mutateClientes()
            setSelectedCliente({ ...newCliente, id: created.id, codigo })
            onNuevoCliente?.({ ...newCliente, id: created.id, codigo })
          })
        })()

    promise
      .then(() => { setCreandoCliente(false); setEditingItem(null) })
      .catch((err) => alert("Error al guardar cliente: " + (err as Error).message))
  }, [buildClienteFromForm, clientesDB, mutateClientes])

  // Handler para guardar cliente (modal) — sin await
  const handleSubmitClienteModal = useCallback((e: React.FormEvent<HTMLFormElement>, editingItem: ClienteVenta | null, formClienteCategoriaId: number | null, categoriasCliente: { id: number, nombre: string }[], setShowModal: (v: boolean) => void, setEditingItem: (v: ClienteVenta | null) => void, onNuevoCliente?: (c: ClienteVenta) => void) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newCliente = buildClienteFromForm(formData, editingItem, formClienteCategoriaId, categoriasCliente)
    const payload = buildClientePayload(newCliente)

    const promise = editingItem
      ? apiActualizarCliente(editingItem.id, payload)
      : ((): Promise<unknown> => {
          const maxId = clientesDB.length > 0 ? Math.max(...clientesDB.map(c => c.id)) : 0
          const codigo = `C0${String(15517 + maxId).padStart(5, "0")}`
          return apiCrearCliente({ ...payload, codigo, saldo_cuenta_corriente: 0, total_facturado: 0 }).then((created) => {
            onNuevoCliente?.({ ...newCliente, id: created.id, codigo })
          })
        })()

    promise
      .then(() => { mutateClientes(); setShowModal(false); setEditingItem(null) })
      .catch((err) => alert("Error al guardar cliente: " + (err as Error).message))
  }, [buildClienteFromForm, clientesDB, mutateClientes])

  const [notasVenta, setNotasVenta] = useState<NotaVenta[]>(mockNotasVenta)
  const [ordenesEntrega, setOrdenesEntrega] = useState<OrdenEntrega[]>(mockOrdenesEntrega)
  const [remitos, setRemitos] = useState<Remito[]>(mockRemitos)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [recibos, setRecibos] = useState<Recibo[]>(mockRecibos)
  const [ajustes, setAjustes] = useState<AjusteCliente[]>(mockAjustes)
  const [movimientosCC, setMovimientosCC] = useState<MovimientoCuentaCorriente[]>(mockMovimientosCC)
  
  // UI states
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<string>("")
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedCliente, setSelectedCliente] = useState<ClienteVenta | null>(null)
  const [selectedNV, setSelectedNV] = useState<NotaVenta | null>(null)
  const [selectedOE, setSelectedOE] = useState<OrdenEntrega | null>(null)
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null)
  const [selectedRemito, setSelectedRemito] = useState<Remito | null>(null)
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [editandoCliente, setEditandoCliente] = useState(false)
  const [creandoNV, setCreandoNV] = useState(false)
  const [editingNVId, setEditingNVId] = useState<number | null>(null)
  const [creandoOE, setCreandoOE] = useState(false)
  const [creandoFactura, setCreandoFactura] = useState(false)
  const [facturaPrevisualizando, setFacturaPrevisualizando] = useState(false)
  const [creandoRecibo, setCreandoRecibo] = useState(false)
  const [editandoRecibo, setEditandoRecibo] = useState(false)
  const [showCancelarReciboModal, setShowCancelarReciboModal] = useState(false)
  const [cancelarReciboMotivo, setCancelarReciboMotivo] = useState("")
  const [cancelarReciboDescripcion, setCancelarReciboDescripcion] = useState("")
  
  // Estados para cancelar factura
  const [showCancelarFacturaModal, setShowCancelarFacturaModal] = useState(false)
  const [cancelarFacturaMotivo, setCancelarFacturaMotivo] = useState("")
  const [cancelarFacturaDescripcion, setCancelarFacturaDescripcion] = useState("")
  const [activeTab, setActiveTab] = useState<string>("general")
  const [clientePanel, setClientePanel] = useState<"ficha" | "historial" | "facturado" | "ot" | "ventas" | "reingresos">("ficha")
  const [popupDocumento, setPopupDocumento] = useState<{tipo: "factura" | "nv" | "recibo" | null; codigo: string}>({tipo: null, codigo: ""})
  const [selectedOTData, setSelectedOTData] = useState<{nro: string; fecha: string; equipo: string; imei: string; problema: string; estado: string; tecnico: string; cliente: ClienteVenta | null} | null>(null)
  const [conciliacionClienteId, setConciliacionClienteId] = useState<number | null>(null)
  const [conciliacionMetodo, setConciliacionMetodo] = useState<"manual" | "automatico" | "mixto">("mixto")
  const [conciliacionSeleccionDebitos, setConciliacionSeleccionDebitos] = useState<{id: number; tipo: "factura" | "nd"; montoAplicar: number}[]>([])
  const [conciliacionSeleccionCreditos, setConciliacionSeleccionCreditos] = useState<{id: number; tipo: "recibo" | "nc"; montoAplicar: number}[]>([])
  const [conciliacionHistorial, setConciliacionHistorial] = useState<{
    id: number
    fecha: string
    cliente_id: number
    cliente_nombre: string
    aplicaciones: {
      debito_tipo: string
      debito_numero: string
      credito_tipo: string
      credito_numero: string
      monto: number
    }[]
    total_conciliado: number
    usuario: string
  }[]>([])
  const [conciliacionTab, setConciliacionTab] = useState<"conciliar" | "historial">("conciliar")
  const [conciliacionFiltroNV, setConciliacionFiltroNV] = useState<string>("")
  const [conciliacionFiltroConciliado, setConciliacionFiltroConciliado] = useState<"no" | "si" | "todos">("no")
  const [conciliacionMostrarTodosDebitos, setConciliacionMostrarTodosDebitos] = useState(false)
  const [conciliacionMostrarTodosCreditos, setConciliacionMostrarTodosCreditos] = useState(false)
  const [conciliacionFiltroTextoDebitos, setConciliacionFiltroTextoDebitos] = useState("")
  const [conciliacionFiltroTextoCreditos, setConciliacionFiltroTextoCreditos] = useState("")
  
  // Estados para formularios de creacion
  const [oeNvId, setOeNvId] = useState<number | null>(null)
  const [oeProductos, setOeProductos] = useState<{producto_id: number; producto_nombre: string; cantidad: number; reserva: number; estado: "pendiente" | "confirmado"}[]>([])
  const [facturaClienteId, setFacturaClienteId] = useState<number | null>(null)
  const [facturaListaPreciosId, setFacturaListaPreciosId] = useState<number>(1)
  const [facturaLineas, setFacturaLineas] = useState<{producto_nombre: string; descripcion: string; cantidad: number; precio_unitario: number; descuento: number; subtotal: number; producto_id?: number}[]>([])
  const [reciboClienteIdForm, setReciboClienteIdForm] = useState<number | null>(null)
  const [reciboPagosForm, setReciboPagosForm] = useState<{forma_pago: string; importe: number; moneda: "ARS" | "USD"}[]>([])
  const [reciboFacturaIdForm, setReciboFacturaIdForm] = useState<number | null>(null)
  const [reciboMontoForm, setReciboMontoForm] = useState<number>(0)
  const [reciboPrevisualizando, setReciboPrevisualizando] = useState(false)
  
  // Vendedores cargados desde Supabase
  const [vendedores, setVendedores] = useState<Vendedor[]>(mockVendedores)

  // Estados para Categorías de NC
  const [ncCategorias, setNcCategorias] = useState<NcCategoria[]>([])
  const [ncCategoriaNombre, setNcCategoriaNombre] = useState("")
  const [ncCategoriaCreando, setNcCategoriaCreando] = useState(false)
  const [ncCategoriaLoading, setNcCategoriaLoading] = useState(false)
  const [ncCategoriaEditId, setNcCategoriaEditId] = useState<number | null>(null)
  const [ncCategoriaEditNombre, setNcCategoriaEditNombre] = useState("")

  // Cargar vendedores y nc_categorias desde Supabase
  useEffect(() => {
    const cargar = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const [{ data: vData }, { data: ncData }] = await Promise.all([
        supabase.from("vendedores").select("id, nombre, activo").order("nombre"),
        supabase.from("nc_categorias").select("*").order("nombre"),
      ])
      if (vData && vData.length > 0) setVendedores(vData)
      if (ncData) setNcCategorias(ncData)
    }
    cargar()
  }, [])

  // Estados para Categorías de Clientes
  const [categoriasCliente, setCategoriasCliente] = useState<CategoriaCliente[]>(mockCategoriasCliente)
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaCliente | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCliente | null>(null)
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [modoEdicionCategoria, setModoEdicionCategoria] = useState(false)
  const [categoriaSearchText, setCategoriaSearchText] = useState("")

  // Estado categoría seleccionada en form cliente
  const [formClienteCategoriaId, setFormClienteCategoriaId] = useState<number | null>(null)

  // Estados para Listas de Precios
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>(mockListasPrecios)
  const [versionesLista, setVersionesLista] = useState<VersionListaPrecios[]>(mockVersionesLista)
  const [selectedListaPrecios, setSelectedListaPrecios] = useState<ListaPrecios | null>(null)
  const [editingListaPrecios, setEditingListaPrecios] = useState<ListaPrecios | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<VersionListaPrecios | null>(null)
  const [editingVersion, setEditingVersion] = useState<VersionListaPrecios | null>(null)
  const [creandoListaPrecios, setCreandoListaPrecios] = useState(false)
  const [creandoVersion, setCreandoVersion] = useState(false)
  const [modoEdicionListaPrecios, setModoEdicionListaPrecios] = useState(false)
  const [modoEdicionVersion, setModoEdicionVersion] = useState(false)
  const [listaPreciosSearchText, setListaPreciosSearchText] = useState("")
  const [versionSearchText, setVersionSearchText] = useState("")
  const [versionFilterLista, setVersionFilterLista] = useState<number | null>(null)
  const [listaPreciosTab, setListaPreciosTab] = useState<"versiones" | "filtros" | "usuarios_admin" | "usuarios_habilitados">("versiones")
  const [editandoLineas, setEditandoLineas] = useState(false)
  const [nuevaLineaVersion, setNuevaLineaVersion] = useState<Partial<LineaListaPrecios>>({})
  const [modalNuevaVersionBasada, setModalNuevaVersionBasada] = useState(false)
  const [nuevaVersionBasadaForm, setNuevaVersionBasadaForm] = useState({ nombre: "", fecha_inicial: "", fecha_final: "", copiar_lineas: true })
  
  // Estados para lista de precios y productos reales en NV
  const [nvListaPreciosId, setNvListaPreciosId] = useState<number | null>(null)
  const [productosNV, setProductosNV] = useState<ProductoVenta[]>([])
  const [productosNVCargando, setProductosNVCargando] = useState(false)
  // Maestro de productos reales (todos los productos de la DB, para selectores de lista de precios)
  const [productosMaestro, setProductosMaestro] = useState<ProductoVenta[]>([])

  // Estados para ubicación de stock en NV
  const [nvDepositoId, setNvDepositoId] = useState<number>(1) // Casa Central por defecto
  const [nvUbicacionId, setNvUbicacionId] = useState<number>(1) // Stock por defecto
  const [nvPrevisualizando, setNvPrevisualizando] = useState(false) // Para mostrar vista previa antes de confirmar
  
  // Estados para modal de selección de series/IMEI
  const [showSerieModal, setShowSerieModal] = useState(false)
  const [serieModalLineaIndex, setSerieModalLineaIndex] = useState<number | null>(null)
  const [seriesSeleccionadasTemp, setSeriesSeleccionadasTemp] = useState<number[]>([])
  const [seriesReales, setSeriesReales] = useState<SerieDisponible[]>([])
  const [seriesRealesCargando, setSeriesRealesCargando] = useState(false)

  const abrirModalSerie = async (index: number, seriesYaSeleccionadas: number[] = []) => {
    const linea = nvLineas[index]
    if (!linea?.producto_id) return
    setSerieModalLineaIndex(index)
    setSeriesSeleccionadasTemp(seriesYaSeleccionadas)
    setSeriesRealesCargando(true)
    setShowSerieModal(true)
    try {
      const params = new URLSearchParams({
        producto_id: String(linea.producto_id),
        ubicacion_id: String(nvUbicacionId),
        estado: "disponible",
      })
      const res = await fetch(`/api/stock/unidades?${params}`)
      const data = await res.json()
      const mapeadas: SerieDisponible[] = (Array.isArray(data) ? data : []).map((u: any) => ({
        id: u.id,
        producto_id: u.producto_id,
        serie: u.nro_serie || `ID:${u.id}`,
        lote: u.origen_numero || null,
        estado: u.estado,
        ubicacion_id: u.ubicacion_id,
        ubicacion_nombre: u.ubicaciones?.codigo || "",
        detalles: [u.color, u.bateria_pct ? `Batería ${u.bateria_pct}%` : null, u.observaciones].filter(Boolean).join(" - "),
        fecha_ingreso: u.created_at?.split("T")[0] || "",
      }))
      setSeriesReales(mapeadas)
    } catch {
      setSeriesReales([])
    } finally {
      setSeriesRealesCargando(false)
    }
  }
  
  // Estados para búsqueda de productos en líneas
  const [productoSearchIndex, setProductoSearchIndex] = useState<number | null>(null)
  const [productoSearchText, setProductoSearchText] = useState("")
  const productoInputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Estados para búsqueda de productos en facturas
  const [facturaProductoSearchIndex, setFacturaProductoSearchIndex] = useState<number | null>(null)
  const [facturaProductoSearchText, setFacturaProductoSearchText] = useState("")
  
  // Estados para Toma de Equipo en Parte de Pago
  const [tomaEquipoPaso, setTomaEquipoPaso] = useState(1)
  const [tomaEquipoClienteId, setTomaEquipoClienteId] = useState<number | null>(null)
  const [tomaEquipoModeloId, setTomaEquipoModeloId] = useState<number | null>(null)
  const [tomaEquipoPrecioBase, setTomaEquipoPrecioBase] = useState(0)
  const [tomaEquipoPrecioFinal, setTomaEquipoPrecioFinal] = useState(0)
  const [tomaEquipoComponentes, setTomaEquipoComponentes] = useState<{id: number; nombre: string; estado: string; descuento: number}[]>([])
  const [tomaEquipoCreando, setTomaEquipoCreando] = useState(false)
  const [tomasEquipo, setTomasEquipo] = useState<{
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
    evaluacion: {componente: string; estado: string; descuento: number}[]
  }[]>([])
  const [selectedToma, setSelectedToma] = useState<typeof tomasEquipo[0] | null>(null)
  const [ncDetallePopup, setNcDetallePopup] = useState<AjusteCliente | null>(null)
  const [selectedAjuste, setSelectedAjuste] = useState<AjusteCliente | null>(null)
  
  // Filters (legacy — kept for compatibility with filtered derived state)
  const [estadoFilter, setEstadoFilter] = useState<string>("todos")
  const [vendedorFilter, setVendedorFilter] = useState<number | null>(null)
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos")

  // OdooFilterBar state — one set per list view
  const [savedFiltersClientes, setSavedFiltersClientes] = useState<SavedFilter[]>([])
  const [activeFiltersClientes, setActiveFiltersClientes] = useState<FilterOption[]>([])
  const [activeGroupByClientes, setActiveGroupByClientes] = useState<GroupByOption[]>([])

  const [savedFiltersNV, setSavedFiltersNV] = useState<SavedFilter[]>([])
  const [activeFiltersNV, setActiveFiltersNV] = useState<FilterOption[]>([])
  const [activeGroupByNV, setActiveGroupByNV] = useState<GroupByOption[]>([])

  const [savedFiltersOE, setSavedFiltersOE] = useState<SavedFilter[]>([])
  const [activeFiltersOE, setActiveFiltersOE] = useState<FilterOption[]>([])
  const [activeGroupByOE, setActiveGroupByOE] = useState<GroupByOption[]>([])

  const [savedFiltersFacturas, setSavedFiltersFacturas] = useState<SavedFilter[]>([])
  const [activeFiltersFacturas, setActiveFiltersFacturas] = useState<FilterOption[]>([])
  const [activeGroupByFacturas, setActiveGroupByFacturas] = useState<GroupByOption[]>([])

  const [savedFiltersRecibos, setSavedFiltersRecibos] = useState<SavedFilter[]>([])
  const [activeFiltersRecibos, setActiveFiltersRecibos] = useState<FilterOption[]>([])
  const [activeGroupByRecibos, setActiveGroupByRecibos] = useState<GroupByOption[]>([])

  const [savedFiltersNDC, setSavedFiltersNDC] = useState<SavedFilter[]>([])
  const [activeFiltersNDC, setActiveFiltersNDC] = useState<FilterOption[]>([])
  const [activeGroupByNDC, setActiveGroupByNDC] = useState<GroupByOption[]>([])

  // Helper for saving/deleting saved filters
  const makeSavedFilterHandlers = (
    setter: React.Dispatch<React.SetStateAction<SavedFilter[]>>,
    setActiveFilters: React.Dispatch<React.SetStateAction<FilterOption[]>>,
    setActiveGroupBy: React.Dispatch<React.SetStateAction<GroupByOption[]>>,
    setSearch: (s: string) => void
  ) => ({
    onSaveFilter: (f: Omit<SavedFilter, "id" | "createdBy">) => setter(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "Admin" }]),
    onDeleteFilter: (id: string) => setter(prev => prev.filter(sf => sf.id !== id)),
    onApplyFilter: (f: SavedFilter) => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy); setSearch("") }
  })

  // Helper para mapear productos de la API al tipo interno
  function mapearProductos(data: any[]): ProductoVenta[] {
    return data.map(p => ({
      id: p.id,
      sku: p.codigo_interno ?? "",
      nombre: p.nombre ?? "",
      descripcion: p.observaciones ?? "",
      precio_venta: p.precio_venta ?? 0,
      costo: p.costo_manual ?? 0,
      costo_manual: p.costo_manual ?? 0,
      moneda_costo: p.moneda_costo ?? "ARS",
      stock: p.stock_real ?? 0,
      categoria: p.categoria ?? "",
      requiere_serie: p.tiene_numero_serie ?? false,
    }))
  }

  // Cargar listas de precios al iniciar
  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setListasPrecios(data) })
      .catch(() => {})
  }, [])

  // Cargar versiones de listas de precios al iniciar
  useEffect(() => {
    fetch("/api/listas-precios/versiones")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setVersionesLista(data) })
      .catch(() => {})
  }, [])

  // Cargar maestro de productos al iniciar (fetch inline para evitar closure stale)
  useEffect(() => {
    fetch("/api/productos")
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return
        setProductosMaestro(mapearProductos(data))
      })
      .catch(() => {})
  }, [])

  // Recargar productos al entrar a vistas que lo necesitan
  useEffect(() => {
    if (activeView === "versiones_lista" || activeView === "listas_precios") {
      fetch("/api/productos")
        .then(r => r.json())
        .then((data: any[]) => {
          if (!Array.isArray(data) || data.length === 0) return
          setProductosMaestro(mapearProductos(data))
        })
        .catch(() => {})
    }
  }, [activeView])

  // Cargar productos de la lista de precios seleccionada cuando cambia nvListaPreciosId
  useEffect(() => {
    if (!nvListaPreciosId) {
      setProductosNV([])
      return
    }
    setProductosNVCargando(true)
    fetch(`/api/listas-precios/items?lista_id=${nvListaPreciosId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Hay items específicos en la lista — usarlos
          setProductosNV(data)
        } else {
          // La tabla lista_precios_items está vacía — usar el maestro completo de productos
          setProductosNV(productosMaestro)
        }
      })
      .catch(() => { setProductosNV(productosMaestro) })
      .finally(() => setProductosNVCargando(false))
  }, [nvListaPreciosId, productosMaestro.length])

  // Helper functions
  const formatCurrency = (amount: number, currency: "ARS" | "USD" = "ARS") => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2 
    }).format(amount)
  }

  const formatPrecioForzadoARS = (amount: number) => {
    const formatted = new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: "ARS",
      minimumFractionDigits: 2 
    }).format(amount)
    return `ARS ${formatted}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEstadoNVColor = (estado: string) => {
    const colors: Record<string, string> = {
      borrador: "bg-gray-100 text-gray-700",
      a_facturar: "bg-blue-100 text-blue-700",
      verificacion_factura: "bg-yellow-100 text-yellow-700",
      verificacion_oe: "bg-orange-100 text-orange-700",
      finalizada: "bg-green-100 text-green-700",
      cancelada: "bg-red-100 text-red-700"
    }
    return colors[estado] || "bg-gray-100 text-gray-700"
  }

  const getEstadoNVLabel = (estado: string) => {
    const labels: Record<string, string> = {
      borrador: "Borrador",
      a_facturar: "A Facturar",
      verificacion_factura: "Verif. Factura",
      verificacion_oe: "Verif. OE",
      finalizada: "Finalizada",
      cancelada: "Cancelada"
    }
    return labels[estado] || estado
  }

  const getEstadoOEColor = (estado: string) => {
    const colors: Record<string, string> = {
      borrador: "bg-gray-100 text-gray-700",
      esperando: "bg-yellow-100 text-yellow-700",
      parcial: "bg-orange-100 text-orange-700",
      disponible: "bg-blue-100 text-blue-700",
      confirmada: "bg-green-100 text-green-700"
    }
    return colors[estado] || "bg-gray-100 text-gray-700"
  }

  const getEstadoOELabel = (estado: string) => {
    const labels: Record<string, string> = {
      borrador: "Borrador",
      esperando: "Esperando Disponibilidad",
      parcial: "Parcialmente Disponible",
      disponible: "Disponible",
      confirmada: "Confirmada"
    }
    return labels[estado] || estado
  }

  const getEstadoRemitoColor = (estado: string) => {
    const colors: Record<string, string> = {
      en_ejecucion: "bg-yellow-100 text-yellow-700",
      aprobado: "bg-green-100 text-green-700"
    }
    return colors[estado] || "bg-gray-100 text-gray-700"
  }

  const getEstadoFacturaColor = (estado: string) => {
    const colors: Record<string, string> = {
      borrador: "bg-gray-100 text-gray-700",
      abierta: "bg-blue-100 text-blue-700",
      conciliada: "bg-green-100 text-green-700"
    }
    return colors[estado] || "bg-gray-100 text-gray-700"
  }

  const getPosicionFiscalLabel = (posicion: string) => {
    const labels: Record<string, string> = {
      consumidor_final: "Consumidor Final",
      responsable_inscripto: "Responsable Inscripto",
      monotributista: "Monotributista",
      exento: "Exento"
    }
    return labels[posicion] || posicion
  }

  const getCategoriaColor = (categoria: string) => {
  const colors: Record<string, string> = {
  publico: "bg-gray-100 text-gray-700",
  mercadolibre: "bg-yellow-100 text-yellow-700",
  mayorista: "bg-purple-100 text-purple-700"
  }
  return colors[categoria?.toLowerCase()] || "bg-purple-100 text-purple-700"
  }

  // Filtered data
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = searchQuery === "" || 
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategoria = categoriaFilter === "todos" || c.categoria === categoriaFilter
      return matchSearch && matchCategoria && c.activo
    })
  }, [clientes, searchQuery, categoriaFilter])

  const notasVentaFiltradas = useMemo(() => {
    return notasVenta.filter(nv => {
      const matchSearch = searchQuery === "" || 
        nv.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nv.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase())
      const matchEstado = estadoFilter === "todos" || nv.estado === estadoFilter
      const matchVendedor = vendedorFilter === null || nv.vendedor_id === vendedorFilter
      return matchSearch && matchEstado && matchVendedor
    })
  }, [notasVenta, searchQuery, estadoFilter, vendedorFilter])

  // Menu structure
  const menuSections = [
    {
      id: "clientes",
      label: "Clientes",
      icon: Users,
      items: [
        { id: "listado", label: "Clientes", icon: Users },
        { id: "conciliacion", label: "Conciliación de Deuda", icon: RefreshCw },
        { id: "ajustes", label: "Ajustes de Cliente", icon: Edit },
      ]
    },
    {
      id: "ventas",
      label: "Ventas",
      icon: FileText,
      items: [
        { id: "notas_venta", label: "Notas de Venta", icon: FileText },
        { id: "toma_equipo", label: "Toma de Equipo", icon: Repeat },
      ]
    },
    {
      id: "logistica",
      label: "Logística",
      icon: Truck,
      items: [
        { id: "ordenes_entrega", label: "Órdenes de Entrega", icon: Truck },
        { id: "remitos", label: "Remitos", icon: Package },
      ]
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      icon: Receipt,
      items: [
        { id: "facturas", label: "Facturas", icon: Receipt },
        { id: "notas_debito", label: "Notas de Débito", icon: ArrowRight },
        { id: "notas_credito", label: "Notas de Crédito", icon: ArrowLeft },
      ]
    },
    {
      id: "cobranzas",
      label: "Cobranzas",
      icon: CreditCard,
      items: [
        { id: "recibos", label: "Recibos", icon: CreditCard },
      ]
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Tag,
      items: [
        { id: "listas_precios", label: "Listas de Precios", icon: Tag },
        { id: "versiones_lista", label: "Versiones de Lista", icon: Layers },
        { id: "categorias_cliente", label: "Categorías de Clientes", icon: Users },
      ]
    },
    {
      id: "config_notas_credito",
      label: "Notas de Crédito",
      icon: FileText,
      items: [
        { id: "nc_categorias", label: "Categorías", icon: Tag },
      ]
    },
  ]

  // Componente de Seguimiento (tracking de cambios estilo Odoo)
  const SeguimientoPanel = ({ 
    seguimiento, 
    collapsed = true 
  }: { 
    seguimiento: SeguimientoEntry[]
    collapsed?: boolean
  }) => {
    const [isExpanded, setIsExpanded] = useState(!collapsed)
    
    const formatFechaRelativa = (fecha: string) => {
      const now = new Date()
      const date = new Date(fecha)
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 1) return "hace un momento"
      if (diffMins < 60) return `hace ${diffMins} minutos`
      if (diffHours < 24) return `hace ${diffHours} horas`
      if (diffDays < 7) return `hace ${diffDays} días`
      return date.toLocaleDateString("es-AR")
    }
    
    const renderEntryContent = (entry: SeguimientoEntry) => {
      switch (entry.tipo) {
        case "creacion":
          return (
            <div>
              <span className="font-medium text-gray-900">Documento creado</span>
              {entry.descripcion && <p className="text-gray-600 text-sm mt-1">{entry.descripcion}</p>}
            </div>
          )
        case "cambio_estado":
          return (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Estado:</span>
              <span className="text-gray-900">{entry.valor_anterior}</span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">{entry.valor_nuevo}</span>
            </div>
          )
        case "cambio_campo":
          return (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-600">{entry.campo}:</span>
              {entry.valor_anterior && (
                <>
                  <span className="text-gray-500 line-through">{entry.valor_anterior}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </>
              )}
              <span className="font-medium text-gray-900">{entry.valor_nuevo}</span>
            </div>
          )
        case "nota":
          return (
            <div className="bg-amber-50 border-l-2 border-amber-400 pl-3 py-1">
              <span className="text-gray-800">{entry.descripcion}</span>
            </div>
          )
        case "mensaje":
          return (
            <div>
              <span className="text-gray-800">{entry.descripcion}</span>
            </div>
          )
        default:
          return <span>{entry.descripcion}</span>
      }
    }
    
    return (
      <div className="mt-6 border-t border-gray-200 pt-4">
        {/* Botón Ver seguimiento */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 px-4 text-sm text-purple-700 hover:text-purple-800 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          {isExpanded ? "Ocultar seguimiento" : "Ver seguimiento"}
        </button>
        
        {isExpanded && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Lista de entradas */}
            <div className="divide-y divide-gray-100">
              {seguimiento.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No hay actividad registrada
                </div>
              ) : (
                seguimiento.map((entry) => (
                  <div key={entry.id} className="flex gap-3 p-4 hover:bg-gray-50">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                    
                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        {renderEntryContent(entry)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="font-medium text-purple-700">{entry.usuario}</span>
                        <span>·</span>
                        <span>{formatFechaRelativa(entry.fecha)}</span>
                        <span>·</span>
                        <button className="hover:text-purple-700">Me gusta</button>
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    <div className="flex items-start gap-1">
                      <button className="p-1 text-gray-400 hover:text-amber-500">
                        <Star className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-purple-600">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render functions
  const renderSidebar = () => (
    <div className="w-56 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Ventas</h2>
            <p className="text-xs text-gray-500">Puerto Norte</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuSections.map(section => (
          <div key={section.id} className="mb-2">
            <button
              onClick={() => setMenuExpandido(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
              className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido[section.id] ? "rotate-90" : ""}`} />
              <section.icon className="w-3.5 h-3.5" />
              {section.label}
            </button>
            {menuExpandido[section.id] && (
              <div className="ml-2">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      setActiveView(item.id)
                      setSearchQuery("")
                      setSelectedCliente(null)
                      setSelectedNV(null)
                      setSelectedAjuste(null)
                      setClientePanel("ficha")
                      // Limpiar selección de versión al navegar a versiones desde sidebar
                      if (item.id === "versiones_lista") {
                        setSelectedVersion(null)
                        setEditingVersion(null)
                        setCreandoVersion(false)
                        setModoEdicionVersion(false)
                      }
                      // Limpiar selección de lista al navegar a listas desde sidebar
                      if (item.id === "listas_precios") {
                        setSelectedListaPrecios(null)
                        setEditingListaPrecios(null)
                        setCreandoListaPrecios(false)
                        setModoEdicionListaPrecios(false)
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${section.id === "config_notas_credito" ? "text-xs" : "text-sm"} ${
                      activeView === item.id 
                        ? "bg-emerald-100 text-emerald-800 font-medium" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className={section.id === "config_notas_credito" ? "w-3.5 h-3.5" : "w-4 h-4"} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )

  // Dashboard de Ventas
  const renderDashboard = () => {
    const totalVentasMes = notasVenta.filter(nv => nv.estado !== "cancelada").reduce((acc, nv) => acc + nv.total, 0)
    const ventasPendientes = notasVenta.filter(nv => nv.estado === "borrador" || nv.estado === "a_facturar").length
    const facturasPendientes = facturas.filter(f => f.estado === "abierta").length
    const totalPorCobrar = facturas.filter(f => f.estado === "abierta").reduce((acc, f) => acc + f.saldo, 0)

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-emerald-900">Dashboard de Ventas</h1>
        
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ventas del Mes</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalVentasMes)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">NV Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{ventasPendientes}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Facturas por Cobrar</p>
                <p className="text-2xl font-bold text-gray-900">{facturasPendientes}</p>
              </div>
              <Receipt className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total por Cobrar</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPorCobrar)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Últimas Notas de Venta</h3>
            <div className="space-y-3">
              {notasVenta.slice(0, 5).map(nv => (
                <div key={nv.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-sm">{nv.numero}</p>
                    <p className="text-xs text-gray-500">{nv.cliente_nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(nv.total, nv.moneda)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${getEstadoNVColor(nv.estado)}`}>
                      {getEstadoNVLabel(nv.estado)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Facturas Pendientes de Cobro</h3>
            <div className="space-y-3">
              {facturas.filter(f => f.estado === "abierta").slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-sm">{f.numero}</p>
                    <p className="text-xs text-gray-500">{f.cliente_nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm text-red-600">{formatCurrency(f.saldo, f.moneda)}</p>
                    <p className="text-xs text-gray-500">Vence: {formatDate(f.vencimientos[0]?.fecha || f.fecha)}</p>
                  </div>
                </div>
              ))}
              {facturas.filter(f => f.estado === "abierta").length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No hay facturas pendientes</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ficha de Orden de Trabajo (vista completa)
  const renderFichaOT = () => {
    if (!selectedOTData) return null
    
    return (
      <div>
        {/* Header con breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Clientes / {selectedOTData.cliente?.nombre} / Órdenes de Trabajo / <span className="text-gray-700">{selectedOTData.nro}</span>
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setSelectedCliente(null)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">{selectedOTData.nro}</h1>
            <p className="text-sm text-gray-500">{selectedOTData.fecha} | {selectedOTData.cliente?.nombre}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            selectedOTData.estado === "Finalizada" ? "bg-green-100 text-green-700" : 
            selectedOTData.estado === "Entregada" ? "bg-blue-100 text-blue-700" : 
            "bg-amber-100 text-amber-700"
          }`}>
            {selectedOTData.estado}
          </span>
        </div>

        {/* Barra de acciones */}
        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm border border-gray-300 text-white rounded-md hover:bg-gray-700 flex items-center gap-1">
              <Edit className="w-4 h-4" /> Editar
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-b-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Datos del Equipo */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos del Equipo</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipo:</span>
                  <span className="font-medium">{selectedOTData.equipo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">IMEI:</span>
                  <span className="font-medium font-mono">{selectedOTData.imei}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Problema:</span>
                  <span className="font-medium">{selectedOTData.problema}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Técnico:</span>
                  <span className="font-medium">{selectedOTData.tecnico}</span>
                </div>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nombre:</span>
                  <span className="font-medium">{selectedOTData.cliente?.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Documento:</span>
                  <span className="font-medium">{selectedOTData.cliente?.tipo_documento}: {selectedOTData.cliente?.numero_documento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="font-medium text-emerald-600">{selectedOTData.cliente?.telefono || selectedOTData.cliente?.celular}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium text-emerald-600">{selectedOTData.cliente?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seguimiento - simulado */}
          <SeguimientoPanel seguimiento={[
            { id: 1, fecha: new Date().toISOString(), usuario: "Max Solina", tipo: "creacion" as const, descripcion: "Orden de trabajo creada" },
            { id: 2, fecha: new Date().toISOString(), usuario: selectedOTData.tecnico, tipo: "cambio_estado" as const, valor_anterior: "Pendiente", valor_nuevo: selectedOTData.estado }
          ]} />
        </div>
      </div>
    )
  }

  // Listado de Clientes
  const renderClientes = () => {
    if (selectedOTData) {
      return renderFichaOT()
    }
    
    if (creandoCliente) {
      return renderFormularioCliente()
    }

    if (selectedCliente) {
      return renderFichaCliente()
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-emerald-900">Clientes</h1>
          <button 
            onClick={() => { setEditingItem(null); setCreandoCliente(true) }}
            className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="clientes"
            filterOptions={[
              { field: "categoria", label: "Categoría", values: [
                { value: "publico", label: "Público" },
                { value: "mercadolibre", label: "MercadoLibre" },
                { value: "mayorista", label: "Mayorista" },
              ]},
            ]}
            groupByOptions={[
              { id: "categoria", label: "Categoría", field: "categoria" },
              { id: "ciudad", label: "Ciudad", field: "ciudad" },
            ]}
            activeFilters={activeFiltersClientes}
            activeGroupBy={activeGroupByClientes}
            searchTerm={searchQuery}
            onFiltersChange={f => { setActiveFiltersClientes(f); setCategoriaFilter(f.find(x => x.field === "categoria")?.value ?? "todos") }}
            onGroupByChange={setActiveGroupByClientes}
            onSearchChange={setSearchQuery}
            savedFilters={savedFiltersClientes}
            {...makeSavedFilterHandlers(setSavedFiltersClientes, setActiveFiltersClientes, setActiveGroupByClientes, setSearchQuery)}
            totalCount={clientes.length}
            filteredCount={clientesFiltrados.length}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Documento</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Ciudad</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo CC</th>
              </tr>
            </thead>
            <tbody>
              {clientesLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    Cargando clientes...
                  </td>
                </tr>
              )}
              {!clientesLoading && clientesFiltrados.map(cliente => (
                <tr 
                  key={cliente.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelectedCliente(cliente); setClientePanel("ficha") }}
                >
                  <td className="py-3 px-4 font-mono text-sm text-emerald-700">{cliente.codigo}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{cliente.nombre}</p>
                      {cliente.nombre_fantasia && (
                        <p className="text-xs text-gray-500">{cliente.nombre_fantasia}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {cliente.tipo_documento} {cliente.numero_documento}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{cliente.ciudad}</td>
                  <td className="py-3 px-4">
                    {(() => {
                      const catObj = categoriasCliente.find(c =>
                        c.nombre.toLowerCase() === (cliente.categoria ?? "").toLowerCase() ||
                        String(c.id) === String(cliente.categoria_id ?? "")
                      )
                      const label = catObj?.nombre ?? cliente.categoria ?? ""
                      if (!label) return null
                      const colorKey = label.toLowerCase()
                      return (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(colorKey)}`}>
                          {label}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{cliente.email}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${cliente.saldo_cuenta_corriente > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(cliente.saldo_cuenta_corriente, cliente.moneda_cuenta_corriente)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clientesFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron clientes
            </div>
          )}
        </div>
      </div>
    )
  }

  // Formulario de Crear/Editar Cliente (página completa)
  const renderFormularioCliente = () => {
    return (
      <div>
        {/* Header con breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Clientes / <span className="text-gray-700">{editingItem ? "Editar Cliente" : "Nuevo Cliente"}</span>
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoCliente(false)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">{editingItem ? "Editar Cliente" : "Nuevo Cliente"}</h1>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={(e) => { handleSubmitClienteForm(e, editingItem, formClienteCategoriaId, categoriasCliente, setCreandoCliente, setEditingItem, setSelectedCliente, onNuevoCliente) }} className="p-4">
            {/* Sección Identificaci����n */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Identificación
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Nombre / Razón Social *</label>
                  <input type="text" name="nombre" defaultValue={editingItem?.nombre || ""} required
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Nombre Fantasía</label>
                  <input type="text" name="nombre_fantasia" defaultValue={editingItem?.nombre_fantasia || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Tipo Documento *</label>
                  <select name="tipo_documento" defaultValue={editingItem?.tipo_documento || "DNI"}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="DNI">DNI</option>
                    <option value="CUIT">CUIT</option>
                    <option value="CUIL">CUIL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Número Documento *</label>
                  <input type="text" name="numero_documento" defaultValue={editingItem?.numero_documento || ""} required
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Posición Fiscal *</label>
                  <select name="posicion_fiscal" defaultValue={editingItem?.posicion_fiscal || "consumidor_final"}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="consumidor_final">Consumidor Final</option>
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                    <option value="monotributista">Monotributista</option>
                    <option value="exento">Exento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección Dirección */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Dirección
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Dirección</label>
                  <input type="text" name="direccion" defaultValue={editingItem?.direccion || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Ciudad</label>
                  <input type="text" name="ciudad" defaultValue={editingItem?.ciudad || "Rosario"}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Provincia</label>
                  <input type="text" name="provincia" defaultValue={editingItem?.provincia || "Santa Fe"}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Código Postal</label>
                  <input type="text" name="codigo_postal" defaultValue={editingItem?.codigo_postal || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Zona</label>
                  <input type="text" name="zona" defaultValue={editingItem?.zona || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
            </div>

            {/* Sección Contacto */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Contacto
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Teléfono</label>
                  <input type="text" name="telefono" defaultValue={editingItem?.telefono || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Celular</label>
                  <input type="text" name="celular" defaultValue={editingItem?.celular || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Email</label>
                  <input type="email" name="email" defaultValue={editingItem?.email || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
            </div>

            {/* Sección Comercial */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Información Comercial
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Categoría de Cliente</label>
                  <select
                    name="categoria_id"
                    value={formClienteCategoriaId ?? ""}
                    onChange={(e) => {
                      const catId = e.target.value ? Number(e.target.value) : null
                      setFormClienteCategoriaId(catId)
                    }}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Sin categoría</option>
                    {categoriasCliente.filter(c => c.activa).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Vendedor</label>
                  <select name="vendedor_id" defaultValue={editingItem?.vendedor_id || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="">Sin asignar</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Lista de Precios por Defecto</label>
                  <select
                    name="lista_precios_id"
                    value={
                      formClienteCategoriaId
                        ? (categoriasCliente.find(c => c.id === formClienteCategoriaId)?.lista_precios_defecto_id ?? editingItem?.lista_precios_id ?? 1)
                        : (editingItem?.lista_precios_id ?? 1)
                    }
                    onChange={() => {}}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {listasPrecios.map(lp => (
                      <option key={lp.id} value={lp.id}>{lp.nombre}</option>
                    ))}
                  </select>
                  {formClienteCategoriaId && (
                    <p className="text-xs text-emerald-600 mt-0.5">Completado por la categoría seleccionada</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Descuento Default (%)</label>
                  <input type="number" name="descuento_default" defaultValue={editingItem?.descuento_default || 0} min="0" max="100" step="0.5"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Moneda CC</label>
                  <select name="moneda_cuenta_corriente" defaultValue={editingItem?.moneda_cuenta_corriente || "ARS"}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Término de Pago</label>
                  <select name="termino_pago_id" defaultValue={editingItem?.termino_pago_id || 1}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    {mockTerminosPago.map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setCreandoCliente(false); setEditingItem(null); setFormClienteCategoriaId(null) }}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-emerald-700 text-white rounded hover:bg-emerald-800 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" /> {editingItem ? "Guardar Cambios" : "Crear Cliente"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Ficha de Cliente
  const renderFichaCliente = () => {
    if (!selectedCliente) return null

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => { setSelectedCliente(null); setClientePanel("ficha") }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-emerald-900">{selectedCliente.nombre}</h1>
              {selectedCliente.categoria && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoriaColor(selectedCliente.categoria)}`}>
                  {selectedCliente.categoria === "publico" ? "Público"
                    : selectedCliente.categoria === "mercadolibre" ? "MercadoLibre"
                    : selectedCliente.categoria.charAt(0).toUpperCase() + selectedCliente.categoria.slice(1)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {selectedCliente.codigo}
              <span className="mx-1.5 text-gray-300">|</span>
              {getPosicionFiscalLabel(selectedCliente.posicion_fiscal)}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setEditingItem(selectedCliente); setCreandoCliente(true) }}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Editar
            </button>
          </div>
        </div>

        {/* Metrics - Clickeables (toggle: click de nuevo para volver a ficha) */}
        {(() => {
          const facturasCliente = facturas.filter(f => f.cliente_id === selectedCliente.id)
          const nvCliente = notasVenta.filter(nv => nv.cliente_id === selectedCliente.id)
          const recibosCliente = recibos.filter(r => r.cliente_id === selectedCliente.id)
          const totalFacturado = facturasCliente.reduce((sum, f) => sum + f.total, 0)
          const historialCount = facturasCliente.length + nvCliente.length + recibosCliente.length
          return (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <button 
            onClick={() => setClientePanel(clientePanel === "facturado" ? "ficha" : "facturado")}
            className={`bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer border-2 ${clientePanel === "facturado" ? "border-emerald-500" : "border-transparent"}`}
          >
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalFacturado)}</p>
            <p className="text-xs text-gray-500">Facturado</p>
          </button>
          <button 
            onClick={() => setClientePanel(clientePanel === "historial" ? "ficha" : "historial")}
            className={`bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer border-2 ${clientePanel === "historial" ? "border-emerald-500" : "border-transparent"}`}
          >
            <p className="text-2xl font-bold text-gray-900">{historialCount}</p>
            <p className="text-xs text-gray-500">Historial</p>
          </button>
          <button 
            onClick={() => setClientePanel(clientePanel === "ot" ? "ficha" : "ot")}
            className={`bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer border-2 ${clientePanel === "ot" ? "border-emerald-500" : "border-transparent"}`}
          >
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500">Órdenes de Trabajo</p>
          </button>
          <button 
            onClick={() => setClientePanel(clientePanel === "ventas" ? "ficha" : "ventas")}
            className={`bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer border-2 ${clientePanel === "ventas" ? "border-emerald-500" : "border-transparent"}`}
          >
            <p className="text-2xl font-bold text-gray-900">{nvCliente.length}</p>
            <p className="text-xs text-gray-500">Ventas</p>
          </button>
          <button 
            onClick={() => setClientePanel(clientePanel === "reingresos" ? "ficha" : "reingresos")}
            className={`bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer border-2 ${clientePanel === "reingresos" ? "border-emerald-500" : "border-transparent"}`}
          >
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-500">Re Ingresos</p>
          </button>
        </div>
          )
        })()}

        {/* Panel de Historial/Facturado/OT/Ventas/Re Ingresos */}
        {clientePanel !== "ficha" && (
          <div className="bg-white rounded-lg shadow-sm">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => setClientePanel("ficha")} className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" />
                  {selectedCliente.nombre}
                </button>
                <span className="text-gray-400">/</span>
                <span className="font-medium text-gray-900">
                  {clientePanel === "historial" && "Historial de Clientes"}
                  {clientePanel === "facturado" && "Facturas"}
                  {clientePanel === "ot" && "Órdenes de Trabajo"}
                  {clientePanel === "ventas" && "Notas de Venta"}
                  {clientePanel === "reingresos" && "Re Ingresos"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm w-64" />
                </div>
                <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <Filter className="w-4 h-4" /> Filtros
                </button>
              </div>
            </div>

            {/* Tabla de Historial (Cuenta Corriente) */}
            {clientePanel === "historial" && (() => {
              // Combinar facturas, notas de venta y recibos del cliente
              const facturasCliente = facturas.filter(f => f.cliente_id === selectedCliente.id)
              const nvCliente = notasVenta.filter(nv => nv.cliente_id === selectedCliente.id)
              const recibosCliente = recibos.filter(r => r.cliente_id === selectedCliente.id)
              
              // Crear historial combinado
              type HistorialItem = { tipo: string; fecha: string; nv: string; comp: string; importe: number; tipoDoc: "factura" | "nv" | "recibo" }
              const historial: HistorialItem[] = [
                ...nvCliente.map(nv => ({ tipo: "NV", fecha: nv.fecha, nv: nv.numero, comp: "", importe: nv.total, tipoDoc: "nv" as const })),
                ...facturasCliente.map(f => ({ tipo: "FC", fecha: f.fecha, nv: f.nota_venta || "", comp: f.numero, importe: f.total, tipoDoc: "factura" as const })),
                ...recibosCliente.map(r => ({ tipo: "RC", fecha: r.fecha, nv: "", comp: r.numero, importe: r.total, tipoDoc: "recibo" as const })),
              ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
              
              let saldoAcum = 0
              const historialConSaldo = historial.map(h => {
                const debe = h.tipoDoc === "factura" ? h.importe : 0
                const haber = h.tipoDoc === "recibo" ? h.importe : 0
                saldoAcum += debe - haber
                return { ...h, debe, haber, saldo: saldoAcum }
              })
              
              return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Tipo</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Fecha y Hora</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Cliente</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Sucursal</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Nota de Venta</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Comprobante</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Importe</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Debe</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Haber</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Saldo</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialConSaldo.length === 0 ? (
                      <tr><td colSpan={12} className="py-8 text-center text-sm text-gray-500">No hay movimientos para este cliente</td></tr>
                    ) : historialConSaldo.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                        <td className="py-2 px-3 text-sm text-gray-600">{row.tipo}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{row.fecha}</td>
                        <td className="py-2 px-3 text-sm text-gray-900">{selectedCliente.codigo} - {selectedCliente.nombre}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{selectedCliente.sucursal_origen}</td>
                        <td className="py-2 px-3 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => row.nv && setPopupDocumento({tipo: "nv", codigo: row.nv})}>{row.nv || "-"}</td>
                        <td className="py-2 px-3 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => row.comp && setPopupDocumento({tipo: row.tipoDoc, codigo: row.comp})}>{row.comp || "-"}</td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">{formatCurrency(row.importe)}</td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">{row.debe > 0 ? formatCurrency(row.debe) : "0,00"}</td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">{row.haber > 0 ? formatCurrency(row.haber) : "0,00"}</td>
                        <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">{formatCurrency(row.saldo)}</td>
                        <td className="py-2 px-3"><Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => setPopupDocumento({tipo: row.tipoDoc, codigo: row.comp || row.nv})} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-500 text-right border-t">1-{historialConSaldo.length} de {historialConSaldo.length}</div>
              </div>
              )
            })()}

            {/* Tabla de Facturado */}
            {clientePanel === "facturado" && (() => {
              const facturasCliente = facturas.filter(f => f.cliente_id === selectedCliente.id)
              return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Fecha</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Comprobante</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Nota de Venta</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Sucursal</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Importe</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Estado</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasCliente.length === 0 ? (
                      <tr><td colSpan={8} className="py-8 text-center text-sm text-gray-500">No hay facturas para este cliente</td></tr>
                    ) : facturasCliente.map((fac) => (
                      <tr key={fac.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                        <td className="py-2 px-3 text-sm text-gray-600">{fac.fecha}</td>
                        <td className="py-2 px-3 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => setPopupDocumento({tipo: "factura", codigo: fac.numero})}>{fac.numero}</td>
                        <td className="py-2 px-3 text-sm text-blue-600 cursor-pointer hover:underline" onClick={() => fac.nota_venta && setPopupDocumento({tipo: "nv", codigo: fac.nota_venta})}>{fac.nota_venta || "-"}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{selectedCliente.sucursal_origen}</td>
                        <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">{formatCurrency(fac.total)}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${fac.estado === "Conciliada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {fac.estado}
                          </span>
                        </td>
                        <td className="py-2 px-3"><Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => setPopupDocumento({tipo: "factura", codigo: fac.numero})} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-500 text-right border-t">1-{facturasCliente.length} de {facturasCliente.length}</div>
              </div>
              )
            })()}

            {/* Tabla de Órdenes de Trabajo */}
            {clientePanel === "ot" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Nro OT</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Fecha Ingreso</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Equipo</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">IMEI/Serie</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Problema</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Estado</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Técnico</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { nro: "OT-2026-00145", fecha: "10/01/2026", equipo: "iPhone 14 Pro", imei: "354832109876543", problema: "Pantalla rota", estado: "En Reparación", tecnico: "Carlos M." },
                      { nro: "OT-2026-00098", fecha: "05/01/2026", equipo: "Samsung S23", imei: "356789012345678", problema: "No enciende", estado: "Finalizada", tecnico: "Juan P." },
                      { nro: "OT-2026-00052", fecha: "02/01/2026", equipo: "Motorola Edge", imei: "358901234567890", problema: "Batería", estado: "Entregada", tecnico: "María L." },
                    ].map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                        <td className="py-2 px-3 text-sm text-blue-600 cursor-pointer hover:underline font-medium" onClick={() => setSelectedOTData({...row, cliente: selectedCliente})}>{row.nro}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{row.fecha}</td>
                        <td className="py-2 px-3 text-sm text-gray-900">{row.equipo}</td>
                        <td className="py-2 px-3 text-sm text-gray-600 font-mono">{row.imei}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{row.problema}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            row.estado === "Finalizada" ? "bg-green-100 text-green-700" : 
                            row.estado === "Entregada" ? "bg-blue-100 text-blue-700" : 
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {row.estado}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-600">{row.tecnico}</td>
                        <td className="py-2 px-3"><Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-500 text-right border-t">1-3 de 3</div>
              </div>
            )}

            {/* Tabla de Ventas (Notas de Venta) */}
            {clientePanel === "ventas" && (() => {
              const nvCliente = notasVenta.filter(nv => nv.cliente_id === selectedCliente.id)
              return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Nota de Venta</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Fecha</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Sucursal</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Total</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Estado</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Facturación</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {nvCliente.length === 0 ? (
                      <tr><td colSpan={8} className="py-8 text-center text-sm text-gray-500">No hay notas de venta para este cliente</td></tr>
                    ) : nvCliente.map((nv) => (
                      <tr key={nv.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                        <td className="py-2 px-3 text-sm text-blue-600 cursor-pointer hover:underline font-medium" onClick={() => setPopupDocumento({tipo: "nv", codigo: nv.numero})}>{nv.numero}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{nv.fecha}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{selectedCliente.sucursal_origen}</td>
                        <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">{formatCurrency(nv.total)}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${nv.estado === "Confirmada" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {nv.estado}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {(() => {
                            // Buscar si hay factura asociada a esta NV
                            const facturaAsociada = facturas.find(f => f.nota_venta === nv.numero)
                            if (facturaAsociada) {
                              return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Facturado</span>
                            } else if (nv.estado === "a_facturar") {
                              return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Factura Abierta</span>
                            } else {
                              return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Sin Facturar</span>
                            }
                          })()}
                        </td>
                        <td className="py-2 px-3"><Eye className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => setPopupDocumento({tipo: "nv", codigo: nv.numero})} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-500 text-right border-t">1-{nvCliente.length} de {nvCliente.length}</div>
              </div>
              )
            })()}

            {/* Tabla de Re Ingresos (OT con garantía) */}
            {clientePanel === "reingresos" && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 py-2 px-3"><input type="checkbox" className="rounded border-gray-300" /></th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Nro OT</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">OT Original</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Fecha Ingreso</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Equipo</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Categoría</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Estado</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td colSpan={8} className="py-8 text-center text-sm text-gray-500">
                        No hay re ingresos registrados para este cliente
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Popup Modal para ver documentos */}
            {popupDocumento.tipo && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPopupDocumento({tipo: null, codigo: ""})}>
                <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {popupDocumento.tipo === "factura" && "Factura"}
                      {popupDocumento.tipo === "nv" && "Nota de Venta"}
                      {popupDocumento.tipo === "recibo" && "Recibo"}
                      {" "}{popupDocumento.codigo}
                    </h3>
                    <button onClick={() => setPopupDocumento({tipo: null, codigo: ""})} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6">
                    {popupDocumento.tipo === "factura" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-sm text-gray-500">Cliente:</span> <span className="font-medium">{selectedCliente?.nombre}</span></div>
                          <div><span className="text-sm text-gray-500">CUIT:</span> <span className="font-medium">{selectedCliente?.documento}</span></div>
                          <div><span className="text-sm text-gray-500">Fecha:</span> <span className="font-medium">15/01/2026</span></div>
                          <div><span className="text-sm text-gray-500">Condición:</span> <span className="font-medium">Contado</span></div>
                        </div>
                        <table className="w-full mt-4">
                          <thead><tr className="bg-gray-50 border-b"><th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Producto</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Cant.</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Precio</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Subtotal</th></tr></thead>
                          <tbody>
                            <tr className="border-b"><td className="py-2 px-3 text-sm">iPhone 14 Pro 128GB</td><td className="py-2 px-3 text-sm text-right">1</td><td className="py-2 px-3 text-sm text-right">$1.220.000</td><td className="py-2 px-3 text-sm text-right font-medium">$1.220.000</td></tr>
                          </tbody>
                          <tfoot><tr className="bg-gray-50"><td colSpan={3} className="py-2 px-3 text-sm font-medium text-right">Total:</td><td className="py-2 px-3 text-sm font-bold text-right">$1.220.000,00</td></tr></tfoot>
                        </table>
                      </div>
                    )}
                    {popupDocumento.tipo === "nv" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-sm text-gray-500">Cliente:</span> <span className="font-medium">{selectedCliente?.nombre}</span></div>
                          <div><span className="text-sm text-gray-500">Fecha:</span> <span className="font-medium">15/01/2026</span></div>
                          <div><span className="text-sm text-gray-500">Sucursal:</span> <span className="font-medium">{selectedCliente?.sucursal_origen}</span></div>
                          <div><span className="text-sm text-gray-500">Estado:</span> <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Confirmada</span></div>
                        </div>
                        <table className="w-full mt-4">
                          <thead><tr className="bg-gray-50 border-b"><th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Producto</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Cant.</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Precio</th><th className="text-right py-2 px-3 text-xs font-medium text-gray-600">Subtotal</th></tr></thead>
                          <tbody>
                            <tr className="border-b"><td className="py-2 px-3 text-sm">iPhone 14 Pro 128GB</td><td className="py-2 px-3 text-sm text-right">1</td><td className="py-2 px-3 text-sm text-right">$1.220.000</td><td className="py-2 px-3 text-sm text-right font-medium">$1.220.000</td></tr>
                          </tbody>
                          <tfoot><tr className="bg-gray-50"><td colSpan={3} className="py-2 px-3 text-sm font-medium text-right">Total:</td><td className="py-2 px-3 text-sm font-bold text-right">$1.220.000,00</td></tr></tfoot>
                        </table>
                      </div>
                    )}
                    {popupDocumento.tipo === "recibo" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><span className="text-sm text-gray-500">Cliente:</span> <span className="font-medium">{selectedCliente?.nombre}</span></div>
                          <div><span className="text-sm text-gray-500">Fecha:</span> <span className="font-medium">15/01/2026</span></div>
                          <div><span className="text-sm text-gray-500">Importe:</span> <span className="font-medium text-emerald-600">$1.220.000,00</span></div>
                          <div><span className="text-sm text-gray-500">Forma de Pago:</span> <span className="font-medium">Efectivo</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button onClick={() => setPopupDocumento({tipo: null, codigo: ""})} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">Cerrar</button>
                    <button 
                      onClick={() => {
                        const codigo = popupDocumento.codigo
                        const tipo = popupDocumento.tipo
                        // Primero cerramos el popup y limpiamos selección de cliente
                        setPopupDocumento({tipo: null, codigo: ""})
                        setSelectedCliente(null)
                        setClientePanel("ficha")
                        
                        // Navegar al comprobante específico según el tipo
                        if (tipo === "factura") {
                          const factura = facturas.find(f => f.numero === codigo)
                          if (factura) {
                            setSelectedFactura(factura)
                          }
                          setActiveView("facturas")
                        } else if (tipo === "nv") {
                          const nv = notasVenta.find(n => n.numero === codigo)
                          if (nv) {
                            setSelectedNV(nv)
                          }
                          setActiveView("notas_venta")
                        } else if (tipo === "recibo") {
                          const recibo = recibos.find(r => r.numero === codigo)
                          if (recibo) {
                            setSelectedRecibo(recibo)
                            if (recibo.estado === "borrador") {
                              setReciboPagosForm(recibo.pagos.map(p => ({ forma_pago: p.forma_pago, importe: p.importe, moneda: p.moneda })))
                            }
                          }
                          setActiveView("recibos")
                        }
                        // OT está en módulo Taller, solo cerramos el popup
                      }}
                      className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Ir al Comprobante
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs - Solo visible cuando está en ficha */}
        {clientePanel === "ficha" && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 px-4">
              {["general", "ventas_compras", "cuenta_corriente"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab 
                      ? "border-emerald-600 text-emerald-600" 
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "general" ? "Datos Generales" : tab === "ventas_compras" ? "Ventas & Compras" : "Cuenta Corriente"}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "general" && (
              <div className="grid grid-cols-2 gap-8">
                {/* Columna izquierda */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Identificación
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nombre/Razón Social:</span>
                        <span className="font-medium">{selectedCliente.nombre}</span>
                      </div>
                      {selectedCliente.nombre_fantasia && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Nombre de Fantasía:</span>
                          <span>{selectedCliente.nombre_fantasia}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo Documento:</span>
                        <span>{selectedCliente.tipo_documento}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{"N\u00famero"}:</span>
                        <span>{selectedCliente.numero_documento}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Posición Fiscal:</span>
                        <span>{getPosicionFiscalLabel(selectedCliente.posicion_fiscal)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Dirección
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Dirección:</span>
                        <span>{selectedCliente.direccion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ciudad:</span>
                        <span>{selectedCliente.ciudad}, {selectedCliente.provincia}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Código Postal:</span>
                        <span>{selectedCliente.codigo_postal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Zona:</span>
                        <span>{selectedCliente.zona}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Contacto
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Teléfono:</span>
                        <span>{selectedCliente.telefono || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Celular:</span>
                        <span>{selectedCliente.celular}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="text-emerald-600">{selectedCliente.email}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Información Adicional
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fecha de Alta:</span>
                        <span>{formatDate(selectedCliente.fecha_alta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sucursal Origen:</span>
                        <span>{selectedCliente.sucursal_origen}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Estado:</span>
                        <span className={selectedCliente.activo ? "text-green-600" : "text-red-600"}>
                          {selectedCliente.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ventas_compras" && (
              <div className="space-y-8">
                {/* Sección General */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">Configuración General</h3>
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-gray-500 block">Vendedor Asignado:</span>
                      <span className="font-medium">{vendedores.find(v => v.id === selectedCliente.vendedor_id)?.nombre || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Lista de Precios:</span>
                      <span className="font-medium">{listasPrecios.find(l => l.id === selectedCliente.lista_precios_id)?.nombre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Descuento Default:</span>
                      <span className="font-medium">{selectedCliente.descuento_default}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Moneda Cuenta Corriente:</span>
                      <span className="font-medium">{selectedCliente.moneda_cuenta_corriente}</span>
                    </div>
                  </div>
                </div>

                {/* Sección Ventas */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">Configuración de Ventas</h3>
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <span className="text-gray-500 block">Término de Pago:</span>
                      <span className="font-medium">{mockTerminosPago.find(t => t.id === selectedCliente.termino_pago_id)?.nombre}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Saldo Cuenta Corriente:</span>
                      <span className={`font-medium ${selectedCliente.saldo_cuenta_corriente > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(selectedCliente.saldo_cuenta_corriente, selectedCliente.moneda_cuenta_corriente)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "cuenta_corriente" && (
              <div className="space-y-6">
                {/* Resumen de saldo */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600 mb-1">Total Débitos (Deuda)</p>
                    <p className="text-2xl font-bold text-red-700">
                      {formatCurrency(
                        movimientosCC
                          .filter(m => m.cliente_id === selectedCliente.id && m.tipo === "debito")
                          .reduce((sum, m) => sum + m.importe, 0),
                        selectedCliente.moneda_cuenta_corriente
                      )}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-600 mb-1">Total Créditos (Pagos)</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(
                        movimientosCC
                          .filter(m => m.cliente_id === selectedCliente.id && m.tipo === "credito")
                          .reduce((sum, m) => sum + m.importe, 0),
                        selectedCliente.moneda_cuenta_corriente
                      )}
                    </p>
                  </div>
                  <div className={`border rounded-lg p-4 ${selectedCliente.saldo_cuenta_corriente > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                    <p className={`text-sm mb-1 ${selectedCliente.saldo_cuenta_corriente > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      Saldo Actual
                    </p>
                    <p className={`text-2xl font-bold ${selectedCliente.saldo_cuenta_corriente > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {formatCurrency(selectedCliente.saldo_cuenta_corriente, selectedCliente.moneda_cuenta_corriente)}
                    </p>
                  </div>
                </div>

                {/* Tabla de movimientos */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b">Historial de Movimientos</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                          <th className="text-left py-3 px-4">Fecha</th>
                          <th className="text-left py-3 px-4">Tipo</th>
                          <th className="text-left py-3 px-4">Documento</th>
                          <th className="text-left py-3 px-4">Concepto</th>
                          <th className="text-right py-3 px-4">Débito</th>
                          <th className="text-right py-3 px-4">Crédito</th>
                          <th className="text-right py-3 px-4">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosCC
                          .filter(m => m.cliente_id === selectedCliente.id)
                          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                          .map((mov) => (
                            <tr key={mov.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm">{formatDateTime(mov.fecha)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  mov.tipo === "debito" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                }`}>
                                  {mov.tipo === "debito" ? "Débito" : "Crédito"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm font-medium text-emerald-700">{mov.documento_numero}</span>
                                <span className="block text-xs text-gray-500 capitalize">{mov.documento_tipo.replace('_', ' ')}</span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{mov.concepto}</td>
                              <td className="py-3 px-4 text-sm text-right font-medium text-red-600">
                                {mov.tipo === "debito" ? formatCurrency(mov.importe, mov.moneda) : "-"}
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-medium text-green-600">
                                {mov.tipo === "credito" ? formatCurrency(mov.importe, mov.moneda) : "-"}
                              </td>
                              <td className="py-3 px-4 text-sm text-right font-bold">
                                {formatCurrency(mov.saldo_posterior, mov.moneda)}
                              </td>
                            </tr>
                          ))}
                        {movimientosCC.filter(m => m.cliente_id === selectedCliente.id).length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-gray-400">
                              No hay movimientos registrados para este cliente
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          {/* Seguimiento */}
          <SeguimientoPanel seguimiento={selectedCliente.seguimiento || []} />
          </div>
        </div>
        )}
      </div>
    )
  }

// Notas de Venta
  const renderNotasVenta = () => {
  if (creandoNV) {
    return renderCrearNV()
  }
  if (selectedNV) {
  return renderFormularioNV()
  }
  
  return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-emerald-900">Notas de Venta</h1>
          <button 
            onClick={() => { 
              setCreandoNV(true)
              setNvLineas([])
              setNvClienteId(null)
            }}
            className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva Nota de Venta
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="notas-venta"
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "borrador", label: "Borrador" },
                { value: "a_facturar", label: "A Facturar" },
                { value: "verificacion_factura", label: "Verif. Factura" },
                { value: "verificacion_oe", label: "Verif. OE" },
                { value: "finalizada", label: "Finalizada" },
                { value: "cancelada", label: "Cancelada" },
              ]},
              { field: "vendedor", label: "Vendedor", values: vendedores.map(v => ({ value: String(v.id), label: v.nombre })) },
            ]}
            groupByOptions={[
              { id: "estado", label: "Estado", field: "estado" },
              { id: "vendedor", label: "Vendedor", field: "vendedor" },
              { id: "cliente", label: "Cliente", field: "cliente" },
            ]}
            activeFilters={activeFiltersNV}
            activeGroupBy={activeGroupByNV}
            searchTerm={searchQuery}
            onFiltersChange={f => {
              setActiveFiltersNV(f)
              setEstadoFilter(f.find(x => x.field === "estado")?.value ?? "todos")
              setVendedorFilter(f.find(x => x.field === "vendedor") ? Number(f.find(x => x.field === "vendedor")!.value) : null)
            }}
            onGroupByChange={setActiveGroupByNV}
            onSearchChange={setSearchQuery}
            savedFilters={savedFiltersNV}
            {...makeSavedFilterHandlers(setSavedFiltersNV, setActiveFiltersNV, setActiveGroupByNV, setSearchQuery)}
            totalCount={notasVenta.length}
            filteredCount={notasVentaFiltradas.length}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Vendedor</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {notasVentaFiltradas.map(nv => (
                <tr 
                  key={nv.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedNV(nv)}
                >
                  <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{nv.numero}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatDateTime(nv.fecha)}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-sm">{nv.cliente_nombre}</p>
                      <p className="text-xs text-gray-500">{nv.cliente_codigo}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{nv.vendedor_nombre}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoNVColor(nv.estado)}`}>
                      {getEstadoNVLabel(nv.estado)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-sm font-medium">{nv.moneda}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(nv.total, nv.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {notasVentaFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron notas de venta
            </div>
          )}
        </div>
      </div>
    )
  }

  // Función para crear NV (usada desde previsualización)
  const handleCrearNVFinal = (tipoVenta: "inmediata" | "pedido") => {
    const cliente = clientes.find(c => c.id === nvClienteId)
    const lineasValidas = nvLineas.filter(l => l.producto_id > 0 && l.producto_nombre.trim() !== "")
    
    if (!cliente || lineasValidas.length === 0) {
      alert("Debe seleccionar un cliente y agregar al menos un producto válido")
      return
    }

    const lineasSinSerie = lineasValidas.filter(l => 
      l.requiere_serie && (!l.series_seleccionadas || l.series_seleccionadas.length < l.cantidad)
    )
    if (lineasSinSerie.length > 0) {
      alert(`Debe seleccionar IMEI/Serie para: ${lineasSinSerie.map(l => l.producto_nombre).join(", ")}`)
      return
    }

    const subtotalValido = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    const totalValido = subtotalValido * 1.21

    // Si estamos editando, usamos los datos existentes
    const existingNV = editingNVId ? notasVenta.find(nv => nv.id === editingNVId) : null
    const nvNumero = existingNV ? existingNV.numero : `NV X 10000-000${10737 + notasVenta.length}`
    const nvId = existingNV ? existingNV.id : notasVenta.length + 1
    const fechaHoy = existingNV ? existingNV.fecha : new Date().toISOString()
    const vendedorId = 1
    const vendedorNombre = vendedores[0]?.nombre || "Max Solina"
    const terminoPagoId = cliente.termino_pago_id || 1
    const terminoPagoNombre = mockTerminosPago.find(tp => tp.id === terminoPagoId)?.nombre || "Contado Efectivo"
    const deposito = "Puerto Norte"
    const moneda: "ARS" | "USD" = "ARS"

    const newNV: NotaVenta = {
      id: nvId,
      numero: nvNumero,
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre,
      cliente_codigo: cliente.codigo,
      vendedor_id: vendedorId,
      vendedor_nombre: vendedorNombre,
      fecha: fechaHoy,
      estado: tipoVenta === "inmediata" ? "finalizada" : "borrador",
      moneda: moneda,
      tipo_cotizacion: "blue",
      cotizacion_usd: 1050,
      termino_pago_id: terminoPagoId,
      termino_pago_nombre: terminoPagoNombre,
      deposito: deposito,
      sucursal: "Puerto Norte",
      lineas: lineasValidas.map(l => ({
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre,
        descripcion: l.descripcion || l.producto_nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        descuento: l.descuento,
        subtotal: l.subtotal,
        series: l.series_seleccionadas || []
      })),
      total_neto: subtotalValido,
      total_iva: subtotalValido * 0.21,
      total: totalValido,
      seguimiento: existingNV ? [
        ...existingNV.seguimiento || [],
        {
          id: (existingNV.seguimiento?.length || 0) + 1,
          fecha: new Date().toISOString(),
          usuario: vendedorNombre,
          tipo: "modificacion" as const,
          descripcion: `Nota de Venta modificada`
        }
      ] : [{
        id: 1,
        fecha: fechaHoy,
        usuario: vendedorNombre,
        tipo: "creacion" as const,
        descripcion: `Nota de Venta creada - ${tipoVenta === "inmediata" ? "Venta Inmediata" : "Pedido"}`
      }]
    }
    
    // Si estamos editando, actualizar; si no, agregar nueva
    if (editingNVId) {
      setNotasVenta(prev => prev.map(nv => nv.id === editingNVId ? newNV : nv))
    } else {
      setNotasVenta(prev => [...prev, newNV])
    }

    if (tipoVenta === "inmediata") {
      // Crear OE
      const oeNumero = `OE X 10000-000${100 + ordenesEntrega.length}`
      const oeId = ordenesEntrega.length + 1
      const newOE: OrdenEntrega = {
        id: oeId,
        numero: oeNumero,
        nota_venta_id: nvId,
        nota_venta_numero: nvNumero,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        fecha: fechaHoy,
        fecha_entrega_programada: fechaHoy,
        estado: "confirmada",
        tipo: "venta",
        deposito_origen: deposito,
        ubicacion_origen: "Stock",
        total_productos: lineasValidas.reduce((sum, l) => sum + l.cantidad, 0),
        productos_entregados: lineasValidas.reduce((sum, l) => sum + l.cantidad, 0),
        productos: lineasValidas.map(l => ({
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          cantidad: l.cantidad,
          entregado: l.cantidad,
          ubicacion: "Stock",
          series: l.series_seleccionadas || []
        })),
        seguimiento: [{ id: 1, fecha: fechaHoy, usuario: vendedorNombre, tipo: "creacion" as const, descripcion: "OE creada desde venta inmediata" }]
      }
      setOrdenesEntrega(prev => [...prev, newOE])

      // Crear Remito
      const remitoNumero = `REM X 10000-000${100 + remitos.length}`
      const remitoId = remitos.length + 1
      const newRemito: Remito = {
        id: remitoId,
        numero: remitoNumero,
        orden_entrega_id: oeId,
        orden_entrega_numero: oeNumero,
        nota_venta_numero: nvNumero,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        fecha: fechaHoy,
        estado: "confirmado",
        tipo: "salida",
        deposito: deposito,
        ubicacion: "Stock",
        total_bultos: 1,
        observaciones: "",
        productos: lineasValidas.map(l => ({
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          cantidad: l.cantidad,
          series: l.series_seleccionadas || []
        })),
        seguimiento: [{ id: 1, fecha: fechaHoy, usuario: vendedorNombre, tipo: "creacion" as const, descripcion: "Remito creado desde venta inmediata" }]
      }
      setRemitos(prev => [...prev, newRemito])

      // Crear Factura en borrador
      const facturaNumero = `FC X 10000-000${13460 + facturas.length}`
      const facturaId = facturas.length + 1
      const newFactura: Factura = {
        id: facturaId,
        numero: facturaNumero,
        tipo: cliente.posicion_fiscal === "consumidor_final" ? "B" : "A",
        nota_venta_id: nvId,
        nota_venta_numero: nvNumero,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        cliente_cuit: cliente.numero_documento,
        fecha: fechaHoy,
        fecha_vencimiento: fechaHoy,
        estado: "borrador",
        moneda: moneda,
        lineas: lineasValidas.map(l => ({
          producto_nombre: l.producto_nombre,
          descripcion: l.producto_nombre,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          descuento: l.descuento,
          subtotal: l.subtotal
        })),
        subtotal: subtotalValido,
        iva: subtotalValido * 0.21,
        total: totalValido,
        saldo_pendiente: totalValido,
        cae: null,
        cae_vencimiento: null,
        sucursal: "Puerto Norte",
        seguimiento: [{ id: 1, fecha: fechaHoy, usuario: vendedorNombre, tipo: "creacion" as const, descripcion: "Factura creada en borrador desde confirmación de NV" }]
      }
      setFacturas(prev => [...prev, newFactura])
    }

    // Limpiar y abrir la NV creada
    setCreandoNV(false)
    setNvPrevisualizando(false)
    setNvLineas([])
    setNvClienteId(null)
    setNvDepositoId(1)
    setNvUbicacionId(1)
    setEditingNVId(null)
    setSelectedNV(newNV)
  }

  // Vista de previsualización de NV
  const renderPrevisualizacionNV = () => {
    const selectedCliente = clientes.find(c => c.id === nvClienteId)
    const lineasValidas = nvLineas.filter(l => l.producto_id > 0 && l.producto_nombre.trim() !== "")
    const subtotal = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    const total = subtotal
    const deposito = depositosVenta.find(d => d.id === nvDepositoId)
    const ubicacion = ubicacionesVenta.find(u => u.id === nvUbicacionId)

    return (
      <div>
        {/* Header con breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Notas de Venta / <span className="text-gray-700">Nueva Nota de Venta</span>
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setNvPrevisualizando(false)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">Nueva Nota de Venta</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR')} | Puerto Norte</p>
          </div>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
            Borrador
          </span>
        </div>

        {/* Barra de acciones oscura */}
        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setNvPrevisualizando(false)}
              className="px-3 py-1.5 text-sm border border-gray-300 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Editar
            </button>
            <button 
              onClick={() => handleCrearNVFinal("pedido")}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar Pedido
            </button>
            <button 
              onClick={() => handleCrearNVFinal("inmediata")}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Confirmar Venta
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-b-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Datos del Cliente */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium">{selectedCliente?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Documento:</span>
                  <span className="ml-2 font-medium">{selectedCliente?.tipo_documento}: {selectedCliente?.numero_documento}</span>
                </div>
                <div>
                  <span className="text-gray-500">Categoría:</span>
                  <span className="ml-2 font-medium capitalize">{selectedCliente?.categoria}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pos. Fiscal:</span>
                  <span className="ml-2 font-medium capitalize">{selectedCliente?.posicion_fiscal?.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium text-emerald-600">{selectedCliente?.telefono || selectedCliente?.celular || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium text-emerald-600">{selectedCliente?.email || "-"}</span>
                </div>
              </div>
            </div>

            {/* Datos de la Venta */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos de la Venta</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Depósito:</span>
                  <span className="ml-2 font-medium">{deposito?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Ubicación:</span>
                  <span className="ml-2 font-medium">{ubicacion?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Sucursal:</span>
                  <span className="ml-2 font-medium">Puerto Norte</span>
                </div>
                <div>
                  <span className="text-gray-500">Vendedor:</span>
                  <span className="ml-2 font-medium">Max Solina</span>
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Productos ({lineasValidas.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-center py-2 w-20">Cant.</th>
                  <th className="text-right py-2 w-28">Precio</th>
                  <th className="text-center py-2 w-16">Dto.%</th>
                  <th className="text-right py-2 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineasValidas.map((linea, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{linea.producto_nombre}</div>
                      {linea.series_seleccionadas && linea.series_seleccionadas.length > 0 && (
                        <div className="text-xs text-gray-500">IMEI: {linea.series_seleccionadas.join(", ")}</div>
                      )}
                    </td>
                    <td className="py-2 text-center">{linea.cantidad}</td>
                    <td className="py-2 text-right">{formatCurrency(linea.precio_unitario)}</td>
                    <td className="py-2 text-center">{linea.descuento}%</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(linea.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-emerald-700">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de Crear Nota de Venta (pantalla completa, no modal)
  const renderCrearNV = () => {
    const selectedCliente = clientes.find(c => c.id === nvClienteId)
  const subtotal = nvLineas.reduce((sum, l) => sum + l.subtotal, 0)
  const total = subtotal
  
  // Si estamos en previsualización, mostrar vista previa
    if (nvPrevisualizando) {
      return renderPrevisualizacionNV()
    }

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoNV(false)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">{editingNVId ? "Editar Nota de Venta" : "Nueva Nota de Venta"}</h1>
            <p className="text-sm text-gray-500">{editingNVId ? "Modifique los datos de la nota de venta" : "Complete los datos para crear la nota de venta"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Columna izquierda - Datos principales */}
          <div className="col-span-2 space-y-6">
            {/* Datos del cliente */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Datos del Cliente
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select
                    value={nvClienteId || ""}
                    onChange={(e) => {
                      if (e.target.value === "__nuevo__") {
                        setEditingItem(null)
                        setFormClienteCategoriaId(null)
                        setModalType("cliente")
                        setShowModal(true)
                      } else {
                        const id = parseInt(e.target.value)
                        setNvClienteId(id)
                        // Auto-seleccionar la lista de precios del cliente
                        const cliente = clientes.find(c => c.id === id)
                        if (cliente?.lista_precios_id) setNvListaPreciosId(cliente.lista_precios_id)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                    <option value="__nuevo__" className="text-emerald-600 font-medium">+ Crear nuevo cliente</option>
                  </select>
                </div>
                {selectedCliente && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">Documento</span>
                      <p className="font-medium">{selectedCliente.tipo_documento}: {selectedCliente.numero_documento}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Posición Fiscal</span>
                      <p className="font-medium capitalize">{selectedCliente.posicion_fiscal.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Dirección</span>
                      <p className="font-medium">{selectedCliente.direccion}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Teléfono</span>
                      <p className="font-medium">{selectedCliente.telefono || selectedCliente.celular || "-"}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lista de Precios */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Lista de Precios
              </h3>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lista de precios *</label>
                  <select
                    value={nvListaPreciosId ?? ""}
                    onChange={(e) => setNvListaPreciosId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar lista...</option>
                    {listasPrecios.filter(l => l.activa || l.estado === "activa" || l.estado === "creada" || l.estado === "confirmada").map(l => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-500">
                  {nvListaPreciosId && (
                    <span>
                      {productosNVCargando
                        ? "Cargando productos..."
                        : `${productosNV.length} producto${productosNV.length !== 1 ? "s" : ""} en esta lista`
                      }
                    </span>
                  )}
                  {!nvListaPreciosId && (
                    <span className="text-amber-600">Seleccione una lista para agregar productos</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ubicación de Stock */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Warehouse className="w-4 h-4" /> Ubicación de Stock
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Depósito</label>
                  <select
                    value={nvDepositoId}
                    onChange={(e) => {
                      const newDepositoId = parseInt(e.target.value)
                      setNvDepositoId(newDepositoId)
                      // Seleccionar automáticamente la ubicación "Stock" del depósito
                      const ubicacionStock = ubicacionesVenta.find(u => u.deposito_id === newDepositoId && u.nombre === "Stock")
                      if (ubicacionStock) {
                        setNvUbicacionId(ubicacionStock.id)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {depositosVenta.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <select
                    value={nvUbicacionId}
                    onChange={(e) => setNvUbicacionId(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ubicacionesVenta
                      .filter(u => u.deposito_id === nvDepositoId && u.disponible_venta)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                El stock se descontará de: <span className="font-medium">{ubicacionesVenta.find(u => u.id === nvUbicacionId)?.codigo || "-"}</span>
              </p>
            </div>

            {/* Líneas de productos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Productos
                </h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-1.5 px-2">Producto</th>
                    <th className="text-center py-1.5 px-2 w-10">Cant.</th>
                    <th className="text-right py-1.5 px-2 w-28">Precio USD</th>
                    <th className="text-right py-1.5 px-2 w-32">Precio ARS</th>
                    <th className="text-center py-1.5 px-2 w-16">Dto.%</th>
                    <th className="text-right py-1.5 px-2 w-28">Subtotal</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {nvLineas.map((linea, index) => (
                    <tr key={linea.id} className="border-b">
                      <td className="py-1 px-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                ref={(el) => { productoInputRefs.current[index] = el }}
                                type="text"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                name={`producto-search-${index}`}
                                value={productoSearchIndex === index ? productoSearchText : linea.producto_nombre}
                                onChange={(e) => {
                                  setProductoSearchIndex(index)
                                  setProductoSearchText(e.target.value)
                                  const updated = [...nvLineas]
                                  updated[index].producto_nombre = e.target.value
                                  setNvLineas(updated)
                                }}
                                onFocus={() => {
                                  setProductoSearchIndex(index)
                                  setProductoSearchText(linea.producto_nombre)
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    setProductoSearchIndex(null)
                                    setProductoSearchText("")
                                  }, 200)
                                }}
                                placeholder="Buscar producto..."
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              {/* --- Dropdown productos por lista de precios del cliente --- */}
                              {productoSearchIndex === index
                                ? <ProductoDropdown
                                    nvClienteId={nvClienteId}
                                    nvListaPreciosId={nvListaPreciosId}
                                    clientes={clientes}
                                    listasPrecios={listasPrecios}
                                    versionesLista={versionesLista}
                                    productosConSerie={nvListaPreciosId ? productosNV : productosMaestro}
                                    productoSearchText={productoSearchText}
                                    anchorRef={{ current: productoInputRefs.current[index] } as React.RefObject<HTMLInputElement>}
                                    onSelect={(p, precioUnitario, moneda, precioUSD, precioARS) => {
                                      const updated = [...nvLineas]
                                      updated[index].producto_id = p.id
                                      updated[index].producto_nombre = p.nombre
                                      updated[index].producto_sku = p.sku
                                      updated[index].requiere_serie = p.requiere_serie
                                      updated[index].series_seleccionadas = []
                                      updated[index].precio_unitario = precioUnitario
                                      updated[index].precio_unitario_moneda = moneda
                                      updated[index].precio_unitario_usd = precioUSD
                                      updated[index].precio_unitario_ars = precioARS
                                      updated[index].subtotal = updated[index].cantidad * precioUnitario * (1 - updated[index].descuento / 100)
                                      setNvLineas(updated)
                                      setProductoSearchIndex(null)
                                      setProductoSearchText("")
                                      if (p.requiere_serie) {
                                        setTimeout(() => abrirModalSerie(index, []), 100)
                                      }
                                    }}
                                  />
                                : null
                              }
                            </div>
                            {linea.requiere_serie && linea.producto_id > 0 && (
                              <button
                                type="button"
                                onClick={() => abrirModalSerie(index, linea.series_seleccionadas?.map(s => s.id) || [])}
                                className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
                                  (linea.series_seleccionadas?.length || 0) === linea.cantidad 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {linea.series_seleccionadas?.length || 0}/{linea.cantidad} IMEI
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          value={linea.cantidad}
                          min="1"
                          onChange={(e) => {
                            const updated = [...nvLineas]
                            const newCantidad = parseInt(e.target.value) || 1
                            updated[index].cantidad = newCantidad
                            updated[index].subtotal = newCantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            if (updated[index].series_seleccionadas && updated[index].series_seleccionadas.length > newCantidad) {
                              updated[index].series_seleccionadas = updated[index].series_seleccionadas.slice(0, newCantidad)
                            }
                            setNvLineas(updated)
                            if (updated[index].requiere_serie && (updated[index].series_seleccionadas?.length || 0) < newCantidad) {
                              abrirModalSerie(index, updated[index].series_seleccionadas?.map(s => s.id) || [])
                            }
                          }}
                          className="w-10 border border-gray-300 rounded px-1 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="py-1 px-2 text-right text-sm text-blue-700 font-medium">
                        {linea.precio_unitario_usd > 0
                          ? `US$ ${linea.precio_unitario_usd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : <span className="text-gray-300">-</span>
                        }
                      </td>
                      <td className="py-1 px-2 text-right text-sm font-medium">
                        {linea.precio_unitario_ars > 0 ? (
                          <span className={linea.precio_unitario_moneda === "ARS" ? "text-amber-700" : "text-gray-700"}>
                            ARS $ {linea.precio_unitario_ars.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <input
                          type="number"
                          value={linea.descuento}
                          min="0"
                          max="100"
                          step="0.01"
                          onChange={(e) => {
                            const updated = [...nvLineas]
                            updated[index].descuento = parseFloat(e.target.value) || 0
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setNvLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="py-1 px-2 text-right font-medium text-sm">
                        {formatCurrency(linea.subtotal)}
                      </td>
                      <td className="py-1 px-1">
                        <button
                          type="button"
                          onClick={() => setNvLineas(nvLineas.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {nvLineas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-gray-400 text-sm">
                        No hay productos agregados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
              {/* Boton agregar producto al final */}
              <div className="px-2 py-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    const newLinea: LineaNV = {
                      id: nvLineas.length + 1,
                      producto_id: 0,
                      producto_nombre: "",
                      producto_sku: "",
                      cantidad: 1,
                      precio_unitario: 0,
                      precio_unitario_moneda: "ARS",
                      precio_unitario_usd: 0,
                      precio_unitario_ars: 0,
                      descuento: 0,
                      subtotal: 0,
                      fecha_entrega: new Date().toISOString().split('T')[0],
                      ubicacion_id: nvUbicacionId
                    }
                    setNvLineas([...nvLineas, newLinea])
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar producto
                </button>
              </div>
            </div>

            {/* Sección Lotes y Series - Solo aparece si hay productos con serie */}
            {nvLineas.some(l => l.requiere_serie && l.series_seleccionadas && l.series_seleccionadas.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-semibold text-gray-900 text-sm">Lotes y Series</h3>
                </div>
                <div className="p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b">
                        <th className="text-left py-1.5 px-2">Producto</th>
                        <th className="text-left py-1.5 px-2">IMEI / Serie</th>
                        <th className="text-left py-1.5 px-2">Detalle</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {nvLineas
                        .filter(l => l.requiere_serie && l.series_seleccionadas && l.series_seleccionadas.length > 0)
                        .flatMap((linea, lineaIdx) => 
                          linea.series_seleccionadas!.map((serie, serieIdx) => (
                            <tr key={`${lineaIdx}-${serie.id}`} className="border-b border-gray-100 last:border-0">
                              <td className="py-1.5 px-2 text-gray-700">
                                {serieIdx === 0 ? linea.producto_nombre : ""}
                              </td>
                              <td className="py-1.5 px-2 font-mono text-gray-900">{serie.serie}</td>
                              <td className="py-1.5 px-2 text-gray-500">{serie.detalles}</td>
                              <td className="py-1.5 px-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...nvLineas]
                                    const idx = updated.findIndex(l => l.id === linea.id)
                                    if (idx !== -1) {
                                      updated[idx].series_seleccionadas = updated[idx].series_seleccionadas?.filter(s => s.id !== serie.id)
                                      setNvLineas(updated)
                                    }
                                  }}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha - Resumen y acciones */}
          <div className="space-y-4">
            {/* Categoría de Cliente y Lista de Precios */}
            {(() => {
              const clienteNV = clientes.find(c => c.id === nvClienteId)
              const categoriaNV = clienteNV ? categoriasCliente.find(cat => cat.nombre.toLowerCase() === clienteNV.categoria.toLowerCase()) : null
              const listaNV = clienteNV ? listasPrecios.find(l => l.id === clienteNV.lista_precios_id) : null
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Configuración de Venta</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Categoría de Cliente</label>
                      {clienteNV ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {categoriaNV?.nombre || clienteNV.categoria}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Seleccione un cliente</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Lista de Precios por Defecto</label>
                      {clienteNV ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {listaNV?.nombre || "Sin asignar"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Seleccione un cliente</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Resumen */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Resumen</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-emerald-700">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-3">
                <button
                  onClick={() => setNvPrevisualizando(true)}
                  disabled={!nvClienteId || nvLineas.length === 0}
                  className="w-full bg-emerald-700 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
                <button
                  onClick={() => { setCreandoNV(false); setNvLineas([]); setNvClienteId(null); setNvDepositoId(1); setNvUbicacionId(1); setEditingNVId(null); setNvPrevisualizando(false) }}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Formulario de Nota de Venta
  const renderFormularioNV = () => {
    if (!selectedNV) return null

    // Buscar documentos relacionados
    const oesVinculadas = ordenesEntrega.filter(oe => oe.nota_venta_id === selectedNV.id)
    const remitosVinculados = remitos.filter(r => r.nota_venta_numero === selectedNV.numero)
    const facturasVinculadas = facturas.filter(f => f.nota_venta_id === selectedNV.id)
    const recibosVinculados = recibos.filter(r => r.nota_venta_numero === selectedNV.numero)

    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => setSelectedNV(null)} className="hover:text-emerald-700">Notas de Venta</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{selectedNV.numero}</span>
        </div>

        {/* Header con botones */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
<BotonVolver onClick={() => setSelectedNV(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{selectedNV.numero}</h1>
              <p className="text-sm text-gray-500">{formatDateTime(selectedNV.fecha)} | {selectedNV.sucursal}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  // Cargar datos de la NV en el formulario
                  setNvClienteId(selectedNV.cliente_id)
                  setNvLineas(selectedNV.lineas.map((l, idx) => ({
                    id: idx + 1,
                    producto_id: l.producto_id || 0,
                    producto_nombre: l.producto_nombre,
                    descripcion: l.descripcion || "",
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario,
                    descuento: l.descuento,
                    subtotal: l.subtotal,
                    requiere_serie: false,
                    series_disponibles: [],
                    series_seleccionadas: l.series || []
                  })))
                  setNvDepositoId(1)
                  setNvUbicacionId(1)
                  setEditingNVId(selectedNV.id)
                  setCreandoNV(true)
                  setSelectedNV(null)
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                selectedNV.estado === "finalizada" ? "bg-green-100 text-green-700" : 
                selectedNV.estado === "borrador" ? "bg-amber-100 text-amber-700" : 
                "bg-gray-100 text-gray-700"
              }`}>
                {selectedNV.estado === "finalizada" ? "Finalizada" : selectedNV.estado === "borrador" ? "Borrador" : selectedNV.estado}
              </span>
            </div>
        </div>

        {/* Barra de acciones y estado */}
        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
            {facturasVinculadas.length > 0 && (
              <button 
                onClick={() => { 
                  setActiveView("facturas")
                  setSelectedFactura(facturasVinculadas[0])
                  setSelectedNV(null)
                }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ver factura ({facturasVinculadas.length})
              </button>
            )}
            {remitosVinculados.length > 0 && (
              <button 
                onClick={() => { 
                  setSelectedNV(null)
                  setSelectedRemito(remitosVinculados[0])
                  setActiveView("remitos") 
                }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ver remitos ({remitosVinculados.length})
              </button>
            )}
            {oesVinculadas.length > 0 && (
              <button 
                onClick={() => { 
                  setActiveView("ordenes_entrega")
                  setSelectedOE(oesVinculadas[0])
                  setSelectedNV(null)
                }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ver Ord. de Entrega ({oesVinculadas.length})
              </button>
            )}
          </div>
          
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-6">
            {/* Encabezado */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Datos de la Venta</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="text-gray-500 block">Cliente</label>
                  <p className="font-medium">{selectedNV.cliente_nombre}</p>
                  <p className="text-xs text-gray-500">{selectedNV.cliente_codigo}</p>
                </div>
                <div>
                  <label className="text-gray-500 block">Vendedor</label>
                  <p className="font-medium">{selectedNV.vendedor_nombre}</p>
                </div>
                <div>
                  <label className="text-gray-500 block">Tipo de Venta</label>
                  <p className="font-medium capitalize">{selectedNV.tipo_venta}</p>
                </div>
                <div>
                  <label className="text-gray-500 block">Lista de Precios</label>
                  <p className="font-medium">{listasPrecios.find(l => l.id === selectedNV.lista_precios_id)?.nombre}</p>
                </div>
                <div>
                  <label className="text-gray-500 block">Término de Pago</label>
                  <p className="font-medium">{selectedNV.termino_pago_nombre}</p>
                </div>
                <div>
                  <label className="text-gray-500 block">Depósito</label>
                  <p className="font-medium">{selectedNV.deposito}</p>
                </div>
              </div>
            </div>

            {/* Líneas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Líneas de Productos</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Cantidad</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Precio Unit.</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Dto.</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedNV.lineas.map((linea, idx) => (
                    <tr key={`${linea.id}-${idx}`} className="border-b border-gray-100">
                      <td className="py-3">
                        <p className="font-medium">{linea.producto_nombre}</p>
                        <p className="text-xs text-gray-500">{linea.producto_sku}</p>
                      </td>
                      <td className="py-3 text-right">{linea.cantidad}</td>
                      <td className="py-3 text-right">{formatCurrency(linea.precio_unitario, selectedNV.moneda)}</td>
                      <td className="py-3 text-right">{linea.descuento}%</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(linea.subtotal, selectedNV.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Totales */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Totales</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span>{formatCurrency(selectedNV.subtotal, selectedNV.moneda)}</span>
                </div>
                {selectedNV.descuento_global > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento ({selectedNV.descuento_global}%):</span>
                    <span>-{formatCurrency(selectedNV.subtotal * selectedNV.descuento_global / 100, selectedNV.moneda)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Impuestos:</span>
                  <span>{formatCurrency(selectedNV.impuestos, selectedNV.moneda)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-200 text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-emerald-700">{formatCurrency(selectedNV.total, selectedNV.moneda)}</span>
                </div>
              </div>
            </div>

            {/* Moneda */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Moneda</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Moneda:</span>
                  <span className="font-medium">{selectedNV.moneda}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo Cotización:</span>
                  <span className="capitalize">{selectedNV.tipo_cotizacion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cotización:</span>
                  <span>{formatCurrency(selectedNV.cotizacion)}</span>
                </div>
                {selectedNV.moneda === "USD" && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-500">Equivalente ARS:</span>
                    <span className="font-medium">{formatCurrency(selectedNV.total * selectedNV.cotizacion)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seguimiento */}
          <SeguimientoPanel seguimiento={selectedNV.seguimiento || []} />
        </div>
      </div>
    )
  }

  // Ficha de Orden de Entrega (vista detallada)
  const renderFichaOE = () => {
    if (!selectedOE) return null

    const nvVinculada = notasVenta.find(nv => nv.id === selectedOE.nota_venta_id)
    const clienteOE = clientes.find(c => c.id === selectedOE.cliente_id)
    const remitoVinculado = remitos.find(r => r.orden_entrega_id === selectedOE.id)

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedOE(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{selectedOE.numero}</h1>
              <p className="text-sm text-gray-500">Orden de Entrega</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              remitoVinculado ? 'bg-green-100 text-green-700' : getEstadoOEColor(selectedOE.estado)
            }`}>
              {remitoVinculado ? 'Finalizada' : getEstadoOELabel(selectedOE.estado)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="col-span-2 space-y-6">
            {/* Documentos vinculados */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Documentos Vinculados</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Nota de Venta */}
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Nota de Venta</span>
                  </div>
                  {nvVinculada ? (
                    <>
                      <p className="font-mono text-lg font-bold text-blue-700">{nvVinculada.numero}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {formatDate(nvVinculada.fecha)} - {formatCurrency(nvVinculada.total, nvVinculada.moneda)}
                      </p>
                      <button 
                        onClick={() => { setSelectedOE(null); setSelectedNV(nvVinculada); setActiveView("notas_venta") }}
                        className="mt-2 text-xs text-blue-700 hover:underline"
                      >
                        Ver Nota de Venta
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">-</p>
                  )}
                </div>

                {/* Remito */}
                <div className={`border rounded-lg p-4 ${remitoVinculado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-green-600" />
                    <span className={`text-sm font-medium ${remitoVinculado ? 'text-green-800' : 'text-gray-500'}`}>Remito</span>
                  </div>
                  {remitoVinculado ? (
                    <>
                      <p className="font-mono text-lg font-bold text-green-700">{remitoVinculado.numero}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {formatDate(remitoVinculado.fecha)} - {remitoVinculado.estado}
                      </p>
                      <button 
                        onClick={() => { setSelectedOE(null); setActiveView("remitos") }}
                        className="mt-2 text-xs text-green-700 hover:underline"
                      >
                        Ver Remito
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400">Sin remito generado</p>
                      <button 
                        onClick={() => { /* TODO: Crear remito desde OE */ }}
                        className="mt-2 text-xs text-emerald-700 hover:underline font-medium"
                      >
                        + Generar Remito
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
              {clienteOE && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Nombre</span>
                    <span className="font-medium">{clienteOE.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Documento</span>
                    <span className="font-medium">{clienteOE.tipo_documento}: {clienteOE.numero_documento}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Telefono</span>
                    <span className="font-medium">{clienteOE.telefono || clienteOE.celular || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Email</span>
                    <span className="font-medium">{clienteOE.email || "-"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Productos a entregar */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">Productos a Entregar</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-center py-3 px-4">Cantidad</th>
                    <th className="text-center py-3 px-4">Reserva</th>
                    <th className="text-center py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOE.productos.map((prod, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-3 px-4 font-medium">{prod.producto_nombre}</td>
                      <td className="py-3 px-4 text-center">{prod.cantidad}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={prod.reserva >= prod.cantidad ? 'text-green-600 font-medium' : 'text-amber-600'}>
                          {prod.reserva}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          prod.estado === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {prod.estado === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Info de entrega */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Datos de Entrega</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Fecha de Entrega</span>
                  <span className="font-medium">{formatDate(selectedOE.fecha_entrega)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Domicilio de Envio</span>
                  <span className="font-medium">{selectedOE.domicilio_envio}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Deposito</span>
                  <span className="font-medium">{selectedOE.deposito}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Sucursal</span>
                  <span className="font-medium">{selectedOE.sucursal}</span>
                </div>
              </div>
            </div>

            {/* Acciones - solo mostrar si no hay remito vinculado */}
            {!remitoVinculado ? (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
              <div className="space-y-2">
                {selectedOE.estado === 'disponible' && (
                  <button
                    onClick={() => {
                      setOrdenesEntrega(prev => prev.map(oe => 
                        oe.id === selectedOE.id ? { ...oe, estado: 'confirmada' as const } : oe
                      ))
                      setSelectedOE({ ...selectedOE, estado: 'confirmada' })
                    }}
                    className="w-full bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800"
                  >
                    Confirmar Reserva
                  </button>
                )}
                {selectedOE.estado === 'confirmada' && (
                  <button
                    onClick={() => {
                      // Generar remito automáticamente
                      const remitoNumero = `R X 10000-000${5035 + remitos.length}`
                      const newRemito: Remito = {
                        id: remitos.length + 1,
                        numero: remitoNumero,
                        orden_entrega_id: selectedOE.id,
                        orden_entrega_numero: selectedOE.numero,
                        cliente_id: selectedOE.cliente_id,
                        cliente_nombre: selectedOE.cliente_nombre,
                        estado: "borrador",
                        fecha: new Date().toISOString(),
                        fecha_entrega: selectedOE.fecha_entrega,
                        domicilio_envio: selectedOE.domicilio_envio,
                        transporte: "",
                        chofer: "",
                        factura_numero: null,
                        nota_venta_numero: selectedOE.nota_venta_numero,
                        sucursal: selectedOE.sucursal,
                        deposito: selectedOE.deposito,
                        peso_kg: 0,
                        peso_neto_kg: 0,
                        bultos: 1,
                        valor_declarado: 0,
                        control_factura: "sin_facturar"
                      }
                      setRemitos(prev => [...prev, newRemito])
                      setOrdenesEntrega(prev => prev.map(oe =>
                        oe.id === selectedOE.id ? { ...oe, remito_numero: remitoNumero } : oe
                      ))
                      setSelectedOE({ ...selectedOE, remito_numero: remitoNumero })
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Generar Remito
                  </button>
                )}
                <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
                  Imprimir OE
                </button>
              </div>
            </div>
            ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Orden de Entrega Finalizada</span>
              </div>
              <p className="text-sm text-green-600 mt-1">Esta OE ya tiene remito generado.</p>
            </div>
            )}

            {/* Seguimiento */}
            <SeguimientoPanel 
              seguimiento={selectedOE.seguimiento || []}
            />
          </div>
        </div>
      </div>
    )
  }

  // Vista de Crear Orden de Entrega
  const renderCrearOE = () => {
    const nvSeleccionada = notasVenta.find(nv => nv.id === oeNvId)
    const clienteNV = nvSeleccionada ? clientes.find(c => c.id === nvSeleccionada.cliente_id) : null

    const handleCrearOE = () => {
      if (!nvSeleccionada || !clienteNV) {
        alert("Debe seleccionar una Nota de Venta")
        return
      }

      const oeNumero = `OE X 10000-000${1050 + ordenesEntrega.length}`
      const oeId = ordenesEntrega.length + 1
      const fechaHoy = new Date().toISOString()

      const newOE: OrdenEntrega = {
        id: oeId,
        numero: oeNumero,
        nota_venta_id: nvSeleccionada.id,
        nota_venta_numero: nvSeleccionada.numero,
        cliente_id: clienteNV.id,
        cliente_nombre: clienteNV.nombre,
        estado: "disponible",
        fecha_creacion: fechaHoy,
        fecha_entrega: fechaHoy,
        domicilio_envio: clienteNV.direccion,
        deposito: nvSeleccionada.deposito,
        sucursal: "Puerto Norte",
        remito_numero: null,
        productos: nvSeleccionada.lineas.map(l => ({
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          cantidad: l.cantidad,
          reserva: l.cantidad,
          estado: "confirmado" as const
        }))
      }
      setOrdenesEntrega(prev => [...prev, newOE])
      setCreandoOE(false)
      setOeNvId(null)
    }

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => { setCreandoOE(false); setOeNvId(null) }} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Nueva Orden de Entrega</h1>
            <p className="text-sm text-gray-500">Seleccione una Nota de Venta para generar la OE</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Seleccionar Nota de Venta</h3>
              <select
                value={oeNvId || ""}
                onChange={(e) => setOeNvId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar NV...</option>
                {notasVenta.filter(nv => nv.estado !== "cancelada" && nv.estado !== "finalizada").map(nv => (
                  <option key={nv.id} value={nv.id}>{nv.numero} - {nv.cliente_nombre}</option>
                ))}
              </select>
            </div>

            {nvSeleccionada && clienteNV && (
              <>
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{clienteNV.nombre}</span></div>
                    <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{clienteNV.tipo_documento}: {clienteNV.numero_documento}</span></div>
                    <div><span className="text-gray-500">Direccion:</span> <span className="font-medium">{clienteNV.direccion}</span></div>
                    <div><span className="text-gray-500">Telefono:</span> <span className="font-medium">{clienteNV.telefono || clienteNV.celular || "-"}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-900">Productos a Entregar</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2 px-4">Producto</th>
                        <th className="text-center py-2 px-4">Cantidad</th>
                        <th className="text-center py-2 px-4">Reserva</th>
                        <th className="text-center py-2 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nvSeleccionada.lineas.map((linea, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-3 px-4 font-medium">{linea.producto_nombre}</td>
                          <td className="py-3 px-4 text-center">{linea.cantidad}</td>
                          <td className="py-3 px-4 text-center text-green-600">{linea.cantidad}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Disponible</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
              <div className="space-y-3">
                <button
                  onClick={handleCrearOE}
                  disabled={!oeNvId}
                  className="w-full bg-emerald-700 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Crear Orden de Entrega
                </button>
                <button
                  onClick={() => { setCreandoOE(false); setOeNvId(null) }}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Toma de Equipo en Parte de Pago
  const modelosEquipo = [
    { id: 1, nombre: "iPhone 13 Pro 128GB", precioBase: 350000 },
    { id: 2, nombre: "iPhone 13 128GB", precioBase: 280000 },
    { id: 3, nombre: "iPhone 12 64GB", precioBase: 200000 },
    { id: 4, nombre: "Samsung Galaxy S22 128GB", precioBase: 320000 },
    { id: 5, nombre: "Samsung Galaxy A54 128GB", precioBase: 180000 },
    { id: 6, nombre: "Motorola Edge 40 256GB", precioBase: 220000 },
  ]

  const componentesEvaluacion = [
    { id: 1, nombre: "Pantalla", tipo: "dropdown", estados: [
      { estado: "Buena", descuento: 0 },
      { estado: "Rayada leve", descuento: 15000 },
      { estado: "Rayada grave", descuento: 40000 },
      { estado: "Rota", descuento: 80000 },
    ]},
    { id: 2, nombre: "Batería", tipo: "dropdown", estados: [
      { estado: "Buena (80%+)", descuento: 0 },
      { estado: "Desgastada (60-80%)", descuento: 25000 },
      { estado: "Mala (<60%)", descuento: 45000 },
    ]},
    { id: 3, nombre: "Cámara Trasera", tipo: "dropdown", estados: [
      { estado: "Funciona correctamente", descuento: 0 },
      { estado: "Falla menor", descuento: 20000 },
      { estado: "No funciona", descuento: 50000 },
    ]},
    { id: 4, nombre: "Cámara Frontal", tipo: "dropdown", estados: [
      { estado: "Funciona correctamente", descuento: 0 },
      { estado: "No funciona", descuento: 30000 },
    ]},
    { id: 5, nombre: "Carcasa", tipo: "dropdown", estados: [
      { estado: "Buena", descuento: 0 },
      { estado: "Rayada", descuento: 20000 },
      { estado: "Golpeada", descuento: 35000 },
    ]},
    { id: 6, nombre: "Botones", tipo: "checkbox", estados: [
      { estado: "Funcionan", descuento: 0 },
      { estado: "Alguno falla", descuento: 15000 },
    ]},
    { id: 7, nombre: "Altavoz", tipo: "checkbox", estados: [
      { estado: "Funciona", descuento: 0 },
      { estado: "Falla", descuento: 20000 },
    ]},
    { id: 8, nombre: "Micrófono", tipo: "checkbox", estados: [
      { estado: "Funciona", descuento: 0 },
      { estado: "Falla", descuento: 20000 },
    ]},
  ]

  const calcularDescuentosCombinados = (descuentos: number[]) => {
    // Lógica decreciente: a más daños, menor descuento proporcional por item
    const total = descuentos.reduce((sum, d) => sum + d, 0)
    const cantidadDanos = descuentos.filter(d => d > 0).length
    if (cantidadDanos <= 1) return total
    if (cantidadDanos === 2) return Math.round(total * 0.9) // 10% menos
    if (cantidadDanos === 3) return Math.round(total * 0.8) // 20% menos
    return Math.round(total * 0.7) // 30% menos para 4+ daños
  }

  const renderFichaTomaEquipo = () => {
    if (!selectedToma) return null
    const fechaObj = new Date(selectedToma.fecha)
    const fechaHora = fechaObj.toLocaleDateString('es-AR') + ' ' + fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const operacionEnCurso = selectedToma.estado_recepcion !== 'recibido'

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedToma(null)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedToma.numero}</h1>
            <p className="text-sm text-gray-500">{fechaHora}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              operacionEnCurso ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {operacionEnCurso ? 'Operación en curso' : 'Operación finalizada'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedToma.estado === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {selectedToma.estado.charAt(0).toUpperCase() + selectedToma.estado.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Datos de la operación */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos de la Operación</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Número</span><span className="font-medium">{selectedToma.numero}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fecha y Hora</span><span className="font-medium">{fechaHora}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="font-medium">{selectedToma.cliente_nombre}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Equipo</span><span className="font-medium">{selectedToma.modelo_equipo}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Precio Base</span><span className="font-medium">{formatCurrency(selectedToma.precio_base)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Descuentos</span><span className="font-medium text-red-600">-{formatCurrency(selectedToma.descuentos)}</span></div>
              <div className="flex justify-between border-t pt-3"><span className="text-gray-700 font-semibold">Precio Final Acordado</span><span className="font-bold text-emerald-600 text-base">{formatCurrency(selectedToma.precio_final)}</span></div>
            </div>
          </div>

          {/* Evaluación de componentes */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Evaluación del Equipo</h3>
            <div className="space-y-2">
              {selectedToma.evaluacion.map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{ev.componente}</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ['Buena', 'Excelente', 'Funciona', 'Funcionan', 'Funciona correctamente'].includes(ev.estado) ? 'bg-green-100 text-green-700' :
                      ['Desgastada', 'Regular', 'Rayada'].includes(ev.estado) ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{ev.estado}</span>
                    {ev.descuento > 0 && <span className="text-red-600 text-xs">-{formatCurrency(ev.descuento)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Nota de Crédito generada */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Nota de Crédito Generada
            </h3>
            {selectedToma.nota_credito_numero ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Número</span>
                  <button
                    onClick={() => {
                      const nc = ajustes.find(a => a.numero === selectedToma.nota_credito_numero)
                      if (nc) setNcDetallePopup(nc)
                    }}
                    className="font-medium text-emerald-700 hover:underline hover:text-emerald-900 cursor-pointer"
                  >
                    {selectedToma.nota_credito_numero}
                  </button>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Concepto</span><span className="font-medium">Toma de equipo: {selectedToma.modelo_equipo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Importe</span><span className="font-bold text-emerald-600">{formatCurrency(selectedToma.precio_final)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Estado</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Publicada</span>
                </div>
                <p className="text-xs text-gray-400 pt-2 border-t">Este crédito fue acreditado en la cuenta corriente del cliente.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin nota de crédito generada</p>
            )}
          </div>

          {/* Recepción de Compra generada */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Recepción de Compra
            </h3>
            {selectedToma.recepcion_numero ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Número</span><span className="font-medium text-blue-700">{selectedToma.recepcion_numero}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Equipo</span><span className="font-medium">{selectedToma.modelo_equipo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Valor acordado</span><span className="font-medium">{formatCurrency(selectedToma.precio_final)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Estado</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedToma.estado_recepcion === 'recibido' ? 'bg-green-100 text-green-700' :
                    selectedToma.estado_recepcion === 'cancelado' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedToma.estado_recepcion === 'recibido' ? 'Recibido' :
                     selectedToma.estado_recepcion === 'cancelado' ? 'Cancelado' : 'Esperando recepción'}
                  </span>
                </div>
                {selectedToma.estado_recepcion === 'pendiente' && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-amber-600 mb-3">El equipo aun no fue recibido fisicamente. Confirma la recepcion una vez que el equipo ingrese al deposito.</p>
                    <button
                      onClick={() => {
                        setTomasEquipo(prev => prev.map(t =>
                          t.id === selectedToma.id ? { ...t, estado_recepcion: 'recibido' as const } : t
                        ))
                        setSelectedToma(prev => prev ? { ...prev, estado_recepcion: 'recibido' as const } : prev)
                      }}
                      className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                    >
                      Confirmar recepcion del equipo
                    </button>
                  </div>
                )}
                {selectedToma.estado_recepcion === 'recibido' && (
                  <p className="text-xs text-green-600 pt-2 border-t">Equipo recibido fisicamente en deposito.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin recepcion de compra generada</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCrearTomaEquipo = () => {
    const clienteSeleccionado = clientes.find(c => c.id === tomaEquipoClienteId)
    const modeloSeleccionado = modelosEquipo.find(m => m.id === tomaEquipoModeloId)
    const totalDescuentos = calcularDescuentosCombinados(tomaEquipoComponentes.map(c => c.descuento))
    const precioSugerido = tomaEquipoPrecioBase - totalDescuentos
    
    // Rango permitido para el rol (simulado: vendedor puede +/- 10%)
    const rangoMin = Math.round(precioSugerido * 0.9)
    const rangoMax = Math.round(precioSugerido * 1.1)

    const resetForm = () => {
      setTomaEquipoPaso(1)
      setTomaEquipoClienteId(null)
      setTomaEquipoModeloId(null)
      setTomaEquipoPrecioBase(0)
      setTomaEquipoPrecioFinal(0)
      setTomaEquipoComponentes([])
      setTomaEquipoCreando(false)
    }

    const handleConfirmar = () => {
      if (!clienteSeleccionado || !modeloSeleccionado) return

      const ahora = new Date().toISOString()
      const nuevoId = tomasEquipo.length + 1
      const precioFinal = tomaEquipoPrecioFinal || precioSugerido
      const recepcionNumero = `REC-TE-${String(nuevoId).padStart(5, '0')}`
      const notaCreditoNumero = `NC-A-${String(45 + nuevoId).padStart(5, '0')}`

      const nuevaToma = {
        id: nuevoId,
        numero: `TE-${String(nuevoId).padStart(5, '0')}`,
        fecha: ahora,
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        modelo_equipo: modeloSeleccionado.nombre,
        precio_base: tomaEquipoPrecioBase,
        descuentos: totalDescuentos,
        precio_final: precioFinal,
        estado: "confirmado" as const,
        estado_recepcion: "pendiente" as const,
        recepcion_numero: recepcionNumero,
        nota_credito_numero: notaCreditoNumero,
        evaluacion: tomaEquipoComponentes.map(c => ({
          componente: c.nombre,
          estado: c.estado,
          descuento: c.descuento
        }))
      }

      // 1. Crear Nota de Crédito como Ajuste de Cliente (crédito en cuenta corriente)
      const nuevaNC: AjusteCliente = {
        id: ajustes.length + nuevoId,
        numero: notaCreditoNumero,
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        estado: "publicado",
        fecha: ahora,
        concepto: `Nota de Crédito — Toma de equipo: ${modeloSeleccionado.nombre}`,
        moneda: "ARS",
        nota_venta_numero: null,
        sucursal: "Puerto Norte",
              categoria: "Equipos en parte de pago",
        lineas: [{
          descripcion: `Toma de equipo usado: ${modeloSeleccionado.nombre}`,
          fecha_vencimiento: ahora,
          importe: precioFinal
        }],
        total: precioFinal
      }
      setAjustes(prev => [...prev, nuevaNC])

      // 2. Registrar movimiento de crédito en cuenta corriente del cliente
      const saldoActual = movimientosCC
        .filter(m => m.cliente_id === clienteSeleccionado.id)
        .reduce((s, m) => m.tipo === "debito" ? s + m.importe : s - m.importe, 0)

      const nuevoMovimiento: MovimientoCuentaCorriente = {
        id: movimientosCC.length + nuevoId,
        cliente_id: clienteSeleccionado.id,
        fecha: ahora,
        tipo: "credito",
        concepto: `Nota de Crédito ${notaCreditoNumero} — Toma equipo: ${modeloSeleccionado.nombre}`,
        documento_tipo: "nota_credito",
        documento_numero: notaCreditoNumero,
        documento_id: nuevaNC.id,
        moneda: "ARS",
        importe: precioFinal,
        saldo_posterior: Math.max(0, saldoActual - precioFinal)
      }
      setMovimientosCC(prev => [...prev, nuevoMovimiento])

      // 3. Actualizar saldo del cliente
      setClientes(prev => prev.map(c =>
        c.id === clienteSeleccionado.id
          ? { ...c, saldo_cuenta_corriente: Math.max(0, (c.saldo_cuenta_corriente || 0) - precioFinal) }
          : c
      ))

      // 4. Crear Recepción de Compra en estado borrador (en localStorage para que Compras la levante)
      const nuevaRecepcion = {
        id: Date.now(),
        numero: recepcionNumero,
        fecha: ahora,
        proveedor_id: 0,
        proveedor_nombre: `${clienteSeleccionado.nombre} (toma de equipo)`,
        orden_compra_id: 0,
        orden_compra_numero: nuevaToma.numero,
        estado: "borrador",
        tipo: "total",
        observaciones: `Equipo tomado en parte de pago. NC generada: ${notaCreditoNumero}. Valor acordado: $${precioFinal.toLocaleString('es-AR')}. Evaluación: ${tomaEquipoComponentes.map(c => `${c.nombre}=${c.estado}`).join(', ')}`,
        lineas: [{
          producto_id: 0,
          producto_nombre: modeloSeleccionado.nombre,
          cantidad_ordenada: 1,
          cantidad_recibida: 0,
          cantidad_esta_recepcion: 1,
          precio_unitario: precioFinal
        }]
      }

      // Guardar en localStorage para que ModuloCompras la levante
      const recepcionesPendientes = JSON.parse(localStorage.getItem('recepciones_pendientes_toma') || '[]')
      recepcionesPendientes.push(nuevaRecepcion)
      localStorage.setItem('recepciones_pendientes_toma', JSON.stringify(recepcionesPendientes))

      setTomasEquipo(prev => [...prev, nuevaToma])
      resetForm()
    }

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={resetForm} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">Nueva Toma de Equipo</h1>
            <p className="text-sm text-gray-500">Complete el wizard para registrar la toma</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-4">
          {[
            { num: 1, label: "Cliente" },
            { num: 2, label: "Equipo" },
            { num: 3, label: "Evaluación" },
            { num: 4, label: "Confirmación" },
          ].map((step, idx) => (
            <div key={step.num} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                tomaEquipoPaso >= step.num 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {tomaEquipoPaso > step.num ? <CheckCircle className="w-5 h-5" /> : step.num}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                tomaEquipoPaso >= step.num ? 'text-emerald-700' : 'text-gray-500'
              }`}>{step.label}</span>
              {idx < 3 && (
                <div className={`w-16 h-1 mx-4 rounded ${
                  tomaEquipoPaso > step.num ? 'bg-emerald-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Paso 1: Selección de Cliente */}
          {tomaEquipoPaso === 1 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Seleccione el Cliente</h2>
              <p className="text-sm text-gray-500 mb-6">El cliente seleccionado recibirá una nota de crédito en su cuenta corriente.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <select
                    value={tomaEquipoClienteId || ""}
                    onChange={(e) => setTomaEquipoClienteId(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                  </select>
                </div>

                {clienteSeleccionado && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Documento:</span>
                        <span className="ml-2 font-medium">{clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Teléfono:</span>
                        <span className="ml-2 font-medium">{clienteSeleccionado.telefono}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Saldo Actual:</span>
                        <span className={`ml-2 font-semibold ${clienteSeleccionado.saldo > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(Math.abs(clienteSeleccionado.saldo))} {clienteSeleccionado.saldo > 0 ? '(Debe)' : '(A favor)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => tomaEquipoClienteId && setTomaEquipoPaso(2)}
                  disabled={!tomaEquipoClienteId}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Selección de Equipo */}
          {tomaEquipoPaso === 2 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Seleccione el Modelo de Equipo</h2>
              <p className="text-sm text-gray-500 mb-6">Elija el modelo desde la lista de equipos disponibles para toma.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Equipo</label>
                  <select
                    value={tomaEquipoModeloId || ""}
                    onChange={(e) => {
                      const modelo = modelosEquipo.find(m => m.id === Number(e.target.value))
                      setTomaEquipoModeloId(Number(e.target.value))
                      setTomaEquipoPrecioBase(modelo?.precioBase || 0)
                      setTomaEquipoPrecioFinal(modelo?.precioBase || 0)
                      // Inicializar componentes con estado "Buena" por defecto
                      setTomaEquipoComponentes(componentesEvaluacion.map(c => ({
                        id: c.id,
                        nombre: c.nombre,
                        estado: c.estados[0].estado,
                        descuento: 0
                      })))
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar modelo...</option>
                    {modelosEquipo.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre} - Precio base: {formatCurrency(m.precioBase)}</option>
                    ))}
                  </select>
                </div>

                {modeloSeleccionado && (
                  <div className="bg-emerald-50 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-10 h-10 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-emerald-900">{modeloSeleccionado.nombre}</p>
                        <p className="text-sm text-emerald-700">Precio base de toma: <span className="font-bold">{formatCurrency(modeloSeleccionado.precioBase)}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setTomaEquipoPaso(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => tomaEquipoModeloId && setTomaEquipoPaso(3)}
                  disabled={!tomaEquipoModeloId}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Evaluación del Estado */}
          {tomaEquipoPaso === 3 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Evaluación del Estado del Equipo</h2>
              <p className="text-sm text-gray-500 mb-6">Evalúe cada componente del equipo. Los descuentos se calculan automáticamente.</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {componentesEvaluacion.map(comp => {
                  const compState = tomaEquipoComponentes.find(c => c.id === comp.id)
                  return (
                    <div key={comp.id} className="border rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">{comp.nombre}</label>
                      <select
                        value={compState?.estado || comp.estados[0].estado}
                        onChange={(e) => {
                          const estadoSel = comp.estados.find(es => es.estado === e.target.value)
                          setTomaEquipoComponentes(prev => prev.map(c => 
                            c.id === comp.id 
                              ? { ...c, estado: e.target.value, descuento: estadoSel?.descuento || 0 }
                              : c
                          ))
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        {comp.estados.map(es => (
                          <option key={es.estado} value={es.estado}>
                            {es.estado} {es.descuento > 0 ? `(-${formatCurrency(es.descuento)})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Panel de Resumen de Precio */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 mb-3">Resumen de Valorización</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Precio base:</span>
                    <span className="font-medium">{formatCurrency(tomaEquipoPrecioBase)}</span>
                  </div>
                  {tomaEquipoComponentes.filter(c => c.descuento > 0).map(c => (
                    <div key={c.id} className="flex justify-between text-red-600">
                      <span>- {c.nombre} ({c.estado}):</span>
                      <span>-{formatCurrency(c.descuento)}</span>
                    </div>
                  ))}
                  {tomaEquipoComponentes.filter(c => c.descuento > 0).length > 1 && (
                    <div className="flex justify-between text-emerald-600 text-xs">
                      <span>Bonificación por múltiples daños:</span>
                      <span>+{formatCurrency(tomaEquipoComponentes.reduce((s, c) => s + c.descuento, 0) - totalDescuentos)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Precio sugerido:</span>
                    <span className="text-emerald-600">{formatCurrency(precioSugerido)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Final (Rango: {formatCurrency(rangoMin)} - {formatCurrency(rangoMax)})
                  </label>
                  <input
                    type="number"
                    value={tomaEquipoPrecioFinal || precioSugerido}
                    onChange={(e) => setTomaEquipoPrecioFinal(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      (tomaEquipoPrecioFinal || precioSugerido) < rangoMin || (tomaEquipoPrecioFinal || precioSugerido) > rangoMax
                        ? 'border-red-500 focus:ring-red-500'
                        : 'focus:ring-emerald-500'
                    }`}
                  />
                  {((tomaEquipoPrecioFinal || precioSugerido) < rangoMin || (tomaEquipoPrecioFinal || precioSugerido) > rangoMax) && (
                    <p className="text-red-500 text-xs mt-1">Precio fuera del rango permitido. Requiere aprobación del supervisor.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setTomaEquipoPaso(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => setTomaEquipoPaso(4)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Confirmación */}
          {tomaEquipoPaso === 4 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Confirmación de la Operación</h2>
              <p className="text-sm text-gray-500 mb-6">Revise los datos antes de confirmar. Se generará una recepción de compra y una nota de crédito.</p>
              
              <div className="space-y-4">
                {/* Resumen Cliente */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
                  <p className="text-sm">{clienteSeleccionado?.codigo} - {clienteSeleccionado?.nombre}</p>
                  <p className="text-sm text-gray-500">{clienteSeleccionado?.tipo_documento}: {clienteSeleccionado?.numero_documento}</p>
                </div>

                {/* Resumen Equipo */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Equipo</h3>
                  <p className="text-sm font-medium">{modeloSeleccionado?.nombre}</p>
                  <div className="mt-2 space-y-1">
                    {tomaEquipoComponentes.map(c => (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="text-gray-500">{c.nombre}:</span>
                        <span className={c.descuento > 0 ? 'text-red-600' : 'text-emerald-600'}>
                          {c.estado} {c.descuento > 0 && `(-${formatCurrency(c.descuento)})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen Financiero */}
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h3 className="font-semibold text-emerald-900 mb-2">Resumen Financiero</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Precio base:</span>
                      <span>{formatCurrency(tomaEquipoPrecioBase)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Descuentos aplicados:</span>
                      <span>-{formatCurrency(totalDescuentos)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-emerald-200">
                      <span>Precio Final Acordado:</span>
                      <span className="text-emerald-700">{formatCurrency(tomaEquipoPrecioFinal || precioSugerido)}</span>
                    </div>
                  </div>
                </div>

                {/* Comprobantes a Generar */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Comprobantes a Generar</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>Recepción de Compra (Módulo Compras)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Nota de Crédito por {formatCurrency(tomaEquipoPrecioFinal || precioSugerido)} (Cuenta Corriente)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setTomaEquipoPaso(3)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={handleConfirmar}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Confirmar Operación
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTomaEquipo = () => {
    if (selectedToma) return renderFichaTomaEquipo()
  if (tomaEquipoCreando) return renderCrearTomaEquipo()

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Toma de Equipo en Parte de Pago</h1>
            <p className="text-gray-500 mt-1">Gestione las tomas de equipos usados como parte de pago</p>
          </div>
          <button 
            onClick={() => setTomaEquipoCreando(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Toma
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Operaciones</p>
            <p className="text-2xl font-bold text-gray-900">{tomasEquipo.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Confirmadas</p>
            <p className="text-2xl font-bold text-emerald-600">{tomasEquipo.filter(t => t.estado === 'confirmado').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Valor Total Tomado</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(tomasEquipo.reduce((s, t) => s + t.precio_final, 0))}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Promedio Descuento</p>
            <p className="text-2xl font-bold text-orange-600">
              {tomasEquipo.length > 0 
                ? Math.round(tomasEquipo.reduce((s, t) => s + (t.descuentos / t.precio_base * 100), 0) / tomasEquipo.length)
                : 0}%
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha y Hora</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Equipo</th>
                <th className="text-right py-3 px-4">Precio Base</th>
                <th className="text-right py-3 px-4">Descuentos</th>
                <th className="text-right py-3 px-4">Precio Final</th>
                <th className="text-center py-3 px-4">Operaci��n</th>
                <th className="text-center py-3 px-4">Recepción</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tomasEquipo.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-gray-400">No hay tomas de equipo registradas</td>
                </tr>
              )}
              {tomasEquipo.map(toma => {
                const fechaObj = new Date(toma.fecha)
                const fecha = fechaObj.toLocaleDateString('es-AR')
                const hora = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                const operacionEnCurso = toma.estado_recepcion !== 'recibido'
                return (
                  <tr key={toma.id} onClick={() => setSelectedToma(toma)} className="border-b hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-medium text-emerald-700">{toma.numero}</td>
                    <td className="py-3 px-4 text-sm">
                      <span>{fecha}</span>
                      <span className="text-gray-400 ml-1">{hora}</span>
                    </td>
                    <td className="py-3 px-4 text-sm">{toma.cliente_nombre}</td>
                    <td className="py-3 px-4 text-sm">{toma.modelo_equipo}</td>
                    <td className="py-3 px-4 text-sm text-right">{formatCurrency(toma.precio_base)}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-600">-{formatCurrency(toma.descuentos)}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-emerald-600">{formatCurrency(toma.precio_final)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        operacionEnCurso ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {operacionEnCurso ? 'En curso' : 'Finalizada'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        toma.estado_recepcion === 'recibido' ? 'bg-green-100 text-green-700' :
                        toma.estado_recepcion === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {toma.estado_recepcion === 'recibido' ? 'Recibido' :
                         toma.estado_recepcion === 'cancelado' ? 'Cancelado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        toma.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                        toma.estado === 'borrador' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {toma.estado.charAt(0).toUpperCase() + toma.estado.slice(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Ordenes de Entrega
  const renderOrdenesEntrega = () => {
    if (selectedOE) return renderFichaOE()
    if (creandoOE) return renderCrearOE()
    
    return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Ordenes de Entrega</h1>
        <button
          onClick={() => { setCreandoOE(true); setOeNvId(null) }}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Orden de Entrega
        </button>
      </div>

      <div className="mb-4">
        <OdooFilterBar
          moduleName="ordenes-entrega"
          filterOptions={[
            { field: "estado", label: "Estado", values: [
              { value: "pendiente", label: "Pendiente" },
              { value: "en_preparacion", label: "En preparación" },
              { value: "lista", label: "Lista" },
              { value: "entregada", label: "Entregada" },
              { value: "cancelada", label: "Cancelada" },
            ]},
          ]}
          groupByOptions={[
            { id: "estado", label: "Estado", field: "estado" },
            { id: "cliente", label: "Cliente", field: "cliente" },
          ]}
          activeFilters={activeFiltersOE}
          activeGroupBy={activeGroupByOE}
          searchTerm={searchQuery}
          onFiltersChange={setActiveFiltersOE}
          onGroupByChange={setActiveGroupByOE}
          onSearchChange={setSearchQuery}
          savedFilters={savedFiltersOE}
          {...makeSavedFilterHandlers(setSavedFiltersOE, setActiveFiltersOE, setActiveGroupByOE, setSearchQuery)}
          totalCount={ordenesEntrega.length}
          filteredCount={ordenesEntrega.filter(oe => {
            const q = searchQuery.toLowerCase()
            const matchSearch = !q || oe.numero.toLowerCase().includes(q) || oe.cliente_nombre.toLowerCase().includes(q)
            const matchEstado = !activeFiltersOE.find(f => f.field === "estado") || activeFiltersOE.some(f => f.field === "estado" && f.value === oe.estado)
            return matchSearch && matchEstado
          }).length}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nota de Venta</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha Entrega</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Domicilio</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Remito</th>
            </tr>
          </thead>
          <tbody>
              {ordenesEntrega.map(oe => (
                <tr 
                  key={oe.id} 
                  onClick={() => setSelectedOE(oe)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{oe.numero}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{oe.nota_venta_numero}</td>
                  <td className="py-3 px-4 text-sm">{oe.cliente_nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{formatDate(oe.fecha_entrega)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{oe.domicilio_envio}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoOEColor(oe.estado)}`}>
                      {getEstadoOELabel(oe.estado)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-emerald-600 font-medium">{oe.remito_numero || "-"}</td>
                </tr>
              ))}
            </tbody>
        </table>
        {ordenesEntrega.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron ordenes de entrega
          </div>
        )}
      </div>
    </div>
    )
  }

  // Ficha de Remito
  const renderFichaRemito = () => {
    if (!selectedRemito) return null
    const clienteRemito = clientes.find(c => c.id === selectedRemito.cliente_id)
    const oeVinculada = ordenesEntrega.find(oe => oe.id === selectedRemito.orden_entrega_id)
    const facturaVinculada = facturas.find(f => f.numero === selectedRemito.factura_numero)
    const nvVinculada = notasVenta.find(nv => nv.numero === selectedRemito.nota_venta_numero)

    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => setSelectedRemito(null)} className="hover:text-emerald-700">Remitos</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{selectedRemito.numero}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
<BotonVolver onClick={() => setSelectedRemito(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{selectedRemito.numero}</h1>
              <p className="text-sm text-gray-500">{formatDateTime(selectedRemito.fecha)} | {selectedRemito.sucursal}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            selectedRemito.estado === 'entregado' ? 'bg-green-100 text-green-700' :
            selectedRemito.estado === 'en_transito' ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {selectedRemito.estado === 'entregado' ? 'Entregado' : selectedRemito.estado === 'en_transito' ? 'En Transito' : 'Borrador'}
          </span>
        </div>

        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center gap-2 mb-0">
          <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          {nvVinculada && (
            <button 
              onClick={() => { setSelectedRemito(null); setSelectedNV(nvVinculada); setActiveView("notas_venta") }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver Nota de Venta
            </button>
          )}
          {oeVinculada && (
            <button 
              onClick={() => { setSelectedRemito(null); setSelectedOE(oeVinculada); setActiveView("ordenes_entrega") }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver Orden de Entrega
            </button>
          )}
          {facturaVinculada && (
            <button 
              onClick={() => { setSelectedRemito(null); setSelectedFactura(facturaVinculada); setActiveView("facturas") }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ver Factura
            </button>
          )}
        </div>

        <div className="bg-white rounded-b-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Datos del Remito</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Numero:</span> <span className="font-medium">{selectedRemito.numero}</span></div>
                <div><span className="text-gray-500">OE:</span> <span className="font-medium text-emerald-700">{selectedRemito.orden_entrega_numero}</span></div>
                <div><span className="text-gray-500">NV:</span> <span className="font-medium text-emerald-700">{selectedRemito.nota_venta_numero || "-"}</span></div>
                <div><span className="text-gray-500">Factura:</span> <span className="font-medium text-emerald-700">{selectedRemito.factura_numero || "-"}</span></div>
                <div><span className="text-gray-500">Deposito:</span> <span className="font-medium">{selectedRemito.deposito}</span></div>
                <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{selectedRemito.sucursal}</span></div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Entrega</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Fecha Entrega:</span> <span className="font-medium">{formatDate(selectedRemito.fecha_entrega)}</span></div>
                <div><span className="text-gray-500">Transporte:</span> <span className="font-medium">{selectedRemito.transporte || "-"}</span></div>
                <div><span className="text-gray-500">Chofer:</span> <span className="font-medium">{selectedRemito.chofer || "-"}</span></div>
                <div><span className="text-gray-500">Bultos:</span> <span className="font-medium">{selectedRemito.bultos}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Domicilio:</span> <span className="font-medium">{selectedRemito.domicilio_envio}</span></div>
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Cliente</h3>
          {clienteRemito && (
            <div className="grid grid-cols-4 gap-4 text-sm mb-6">
              <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{clienteRemito.nombre}</span></div>
              <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{clienteRemito.tipo_documento}: {clienteRemito.numero_documento}</span></div>
              <div><span className="text-gray-500">Telefono:</span> <span className="font-medium">{clienteRemito.telefono || clienteRemito.celular || "-"}</span></div>
              <div><span className="text-gray-500">Email:</span> <span className="font-medium">{clienteRemito.email || "-"}</span></div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div><span className="text-gray-500">Peso Bruto:</span> <span className="font-medium">{selectedRemito.peso_kg} kg</span></div>
            <div><span className="text-gray-500">Peso Neto:</span> <span className="font-medium">{selectedRemito.peso_neto_kg} kg</span></div>
            <div><span className="text-gray-500">Bultos:</span> <span className="font-medium">{selectedRemito.bultos}</span></div>
            <div><span className="text-gray-500">Valor Declarado:</span> <span className="font-medium">{formatCurrency(selectedRemito.valor_declarado)}</span></div>
          </div>

          {/* Seguimiento */}
          <SeguimientoPanel seguimiento={selectedRemito.seguimiento || []} />
        </div>
      </div>
    )
  }

  // Remitos
  const renderRemitos = () => {
    if (selectedRemito) return renderFichaRemito()
    
    return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Remitos</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Domicilio Envío</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Factura</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Control Factura</th>
            </tr>
          </thead>
          <tbody>
            {remitos.map(remito => (
              <tr 
                key={remito.id} 
                onClick={() => setSelectedRemito(remito)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{remito.numero}</td>
                <td className="py-3 px-4 text-sm">{remito.cliente_nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{formatDate(remito.fecha)}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{remito.domicilio_envio}</td>
                <td className="py-3 px-4 text-sm text-blue-600">{remito.factura_numero || "-"}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoRemitoColor(remito.estado)}`}>
                    {remito.estado === "en_ejecucion" ? "En Ejecución" : "Aprobado"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${remito.control_factura === "facturado" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {remito.control_factura === "facturado" ? "Facturado" : "Pendiente"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {remitos.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron remitos
          </div>
)}
      </div>
    </div>
    )
  }
  
  // Vista de Crear Factura
  // Función para guardar factura como borrador
  const handleGuardarFacturaBorrador = () => {
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const lineasValidas = facturaLineas.filter(l => l.producto_nombre.trim() !== "")
    const subtotal = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    const total = subtotal * 1.21
    
    if (!clienteSeleccionado || lineasValidas.length === 0) {
      alert("Debe seleccionar un cliente y agregar al menos un producto")
      return
    }

    const facturaNumero = `FC X 10000-000${20050 + facturas.length}`
    const facturaId = facturas.length + 1
    const fechaHoy = new Date().toISOString()

    const newFactura: Factura = {
      id: facturaId,
      numero: facturaNumero,
      tipo: "B",
      nota_venta_id: 0,
      nota_venta_numero: "-",
      cliente_id: clienteSeleccionado.id,
      cliente_nombre: clienteSeleccionado.nombre,
      cliente_documento: `${clienteSeleccionado.tipo_documento} ${clienteSeleccionado.numero_documento}`,
      estado: "borrador",
      fecha: fechaHoy,
      vendedor_nombre: vendedores[0]?.nombre || "Max Solina",
      domicilio_facturacion: clienteSeleccionado.direccion,
      moneda: "ARS",
      tipo_cotizacion: "blue",
      cotizacion: 1150,
      termino_pago: mockTerminosPago.find(tp => tp.id === clienteSeleccionado.termino_pago_id)?.nombre || "Contado",
      subtotal: subtotal,
      descuento: 0,
      impuestos: 0,
      total: subtotal,
      saldo: subtotal,
      sucursal: "Puerto Norte",
      lineas: lineasValidas,
      vencimientos: [{ descripcion: "Vencimiento 1", fecha: fechaHoy.split('T')[0], total: subtotal }]
    }
    setFacturas(prev => [...prev, newFactura])

    setCreandoFactura(false)
    setFacturaPrevisualizando(false)
    setFacturaClienteId(null)
    setFacturaLineas([])
    setFacturaListaPreciosId(1)
    setSelectedFactura(newFactura)
  }

  // Función para crear factura (usada desde previsualización)
  const handleCrearFacturaFinal = () => {
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const subtotal = facturaLineas.reduce((sum, l) => sum + l.subtotal, 0)
    const totalRecargos = prevRecargosConfirmados?.totalRecargos || 0
    const totalFinal = subtotal + totalRecargos

    if (!clienteSeleccionado || facturaLineas.length === 0) {
      alert("Debe seleccionar un cliente y agregar al menos un producto")
      return
    }

    const facturaNumero = `FC-${String(20050 + facturas.length).padStart(6, "0")}`
    const facturaId = facturas.length + 1
    const fechaHoy = new Date().toISOString()

    const newFactura: Factura = {
      id: facturaId,
      numero: facturaNumero,
      tipo: "B",
      nota_venta_id: 0,
      nota_venta_numero: "-",
      cliente_id: clienteSeleccionado.id,
      cliente_nombre: clienteSeleccionado.nombre,
      cliente_documento: `${clienteSeleccionado.tipo_documento} ${clienteSeleccionado.numero_documento}`,
      estado: "abierta",
      fecha: fechaHoy,
      vendedor_nombre: vendedores[0]?.nombre || "Max Solina",
      domicilio_facturacion: clienteSeleccionado.direccion,
      moneda: "ARS",
      tipo_cotizacion: "blue",
      cotizacion: 1150,
      termino_pago: mockTerminosPago.find(tp => tp.id === clienteSeleccionado.termino_pago_id)?.nombre || "Contado",
      subtotal: subtotal,
      descuento: 0,
      impuestos: totalRecargos,
      total: totalFinal,
      saldo: totalFinal,
      sucursal: "Puerto Norte",
      lineas: facturaLineas,
      vencimientos: [{ descripcion: "Vencimiento 1", fecha: fechaHoy.split('T')[0], total: totalFinal }]
    }
    setFacturas(prev => [...prev, newFactura])

    // Crear movimiento de debito por el total (subtotal + recargos)
    const saldoAnterior = clienteSeleccionado.saldo_cuenta_corriente
    const nuevoMovimiento: MovimientoCuentaCorriente = {
      id: movimientosCC.length + 1,
      cliente_id: clienteSeleccionado.id,
      fecha: fechaHoy,
      tipo: "debito",
      concepto: `Factura de venta`,
      documento_tipo: "factura",
      documento_numero: facturaNumero,
      documento_id: facturaId,
      moneda: "ARS",
      importe: totalFinal,
      saldo_posterior: saldoAnterior + totalFinal
    }
    setMovimientosCC(prev => [...prev, nuevoMovimiento])

    // Actualizar saldo del cliente
    setClientes(prev => prev.map(c =>
      c.id === clienteSeleccionado.id ? {
        ...c,
        saldo_cuenta_corriente: c.saldo_cuenta_corriente + totalFinal,
        total_facturado: c.total_facturado + totalFinal
      } : c
    ))

    // Resetear estado de previsualización
    setPrevRecargosConfirmados(null)
    setPrevEstadoPago({ cobrado: false, tieneLineas: false, diferenciaOk: false })
    setCreandoFactura(false)
    setFacturaPrevisualizando(false)
    setFacturaClienteId(null)
    setFacturaLineas([])
    setFacturaListaPreciosId(1)
    setSelectedFactura(newFactura)
  }

  // Vista de previsualización de Factura
  const [prevRecargosConfirmados, setPrevRecargosConfirmados] = useState<{ totalRecargos: number; desglose: { nombre: string; importe: number }[] } | null>(null)
  const [prevEstadoPago, setPrevEstadoPago] = useState<{ cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }>({ cobrado: false, tieneLineas: false, diferenciaOk: false })
  const [modalValidacionMsg, setModalValidacionMsg] = useState<string | null>(null)
  // Estado de pago para la ficha de factura en estado borrador
  const [fichaEstadoPago, setFichaEstadoPago] = useState<{ cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }>({ cobrado: false, tieneLineas: false, diferenciaOk: false })
  const [fichaModalValidacionMsg, setFichaModalValidacionMsg] = useState<string | null>(null)

  const renderPrevisualizacionFactura = () => {
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const lineasValidas = facturaLineas.filter(l => l.producto_nombre.trim() !== "")
    const subtotal = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    const numeroProvisorio = `FC-${String(20050 + facturas.length).padStart(6, "0")}`
    return (
      <div>
        {/* Header con breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Facturas / <span className="text-gray-700">{numeroProvisorio}</span>
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setFacturaPrevisualizando(false)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">{numeroProvisorio}</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR')} | Puerto Norte</p>
          </div>
          <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
            Borrador
          </span>
        </div>

        {/* Barra de acciones oscura */}
        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center mb-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGuardarFacturaBorrador}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
            <button 
              onClick={() => {
                if (!prevEstadoPago.tieneLineas) {
                  setModalValidacionMsg("Debés ingresar al menos un medio de pago antes de confirmar la factura.")
                  return
                }
                if (!prevEstadoPago.cobrado) {
                  setModalValidacionMsg("El cobro no fue confirmado. Completá los medios de pago y presioná \"Confirmar cobro\".")
                  return
                }
                handleCrearFacturaFinal()
              }}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Confirmar Factura
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-b-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Datos del Cliente */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium">{clienteSeleccionado?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Documento:</span>
                  <span className="ml-2 font-medium">{clienteSeleccionado?.tipo_documento}: {clienteSeleccionado?.numero_documento}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pos. Fiscal:</span>
                  <span className="ml-2 font-medium capitalize">{clienteSeleccionado?.posicion_fiscal?.replace("_", " ")}</span>
                </div>

                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium text-emerald-600">{clienteSeleccionado?.telefono || clienteSeleccionado?.celular || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium text-emerald-600">{clienteSeleccionado?.email || "-"}</span>
                </div>
              </div>
            </div>

            {/* Datos de la Factura */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos de la Factura</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Sucursal:</span>
                  <span className="ml-2 font-medium">Puerto Norte</span>
                </div>
                <div>
                  <span className="text-gray-500">Vendedor:</span>
                  <span className="ml-2 font-medium">Max Solina</span>
                </div>
                <div>
                  <span className="text-gray-500">Moneda:</span>
                  <span className="ml-2 font-medium">ARS</span>
                </div>
                <div>
                  <span className="text-gray-500">Condición:</span>
                  <span className="ml-2 font-medium">{mockTerminosPago.find(tp => tp.id === clienteSeleccionado?.termino_pago_id)?.nombre || "Contado"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Lineas de Factura ({lineasValidas.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-center py-2 w-20">Cant.</th>
                  <th className="text-right py-2 w-28">Precio</th>
                  <th className="text-center py-2 w-16">Dto.%</th>
                  <th className="text-right py-2 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineasValidas.map((linea, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{linea.producto_nombre}</div>
                      {linea.descripcion && <div className="text-xs text-gray-500">{linea.descripcion}</div>}
                    </td>
                    <td className="py-2 text-center">{linea.cantidad}</td>
                    <td className="py-2 text-right">{formatCurrency(linea.precio_unitario)}</td>
                    <td className="py-2 text-center">{linea.descuento}%</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(linea.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal (precio contado):</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {prevRecargosConfirmados && prevRecargosConfirmados.desglose.map((d, i) => (
                <div key={i} className="flex justify-between text-amber-700">
                  <span>{d.nombre}:</span>
                  <span>+ {formatCurrency(d.importe)}</span>
                </div>
              ))}
              {prevRecargosConfirmados && prevRecargosConfirmados.totalRecargos > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Total recargos:</span>
                  <span>+ {formatCurrency(prevRecargosConfirmados.totalRecargos)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-emerald-700">
                  {formatCurrency(subtotal + (prevRecargosConfirmados?.totalRecargos || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Modal de validación */}
          {modalValidacionMsg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">No se puede confirmar la factura</h3>
                    <p className="text-sm text-gray-600">{modalValidacionMsg}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalValidacionMsg(null)}
                  className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* Medios de Pago — disponible antes de guardar */}
          <BloquesMediosPago
            key={`prev-${facturaClienteId}`}
            onEstadoPagoChange={(estado) => setPrevEstadoPago(estado)}
            onCobroConfirmado={(totalRecargos, desglose) => {
              setPrevRecargosConfirmados({ totalRecargos, desglose })
            }}
            factura={{
              id: 0,
              numero: "",
              tipo: "B",
              estado: "borrador",
              fecha: new Date().toISOString(),
              cliente_id: facturaClienteId || 0,
              cliente_nombre: clienteSeleccionado?.nombre || "",
              moneda: "ARS",
              subtotal,
              descuento: 0,
              impuestos: 0,
              total: subtotal,
              saldo: subtotal,
            } as Factura}
          />
        </div>
      </div>
    )
  }

  const renderCrearFactura = () => {
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const subtotal = facturaLineas.reduce((sum, l) => sum + l.subtotal, 0)

    // Si estamos en previsualización, mostrar vista previa
    if (facturaPrevisualizando) {
      return renderPrevisualizacionFactura()
    }

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => { setCreandoFactura(false); setFacturaClienteId(null); setFacturaLineas([]) }} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Nueva Factura</h1>
            <p className="text-sm text-gray-500">Complete los datos para crear la factura</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
              <select
                value={facturaClienteId || ""}
                onChange={(e) => setFacturaClienteId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
              {clienteSeleccionado && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}</span></div>
                  <div><span className="text-gray-500">Posicion Fiscal:</span> <span className="font-medium capitalize">{clienteSeleccionado.posicion_fiscal.replace('_', ' ')}</span></div>

                  <div>
                    <span className="text-gray-500">Lista de Precios:</span>
                    <select
                      value={facturaListaPreciosId}
                      onChange={(e) => setFacturaListaPreciosId(Number(e.target.value))}
                      className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm font-medium"
                    >
                      {listasPrecios.filter(lp => lp.activa).map(lp => (
                        <option key={lp.id} value={lp.id}>{lp.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">Lineas de Factura</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-3">Producto</th>
                    <th className="text-center py-2 px-3 w-24">Cantidad</th>
                    <th className="text-right py-2 px-3 w-32">Precio Unit.</th>
                    <th className="text-center py-2 px-3 w-24">Dto. %</th>
                    <th className="text-right py-2 px-3 w-32">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {facturaLineas.map((linea, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">
                        <div className="relative">
                          <input type="text" value={linea.producto_nombre}
                            onChange={(e) => {
                              const updated = [...facturaLineas]
                              updated[index].producto_nombre = e.target.value
                              setFacturaLineas(updated)
                              setFacturaProductoSearchText(e.target.value)
                            }}
                            onFocus={() => {
                              setFacturaProductoSearchIndex(index)
                              setFacturaProductoSearchText(linea.producto_nombre)
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setFacturaProductoSearchIndex(null)
                                setFacturaProductoSearchText("")
                              }, 200)
                            }}
                            placeholder="Buscar producto..."
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                          {/* Dropdown de sugerencias */}
                          {facturaProductoSearchIndex === index && (
                            <div className="absolute left-0 top-full z-50 w-full mt-1 bg-white border border-gray-300 shadow-lg rounded-md max-h-48 overflow-y-auto">
                              {productosMaestro
                                .filter(p =>
                                  p.nombre.toLowerCase().includes(facturaProductoSearchText.toLowerCase()) ||
                                  p.sku.toLowerCase().includes(facturaProductoSearchText.toLowerCase())
                                )
                                .map(p => {
                                  const precioLista = p.precios?.find((pr: any) => pr.lista_id === facturaListaPreciosId)?.precio || p.precio_venta
                                  return (
                                    <div
                                      key={p.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        const updated = [...facturaLineas]
                                        updated[index].producto_nombre = p.nombre
                                        updated[index].producto_id = p.id
                                        updated[index].precio_unitario = precioLista
                                        updated[index].subtotal = updated[index].cantidad * precioLista * (1 - updated[index].descuento / 100)
                                        setFacturaLineas(updated)
                                        setFacturaProductoSearchIndex(null)
                                        setFacturaProductoSearchText("")
                                      }}
                                      className="px-3 py-2 hover:bg-emerald-600 hover:text-white cursor-pointer text-sm"
                                    >
                                      <span className="font-medium">[{p.sku}]</span> {p.nombre}
                                    </div>
                                  )
                                })
                              }
                              {productosMaestro.filter(p =>
                                p.nombre.toLowerCase().includes(facturaProductoSearchText.toLowerCase()) ||
                                p.sku.toLowerCase().includes(facturaProductoSearchText.toLowerCase())
                              ).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500">No se encontraron productos</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.cantidad} min="1"
                          onChange={(e) => {
                            const updated = [...facturaLineas]
                            updated[index].cantidad = parseInt(e.target.value) || 1
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setFacturaLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.precio_unitario} min="0" step="0.01"
                          onChange={(e) => {
                            const updated = [...facturaLineas]
                            updated[index].precio_unitario = parseFloat(e.target.value) || 0
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setFacturaLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.descuento} min="0" max="100"
                          onChange={(e) => {
                            const updated = [...facturaLineas]
                            updated[index].descuento = parseFloat(e.target.value) || 0
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setFacturaLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                      </td>
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(linea.subtotal)}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => setFacturaLineas(facturaLineas.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {facturaLineas.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-3 text-gray-400 text-sm">No hay lineas agregadas</td></tr>
                  )}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t">
                <button
                  onClick={() => setFacturaLineas([...facturaLineas, { producto_nombre: "", descripcion: "", cantidad: 1, precio_unitario: 0, descuento: 0, subtotal: 0 }])}
                  className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar linea
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Resumen</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold"><span>Total:</span><span className="text-emerald-700">{formatCurrency(subtotal)}</span></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-3">
                <button onClick={() => setFacturaPrevisualizando(true)} disabled={!facturaClienteId || facturaLineas.filter(l => l.producto_nombre.trim() !== "").length === 0}
                  className="w-full bg-emerald-700 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                  Continuar
                </button>
                <button onClick={() => { setCreandoFactura(false); setFacturaClienteId(null); setFacturaLineas([]); setFacturaPrevisualizando(false); setFacturaListaPreciosId(1) }}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ficha de Factura
  const renderFichaFactura = () => {
    if (!selectedFactura) return null
    const clienteFactura = clientes.find(c => c.id === selectedFactura.cliente_id)
    const nvVinculada = notasVenta.find(nv => nv.id === selectedFactura.nota_venta_id)
    const recibosVinculados = recibos.filter(r => r.nota_venta_numero === selectedFactura.nota_venta_numero)

    return (
      <>
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => setSelectedFactura(null)} className="hover:text-emerald-700">Facturas</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{selectedFactura.numero}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
<BotonVolver onClick={() => setSelectedFactura(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{selectedFactura.numero}</h1>
                <p className="text-sm text-gray-500">{formatDateTime(selectedFactura.fecha)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedFactura.estado === 'borrador' && (
              <button 
                onClick={() => {
                  // Cargar datos de la factura en el formulario para editar
                  setFacturaClienteId(selectedFactura.cliente_id)
                  setFacturaLineas(selectedFactura.lineas.map(l => ({
                    producto_nombre: l.producto_nombre,
                    descripcion: l.descripcion || "",
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario,
                    descuento: l.descuento,
                    subtotal: l.subtotal
                  })))
                  setCreandoFactura(true)
                  setFacturaPrevisualizando(true)
                  setSelectedFactura(null)
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
            <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              selectedFactura.estado === 'pagada' ? 'bg-green-100 text-green-700' :
              selectedFactura.estado === 'abierta' ? 'bg-blue-100 text-blue-700' :
              selectedFactura.estado === 'vencida' ? 'bg-red-100 text-red-700' :
              selectedFactura.estado === 'cancelada' ? 'bg-gray-100 text-gray-700' :
              selectedFactura.estado === 'borrador' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {selectedFactura.estado.charAt(0).toUpperCase() + selectedFactura.estado.slice(1)}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            {selectedFactura.estado === 'borrador' && (
              <>
                <button
                  onClick={() => setShowCancelarFacturaModal(true)}
                  className="px-3 py-1.5 text-sm border border-gray-400 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!fichaEstadoPago.tieneLineas) {
                      setFichaModalValidacionMsg("Debés ingresar al menos un medio de pago antes de confirmar la factura.")
                      return
                    }
                    if (!fichaEstadoPago.cobrado) {
                      setFichaModalValidacionMsg("El cobro no fue confirmado. Completá los medios de pago y presioná \"Confirmar cobro\".")
                      return
                    }
                    const fechaHoy = new Date().toISOString()
                    const clienteFactura = clientes.find(c => c.id === selectedFactura.cliente_id)
                    // Generar movimiento de débito en CC
                    if (clienteFactura) {
                      const saldoAnterior = clienteFactura.saldo_cuenta_corriente
                      const nuevoMovimiento: MovimientoCuentaCorriente = {
                        id: movimientosCC.length + 1,
                        cliente_id: clienteFactura.id,
                        fecha: fechaHoy,
                        tipo: "debito",
                        concepto: `Factura de venta confirmada`,
                        documento_tipo: "factura",
                        documento_numero: selectedFactura.numero,
                        documento_id: selectedFactura.id,
                        moneda: selectedFactura.moneda,
                        importe: selectedFactura.total,
                        saldo_posterior: saldoAnterior + selectedFactura.total
                      }
                      setMovimientosCC(prev => [...prev, nuevoMovimiento])
                      setClientes(prev => prev.map(c =>
                        c.id === clienteFactura.id
                          ? { ...c, saldo_cuenta_corriente: c.saldo_cuenta_corriente + selectedFactura.total, total_facturado: (c.total_facturado || 0) + selectedFactura.total }
                          : c
                      ))
                    }
                    const updatedFactura = {
                      ...selectedFactura,
                      estado: "abierta" as const,
                      seguimiento: [
                        ...(selectedFactura.seguimiento || []),
                        { id: (selectedFactura.seguimiento?.length || 0) + 1, fecha: fechaHoy, usuario: "Max Solina", tipo: "confirmacion" as const, descripcion: "Factura confirmada — pasó de Borrador a Abierta" }
                      ]
                    }
                    setFacturas(prev => prev.map(f => f.id === selectedFactura.id ? updatedFactura : f))
                    setSelectedFactura(updatedFactura)
                  }}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> Confirmar Factura
                </button>
              </>
            )}
            {(selectedFactura.estado === 'abierta' || selectedFactura.estado === 'vencida') && (
              <>
                <button 
                  onClick={() => setShowCancelarFacturaModal(true)}
                  className="px-3 py-1.5 text-sm border border-gray-400 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button 
                  onClick={() => {
                    // Precargar datos del cliente y factura en el recibo
                    setReciboClienteIdForm(selectedFactura.cliente_id)
                    setReciboFacturaIdForm(selectedFactura.id)
                    setReciboMontoForm(selectedFactura.saldo)
                    setReciboPagosForm([{ forma_pago: "Efectivo", importe: selectedFactura.saldo, moneda: "ARS" }])
                    setCreandoRecibo(true)
                    setReciboPrevisualizando(false)
                    setSelectedFactura(null)
                    setActiveView("recibos")
                  }}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
                >
                  <DollarSign className="w-4 h-4" /> Registrar Cobro
                </button>
              </>
            )}
            {nvVinculada && (
              <button 
                onClick={() => { setSelectedFactura(null); setSelectedNV(nvVinculada); setActiveView("notas_venta") }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ver Nota de Venta
              </button>
            )}
            {recibosVinculados.length > 0 && (
              <button 
                onClick={() => { setSelectedFactura(null); setSelectedRecibo(recibosVinculados[0]); setActiveView("recibos") }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ver Recibos ({recibosVinculados.length})
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-b-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Datos de Factura</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Numero:</span> <span className="font-medium">{selectedFactura.numero}</span></div>
                <div><span className="text-gray-500">Tipo:</span> <span className="font-medium">Factura</span></div>
                <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(selectedFactura.fecha)}</span></div>
                <div><span className="text-gray-500">NV:</span> <span className="font-medium text-emerald-700">{selectedFactura.nota_venta_numero}</span></div>
                <div><span className="text-gray-500">Vendedor:</span> <span className="font-medium">{selectedFactura.vendedor_nombre}</span></div>
                <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{selectedFactura.sucursal}</span></div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Cliente</h3>
              {clienteFactura && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{clienteFactura.nombre}</span></div>
                  <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{selectedFactura.cliente_documento}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Direccion:</span> <span className="font-medium">{selectedFactura.domicilio_facturacion}</span></div>
                </div>
              )}
            </div>
          </div>

          <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Lineas</h3>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2 px-3">Producto</th>
                <th className="text-center py-2 px-3">Cantidad</th>
                <th className="text-right py-2 px-3">Precio Unit.</th>
                <th className="text-center py-2 px-3">Dto. %</th>
                <th className="text-right py-2 px-3">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {selectedFactura.lineas.map((l, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-3">{l.producto_nombre}</td>
                  <td className="py-2 px-3 text-center">{l.cantidad}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(l.precio_unitario, selectedFactura.moneda)}</td>
                  <td className="py-2 px-3 text-center">{l.descuento}%</td>
                  <td className="py-2 px-3 text-right font-medium">{formatCurrency(l.subtotal, selectedFactura.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{formatCurrency(selectedFactura.subtotal, selectedFactura.moneda)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Descuento:</span><span>{formatCurrency(selectedFactura.descuento, selectedFactura.moneda)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Impuestos:</span><span>{formatCurrency(selectedFactura.impuestos, selectedFactura.moneda)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>{formatCurrency(selectedFactura.total, selectedFactura.moneda)}</span></div>
              <div className="flex justify-between text-red-600 font-medium"><span>Saldo:</span><span>{formatCurrency(selectedFactura.saldo, selectedFactura.moneda)}</span></div>
            </div>
          </div>

          {/* Bloque Medios de Pago */}
          <BloquesMediosPago
            key={selectedFactura.id}
            factura={selectedFactura}
            onConfirmarCobro={(lineasPago, totalConRecargos, totalRecargos) => {
              const fechaHoy = new Date().toISOString()
              // Generar un movimiento por cada línea de pago
              const nuevosMovimientos: MovimientoCuentaCorriente[] = lineasPago
                .filter(l => l.monto > 0)
                .map((l, i) => {
                  const esTarjeta = l.medio === "tarjeta"
                  const tarjetaInfo = tarjetasIniciales.find(t => t.id === l.tarjeta_id)
                  const recCalc = esTarjeta && l.tarjeta_id
                    ? (() => {
                        const hoy = new Date()
                        const diasKeys = ["dom","lun","mar","mie","jue","vie","sab"] as const
                        const diaKey = diasKeys[hoy.getDay()]
                        const rec = recargosIniciales.find(r =>
                          r.tarjeta_id === l.tarjeta_id && r.activo &&
                          (l.cuotas||1) >= r.desde_cuota && (l.cuotas||1) <= r.hasta_cuota && r.dias[diaKey]
                        )
                        return rec
                      })()
                    : null
                  const importeRecargo = recCalc ? l.monto * (recCalc.recargo_pct / 100) : 0
                  const grupo = recCalc ? gruposIniciales.find(g => g.id === recCalc.grupo_id) : null
                  const cargosImporte = grupo ? grupo.cargos.reduce((s, c) => s + l.monto * (c.arancel / 100), 0) : 0
                  const totalLinea = l.monto + importeRecargo + cargosImporte
                  const saldoAnterior = clientes.find(c => c.id === selectedFactura.cliente_id)?.saldo_cuenta_corriente || 0

                  return {
                    id: movimientosCC.length + i + 1,
                    cliente_id: selectedFactura.cliente_id,
                    fecha: fechaHoy,
                    tipo: "credito" as const,
                    concepto: esTarjeta
                      ? `Pago con tarjeta — ${tarjetaInfo?.nombre} ${l.cuotas && l.cuotas > 1 ? `${l.cuotas} cuotas` : "1 cuota"}`
                      : l.medio === "transferencia" ? "Pago por transferencia" : "Pago en efectivo",
                    documento_tipo: "recibo" as const,
                    documento_numero: selectedFactura.numero,
                    documento_id: selectedFactura.id,
                    moneda: selectedFactura.moneda,
                    importe: totalLinea,
                    saldo_posterior: saldoAnterior - totalLinea,
                    // Campos bancarización
                    bancarizado: esTarjeta || l.medio === "transferencia",
                    tarjeta_nombre: tarjetaInfo?.nombre,
                    cuotas: l.cuotas,
                    monto_base: l.monto,
                    recargo_aplicado: importeRecargo + cargosImporte,
                  } as MovimientoCuentaCorriente
                })
              setMovimientosCC(prev => [...prev, ...nuevosMovimientos])
              // Actualizar saldo del cliente
              const totalCreditado = lineasPago.reduce((s, l) => s + l.monto, 0)
              setClientes(prev => prev.map(c =>
                c.id === selectedFactura.cliente_id
                  ? { ...c, saldo_cuenta_corriente: c.saldo_cuenta_corriente - totalCreditado }
                  : c
              ))
              // Marcar factura como pagada si el saldo queda en 0
              setFacturas(prev => prev.map(f =>
                f.id === selectedFactura.id
                  ? { ...f, saldo: Math.max(0, (f.saldo || 0) - totalCreditado), estado: Math.max(0, (f.saldo || 0) - totalCreditado) <= 0 ? "pagada" as const : f.estado }
                  : f
              ))
            }}
            onEstadoPagoChange={(estado) => setFichaEstadoPago(estado)}
          />

          {/* Seguimiento */}
          <SeguimientoPanel seguimiento={selectedFactura.seguimiento || []} />
        </div>
      </div>

      {/* Modal de validación medios de pago — fuera del scroll container */}
      {fichaModalValidacionMsg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">No se puede confirmar la factura</h3>
                <p className="text-sm text-gray-600">{fichaModalValidacionMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setFichaModalValidacionMsg(null)}
              className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Cancelar Factura */}
      {showCancelarFacturaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Cancelar Factura</h3>
              <button onClick={() => setShowCancelarFacturaModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Cancelación <span className="text-red-500">*</span></label>
                <select 
                  value={cancelarFacturaMotivo}
                  onChange={(e) => setCancelarFacturaMotivo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="Error en datos">Error en datos</option>
                  <option value="Cliente solicitó cancelación">Cliente solicitó cancelación</option>
                  <option value="Duplicada">Duplicada</option>
                  <option value="Producto no disponible">Producto no disponible</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
                <textarea 
                  value={cancelarFacturaDescripcion}
                  onChange={(e) => setCancelarFacturaDescripcion(e.target.value)}
                  placeholder="Describa el motivo de la cancelación..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button 
                onClick={() => setShowCancelarFacturaModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Volver
              </button>
              <button 
                onClick={() => {
                  if (!cancelarFacturaMotivo || !cancelarFacturaDescripcion.trim()) {
                    alert("Debe completar el motivo y la descripción para cancelar la factura")
                    return
                  }
                  const fechaHoy = new Date().toISOString()
                  const clienteFactura = clientes.find(c => c.id === selectedFactura.cliente_id)
                  
                  // Revertir movimiento de cuenta corriente si la factura estaba abierta
                  if (selectedFactura.estado === 'abierta' && clienteFactura) {
                    const saldoAnterior = clienteFactura.saldo_cuenta_corriente
                    const nuevoMovimiento: MovimientoCuentaCorriente = {
                      id: movimientosCC.length + 1,
                      cliente_id: clienteFactura.id,
                      fecha: fechaHoy,
                      tipo: "credito",
                      concepto: `Cancelación de factura`,
                      documento_tipo: "factura",
                      documento_numero: selectedFactura.numero,
                      documento_id: selectedFactura.id,
                      moneda: selectedFactura.moneda,
                      importe: selectedFactura.total,
                      saldo_posterior: saldoAnterior - selectedFactura.total
                    }
                    setMovimientosCC(prev => [...prev, nuevoMovimiento])
                    
                    // Actualizar saldo del cliente
                    setClientes(prev => prev.map(c =>
                      c.id === clienteFactura.id ? {
                        ...c,
                        saldo_cuenta_corriente: c.saldo_cuenta_corriente - selectedFactura.total
                      } : c
                    ))
                  }
                  
                  const updatedFactura = {
                    ...selectedFactura,
                    estado: "cancelada" as const,
                    saldo: 0,
                    seguimiento: [
                      ...(selectedFactura.seguimiento || []),
                      {
                        id: (selectedFactura.seguimiento?.length || 0) + 1,
                        fecha: fechaHoy,
                        usuario: "Max Solina",
                        tipo: "cancelacion" as const,
                        descripcion: `Factura cancelada. Motivo: ${cancelarFacturaMotivo}. ${cancelarFacturaDescripcion.trim()}`
                      }
                    ]
                  }
                  setFacturas(prev => prev.map(f => f.id === selectedFactura.id ? updatedFactura : f))
                  setSelectedFactura(updatedFactura)
                  setShowCancelarFacturaModal(false)
                  setCancelarFacturaMotivo("")
                  setCancelarFacturaDescripcion("")
                }}
                disabled={!cancelarFacturaMotivo || !cancelarFacturaDescripcion.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    )
  }

  // Facturas
  const renderFacturas = () => {
    if (selectedFactura) return renderFichaFactura()
    if (creandoFactura) return renderCrearFactura()
    
    return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Facturas</h1>
        <button
          onClick={() => { setCreandoFactura(true); setFacturaClienteId(null); setFacturaLineas([]) }}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Factura
        </button>
      </div>

      <div className="mb-4">
        <OdooFilterBar
          moduleName="facturas-venta"
          filterOptions={[
            { field: "estado", label: "Estado", values: [
              { value: "borrador", label: "Borrador" },
              { value: "abierta", label: "Abierta" },
              { value: "conciliada", label: "Conciliada" },
            ]},
            { field: "moneda", label: "Moneda", values: [
              { value: "ARS", label: "ARS" },
              { value: "USD", label: "USD" },
            ]},
          ]}
          groupByOptions={[
            { id: "estado", label: "Estado", field: "estado" },
            { id: "cliente", label: "Cliente", field: "cliente" },
            { id: "moneda", label: "Moneda", field: "moneda" },
          ]}
          activeFilters={activeFiltersFacturas}
          activeGroupBy={activeGroupByFacturas}
          searchTerm={searchQuery}
          onFiltersChange={setActiveFiltersFacturas}
          onGroupByChange={setActiveGroupByFacturas}
          onSearchChange={setSearchQuery}
          savedFilters={savedFiltersFacturas}
          {...makeSavedFilterHandlers(setSavedFiltersFacturas, setActiveFiltersFacturas, setActiveGroupByFacturas, setSearchQuery)}
          totalCount={facturas.length}
          filteredCount={facturas.filter(f => {
            const q = searchQuery.toLowerCase()
            const matchSearch = !q || f.numero.toLowerCase().includes(q) || f.cliente_nombre.toLowerCase().includes(q)
            const matchEstado = !activeFiltersFacturas.find(af => af.field === "estado") || activeFiltersFacturas.some(af => af.field === "estado" && af.value === f.estado)
            return matchSearch && matchEstado
          }).length}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nota de Venta</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map(factura => (
              <tr 
                key={factura.id} 
                onClick={() => setSelectedFactura(factura)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{factura.numero}</td>
                <td className="py-3 px-4">
                  <p className="text-sm font-medium">{factura.cliente_nombre}</p>
                  <p className="text-xs text-gray-500">{factura.cliente_documento}</p>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{formatDate(factura.fecha)}</td>
                <td className="py-3 px-4 text-sm text-blue-600">{factura.nota_venta_numero}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoFacturaColor(factura.estado)}`}>
                    {factura.estado === "borrador" ? "Borrador" : factura.estado === "abierta" ? "Abierta" : "Conciliada"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-sm font-medium">{factura.moneda}</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(factura.total, factura.moneda)}</td>
                <td className="py-3 px-4 text-right">
                  <span className={factura.saldo > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                    {formatCurrency(factura.saldo, factura.moneda)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {facturas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron facturas
          </div>
        )}
      </div>
    </div>
    )
  }

  // Vista de previsualización de Recibo
  const renderPrevisualizacionRecibo = () => {
    const clienteSeleccionado = clientes.find(c => c.id === reciboClienteIdForm)
    const facturaVinculada = reciboFacturaIdForm ? facturas.find(f => f.id === reciboFacturaIdForm) : null
    const totalPagos = reciboPagosForm.reduce((sum, p) => sum + p.importe, 0)

    return (
      <div>
        {/* Header con breadcrumb - muestra documento origen si existe */}
        <div className="text-sm text-gray-500 mb-2">
          {facturaVinculada ? (
            <>
              <button 
                onClick={() => { setReciboPrevisualizando(false); setCreandoRecibo(false); setSelectedFactura(facturaVinculada); setActiveView("facturas") }}
                className="hover:text-emerald-700"
              >
                Facturas
              </button>
              <span> / </span>
              <button 
                onClick={() => { setReciboPrevisualizando(false); setCreandoRecibo(false); setSelectedFactura(facturaVinculada); setActiveView("facturas") }}
                className="hover:text-emerald-700 text-emerald-600"
              >
                {facturaVinculada.numero}
              </button>
              <span> / </span>
              <span className="text-gray-700">Nuevo Recibo</span>
            </>
          ) : (
            <>Recibos / <span className="text-gray-700">Nuevo Recibo</span></>
          )}
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setReciboPrevisualizando(false)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-emerald-900">Nuevo Recibo</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-AR')} | Puerto Norte</p>
          </div>
          <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
            Borrador
          </span>
        </div>

        {/* Barra de acciones oscura */}
        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center mb-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                // Guardar recibo como borrador
                if (!clienteSeleccionado || reciboPagosForm.length === 0) {
                  alert("Debe seleccionar un cliente y agregar al menos un pago")
                  return
                }

                const reciboNumero = `RC X Norte-000${11735 + recibos.length}`
                const reciboId = recibos.length + 1
                const fechaHoy = new Date().toISOString()

                const newRecibo: Recibo = {
                  id: reciboId,
                  numero: reciboNumero,
                  cliente_id: clienteSeleccionado.id,
                  cliente_nombre: clienteSeleccionado.nombre,
                  estado: "borrador",
                  fecha: fechaHoy,
                  importe: totalPagos,
                  importe_no_conciliado: totalPagos,
                  moneda: "ARS",
                  sucursal: "Puerto Norte",
                  caja: "Caja Principal",
                  cobrador_nombre: vendedores[0]?.nombre || "Max Solina",
                  nota_venta_numero: facturaVinculada?.nota_venta_numero || null,
                  concepto: facturaVinculada ? `Cobro Factura ${facturaVinculada.numero}` : "Cobro de venta",
                  pagos: reciboPagosForm,
                  factura_id: facturaVinculada?.id
                }
                setRecibos(prev => [...prev, newRecibo])

                setCreandoRecibo(false)
                setReciboPrevisualizando(false)
                setReciboClienteIdForm(null)
                // Mantener los pagos para que se muestren en la ficha del borrador
                setReciboPagosForm(reciboPagosForm)
                setReciboFacturaIdForm(null)
                setReciboMontoForm(0)
                setSelectedRecibo(newRecibo)
              }}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
            <button 
              onClick={() => {
                // Crear recibo confirmado
                if (!clienteSeleccionado || reciboPagosForm.length === 0) {
                  alert("Debe seleccionar un cliente y agregar al menos un pago")
                  return
                }

                const reciboNumero = `RC X Norte-000${11735 + recibos.length}`
                const reciboId = recibos.length + 1
                const fechaHoy = new Date().toISOString()

                const newRecibo: Recibo = {
                  id: reciboId,
                  numero: reciboNumero,
                  cliente_id: clienteSeleccionado.id,
                  cliente_nombre: clienteSeleccionado.nombre,
                  estado: "confirmado",
                  fecha: fechaHoy,
                  importe: totalPagos,
                  importe_no_conciliado: totalPagos,
                  moneda: "ARS",
                  sucursal: "Puerto Norte",
                  caja: "Caja Principal",
                  cobrador_nombre: vendedores[0]?.nombre || "Max Solina",
                  nota_venta_numero: facturaVinculada?.nota_venta_numero || null,
                  concepto: facturaVinculada ? `Cobro Factura ${facturaVinculada.numero}` : "Cobro de venta",
                  pagos: reciboPagosForm,
                  factura_id: facturaVinculada?.id
                }
                setRecibos(prev => [...prev, newRecibo])

                // Crear movimiento de credito
                const saldoAnterior = clienteSeleccionado.saldo_cuenta_corriente
                const nuevoMovimiento: MovimientoCuentaCorriente = {
                  id: movimientosCC.length + 1,
                  cliente_id: clienteSeleccionado.id,
                  fecha: fechaHoy,
                  tipo: "credito",
                  concepto: facturaVinculada ? `Pago Factura ${facturaVinculada.numero}` : "Pago recibido",
                  documento_tipo: "recibo",
                  documento_numero: reciboNumero,
                  documento_id: reciboId,
                  moneda: "ARS",
                  importe: totalPagos,
                  saldo_posterior: saldoAnterior - totalPagos
                }
                setMovimientosCC(prev => [...prev, nuevoMovimiento])

                // Actualizar saldo del cliente
                setClientes(prev => prev.map(c =>
                  c.id === clienteSeleccionado.id ? {
                    ...c,
                    saldo_cuenta_corriente: c.saldo_cuenta_corriente - totalPagos
                  } : c
                ))

                // Actualizar factura si está vinculada
                if (facturaVinculada) {
                  setFacturas(prev => prev.map(f =>
                    f.id === facturaVinculada.id ? {
                      ...f,
                      saldo: f.saldo - totalPagos,
                      estado: f.saldo - totalPagos <= 0 ? "pagada" : f.estado
                    } : f
                  ))
                }

                setCreandoRecibo(false)
                setReciboPrevisualizando(false)
                setReciboClienteIdForm(null)
                setReciboPagosForm([])
                setReciboFacturaIdForm(null)
                setReciboMontoForm(0)
                setSelectedRecibo(newRecibo)
              }}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Confirmar Recibo
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-b-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Datos del Cliente */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium">{clienteSeleccionado?.nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Documento:</span>
                  <span className="ml-2 font-medium">{clienteSeleccionado?.tipo_documento}: {clienteSeleccionado?.numero_documento}</span>
                </div>
                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium text-emerald-600">{clienteSeleccionado?.telefono || clienteSeleccionado?.celular || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium text-emerald-600">{clienteSeleccionado?.email || "-"}</span>
                </div>
              </div>
            </div>

            {/* Datos del Recibo */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Datos del Recibo</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Sucursal:</span>
                  <span className="ml-2 font-medium">Puerto Norte</span>
                </div>
                <div>
                  <span className="text-gray-500">Cobrador:</span>
                  <span className="ml-2 font-medium">Max Solina</span>
                </div>
                <div>
                  <span className="text-gray-500">Caja:</span>
                  <span className="ml-2 font-medium">Caja Principal</span>
                </div>
                {facturaVinculada && (
                  <div>
                    <span className="text-gray-500">Factura:</span>
                    <span className="ml-2 font-medium text-emerald-600">{facturaVinculada.numero}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Pagos ({reciboPagosForm.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2">Forma de Pago</th>
                  <th className="text-center py-2 w-24">Moneda</th>
                  <th className="text-right py-2 w-32">Importe</th>
                </tr>
              </thead>
              <tbody>
                {reciboPagosForm.map((pago, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 font-medium">{pago.forma_pago}</td>
                    <td className="py-2 text-center">{pago.moneda}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(pago.importe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              {facturaVinculada && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Saldo Factura:</span>
                  <span>{formatCurrency(facturaVinculada.saldo)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Recibo:</span>
                <span className="text-emerald-700">{formatCurrency(totalPagos)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de Crear Recibo
  const renderCrearRecibo = () => {
    const clienteSeleccionado = clientes.find(c => c.id === reciboClienteIdForm)
    const totalPagos = reciboPagosForm.reduce((sum, p) => sum + p.importe, 0)

    // Si estamos en previsualización, mostrar vista previa
    if (reciboPrevisualizando) {
      return renderPrevisualizacionRecibo()
    }

    const handleCrearRecibo = () => {
      if (!clienteSeleccionado || reciboPagosForm.length === 0) {
        alert("Debe seleccionar un cliente y agregar al menos un pago")
        return
      }

      const reciboNumero = `RC X Norte-000${11735 + recibos.length}`
      const reciboId = recibos.length + 1
      const fechaHoy = new Date().toISOString()

      const newRecibo: Recibo = {
        id: reciboId,
        numero: reciboNumero,
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        estado: "borrador",
        fecha: fechaHoy,
        importe: totalPagos,
        importe_no_conciliado: totalPagos,
        moneda: "ARS",
        sucursal: "Puerto Norte",
        caja: "Caja Principal",
        cobrador_nombre: vendedores[0]?.nombre || "Max Solina",
        nota_venta_numero: null,
        concepto: "Cobro de venta",
        pagos: reciboPagosForm
      }
      setRecibos(prev => [...prev, newRecibo])

      // Crear movimiento de credito
      const saldoAnterior = clienteSeleccionado.saldo_cuenta_corriente
      const nuevoMovimiento: MovimientoCuentaCorriente = {
        id: movimientosCC.length + 1,
        cliente_id: clienteSeleccionado.id,
        fecha: fechaHoy,
        tipo: "credito",
        concepto: "Pago recibido",
        documento_tipo: "recibo",
        documento_numero: reciboNumero,
        documento_id: reciboId,
        moneda: "ARS",
        importe: totalPagos,
        saldo_posterior: saldoAnterior - totalPagos
      }
      setMovimientosCC(prev => [...prev, nuevoMovimiento])

      // Actualizar saldo del cliente
      setClientes(prev => prev.map(c =>
        c.id === clienteSeleccionado.id ? {
          ...c,
          saldo_cuenta_corriente: c.saldo_cuenta_corriente - totalPagos
        } : c
      ))

      // Abrir el recibo creado en modo edición
      setCreandoRecibo(false)
      setReciboClienteIdForm(null)
      // Mantener los pagos en el form ya que el recibo está en borrador
      setReciboPagosForm(reciboPagosForm.map(p => ({ forma_pago: p.forma_pago, importe: p.importe, moneda: p.moneda })))
      setSelectedRecibo(newRecibo)
      setEditandoRecibo(true)
    }

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => { setCreandoRecibo(false); setReciboClienteIdForm(null); setReciboPagosForm([]) }} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Nuevo Recibo</h1>
            <p className="text-sm text-gray-500">Registre el pago del cliente</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
              <select
                value={reciboClienteIdForm || ""}
                onChange={(e) => setReciboClienteIdForm(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
              {clienteSeleccionado && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{clienteSeleccionado.tipo_documento}: {clienteSeleccionado.numero_documento}</span></div>
                    <div><span className="text-gray-500">Saldo Actual:</span> <span className={`font-bold ${clienteSeleccionado.saldo_cuenta_corriente > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(clienteSeleccionado.saldo_cuenta_corriente)}</span></div>
                  </div>
                </div>
              )}

              {/* Créditos sin conciliar del cliente (recibos + notas de crédito) */}
              {clienteSeleccionado && (() => {
                const recibosSinConciliar = recibos.filter(
                  r => r.cliente_id === clienteSeleccionado.id && r.importe_no_conciliado > 0
                )
                const ncSinConciliar = ajustes.filter(
                  a => a.cliente_id === clienteSeleccionado.id &&
                       a.estado === "publicado" &&
                       a.numero.startsWith("NC-") &&
                       a.total > 0
                ).map(a => ({ id: a.id, numero: a.numero, fecha: a.fecha, disponible: a.total, esNC: true, ajuste: a }))

                const totalItems = recibosSinConciliar.length + ncSinConciliar.length
                if (totalItems === 0) return null

                const totalAFavor =
                  recibosSinConciliar.reduce((s, r) => s + r.importe_no_conciliado, 0) +
                  ncSinConciliar.reduce((s, nc) => s + nc.disponible, 0)

                return (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-sm font-semibold text-amber-800">Creditos disponibles</span>
                        <span className="text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-medium">{totalItems}</span>
                      </div>
                      <span className="text-sm font-bold text-amber-800">Total a favor: {formatCurrency(totalAFavor)}</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-amber-700 uppercase border-b border-amber-200">
                          <th className="text-left py-2 px-4">Comprobante</th>
                          <th className="text-left py-2 px-4">Fecha</th>
                          <th className="text-left py-2 px-4">Categoría</th>
                          <th className="text-right py-2 px-4">Disponible</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recibosSinConciliar.map(r => (
                          <tr key={`r-${r.id}`} className="border-b border-amber-100 last:border-0">
                            <td className="py-2 px-4 font-medium text-amber-900">{r.numero}</td>
                            <td className="py-2 px-4 text-amber-700">{new Date(r.fecha).toLocaleDateString('es-AR')}</td>
                            <td className="py-2 px-4 text-amber-700">—</td>
                            <td className="py-2 px-4 text-right font-bold text-green-700">{formatCurrency(r.importe_no_conciliado)}</td>
                          </tr>
                        ))}
                        {ncSinConciliar.map(nc => (
                          <tr key={`nc-${nc.id}`} onClick={() => setNcDetallePopup(nc.ajuste)} className="border-b border-amber-100 last:border-0 bg-emerald-50/40 cursor-pointer hover:bg-emerald-100/60">
                            <td className="py-2 px-4 font-medium text-emerald-800">
                              <span className="text-xs bg-emerald-100 text-emerald-700 rounded px-1 mr-1">NC</span>
                              {nc.numero}
                            </td>
                            <td className="py-2 px-4 text-amber-700">{new Date(nc.fecha).toLocaleDateString('es-AR')}</td>
                            <td className="py-2 px-4">
                              {nc.ajuste?.categoria
                                ? <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded">{nc.ajuste.categoria.charAt(0).toUpperCase() + nc.ajuste.categoria.slice(1)}</span>
                                : <span className="text-amber-600 text-xs">—</span>}
                            </td>
                            <td className="py-2 px-4 text-right font-bold text-green-700">{formatCurrency(nc.disponible)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900">Formas de Pago</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-3">Forma de Pago</th>
                    <th className="text-left py-2 px-3 w-32">Moneda</th>
                    <th className="text-right py-2 px-3 w-40">Importe</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {reciboPagosForm.map((pago, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">
                        <select value={pago.forma_pago} onChange={(e) => {
                          const updated = [...reciboPagosForm]
                          updated[index].forma_pago = e.target.value
                          setReciboPagosForm(updated)
                        }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                          <option value="Efectivo">Efectivo</option>
                          <option value="Transferencia">Transferencia Bancaria</option>
                          <option value="Tarjeta Debito">Tarjeta Debito</option>
                          <option value="Tarjeta Credito">Tarjeta Credito</option>
                          <option value="Cheque">Cheque</option>
                          <option value="MercadoPago">MercadoPago</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select value={pago.moneda} onChange={(e) => {
                          const updated = [...reciboPagosForm]
                          updated[index].moneda = e.target.value as "ARS" | "USD"
                          setReciboPagosForm(updated)
                        }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={pago.importe} min="0" step="0.01"
                          onChange={(e) => {
                            const updated = [...reciboPagosForm]
                            updated[index].importe = parseFloat(e.target.value) || 0
                            setReciboPagosForm(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-3">
                        <button onClick={() => setReciboPagosForm(reciboPagosForm.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Botón agregar pago siempre al final */}
                  <tr>
                    <td colSpan={4} className="py-3 px-3">
                      <button
                        onClick={() => setReciboPagosForm([...reciboPagosForm, { forma_pago: "Efectivo", importe: 0, moneda: "ARS" }])}
                        className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Agregar Pago
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Total a Cobrar</h3>
              <p className="text-3xl font-bold text-emerald-700">{formatCurrency(totalPagos)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-3">
                <button onClick={handleCrearRecibo} disabled={!reciboClienteIdForm || reciboPagosForm.length === 0 || totalPagos <= 0}
                  className="w-full bg-emerald-700 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                  Continuar
                </button>
                <button onClick={() => { setCreandoRecibo(false); setReciboClienteIdForm(null); setReciboPagosForm([]) }}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Ficha de Recibo
  const renderFichaRecibo = () => {
    if (!selectedRecibo) return null
    const clienteRecibo = clientes.find(c => c.id === selectedRecibo.cliente_id)
    const nvVinculada = notasVenta.find(nv => nv.numero === selectedRecibo.nota_venta_numero)
    const facturaVinculada = selectedRecibo.factura_id ? facturas.find(f => f.id === selectedRecibo.factura_id) : null
    
    // Construir cadena de documentos vinculados
    const documentosVinculados: {tipo: string; numero: string; onClick: () => void}[] = []
    if (nvVinculada) {
      documentosVinculados.push({
        tipo: "NV",
        numero: nvVinculada.numero,
        onClick: () => { setSelectedRecibo(null); setSelectedNV(nvVinculada); setActiveView("notas_venta") }
      })
      // Buscar OE vinculada
      const oeVinculada = ordenesEntrega.find(oe => oe.nota_venta_id === nvVinculada.id)
      if (oeVinculada) {
        documentosVinculados.push({
          tipo: "OE",
          numero: oeVinculada.numero,
          onClick: () => { setSelectedRecibo(null); setSelectedOE(oeVinculada); setActiveView("ordenes_entrega") }
        })
        // Buscar Remito vinculado
        const remitoVinculado = remitos.find(r => r.orden_entrega_id === oeVinculada.id)
        if (remitoVinculado) {
          documentosVinculados.push({
            tipo: "REM",
            numero: remitoVinculado.numero,
            onClick: () => { setSelectedRecibo(null); setSelectedRemito(remitoVinculado); setActiveView("remitos") }
          })
        }
      }
    }
    if (facturaVinculada) {
      documentosVinculados.push({
        tipo: "FAC",
        numero: facturaVinculada.numero,
        onClick: () => { setSelectedRecibo(null); setSelectedFactura(facturaVinculada); setActiveView("facturas") }
      })
    }

    return (
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => { setSelectedRecibo(null); setEditandoRecibo(false) }} className="hover:text-emerald-700">Recibos</button>
          {documentosVinculados.length > 0 && (
            <>
              <span>/</span>
              {documentosVinculados.map((doc, idx) => (
                <span key={idx} className="flex items-center gap-2">
                  <button onClick={doc.onClick} className="hover:text-emerald-700 text-emerald-600">{doc.tipo}</button>
                  {idx < documentosVinculados.length - 1 && <span>/</span>}
                </span>
              ))}
            </>
          )}
          <span>/</span>
          <span className="font-medium text-gray-900">{selectedRecibo.numero}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
<BotonVolver onClick={() => { setSelectedRecibo(null); setEditandoRecibo(false) }} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{selectedRecibo.numero}</h1>
              <p className="text-sm text-gray-500">{formatDateTime(selectedRecibo.fecha)} | {selectedRecibo.sucursal}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedRecibo.estado === "borrador" && !editandoRecibo && (
              <button 
                onClick={() => {
                  setEditandoRecibo(true)
                  setReciboPagosForm(selectedRecibo.pagos.map(p => ({ forma_pago: p.forma_pago, importe: p.importe, moneda: p.moneda })))
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
            <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1">
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              selectedRecibo.estado === 'publicado' ? 'bg-green-100 text-green-700' : 
              selectedRecibo.estado === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {selectedRecibo.estado === 'publicado' ? 'Publicado' : selectedRecibo.estado === 'cancelado' ? 'Cancelado' : 'Borrador'}
            </span>
          </div>
        </div>

        {(editandoRecibo || selectedRecibo.estado === "publicado" || selectedRecibo.estado === "cancelado") && (
        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            {selectedRecibo.estado === "publicado" && (
              <button 
                onClick={() => {
                  setCancelarReciboMotivo("")
                  setCancelarReciboDescripcion("")
                  setShowCancelarReciboModal(true)
                }}
                className="px-3 py-1.5 text-sm border border-gray-400 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> Cancelar Recibo
              </button>
            )}
          </div>
          {selectedRecibo.estado === "borrador" && (
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const totalPagos = reciboPagosForm.reduce((sum, p) => sum + p.importe, 0)
                  const updatedRecibo = { 
                    ...selectedRecibo, 
                    pagos: [...reciboPagosForm], 
                    importe: totalPagos,
                    total: totalPagos,
                    importe_no_conciliado: totalPagos
                  }
                  setRecibos(prev => prev.map(r => r.id === selectedRecibo.id ? updatedRecibo : r))
                  setSelectedRecibo(updatedRecibo)
                  setEditandoRecibo(false)
                }}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
              >
                <Save className="w-4 h-4" /> Guardar Cambios
              </button>
              <button 
                onClick={() => {
                  if (reciboPagosForm.length === 0) {
                    alert("Debe agregar al menos una forma de pago antes de confirmar")
                    return
                  }
                  const totalPagos = reciboPagosForm.reduce((sum, p) => sum + p.importe, 0)
                  const updatedRecibo = { 
                    ...selectedRecibo, 
                    pagos: reciboPagosForm, 
                    importe: totalPagos,
                    total: totalPagos,
                    importe_no_conciliado: totalPagos,
                    estado: "publicado" as const
                  }
                  setRecibos(recibos.map(r => r.id === selectedRecibo.id ? updatedRecibo : r))
                  setSelectedRecibo(updatedRecibo)
                }}
                disabled={reciboPagosForm.length === 0}
                className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center gap-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" /> Confirmar
              </button>
            </div>
          )}
        </div>
        )}

        <div className={`bg-white ${editandoRecibo || selectedRecibo.estado === "publicado" || selectedRecibo.estado === "cancelado" ? "rounded-b-lg" : "rounded-lg"} shadow-sm p-6`}>
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Datos del Recibo</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Numero:</span> <span className="font-medium">{selectedRecibo.numero}</span></div>
                <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{formatDate(selectedRecibo.fecha)}</span></div>
                <div><span className="text-gray-500">NV:</span> <span className="font-medium text-emerald-700">{selectedRecibo.nota_venta_numero || "-"}</span></div>
                <div><span className="text-gray-500">Cobrador:</span> <span className="font-medium">{selectedRecibo.cobrador_nombre}</span></div>
                <div><span className="text-gray-500">Caja:</span> <span className="font-medium">{selectedRecibo.caja}</span></div>
                <div><span className="text-gray-500">Sucursal:</span> <span className="font-medium">{selectedRecibo.sucursal}</span></div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Cliente</h3>
              {clienteRecibo && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Nombre:</span> <span className="font-medium">{clienteRecibo.nombre}</span></div>
                  <div><span className="text-gray-500">Documento:</span> <span className="font-medium">{clienteRecibo.tipo_documento}: {clienteRecibo.numero_documento}</span></div>
                  <div><span className="text-gray-500">Telefono:</span> <span className="font-medium">{clienteRecibo.telefono || clienteRecibo.celular || "-"}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-medium">{clienteRecibo.email || "-"}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Créditos sin conciliar del cliente */}
          {clienteRecibo && (() => {
            const recibosSinConciliar = recibos.filter(
              r => r.cliente_id === clienteRecibo.id &&
                   r.id !== selectedRecibo.id &&
                   r.importe_no_conciliado > 0
            )
            const ncSinConciliar = ajustes.filter(
              a => a.cliente_id === clienteRecibo.id &&
                   a.estado === "publicado" &&
                   a.numero.startsWith("NC-") &&
                   a.total > 0
            ).map(a => ({ id: a.id, numero: a.numero, fecha: a.fecha, disponible: a.total, ajuste: a }))

            const totalItems = recibosSinConciliar.length + ncSinConciliar.length
            if (totalItems === 0) return null

            const totalAFavor =
              recibosSinConciliar.reduce((s, r) => s + r.importe_no_conciliado, 0) +
              ncSinConciliar.reduce((s, nc) => s + nc.disponible, 0)

            return (
              <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden mb-4">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-semibold text-amber-800">Creditos disponibles</span>
                    <span className="text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 font-medium">{totalItems}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-800">Total a favor: {formatCurrency(totalAFavor)}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-amber-700 uppercase border-b border-amber-200">
                      <th className="text-left py-2 px-4">Comprobante</th>
                      <th className="text-left py-2 px-4">Fecha</th>
                      <th className="text-left py-2 px-4">Categoría</th>
                      <th className="text-right py-2 px-4">Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recibosSinConciliar.map(r => (
                      <tr key={`r-${r.id}`} className="border-b border-amber-100 last:border-0">
                        <td className="py-2 px-4 font-medium text-amber-900">{r.numero}</td>
                        <td className="py-2 px-4 text-amber-700">{new Date(r.fecha).toLocaleDateString('es-AR')}</td>
                        <td className="py-2 px-4 text-amber-700">—</td>
                        <td className="py-2 px-4 text-right font-bold text-green-700">{formatCurrency(r.importe_no_conciliado)}</td>
                      </tr>
                    ))}
                    {ncSinConciliar.map(nc => (
                      <tr key={`nc-${nc.id}`} onClick={() => setNcDetallePopup(nc.ajuste)} className="border-b border-amber-100 last:border-0 bg-emerald-50/40 cursor-pointer hover:bg-emerald-100/60">
                        <td className="py-2 px-4 font-medium text-emerald-800">
                          <span className="text-xs bg-emerald-100 text-emerald-700 rounded px-1 mr-1">NC</span>
                          {nc.numero}
                        </td>
                        <td className="py-2 px-4 text-amber-700">{new Date(nc.fecha).toLocaleDateString('es-AR')}</td>
                        <td className="py-2 px-4">
                          {nc.ajuste?.categoria
                            ? <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded">{nc.ajuste.categoria.charAt(0).toUpperCase() + nc.ajuste.categoria.slice(1)}</span>
                            : <span className="text-amber-600 text-xs">—</span>}
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-green-700">{formatCurrency(nc.disponible)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          <div className="border-b pb-2 mb-4">
            <h3 className="font-semibold text-gray-900">Formas de Pago</h3>
          </div>
          
          {selectedRecibo.estado === "borrador" ? (
            <>
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Forma de Pago</th>
                  <th className="text-left py-2 px-3 w-32">Moneda</th>
                  <th className="text-right py-2 px-3 w-40">Importe</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {reciboPagosForm.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-500 text-sm">Sin formas de pago. Agregue una.</td></tr>
                ) : reciboPagosForm.map((pago, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">
                      <select value={pago.forma_pago} onChange={(e) => {
                        const updated = [...reciboPagosForm]
                        updated[index].forma_pago = e.target.value
                        setReciboPagosForm(updated)
                      }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia Bancaria</option>
                        <option value="Tarjeta Debito">Tarjeta Debito</option>
                        <option value="Tarjeta Credito">Tarjeta Credito</option>
                        <option value="Cheque">Cheque</option>
                        <option value="MercadoPago">MercadoPago</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select value={pago.moneda} onChange={(e) => {
                        const updated = [...reciboPagosForm]
                        updated[index].moneda = e.target.value as "ARS" | "USD"
                        setReciboPagosForm(updated)
                      }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" value={pago.importe} min="0" step="0.01"
                        onChange={(e) => {
                          const updated = [...reciboPagosForm]
                          updated[index].importe = parseFloat(e.target.value) || 0
                          setReciboPagosForm(updated)
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="py-2 px-3">
                      <button onClick={() => setReciboPagosForm(reciboPagosForm.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setReciboPagosForm([...reciboPagosForm, { forma_pago: "Efectivo", importe: 0, moneda: "ARS" }])}
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 mb-4"
            >
              <Plus className="w-4 h-4" /> Agregar Pago
            </button>
          </>
          ) : (
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Forma de Pago</th>
                  <th className="text-center py-2 px-3">Moneda</th>
                  <th className="text-right py-2 px-3">Importe</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecibo.pagos.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-500 text-sm">Sin formas de pago registradas</td></tr>
                ) : selectedRecibo.pagos.map((p, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-3">{p.forma_pago}</td>
                    <td className="py-2 px-3 text-center">{p.moneda}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(p.importe, p.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span className="text-green-600">{formatCurrency(selectedRecibo.importe, selectedRecibo.moneda)}</span></div>
              <div className="flex justify-between text-gray-500"><span>No Conciliado:</span><span>{formatCurrency(selectedRecibo.importe_no_conciliado, selectedRecibo.moneda)}</span></div>
            </div>
          </div>

          {/* Cancelación si existe */}
          {selectedRecibo.cancelacion && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-red-800">Recibo Cancelado</span>
                    <span className="text-xs text-red-600">{selectedRecibo.cancelacion.fecha}</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-medium">Motivo:</span> {selectedRecibo.cancelacion.motivo}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-medium">Descripción:</span> {selectedRecibo.cancelacion.descripcion}
                  </p>
                  <p className="text-xs text-red-500 mt-2">Por: {selectedRecibo.cancelacion.usuario}</p>
                </div>
              </div>
            </div>
          )}

          {/* Seguimiento */}
          <SeguimientoPanel seguimiento={selectedRecibo.seguimiento || []} />
        </div>

        {/* Modal Cancelar Recibo */}
        {showCancelarReciboModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Cancelar Recibo</h3>
              <button onClick={() => setShowCancelarReciboModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de Cancelación <span className="text-red-500">*</span></label>
                <select 
                  value={cancelarReciboMotivo}
                  onChange={(e) => setCancelarReciboMotivo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Seleccionar motivo...</option>
                  {motivosCancelacionRecibo.map(m => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
                <textarea 
                  value={cancelarReciboDescripcion}
                  onChange={(e) => setCancelarReciboDescripcion(e.target.value)}
                  placeholder="Describa el motivo de la cancelación..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
              <button 
                onClick={() => setShowCancelarReciboModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (!cancelarReciboMotivo || !cancelarReciboDescripcion.trim()) {
                    alert("Debe completar el motivo y la descripción para cancelar el recibo")
                    return
                  }
                  const fechaHoy = new Date().toLocaleDateString('es-AR')
                  const fechaISO = new Date().toISOString()

                  // 1. Buscar todas las aplicaciones donde este recibo fue crédito
                  const aplicacionesARevertir = conciliacionHistorial
                    .flatMap(h => h.aplicaciones)
                    .filter(a => a.credito_numero === selectedRecibo.numero)

                  // 2. Revertir saldo de cada factura involucrada
                  if (aplicacionesARevertir.length > 0) {
                    setFacturas(prev => prev.map(f => {
                      const montoRevertir = aplicacionesARevertir
                        .filter(a => a.debito_numero === f.numero)
                        .reduce((sum, a) => sum + a.monto, 0)
                      if (montoRevertir > 0) {
                        const nuevoSaldo = f.saldo + montoRevertir
                        return {
                          ...f,
                          saldo: nuevoSaldo,
                          estado: nuevoSaldo > 0 ? "abierta" as const : f.estado
                        }
                      }
                      return f
                    }))

                    // 3. Generar movimiento de reversión en cuenta corriente
                    const totalRevertido = aplicacionesARevertir.reduce((sum, a) => sum + a.monto, 0)
                    const clienteDelRecibo = clientes.find(c => c.id === selectedRecibo.cliente_id)
                    if (clienteDelRecibo) {
                      const saldoAnterior = clienteDelRecibo.saldo_cuenta_corriente
                      const nuevoMov: MovimientoCuentaCorriente = {
                        id: movimientosCC.length + 1,
                        cliente_id: clienteDelRecibo.id,
                        fecha: fechaISO,
                        tipo: "debito",
                        concepto: `Reversión por cancelación de recibo ${selectedRecibo.numero}`,
                        documento_tipo: "recibo_cancelado",
                        documento_numero: selectedRecibo.numero,
                        documento_id: selectedRecibo.id,
                        moneda: selectedRecibo.moneda || "ARS",
                        importe: totalRevertido,
                        saldo_posterior: saldoAnterior + totalRevertido
                      }
                      setMovimientosCC(prev => [...prev, nuevoMov])
                    }

                    // 4. Marcar el historial de conciliación como revertido y agregar entrada de reversión
                    setConciliacionHistorial(prev => {
                      const clienteDelRecibo2 = clientes.find(c => c.id === selectedRecibo.cliente_id)
                      const historialMarcado = prev.map(h => ({
                        ...h,
                        aplicaciones: h.aplicaciones.map(a =>
                          a.credito_numero === selectedRecibo.numero
                            ? { ...a, revertida: true }
                            : a
                        )
                      }))
                      // Agregar registro de reversión
                      const nuevaEntradaReversion = {
                        id: prev.length + 1,
                        fecha: fechaISO,
                        cliente_id: selectedRecibo.cliente_id,
                        cliente_nombre: clienteDelRecibo2?.nombre || "",
                        tipo: "reversion" as const,
                        motivo: `Cancelación de recibo ${selectedRecibo.numero}: ${cancelarReciboDescripcion.trim()}`,
                        aplicaciones: aplicacionesARevertir.map(a => ({
                          ...a,
                          revertida: true,
                          monto: -a.monto,
                          debito_tipo: a.debito_tipo,
                          debito_numero: a.debito_numero,
                          credito_tipo: a.credito_tipo,
                          credito_numero: a.credito_numero,
                        })),
                        total_conciliado: -aplicacionesARevertir.reduce((sum, a) => sum + a.monto, 0),
                        usuario: "Admin"
                      }
                      return [...historialMarcado, nuevaEntradaReversion]
                    })
                  }

                  // 5. Cancelar el recibo — importe_no_conciliado queda en 0 (no reutilizable)
                  const updatedRecibo = {
                    ...selectedRecibo,
                    estado: "cancelado" as const,
                    importe_no_conciliado: 0,
                    cancelacion: {
                      motivo: cancelarReciboMotivo,
                      descripcion: cancelarReciboDescripcion.trim(),
                      fecha: fechaHoy,
                      usuario: "Max Solina"
                    },
                    seguimiento: [
                      ...(selectedRecibo.seguimiento || []),
                      {
                        fecha: fechaHoy,
                        usuario: "Max Solina",
                        accion: "Recibo cancelado",
                        detalle: `Motivo: ${cancelarReciboMotivo}. ${cancelarReciboDescripcion.trim()}${aplicacionesARevertir.length > 0 ? `. Se revirtieron ${aplicacionesARevertir.length} aplicación/es de conciliación.` : ""}`
                      }
                    ]
                  }
                  setRecibos(prev => prev.map(r => r.id === selectedRecibo.id ? updatedRecibo : r))
                  setSelectedRecibo(updatedRecibo)
                  setShowCancelarReciboModal(false)
                  setCancelarReciboMotivo("")
                  setCancelarReciboDescripcion("")
                }}
                disabled={!cancelarReciboMotivo || !cancelarReciboDescripcion.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    )
  }

  // Recibos
  const renderRecibos = () => {
    if (selectedRecibo) return renderFichaRecibo()
    if (creandoRecibo) return renderCrearRecibo()
    
    return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Recibos</h1>
        <button 
          onClick={() => { setCreandoRecibo(true); setReciboClienteIdForm(null); setReciboPagosForm([]) }}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Recibo
        </button>
      </div>

      <div className="mb-4">
        <OdooFilterBar
          moduleName="recibos"
          filterOptions={[
            { field: "estado", label: "Estado", values: [
              { value: "borrador", label: "Borrador" },
              { value: "publicado", label: "Publicado" },
            ]},
            { field: "moneda", label: "Moneda", values: [
              { value: "ARS", label: "ARS" },
              { value: "USD", label: "USD" },
            ]},
          ]}
          groupByOptions={[
            { id: "estado", label: "Estado", field: "estado" },
            { id: "cliente", label: "Cliente", field: "cliente" },
          ]}
          activeFilters={activeFiltersRecibos}
          activeGroupBy={activeGroupByRecibos}
          searchTerm={searchQuery}
          onFiltersChange={setActiveFiltersRecibos}
          onGroupByChange={setActiveGroupByRecibos}
          onSearchChange={setSearchQuery}
          savedFilters={savedFiltersRecibos}
          {...makeSavedFilterHandlers(setSavedFiltersRecibos, setActiveFiltersRecibos, setActiveGroupByRecibos, setSearchQuery)}
          totalCount={recibos.length}
          filteredCount={recibos.filter(r => {
            const q = searchQuery.toLowerCase()
            return !q || r.numero.toLowerCase().includes(q) || r.cliente_nombre.toLowerCase().includes(q)
          }).length}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nota de Venta</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Importe</th>
            </tr>
          </thead>
          <tbody>
            {recibos.map(recibo => (
              <tr 
                key={recibo.id} 
                onClick={() => {
                  setSelectedRecibo(recibo)
                  if (recibo.estado === "borrador") {
                    setReciboPagosForm(recibo.pagos.map(p => ({ forma_pago: p.forma_pago, importe: p.importe, moneda: p.moneda })))
                  }
                }}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              >
                <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{recibo.numero}</td>
                <td className="py-3 px-4 text-sm">{recibo.cliente_nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{formatDate(recibo.fecha)}</td>
                <td className="py-3 px-4 text-sm text-blue-600">{recibo.nota_venta_numero || "-"}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${recibo.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {recibo.estado === "publicado" ? "Publicado" : "Borrador"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-sm font-medium">{recibo.moneda}</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(recibo.importe, recibo.moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
{recibos.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron recibos
          </div>
        )}
      </div>
    </div>
    )
  }
  
  // Conciliacion de Deuda - Estilo Odoo
  const renderConciliacion = () => {
    const clienteSeleccionado = clientes.find(c => c.id === conciliacionClienteId)

    // Filtrar facturas segun configuracion
    const todasFacturasCliente = conciliacionClienteId 
      ? facturas.filter(f => f.cliente_id === conciliacionClienteId).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      : []
    
    const facturasFiltradas = todasFacturasCliente.filter(f => {
      // Filtro por conciliado: "no"=pendientes, "si"=conciliadas, "todos"=todas
      if (conciliacionFiltroConciliado === "no" && f.saldo <= 0) return false
      if (conciliacionFiltroConciliado === "si" && f.saldo > 0) return false
      // Si no hay filtro de conciliado activo ("todos"), aplicar checkbox "Todos" para ocultar conciliadas
      if (conciliacionFiltroConciliado === "todos" && !conciliacionMostrarTodosDebitos && f.saldo <= 0) return false
      // Filtro por texto
      if (conciliacionFiltroTextoDebitos && !f.numero.toLowerCase().includes(conciliacionFiltroTextoDebitos.toLowerCase()) && 
          !f.nota_venta_numero.toLowerCase().includes(conciliacionFiltroTextoDebitos.toLowerCase())) return false
      // Filtro por NV
      if (conciliacionFiltroNV && f.nota_venta_numero !== conciliacionFiltroNV) return false
      return true
    })
    
    // Filtrar recibos segun configuracion
    const todosRecibosCliente = conciliacionClienteId
      ? recibos.filter(r => r.cliente_id === conciliacionClienteId && r.estado === "publicado").sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      : []

    // Notas de crédito publicadas del cliente (NC-) como créditos adicionales
    const notasCredito = conciliacionClienteId
      ? ajustes.filter(a => a.cliente_id === conciliacionClienteId && a.estado === "publicado" && a.numero.startsWith("NC-"))
          .map(a => ({
            id: a.id,
            numero: a.numero,
            fecha: a.fecha,
            cliente_id: a.cliente_id,
            importe_no_conciliado: a.total,
            total: a.total,
            tipo: "nota_credito" as const,
            concepto: a.concepto,
            moneda: a.moneda
          }))
      : []

    const recibosFiltrados = todosRecibosCliente.filter(r => {
      // Filtro por conciliado: "no"=pendientes, "si"=conciliados, "todos"=todos
      if (conciliacionFiltroConciliado === "no" && r.importe_no_conciliado <= 0) return false
      if (conciliacionFiltroConciliado === "si" && r.importe_no_conciliado > 0) return false
      // Si filtro es "todos", el checkbox controla si se muestran los conciliados
      if (conciliacionFiltroConciliado === "todos" && !conciliacionMostrarTodosCreditos && r.importe_no_conciliado <= 0) return false
      // Filtro por texto
      if (conciliacionFiltroTextoCreditos && !r.numero.toLowerCase().includes(conciliacionFiltroTextoCreditos.toLowerCase())) return false
      return true
    })

    const notasCreditoFiltradas = notasCredito.filter(nc => {
      if (conciliacionFiltroConciliado === "no" && nc.importe_no_conciliado <= 0) return false
      if (conciliacionFiltroConciliado === "si" && nc.importe_no_conciliado > 0) return false
      if (conciliacionFiltroTextoCreditos && !nc.numero.toLowerCase().includes(conciliacionFiltroTextoCreditos.toLowerCase())) return false
      return true
    })

    // Calcular totales (solo pendientes)
    const totalDebitos = todasFacturasCliente.filter(f => f.saldo > 0).reduce((sum, f) => sum + f.saldo, 0)
    const totalCreditos = todosRecibosCliente.filter(r => r.importe_no_conciliado > 0).reduce((sum, r) => sum + r.importe_no_conciliado, 0)
      + notasCredito.filter(nc => nc.importe_no_conciliado > 0).reduce((sum, nc) => sum + nc.importe_no_conciliado, 0)
    const balance = totalDebitos - totalCreditos

    // Calcular totales seleccionados
    const totalDebitosSeleccionados = conciliacionSeleccionDebitos.reduce((sum, d) => sum + d.montoAplicar, 0)
    const totalCreditosSeleccionados = conciliacionSeleccionCreditos.reduce((sum, c) => sum + c.montoAplicar, 0)
    const montoAConciliar = Math.min(totalDebitosSeleccionados, totalCreditosSeleccionados)

    // Funciones de conciliacion
    const toggleDebitoSeleccion = (factura: Factura) => {
      const existe = conciliacionSeleccionDebitos.find(d => d.id === factura.id && d.tipo === "factura")
      if (existe) {
        setConciliacionSeleccionDebitos(prev => prev.filter(d => !(d.id === factura.id && d.tipo === "factura")))
      } else {
        setConciliacionSeleccionDebitos(prev => [...prev, { id: factura.id, tipo: "factura", montoAplicar: factura.saldo }])
      }
    }

    const toggleCreditoSeleccion = (recibo: Recibo) => {
      const existe = conciliacionSeleccionCreditos.find(c => c.id === recibo.id && c.tipo === "recibo")
      if (existe) {
        setConciliacionSeleccionCreditos(prev => prev.filter(c => !(c.id === recibo.id && c.tipo === "recibo")))
      } else {
        setConciliacionSeleccionCreditos(prev => [...prev, { id: recibo.id, tipo: "recibo", montoAplicar: recibo.importe_no_conciliado }])
      }
    }

    const actualizarMontoDebito = (id: number, monto: number) => {
      setConciliacionSeleccionDebitos(prev => prev.map(d => 
        d.id === id && d.tipo === "factura" ? { ...d, montoAplicar: monto } : d
      ))
    }

    const actualizarMontoCredito = (id: number, monto: number) => {
      setConciliacionSeleccionCreditos(prev => prev.map(c => 
        c.id === id && c.tipo === "recibo" ? { ...c, montoAplicar: monto } : c
      ))
    }

    const seleccionarTodoDebitos = () => {
      const pendientes = facturasFiltradas.filter(f => f.saldo > 0)
      setConciliacionSeleccionDebitos(pendientes.map(f => ({ id: f.id, tipo: "factura" as const, montoAplicar: f.saldo })))
    }

    const seleccionarTodoCreditos = () => {
      const pendientes = recibosFiltrados.filter(r => r.importe_no_conciliado > 0)
      setConciliacionSeleccionCreditos(pendientes.map(r => ({ id: r.id, tipo: "recibo" as const, montoAplicar: r.importe_no_conciliado })))
    }

    const marcarAutomatico = () => {
      // Selecciona automaticamente FIFO
      const debitosPendientes = facturasFiltradas.filter(f => f.saldo > 0)
      const creditosPendientes = recibosFiltrados.filter(r => r.importe_no_conciliado > 0)
      if (debitosPendientes.length === 0 || creditosPendientes.length === 0) return

      const nuevosDebitos: typeof conciliacionSeleccionDebitos = []
      const nuevosCreditos: typeof conciliacionSeleccionCreditos = []

      let creditoIdx = 0
      let creditoRestante = creditosPendientes[0]?.importe_no_conciliado || 0

      for (const factura of debitosPendientes) {
        if (creditoIdx >= creditosPendientes.length) break
        let saldoFactura = factura.saldo

        while (saldoFactura > 0 && creditoIdx < creditosPendientes.length) {
          const montoAAplicar = Math.min(saldoFactura, creditoRestante)
          if (montoAAplicar > 0) {
            const debitoExistente = nuevosDebitos.find(d => d.id === factura.id)
            if (debitoExistente) {
              debitoExistente.montoAplicar += montoAAplicar
            } else {
              nuevosDebitos.push({ id: factura.id, tipo: "factura", montoAplicar: montoAAplicar })
            }
            const creditoExistente = nuevosCreditos.find(c => c.id === creditosPendientes[creditoIdx].id)
            if (creditoExistente) {
              creditoExistente.montoAplicar += montoAAplicar
            } else {
              nuevosCreditos.push({ id: creditosPendientes[creditoIdx].id, tipo: "recibo", montoAplicar: montoAAplicar })
            }
            saldoFactura -= montoAAplicar
            creditoRestante -= montoAAplicar
          }
          if (creditoRestante <= 0) {
            creditoIdx++
            creditoRestante = creditosPendientes[creditoIdx]?.importe_no_conciliado || 0
          }
        }
      }
      setConciliacionSeleccionDebitos(nuevosDebitos)
      setConciliacionSeleccionCreditos(nuevosCreditos)
    }

    const limpiarSeleccion = () => {
      setConciliacionSeleccionDebitos([])
      setConciliacionSeleccionCreditos([])
    }

    // Ejecutar conciliacion
    const ejecutarConciliacion = () => {
      if (montoAConciliar <= 0) return

      const aplicaciones: typeof conciliacionHistorial[0]["aplicaciones"] = []

      // Crear copias de las selecciones para ir descontando
      const debitosRestantes = conciliacionSeleccionDebitos.map(d => ({ ...d }))
      const creditosRestantes = conciliacionSeleccionCreditos.map(c => ({ ...c }))

      // Aplicar creditos a debitos
      for (const credito of creditosRestantes) {
        const reciboInfo = recibos.find(r => r.id === credito.id)
        if (!reciboInfo || credito.montoAplicar <= 0) continue

        for (const debito of debitosRestantes) {
          if (debito.montoAplicar <= 0) continue

          const facturaInfo = facturas.find(f => f.id === debito.id)
          if (!facturaInfo) continue

          const montoAAplicar = Math.min(credito.montoAplicar, debito.montoAplicar)

          if (montoAAplicar > 0) {
            aplicaciones.push({
              debito_tipo: "Factura",
              debito_numero: facturaInfo.numero,
              credito_tipo: "Recibo",
              credito_numero: reciboInfo.numero,
              monto: montoAAplicar
            })

            // Actualizar factura
            setFacturas(prev => prev.map(f => 
              f.id === debito.id ? { ...f, saldo: f.saldo - montoAAplicar } : f
            ))

            // Actualizar recibo
            setRecibos(prev => prev.map(r => 
              r.id === credito.id ? { ...r, importe_no_conciliado: r.importe_no_conciliado - montoAAplicar } : r
            ))

            debito.montoAplicar -= montoAAplicar
            credito.montoAplicar -= montoAAplicar
          }
        }
      }

      // Agregar al historial
      if (aplicaciones.length > 0 && clienteSeleccionado) {
        setConciliacionHistorial(prev => [...prev, {
          id: prev.length + 1,
          fecha: new Date().toISOString(),
          cliente_id: clienteSeleccionado.id,
          cliente_nombre: clienteSeleccionado.nombre,
          aplicaciones,
          total_conciliado: aplicaciones.reduce((sum, a) => sum + a.monto, 0),
          usuario: "Admin"
        }])
      }

      // Limpiar seleccion
      limpiarSeleccion()
    }

    // Historial de conciliaciones del cliente
    const historialCliente = conciliacionClienteId 
      ? conciliacionHistorial.filter(h => h.cliente_id === conciliacionClienteId)
      : []

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Conciliacion de Deuda</h1>
        </div>

        {/* Tabs Conciliar / Historial */}
        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setConciliacionTab("conciliar")}
            className={`px-4 py-2 text-sm font-medium rounded ${conciliacionTab === "conciliar" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Conciliar
          </button>
          <button 
            onClick={() => setConciliacionTab("historial")}
            className={`px-4 py-2 text-sm font-medium rounded ${conciliacionTab === "historial" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            Historial
          </button>
        </div>

        {conciliacionTab === "conciliar" ? (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header estilo Odoo */}
          <div className="px-3 py-2.5 border-b bg-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Cliente */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500 shrink-0">Cliente</label>
                <div className="flex items-center gap-1">
                  <select 
                    value={conciliacionClienteId || ""}
                    onChange={(e) => {
                      setConciliacionClienteId(e.target.value ? parseInt(e.target.value) : null)
                      limpiarSeleccion()
                    }}
                    className="w-52 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                  </select>
                  {clienteSeleccionado && (
                    <button 
                      onClick={() => { setClienteSeleccionadoId(clienteSeleccionado.id); setActiveSubmenu("ficha_cliente") }}
                      className="p-1 text-gray-400 hover:text-blue-600 shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Conciliado */}
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500 shrink-0">Conciliado</label>
                <select 
                  value={conciliacionFiltroConciliado}
                  onChange={(e) => setConciliacionFiltroConciliado(e.target.value as typeof conciliacionFiltroConciliado)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="no">No</option>
                  <option value="si">Si</option>
                  <option value="todos">Todos</option>
                </select>
              </div>
              {/* Balance */}
              <div className="px-2 py-1 bg-white border rounded text-center">
                <span className={`text-sm font-bold ${balance === 0 ? 'text-gray-800' : balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(balance))}
                </span>
              </div>
              {/* Opciones de marcado */}
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={conciliacionSeleccionDebitos.length === 0 && conciliacionSeleccionCreditos.length === 0}
                    onChange={limpiarSeleccion}
                    className="w-3 h-3 rounded border-gray-300"
                  />
                  <span className="text-gray-600">Desmarcar</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={facturasFiltradas.filter(f => f.saldo > 0).length > 0 && 
                             conciliacionSeleccionDebitos.length === facturasFiltradas.filter(f => f.saldo > 0).length}
                    onChange={() => { seleccionarTodoDebitos(); seleccionarTodoCreditos() }}
                    className="w-3 h-3 rounded border-gray-300"
                  />
                  <span className="text-gray-600">Marcar todo</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    onChange={marcarAutomatico}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                  />
                  <span className="text-gray-600">Marcar automatica</span>
                </label>
              </div>
            </div>
          </div>

          {/* Panel de dos columnas estilo Odoo */}
          <div className="flex divide-x">
            {/* DEBITOS */}
            <div className="flex-1 flex flex-col">
              {/* Header Debitos */}
              <div className="px-3 py-2 bg-red-50 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">Debitos</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    placeholder="Filtrar por texto..." 
                    value={conciliacionFiltroTextoDebitos}
                    onChange={(e) => setConciliacionFiltroTextoDebitos(e.target.value)}
                    className="px-2 py-1 text-xs border rounded w-32"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={conciliacionMostrarTodosDebitos}
                      onChange={(e) => setConciliacionMostrarTodosDebitos(e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    Todos
                  </label>
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    {facturasFiltradas.length}
                  </span>
                </div>
              </div>
              {/* Tabla Debitos */}
              <div className="flex-1 overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-gray-500">
                      <th className="text-left py-2 px-2 font-medium">Nota de Venta</th>
                      <th className="text-left py-2 px-2 font-medium">Comprobante</th>
                      <th className="text-left py-2 px-2 font-medium">Condicion</th>
                      <th className="text-left py-2 px-2 font-medium">Venc.</th>
                      <th className="text-left py-2 px-2 font-medium">Fecha</th>
                      <th className="text-right py-2 px-2 font-medium">Importe Or.</th>
                      <th className="text-center py-2 px-2 font-medium">Mon.</th>
                      <th className="text-right py-2 px-2 font-medium">Importe</th>
                      <th className="text-center py-2 px-2 font-medium">Conc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasFiltradas.length > 0 ? facturasFiltradas.map(f => {
                      const seleccionado = conciliacionSeleccionDebitos.find(d => d.id === f.id && d.tipo === "factura")
                      const esConciliada = f.saldo <= 0
                      return (
                        <tr 
                          key={f.id} 
                          className={`border-b hover:bg-gray-50 cursor-pointer ${seleccionado ? 'bg-red-50' : ''} ${esConciliada ? 'opacity-50' : ''}`}
                          onClick={() => !esConciliada && toggleDebitoSeleccion(f)}
                        >
                          <td className="py-1.5 px-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); /* navegar a NV */ }}
                              className="text-orange-600 hover:underline"
                            >
                              {f.nota_venta_numero}
                            </button>
                          </td>
                          <td className="py-1.5 px-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); /* navegar a factura */ }}
                              className="text-blue-600 hover:underline"
                            >
                              {f.numero}
                            </button>
                          </td>
                          <td className="py-1.5 px-2 text-gray-600">{f.condicion_pago || "Contado"}</td>
                          <td className="py-1.5 px-2 text-gray-600">{f.fecha_vencimiento ? formatDateTime(f.fecha_vencimiento).split(" ")[0] : "-"}</td>
                          <td className="py-1.5 px-2 text-gray-600">{formatDateTime(f.fecha).split(" ")[0]}</td>
                          <td className="py-1.5 px-2 text-right">{formatCurrency(f.total, f.moneda)}</td>
                          <td className="py-1.5 px-2 text-center text-gray-500">{f.moneda === "USD" ? "U$D" : "$"}</td>
                          <td className="py-1.5 px-2 text-right font-medium text-red-600">{formatCurrency(f.saldo, f.moneda)}</td>
                          <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            {!esConciliada && (
                              <div className="flex items-center justify-center gap-1">
                                <button className="p-0.5 text-gray-400 hover:text-blue-600">
                                  <Search className="w-3 h-3" />
                                </button>
                                <input 
                                  type="checkbox" 
                                  checked={!!seleccionado}
                                  onChange={() => toggleDebitoSeleccion(f)}
                                  className="w-3.5 h-3.5 rounded border-gray-300"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-400">
                          {!conciliacionClienteId ? "Seleccione un cliente" : conciliacionFiltroConciliado === "si" ? "No hay facturas conciliadas" : "No hay facturas pendientes"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CREDITOS */}
            <div className="flex-1 flex flex-col">
              {/* Header Creditos */}
              <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Creditos</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    placeholder="Filtrar por texto..." 
                    value={conciliacionFiltroTextoCreditos}
                    onChange={(e) => setConciliacionFiltroTextoCreditos(e.target.value)}
                    className="px-2 py-1 text-xs border rounded w-32"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={conciliacionMostrarTodosCreditos}
                      onChange={(e) => setConciliacionMostrarTodosCreditos(e.target.checked)}
                      className="w-3 h-3 rounded"
                    />
                    Todos
                  </label>
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {recibosFiltrados.filter(r => r.importe_no_conciliado > 0).length + notasCreditoFiltradas.filter(nc => nc.importe_no_conciliado > 0).length}
                  </span>
                </div>
              </div>
              {/* Tabla Creditos */}
              <div className="flex-1 overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-gray-500">
                      <th className="text-center py-2 px-2 font-medium">Conc.</th>
                      <th className="text-right py-2 px-2 font-medium">Importe</th>
                      <th className="text-center py-2 px-2 font-medium">Mon.</th>
                      <th className="text-right py-2 px-2 font-medium">Importe Or.</th>
                      <th className="text-left py-2 px-2 font-medium">Fecha</th>
                      <th className="text-left py-2 px-2 font-medium">Venc.</th>
                      <th className="text-left py-2 px-2 font-medium">Comprobante</th>
                      <th className="text-left py-2 px-2 font-medium">Nota de Venta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recibosFiltrados.length > 0 || notasCreditoFiltradas.length > 0) ? (
                      <>
                        {recibosFiltrados.map(r => {
                          const seleccionado = conciliacionSeleccionCreditos.find(c => c.id === r.id && c.tipo === "recibo")
                          const esConciliado = r.importe_no_conciliado <= 0
                          return (
                            <tr
                              key={`recibo-${r.id}`}
                              className={`border-b hover:bg-gray-50 cursor-pointer ${seleccionado ? 'bg-blue-50' : ''} ${esConciliado ? 'opacity-50' : ''}`}
                              onClick={() => !esConciliado && toggleCreditoSeleccion(r)}
                            >
                              <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                {!esConciliado && (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={!!seleccionado}
                                      onChange={() => toggleCreditoSeleccion(r)}
                                      className="w-3.5 h-3.5 rounded border-gray-300"
                                    />
                                    <button className="p-0.5 text-gray-400 hover:text-blue-600">
                                      <Search className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 px-2 text-right font-medium text-green-600">{formatCurrency(r.importe_no_conciliado, r.moneda)}</td>
                              <td className="py-1.5 px-2 text-center text-gray-500">{r.moneda === "USD" ? "U$D" : "$"}</td>
                              <td className="py-1.5 px-2 text-right">{formatCurrency(r.importe, r.moneda)}</td>
                              <td className="py-1.5 px-2 text-gray-600">{formatDateTime(r.fecha).split(" ")[0]}</td>
                              <td className="py-1.5 px-2 text-gray-600">-</td>
                              <td className="py-1.5 px-2">
                                <button onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">
                                  {r.numero}
                                </button>
                              </td>
                              <td className="py-1.5 px-2 text-gray-600">-</td>
                            </tr>
                          )
                        })}
                        {notasCreditoFiltradas.map(nc => (
                          <tr
                            key={`nc-${nc.id}`}
                            className="border-b hover:bg-emerald-50 cursor-default bg-emerald-50/30"
                          >
                            <td className="py-1.5 px-2 text-center">
                              <span className="text-xs text-emerald-600 font-medium">NC</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-medium text-green-600">{formatCurrency(nc.importe_no_conciliado, nc.moneda)}</td>
                            <td className="py-1.5 px-2 text-center text-gray-500">{nc.moneda === "USD" ? "U$D" : "$"}</td>
                            <td className="py-1.5 px-2 text-right">{formatCurrency(nc.total, nc.moneda)}</td>
                            <td className="py-1.5 px-2 text-gray-600">{formatDateTime(nc.fecha).split(" ")[0]}</td>
                            <td className="py-1.5 px-2 text-gray-600">-</td>
                            <td className="py-1.5 px-2">
                              <span className="text-emerald-700 font-medium">{nc.numero}</span>
                            </td>
                            <td className="py-1.5 px-2 text-gray-600 text-xs truncate max-w-[120px]" title={nc.concepto}>{nc.concepto}</td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-400">
                          {conciliacionClienteId ? "No hay creditos disponibles" : "Seleccione un cliente"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Barra inferior de acciones */}
          <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
            <div></div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">Debitos: <span className="text-red-600 font-medium">{formatCurrency(totalDebitosSeleccionados)}</span></span>
              <span className="text-gray-500">Creditos: <span className="text-green-600 font-medium">{formatCurrency(totalCreditosSeleccionados)}</span></span>
              {montoAConciliar > 0 && (
                <span className="text-gray-700 font-medium">A conciliar: {formatCurrency(montoAConciliar)}</span>
              )}
            </div>
            <button 
              onClick={ejecutarConciliacion}
              disabled={montoAConciliar <= 0}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" /> Ejecutar Conciliacion
            </button>
          </div>
        </div>
        ) : (
          /* Tab Historial */
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Historial de Conciliaciones</h3>
            {/* Selector de cliente para historial */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Cliente</label>
              <select 
                value={conciliacionClienteId || ""}
                onChange={(e) => setConciliacionClienteId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full max-w-md border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
            </div>
            {historialCliente.length > 0 ? (
              <div className="space-y-4">
                {historialCliente.map(h => {
                  const esReversion = (h as any).tipo === "reversion"
                  return (
                  <div key={h.id} className={`border rounded-lg p-4 ${esReversion ? "border-orange-200 bg-orange-50" : ""}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {esReversion ? "Reversión de Conciliación" : `Conciliacion #${h.id}`}
                          </p>
                          {esReversion && (
                            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                              Revertida
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{formatDateTime(h.fecha)} - {h.usuario}</p>
                        {esReversion && (h as any).motivo && (
                          <p className="text-xs text-orange-600 mt-1">{(h as any).motivo}</p>
                        )}
                      </div>
                      <p className={`text-lg font-bold ${esReversion ? "text-orange-600" : "text-emerald-600"}`}>
                        {esReversion ? "- " : ""}{formatCurrency(Math.abs(h.total_conciliado))}
                      </p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-y">
                          <th className="text-left py-2 px-3">Debito</th>
                          <th className="text-left py-2 px-3">Credito</th>
                          <th className="text-right py-2 px-3">Monto</th>
                          {!esReversion && <th className="text-center py-2 px-3">Estado</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {h.aplicaciones.map((a, idx) => (
                          <tr key={idx} className={`border-b ${(a as any).revertida && !esReversion ? "bg-red-50" : ""}`}>
                            <td className={`py-2 px-3 ${(a as any).revertida && !esReversion ? "line-through text-gray-400" : "text-red-700"}`}>
                              {a.debito_tipo} {a.debito_numero}
                            </td>
                            <td className={`py-2 px-3 ${(a as any).revertida && !esReversion ? "line-through text-gray-400" : "text-green-700"}`}>
                              {a.credito_tipo} {a.credito_numero}
                            </td>
                            <td className={`py-2 px-3 text-right font-medium ${(a as any).revertida && !esReversion ? "line-through text-gray-400" : ""}`}>
                              {formatCurrency(Math.abs(a.monto))}
                            </td>
                            {!esReversion && (
                              <td className="py-2 px-3 text-center">
                                {(a as any).revertida ? (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Revertida</span>
                                ) : (
                                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Activa</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {conciliacionClienteId ? "No hay conciliaciones registradas para este cliente" : "Seleccione un cliente para ver su historial"}
              </div>
            )}
          </div>
      )}

      {/* Popup detalle Nota de Credito */}
      {ncDetallePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNcDetallePopup(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-emerald-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 rounded px-2 py-0.5">NOTA DE CREDITO</span>
                  <span className="font-mono font-bold text-emerald-800 text-lg">{ncDetallePopup.numero}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{new Date(ncDetallePopup.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ncDetallePopup.estado === 'publicado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ncDetallePopup.estado === 'publicado' ? 'Publicada' : 'Borrador'}
                </span>
                <button onClick={() => setNcDetallePopup(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-b grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Cliente</span>
                <p className="font-semibold text-gray-900 mt-0.5">{ncDetallePopup.cliente_nombre}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Sucursal</span>
                <p className="font-semibold text-gray-900 mt-0.5">{ncDetallePopup.sucursal}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Concepto</span>
                <p className="font-semibold text-gray-900 mt-0.5">{ncDetallePopup.concepto}</p>
              </div>
              {ncDetallePopup.nota_venta_numero && (
                <div>
                  <span className="text-gray-400 text-xs uppercase font-medium">Nota de Venta</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">{ncDetallePopup.nota_venta_numero}</p>
                </div>
              )}
            </div>
            {ncDetallePopup.lineas && ncDetallePopup.lineas.length > 0 && (
              <div className="px-6 py-4 border-b">
                <p className="text-xs uppercase font-semibold text-gray-400 mb-3">Detalle</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b">
                      <th className="text-left pb-2">Descripcion</th>
                      <th className="text-right pb-2">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncDetallePopup.lineas.map((l, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-700">{l.descripcion}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(l.importe, ncDetallePopup.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">Moneda: <span className="font-semibold text-gray-800">{ncDetallePopup.moneda}</span></span>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-medium">Total Nota de Credito</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(ncDetallePopup.total, ncDetallePopup.moneda)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

  // Ajustes de Cliente
  const renderAjustes = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Ajustes de Cliente</h1>
        <button 
          onClick={() => { setEditingItem(null); setModalType("ajuste"); setShowModal(true) }}
          className="bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Ajuste
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {ajustes.map(ajuste => (
              <tr key={ajuste.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{ajuste.numero}</td>
                <td className="py-3 px-4 text-sm">{ajuste.cliente_nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{formatDate(ajuste.fecha)}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{ajuste.concepto}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${ajuste.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {ajuste.estado === "publicado" ? "Publicado" : "Borrador"}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-sm font-medium">{ajuste.moneda}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`font-medium ${ajuste.total < 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(ajuste.total, ajuste.moneda)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ajustes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron ajustes
          </div>
        )}
      </div>
    </div>
  )

  // Notas de Débito / Crédito — usa el estado real de ajustes
  const renderFichaAjuste = () => {
    const ajuste = selectedAjuste
    if (!ajuste) return null
    const esNC = ajuste.numero.startsWith("NC-")
    const titulo = esNC ? "Nota de Crédito" : "Nota de Débito"
    const listadoLabel = esNC ? "Notas de Crédito" : "Notas de Débito"

    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => setSelectedAjuste(null)} className="hover:text-emerald-700">{listadoLabel}</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{ajuste.numero}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedAjuste(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-emerald-900">{ajuste.numero}</h1>
              <p className="text-sm text-gray-500">{formatDate(ajuste.fecha)}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            ajuste.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}>
            {ajuste.estado === "publicado" ? "Publicada" : "Borrador"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Columna principal */}
          <div className="col-span-2 space-y-4">

            {/* Datos generales */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{titulo}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 text-xs uppercase font-medium block mb-0.5">Cliente</span>
                  <span className="font-semibold text-gray-900">{ajuste.cliente_nombre}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-medium block mb-0.5">Sucursal</span>
                  <span className="font-semibold text-gray-900">{ajuste.sucursal}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-medium block mb-0.5">Concepto</span>
                  <span className="font-semibold text-gray-900">{ajuste.concepto}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase font-medium block mb-0.5">Moneda</span>
                  <span className="font-semibold text-gray-900">{ajuste.moneda}</span>
                </div>
                {ajuste.nota_venta_numero && (
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-medium block mb-0.5">Nota de Venta</span>
                    <span className="font-semibold text-emerald-700">{ajuste.nota_venta_numero}</span>
                  </div>
                )}
                {ajuste.categoria && (
                  <div>
                    <span className="text-gray-400 text-xs uppercase font-medium block mb-0.5">Categoría</span>
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded">{ajuste.categoria}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Líneas */}
            {ajuste.lineas && ajuste.lineas.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">Detalle</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50/50">
                      <th className="text-left py-3 px-5 font-medium">Descripción</th>
                      <th className="text-right py-3 px-5 font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ajuste.lineas.map((linea, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 px-5 text-gray-700">{linea.descripcion}</td>
                        <td className="py-3 px-5 text-right font-medium">{formatCurrency(linea.importe, ajuste.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Columna lateral */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Total</h3>
              <div className="text-3xl font-bold text-emerald-600">{formatCurrency(ajuste.total, ajuste.moneda)}</div>
              <div className="text-xs text-gray-400 mt-1">{ajuste.moneda}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderNotasDebitoCredito = (tipo: "debito" | "credito") => {
    // Las notas de crédito son ajustes cuyo número empieza con "NC-"
    // Las notas de débito son ajustes cuyo número empieza con "ND-"
    const prefijo = tipo === "credito" ? "NC-" : "ND-"
    const notasFiltradas = ajustes.filter(a => a.numero.startsWith(prefijo))
    const titulo = tipo === "credito" ? "Notas de Crédito" : "Notas de Débito"

    return (
        <div>
          <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">{titulo}</h1>
          </div>
        </div>

        <div className="mb-4">
          <OdooFilterBar
            moduleName={`notas-${tipo}`}
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "borrador", label: "Borrador" },
                { value: "publicado", label: "Publicada" },
              ]},
              { field: "moneda", label: "Moneda", values: [
                { value: "ARS", label: "ARS" },
                { value: "USD", label: "USD" },
              ]},
            ]}
            groupByOptions={[
              { id: "estado", label: "Estado", field: "estado" },
              { id: "cliente", label: "Cliente", field: "cliente" },
              { id: "sucursal", label: "Sucursal", field: "sucursal" },
            ]}
            activeFilters={activeFiltersNDC}
            activeGroupBy={activeGroupByNDC}
            searchTerm={searchQuery}
            onFiltersChange={setActiveFiltersNDC}
            onGroupByChange={setActiveGroupByNDC}
            onSearchChange={setSearchQuery}
            savedFilters={savedFiltersNDC}
            {...makeSavedFilterHandlers(setSavedFiltersNDC, setActiveFiltersNDC, setActiveGroupByNDC, setSearchQuery)}
            totalCount={ajustes.filter(a => a.numero.startsWith(prefijo)).length}
            filteredCount={notasFiltradas.length}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {notasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No hay {titulo.toLowerCase()} registradas</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Número</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sucursal</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {notasFiltradas.map(nota => (
                  <tr key={nota.id} onClick={() => setSelectedAjuste(nota)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{nota.numero}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(nota.fecha)}</td>
                    <td className="py-3 px-4 text-sm">{nota.cliente_nombre}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{nota.concepto}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{nota.sucursal}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        nota.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {nota.estado === "publicado" ? "Publicada" : "Borrador"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium">{nota.moneda}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(nota.total, nota.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  // ==================== LISTAS DE PRECIOS ====================
  
  // Funciones CRUD Listas de Precios
  const crearNuevaListaPrecios = () => {
    const nuevaLista: ListaPrecios = {
      id: 0,
      nombre: "",
      tipo: "Minorista",
      moneda_base: "ARS",
      incluye_iva: true,
      activa: true,
      no_visible: false,
      dias_validez: 30,
      estado: "borrador",
      usuarios_admin: [],
      usuarios_habilitados: [],
      observaciones_filtro: "",
      seguimiento: []
    }
    setSelectedListaPrecios(nuevaLista)
    setEditingListaPrecios(nuevaLista)
    setCreandoListaPrecios(true)
    setModoEdicionListaPrecios(true)
    setListaPreciosTab("versiones")
  }

  const guardarListaPrecios = () => {
    if (!editingListaPrecios || !editingListaPrecios.nombre.trim()) return
    
    const fechaActual = new Date().toISOString()
    
    if (creandoListaPrecios) {
      const nuevoId = Math.max(...listasPrecios.map(l => l.id), 0) + 1
      const nuevaLista: ListaPrecios = {
        ...editingListaPrecios,
        id: nuevoId,
        estado: editingListaPrecios.estado === "borrador" ? "creada" : editingListaPrecios.estado,
        seguimiento: [{
          id: 1,
          fecha: fechaActual,
          usuario: "Max Solina",
          tipo: "creacion",
          descripcion: "Lista de precios creada"
        }]
      }
      setListasPrecios(prev => [...prev, nuevaLista])
      setSelectedListaPrecios(nuevaLista)
      setEditingListaPrecios(null)
      setCreandoListaPrecios(false)
      setModoEdicionListaPrecios(false)
    } else {
      const seguimientoActualizado = [
        {
          id: (editingListaPrecios.seguimiento?.length || 0) + 1,
          fecha: fechaActual,
          usuario: "Max Solina",
          tipo: "cambio_campo" as const,
          campo: "Datos",
          valor_nuevo: "Lista actualizada"
        },
        ...(editingListaPrecios.seguimiento || [])
      ]
      
      const listaActualizada = { ...editingListaPrecios, seguimiento: seguimientoActualizado }
      setListasPrecios(prev => prev.map(l => l.id === editingListaPrecios.id ? listaActualizada : l))
      setSelectedListaPrecios(listaActualizada)
      setEditingListaPrecios(null)
      setModoEdicionListaPrecios(false)
    }
  }

  const descartarListaPrecios = () => {
    if (creandoListaPrecios) {
      setSelectedListaPrecios(null)
    }
    setEditingListaPrecios(null)
    setCreandoListaPrecios(false)
    setModoEdicionListaPrecios(false)
  }

  const iniciarEdicionListaPrecios = () => {
    if (selectedListaPrecios) {
      setEditingListaPrecios({ ...selectedListaPrecios })
      setModoEdicionListaPrecios(true)
    }
  }

  // Funciones CRUD Versiones
  const crearNuevaVersion = (listaId?: number) => {
    const lista = listaId ? listasPrecios.find(l => l.id === listaId) : selectedListaPrecios
    if (!lista) return
    
    const versionesExistentes = versionesLista.filter(v => v.lista_precios_id === lista.id)
    const nombreDefault = `V${versionesExistentes.length + 1} - ${lista.nombre}`
    const nuevaVersion: VersionListaPrecios = {
      id: 0,
      lista_precios_id: lista.id,
      lista_precios_nombre: lista.nombre,
      nombre: nombreDefault,
      fecha_inicial: new Date().toISOString().split("T")[0],
      fecha_final: null,
      activa: false,
      estado: "borrador",
      ultima_actualizacion: new Date().toISOString(),
      lineas: [],
      seguimiento: []
    }
    setSelectedVersion(nuevaVersion)
    setEditingVersion(nuevaVersion)
    setCreandoVersion(true)
    setModoEdicionVersion(true)
    setActiveView("versiones_lista")
  }

  const crearVersionBasadaEnOtra = async (versionBase: VersionListaPrecios) => {
    const fechaActual = new Date().toISOString()
    const payload: VersionListaPrecios = {
      id: 0,
      lista_precios_id: versionBase.lista_precios_id,
      lista_precios_nombre: versionBase.lista_precios_nombre,
      nombre: nuevaVersionBasadaForm.nombre || `Copia de ${versionBase.nombre}`,
      fecha_inicial: nuevaVersionBasadaForm.fecha_inicial || new Date().toISOString().split("T")[0],
      fecha_final: nuevaVersionBasadaForm.fecha_final || null,
      activa: false,
      estado: "borrador",
      ultima_actualizacion: fechaActual,
      lineas: nuevaVersionBasadaForm.copiar_lineas ? versionBase.lineas.map(l => ({ ...l, id: 0 })) : [],
      seguimiento: [{
        id: 1,
        fecha: fechaActual,
        usuario: "Max Solina",
        tipo: "creacion" as const,
        descripcion: `Versión creada basada en "${versionBase.nombre}"`
      }]
    }

    const res = await fetch("/api/listas-precios/versiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const nuevaVersion: VersionListaPrecios = await res.json()
      setVersionesLista(prev => [nuevaVersion, ...prev])
      setSelectedVersion(nuevaVersion)
    }
    setEditingVersion(null)
    setCreandoVersion(false)
    setModoEdicionVersion(false)
    setModalNuevaVersionBasada(false)
    setNuevaVersionBasadaForm({ nombre: "", fecha_inicial: "", fecha_final: "", copiar_lineas: true })
  }

  const guardarVersion = async () => {
    if (!editingVersion || !editingVersion.nombre.trim()) return
    
    const fechaActual = new Date().toISOString()
    
    if (creandoVersion) {
      const payload: VersionListaPrecios = {
        ...editingVersion,
        id: 0,
        ultima_actualizacion: fechaActual,
        seguimiento: [{
          id: 1,
          fecha: fechaActual,
          usuario: "Max Solina",
          tipo: "creacion",
          descripcion: "Versión creada"
        }]
      }
      const res = await fetch("/api/listas-precios/versiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const nuevaVersion: VersionListaPrecios = await res.json()
        setVersionesLista(prev => [nuevaVersion, ...prev])
        setSelectedVersion(nuevaVersion)
      }
      setEditingVersion(null)
      setCreandoVersion(false)
      setModoEdicionVersion(false)
      setEditandoLineas(false)
      setNuevaLineaVersion({})
    } else {
      const seguimientoActualizado = [
        {
          id: (editingVersion.seguimiento?.length || 0) + 1,
          fecha: fechaActual,
          usuario: "Max Solina",
          tipo: "cambio_campo" as const,
          campo: "Datos",
          valor_nuevo: "Versión actualizada"
        },
        ...(editingVersion.seguimiento || [])
      ]
      
      const versionActualizada = { 
        ...editingVersion, 
        ultima_actualizacion: fechaActual,
        seguimiento: seguimientoActualizado 
      }
      const res = await fetch(`/api/listas-precios/versiones/${editingVersion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(versionActualizada),
      })
      if (res.ok) {
        const saved: VersionListaPrecios = await res.json()
        setVersionesLista(prev => prev.map(v => v.id === saved.id ? saved : v))
        setSelectedVersion(saved)
      } else {
        setVersionesLista(prev => prev.map(v => v.id === editingVersion.id ? versionActualizada : v))
        setSelectedVersion(versionActualizada)
      }
      setEditingVersion(null)
      setModoEdicionVersion(false)
      setEditandoLineas(false)
      setNuevaLineaVersion({})
    }
  }

  const descartarVersion = () => {
    if (creandoVersion) {
      setSelectedVersion(null)
    }
    setEditingVersion(null)
    setCreandoVersion(false)
    setModoEdicionVersion(false)
    setEditandoLineas(false)
    setNuevaLineaVersion({})
  }

  const iniciarEdicionVersion = () => {
    if (selectedVersion) {
      setEditingVersion({ ...selectedVersion })
      setModoEdicionVersion(true)
      setEditandoLineas(true)
    }
  }

  // Funciones para líneas de versión
  const agregarLineaVersion = () => {
    const versionActual = editingVersion || selectedVersion
    if (!versionActual || !nuevaLineaVersion.producto_id) return
    
    const costoImporte = nuevaLineaVersion.costo_importe || 0
    const markupPorcentaje = nuevaLineaVersion.markup_porcentaje || 0
    const markupNominal = nuevaLineaVersion.markup_nominal || 0
    const cotizacion = nuevaLineaVersion.cotizacion_dolar || COTIZACION_DOLAR_MOCK
    const forzarPrecio = nuevaLineaVersion.forzar_precio_pesos || false
    const precioForzado = nuevaLineaVersion.precio_forzado_ars || null
    
    // Calcular precio de venta
    let precioVenta: number
    if (forzarPrecio && precioForzado) {
      precioVenta = precioForzado / cotizacion // Convertir a USD si la lista es USD
    } else {
      const costoConMarkup = costoImporte * (1 + markupPorcentaje / 100) + markupNominal
      precioVenta = costoConMarkup
    }
    
    const nuevaLinea: LineaListaPrecios = {
      id: Math.max(...versionActual.lineas.map(l => l.id), 0) + 1,
      producto_id: nuevaLineaVersion.producto_id,
      producto_codigo: nuevaLineaVersion.producto_codigo || "",
      producto_nombre: nuevaLineaVersion.producto_nombre || "",
      costo_moneda: nuevaLineaVersion.costo_moneda || "ARS",
      costo_importe: costoImporte,
      cotizacion_dolar: cotizacion,
      markup_porcentaje: markupPorcentaje,
      markup_nominal: markupNominal,
      forzar_precio_pesos: forzarPrecio,
      precio_forzado_ars: precioForzado,
      precio_venta: Math.round(precioVenta * 100) / 100,
      precio_venta_moneda: nuevaLineaVersion.precio_venta_moneda || "ARS",
      iva: nuevaLineaVersion.iva || 21
    }
    
    const versionActualizada = {
      ...versionActual,
      lineas: [...versionActual.lineas, nuevaLinea],
      ultima_actualizacion: new Date().toISOString()
    }
    
    if (editingVersion) {
      setEditingVersion(versionActualizada)
    } else {
      setVersionesLista(prev => prev.map(v => v.id === versionActual.id ? versionActualizada : v))
      setSelectedVersion(versionActualizada)
    }
    
    setNuevaLineaVersion({})
  }

  const eliminarLineaVersion = (lineaId: number) => {
    const versionActual = editingVersion || selectedVersion
    if (!versionActual) return
    
    const versionActualizada = {
      ...versionActual,
      lineas: versionActual.lineas.filter(l => l.id !== lineaId),
      ultima_actualizacion: new Date().toISOString()
    }
    
    if (editingVersion) {
      setEditingVersion(versionActualizada)
    } else {
      setVersionesLista(prev => prev.map(v => v.id === versionActual.id ? versionActualizada : v))
      setSelectedVersion(versionActualizada)
    }
  }

  const actualizarLineaVersion = (lineaId: number, campo: keyof LineaListaPrecios, valor: unknown) => {
    const versionActual = editingVersion || selectedVersion
    if (!versionActual) return
    
    const versionActualizada = {
      ...versionActual,
      lineas: versionActual.lineas.map(l => {
        if (l.id !== lineaId) return l
        
        let lineaActualizada = { ...l, [campo]: valor }
        
        // Si se activa forzar precio, limpiar markups
        if (campo === 'forzar_precio_pesos' && valor === true) {
          lineaActualizada = { ...lineaActualizada, markup_porcentaje: 0, markup_nominal: 0 }
        }
        
        // Recalcular precio si cambió algo relevante
        if (['costo_importe', 'markup_porcentaje', 'markup_nominal', 'forzar_precio_pesos', 'precio_forzado_ars', 'cotizacion_dolar'].includes(campo)) {
          if (lineaActualizada.forzar_precio_pesos && lineaActualizada.precio_forzado_ars) {
            lineaActualizada.precio_venta = lineaActualizada.precio_forzado_ars / (lineaActualizada.cotizacion_dolar || COTIZACION_DOLAR_MOCK)
          } else {
            const costoConMarkup = lineaActualizada.costo_importe * (1 + lineaActualizada.markup_porcentaje / 100) + lineaActualizada.markup_nominal
            lineaActualizada.precio_venta = Math.round(costoConMarkup * 100) / 100
          }
        }
        
        return lineaActualizada
      }),
      ultima_actualizacion: new Date().toISOString()
    }
    
    if (editingVersion) {
      setEditingVersion(versionActualizada)
    } else {
      setVersionesLista(prev => prev.map(v => v.id === versionActual.id ? versionActualizada : v))
      setSelectedVersion(versionActualizada)
    }
  }

  // =========================== CATEGORÍAS DE CLIENTES ===========================

  const renderCategoriasCliente = () => {
    if (selectedCategoria) return renderDetalleCategoriaCliente()
    return renderListaCategoriasCliente()
  }

  const renderListaCategoriasCliente = () => {
    const filtered = categoriasCliente.filter(c =>
      c.nombre.toLowerCase().includes(categoriaSearchText.toLowerCase()) ||
      c.descripcion.toLowerCase().includes(categoriaSearchText.toLowerCase())
    )
    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white border-b border-gray-200 py-3 px-4 -mx-6 -mt-6">
          <button
            onClick={() => {
              const nueva: CategoriaCliente = { id: 0, nombre: "", lista_precios_defecto_id: null, descripcion: "", activa: true, seguimiento: [] }
              setSelectedCategoria(nueva)
              setEditingCategoria(nueva)
              setCreandoCategoria(true)
              setModoEdicionCategoria(true)
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Crear
          </button>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar categoría..." value={categoriaSearchText} onChange={(e) => setCategoriaSearchText(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-64 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>
          <span className="text-sm text-gray-500">1-{filtered.length} de {filtered.length}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Nombre</th>
                <th className="text-left py-3 px-4 font-medium">Descripción</th>
                <th className="text-left py-3 px-4 font-medium">Lista de Precios por Defecto</th>
                <th className="text-center py-3 px-4 font-medium">Activa</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat, idx) => {
                const lista = listasPrecios.find(l => l.id === cat.lista_precios_defecto_id)
                return (
                  <tr key={cat.id} className={`border-b border-gray-100 hover:bg-emerald-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    onClick={() => { setSelectedCategoria(cat); setEditingCategoria(null); setModoEdicionCategoria(false); setCreandoCategoria(false) }}>
                    <td className="py-3 px-4 font-medium text-gray-900">{cat.nombre}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{cat.descripcion || "-"}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{lista?.nombre || <span className="text-gray-400">Sin asignar</span>}</td>
                    <td className="py-3 px-4 text-center">
                      {cat.activa ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-400 mx-auto" />}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No se encontraron categorías</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderDetalleCategoriaCliente = () => {
    if (!selectedCategoria) return null
    const current = modoEdicionCategoria && editingCategoria ? editingCategoria : selectedCategoria
    const isEditing = modoEdicionCategoria

    const guardar = () => {
      if (!editingCategoria || !editingCategoria.nombre.trim()) return
      const fecha = new Date().toISOString()
      if (creandoCategoria) {
        const nuevoId = Math.max(...categoriasCliente.map(c => c.id), 0) + 1
        const nueva: CategoriaCliente = {
          ...editingCategoria,
          id: nuevoId,
          seguimiento: [{ id: 1, fecha, usuario: "Max Solina", tipo: "creacion", descripcion: "Categoría creada" }]
        }
        setCategoriasCliente(prev => [...prev, nueva])
        setSelectedCategoria(nueva)
      } else {
        const actualizada = {
          ...editingCategoria,
          seguimiento: [
            { id: (editingCategoria.seguimiento?.length || 0) + 1, fecha, usuario: "Max Solina", tipo: "cambio_campo" as const, campo: "Datos", valor_nuevo: "Categoría actualizada" },
            ...(editingCategoria.seguimiento || [])
          ]
        }
        setCategoriasCliente(prev => prev.map(c => c.id === editingCategoria.id ? actualizada : c))
        setSelectedCategoria(actualizada)
      }
      setEditingCategoria(null)
      setCreandoCategoria(false)
      setModoEdicionCategoria(false)
    }

    const descartar = () => {
      if (creandoCategoria) setSelectedCategoria(null)
      setEditingCategoria(null)
      setCreandoCategoria(false)
      setModoEdicionCategoria(false)
    }

    const currentIndex = categoriasCliente.findIndex(c => c.id === selectedCategoria.id)
    const prev = currentIndex > 0 ? categoriasCliente[currentIndex - 1] : null
    const next = currentIndex < categoriasCliente.length - 1 ? categoriasCliente[currentIndex + 1] : null

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <button onClick={() => { setSelectedCategoria(null); setEditingCategoria(null); setCreandoCategoria(false); setModoEdicionCategoria(false) }} className="hover:text-emerald-600">
            Categorías de Clientes
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{creandoCategoria ? "Nueva Categoría" : current.nombre}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button onClick={guardar} disabled={!current.nombre.trim()} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={descartar} className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
                <X className="w-4 h-4" /> Descartar
              </button>
            </div>
          ) : (
            <BotonVolver onClick={() => { setSelectedCategoria(null); setEditingCategoria(null); setCreandoCategoria(false); setModoEdicionCategoria(false) }} />
          )}
          <div className="flex items-center gap-2">
            {!isEditing && !creandoCategoria && (
              <button onClick={() => { setEditingCategoria({ ...selectedCategoria }); setModoEdicionCategoria(true) }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
            {!creandoCategoria && (
              <>
                <button onClick={() => prev && (setSelectedCategoria(prev), setEditingCategoria(null), setModoEdicionCategoria(false))} disabled={!prev} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button onClick={() => next && (setSelectedCategoria(next), setEditingCategoria(null), setModoEdicionCategoria(false))} disabled={!next} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              {isEditing ? (
                <input type="text" value={current.nombre} onChange={(e) => setEditingCategoria({ ...current, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" placeholder="Nombre de la categoría" />
              ) : (
                <p className="text-gray-900 py-2 font-semibold text-lg">{current.nombre}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios por Defecto</label>
              {isEditing ? (
                <select value={current.lista_precios_defecto_id ?? ""}
                  onChange={(e) => setEditingCategoria({ ...current, lista_precios_defecto_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500">
                  <option value="">Sin asignar</option>
                  {listasPrecios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              ) : (
                <p className="text-gray-900 py-2">
                  {listasPrecios.find(l => l.id === current.lista_precios_defecto_id)?.nombre || <span className="text-gray-400">Sin asignar</span>}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              {isEditing ? (
                <textarea value={current.descripcion} onChange={(e) => setEditingCategoria({ ...current, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" rows={3} placeholder="Descripción de la categoría" />
              ) : (
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{current.descripcion || "Sin descripción"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              {isEditing ? (
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={current.activa} onChange={(e) => setEditingCategoria({ ...current, activa: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                  <span className="text-sm text-gray-700">Activa</span>
                </label>
              ) : (
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mt-2 ${current.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {current.activa ? "Activa" : "Inactiva"}
                </span>
              )}
            </div>
          </div>

          {!creandoCategoria && selectedCategoria.seguimiento && (
            <SeguimientoPanel seguimiento={selectedCategoria.seguimiento} />
          )}
        </div>
      </div>
    )
  }

  // =========================== RENDER LISTAS DE PRECIOS ===========================
  // Funciones de renderizado para el módulo de Listas de Precios y Versiones
  const renderListasPrecios = () => {
    if (selectedListaPrecios) {
      return renderDetalleListaPrecios()
    }
    return renderListaListasPrecios()
  }

  const renderListaListasPrecios = () => {
    const filteredListas = listasPrecios.filter(l =>
      l.nombre.toLowerCase().includes(listaPreciosSearchText.toLowerCase()) ||
      l.tipo.toLowerCase().includes(listaPreciosSearchText.toLowerCase())
    )

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white border-b border-gray-200 py-3 px-4 -mx-6 -mt-6">
          <button 
            onClick={crearNuevaListaPrecios}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Crear
          </button>
          
          <div className="flex-1 flex items-center justify-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar lista de precios..."
                value={listaPreciosSearchText}
                onChange={(e) => setListaPreciosSearchText(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-64 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <span className="text-sm text-gray-500">
            1-{filteredListas.length} de {filteredListas.length}
          </span>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Nombre</th>
                <th className="text-center py-3 px-4 font-medium">Tipo</th>
                <th className="text-center py-3 px-4 font-medium">Moneda</th>
                <th className="text-center py-3 px-4 font-medium">IVA Inc.</th>
                <th className="text-center py-3 px-4 font-medium">Días Validez</th>
                <th className="text-center py-3 px-4 font-medium">Estado</th>
                <th className="text-center py-3 px-4 font-medium">Versiones</th>
              </tr>
            </thead>
            <tbody>
              {filteredListas.map((lista, idx) => {
                const versionesCount = versionesLista.filter(v => v.lista_precios_id === lista.id).length
                return (
                  <tr 
                    key={lista.id} 
                    className={`border-b border-gray-100 hover:bg-emerald-50 cursor-pointer transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                    onClick={() => {
                      setSelectedListaPrecios(lista)
                      setEditingListaPrecios(null)
                      setModoEdicionListaPrecios(false)
                      setCreandoListaPrecios(false)
                      setListaPreciosTab("versiones")
                    }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{lista.nombre}</span>
                        {lista.no_visible && <Eye className="w-4 h-4 text-gray-400" title="No visible" />}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600">{lista.tipo}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lista.moneda_base === 'USD' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {lista.moneda_base}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {lista.incluye_iva ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-sm">{lista.dias_validez}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lista.estado === 'activa' ? 'bg-green-100 text-green-800' :
                        lista.estado === 'creada' ? 'bg-blue-100 text-blue-800' :
                        lista.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {lista.estado.charAt(0).toUpperCase() + lista.estado.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600">{versionesCount}</td>
                  </tr>
                )
              })}
              {filteredListas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No se encontraron listas de precios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Detalle de Lista de Precios
  const renderDetalleListaPrecios = () => {
    if (!selectedListaPrecios) return null

    const currentLista = modoEdicionListaPrecios && editingListaPrecios ? editingListaPrecios : selectedListaPrecios
    const isEditing = modoEdicionListaPrecios || creandoListaPrecios
    const versionesDeLista = versionesLista.filter(v => v.lista_precios_id === selectedListaPrecios.id)

    // Navegación
    const currentIndex = listasPrecios.findIndex(l => l.id === selectedListaPrecios.id)
    const prevLista = currentIndex > 0 ? listasPrecios[currentIndex - 1] : null
    const nextLista = currentIndex < listasPrecios.length - 1 ? listasPrecios[currentIndex + 1] : null

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <button onClick={() => { setSelectedListaPrecios(null); setEditingListaPrecios(null); setCreandoListaPrecios(false); setModoEdicionListaPrecios(false) }} className="hover:text-emerald-600">
            Listas de Precios
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{creandoListaPrecios ? 'Nueva Lista' : currentLista.nombre}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button onClick={guardarListaPrecios} disabled={!currentLista.nombre.trim()} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={descartarListaPrecios} className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
                <X className="w-4 h-4" /> Descartar
              </button>
            </div>
          ) : (
            <BotonVolver onClick={() => { setSelectedListaPrecios(null); setEditingListaPrecios(null); setCreandoListaPrecios(false); setModoEdicionListaPrecios(false) }} />
          )}

          <div className="flex items-center gap-2">
            {!isEditing && !creandoListaPrecios && (
              <button onClick={iniciarEdicionListaPrecios} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
            {!creandoListaPrecios && (
              <>
                <button onClick={() => prevLista && (setSelectedListaPrecios(prevLista), setEditingListaPrecios(null), setModoEdicionListaPrecios(false))} disabled={!prevLista} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button onClick={() => nextLista && (setSelectedListaPrecios(nextLista), setEditingListaPrecios(null), setModoEdicionListaPrecios(false))} disabled={!nextLista} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          {/* Campos principales */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              {isEditing ? (
                <input type="text" value={currentLista.nombre} onChange={(e) => setEditingListaPrecios({ ...currentLista, nombre: e.target.value })} placeholder="Nombre de la lista" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
              ) : (
                <p className="text-gray-900 py-2 font-medium text-lg">{currentLista.nombre}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              {isEditing ? (
                <select value={currentLista.tipo} onChange={(e) => setEditingListaPrecios({ ...currentLista, tipo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">
                  {mockTiposListaPrecios.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <p className="text-gray-900 py-2">{currentLista.tipo}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Base</label>
              {isEditing ? (
                <select value={currentLista.moneda_base} onChange={(e) => setEditingListaPrecios({ ...currentLista, moneda_base: e.target.value as "ARS" | "USD" })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                </select>
              ) : (
                <p className="text-gray-900 py-2">{currentLista.moneda_base}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Días de Validez</label>
              {isEditing ? (
                <input type="number" value={currentLista.dias_validez} onChange={(e) => setEditingListaPrecios({ ...currentLista, dias_validez: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" min="1" />
              ) : (
                <p className="text-gray-900 py-2">{currentLista.dias_validez} días</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              {isEditing ? (
                <select value={currentLista.estado} onChange={(e) => setEditingListaPrecios({ ...currentLista, estado: e.target.value as ListaPrecios["estado"] })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="borrador">Borrador</option>
                  <option value="creada">Creada</option>
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  currentLista.estado === 'activa' ? 'bg-green-100 text-green-800' :
                  currentLista.estado === 'creada' ? 'bg-blue-100 text-blue-800' :
                  currentLista.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>{currentLista.estado.charAt(0).toUpperCase() + currentLista.estado.slice(1)}</span>
              )}
            </div>
            <div className="flex items-center gap-4 pt-6">
              {isEditing ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={currentLista.incluye_iva} onChange={(e) => setEditingListaPrecios({ ...currentLista, incluye_iva: e.target.checked })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Incluye IVA</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={currentLista.no_visible} onChange={(e) => setEditingListaPrecios({ ...currentLista, no_visible: e.target.checked })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">No visible</span>
                  </label>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-600">
                    {currentLista.incluye_iva ? <span className="text-green-600">IVA incluido</span> : <span className="text-gray-400">IVA no incluido</span>}
                  </span>
                  {currentLista.no_visible && <span className="text-sm text-gray-400">(No visible)</span>}
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex gap-4">
              {[
                { id: "versiones", label: `Versiones (${versionesDeLista.length})` },
                { id: "filtros", label: "Filtros" },
                { id: "usuarios_admin", label: "Usuarios Admin" },
                { id: "usuarios_habilitados", label: "Usuarios Habilitados" }
              ].map(tab => (
                <button key={tab.id} onClick={() => setListaPreciosTab(tab.id as typeof listaPreciosTab)}
                  className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                    listaPreciosTab === tab.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido de Tabs */}
          {listaPreciosTab === "versiones" && (
            <div>
              {!creandoListaPrecios && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => crearNuevaVersion(selectedListaPrecios.id)} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded text-sm hover:bg-emerald-700">
                    <Plus className="w-4 h-4" /> Nueva Versión
                  </button>
                </div>
              )}
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left py-2 px-3 font-medium">Nombre</th>
                      <th className="text-center py-2 px-3 font-medium">Fecha Inicial</th>
                      <th className="text-center py-2 px-3 font-medium">Fecha Final</th>
                      <th className="text-center py-2 px-3 font-medium">Estado</th>
                      <th className="text-center py-2 px-3 font-medium">Líneas</th>
                      <th className="text-center py-2 px-3 font-medium">Última Actualización</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionesDeLista.map((version, idx) => (
                      <tr key={version.id} className={`border-b border-gray-100 hover:bg-emerald-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        onClick={() => { setSelectedVersion(version); setActiveView("versiones_lista") }}>
                        <td className="py-2 px-3 font-medium text-gray-900">{version.nombre}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{new Date(version.fecha_inicial).toLocaleDateString("es-AR")}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{version.fecha_final ? new Date(version.fecha_final).toLocaleDateString("es-AR") : "-"}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        version.estado === 'activa' ? 'bg-green-100 text-green-800' :
                        version.estado === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                        version.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>{version.estado === 'confirmada' ? 'Confirmada' : version.estado.charAt(0).toUpperCase() + version.estado.slice(1)}</span>

                        </td>
                        <td className="py-2 px-3 text-center text-gray-600">{version.lineas.length}</td>
                        <td className="py-2 px-3 text-center text-gray-500 text-xs">{new Date(version.ultima_actualizacion).toLocaleString("es-AR")}</td>
                        <td className="py-2 px-3">
                          <button onClick={(e) => { e.stopPropagation(); setModalNuevaVersionBasada(true); setSelectedVersion(version) }} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Crear versión basada en esta">
                            <Copy className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {versionesDeLista.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-gray-500">No hay versiones para esta lista</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {listaPreciosTab === "filtros" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones / Filtros</label>
              {isEditing ? (
                <textarea value={currentLista.observaciones_filtro} onChange={(e) => setEditingListaPrecios({ ...currentLista, observaciones_filtro: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" rows={4} placeholder="Observaciones o criterios de filtro para esta lista..." />
              ) : (
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{currentLista.observaciones_filtro || "Sin observaciones"}</p>
              )}
            </div>
          )}

          {listaPreciosTab === "usuarios_admin" && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Usuarios con permisos de administración de esta lista.</p>
              <div className="space-y-2">
                {mockUsuariosVentas.map(u => (
                  <label key={u.id} className="flex items-center gap-2">
                    {isEditing ? (
                      <input type="checkbox" checked={currentLista.usuarios_admin.includes(u.id)}
                        onChange={(e) => setEditingListaPrecios({
                          ...currentLista,
                          usuarios_admin: e.target.checked ? [...currentLista.usuarios_admin, u.id] : currentLista.usuarios_admin.filter(id => id !== u.id)
                        })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    ) : (
                      currentLista.usuarios_admin.includes(u.id) ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className="text-sm text-gray-700">{u.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {listaPreciosTab === "usuarios_habilitados" && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Usuarios habilitados para usar esta lista en presupuestos/ventas.</p>
              <div className="space-y-2">
                {mockUsuariosVentas.map(u => (
                  <label key={u.id} className="flex items-center gap-2">
                    {isEditing ? (
                      <input type="checkbox" checked={currentLista.usuarios_habilitados.includes(u.id)}
                        onChange={(e) => setEditingListaPrecios({
                          ...currentLista,
                          usuarios_habilitados: e.target.checked ? [...currentLista.usuarios_habilitados, u.id] : currentLista.usuarios_habilitados.filter(id => id !== u.id)
                        })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    ) : (
                      currentLista.usuarios_habilitados.includes(u.id) ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-300" />
                    )}
                    <span className="text-sm text-gray-700">{u.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Seguimiento */}
          {!creandoListaPrecios && selectedListaPrecios.seguimiento && (
            <SeguimientoPanel seguimiento={selectedListaPrecios.seguimiento} />
          )}
        </div>

        {/* Modal Nueva Versión Basada */}
        {modalNuevaVersionBasada && selectedVersion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Crear versión basada en "{selectedVersion.nombre}"</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la nueva versión</label>
                  <input type="text" value={nuevaVersionBasadaForm.nombre} onChange={(e) => setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" placeholder={`Copia de ${selectedVersion.nombre}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
                    <input type="date" value={nuevaVersionBasadaForm.fecha_inicial} onChange={(e) => setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, fecha_inicial: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
                    <input type="date" value={nuevaVersionBasadaForm.fecha_final} onChange={(e) => setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, fecha_final: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={nuevaVersionBasadaForm.copiar_lineas} onChange={(e) => setNuevaVersionBasadaForm({ ...nuevaVersionBasadaForm, copiar_lineas: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded" />
                  <span className="text-sm text-gray-700">Copiar líneas de precios ({selectedVersion.lineas.length} líneas)</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => { setModalNuevaVersionBasada(false); setNuevaVersionBasadaForm({ nombre: "", fecha_inicial: "", fecha_final: "", copiar_lineas: true }) }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">Cancelar</button>
                <button onClick={() => crearVersionBasadaEnOtra(selectedVersion)}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700">Crear Versi��n</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== VERSIONES DE LISTA ====================
  
  const renderVersionesLista = () => {
    if (selectedVersion) return renderDetalleVersion()
    return renderListaVersiones()
  }

  const renderListaVersiones = () => {
    let filteredVersiones = versionesLista
    
    if (versionFilterLista) {
      filteredVersiones = filteredVersiones.filter(v => v.lista_precios_id === versionFilterLista)
    }
    
    if (versionSearchText) {
      filteredVersiones = filteredVersiones.filter(v =>
        v.nombre.toLowerCase().includes(versionSearchText.toLowerCase()) ||
        v.lista_precios_nombre.toLowerCase().includes(versionSearchText.toLowerCase())
      )
    }

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white border-b border-gray-200 py-3 px-4 -mx-6 -mt-6">
          <button onClick={() => crearNuevaVersion()} disabled={listasPrecios.length === 0}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
            <Plus className="w-4 h-4" /> Crear
          </button>
          
          <div className="flex-1 flex items-center justify-center gap-4">
            <select value={versionFilterLista || ""} onChange={(e) => setVersionFilterLista(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500">
              <option value="">Todas las listas</option>
              {listasPrecios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar versión..." value={versionSearchText} onChange={(e) => setVersionSearchText(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-64 focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>

          <span className="text-sm text-gray-500">1-{filteredVersiones.length} de {filteredVersiones.length}</span>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Lista</th>
                <th className="text-left py-3 px-4 font-medium">Versión</th>
                <th className="text-center py-3 px-4 font-medium">Fecha Inicial</th>
                <th className="text-center py-3 px-4 font-medium">Fecha Final</th>
                <th className="text-center py-3 px-4 font-medium">Estado</th>
                <th className="text-center py-3 px-4 font-medium">Líneas</th>
                <th className="text-center py-3 px-4 font-medium">Última Actualización</th>
              </tr>
            </thead>
            <tbody>
              {filteredVersiones.map((version, idx) => (
                <tr key={version.id} className={`border-b border-gray-100 hover:bg-emerald-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  onClick={() => { setSelectedVersion(version); setEditingVersion(null); setModoEdicionVersion(false); setCreandoVersion(false) }}>
                  <td className="py-3 px-4 text-gray-600">{version.lista_precios_nombre}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{version.nombre}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{new Date(version.fecha_inicial).toLocaleDateString("es-AR")}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{version.fecha_final ? new Date(version.fecha_final).toLocaleDateString("es-AR") : "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        version.estado === 'activa' ? 'bg-green-100 text-green-800' :
                        version.estado === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                        version.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>{version.estado === 'confirmada' ? 'Confirmada' : version.estado.charAt(0).toUpperCase() + version.estado.slice(1)}</span>

                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">{version.lineas.length}</td>
                  <td className="py-3 px-4 text-center text-gray-500 text-xs">{new Date(version.ultima_actualizacion).toLocaleString("es-AR")}</td>
                </tr>
              ))}
              {filteredVersiones.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-500">No se encontraron versiones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Detalle de Versión con Grilla Editable
  const renderDetalleVersion = () => {
    if (!selectedVersion) return null

    const currentVersion = modoEdicionVersion && editingVersion ? editingVersion : selectedVersion
    const isEditing = modoEdicionVersion || creandoVersion
    const listaPrecios = listasPrecios.find(l => l.id === currentVersion.lista_precios_id)

    // Navegación
    const versionesDeLista = versionesLista.filter(v => v.lista_precios_id === currentVersion.lista_precios_id)
    const currentIndex = versionesDeLista.findIndex(v => v.id === selectedVersion.id)
    const prevVersion = currentIndex > 0 ? versionesDeLista[currentIndex - 1] : null
    const nextVersion = currentIndex < versionesDeLista.length - 1 ? versionesDeLista[currentIndex + 1] : null

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4">
          <button onClick={() => { setSelectedVersion(null); setEditingVersion(null); setCreandoVersion(false); setModoEdicionVersion(false) }} className="hover:text-emerald-600">
            Versiones de Lista
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{currentVersion.lista_precios_nombre}</span>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{creandoVersion ? 'Nueva Versión' : currentVersion.nombre}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button onClick={guardarVersion} disabled={!currentVersion.nombre.trim()} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={descartarVersion} className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
                <X className="w-4 h-4" /> Descartar
              </button>
            </div>
          ) : (
            <BotonVolver onClick={() => { setSelectedVersion(null); setEditingVersion(null); setCreandoVersion(false); setModoEdicionVersion(false) }} />
          )}

          <div className="flex items-center gap-2">
            {!isEditing && !creandoVersion && currentVersion.estado === "borrador" && (
              <button
                onClick={() => {
                  const updated = { ...currentVersion, estado: "confirmada" as const, ultima_actualizacion: new Date().toISOString() }
                  setVersionesLista(prev => prev.map(v => v.id === updated.id ? updated : v))
                  setSelectedVersion(updated)
                  setEditingVersion(null)
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" /> Confirmar Lista
              </button>
            )}
            {!isEditing && !creandoVersion && (
              <button onClick={iniciarEdicionVersion} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                <Edit className="w-4 h-4" /> Editar
              </button>
            )}
            {!creandoVersion && (
              <>
                <button onClick={() => prevVersion && (setSelectedVersion(prevVersion), setEditingVersion(null), setModoEdicionVersion(false))} disabled={!prevVersion} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button onClick={() => nextVersion && (setSelectedVersion(nextVersion), setEditingVersion(null), setModoEdicionVersion(false))} disabled={!nextVersion} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          {/* Cabecera de versión */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios</label>
              {isEditing && creandoVersion ? (
                <select value={currentVersion.lista_precios_id} onChange={(e) => {
                  const lista = listasPrecios.find(l => l.id === Number(e.target.value))
                  if (lista) setEditingVersion({ ...currentVersion, lista_precios_id: lista.id, lista_precios_nombre: lista.nombre })
                }} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500">
                  {listasPrecios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              ) : (
                <p className="text-gray-900 py-2">{currentVersion.lista_precios_nombre}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              {isEditing ? (
                <input type="text" value={currentVersion.nombre} onChange={(e) => setEditingVersion({ ...currentVersion, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" placeholder="Nombre de la versión" />
              ) : (
                <p className="text-gray-900 py-2 font-medium">{currentVersion.nombre}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicial</label>
              {isEditing ? (
                <input type="date" value={currentVersion.fecha_inicial} onChange={(e) => setEditingVersion({ ...currentVersion, fecha_inicial: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" />
              ) : (
                <p className="text-gray-900 py-2">{new Date(currentVersion.fecha_inicial).toLocaleDateString("es-AR")}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Final</label>
              {isEditing ? (
                <input type="date" value={currentVersion.fecha_final || ""} onChange={(e) => setEditingVersion({ ...currentVersion, fecha_final: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500" />
              ) : (
                <p className="text-gray-900 py-2">{currentVersion.fecha_final ? new Date(currentVersion.fecha_final).toLocaleDateString("es-AR") : "Sin fecha fin"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              {isEditing ? (
                <select value={currentVersion.estado} onChange={(e) => setEditingVersion({ ...currentVersion, estado: e.target.value as VersionListaPrecios["estado"] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500">
                  <option value="borrador">Borrador</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="activa">Activa</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  currentVersion.estado === 'activa' ? 'bg-green-100 text-green-800' :
                  currentVersion.estado === 'confirmada' ? 'bg-blue-100 text-blue-800' :
                  currentVersion.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>{currentVersion.estado.charAt(0).toUpperCase() + currentVersion.estado.slice(1)}</span>
              )}
            </div>
          </div>

          {/* Info de la Lista Padre */}
          {listaPrecios && (
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
              <span className="text-gray-600">Moneda: </span>
              <span className="font-medium">{listaPrecios.moneda_base}</span>
              <span className="mx-3 text-gray-300">|</span>
              <span className="text-gray-600">IVA: </span>
              <span className="font-medium">{listaPrecios.incluye_iva ? "Incluido" : "No incluido"}</span>
              <span className="mx-3 text-gray-300">|</span>
              <span className="text-gray-600">Cotización Dólar: </span>
              <span className="font-medium">$ {COTIZACION_DOLAR_MOCK.toLocaleString('es-AR')}</span>
            </div>
          )}

          {/* Grilla de Líneas */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Líneas de Precios ({currentVersion.lineas.length})</h4>
              {!creandoVersion && !modoEdicionVersion && (
                <button onClick={() => setEditandoLineas(!editandoLineas)} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${editandoLineas ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Edit className="w-3 h-3" /> {editandoLineas ? 'Editando' : 'Editar líneas'}
                </button>
              )}
            </div>

            <div className="border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[6%]" />
                  <col className="w-[12%]" />
                  <col className="w-[6%]" />
                  {(editandoLineas || creandoVersion) && <col className="w-[2%]" />}
                </colgroup>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-2 font-medium">Código</th>
                    <th className="text-left py-2 px-2 font-medium">Producto</th>
                    <th className="text-center py-2 px-2 font-medium">Mon. Costo</th>
                    <th className="text-right py-2 px-2 font-medium">Costo</th>
                    <th className="text-right py-2 px-2 font-medium">Cotiz. USD</th>
                    <th className="text-right py-2 px-2 font-medium">Markup %</th>
                    <th className="text-right py-2 px-2 font-medium">Markup $</th>
                    <th className="text-center py-2 px-2 font-medium">Forzar $</th>
                    <th className="text-right py-2 px-2 font-medium">Precio Venta</th>
                    <th className="text-center py-2 px-2 font-medium">IVA</th>
                    {(editandoLineas || creandoVersion) && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {/* Fila para agregar nueva línea */}
                  {(editandoLineas || creandoVersion) && (
                    <tr className="border-b border-gray-200 bg-emerald-50/50">
                      <td className="py-1.5 px-2 text-gray-500 text-xs truncate">
                        {nuevaLineaVersion.producto_codigo || <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-1.5 px-2">
                        <select value={nuevaLineaVersion.producto_id || ""} onChange={(e) => {
                          const prod = productosMaestro.find(p => p.id === Number(e.target.value))
                          if (prod) setNuevaLineaVersion({ ...nuevaLineaVersion, producto_id: prod.id, producto_codigo: prod.sku, producto_nombre: prod.nombre, costo_importe: prod.costo || 0 })
                        }} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500">
                          <option value="">Seleccionar producto...</option>
                          {productosMaestro.map(prod => <option key={prod.id} value={prod.id}>{prod.sku} - {prod.nombre}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <select value={nuevaLineaVersion.costo_moneda || "ARS"} onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, costo_moneda: e.target.value as "ARS" | "USD" })}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs">
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input type="number" value={nuevaLineaVersion.costo_importe || ""} onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, costo_importe: Number(e.target.value) })}
                          className="w-20 px-1 py-1 border border-gray-300 rounded text-xs text-right" placeholder="0" />
                      </td>
                      <td className="py-1.5 px-2">
                        <input type="number" value={nuevaLineaVersion.cotizacion_dolar || COTIZACION_DOLAR_MOCK} onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, cotizacion_dolar: Number(e.target.value) })}
                          className="w-20 px-1 py-1 border border-gray-300 rounded text-xs text-right" />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={nuevaLineaVersion.markup_porcentaje || ""}
                          onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, markup_porcentaje: Number(e.target.value) })}
                          disabled={!!nuevaLineaVersion.forzar_precio_pesos}
                          className={`w-16 px-1 py-1 border rounded text-xs text-right ${nuevaLineaVersion.forzar_precio_pesos ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                          placeholder="0"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          value={nuevaLineaVersion.markup_nominal || ""}
                          onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, markup_nominal: Number(e.target.value) })}
                          disabled={!!nuevaLineaVersion.forzar_precio_pesos}
                          className={`w-16 px-1 py-1 border rounded text-xs text-right ${nuevaLineaVersion.forzar_precio_pesos ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                          placeholder="0"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={nuevaLineaVersion.forzar_precio_pesos || false}
                          onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, forzar_precio_pesos: e.target.checked, markup_porcentaje: e.target.checked ? 0 : nuevaLineaVersion.markup_porcentaje, markup_nominal: e.target.checked ? 0 : nuevaLineaVersion.markup_nominal })}
                          className="w-3 h-3 text-emerald-600 border-gray-300 rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        {nuevaLineaVersion.forzar_precio_pesos ? (
                          <input
                            type="number"
                            value={nuevaLineaVersion.precio_forzado_ars || ""}
                            onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, precio_forzado_ars: Number(e.target.value) })}
                            className="w-28 px-1 py-1 border border-amber-400 bg-amber-50 rounded text-xs text-right text-amber-800 placeholder-amber-400 focus:ring-1 focus:ring-amber-400"
                            placeholder="Precio ARS"
                          />
                        ) : (() => {
                          const costo = nuevaLineaVersion.costo_importe || 0
                          const mkPct = nuevaLineaVersion.markup_porcentaje || 0
                          const mkNom = nuevaLineaVersion.markup_nominal || 0
                          const pvCalc = costo * (1 + mkPct / 100) + mkNom
                          return pvCalc > 0
                            ? <span className="text-emerald-700 text-xs font-medium">{formatCurrency(Math.round(pvCalc * 100) / 100, nuevaLineaVersion.costo_moneda || "ARS")}</span>
                            : <span className="text-gray-400 text-xs">Auto</span>
                        })()}
                      </td>
                      <td className="py-1.5 px-2">
                        <select value={nuevaLineaVersion.iva || 21} onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, iva: Number(e.target.value) as 0 | 10.5 | 21 })}
                          className="w-14 px-1 py-1 border border-gray-300 rounded text-xs">
                          <option value={21}>21%</option>
                          <option value={10.5}>10.5%</option>
                          <option value={0}>0%</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <button onClick={agregarLineaVersion} disabled={!nuevaLineaVersion.producto_id}
                          className="p-1 text-emerald-600 hover:bg-emerald-100 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )}
                  {/* Líneas existentes */}
                  {currentVersion.lineas.map((linea, idx) => (
                    <tr key={`${linea.id}-${idx}`} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="py-1.5 px-2 text-gray-600">{linea.producto_codigo}</td>
                      <td className="py-1.5 px-2 font-medium text-gray-900">{linea.producto_nombre}</td>
                      <td className="py-1.5 px-2 text-center">
                        {(editandoLineas || creandoVersion) ? (
                          <select value={linea.costo_moneda} onChange={(e) => actualizarLineaVersion(linea.id, 'costo_moneda', e.target.value)}
                            className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs">
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        ) : (
                          <span className={`px-1 py-0.5 rounded text-xs ${linea.costo_moneda === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{linea.costo_moneda}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {(editandoLineas || creandoVersion) ? (
                          <input type="number" value={linea.costo_importe} onChange={(e) => actualizarLineaVersion(linea.id, 'costo_importe', Number(e.target.value))}
                            className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs text-right" />
                        ) : (
                          formatCurrency(linea.costo_importe, linea.costo_moneda)
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {(editandoLineas || creandoVersion) ? (
                          <input type="number" value={linea.cotizacion_dolar} onChange={(e) => actualizarLineaVersion(linea.id, 'cotizacion_dolar', Number(e.target.value))}
                            className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs text-right" />
                        ) : (
                          `$ ${linea.cotizacion_dolar.toLocaleString('es-AR')}`
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {(editandoLineas || creandoVersion) ? (
                          <input
                            type="number"
                            value={linea.markup_porcentaje}
                            onChange={(e) => actualizarLineaVersion(linea.id, 'markup_porcentaje', Number(e.target.value))}
                            disabled={linea.forzar_precio_pesos}
                            className={`w-14 px-1 py-0.5 border rounded text-xs text-right ${linea.forzar_precio_pesos ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                          />
                        ) : (
                          linea.forzar_precio_pesos ? <span className="text-gray-300">-</span> : `${linea.markup_porcentaje}%`
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {(editandoLineas || creandoVersion) ? (
                          <input
                            type="number"
                            value={linea.markup_nominal}
                            onChange={(e) => actualizarLineaVersion(linea.id, 'markup_nominal', Number(e.target.value))}
                            disabled={linea.forzar_precio_pesos}
                            className={`w-14 px-1 py-0.5 border rounded text-xs text-right ${linea.forzar_precio_pesos ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                          />
                        ) : (
                          linea.forzar_precio_pesos ? <span className="text-gray-300">-</span> : (linea.markup_nominal > 0 ? formatCurrency(linea.markup_nominal, linea.costo_moneda) : '-')
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {(editandoLineas || creandoVersion) ? (
                          <input type="checkbox" checked={linea.forzar_precio_pesos} onChange={(e) => actualizarLineaVersion(linea.id, 'forzar_precio_pesos', e.target.checked)}
                            className="w-3 h-3 text-emerald-600 border-gray-300 rounded cursor-pointer" />
                        ) : (
                          linea.forzar_precio_pesos ? <CheckCircle className="w-3 h-3 text-amber-500 mx-auto" /> : <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-medium">
                        {(editandoLineas || creandoVersion) ? (
                          linea.forzar_precio_pesos ? (
                            <input
                              type="number"
                              value={linea.precio_forzado_ars ?? ""}
                              onChange={(e) => actualizarLineaVersion(linea.id, 'precio_forzado_ars', e.target.value === "" ? null : Number(e.target.value))}
                              placeholder="Precio ARS"
                              className="w-28 px-1 py-0.5 border border-amber-400 bg-amber-50 rounded text-xs text-right text-amber-800 focus:ring-1 focus:ring-amber-400"
                            />
                          ) : (
                            <span className="text-emerald-700">{formatCurrency(linea.precio_venta, linea.precio_venta_moneda)}</span>
                          )
                        ) : (
                          linea.forzar_precio_pesos && linea.precio_forzado_ars ? (
                            <span className="text-amber-700">{formatPrecioForzadoARS(linea.precio_forzado_ars)}</span>
                          ) : (
                            <span className="text-emerald-700">{formatCurrency(linea.precio_venta, linea.precio_venta_moneda)}</span>
                          )
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {(editandoLineas || creandoVersion) ? (
                          <select value={linea.iva} onChange={(e) => actualizarLineaVersion(linea.id, 'iva', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs">
                            <option value={21}>21%</option>
                            <option value={10.5}>10.5%</option>
                            <option value={0}>0%</option>
                          </select>
                        ) : (
                          `${linea.iva}%`
                        )}
                      </td>
                      {(editandoLineas || creandoVersion) && (
                        <td className="py-1.5 px-2">
                          <button onClick={() => eliminarLineaVersion(linea.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {currentVersion.lineas.length === 0 && !editandoLineas && !creandoVersion && (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-500">No hay líneas en esta versión</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seguimiento */}
          {!creandoVersion && selectedVersion.seguimiento && (
            <SeguimientoPanel seguimiento={selectedVersion.seguimiento} />
          )}
        </div>
      </div>
    )
  }

  // Configuración: Categorías de NC
  const renderNcCategorias = () => {
    const guardarCategoria = async () => {
      const nombre = ncCategoriaNombre.trim()
      if (!nombre) return
      setNcCategoriaLoading(true)
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data, error } = await supabase
        .from("nc_categorias")
        .insert({ nombre })
        .select()
        .single()
      if (!error && data) {
        setNcCategorias(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setNcCategoriaNombre("")
        setNcCategoriaCreando(false)
      }
      setNcCategoriaLoading(false)
    }

    const guardarEdicion = async (id: number) => {
      const nombre = ncCategoriaEditNombre.trim()
      if (!nombre) return
      setNcCategoriaLoading(true)
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error } = await supabase.from("nc_categorias").update({ nombre }).eq("id", id)
      if (!error) {
        setNcCategorias(prev => prev.map(c => c.id === id ? { ...c, nombre } : c).sort((a, b) => a.nombre.localeCompare(b.nombre)))
        setNcCategoriaEditId(null)
        setNcCategoriaEditNombre("")
      }
      setNcCategoriaLoading(false)
    }

    const toggleActiva = async (cat: NcCategoria) => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error } = await supabase.from("nc_categorias").update({ activa: !cat.activa }).eq("id", cat.id)
      if (!error) setNcCategorias(prev => prev.map(c => c.id === cat.id ? { ...c, activa: !c.activa } : c))
    }

    const eliminar = async (id: number) => {
      if (!confirm("¿Eliminar esta categoría?")) return
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { error } = await supabase.from("nc_categorias").delete().eq("id", id)
      if (!error) setNcCategorias(prev => prev.filter(c => c.id !== id))
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4 bg-white border-b border-gray-200 py-3 px-4 -mx-6 -mt-6">
          <div>
            <h1 className="text-xl font-bold text-emerald-900">Notas de Crédito — Categorías</h1>
            <p className="text-sm text-gray-500 mt-0.5">{ncCategorias.length} categoría{ncCategorias.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => { setNcCategoriaCreando(true); setNcCategoriaNombre("") }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded hover:bg-emerald-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        </div>

        {ncCategoriaCreando && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <input
              type="text"
              value={ncCategoriaNombre}
              onChange={e => setNcCategoriaNombre(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") guardarCategoria(); if (e.key === "Escape") setNcCategoriaCreando(false) }}
            />
            <button
              onClick={guardarCategoria}
              disabled={ncCategoriaLoading || !ncCategoriaNombre.trim()}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {ncCategoriaLoading ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => { setNcCategoriaCreando(false); setNcCategoriaNombre("") }}
              className="px-3 py-2 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Nombre</th>
                <th className="text-center py-3 px-4 font-medium">Activa</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {ncCategorias.length === 0 && (
                <tr><td colSpan={3} className="py-10 text-center text-gray-400 text-sm">No hay categorías creadas</td></tr>
              )}
              {ncCategorias.map((cat, idx) => (
                <tr key={cat.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                  <td className="py-3 px-4">
                    {ncCategoriaEditId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ncCategoriaEditNombre}
                          onChange={e => setNcCategoriaEditNombre(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") guardarEdicion(cat.id); if (e.key === "Escape") { setNcCategoriaEditId(null) } }}
                        />
                        <button onClick={() => guardarEdicion(cat.id)} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">Guardar</button>
                        <button onClick={() => setNcCategoriaEditId(null)} className="text-gray-500 hover:text-gray-700 text-sm">Cancelar</button>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">{cat.nombre}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => toggleActiva(cat)} className="focus:outline-none">
                      {cat.activa
                        ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        : <X className="w-4 h-4 text-gray-400 mx-auto" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {cat.nombre.toLowerCase() === "equipos en parte de pago" || cat.nombre === "Equipos en parte de pago" ? (
                        <span className="text-xs text-gray-400 italic px-1">del sistema</span>
                      ) : (
                        <>
                          <button
                            onClick={() => { setNcCategoriaEditId(cat.id); setNcCategoriaEditNombre(cat.nombre) }}
                            className="text-gray-400 hover:text-emerald-600 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminar(cat.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Main content render
  const renderContent = () => {
    switch (activeView) {
      case "listado":
        return renderClientes()
      case "conciliacion":
        return renderConciliacion()
      case "ajustes":
        return renderAjustes()
      case "notas_venta":
        return renderNotasVenta()
      case "toma_equipo":
        return renderTomaEquipo()
      case "ordenes_entrega":
        return renderOrdenesEntrega()
      case "remitos":
        return renderRemitos()
      case "facturas":
        return renderFacturas()
      case "notas_debito":
        if (selectedAjuste) return renderFichaAjuste()
        return renderNotasDebitoCredito("debito")
      case "notas_credito":
        if (selectedAjuste) return renderFichaAjuste()
        return renderNotasDebitoCredito("credito")
      case "recibos":
        return renderRecibos()
      case "listas_precios":
        return renderListasPrecios()
      case "versiones_lista":
        return renderVersionesLista()
      case "categorias_cliente":
        return renderCategoriasCliente()
      case "nc_categorias":
        return renderNcCategorias()
      default:
        return renderDashboard()
    }
  }

  // Modal de Cliente
  const renderClienteModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-emerald-900">
            {editingItem ? "Editar Cliente" : "Nuevo Cliente"}
          </h2>
          <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={(e) => { handleSubmitClienteModal(e, editingItem, formClienteCategoriaId, categoriasCliente, setShowModal, setEditingItem, (c) => {
          // Si el modal se abrió desde una NV o desde el módulo Ventas activo, auto-seleccionar el cliente creado
          if (creandoNV) setNvClienteId(c.id)
          onNuevoCliente?.(c)
        }) }} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
              <input type="text" name="nombre" defaultValue={editingItem?.nombre || ""} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Fantasía</label>
              <input type="text" name="nombre_fantasia" defaultValue={editingItem?.nombre_fantasia || ""}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento *</label>
              <select name="tipo_documento" defaultValue={editingItem?.tipo_documento || "DNI"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Documento *</label>
              <input type="text" name="numero_documento" defaultValue={editingItem?.numero_documento || ""} required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posición Fiscal *</label>
              <select name="posicion_fiscal" defaultValue={editingItem?.posicion_fiscal || "consumidor_final"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="consumidor_final">Consumidor Final</option>
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributista">Monotributista</option>
                <option value="exento">Exento</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" name="direccion" defaultValue={editingItem?.direccion || ""}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" name="ciudad" defaultValue={editingItem?.ciudad || "Rosario"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" name="telefono" defaultValue={editingItem?.telefono || ""}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
              <input type="text" name="celular" defaultValue={editingItem?.celular || ""}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" defaultValue={editingItem?.email || ""}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categor��a *</label>
              <select name="categoria" defaultValue={editingItem?.categoria || "publico"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="publico">Público General</option>
                <option value="mercadolibre">MercadoLibre</option>
                <option value="mayorista">Mayorista</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select name="vendedor_id" defaultValue={editingItem?.vendedor_id || ""}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sin asignar</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios</label>
              <select name="lista_precios_id" defaultValue={editingItem?.lista_precios_id || 1}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {listasPrecios.map(lp => (
                  <option key={lp.id} value={lp.id}>{lp.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Término de Pago</label>
              <select name="termino_pago_id" defaultValue={editingItem?.termino_pago_id || 1}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {mockTerminosPago.map(tp => (
                  <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Default (%)</label>
              <input type="number" name="descuento_default" step="0.01" min="0" max="100" 
                defaultValue={editingItem?.descuento_default || 0}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Cta. Cte.</label>
              <select name="moneda_cuenta_corriente" defaultValue={editingItem?.moneda_cuenta_corriente || "ARS"}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="ARS">ARS - Pesos</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800">
              {editingItem ? "Guardar Cambios" : "Crear Cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  // Modal de Nota de Venta
  const [nvLineas, setNvLineas] = useState<LineaNV[]>([])
  const [nvClienteId, setNvClienteId] = useState<number | null>(null)
  
  const renderNotaVentaModal = () => {
    const selectedCliente = clientes.find(c => c.id === nvClienteId)
    const subtotal = nvLineas.reduce((sum, l) => sum + l.subtotal, 0)
    const total = subtotal * 1.21

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-emerald-900">
              {editingItem ? `Editar Nota de Venta ${editingItem.numero}` : "Nueva Nota de Venta"}
            </h2>
            <button onClick={() => { setShowModal(false); setNvLineas([]); setNvClienteId(null) }} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const cliente = clientes.find(c => c.id === nvClienteId)
            if (!cliente || nvLineas.length === 0) {
              alert("Debe seleccionar un cliente y agregar al menos un producto")
              return
            }
            const tipoVenta = formData.get("tipo_venta") as "inmediata" | "pedido"
            const moneda = formData.get("moneda") as "ARS" | "USD"
            const deposito = formData.get("deposito") as string || "Puerto Norte"
            const vendedorId = parseInt(formData.get("vendedor_id") as string) || 1
            const vendedorNombre = vendedores.find(v => v.id === vendedorId)?.nombre || "Max Solina"
            const terminoPagoId = parseInt(formData.get("termino_pago_id") as string) || 1
            const terminoPagoNombre = mockTerminosPago.find(tp => tp.id === terminoPagoId)?.nombre || "Contado Efectivo"
            const nvNumero = editingItem?.numero || `NV X 10000-000${10737 + notasVenta.length}`
            const nvId = editingItem?.id || notasVenta.length + 1
            const fechaHoy = new Date().toISOString()

            const newNV: NotaVenta = {
              id: nvId,
              numero: nvNumero,
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              cliente_codigo: cliente.codigo,
              vendedor_id: vendedorId,
              vendedor_nombre: vendedorNombre,
              fecha: fechaHoy,
              estado: tipoVenta === "inmediata" ? "finalizada" : "borrador",
              moneda: moneda,
              tipo_cotizacion: "blue",
              cotizacion: 1150,
              lista_precios_id: parseInt(formData.get("lista_precios_id") as string) || 1,
              termino_pago_id: terminoPagoId,
              termino_pago_nombre: terminoPagoNombre,
              deposito: deposito,
              tipo_venta: tipoVenta,
              lineas: nvLineas,
              subtotal: subtotal,
              descuento_global: 0,
              impuestos: 0,
              total: subtotal,
              sucursal: "Puerto Norte",
              punto_venta: "10000"
            }

            if (editingItem) {
              setNotasVenta(prev => prev.map(nv => nv.id === editingItem.id ? newNV : nv))
            } else {
              setNotasVenta(prev => [...prev, newNV])
            }

            // Si es venta inmediata, generar automáticamente OE, Remito, Factura y Recibo
            if (tipoVenta === "inmediata" && !editingItem) {
              const oeNumero = `OE X 10000-000${1050 + ordenesEntrega.length}`
              const oeId = ordenesEntrega.length + 1
              
              // 1. Crear Orden de Entrega (confirmada)
              const newOE: OrdenEntrega = {
                id: oeId,
                numero: oeNumero,
                nota_venta_id: nvId,
                nota_venta_numero: nvNumero,
                cliente_id: cliente.id,
                cliente_nombre: cliente.nombre,
                estado: "confirmada",
                fecha_creacion: fechaHoy,
                fecha_entrega: fechaHoy,
                domicilio_envio: cliente.direccion,
                deposito: deposito,
                sucursal: "Puerto Norte",
                remito_numero: null,
                productos: nvLineas.map(l => ({
                  producto_id: l.producto_id,
                  producto_nombre: l.producto_nombre,
                  cantidad: l.cantidad,
                  reserva: l.cantidad,
                  estado: "confirmado" as const
                }))
              }
              setOrdenesEntrega(prev => [...prev, newOE])

              const remitoNumero = `R X 10000-000${5035 + remitos.length}`
              const remitoId = remitos.length + 1
              
              // 2. Crear Remito (aprobado - descuenta stock)
              const newRemito: Remito = {
                id: remitoId,
                numero: remitoNumero,
                orden_entrega_id: oeId,
                orden_entrega_numero: oeNumero,
                cliente_id: cliente.id,
                cliente_nombre: cliente.nombre,
                estado: "aprobado",
                fecha: fechaHoy,
                fecha_entrega: fechaHoy,
                domicilio_envio: cliente.direccion,
                transporte: "Retira en sucursal",
                chofer: "",
                factura_numero: null,
                nota_venta_numero: nvNumero,
                sucursal: "Puerto Norte",
                deposito: deposito,
                peso_kg: 0,
                peso_neto_kg: 0,
                bultos: 1,
                valor_declarado: total,
                control_factura: "facturado"
              }
              setRemitos(prev => [...prev, newRemito])

              // Actualizar OE con número de remito
              setOrdenesEntrega(prev => prev.map(oe => 
                oe.id === oeId ? { ...oe, remito_numero: remitoNumero } : oe
              ))

              const facturaNumero = `FC X 10000-000${20050 + facturas.length}`
              const facturaId = facturas.length + 1
              
              // 3. Crear Factura en borrador
              const newFactura: Factura = {
                id: facturaId,
                numero: facturaNumero,
                tipo: "B",
                nota_venta_id: nvId,
                nota_venta_numero: nvNumero,
                cliente_id: cliente.id,
                cliente_nombre: cliente.nombre,
                cliente_documento: cliente.numero_documento,
                estado: "borrador",
                fecha: fechaHoy,
                vendedor_nombre: vendedorNombre,
                domicilio_facturacion: cliente.direccion,
                moneda: moneda,
                tipo_cotizacion: "blue",
                cotizacion: 1150,
                termino_pago: terminoPagoNombre,
                subtotal: subtotal,
                descuento: 0,
                impuestos: 0,
                total: subtotal,
                saldo: subtotal,
                sucursal: "Puerto Norte",
                lineas: nvLineas.map(l => ({
                  producto_nombre: l.producto_nombre,
                  descripcion: "",
                  cantidad: l.cantidad,
                  precio_unitario: l.precio_unitario,
                  descuento: l.descuento,
                  subtotal: l.subtotal
                })),
                vencimientos: [{
                  descripcion: "Vencimiento 1",
                  fecha: fechaHoy.split('T')[0],
                  total: subtotal
                }]
              }
              setFacturas(prev => [...prev, newFactura])

              // Actualizar Remito con número de factura
              setRemitos(prev => prev.map(r => 
                r.id === remitoId ? { ...r, factura_numero: facturaNumero } : r
              ))
            }

            setShowModal(false)
            setNvLineas([])
            setNvClienteId(null)
            setEditingItem(null)
          }} className="p-4 space-y-4">
            {/* Datos generales */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select
                  value={nvClienteId || ""}
                  onChange={(e) => {
                    if (e.target.value === "__nuevo__") {
                      setEditingItem(null)
                      setFormClienteCategoriaId(null)
                      setModalType("cliente")
                      setShowModal(true)
                    } else {
                      setNvClienteId(parseInt(e.target.value))
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                  ))}
                  <option value="__nuevo__" className="text-emerald-600 font-medium">+ Crear nuevo cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
                <select name="vendedor_id" defaultValue={editingItem?.vendedor_id || 1}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Venta</label>
                <select name="tipo_venta" defaultValue={editingItem?.tipo_venta || "inmediata"}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="inmediata">Inmediata</option>
                  <option value="pedido">Pedido</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select name="moneda" defaultValue={editingItem?.moneda || "ARS"}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="ARS">ARS - Pesos</option>
                  <option value="USD">USD - Dólares</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios</label>
                <select name="lista_precios_id" defaultValue={editingItem?.lista_precios_id || selectedCliente?.lista_precios_id || 1}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {listasPrecios.map(lp => (
                    <option key={lp.id} value={lp.id}>{lp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Término de Pago</label>
                <select name="termino_pago_id" defaultValue={editingItem?.termino_pago_id || selectedCliente?.termino_pago_id || 1}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {mockTerminosPago.map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depósito</label>
                <select name="deposito" defaultValue={editingItem?.deposito || ""}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Seleccionar depósito...</option>
                  {depositos.map(d => (
                    <option key={d.id} value={d.nombre}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Líneas de productos */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
                <span className="font-medium text-sm">Productos</span>
                <button type="button" onClick={() => {
                  const newLinea: LineaNV = {
                    id: nvLineas.length + 1,
                    producto_id: 0,
                    producto_nombre: "",
                    producto_sku: "",
                    cantidad: 1,
                    precio_unitario: 0,
                    descuento: 0,
                    subtotal: 0,
                    fecha_entrega: new Date().toISOString().split('T')[0]
                  }
                  setNvLineas([...nvLineas, newLinea])
                }} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar Producto
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-3">Producto</th>
                    <th className="text-center py-2 px-3 w-24">Cantidad</th>
                    <th className="text-right py-2 px-3 w-32">Precio Unit.</th>
                    <th className="text-center py-2 px-3 w-24">Dto. %</th>
                    <th className="text-right py-2 px-3 w-32">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {nvLineas.map((linea, index) => (
                    <tr key={linea.id} className="border-b">
                      <td className="py-2 px-3">
                        <input type="text" value={linea.producto_nombre} 
                          onChange={(e) => {
                            const updated = [...nvLineas]
                            updated[index].producto_nombre = e.target.value
                            setNvLineas(updated)
                          }}
                          placeholder="Nombre del producto"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.cantidad} min="1"
                          onChange={(e) => {
                            const updated = [...nvLineas]
                            updated[index].cantidad = parseInt(e.target.value) || 1
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setNvLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.precio_unitario} min="0" step="0.01"
                          onChange={(e) => {
                            const updated = [...nvLineas]
                            updated[index].precio_unitario = parseFloat(e.target.value) || 0
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setNvLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.descuento} min="0" max="100" step="0.01"
                          onChange={(e) => {
                            const updated = [...nvLineas]
                            updated[index].descuento = parseFloat(e.target.value) || 0
                            updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                            setNvLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" />
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(linea.subtotal)}
                      </td>
                      <td className="py-2 px-3">
                        <button type="button" onClick={() => setNvLineas(nvLineas.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {nvLineas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        No hay productos agregados. Haga clic en "Agregar Producto" para comenzar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (21%):</span>
                  <span className="font-medium">{formatCurrency(subtotal * 0.21)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-emerald-700">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { setShowModal(false); setNvLineas([]); setNvClienteId(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800">
                {editingItem ? "Guardar Cambios" : "Crear Nota de Venta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Modal de Recibo
  const [reciboPagos, setReciboPagos] = useState<{forma_pago: string; importe: number; moneda: "ARS" | "USD"}[]>([])
  const [reciboClienteId, setReciboClienteId] = useState<number | null>(null)

  const renderReciboModal = () => {
    const totalPagos = reciboPagos.reduce((sum, p) => sum + p.importe, 0)

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-emerald-900">Nuevo Recibo</h2>
            <button onClick={() => { setShowModal(false); setReciboPagos([]); setReciboClienteId(null) }} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const cliente = clientes.find(c => c.id === reciboClienteId)
            if (!cliente || reciboPagos.length === 0) {
              alert("Debe seleccionar un cliente y agregar al menos un pago")
              return
            }
            const reciboNumero = `RC X Norte-000${11735 + recibos.length}`
            const reciboId = recibos.length + 1
            const fechaHoy = new Date().toISOString()

            const newRecibo: Recibo = {
              id: reciboId,
              numero: reciboNumero,
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              estado: "publicado", // Publicado porque tiene pagos
              fecha: fechaHoy,
              importe: totalPagos,
              importe_no_conciliado: 0, // Ya se aplicó
              moneda: "ARS",
              sucursal: "Puerto Norte",
              caja: formData.get("caja") as string || "Caja Principal",
              cobrador_nombre: vendedores.find(v => v.id === parseInt(formData.get("cobrador_id") as string))?.nombre || "Max Solina",
              nota_venta_numero: null,
              concepto: formData.get("concepto") as string || "Cobro de venta",
              pagos: reciboPagos
            }
            setRecibos(prev => [...prev, newRecibo])

            // Crear movimiento de CREDITO en cuenta corriente
            const saldoAnteriorCliente = cliente.saldo_cuenta_corriente
            const nuevoMovimientoCredito: MovimientoCuentaCorriente = {
              id: movimientosCC.length + 1,
              cliente_id: cliente.id,
              fecha: fechaHoy,
              tipo: "credito",
              concepto: formData.get("concepto") as string || "Pago recibido",
              documento_tipo: "recibo",
              documento_numero: reciboNumero,
              documento_id: reciboId,
              moneda: "ARS",
              importe: totalPagos,
              saldo_posterior: saldoAnteriorCliente - totalPagos
            }
            setMovimientosCC(prev => [...prev, nuevoMovimientoCredito])

            // Actualizar saldo del cliente (el recibo reduce la deuda = crédito)
            setClientes(prev => prev.map(c =>
              c.id === cliente.id ? {
                ...c,
                saldo_cuenta_corriente: c.saldo_cuenta_corriente - totalPagos
              } : c
            ))

            setShowModal(false)
            setReciboPagos([])
            setReciboClienteId(null)
          }} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={reciboClienteId || ""} onChange={(e) => setReciboClienteId(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cobrador</label>
                <select name="cobrador_id" defaultValue="1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caja</label>
                <select name="caja" defaultValue="Caja Principal"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="Caja Principal">Caja Principal</option>
                  <option value="Caja Chica">Caja Chica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input type="text" name="concepto" defaultValue="Cobro de venta"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>

            {/* Pagos */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
                <span className="font-medium text-sm">Formas de Pago</span>
                <button type="button" onClick={() => {
                  setReciboPagos([...reciboPagos, { forma_pago: "Efectivo", importe: 0, moneda: "ARS" }])
                }} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar Pago
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-3">Forma de Pago</th>
                    <th className="text-left py-2 px-3 w-32">Moneda</th>
                    <th className="text-right py-2 px-3 w-40">Importe</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {reciboPagos.map((pago, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">
                        <select value={pago.forma_pago} onChange={(e) => {
                          const updated = [...reciboPagos]
                          updated[index].forma_pago = e.target.value
                          setReciboPagos(updated)
                        }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                          <option value="Efectivo">Efectivo</option>
                          <option value="Transferencia">Transferencia Bancaria</option>
                          <option value="Tarjeta Débito">Tarjeta Débito</option>
                          <option value="Tarjeta Crédito">Tarjeta Crédito</option>
                          <option value="Cheque">Cheque</option>
                          <option value="MercadoPago">MercadoPago</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select value={pago.moneda} onChange={(e) => {
                          const updated = [...reciboPagos]
                          updated[index].moneda = e.target.value as "ARS" | "USD"
                          setReciboPagos(updated)
                        }} className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={pago.importe} min="0" step="0.01"
                          onChange={(e) => {
                            const updated = [...reciboPagos]
                            updated[index].importe = parseFloat(e.target.value) || 0
                            setReciboPagos(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-3">
                        <button type="button" onClick={() => setReciboPagos(reciboPagos.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reciboPagos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-400">
                        No hay pagos agregados. Haga clic en "Agregar Pago" para comenzar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold">Total: {formatCurrency(totalPagos)}</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { setShowModal(false); setReciboPagos([]); setReciboClienteId(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800">
                Crear Recibo
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Modal de Ajuste
  const [ajusteLineas, setAjusteLineas] = useState<{descripcion: string; fecha_vencimiento: string; importe: number}[]>([])
  const [ajusteClienteId, setAjusteClienteId] = useState<number | null>(null)

  const renderAjusteModal = () => {
    const totalAjuste = ajusteLineas.reduce((sum, l) => sum + l.importe, 0)

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-emerald-900">Nuevo Ajuste de Cliente</h2>
            <button onClick={() => { setShowModal(false); setAjusteLineas([]); setAjusteClienteId(null) }} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const cliente = clientes.find(c => c.id === ajusteClienteId)
            if (!cliente || ajusteLineas.length === 0) {
              alert("Debe seleccionar un cliente y agregar al menos una línea")
              return
            }
            const newAjuste: AjusteCliente = {
              id: ajustes.length + 1,
              numero: `AJ X 10000-000001${24 + ajustes.length}`,
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              estado: "borrador",
              fecha: new Date().toISOString().split('T')[0],
              concepto: formData.get("concepto") as string,
              moneda: formData.get("moneda") as "ARS" | "USD",
              nota_venta_numero: null,
              sucursal: "Puerto Norte",
              categoria: (formData.get("categoria") as string) || null,
              lineas: ajusteLineas,
              total: totalAjuste
            }
            setAjustes(prev => [...prev, newAjuste])
            setShowModal(false)
            setAjusteLineas([])
            setAjusteClienteId(null)
          }} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <select value={ajusteClienteId || ""} onChange={(e) => setAjusteClienteId(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                <select name="moneda" defaultValue="ARS"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="ARS">ARS - Pesos</option>
                  <option value="USD">USD - Dólares</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
              <input type="text" name="concepto" required placeholder="Ej: Bonificación especial, Ajuste de saldo..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select name="categoria" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sin categoría</option>
                {ncCategorias.filter(c => c.activa).map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Líneas */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
                <span className="font-medium text-sm">Líneas del Ajuste</span>
                <button type="button" onClick={() => {
                  setAjusteLineas([...ajusteLineas, { descripcion: "", fecha_vencimiento: new Date().toISOString().split('T')[0], importe: 0 }])
                }} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar Línea
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-3">Descripción</th>
                    <th className="text-left py-2 px-3 w-40">Fecha Venc.</th>
                    <th className="text-right py-2 px-3 w-40">Importe</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {ajusteLineas.map((linea, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">
                        <input type="text" value={linea.descripcion} 
                          onChange={(e) => {
                            const updated = [...ajusteLineas]
                            updated[index].descripcion = e.target.value
                            setAjusteLineas(updated)
                          }}
                          placeholder="Descripci��n del ajuste"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="date" value={linea.fecha_vencimiento}
                          onChange={(e) => {
                            const updated = [...ajusteLineas]
                            updated[index].fecha_vencimiento = e.target.value
                            setAjusteLineas(updated)
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={linea.importe} step="0.01"
                          onChange={(e) => {
                            const updated = [...ajusteLineas]
                            updated[index].importe = parseFloat(e.target.value) || 0
                            setAjusteLineas(updated)
                          }}
                          placeholder="Negativo para NC"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-3">
                        <button type="button" onClick={() => setAjusteLineas(ajusteLineas.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {ajusteLineas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-400">
                        No hay líneas. Use importes negativos para créditos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className={`text-lg font-bold ${totalAjuste < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                Total: {formatCurrency(totalAjuste)}
              </span>
              <span className="text-sm text-gray-500">
                {totalAjuste < 0 ? "(Crédito a favor del cliente)" : "(Débito al cliente)"}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { setShowModal(false); setAjusteLineas([]); setAjusteClienteId(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800">
                Crear Ajuste
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {renderSidebar()}
      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>

      {/* Modals */}
      {showModal && modalType === "cliente" && renderClienteModal()}
      {showModal && modalType === "nota_venta" && renderNotaVentaModal()}
      {showModal && modalType === "recibo" && renderReciboModal()}
      {showModal && modalType === "ajuste" && renderAjusteModal()}
      
      {/* Modal de selección de Series/IMEI */}
      {showSerieModal && serieModalLineaIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Seleccionar IMEI / Serie
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {nvLineas[serieModalLineaIndex]?.producto_nombre} - Cantidad: {nvLineas[serieModalLineaIndex]?.cantidad}
                </p>
              </div>
              <button 
                onClick={() => { setShowSerieModal(false); setSerieModalLineaIndex(null); setSeriesSeleccionadasTemp([]) }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Ubicación: <span className="font-medium">{ubicacionesVenta.find(u => u.id === nvUbicacionId)?.codigo}</span>
                </span>
                <span className={`text-sm font-medium ${seriesSeleccionadasTemp.length === nvLineas[serieModalLineaIndex]?.cantidad ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {seriesSeleccionadasTemp.length} de {nvLineas[serieModalLineaIndex]?.cantidad} seleccionados
                </span>
              </div>
              <div className="space-y-2">
                {seriesRealesCargando ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Cargando series disponibles...</p>
                  </div>
                ) : seriesReales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay series disponibles en esta ubicación</p>
                    <p className="text-sm mt-1">Cambie la ubicación de stock o verifique el inventario</p>
                  </div>
                ) : (
                  seriesReales.map(serie => {
                    const isSelected = seriesSeleccionadasTemp.includes(serie.id)
                    const cantidadRequerida = nvLineas[serieModalLineaIndex!]?.cantidad || 0
                    const puedeSeleccionar = seriesSeleccionadasTemp.length < cantidadRequerida
                    return (
                      <label
                        key={serie.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50'
                            : puedeSeleccionar
                              ? 'border-gray-200 hover:bg-gray-50'
                              : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!isSelected && !puedeSeleccionar}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSeriesSeleccionadasTemp([...seriesSeleccionadasTemp, serie.id])
                            } else {
                              setSeriesSeleccionadasTemp(seriesSeleccionadasTemp.filter(id => id !== serie.id))
                            }
                          }}
                          className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-gray-900">{serie.serie}</span>
                            {serie.lote && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Lote: {serie.lote}</span>
                            )}
                          </div>
                          {serie.detalles && <div className="text-sm text-gray-600 mt-1">{serie.detalles}</div>}
                          <div className="text-xs text-gray-400 mt-1">Ingreso: {formatDate(serie.fecha_ingreso)}</div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <span className="text-sm text-gray-500">
                {seriesSeleccionadasTemp.length < (nvLineas[serieModalLineaIndex]?.cantidad || 0) && (
                  <span className="text-amber-600">Faltan seleccionar {(nvLineas[serieModalLineaIndex]?.cantidad || 0) - seriesSeleccionadasTemp.length} unidades</span>
                )}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowSerieModal(false); setSerieModalLineaIndex(null); setSeriesSeleccionadasTemp([]) }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const updated = [...nvLineas]
                    updated[serieModalLineaIndex].series_seleccionadas = seriesSeleccionadasTemp.map(id => {
                      const serie = seriesReales.find(s => s.id === id)!
                      return { id: serie.id, serie: serie.serie, detalles: serie.detalles }
                    })
                    setNvLineas(updated)
                    setShowSerieModal(false)
                    setSerieModalLineaIndex(null)
                    setSeriesSeleccionadasTemp([])
                  }}
                  disabled={seriesSeleccionadasTemp.length !== nvLineas[serieModalLineaIndex]?.cantidad}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar seleccion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
