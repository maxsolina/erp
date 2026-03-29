"use client"

import React, { useState, useMemo, useRef, useEffect } from "react"
import { Search, Filter, ChevronDown, X, Plus, FileText, Truck, Package, ArrowRight, Eye, Edit, Trash2, Download, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Calendar, Tag, RefreshCw, Barcode, QrCode, Layers, ArrowLeftRight, ClipboardCheck, TrendingUp, TrendingDown, Box, Warehouse, Hash, RotateCcw, ChevronRight, MessageSquare, Star, User, Activity, BarChart3, Settings, DollarSign, Users, GripVertical } from "lucide-react"
import OdooFilterBar, { FilterOption, GroupByOption, SavedFilter } from "./odoo-filter-bar"
import BotonVolver from "./ui/boton-volver"
import { FormularioProducto, type FormProducto } from "./modulo-productos"

// Types para Stock/Deposito
interface Deposito {
  id: number
  codigo: string // Nombre corto: CC, PN, CS
  nombre: string // Nombre completo: Casa Central
  sucursal: string
  direccion: string
  subcompanias: string[]
  deposito_distribucion: boolean
  deposito_tercero: boolean
  activo: boolean
  // Ubicaciones predeterminadas
  ubicacion_entrada_id: number | null
  ubicacion_control_calidad_id: number | null
  ubicacion_empaquetado_id: number | null
  ubicacion_salida_id: number | null
  ubicacion_stock_id: number | null
  // Configuración
  recepcion_automatica: boolean
  albaranes_entrada: string
  envios_salientes: string
  depositos_reabastecimiento: number[] // IDs de otros depósitos
}

interface CategoriaUbicacion {
  id: number
  codigo: string
  nombre: string
  descripcion: string
}

interface Ubicacion {
  id: number
  deposito_id: number
  codigo: string // CC/Stock, CC/Input, PN/Outlet
  nombre: string
  tipo: "interna" | "vista" | "transito" | "inventario" | "produccion" | "proveedor" | "cliente"
  categoria_id: number | null // Relación con CategoriaUbicacion
  categoria_nombre: string // Stock, Transitoria, Cliente en Consignacion, Bienes de Uso
  activa: boolean
  es_scrap: boolean
  es_devolucion: boolean
  disponible_venta: boolean // Si está habilitada para NV (Notas de Venta)
}

interface CategoriaProducto {
  id: number
  nombre: string
  categoria_padre_id: number | null
  ruta: string // ej: "Todos / Repuestos / Celulares / Baterías"
}

interface ProductoStock {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  categoria_id: number
  categoria_ruta: string
  tipo: "almacenable" | "consumible" | "servicio"
  tracking: "ninguno" | "lote" | "serie"
  puede_venderse: boolean
  puede_comprarse: boolean
  precio_venta: number
  precio_costo: number
  moneda_costo: "ARS" | "USD"
  // Stock por ubicación
  ubicacion_id: number
  ubicacion_codigo: string
  deposito_id: number
  deposito_codigo: string
  stock_real: number
  stock_entrante: number
  stock_saliente: number
  stock_disponible: number
  stock_virtual: number
  stock_minimo: number
  stock_maximo: number
  stock_critico: number
  punto_pedido: number
  marca: string
  modelo: string
  color: string
  origen: string
  codigo_barras: string
  codigo_dun14: string
  cuenta_analitica: string
  imagen_url: string | null
  activo: boolean
}

interface LoteSerie {
  id: number
  producto_id: number
  producto_codigo: string
  producto_nombre: string
  producto_categoria: string
  marca: string
  numero: string // IMEI para celulares, numero de lote para otros
  referencia_interna: string
  cantidad: number
  ubicacion_id: number
  ubicacion_nombre: string
  deposito_id: number
  deposito_nombre: string
  sucursal: string
  fecha_vencimiento: string | null
  bateria: number | null // porcentaje para celulares
  color: string | null
  estado: "disponible" | "reservado" | "vendido"
}

// Tipo para el sistema de seguimiento (tracking de cambios)
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

interface TransferenciaInterna {
  id: number
  numero: string
  deposito_id: number
  deposito_nombre: string
  ubicacion_origen_id: number
  ubicacion_origen_nombre: string
  ubicacion_destino_id: number
  ubicacion_destino_nombre: string
  fecha_creacion: string
  fecha_transferencia: string | null
  estado: "borrador" | "confirmada" | "cancelada"
  sucursal: string
  observaciones: string
  lineas: {
    producto_id: number
    producto_nombre: string
    stock_virtual: number
    cantidad: number
    observacion: string
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface PedidoAbastecimiento {
  id: number
  numero: string
  deposito_origen_id: number
  deposito_origen_nombre: string
  deposito_destino_id: number
  deposito_destino_nombre: string
  categoria_ubicacion: string
  fecha: string
  estado: "borrador" | "en_ejecucion" | "realizado" | "cancelado"
  sucursal: string
  ruta_predefinida: string
  transporte: string
  observaciones: string
  lineas: {
    producto_id: number
    producto_nombre: string
    cantidad_udd: number
    udd: string
    cantidad: number
    udm: string
  }[]
}

interface ControlInventario {
  id: number
  numero: string
  deposito_id: number
  deposito_nombre: string
  ubicacion_id: number
  ubicacion_nombre: string
  fecha: string
  concepto: string
  tipo_inventario: "todos" | "algunos"
  estado: "borrador" | "en_proceso" | "confirmado" | "cancelado"
  sucursal: string
  cuenta_analitica: string
  desreservar_automatico: boolean
  observaciones: string
  lineas: {
    producto_id: number
    producto_codigo: string
    producto_nombre: string
    stock_teorico: number
    stock_contado: number | null
    diferencia: number
  }[]
}

interface AjusteInventario {
  id: number
  numero: string
  tipo: "positivo" | "negativo"
  deposito_id: number
  deposito_nombre: string
  ubicacion_id: number
  ubicacion_nombre: string
  fecha: string
  concepto: string
  estado: "borrador" | "confirmado" | "cancelado"
  sucursal: string
  observaciones: string
  lineas: {
    producto_id: number
    producto_codigo: string
    producto_nombre: string
    cantidad: number
    costo_unitario: number
  }[]
}

// Mock Data
const mockCategoriasUbicacion: CategoriaUbicacion[] = [
  { id: 1, codigo: "STOCK", nombre: "Stock", descripcion: "Ubicaciones de almacenamiento principal" },
  { id: 2, codigo: "TRANS", nombre: "Transitoria", descripcion: "Ubicaciones temporales de tránsito" },
  { id: 3, codigo: "CONSIG", nombre: "Cliente en Consignación", descripcion: "Stock en ubicación del cliente" },
  { id: 4, codigo: "BUSO", nombre: "Bienes de Uso", descripcion: "Activos fijos de la empresa" },
  { id: 5, codigo: "REP", nombre: "Reparación", descripcion: "Equipos en servicio técnico" },
  { id: 6, codigo: "SCRAP", nombre: "Scrap/Baja", descripcion: "Productos dados de baja" },
]

const mockDepositos: Deposito[] = [
  { 
    id: 1, codigo: "CC", nombre: "Casa Central", sucursal: "Casa Central", 
    direccion: "C001793 - Ciento Ocho SRL", subcompanias: [],
    deposito_distribucion: false, deposito_tercero: false, activo: true,
    ubicacion_entrada_id: 101, ubicacion_control_calidad_id: 102, 
    ubicacion_empaquetado_id: 103, ubicacion_salida_id: 104, ubicacion_stock_id: 1,
    recepcion_automatica: false, 
    albaranes_entrada: "Recibir bienes directamente en las existencias (1 paso)",
    envios_salientes: "Enviar directamente desde la existencias (Sólo enviar)",
    depositos_reabastecimiento: [2, 3]
  },
  { 
    id: 2, codigo: "PN", nombre: "Puerto Norte", sucursal: "Puerto Norte", 
    direccion: "Córdoba 890", subcompanias: [],
    deposito_distribucion: false, deposito_tercero: false, activo: true,
    ubicacion_entrada_id: 201, ubicacion_control_calidad_id: null, 
    ubicacion_empaquetado_id: null, ubicacion_salida_id: 202, ubicacion_stock_id: 8,
    recepcion_automatica: false, 
    albaranes_entrada: "Recibir bienes directamente en las existencias (1 paso)",
    envios_salientes: "Enviar directamente desde la existencias (Sólo enviar)",
    depositos_reabastecimiento: [1]
  },
  { 
    id: 3, codigo: "CS", nombre: "Casilda", sucursal: "Casilda", 
    direccion: "San Martín 500", subcompanias: [],
    deposito_distribucion: false, deposito_tercero: false, activo: true,
    ubicacion_entrada_id: 301, ubicacion_control_calidad_id: null, 
    ubicacion_empaquetado_id: null, ubicacion_salida_id: 302, ubicacion_stock_id: 12,
    recepcion_automatica: false, 
    albaranes_entrada: "Recibir bienes directamente en las existencias (1 paso)",
    envios_salientes: "Enviar directamente desde la existencias (Sólo enviar)",
    depositos_reabastecimiento: [1]
  },
]

const mockUbicaciones: Ubicacion[] = [
  // Casa Central - Ubicaciones principales
  { id: 1, deposito_id: 1, codigo: "CC/Stock", nombre: "Stock", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: true },
  { id: 2, deposito_id: 1, codigo: "CC/Usados", nombre: "Usados", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: true },
  { id: 3, deposito_id: 1, codigo: "CC/Deposito B", nombre: "Depósito B", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: true },
  { id: 4, deposito_id: 1, codigo: "CC/Deposito C", nombre: "Depósito C", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 5, deposito_id: 1, codigo: "CC/En Reparación", nombre: "En Reparación", tipo: "interna", categoria_id: 5, categoria_nombre: "Reparación", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 6, deposito_id: 1, codigo: "CC/Dados de Baja", nombre: "Dados de Baja", tipo: "inventario", categoria_id: 6, categoria_nombre: "Scrap/Baja", activa: true, es_scrap: true, es_devolucion: false, disponible_venta: false },
  { id: 7, deposito_id: 1, codigo: "CC/Mercado Libre - Full", nombre: "Mercado Libre - Full", tipo: "interna", categoria_id: 3, categoria_nombre: "Cliente en Consignación", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  // Casa Central - Ubicaciones especiales
  { id: 101, deposito_id: 1, codigo: "CC/Input", nombre: "Entrada", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 102, deposito_id: 1, codigo: "CC/Quality Control", nombre: "Control de Calidad", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 103, deposito_id: 1, codigo: "CC/Zona de empaquetado", nombre: "Zona de Empaquetado", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 104, deposito_id: 1, codigo: "CC/Salida", nombre: "Salida", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  // Casa Central - Ubicaciones de clientes en consignación
  { id: 105, deposito_id: 1, codigo: "CC/Like Store", nombre: "Like Store", tipo: "interna", categoria_id: 3, categoria_nombre: "Cliente en Consignación", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 106, deposito_id: 1, codigo: "CC/Alcorta Damian", nombre: "Alcorta Damian", tipo: "interna", categoria_id: 3, categoria_nombre: "Cliente en Consignación", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 107, deposito_id: 1, codigo: "CC/Caep", nombre: "Caep", tipo: "interna", categoria_id: 3, categoria_nombre: "Cliente en Consignación", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 108, deposito_id: 1, codigo: "CC/Offline", nombre: "Offline", tipo: "interna", categoria_id: 3, categoria_nombre: "Cliente en Consignación", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 109, deposito_id: 1, codigo: "CC/Activos LOCAL", nombre: "Activos LOCAL", tipo: "interna", categoria_id: 4, categoria_nombre: "Bienes de Uso", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  // Puerto Norte
  { id: 8, deposito_id: 2, codigo: "PN/Stock", nombre: "Stock", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: true },
  { id: 9, deposito_id: 2, codigo: "PN/Outlet", nombre: "Outlet", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: true },
  { id: 10, deposito_id: 2, codigo: "PN/No disponible venta", nombre: "No disponible venta", tipo: "interna", categoria_id: 6, categoria_nombre: "Scrap/Baja", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 11, deposito_id: 2, codigo: "PN/En uso", nombre: "En uso", tipo: "interna", categoria_id: 4, categoria_nombre: "Bienes de Uso", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 201, deposito_id: 2, codigo: "PN/Input", nombre: "Entrada", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 202, deposito_id: 2, codigo: "PN/Output", nombre: "Salida", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  // Casilda
  { id: 12, deposito_id: 3, codigo: "CS/Stock", nombre: "Stock", tipo: "interna", categoria_id: 1, categoria_nombre: "Stock", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: true },
  { id: 301, deposito_id: 3, codigo: "CS/Input", nombre: "Entrada", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
  { id: 302, deposito_id: 3, codigo: "CS/Output", nombre: "Salida", tipo: "interna", categoria_id: 2, categoria_nombre: "Transitoria", activa: true, es_scrap: false, es_devolucion: false, disponible_venta: false },
]

const mockCategorias: CategoriaProducto[] = [
  { id: 1, nombre: "Todos", categoria_padre_id: null, ruta: "Todos" },
  { id: 2, nombre: "Repuestos", categoria_padre_id: 1, ruta: "Todos / Repuestos" },
  { id: 3, nombre: "Celulares", categoria_padre_id: 2, ruta: "Todos / Repuestos / Celulares" },
  { id: 4, nombre: "Baterías", categoria_padre_id: 3, ruta: "Todos / Repuestos / Celulares / Baterías" },
  { id: 5, nombre: "Pantallas", categoria_padre_id: 3, ruta: "Todos / Repuestos / Celulares / Pantallas" },
  { id: 6, nombre: "Equipos", categoria_padre_id: 1, ruta: "Todos / Equipos" },
  { id: 7, nombre: "iPhone", categoria_padre_id: 6, ruta: "Todos / Equipos / iPhone" },
  { id: 8, nombre: "Samsung", categoria_padre_id: 6, ruta: "Todos / Equipos / Samsung" },
  { id: 9, nombre: "Accesorios", categoria_padre_id: 1, ruta: "Todos / Accesorios" },
]

const mockProductosStock: ProductoStock[] = [
  // Productos en CC/Stock (Casa Central)
  {
    id: 1, codigo: "BAPWS444MM", nombre: "Batería Apple Watch Serie 4 44 MM", descripcion: "Batería original Apple Watch", 
    categoria_id: 4, categoria_ruta: "Todos / Repuestos / Celulares / Baterías", tipo: "almacenable", tracking: "lote",
    puede_venderse: true, puede_comprarse: true, precio_venta: 45000, precio_costo: 28000, moneda_costo: "ARS",
    ubicacion_id: 1, ubicacion_codigo: "CC/Stock", deposito_id: 1, deposito_codigo: "CC",
    stock_real: 15, stock_entrante: 5, stock_saliente: 2, stock_disponible: 13, stock_virtual: 18,
    stock_minimo: 5, stock_maximo: 50, stock_critico: 2, punto_pedido: 10,
    marca: "Apple", modelo: "Serie 4 44MM", color: "", origen: "USA", codigo_barras: "7891234567890", codigo_dun14: "",
    cuenta_analitica: "[CC-SHOP] CH - Shop (cc)", imagen_url: null, activo: true
  },
  {
    id: 2, codigo: "EIP12128N", nombre: "iPhone 12 128gb Negro", descripcion: "iPhone 12 128GB Color Negro",
    categoria_id: 7, categoria_ruta: "Todos / Equipos / iPhone", tipo: "almacenable", tracking: "serie",
    puede_venderse: true, puede_comprarse: true, precio_venta: 850000, precio_costo: 650000, moneda_costo: "ARS",
    ubicacion_id: 1, ubicacion_codigo: "CC/Stock", deposito_id: 1, deposito_codigo: "CC",
    stock_real: 3, stock_entrante: 2, stock_saliente: 0, stock_disponible: 3, stock_virtual: 5,
    stock_minimo: 2, stock_maximo: 20, stock_critico: 1, punto_pedido: 5,
    marca: "Apple", modelo: "iPhone 12", color: "Negro", origen: "USA", codigo_barras: "7891234567891", codigo_dun14: "",
    cuenta_analitica: "[CC-RESELLERS] CH - Resellers (cc)", imagen_url: null, activo: true
  },
  {
    id: 3, codigo: "PANS23U", nombre: "Pantalla Samsung S23 Ultra", descripcion: "Pantalla AMOLED original Samsung S23 Ultra",
    categoria_id: 5, categoria_ruta: "Todos / Repuestos / Celulares / Pantallas", tipo: "almacenable", tracking: "lote",
    puede_venderse: true, puede_comprarse: true, precio_venta: 320000, precio_costo: 220000, moneda_costo: "USD",
    ubicacion_id: 1, ubicacion_codigo: "CC/Stock", deposito_id: 1, deposito_codigo: "CC",
    stock_real: 4, stock_entrante: 10, stock_saliente: 0, stock_disponible: 4, stock_virtual: 14,
    stock_minimo: 3, stock_maximo: 15, stock_critico: 1, punto_pedido: 5,
    marca: "Samsung", modelo: "S23 Ultra", color: "", origen: "Korea", codigo_barras: "7891234567892", codigo_dun14: "",
    cuenta_analitica: "[CC-RESELLERS] CH - Resellers (cc)", imagen_url: null, activo: true
  },
  // Productos de fantasía en CC/Stock para pruebas
  {
    id: 6, codigo: "CABUSBC1M", nombre: "Cable USB-C a Lightning 1m", descripcion: "Cable de carga rápida USB-C a Lightning",
    categoria_id: 9, categoria_ruta: "Todos / Accesorios", tipo: "almacenable", tracking: "ninguno",
    puede_venderse: true, puede_comprarse: true, precio_venta: 12000, precio_costo: 4500, moneda_costo: "ARS",
    ubicacion_id: 1, ubicacion_codigo: "CC/Stock", deposito_id: 1, deposito_codigo: "CC",
    stock_real: 25, stock_entrante: 0, stock_saliente: 0, stock_disponible: 25, stock_virtual: 25,
    stock_minimo: 10, stock_maximo: 50, stock_critico: 5, punto_pedido: 15,
    marca: "Apple", modelo: "", color: "Blanco", origen: "China", codigo_barras: "7891234567900", codigo_dun14: "",
    cuenta_analitica: "[CC-SHOP] CH - Shop (cc)", imagen_url: null, activo: true
  },
  {
    id: 7, codigo: "PROTIP15PM", nombre: "Protector Pantalla iPhone 15 Pro Max", descripcion: "Vidrio templado 9H para iPhone 15 Pro Max",
    categoria_id: 9, categoria_ruta: "Todos / Accesorios", tipo: "almacenable", tracking: "ninguno",
    puede_venderse: true, puede_comprarse: true, precio_venta: 8500, precio_costo: 2000, moneda_costo: "ARS",
    ubicacion_id: 1, ubicacion_codigo: "CC/Stock", deposito_id: 1, deposito_codigo: "CC",
    stock_real: 40, stock_entrante: 20, stock_saliente: 5, stock_disponible: 35, stock_virtual: 55,
    stock_minimo: 15, stock_maximo: 100, stock_critico: 10, punto_pedido: 25,
    marca: "Genérica", modelo: "", color: "Transparente", origen: "China", codigo_barras: "7891234567901", codigo_dun14: "",
    cuenta_analitica: "[CC-SHOP] CH - Shop (cc)", imagen_url: null, activo: true
  },
  {
    id: 8, codigo: "CARGMAG15W", nombre: "Cargador MagSafe 15W", descripcion: "Cargador inalámbrico MagSafe original Apple",
    categoria_id: 9, categoria_ruta: "Todos / Accesorios", tipo: "almacenable", tracking: "ninguno",
    puede_venderse: true, puede_comprarse: true, precio_venta: 65000, precio_costo: 42000, moneda_costo: "USD",
    ubicacion_id: 1, ubicacion_codigo: "CC/Stock", deposito_id: 1, deposito_codigo: "CC",
    stock_real: 8, stock_entrante: 5, stock_saliente: 1, stock_disponible: 7, stock_virtual: 12,
    stock_minimo: 3, stock_maximo: 20, stock_critico: 2, punto_pedido: 5,
    marca: "Apple", modelo: "MagSafe", color: "Blanco", origen: "USA", codigo_barras: "7891234567902", codigo_dun14: "",
    cuenta_analitica: "[CC-SHOP] CH - Shop (cc)", imagen_url: null, activo: true
  },
  // Productos en PN/Stock (Puerto Norte)
  {
    id: 4, codigo: "IP14PRO256", nombre: "iPhone 14 Pro 256gb", descripcion: "iPhone 14 Pro 256GB",
    categoria_id: 7, categoria_ruta: "Todos / Equipos / iPhone", tipo: "almacenable", tracking: "serie",
    puede_venderse: true, puede_comprarse: true, precio_venta: 1500000, precio_costo: 1100000, moneda_costo: "USD",
    ubicacion_id: 8, ubicacion_codigo: "PN/Stock", deposito_id: 2, deposito_codigo: "PN",
    stock_real: 5, stock_entrante: 2, stock_saliente: 1, stock_disponible: 4, stock_virtual: 6,
    stock_minimo: 2, stock_maximo: 10, stock_critico: 1, punto_pedido: 3,
    marca: "Apple", modelo: "iPhone 14 Pro", color: "Space Black", origen: "USA", codigo_barras: "7891234567893", codigo_dun14: "",
    cuenta_analitica: "[PN-SHOP] CH - Shop (pn)", imagen_url: null, activo: true
  },
  {
    id: 5, codigo: "FUNIP14", nombre: "Funda iPhone 14 Silicona", descripcion: "Funda de silicona para iPhone 14",
    categoria_id: 9, categoria_ruta: "Todos / Accesorios", tipo: "almacenable", tracking: "ninguno",
    puede_venderse: true, puede_comprarse: true, precio_venta: 15000, precio_costo: 5000, moneda_costo: "ARS",
    ubicacion_id: 8, ubicacion_codigo: "PN/Stock", deposito_id: 2, deposito_codigo: "PN",
    stock_real: 50, stock_entrante: 0, stock_saliente: 5, stock_disponible: 45, stock_virtual: 45,
    stock_minimo: 10, stock_maximo: 100, stock_critico: 5, punto_pedido: 20,
    marca: "Genérica", modelo: "", color: "Negro", origen: "China", codigo_barras: "7891234567894", codigo_dun14: "",
    cuenta_analitica: "[PN-SHOP] CH - Shop (pn)", imagen_url: null, activo: true
  },
]

// Solo productos con IMEI (equipos electrónicos con número de serie único) - EN STOCK
const mockLotesSeries: LoteSerie[] = [
  { id: 1, producto_id: 2, producto_codigo: "EIP12128N", producto_nombre: "iPhone 12 128gb Negro", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "353456789012345", referencia_interna: "", cantidad: 1, ubicacion_id: 8, ubicacion_nombre: "PN/Stock", deposito_id: 2, deposito_nombre: "Puerto Norte", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 92, color: "Negro", estado: "disponible" },
  { id: 2, producto_id: 2, producto_codigo: "EIP12128N", producto_nombre: "iPhone 12 128gb Negro", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "353456789012346", referencia_interna: "", cantidad: 1, ubicacion_id: 8, ubicacion_nombre: "PN/Stock", deposito_id: 2, deposito_nombre: "Puerto Norte", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 88, color: "Negro", estado: "disponible" },
  { id: 3, producto_id: 2, producto_codigo: "EIP12128N", producto_nombre: "iPhone 12 128gb Negro", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "353456789012347", referencia_interna: "", cantidad: 1, ubicacion_id: 1, ubicacion_nombre: "CC/Stock", deposito_id: 1, deposito_nombre: "Casa Central", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 95, color: "Negro", estado: "disponible" },
  { id: 4, producto_id: 4, producto_codigo: "IP14PRO256", producto_nombre: "iPhone 14 Pro 256gb", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "359876543210987", referencia_interna: "", cantidad: 1, ubicacion_id: 8, ubicacion_nombre: "PN/Stock", deposito_id: 2, deposito_nombre: "Puerto Norte", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 100, color: "Space Black", estado: "disponible" },
  { id: 5, producto_id: 4, producto_codigo: "IP14PRO256", producto_nombre: "iPhone 14 Pro 256gb", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "359876543210988", referencia_interna: "", cantidad: 1, ubicacion_id: 1, ubicacion_nombre: "CC/Stock", deposito_id: 1, deposito_nombre: "Casa Central", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 100, color: "Space Black", estado: "reservado" },
  { id: 6, producto_id: 2, producto_codigo: "EIP12128N", producto_nombre: "iPhone 12 128gb Negro", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "353456789012348", referencia_interna: "", cantidad: 1, ubicacion_id: 9, ubicacion_nombre: "PN/Outlet", deposito_id: 2, deposito_nombre: "Puerto Norte", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 78, color: "Negro", estado: "disponible" },
  { id: 7, producto_id: 6, producto_codigo: "ESAMS22U", producto_nombre: "Samsung S22 Ultra 256gb", producto_categoria: "Equipos / Celulares / Samsung", marca: "Samsung", numero: "354567890123456", referencia_interna: "", cantidad: 1, ubicacion_id: 1, ubicacion_nombre: "CC/Stock", deposito_id: 1, deposito_nombre: "Casa Central", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 85, color: "Phantom Black", estado: "disponible" },
  { id: 8, producto_id: 6, producto_codigo: "ESAMS22U", producto_nombre: "Samsung S22 Ultra 256gb", producto_categoria: "Equipos / Celulares / Samsung", marca: "Samsung", numero: "354567890123457", referencia_interna: "", cantidad: 1, ubicacion_id: 8, ubicacion_nombre: "PN/Stock", deposito_id: 2, deposito_nombre: "Puerto Norte", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 91, color: "Green", estado: "disponible" },
  { id: 9, producto_id: 7, producto_codigo: "EMOTOE40", producto_nombre: "Motorola Edge 40", producto_categoria: "Equipos / Celulares / Motorola", marca: "Motorola", numero: "355678901234567", referencia_interna: "", cantidad: 1, ubicacion_id: 1, ubicacion_nombre: "CC/Stock", deposito_id: 1, deposito_nombre: "Casa Central", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 100, color: "Lunar Blue", estado: "disponible" },
  { id: 10, producto_id: 8, producto_codigo: "EIPADS9", producto_nombre: "iPad Air 5ta Gen 64gb", producto_categoria: "Equipos / Tablets / iPad", marca: "Apple", numero: "356789012345678", referencia_interna: "", cantidad: 1, ubicacion_id: 8, ubicacion_nombre: "PN/Stock", deposito_id: 2, deposito_nombre: "Puerto Norte", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 97, color: "Space Gray", estado: "disponible" },
  { id: 11, producto_id: 9, producto_codigo: "EAWS8", producto_nombre: "Apple Watch Series 8 45mm", producto_categoria: "Equipos / Wearables / Apple Watch", marca: "Apple", numero: "357890123456789", referencia_interna: "", cantidad: 1, ubicacion_id: 1, ubicacion_nombre: "CC/Stock", deposito_id: 1, deposito_nombre: "Casa Central", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 100, color: "Midnight", estado: "disponible" },
  { id: 12, producto_id: 10, producto_codigo: "EIPXR64", producto_nombre: "iPhone XR 64gb", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "358901234567890", referencia_interna: "", cantidad: 1, ubicacion_id: 1, ubicacion_nombre: "CC/Stock", deposito_id: 1, deposito_nombre: "Casa Central", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 82, color: "Coral", estado: "disponible" },
]

// TODOS los IMEI que pasaron por el sistema (incluye vendidos e históricos)
const mockTodosLosIMEI: LoteSerie[] = [
  ...mockLotesSeries,
  // IMEIs vendidos
  { id: 101, producto_id: 2, producto_codigo: "EIP12128N", producto_nombre: "iPhone 12 128gb Negro", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "353456789012340", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 90, color: "Negro", estado: "vendido" },
  { id: 102, producto_id: 2, producto_codigo: "EIP12128N", producto_nombre: "iPhone 12 128gb Negro", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "353456789012341", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 85, color: "Negro", estado: "vendido" },
  { id: 103, producto_id: 4, producto_codigo: "IP14PRO256", producto_nombre: "iPhone 14 Pro 256gb", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "359876543210980", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 100, color: "Deep Purple", estado: "vendido" },
  { id: 104, producto_id: 6, producto_codigo: "ESAMS22U", producto_nombre: "Samsung S22 Ultra 256gb", producto_categoria: "Equipos / Celulares / Samsung", marca: "Samsung", numero: "354567890123450", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 88, color: "Burgundy", estado: "vendido" },
  { id: 105, producto_id: 10, producto_codigo: "EIPXR64", producto_nombre: "iPhone XR 64gb", producto_categoria: "Equipos / Celulares / iPhone", marca: "Apple", numero: "358901234567880", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 79, color: "Blue", estado: "vendido" },
  { id: 106, producto_id: 8, producto_codigo: "EIPADS9", producto_nombre: "iPad Air 5ta Gen 64gb", producto_categoria: "Equipos / Tablets / iPad", marca: "Apple", numero: "356789012345670", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 95, color: "Starlight", estado: "vendido" },
  { id: 107, producto_id: 9, producto_codigo: "EAWS8", producto_nombre: "Apple Watch Series 8 45mm", producto_categoria: "Equipos / Wearables / Apple Watch", marca: "Apple", numero: "357890123456780", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Casa Central", fecha_vencimiento: null, bateria: 98, color: "Silver", estado: "vendido" },
  { id: 108, producto_id: 7, producto_codigo: "EMOTOE40", producto_nombre: "Motorola Edge 40", producto_categoria: "Equipos / Celulares / Motorola", marca: "Motorola", numero: "355678901234560", referencia_interna: "", cantidad: 1, ubicacion_id: 0, ubicacion_nombre: "Clientes/Entregado", deposito_id: 0, deposito_nombre: "-", sucursal: "Puerto Norte", fecha_vencimiento: null, bateria: 100, color: "Viva Magenta", estado: "vendido" },
]

const mockTransferencias: TransferenciaInterna[] = [
  {
    id: 1, numero: "TI X 20000-00003415", deposito_id: 2, deposito_nombre: "Puerto Norte",
    ubicacion_origen_id: 8, ubicacion_origen_nombre: "PN/Stock",
    ubicacion_destino_id: 9, ubicacion_destino_nombre: "PN/Outlet",
    fecha_creacion: "2024-01-15T10:00:00", fecha_transferencia: null,
    estado: "borrador", sucursal: "Puerto Norte", observaciones: "",
    lineas: [
      { producto_id: 2, producto_nombre: "iPhone 12 128gb Negro", stock_virtual: 8, cantidad: 2, observacion: "Equipos para outlet" }
    ],
    seguimiento: [
      { id: 1, fecha: "2024-01-15T10:00:00", usuario: "Agustina Perez", tipo: "creacion", descripcion: "Transferencia Interna creada" },
      { id: 2, fecha: "2024-01-15T10:00:00", usuario: "Agustina Perez", tipo: "cambio_estado", valor_anterior: "Vacío", valor_nuevo: "Borrador" },
    ]
  },
  {
    id: 2, numero: "TI X 20000-00003416", deposito_id: 1, deposito_nombre: "Casa Central",
    ubicacion_origen_id: 1, ubicacion_origen_nombre: "CC/Stock",
    ubicacion_destino_id: 3, ubicacion_destino_nombre: "CC/Deposito B",
    fecha_creacion: "2024-01-14T14:30:00", fecha_transferencia: "2024-01-14T15:00:00",
    estado: "confirmada", sucursal: "Casa Central", observaciones: "Reorganización de stock",
    lineas: [
      { producto_id: 1, producto_nombre: "Batería Apple Watch Serie 4 44 MM", stock_virtual: 15, cantidad: 5, observacion: "" },
      { producto_id: 3, producto_nombre: "Pantalla Samsung S23 Ultra", stock_virtual: 4, cantidad: 2, observacion: "" }
    ],
    seguimiento: [
      { id: 1, fecha: "2024-01-14T14:30:00", usuario: "Agustina Perez", tipo: "creacion", descripcion: "Transferencia Interna creada" },
      { id: 2, fecha: "2024-01-14T14:30:00", usuario: "Agustina Perez", tipo: "cambio_estado", valor_anterior: "Vacío", valor_nuevo: "Borrador" },
      { id: 3, fecha: "2024-01-14T14:45:00", usuario: "Agustina Perez", tipo: "nota", descripcion: "Reorganización solicitada por gerencia" },
      { id: 4, fecha: "2024-01-14T15:00:00", usuario: "Carlos Martinez", tipo: "cambio_estado", valor_anterior: "Borrador", valor_nuevo: "Confirmada" },
    ]
  },
]

const mockPedidosAbastecimiento: PedidoAbastecimiento[] = [
  {
    id: 1, numero: "PAB X 10000-00000042", 
    deposito_origen_id: 1, deposito_origen_nombre: "Casa Central",
    deposito_destino_id: 2, deposito_destino_nombre: "Puerto Norte",
    categoria_ubicacion: "Stock", fecha: "2024-01-16T09:00:00",
    estado: "en_ejecucion", sucursal: "Puerto Norte",
    ruta_predefinida: "Puerto Norte: proveer producto de Casa Central",
    transporte: "Transporte Propio", observaciones: "",
    lineas: [
      { producto_id: 4, producto_nombre: "iPhone 14 Pro 256gb", cantidad_udd: 3, udd: "Unidad", cantidad: 3, udm: "Unidad" },
      { producto_id: 3, producto_nombre: "Pantalla Samsung S23 Ultra", cantidad_udd: 5, udd: "Unidad", cantidad: 5, udm: "Unidad" }
    ]
  },
  {
    id: 2, numero: "PAB X 10000-00000043",
    deposito_origen_id: 1, deposito_origen_nombre: "Casa Central",
    deposito_destino_id: 3, deposito_destino_nombre: "Casilda",
    categoria_ubicacion: "Stock", fecha: "2024-01-17T11:00:00",
    estado: "borrador", sucursal: "Casilda",
    ruta_predefinida: "Casilda: proveer producto de Casa Central",
    transporte: "", observaciones: "Pendiente confirmar transporte",
    lineas: [
      { producto_id: 5, producto_nombre: "Funda iPhone 14 Silicona", cantidad_udd: 20, udd: "Unidad", cantidad: 20, udm: "Unidad" }
    ]
  },
]

const mockControlesInventario: ControlInventario[] = [
  {
    id: 1, numero: "CI X 20000-00000412",
    deposito_id: 1, deposito_nombre: "Casa Central",
    ubicacion_id: 3, ubicacion_nombre: "CC/Deposito B",
    fecha: "2024-01-18T08:00:00", concepto: "Diferencia de Inventario",
    tipo_inventario: "algunos", estado: "en_proceso", sucursal: "Casa Central",
    cuenta_analitica: "", desreservar_automatico: false, observaciones: "",
    lineas: [
      { producto_id: 1, producto_codigo: "BAPWS444MM", producto_nombre: "Batería Apple Watch Serie 4 44 MM", stock_teorico: 10, stock_contado: 9, diferencia: -1 },
      { producto_id: 3, producto_codigo: "PANS23U", producto_nombre: "Pantalla Samsung S23 Ultra", stock_teorico: 2, stock_contado: 2, diferencia: 0 },
    ]
  },
  {
    id: 2, numero: "CI X 20000-00000411",
    deposito_id: 2, deposito_nombre: "Puerto Norte",
    ubicacion_id: 8, ubicacion_nombre: "PN/Stock",
    fecha: "2024-01-10T09:00:00", concepto: "Control Mensual",
    tipo_inventario: "todos", estado: "confirmado", sucursal: "Puerto Norte",
    cuenta_analitica: "", desreservar_automatico: true, observaciones: "Sin diferencias",
    lineas: []
  },
]

const mockAjustes: AjusteInventario[] = [
  {
    id: 1, numero: "AJ+ X 20000-00000101", tipo: "positivo",
    deposito_id: 2, deposito_nombre: "Puerto Norte",
    ubicacion_id: 8, ubicacion_nombre: "PN/Stock",
    fecha: "2024-01-12T10:00:00", concepto: "Mercadería encontrada",
    estado: "confirmado", sucursal: "Puerto Norte", observaciones: "Encontrado en revisión",
    lineas: [
      { producto_id: 5, producto_codigo: "FUNIP14", producto_nombre: "Funda iPhone 14 Silicona", cantidad: 5, costo_unitario: 5000 }
    ]
  },
  {
    id: 2, numero: "AJ- X 20000-00000050", tipo: "negativo",
    deposito_id: 1, deposito_nombre: "Casa Central",
    ubicacion_id: 1, ubicacion_nombre: "CC/Stock",
    fecha: "2024-01-11T14:00:00", concepto: "Rotura / Daño",
    estado: "confirmado", sucursal: "Casa Central", observaciones: "Producto dañado en traslado",
    lineas: [
      { producto_id: 1, producto_codigo: "BAPWS444MM", producto_nombre: "Batería Apple Watch Serie 4 44 MM", cantidad: 1, costo_unitario: 28000 }
    ]
  },
]

// Sucursal actual (simulado)
const SUCURSAL_ACTUAL = "Puerto Norte"
const DEPOSITO_ACTUAL = mockDepositos.find(d => d.sucursal === SUCURSAL_ACTUAL) || mockDepositos[0]

// Helper functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatCurrency = (amount: number, currency: string = "ARS") => {
  return new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: currency,
    minimumFractionDigits: 2 
  }).format(amount)
}

// Componente de Seguimiento (tracking de cambios estilo Odoo)
function SeguimientoPanel({ 
  seguimiento, 
  collapsed = true 
}: { 
  seguimiento: SeguimientoEntry[]
  collapsed?: boolean
}) {
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

// Component Principal
export default function ModuloStock() {
  // Estados principales
  const [activeView, setActiveView] = useState<string>("productos")
  const [searchTerm, setSearchTerm] = useState("")

  // OdooFilterBar states para Productos y Transferencias
  const [savedFiltersProductos, setSavedFiltersProductos] = useState<SavedFilter[]>([])
  const [activeFiltersProductos, setActiveFiltersProductos] = useState<FilterOption[]>([])
  const [activeGroupByProductos, setActiveGroupByProductos] = useState<GroupByOption[]>([])
  const [savedFiltersTransferencias, setSavedFiltersTransferencias] = useState<SavedFilter[]>([])
  const [activeFiltersTransferencias, setActiveFiltersTransferencias] = useState<FilterOption[]>([])
  const [activeGroupByTransferencias, setActiveGroupByTransferencias] = useState<GroupByOption[]>([])
  const makeStockFilterHandlers = (
    setter: React.Dispatch<React.SetStateAction<SavedFilter[]>>,
    setActiveFilters: React.Dispatch<React.SetStateAction<FilterOption[]>>,
    setActiveGroupBy: React.Dispatch<React.SetStateAction<GroupByOption[]>>
  ) => ({
    onSaveFilter: (f: Omit<SavedFilter, "id" | "createdBy">) => setter(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "Admin" }]),
    onDeleteFilter: (id: string) => setter(prev => prev.filter(sf => sf.id !== id)),
    onApplyFilter: (f: SavedFilter) => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }
  })
  
  // Estados de datos
  const [productos, setProductos] = useState<ProductoStock[]>(mockProductosStock)
  const [lotesSeries, setLotesSeries] = useState<LoteSerie[]>(mockLotesSeries)
  const [transferencias, setTransferencias] = useState<TransferenciaInterna[]>(mockTransferencias)
  const [pedidosAbastecimiento, setPedidosAbastecimiento] = useState<PedidoAbastecimiento[]>(mockPedidosAbastecimiento)
  const [controlesInventario, setControlesInventario] = useState<ControlInventario[]>(mockControlesInventario)
  const [ajustes, setAjustes] = useState<AjusteInventario[]>(mockAjustes)
  
  // Depósito actual seleccionado (por defecto el primero)
  const [currentDepositoId, setCurrentDepositoId] = useState<number>(mockDepositos[0]?.id || 1)
  const currentDeposito = useMemo(() => mockDepositos.find(d => d.id === currentDepositoId) || mockDepositos[0], [currentDepositoId])
  
  // Estados de selección
  const [selectedProducto, setSelectedProducto] = useState<ProductoStock | null>(null)
  const [selectedLote, setSelectedLote] = useState<LoteSerie | null>(null)
  const [selectedTransferencia, setSelectedTransferencia] = useState<TransferenciaInterna | null>(null)
  const [selectedPedido, setSelectedPedido] = useState<PedidoAbastecimiento | null>(null)
  const [selectedControl, setSelectedControl] = useState<ControlInventario | null>(null)
  
  // Estados de creación
  const [creandoProducto, setCreandoProducto] = useState(false)
  const [creandoTransferencia, setCreandoTransferencia] = useState(false)
  const [creandoPedido, setCreandoPedido] = useState(false)
  const [creandoControl, setCreandoControl] = useState(false)
  const [creandoDeposito, setCreandoDeposito] = useState(false)
  const [creandoUbicacion, setCreandoUbicacion] = useState(false)
  const [editandoUbicacion, setEditandoUbicacion] = useState(false)
  const [editandoDeposito, setEditandoDeposito] = useState(false)
  const [menuExpandido, setMenuExpandido] = useState({ 
    productos: true, 
    operaciones: true, 
    trazabilidad: true, 
    controlInventario: true, 
    configuracion: true,
    configDeposito: true, 
    configRutas: false,
    informes: true 
  })
  
  // Estados de selección para configuración
  const [selectedDeposito, setSelectedDeposito] = useState<Deposito | null>(null)
  const [selectedUbicacion, setSelectedUbicacion] = useState<Ubicacion | null>(null)
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaUbicacion | null>(null)
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [editandoCategoria, setEditandoCategoria] = useState(false)
  const [busquedaCategoria, setBusquedaCategoria] = useState("")
  
  // Estados del formulario de Transferencia Interna
  const [transFormDeposito, setTransFormDeposito] = useState<number | null>(null)
  const [transFormUbicacionOrigen, setTransFormUbicacionOrigen] = useState<number | null>(null)
  const [transFormUbicacionDestino, setTransFormUbicacionDestino] = useState<number | null>(null)
  const [transFormCodigoProducto, setTransFormCodigoProducto] = useState("")
  const [transFormSucursal, setTransFormSucursal] = useState("Puerto Norte")
  const [transFormFechaCreacion, setTransFormFechaCreacion] = useState(new Date().toISOString())
  const [transFormObservaciones, setTransFormObservaciones] = useState("")
  const [transFormLineas, setTransFormLineas] = useState<{
    id: number
    producto_id: number
    producto_nombre: string
    producto_codigo: string
    stock_virtual: number
    cantidad: number
    observacion: string
  }[]>([])
  const [transActiveTab, setTransActiveTab] = useState<"productos" | "observaciones">("productos")
  const [transShowProductSearch, setTransShowProductSearch] = useState(false)
  const [transProductSearchTerm, setTransProductSearchTerm] = useState("")
  const [transFormSeguimiento, setTransFormSeguimiento] = useState<SeguimientoEntry[]>([
    { id: 1, fecha: new Date().toISOString(), usuario: "Usuario Actual", tipo: "creacion", descripcion: "Transferencia Interna creada" },
    { id: 2, fecha: new Date().toISOString(), usuario: "Usuario Actual", tipo: "cambio_estado", valor_anterior: "Vacío", valor_nuevo: "Borrador" },
  ])
  
  // Estados para Lotes en Stock - Sistema de Filtros Odoo
  const [lotesSearchTerm, setLotesSearchTerm] = useState("")
  const [lotesActiveFilters, setLotesActiveFilters] = useState<FilterOption[]>([])
  const [lotesActiveGroupBy, setLotesActiveGroupBy] = useState<GroupByOption[]>([
    { id: "ubicacion", label: "Ubicación", field: "ubicacion_nombre" }
  ])
  const [lotesSavedFilters, setLotesSavedFilters] = useState<SavedFilter[]>([
    { id: "1", name: "Puerto Norte", filters: [{ id: "suc-pn", label: "Sucursal: Puerto Norte", field: "sucursal", value: "Puerto Norte" }], groupBy: [], isDefault: false, isShared: true, createdBy: "admin" },
    { id: "2", name: "Equipos CC", filters: [{ id: "cat-eq", label: "Categoría: Equipos / Celulares / iPhone", field: "producto_categoria", value: "Equipos / Celulares / iPhone" }], groupBy: [{ id: "producto", label: "Producto", field: "producto_nombre" }], isDefault: false, isShared: true, createdBy: "admin" },
    { id: "3", name: "Por Producto y Ubicación", filters: [], groupBy: [{ id: "producto", label: "Producto", field: "producto_nombre" }, { id: "ubicacion", label: "Ubicación", field: "ubicacion_nombre" }], isDefault: false, isShared: false, createdBy: "user" },
  ])
  
  // Opciones de filtros disponibles
  const lotesFilterOptions = useMemo(() => {
    const ubicaciones = [...new Set(lotesSeries.map(l => l.ubicacion_nombre))]
    const sucursales = [...new Set(lotesSeries.map(l => l.sucursal))]
    const depositos = [...new Set(lotesSeries.map(l => l.deposito_nombre))]
    const categorias = [...new Set(lotesSeries.map(l => l.producto_categoria))]
    const productos = [...new Set(lotesSeries.map(l => l.producto_nombre))]
    const marcas = [...new Set(lotesSeries.map(l => l.marca))]
    const colores = [...new Set(lotesSeries.map(l => l.color).filter(c => c !== null))] as string[]
    const estados = [...new Set(lotesSeries.map(l => l.estado))]
    
    return [
      { field: "ubicacion_nombre", label: "Ubicación", values: ubicaciones.map(u => ({ value: u, label: u })) },
      { field: "producto_nombre", label: "Producto", values: productos.map(p => ({ value: p, label: p })) },
      { field: "marca", label: "Marca", values: marcas.map(m => ({ value: m, label: m })) },
      { field: "color", label: "Color", values: colores.map(c => ({ value: c, label: c })) },
      { field: "producto_categoria", label: "Categoría", values: categorias.map(c => ({ value: c, label: c })) },
      { field: "sucursal", label: "Sucursal", values: sucursales.map(s => ({ value: s, label: s })) },
      { field: "deposito_nombre", label: "Depósito", values: depositos.map(d => ({ value: d, label: d })) },
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: e === "disponible" ? "Disponible" : e === "reservado" ? "Reservado" : "Vendido" })) },
    ]
  }, [lotesSeries])
  
  // Opciones de agrupación disponibles
  const lotesGroupByOptions: GroupByOption[] = [
    { id: "ubicacion", label: "Ubicación", field: "ubicacion_nombre" },
    { id: "producto", label: "Producto", field: "producto_nombre" },
    { id: "lote", label: "Lote", field: "numero" },
    { id: "marca", label: "Marca", field: "marca" },
    { id: "bateria", label: "Batería", field: "bateria" },
    { id: "color", label: "Color", field: "color" },
    { id: "categoria", label: "Categoría", field: "producto_categoria" },
    { id: "sucursal", label: "Sucursal", field: "sucursal" },
    { id: "deposito", label: "Depósito", field: "deposito_nombre" },
  ]
  
  // Estado para grupos expandidos
  const [lotesExpandedGroups, setLotesExpandedGroups] = useState<Set<string>>(new Set())
  
  // Estados para Lotes y Series (todos los IMEI históricos) - Sistema de Filtros Odoo
  const [todosIMEI] = useState<LoteSerie[]>(mockTodosLosIMEI)
  const [seriesSearchTerm, setSeriesSearchTerm] = useState("")
  const [seriesActiveFilters, setSeriesActiveFilters] = useState<FilterOption[]>([])
  const [seriesActiveGroupBy, setSeriesActiveGroupBy] = useState<GroupByOption[]>([])
  const [seriesSavedFilters, setSeriesSavedFilters] = useState<SavedFilter[]>([
    { id: "s1", name: "En Stock", filters: [{ id: "est-disp", label: "Estado: Disponible", field: "estado", value: "disponible" }], groupBy: [], isDefault: false, isShared: true, createdBy: "admin" },
    { id: "s2", name: "Vendidos", filters: [{ id: "est-vend", label: "Estado: Vendido", field: "estado", value: "vendido" }], groupBy: [], isDefault: false, isShared: true, createdBy: "admin" },
    { id: "s3", name: "Por Producto", filters: [], groupBy: [{ id: "producto", label: "Producto", field: "producto_nombre" }], isDefault: false, isShared: true, createdBy: "admin" },
  ])
  const [seriesExpandedGroups, setSeriesExpandedGroups] = useState<Set<string>>(new Set())

  // Estados para Cubo de Stock
  const [cuboDimensionFilas, setCuboDimensionFilas] = useState<string[]>(["categoria", "producto"])
  const [cuboDimensionColumnas, setCuboDimensionColumnas] = useState<string[]>(["deposito"])
  const [cuboMedidasSeleccionadas, setCuboMedidasSeleccionadas] = useState<string[]>(["cantidad"])
  const [cuboMostrarSelector, setCuboMostrarSelector] = useState<"filas" | "columnas" | "medidas" | null>(null)
  const [cuboFilasExpandidas, setCuboFilasExpandidas] = useState<Set<string>>(new Set())
  const [cuboDragItem, setCuboDragItem] = useState<{ tipo: "filas" | "columnas" | "medidas"; idx: number } | null>(null)
  const [cuboDragOverIdx, setCuboDragOverIdx] = useState<number | null>(null)
  const [cuboCamposOcultos, setCuboCamposOcultos] = useState(false)
  const cuboSelectorRef = useRef<HTMLDivElement>(null)

  // Cerrar selector al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cuboSelectorRef.current && !cuboSelectorRef.current.contains(event.target as Node)) {
        setCuboMostrarSelector(null)
      }
    }
    if (cuboMostrarSelector) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [cuboMostrarSelector])
  
  // Opciones de filtros para Lotes y Series
  const seriesFilterOptions = useMemo(() => {
    const ubicaciones = [...new Set(todosIMEI.map(l => l.ubicacion_nombre))]
    const sucursales = [...new Set(todosIMEI.map(l => l.sucursal))]
    const depositos = [...new Set(todosIMEI.map(l => l.deposito_nombre))]
    const categorias = [...new Set(todosIMEI.map(l => l.producto_categoria))]
    const productos = [...new Set(todosIMEI.map(l => l.producto_nombre))]
    const marcas = [...new Set(todosIMEI.map(l => l.marca))]
    const colores = [...new Set(todosIMEI.map(l => l.color).filter(c => c !== null))] as string[]
    const estados = [...new Set(todosIMEI.map(l => l.estado))]
    
    return [
      { field: "ubicacion_nombre", label: "Ubicación", values: ubicaciones.map(u => ({ value: u, label: u })) },
      { field: "producto_nombre", label: "Producto", values: productos.map(p => ({ value: p, label: p })) },
      { field: "marca", label: "Marca", values: marcas.map(m => ({ value: m, label: m })) },
      { field: "color", label: "Color", values: colores.map(c => ({ value: c, label: c })) },
      { field: "producto_categoria", label: "Categoría", values: categorias.map(c => ({ value: c, label: c })) },
      { field: "sucursal", label: "Sucursal", values: sucursales.map(s => ({ value: s, label: s })) },
      { field: "deposito_nombre", label: "Depósito", values: depositos.map(d => ({ value: d, label: d })) },
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: e === "disponible" ? "Disponible" : e === "reservado" ? "Reservado" : "Vendido" })) },
    ]
  }, [todosIMEI])
  
  // Opciones de agrupación para Lotes y Series
  const seriesGroupByOptions: GroupByOption[] = [
    { id: "ubicacion", label: "Ubicación", field: "ubicacion_nombre" },
    { id: "producto", label: "Producto", field: "producto_nombre" },
    { id: "lote", label: "Lote", field: "numero" },
    { id: "marca", label: "Marca", field: "marca" },
    { id: "bateria", label: "Batería", field: "bateria" },
    { id: "color", label: "Color", field: "color" },
    { id: "categoria", label: "Categoría", field: "producto_categoria" },
    { id: "sucursal", label: "Sucursal", field: "sucursal" },
    { id: "deposito", label: "Depósito", field: "deposito_nombre" },
    { id: "estado", label: "Estado", field: "estado" },
  ]

  // Contadores para dashboard
  const productosCount = productos.length
  const lotesSeriesCount = lotesSeries.length
  const transferenciasPendientes = transferencias.filter(t => t.estado === "borrador").length
  const pedidosPendientes = pedidosAbastecimiento.filter(p => p.estado === "borrador" || p.estado === "en_ejecucion").length
  const controlesPendientes = controlesInventario.filter(c => c.estado === "borrador" || c.estado === "en_proceso").length

  // Funciones de estado
  const getEstadoTransferenciaColor = (estado: string) => {
    switch (estado) {
      case "borrador": return "bg-gray-100 text-gray-700"
      case "confirmada": return "bg-green-100 text-green-700"
      case "cancelada": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getEstadoPedidoColor = (estado: string) => {
    switch (estado) {
      case "borrador": return "bg-gray-100 text-gray-700"
      case "en_ejecucion": return "bg-blue-100 text-blue-700"
      case "realizado": return "bg-green-100 text-green-700"
      case "cancelado": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getEstadoControlColor = (estado: string) => {
    switch (estado) {
      case "borrador": return "bg-gray-100 text-gray-700"
      case "en_proceso": return "bg-amber-100 text-amber-700"
      case "confirmado": return "bg-green-100 text-green-700"
      case "cancelado": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      "borrador": "Borrador",
      "confirmada": "Confirmada",
      "cancelada": "Cancelada",
      "en_ejecucion": "En Ejecución",
      "realizado": "Realizado",
      "cancelado": "Cancelado",
      "en_proceso": "En Proceso",
      "confirmado": "Confirmado",
      "disponible": "Disponible",
      "reservado": "Reservado",
      "vendido": "Vendido",
    }
    return labels[estado] || estado
  }

  // Sidebar
  const renderSidebar = () => (
    <div className="w-56 bg-white border-r border-gray-200 h-[calc(100vh-44px)] overflow-y-auto">
      <div className="p-4">
        {/* Header Sucursal */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Deposito</h2>
            <p className="text-xs text-amber-600">{SUCURSAL_ACTUAL}</p>
          </div>
        </div>

        {/* PRODUCTOS */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, productos: !prev.productos }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.productos ? "rotate-90" : ""}`} />
            <Package className="w-3.5 h-3.5" />
            Productos
          </button>
          {menuExpandido.productos && (
            <div className="ml-2">
              <button
                onClick={() => { setActiveView("productos"); setSelectedProducto(null) }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "productos" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Package className="w-4 h-4" />
                Productos
                <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{productosCount}</span>
              </button>
            </div>
          )}
        </div>

        {/* OPERACIONES */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, operaciones: !prev.operaciones }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.operaciones ? "rotate-90" : ""}`} />
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Operaciones
            {(transferenciasPendientes > 0 || pedidosPendientes > 0) && <span className="w-2 h-2 bg-amber-500 rounded-full ml-1"></span>}
          </button>
          {menuExpandido.operaciones && (
            <div className="ml-2">
              <button
                onClick={() => { setActiveView("transferencias"); setSelectedTransferencia(null); setCreandoTransferencia(false) }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "transferencias" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                Transferencias Internas
                {transferenciasPendientes > 0 && <span className="ml-auto text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">{transferenciasPendientes}</span>}
              </button>
              <button
                onClick={() => { setActiveView("pedidos_abastecimiento"); setSelectedPedido(null); setCreandoPedido(false) }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "pedidos_abastecimiento" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Truck className="w-4 h-4" />
                Pedidos de Abastecimiento
                {pedidosPendientes > 0 && <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">{pedidosPendientes}</span>}
              </button>
            </div>
          )}
        </div>

        {/* TRAZABILIDAD */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, trazabilidad: !prev.trazabilidad }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.trazabilidad ? "rotate-90" : ""}`} />
            <Barcode className="w-3.5 h-3.5" />
            Trazabilidad
            <span className="w-2 h-2 bg-amber-500 rounded-full ml-1"></span>
          </button>
          {menuExpandido.trazabilidad && (
            <div className="ml-2">
              <button
                onClick={() => { setActiveView("lotes_series"); setSelectedLote(null) }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "lotes_series" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Barcode className="w-4 h-4" />
                Lotes y Series
                <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{lotesSeriesCount}</span>
              </button>
              <button
                onClick={() => { setActiveView("lotes_stock") }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "lotes_stock" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Layers className="w-4 h-4" />
                IMEI en Stock
              </button>
            </div>
          )}
        </div>

        {/* CONTROL DE INVENTARIO */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, controlInventario: !prev.controlInventario }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.controlInventario ? "rotate-90" : ""}`} />
            <ClipboardCheck className="w-3.5 h-3.5" />
            Control de Inventario
          </button>
          {menuExpandido.controlInventario && (
            <div className="ml-2">
              <button
                onClick={() => { setActiveView("control_inventario"); setSelectedControl(null); setCreandoControl(false) }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "control_inventario" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <ClipboardCheck className="w-4 h-4" />
                Control de Inventario
                {controlesPendientes > 0 && <span className="ml-auto text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">{controlesPendientes}</span>}
              </button>
              <button
                onClick={() => { setActiveView("ajustes_positivos") }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "ajustes_positivos" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <TrendingUp className="w-4 h-4" />
                Ajustes Positivos
              </button>
              <button
                onClick={() => { setActiveView("ajustes_negativos") }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "ajustes_negativos" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <TrendingDown className="w-4 h-4" />
                Ajustes Negativos
              </button>
            </div>
          )}
        </div>

        {/* CONFIGURACIÓN */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, configuracion: !prev.configuracion }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.configuracion ? "rotate-90" : ""}`} />
            <Settings className="w-3.5 h-3.5" />
            Configuración
            <span className="w-2 h-2 bg-amber-500 rounded-full ml-1"></span>
          </button>
          {menuExpandido.configuracion && (
            <div className="ml-2">
              {/* Subsección Depósito */}
              <div>
                <button
                  onClick={() => setMenuExpandido(prev => ({ ...prev, configDeposito: !prev.configDeposito }))}
                  className="w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.configDeposito ? "rotate-90" : ""}`} />
                  Depósito
                </button>
                {menuExpandido.configDeposito && (
                  <div className="ml-4 border-l border-gray-200 pl-2">
                    <button
                      onClick={() => { setActiveView("config_depositos") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_depositos" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Depósitos
                    </button>
                    <button
                      onClick={() => { setActiveView("config_ubicaciones") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_ubicaciones" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Ubicaciones
                    </button>
                    <button
                      onClick={() => { setActiveView("config_categorias") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_categorias" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Categorías de Ubicaciones
                    </button>
                    <button
                      onClick={() => { setActiveView("config_tipos_operacion") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_tipos_operacion" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Tipos de operación
                    </button>
                    <button
                      onClick={() => { setActiveView("config_posiciones") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_posiciones" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Posiciones de Ubicaciones
                    </button>
                  </div>
                )}
              </div>

              {/* Subsección Rutas */}
              <div>
                <button
                  onClick={() => setMenuExpandido(prev => ({ ...prev, configRutas: !prev.configRutas }))}
                  className="w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 text-gray-700 hover:bg-gray-100"
                >
                  <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.configRutas ? "rotate-90" : ""}`} />
                  Rutas
                </button>
                {menuExpandido.configRutas && (
                  <div className="ml-4 border-l border-gray-200 pl-2">
                    <button
                      onClick={() => { setActiveView("config_rutas") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_rutas" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Rutas
                    </button>
                    <button
                      onClick={() => { setActiveView("config_reglas") }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md ${activeView === "config_reglas" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Reglas
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* INFORMES */}
        <div className="mb-2">
          <button
            onClick={() => setMenuExpandido(prev => ({ ...prev, informes: !prev.informes }))}
            className="w-full text-left px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-50 rounded"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${menuExpandido.informes ? "rotate-90" : ""}`} />
            <Activity className="w-3.5 h-3.5" />
            Informes
          </button>
          {menuExpandido.informes && (
            <div className="ml-2">
              <button
                onClick={() => { setActiveView("cubo_stock") }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 ${activeView === "cubo_stock" ? "bg-amber-50 text-amber-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <Activity className="w-4 h-4" />
                Cubo de Stock
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Render Productos
  const renderProductos = () => {
    if (creandoProducto) {
      return (
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => setCreandoProducto(false)} className="hover:text-amber-700">Productos</button>
            <span>/</span>
            <span className="font-medium text-gray-900">Nuevo producto</span>
          </div>
          <FormularioProducto
            inicial={null}
            onGuardar={(p: FormProducto) => {
              setCreandoProducto(false)
            }}
            onCancelar={() => setCreandoProducto(false)}
          />
        </div>
      )
    }

    if (selectedProducto) return renderFichaProducto()
    
    const filteredProductos = productos.filter(p => 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria_ruta.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Productos</h1>
          <button
            onClick={() => setCreandoProducto(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        </div>
        
        {/* Buscador */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="productos-stock"
            filterOptions={[
              { field: "categoria", label: "Categoría", values: Array.from(new Set(mockProductosStock.map(p => p.categoria))).map(c => ({ value: c, label: c })) },
              { field: "moneda_costo", label: "Moneda", values: [{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }] },
            ]}
            groupByOptions={[
              { id: "categoria", label: "Categoría", field: "categoria" },
              { id: "moneda_costo", label: "Moneda", field: "moneda_costo" },
            ]}
            activeFilters={activeFiltersProductos}
            activeGroupBy={activeGroupByProductos}
            searchTerm={searchTerm}
            onFiltersChange={setActiveFiltersProductos}
            onGroupByChange={setActiveGroupByProductos}
            onSearchChange={setSearchTerm}
            savedFilters={savedFiltersProductos}
            {...makeStockFilterHandlers(setSavedFiltersProductos, setActiveFiltersProductos, setActiveGroupByProductos)}
            totalCount={productos.length}
            filteredCount={filteredProductos.length}
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Categoría</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Stock Real</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Precio Costo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cuenta Analítica</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.map(producto => (
                <tr 
                  key={producto.id} 
                  onClick={() => setSelectedProducto(producto)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{producto.codigo}</td>
                  <td className="py-3 px-4 text-sm">{producto.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{producto.categoria_ruta}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium">{producto.stock_real}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600">{producto.moneda_costo}</td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(producto.precio_costo, producto.moneda_costo)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{producto.cuenta_analitica || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProductos.length === 0 && (
            <div className="text-center py-8 text-gray-500">No se encontraron productos</div>
          )}
        </div>
      </div>
    )
  }

  // Render Ficha Producto
  const renderFichaProducto = () => {
    if (!selectedProducto) return null
    
    const lotesDelProducto = lotesSeries.filter(l => l.producto_id === selectedProducto.id)

    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => setSelectedProducto(null)} className="hover:text-amber-700">Productos</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{selectedProducto.codigo}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
<BotonVolver onClick={() => setSelectedProducto(null)} variant="minimal" texto="" />
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-900">{selectedProducto.nombre}</h1>
              <p className="text-sm text-gray-500">{selectedProducto.codigo} | {selectedProducto.tipo.charAt(0).toUpperCase() + selectedProducto.tipo.slice(1)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedProducto.puede_venderse ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {selectedProducto.puede_venderse ? 'Puede Venderse' : 'No Vendible'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedProducto.puede_comprarse ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {selectedProducto.puede_comprarse ? 'Puede Comprarse' : 'No Comprable'}
            </span>
          </div>
        </div>

        {/* Smart Buttons */}
        <div className="flex gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 text-center">
            <p className="text-2xl font-bold text-amber-700">{selectedProducto.stock_real}</p>
            <p className="text-sm text-gray-500">En Stock</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 text-center">
            <p className="text-2xl font-bold text-blue-600">{selectedProducto.stock_entrante}</p>
            <p className="text-sm text-gray-500">Entrante</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 text-center">
            <p className="text-2xl font-bold text-orange-600">{selectedProducto.stock_saliente}</p>
            <p className="text-sm text-gray-500">Saliente</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 text-center">
            <p className="text-2xl font-bold text-green-600">{selectedProducto.stock_disponible}</p>
            <p className="text-sm text-gray-500">Disponible</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex-1 text-center">
            <p className="text-2xl font-bold text-purple-600">{selectedProducto.stock_virtual}</p>
            <p className="text-sm text-gray-500">Virtual</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Columna Principal */}
          <div className="col-span-2 space-y-6">
            {/* Información */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Información</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Precio de Venta:</span> <span className="font-medium">{formatCurrency(selectedProducto.precio_venta)}</span></div>
                <div><span className="text-gray-500">Precio de Costo:</span> <span className="font-medium">{formatCurrency(selectedProducto.precio_costo, selectedProducto.moneda_costo)}</span></div>
                <div><span className="text-gray-500">Marca:</span> <span className="font-medium">{selectedProducto.marca || "-"}</span></div>
                <div><span className="text-gray-500">Modelo:</span> <span className="font-medium">{selectedProducto.modelo || "-"}</span></div>
                <div><span className="text-gray-500">Color:</span> <span className="font-medium">{selectedProducto.color || "-"}</span></div>
                <div><span className="text-gray-500">Origen:</span> <span className="font-medium">{selectedProducto.origen || "-"}</span></div>
                <div><span className="text-gray-500">Código de Barras:</span> <span className="font-medium font-mono">{selectedProducto.codigo_barras || "-"}</span></div>
                <div><span className="text-gray-500">Categoría:</span> <span className="font-medium">{selectedProducto.categoria_ruta}</span></div>
              </div>
            </div>

            {/* Stock y Variaciones */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Inventario</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Stock Mínimo:</span> <span className="font-medium">{selectedProducto.stock_minimo}</span></div>
                <div><span className="text-gray-500">Stock Máximo:</span> <span className="font-medium">{selectedProducto.stock_maximo}</span></div>
                <div><span className="text-gray-500">Stock Crítico:</span> <span className="font-medium text-red-600">{selectedProducto.stock_critico}</span></div>
                <div><span className="text-gray-500">Punto de Pedido:</span> <span className="font-medium text-amber-600">{selectedProducto.punto_pedido}</span></div>
                <div><span className="text-gray-500">Tracking:</span> <span className="font-medium">{selectedProducto.tracking === 'serie' ? 'Por Número de Serie' : selectedProducto.tracking === 'lote' ? 'Por Lote' : 'Sin Tracking'}</span></div>
                <div><span className="text-gray-500">Cuenta Analítica:</span> <span className="font-medium">{selectedProducto.cuenta_analitica || "-"}</span></div>
              </div>
            </div>

            {/* Lotes/Series del Producto */}
            {selectedProducto.tracking !== 'ninguno' && lotesDelProducto.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">
                  {selectedProducto.tracking === 'serie' ? 'Números de Serie' : 'Lotes'}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3">{selectedProducto.tracking === 'serie' ? 'IMEI/Serie' : 'Lote'}</th>
                      <th className="text-left py-2 px-3">Ubicación</th>
                      <th className="text-center py-2 px-3">Cantidad</th>
                      {selectedProducto.tracking === 'serie' && <th className="text-center py-2 px-3">Batería</th>}
                      <th className="text-center py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesDelProducto.map(lote => (
                      <tr key={lote.id} className="border-b">
                        <td className="py-2 px-3 font-mono">{lote.numero}</td>
                        <td className="py-2 px-3">{lote.ubicacion_nombre}</td>
                        <td className="py-2 px-3 text-center">{lote.cantidad}</td>
                        {selectedProducto.tracking === 'serie' && (
                          <td className="py-2 px-3 text-center">{lote.bateria ? `${lote.bateria}%` : '-'}</td>
                        )}
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            lote.estado === 'disponible' ? 'bg-green-100 text-green-700' :
                            lote.estado === 'reservado' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {getEstadoLabel(lote.estado)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Columna Lateral */}
          <div className="space-y-6">
            {/* Alertas de Stock */}
            {selectedProducto.stock_real <= selectedProducto.stock_critico && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Stock Crítico</span>
                </div>
                <p className="text-sm text-red-600 mt-1">El stock está por debajo del nivel crítico.</p>
              </div>
            )}
            {selectedProducto.stock_real <= selectedProducto.punto_pedido && selectedProducto.stock_real > selectedProducto.stock_critico && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Punto de Pedido</span>
                </div>
                <p className="text-sm text-amber-600 mt-1">El stock está en el punto de pedido. Considere reabastecer.</p>
              </div>
            )}

            {/* Resumen */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resumen de Stock</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock Real:</span>
                  <span className="font-bold text-lg">{selectedProducto.stock_real}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">+ Entrante:</span>
                  <span className="text-blue-600">+{selectedProducto.stock_entrante}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">- Saliente:</span>
                  <span className="text-orange-600">-{selectedProducto.stock_saliente}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-500">= Disponible:</span>
                  <span className="font-bold text-green-600">{selectedProducto.stock_disponible}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Transferencias Internas
  const renderTransferencias = () => {
    if (creandoTransferencia) return renderCrearTransferencia()
    if (selectedTransferencia) return renderFichaTransferencia()

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Transferencias Internas</h1>
          <button 
            onClick={() => { resetTransferenciaForm(); setCreandoTransferencia(true) }}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Transferencia
          </button>
        </div>

        {/* Buscador */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="transferencias-stock"
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "borrador", label: "Borrador" },
                { value: "en_transito", label: "En tránsito" },
                { value: "completada", label: "Completada" },
                { value: "cancelada", label: "Cancelada" },
              ]},
            ]}
            groupByOptions={[
              { id: "estado", label: "Estado", field: "estado" },
              { id: "origen", label: "Origen", field: "origen" },
            ]}
            activeFilters={activeFiltersTransferencias}
            activeGroupBy={activeGroupByTransferencias}
            searchTerm={searchTerm}
            onFiltersChange={setActiveFiltersTransferencias}
            onGroupByChange={setActiveGroupByTransferencias}
            onSearchChange={setSearchTerm}
            savedFilters={savedFiltersTransferencias}
            {...makeStockFilterHandlers(setSavedFiltersTransferencias, setActiveFiltersTransferencias, setActiveGroupByTransferencias)}
            totalCount={transferencias.length}
            filteredCount={transferencias.length}
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha Creación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha Transferencia</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación Origen</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación Destino</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map(t => (
                <tr 
                  key={t.id} 
                  onClick={() => setSelectedTransferencia(t)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{t.numero}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(t.fecha_creacion)}</td>
                  <td className="py-3 px-4 text-sm">{t.fecha_transferencia ? formatDate(t.fecha_transferencia) : "-"}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoTransferenciaColor(t.estado)}`}>
                      {getEstadoLabel(t.estado)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{t.ubicacion_origen_nombre}</td>
                  <td className="py-3 px-4 text-sm">{t.ubicacion_destino_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transferencias.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay transferencias</div>
          )}
        </div>
      </div>
    )
  }

  // Ubicaciones del depósito seleccionado (para formulario transferencia)
  const transUbicacionesDeposito = useMemo(() => 
    mockUbicaciones.filter(u => u.deposito_id === transFormDeposito && u.activa),
    [transFormDeposito]
  )
  
  // Número de documento para nueva transferencia
  const transNumeroDocumento = useMemo(() => 
    `TI X 10000-${String(Date.now()).slice(-8)}`,
    [creandoTransferencia]
  )
  
  // Resetear formulario de transferencia interna
  const resetTransferenciaForm = () => {
    const primerDeposito = mockDepositos[0]
    setTransFormDeposito(primerDeposito?.id ?? null)
    setTransFormUbicacionOrigen(null)
    setTransFormUbicacionDestino(null)
    setTransFormCodigoProducto("")
    setTransFormSucursal(primerDeposito?.sucursal ?? "Puerto Norte")
    setTransFormFechaCreacion(new Date().toISOString())
    setTransFormObservaciones("")
    setTransFormLineas([])
    setTransActiveTab("productos")
    setTransShowProductSearch(false)
    setTransProductSearchTerm("")
    // Iniciar seguimiento con entradas de creación
    const ahora = new Date().toISOString()
    setTransFormSeguimiento([
      { id: 1, fecha: ahora, usuario: "Usuario Actual", tipo: "creacion", descripcion: "Transferencia Interna creada" },
      { id: 2, fecha: ahora, usuario: "Usuario Actual", tipo: "cambio_estado", valor_anterior: "Vacío", valor_nuevo: "Borrador" },
    ])
  }
  
  // Buscar y agregar producto por código
  const transAgregarProductoPorCodigo = () => {
    if (!transFormCodigoProducto.trim()) return
    const producto = productos.find(p => 
      p.codigo.toLowerCase() === transFormCodigoProducto.toLowerCase() ||
      p.codigo_barras === transFormCodigoProducto
    )
    if (producto) {
      const existente = transFormLineas.find(l => l.producto_id === producto.id)
      if (existente) {
        setTransFormLineas(prev => prev.map(l => 
          l.producto_id === producto.id 
            ? { ...l, cantidad: l.cantidad + 1 }
            : l
        ))
      } else {
        setTransFormLineas(prev => [...prev, {
          id: Date.now(),
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          producto_codigo: producto.codigo,
          stock_virtual: producto.stock_virtual,
          cantidad: 1,
          observacion: ""
        }])
      }
      setTransFormCodigoProducto("")
    }
  }
  
  // Guardar transferencia
  const transGuardarTransferencia = (confirmar: boolean = false) => {
    if (!transFormDeposito || !transFormUbicacionOrigen || !transFormUbicacionDestino || transFormLineas.length === 0) {
      alert("Complete todos los campos requeridos y agregue al menos un producto")
      return
    }
    
    const deposito = mockDepositos.find(d => d.id === transFormDeposito)
    const ubicOrigen = mockUbicaciones.find(u => u.id === transFormUbicacionOrigen)
    const ubicDestino = mockUbicaciones.find(u => u.id === transFormUbicacionDestino)
    
    // Agregar entrada de seguimiento si se confirma
    let seguimientoFinal = [...transFormSeguimiento]
    if (confirmar) {
      seguimientoFinal = [
        {
          id: Date.now(),
          fecha: new Date().toISOString(),
          usuario: "Usuario Actual",
          tipo: "cambio_estado" as const,
          valor_anterior: "Borrador",
          valor_nuevo: "Confirmada"
        },
        ...seguimientoFinal
      ]
    }
    
    const nuevaTransferencia: TransferenciaInterna = {
      id: Date.now(),
      numero: transNumeroDocumento,
      deposito_id: transFormDeposito,
      deposito_nombre: deposito?.nombre || "",
      ubicacion_origen_id: transFormUbicacionOrigen,
      ubicacion_origen_nombre: ubicOrigen?.codigo || "",
      ubicacion_destino_id: transFormUbicacionDestino,
      ubicacion_destino_nombre: ubicDestino?.codigo || "",
      fecha_creacion: transFormFechaCreacion,
      fecha_transferencia: confirmar ? new Date().toISOString() : null,
      estado: confirmar ? "confirmada" : "borrador",
      sucursal: transFormSucursal,
      observaciones: transFormObservaciones,
      lineas: transFormLineas.map(l => ({
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre,
        stock_virtual: l.stock_virtual,
        cantidad: l.cantidad,
        observacion: l.observacion
      })),
      seguimiento: seguimientoFinal
    }
    
    setTransferencias(prev => [nuevaTransferencia, ...prev])
    resetTransferenciaForm()
    setCreandoTransferencia(false)
  }
  
  // Render Crear Transferencia (formulario estilo Odoo)
  const renderCrearTransferencia = () => {
    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => { resetTransferenciaForm(); setCreandoTransferencia(false) }} className="hover:text-amber-700">Transferencias Internas</button>
          <span>/</span>
          <span className="font-medium text-gray-900">Nuevo</span>
        </div>
        
        {/* Botones de acción */}
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => transGuardarTransferencia(false)}
            className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700"
          >
            Guardar
          </button>
          <button 
            onClick={() => { resetTransferenciaForm(); setCreandoTransferencia(false) }}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Descartar
          </button>
          <div className="flex-1" />
          <button 
            onClick={() => transGuardarTransferencia(true)}
            className="border border-gray-300 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-50"
          >
            Confirmar
          </button>
          
          {/* Indicador de estado */}
          <div className="flex items-center gap-1 ml-4">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-l text-xs font-medium">Borrador</span>
            <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-r text-xs font-medium">Confirmada</span>
          </div>
        </div>
        
        {/* Formulario principal */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Título con número de documento */}
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Transferencia Interna <span className="text-gray-400">X</span> <span className="text-blue-600">{transNumeroDocumento.split("-")[1]}</span>
          </h2>
          
          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Depósito</label>
                <select 
                  value={transFormDeposito || ""}
                  onChange={(e) => {
                    setTransFormDeposito(Number(e.target.value))
                    setTransFormUbicacionOrigen(null)
                    setTransFormUbicacionDestino(null)
                  }}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Seleccionar...</option>
                  {mockDepositos.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Ubicación Origen</label>
                <select 
                  value={transFormUbicacionOrigen || ""}
                  onChange={(e) => setTransFormUbicacionOrigen(Number(e.target.value))}
                  disabled={!transFormDeposito}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
                >
                  <option value="">Seleccionar...</option>
                  {transUbicacionesDeposito.map(u => (
                    <option key={u.id} value={u.id}>{u.codigo}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Ubicación Destino</label>
                <select 
                  value={transFormUbicacionDestino || ""}
                  onChange={(e) => setTransFormUbicacionDestino(Number(e.target.value))}
                  disabled={!transFormDeposito}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm bg-purple-50 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
                >
                  <option value="">Seleccionar...</option>
                  {transUbicacionesDeposito.filter(u => u.id !== transFormUbicacionOrigen).map(u => (
                    <option key={u.id} value={u.id}>{u.codigo}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Columna derecha */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Sucursal</label>
                <select 
                  value={transFormSucursal}
                  onChange={(e) => setTransFormSucursal(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Puerto Norte">Puerto Norte</option>
                  <option value="Casa Central">Casa Central</option>
                  <option value="Casilda">Casilda</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <div className="flex gap-6">
              <button 
                onClick={() => setTransActiveTab("productos")}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  transActiveTab === "productos" 
                    ? "border-amber-600 text-amber-700" 
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Productos
              </button>
              <button 
                onClick={() => setTransActiveTab("observaciones")}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  transActiveTab === "observaciones" 
                    ? "border-amber-600 text-amber-700" 
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Observaciones
              </button>
            </div>
          </div>
          
          {/* Contenido de tabs */}
          {transActiveTab === "productos" ? (
            <div>
              {/* Tabla de productos - solo visible si hay líneas */}
              {transFormLineas.length > 0 && (
                <table className="w-full mb-4">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Producto</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Stock Virtual</th>
                      <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Cantidad</th>
                      <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Observación Interna</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transFormLineas.map(linea => (
                      <tr key={linea.id} className="border-b border-gray-100">
                        <td className="py-2 px-2">
                          <span className="text-sm">{linea.producto_nombre}</span>
                          <span className="text-xs text-gray-400 ml-2">{linea.producto_codigo}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-sm text-gray-600">{linea.stock_virtual}</td>
                        <td className="py-2 px-2">
                          <input 
                            type="number"
                            min="1"
                            value={linea.cantidad}
                            onChange={(e) => setTransFormLineas(prev => prev.map(l => 
                              l.id === linea.id ? { ...l, cantidad: parseInt(e.target.value) || 1 } : l
                            ))}
                            className="w-full text-center border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input 
                            type="text"
                            value={linea.observacion}
                            onChange={(e) => setTransFormLineas(prev => prev.map(l => 
                              l.id === linea.id ? { ...l, observacion: e.target.value } : l
                            ))}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Observación..."
                          />
                        </td>
                        <td className="py-2 px-2">
                          <button 
                            onClick={() => setTransFormLineas(prev => prev.filter(l => l.id !== linea.id))}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {/* Agregar elemento con búsqueda */}
              {transShowProductSearch ? (
                <div className="relative">
                  <input
                    type="text"
                    value={transProductSearchTerm}
                    onChange={(e) => setTransProductSearchTerm(e.target.value)}
                    placeholder="Buscar producto..."
                    autoFocus
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    onBlur={() => {
                      // Delay para permitir click en opciones
                      setTimeout(() => {
                        if (transProductSearchTerm === "") {
                          setTransShowProductSearch(false)
                        }
                      }, 200)
                    }}
                  />
                  
                  {/* Dropdown de productos */}
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
// Filtrar productos por ubicación origen y término de búsqueda
  const productosDisponibles = productos.filter(p => {
  // Si hay ubicación origen seleccionada, filtrar por stock en esa ubicación
  if (transFormUbicacionOrigen) {
  if (p.ubicacion_id !== transFormUbicacionOrigen) {
  return false
  }
  }
                        // Filtrar por término de búsqueda
                        if (transProductSearchTerm) {
                          const term = transProductSearchTerm.toLowerCase()
                          return p.nombre.toLowerCase().includes(term) || 
                                 p.codigo.toLowerCase().includes(term)
                        }
                        return true
                      })
                      // Excluir productos ya agregados
                      .filter(p => !transFormLineas.some(l => l.producto_id === p.id))
                      
                      if (productosDisponibles.length === 0) {
                        return (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            {transFormUbicacionOrigen 
                              ? "No hay productos disponibles en esta ubicación"
                              : "Seleccione una ubicación origen primero"}
                          </div>
                        )
                      }
                      
                      return productosDisponibles.map(producto => (
                        <button
                          key={producto.id}
                          onClick={() => {
                            setTransFormLineas(prev => [...prev, {
                              id: Date.now(),
                              producto_id: producto.id,
                              producto_nombre: producto.nombre,
                              producto_codigo: producto.codigo,
                              stock_virtual: producto.stock_virtual,
                              cantidad: 1,
                              observacion: ""
                            }])
                            setTransProductSearchTerm("")
                            setTransShowProductSearch(false)
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-amber-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                            <div className="text-xs text-gray-500">{producto.codigo} - {producto.ubicacion_codigo}</div>
                          </div>
                          <div className="text-sm text-gray-600">
                            Stock: <span className="font-medium">{producto.stock_virtual}</span>
                          </div>
                        </button>
                      ))
                    })()}
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setTransShowProductSearch(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Añadir un elemento
                </button>
              )}
            </div>
          ) : (
            <div>
              <textarea 
                value={transFormObservaciones}
                onChange={(e) => setTransFormObservaciones(e.target.value)}
                placeholder="Observaciones de la transferencia..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-32 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Ficha Transferencia (detalle completo)
  const renderFichaTransferencia = () => {
    if (!selectedTransferencia) return null
    
    const estadoColor = selectedTransferencia.estado === "confirmada" 
      ? "bg-green-100 text-green-800" 
      : selectedTransferencia.estado === "cancelada"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800"
    
    return (
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => setSelectedTransferencia(null)} className="hover:text-amber-700">Transferencias Internas</button>
          <span>/</span>
          <span className="font-medium text-gray-900">{selectedTransferencia.numero}</span>
        </div>
        
        {/* Botones de acción */}
        <div className="flex items-center gap-3 mb-4">
<BotonVolver onClick={() => setSelectedTransferencia(null)} variant="ghost" />
          <div className="flex-1" />
          
          {/* Indicador de estado */}
          <div className="flex items-center gap-1">
            <span className={`px-3 py-1 rounded-l text-xs font-medium ${
              selectedTransferencia.estado === "borrador" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>Borrador</span>
            <span className={`px-3 py-1 rounded-r text-xs font-medium ${
              selectedTransferencia.estado === "confirmada" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>Confirmada</span>
          </div>
        </div>
        
        {/* Formulario principal */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Título con número de documento */}
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Transferencia Interna <span className="text-gray-400">X</span> <span className="text-blue-600">{selectedTransferencia.numero.split("-")[1]}</span>
          </h2>
          
          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Depósito</label>
                <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">
                  {selectedTransferencia.deposito_nombre}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Ubicación Origen</label>
                <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">
                  {selectedTransferencia.ubicacion_origen_nombre}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Ubicación Destino</label>
                <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">
                  {selectedTransferencia.ubicacion_destino_nombre}
                </div>
              </div>
            </div>
            
            {/* Columna derecha */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Fecha creación</label>
                <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">
                  {new Date(selectedTransferencia.fecha_creacion).toLocaleDateString("es-AR")}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Sucursal</label>
                <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">
                  {selectedTransferencia.sucursal}
                </div>
              </div>
              
              {selectedTransferencia.fecha_transferencia && (
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Fecha transf.</label>
                  <div className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50">
                    {new Date(selectedTransferencia.fecha_transferencia).toLocaleDateString("es-AR")}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Tabla de productos */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Productos</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Producto</th>
                  <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Stock Virtual</th>
                  <th className="text-center py-2 px-2 text-sm font-medium text-gray-700 w-32">Cantidad</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-700">Observación</th>
                </tr>
              </thead>
              <tbody>
                {selectedTransferencia.lineas.map((linea, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 px-2 text-sm">{linea.producto_nombre}</td>
                    <td className="py-2 px-2 text-center text-sm text-gray-600">{linea.stock_virtual}</td>
                    <td className="py-2 px-2 text-center text-sm font-medium">{linea.cantidad}</td>
                    <td className="py-2 px-2 text-sm text-gray-500">{linea.observacion || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Observaciones */}
          {selectedTransferencia.observaciones && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Observaciones</h3>
              <p className="text-sm text-gray-600">{selectedTransferencia.observaciones}</p>
            </div>
          )}
          
          {/* Panel de Seguimiento */}
          <SeguimientoPanel 
            seguimiento={selectedTransferencia.seguimiento || []}
            collapsed={false}
          />
        </div>
      </div>
    )
  }

  // Render Lotes y Series (todos los IMEI históricos con filtros tipo Odoo)
  const renderLotesSeries = () => {
    // Aplicar filtros
    let seriesFiltradas = todosIMEI.filter(lote => {
      // Filtro de búsqueda
      if (seriesSearchTerm) {
        const search = seriesSearchTerm.toLowerCase()
        if (!lote.producto_nombre.toLowerCase().includes(search) &&
            !lote.numero.toLowerCase().includes(search) &&
            !lote.ubicacion_nombre.toLowerCase().includes(search) &&
            !lote.sucursal.toLowerCase().includes(search) &&
            !lote.producto_codigo.toLowerCase().includes(search)) {
          return false
        }
      }
      // Aplicar filtros activos
      for (const filter of seriesActiveFilters) {
        const loteValue = (lote as Record<string, unknown>)[filter.field]
        if (loteValue !== filter.value) return false
      }
      return true
    })
    
    // Función recursiva para agrupar en múltiples niveles
    type GroupedData = { 
      items: LoteSerie[]
      subgroups?: Record<string, GroupedData>
      totalCantidad: number
    }
    
    const groupDataMultiLevel = (
      data: LoteSerie[], 
      groupByFields: GroupByOption[], 
      level: number = 0
    ): Record<string, GroupedData> => {
      if (level >= groupByFields.length || groupByFields.length === 0) {
        return { "all": { items: data, totalCantidad: data.reduce((sum, l) => sum + l.cantidad, 0) } }
      }
      
      const currentField = groupByFields[level].field
      const grouped: Record<string, GroupedData> = {}
      
      data.forEach(item => {
        let key = String((item as Record<string, unknown>)[currentField] || "Sin definir")
        if (currentField === "estado") {
          key = key === "disponible" ? "Disponible" : key === "reservado" ? "Reservado" : "Vendido"
        }
        
        if (!grouped[key]) {
          grouped[key] = { items: [], totalCantidad: 0 }
        }
        grouped[key].items.push(item)
        grouped[key].totalCantidad += item.cantidad
      })
      
      if (level < groupByFields.length - 1) {
        Object.keys(grouped).forEach(key => {
          grouped[key].subgroups = groupDataMultiLevel(grouped[key].items, groupByFields, level + 1)
        })
      }
      
      return grouped
    }
    
    const groupedData = groupDataMultiLevel(seriesFiltradas, seriesActiveGroupBy)
    
    const toggleGroup = (groupKey: string) => {
      setSeriesExpandedGroups(prev => {
        const next = new Set(prev)
        if (next.has(groupKey)) {
          next.delete(groupKey)
        } else {
          next.add(groupKey)
        }
        return next
      })
    }
    
    // Handlers para el componente OdooFilterBar
    const handleSaveFilter = (filter: Omit<SavedFilter, "id" | "createdBy">) => {
      const newFilter: SavedFilter = {
        ...filter,
        id: `filter-${Date.now()}`,
        createdBy: "current_user"
      }
      setSeriesSavedFilters(prev => [...prev, newFilter])
    }
    
    const handleDeleteFilter = (id: string) => {
      setSeriesSavedFilters(prev => prev.filter(f => f.id !== id))
    }
    
    const handleApplyFilter = (filter: SavedFilter) => {
      setSeriesActiveFilters(filter.filters)
      setSeriesActiveGroupBy(filter.groupBy)
    }
    
    // Renderizar grupos recursivamente
    const renderGroup = (
      groupName: string, 
      groupData: GroupedData, 
      level: number = 0,
      parentKey: string = ""
    ) => {
      const fullKey = parentKey ? `${parentKey}/${groupName}` : groupName
      const isExpanded = seriesExpandedGroups.has(fullKey)
      const hasSubgroups = groupData.subgroups && Object.keys(groupData.subgroups).length > 0
      const indent = level * 24
      
      const bateriaItems = groupData.items.filter(l => l.bateria !== null)
      const bateriaProm = bateriaItems.length > 0 
        ? Math.round(bateriaItems.reduce((sum, l) => sum + (l.bateria || 0), 0) / bateriaItems.length)
        : null
      
      return (
        <div key={fullKey}>
          <div 
            className={`flex items-center gap-2 py-2 px-4 cursor-pointer hover:bg-gray-100 ${
              level === 0 ? 'bg-gray-50 border-b font-semibold' : 'border-b border-gray-100'
            }`}
            style={{ paddingLeft: `${16 + indent}px` }}
            onClick={() => toggleGroup(fullKey)}
          >
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <span className={level === 0 ? 'text-gray-900' : 'text-gray-700'}>
              {groupName}
            </span>
            <span className="text-gray-500 font-normal">
              ({groupData.items.length})
            </span>
            <span className="ml-auto flex items-center gap-6 text-sm text-gray-500">
              <span>Cant: {groupData.totalCantidad}</span>
              {bateriaProm !== null && <span>Bat: {bateriaProm}%</span>}
            </span>
          </div>
          
          {isExpanded && (
            <>
              {hasSubgroups ? (
                Object.entries(groupData.subgroups!).map(([subName, subData]) => 
                  renderGroup(subName, subData, level + 1, fullKey)
                )
              ) : (
                <div className="bg-white">
                  {groupData.items.map(lote => (
                    <div 
                      key={lote.id} 
                      className="flex items-center py-2 px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm"
                      style={{ paddingLeft: `${16 + indent + 28}px` }}
                    >
                      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                        <div className="col-span-2">
                          <span className="font-medium text-gray-900">{lote.producto_nombre}</span>
                          <span className="text-gray-400 ml-2 text-xs">{lote.producto_codigo}</span>
                        </div>
                        <div className="text-gray-600">{lote.ubicacion_nombre}</div>
                        <div className="font-mono text-amber-700 text-xs">{lote.numero}</div>
                        <div className="text-center font-medium">{lote.cantidad}</div>
                        <div className="text-center">
                          {lote.bateria !== null ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              lote.bateria >= 90 ? 'bg-green-100 text-green-700' :
                              lote.bateria >= 80 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {lote.bateria}%
                            </span>
                          ) : '-'}
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            lote.estado === "disponible" ? 'bg-green-100 text-green-700' :
                            lote.estado === "reservado" ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {lote.estado === "disponible" ? "Disponible" : lote.estado === "reservado" ? "Reservado" : "Vendido"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Lotes y Series</h1>
        </div>

        {/* Barra de filtros tipo Odoo */}
        <OdooFilterBar
          moduleName="lotes_series"
          filterOptions={seriesFilterOptions}
          groupByOptions={seriesGroupByOptions}
          activeFilters={seriesActiveFilters}
          activeGroupBy={seriesActiveGroupBy}
          searchTerm={seriesSearchTerm}
          onFiltersChange={setSeriesActiveFilters}
          onGroupByChange={setSeriesActiveGroupBy}
          onSearchChange={setSeriesSearchTerm}
          savedFilters={seriesSavedFilters}
          onSaveFilter={handleSaveFilter}
          onDeleteFilter={handleDeleteFilter}
          onApplyFilter={handleApplyFilter}
          totalCount={todosIMEI.length}
          filteredCount={seriesFiltradas.length}
        />

        {/* Resultados */}
        <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
          {seriesFiltradas.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron series con los filtros aplicados</p>
              <button 
                onClick={() => { setSeriesActiveFilters([]); setSeriesSearchTerm("") }}
                className="mt-2 text-amber-600 hover:text-amber-700 text-sm"
              >
                Limpiar filtros
              </button>
            </div>
          ) : seriesActiveGroupBy.length === 0 ? (
            // Sin agrupación - mostrar tabla simple
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">IMEI/Serie</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Batería</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Color</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {seriesFiltradas.map(lote => (
                    <tr key={lote.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <td className="py-2 px-4">
                        <div className="text-sm font-medium text-gray-900">{lote.producto_nombre}</div>
                        <div className="text-xs text-gray-500">{lote.producto_codigo}</div>
                      </td>
                      <td className="py-2 px-4 font-mono text-sm text-amber-700">{lote.numero}</td>
                      <td className="py-2 px-4 text-sm text-gray-600">{lote.ubicacion_nombre}</td>
                      <td className="py-2 px-4 text-sm text-gray-600">{lote.sucursal}</td>
                      <td className="py-2 px-4 text-sm text-center font-medium">{lote.cantidad}</td>
                      <td className="py-2 px-4 text-sm text-center">
                        {lote.bateria !== null ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            lote.bateria >= 90 ? 'bg-green-100 text-green-700' :
                            lote.bateria >= 80 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {lote.bateria}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600">{lote.color || '-'}</td>
                      <td className="py-2 px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          lote.estado === "disponible" ? 'bg-green-100 text-green-700' :
                          lote.estado === "reservado" ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {lote.estado === "disponible" ? "Disponible" : lote.estado === "reservado" ? "Reservado" : "Vendido"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Con agrupación - renderizar grupos
            Object.entries(groupedData).map(([groupName, groupData]) => 
              renderGroup(groupName, groupData)
            )
          )}
        </div>
      </div>
    )
  }

  // Render Lotes en Stock (con filtros y agrupación multinivel tipo Odoo)
  const renderLotesStock = () => {
    // Aplicar filtros
    let lotesFiltrados = lotesSeries.filter(lote => {
      // Filtro de búsqueda
      if (lotesSearchTerm) {
        const search = lotesSearchTerm.toLowerCase()
        if (!lote.producto_nombre.toLowerCase().includes(search) &&
            !lote.numero.toLowerCase().includes(search) &&
            !lote.ubicacion_nombre.toLowerCase().includes(search) &&
            !lote.sucursal.toLowerCase().includes(search) &&
            !lote.producto_codigo.toLowerCase().includes(search)) {
          return false
        }
      }
      // Aplicar filtros activos
      for (const filter of lotesActiveFilters) {
        const loteValue = (lote as Record<string, unknown>)[filter.field]
        if (loteValue !== filter.value) return false
      }
      return true
    })
    
    // Función recursiva para agrupar en múltiples niveles
    type GroupedData = { 
      items: LoteSerie[]
      subgroups?: Record<string, GroupedData>
      totalCantidad: number
    }
    
    const groupDataMultiLevel = (
      data: LoteSerie[], 
      groupByFields: GroupByOption[], 
      level: number = 0
    ): Record<string, GroupedData> => {
      if (level >= groupByFields.length || groupByFields.length === 0) {
        return { "all": { items: data, totalCantidad: data.reduce((sum, l) => sum + l.cantidad, 0) } }
      }
      
      const currentField = groupByFields[level].field
      const grouped: Record<string, GroupedData> = {}
      
      data.forEach(item => {
        let key = String((item as Record<string, unknown>)[currentField] || "Sin definir")
        // Formatear el valor si es estado
        if (currentField === "estado") {
          key = key === "disponible" ? "Disponible" : key === "reservado" ? "Reservado" : "Vendido"
        }
        
        if (!grouped[key]) {
          grouped[key] = { items: [], totalCantidad: 0 }
        }
        grouped[key].items.push(item)
        grouped[key].totalCantidad += item.cantidad
      })
      
      // Si hay más niveles de agrupación, agrupar recursivamente
      if (level < groupByFields.length - 1) {
        Object.keys(grouped).forEach(key => {
          grouped[key].subgroups = groupDataMultiLevel(grouped[key].items, groupByFields, level + 1)
        })
      }
      
      return grouped
    }
    
    const groupedData = groupDataMultiLevel(lotesFiltrados, lotesActiveGroupBy)
    
    const toggleGroup = (groupKey: string) => {
      setLotesExpandedGroups(prev => {
        const next = new Set(prev)
        if (next.has(groupKey)) {
          next.delete(groupKey)
        } else {
          next.add(groupKey)
        }
        return next
      })
    }
    
    // Handlers para el componente OdooFilterBar
    const handleSaveFilter = (filter: Omit<SavedFilter, "id" | "createdBy">) => {
      const newFilter: SavedFilter = {
        ...filter,
        id: `filter-${Date.now()}`,
        createdBy: "current_user"
      }
      setLotesSavedFilters(prev => [...prev, newFilter])
    }
    
    const handleDeleteFilter = (id: string) => {
      setLotesSavedFilters(prev => prev.filter(f => f.id !== id))
    }
    
    const handleApplyFilter = (filter: SavedFilter) => {
      setLotesActiveFilters(filter.filters)
      setLotesActiveGroupBy(filter.groupBy)
    }
    
    // Renderizar grupos recursivamente
    const renderGroup = (
      groupName: string, 
      groupData: GroupedData, 
      level: number = 0,
      parentKey: string = ""
    ) => {
      const fullKey = parentKey ? `${parentKey}/${groupName}` : groupName
      const isExpanded = lotesExpandedGroups.has(fullKey)
      const hasSubgroups = groupData.subgroups && Object.keys(groupData.subgroups).length > 0
      const indent = level * 24
      
      return (
        <div key={fullKey}>
          {/* Header del grupo - siempre clickeable para expandir/colapsar */}
          <div 
            className={`flex items-center gap-2 py-2 px-4 cursor-pointer hover:bg-gray-100 ${
              level === 0 ? 'bg-gray-50 border-b font-semibold' : 'border-b border-gray-100'
            }`}
            style={{ paddingLeft: `${16 + indent}px` }}
            onClick={() => toggleGroup(fullKey)}
          >
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <span className={level === 0 ? 'text-gray-900' : 'text-gray-700'}>
              {groupName}
            </span>
            <span className="text-gray-500 font-normal">
              ({groupData.items.length})
            </span>
          </div>
          
          {/* Contenido del grupo */}
          {isExpanded && (
            <>
              {hasSubgroups ? (
                // Renderizar subgrupos
                Object.entries(groupData.subgroups!).map(([subName, subData]) => 
                  renderGroup(subName, subData, level + 1, fullKey)
                )
              ) : (
                // Renderizar items como filas simples dentro del grupo
                <div className="bg-white">
                  {groupData.items.map(lote => (
                    <div 
                      key={lote.id} 
                      className="flex items-center py-2 px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-sm"
                      style={{ paddingLeft: `${16 + indent + 28}px` }}
                    >
                      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
                        <div className="col-span-2">
                          <span className="font-medium text-gray-900">{lote.producto_nombre}</span>
                          <span className="text-gray-400 ml-2 text-xs">{lote.producto_codigo}</span>
                        </div>
                        <div className="text-gray-600">{lote.ubicacion_nombre}</div>
                        <div className="font-mono text-amber-700 text-xs">{lote.numero}</div>
                        <div className="text-center font-medium">{lote.cantidad}</div>
                        <div className="text-center">
                          {lote.bateria !== null ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              lote.bateria >= 90 ? 'bg-green-100 text-green-700' :
                              lote.bateria >= 80 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {lote.bateria}%
                            </span>
                          ) : '-'}
                        </div>
                        <div className="text-gray-600">{lote.color || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">IMEI en Stock</h1>
        </div>

        {/* Barra de filtros tipo Odoo */}
        <OdooFilterBar
          moduleName="lotes_stock"
          filterOptions={lotesFilterOptions}
          groupByOptions={lotesGroupByOptions}
          activeFilters={lotesActiveFilters}
          activeGroupBy={lotesActiveGroupBy}
          searchTerm={lotesSearchTerm}
          onFiltersChange={setLotesActiveFilters}
          onGroupByChange={setLotesActiveGroupBy}
          onSearchChange={setLotesSearchTerm}
          savedFilters={lotesSavedFilters}
          onSaveFilter={handleSaveFilter}
          onDeleteFilter={handleDeleteFilter}
          onApplyFilter={handleApplyFilter}
          totalCount={lotesSeries.length}
          filteredCount={lotesFiltrados.length}
        />

        {/* Resultados agrupados */}
        <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
          {lotesFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron lotes con los filtros aplicados</p>
              <button 
                onClick={() => { setLotesActiveFilters([]); setLotesSearchTerm("") }}
                className="mt-2 text-amber-600 hover:text-amber-700 text-sm"
              >
                Limpiar filtros
              </button>
            </div>
          ) : lotesActiveGroupBy.length === 0 ? (
            // Sin agrupación - mostrar tabla simple
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Producto</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Lote/IMEI</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Batería</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Color</th>
                    <th className="text-center py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lotesFiltrados.map(lote => (
                    <tr key={lote.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <td className="py-2 px-4">
                        <div className="text-sm font-medium text-gray-900">{lote.producto_nombre}</div>
                        <div className="text-xs text-gray-500">{lote.producto_codigo}</div>
                      </td>
                      <td className="py-2 px-4 font-mono text-sm text-amber-700">{lote.numero}</td>
                      <td className="py-2 px-4 text-sm text-gray-600">{lote.ubicacion_nombre}</td>
                      <td className="py-2 px-4 text-sm text-gray-600">{lote.sucursal}</td>
                      <td className="py-2 px-4 text-sm text-center font-medium">{lote.cantidad}</td>
                      <td className="py-2 px-4 text-sm text-center">
                        {lote.bateria !== null ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            lote.bateria >= 90 ? 'bg-green-100 text-green-700' :
                            lote.bateria >= 80 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {lote.bateria}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-600">{lote.color || '-'}</td>
                      <td className="py-2 px-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          lote.estado === "disponible" ? 'bg-green-100 text-green-700' :
                          lote.estado === "reservado" ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lote.estado === "disponible" ? "Disponible" : lote.estado === "reservado" ? "Reservado" : "Vendido"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Con agrupación - renderizar grupos
            Object.entries(groupedData).map(([groupName, groupData]) => 
              renderGroup(groupName, groupData)
            )
          )}
        </div>
      </div>
    )
  }

  // Render Control de Inventario
  const renderControlInventario = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Control de Inventario</h1>
          <button 
            onClick={() => setCreandoControl(true)}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Control
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Sucursal</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {controlesInventario.map(c => (
                <tr 
                  key={c.id} 
                  onClick={() => setSelectedControl(c)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{c.numero}</td>
                  <td className="py-3 px-4 text-sm">{c.deposito_nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(c.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{c.concepto}</td>
                  <td className="py-3 px-4 text-sm">{c.ubicacion_nombre}</td>
                  <td className="py-3 px-4 text-sm">{c.sucursal}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoControlColor(c.estado)}`}>
                      {getEstadoLabel(c.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {controlesInventario.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay controles de inventario</div>
          )}
        </div>
      </div>
    )
  }

  // Render Ajustes Positivos/Negativos
  const renderAjustes = (tipo: "positivo" | "negativo") => {
    const ajustesFiltrados = ajustes.filter(a => a.tipo === tipo)
    const titulo = tipo === "positivo" ? "Ajustes Positivos" : "Ajustes Negativos"
    const icono = tipo === "positivo" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">{titulo}</h1>
          <button className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Ajuste
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ajustesFiltrados.map(a => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{a.numero}</td>
                  <td className="py-3 px-4 text-sm">{a.deposito_nombre}</td>
                  <td className="py-3 px-4 text-sm">{a.ubicacion_nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(a.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{a.concepto}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoControlColor(a.estado)}`}>
                      {getEstadoLabel(a.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ajustesFiltrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay ajustes {tipo === "positivo" ? "positivos" : "negativos"}</div>
          )}
        </div>
      </div>
    )
  }

  // Render Pedidos de Abastecimiento
  const renderPedidosAbastecimiento = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Pedidos de Abastecimiento</h1>
          <button 
            onClick={() => setCreandoPedido(true)}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Solicitar Abastecimiento
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito Origen</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito Destino</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Categor��a</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidosAbastecimiento.map(p => (
                <tr 
                  key={p.id} 
                  onClick={() => setSelectedPedido(p)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono text-sm text-amber-700 font-medium">{p.numero}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(p.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{p.deposito_origen_nombre}</td>
                  <td className="py-3 px-4 text-sm">{p.deposito_destino_nombre}</td>
                  <td className="py-3 px-4 text-sm">{p.categoria_ubicacion}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoPedidoColor(p.estado)}`}>
                      {getEstadoLabel(p.estado)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pedidosAbastecimiento.length === 0 && (
            <div className="text-center py-8 text-gray-500">No hay pedidos de abastecimiento</div>
          )}
        </div>
      </div>
    )
  }

  // Render Configuración - Depósitos
  const renderConfigDepositos = () => {
    // Si hay un depósito seleccionado, mostrar la ficha
    if (selectedDeposito) {
      const ubicacionesDeposito = mockUbicaciones.filter(u => u.deposito_id === selectedDeposito.id)
      const ubicacionEntrada = mockUbicaciones.find(u => u.id === selectedDeposito.ubicacion_entrada_id)
      const ubicacionSalida = mockUbicaciones.find(u => u.id === selectedDeposito.ubicacion_salida_id)
      const ubicacionStock = mockUbicaciones.find(u => u.id === selectedDeposito.ubicacion_stock_id)
      const ubicacionQC = mockUbicaciones.find(u => u.id === selectedDeposito.ubicacion_control_calidad_id)
      const ubicacionPack = mockUbicaciones.find(u => u.id === selectedDeposito.ubicacion_empaquetado_id)
      
      return (
        <div>
          {/* Breadcrumb con acciones */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => setSelectedDeposito(null)} className="hover:text-amber-700">Depósitos</button>
              <span>/</span>
              <span className="font-medium text-gray-900">{selectedDeposito.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setEditandoDeposito(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Editar
              </button>
              <button 
                onClick={() => { setSelectedDeposito(null); setCreandoDeposito(true) }}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Crear
              </button>
            </div>
          </div>
          
          {/* Formulario de edición */}
          {editandoDeposito ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Depósito</h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Nombre *</label>
                    <input type="text" defaultValue={selectedDeposito.nombre} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Código *</label>
                    <input type="text" defaultValue={selectedDeposito.codigo} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Sucursal *</label>
                    <input type="text" defaultValue={selectedDeposito.sucursal} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Dirección</label>
                    <input type="text" defaultValue={selectedDeposito.direccion} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Distribución</label>
                    <input type="checkbox" defaultChecked={selectedDeposito.deposito_distribucion} className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">De Tercero</label>
                    <input type="checkbox" defaultChecked={selectedDeposito.deposito_tercero} className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Activo</label>
                    <input type="checkbox" defaultChecked={selectedDeposito.activo} className="rounded border-gray-300" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setEditandoDeposito(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
                <button onClick={() => setEditandoDeposito(false)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm">
                  Guardar
                </button>
              </div>
            </div>
          ) : (
          /* Ficha del depósito (solo lectura) */
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedDeposito.nombre}</h2>
            
            {/* Campos principales */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Nombre corto</label>
                  <span className="text-sm text-gray-900">{selectedDeposito.codigo}</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Subcompanias</label>
                  <span className="text-sm text-gray-900">{selectedDeposito.subcompanias.join(", ") || "-"}</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Sucursal</label>
                  <span className="text-sm text-gray-900">{selectedDeposito.sucursal}</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Depósito de distribución</label>
                  <input type="checkbox" checked={selectedDeposito.deposito_distribucion} readOnly className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Depósito de Tercero</label>
                  <input type="checkbox" checked={selectedDeposito.deposito_tercero} readOnly className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Activo</label>
                  <input type="checkbox" checked={selectedDeposito.activo} readOnly className="rounded border-gray-300" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Dirección</label>
                  <span className="text-sm text-blue-600">{selectedDeposito.direccion}</span>
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <div className="flex gap-6">
                <button className="pb-2 text-sm font-medium text-amber-700 border-b-2 border-amber-500">Información técnica</button>
                <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Ubicaciones</button>
              </div>
            </div>
            
            {/* Contenido de Información técnica */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Ubicaciones</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-sm text-gray-600">Ubicación de entrada</label>
                    <span className="text-sm text-blue-600">{ubicacionEntrada?.codigo || "-"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-sm text-gray-600">Ubicación del control de calidad</label>
                    <span className="text-sm text-blue-600">{ubicacionQC?.codigo || "-"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-sm text-gray-600">Ubicación de empaquetado</label>
                    <span className="text-sm text-blue-600">{ubicacionPack?.codigo || "-"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-sm text-gray-600">Ubicación de salida</label>
                    <span className="text-sm text-blue-600">{ubicacionSalida?.codigo || "-"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-48 text-sm text-gray-600">Ubicación stock</label>
                    <span className="text-sm text-blue-600">{ubicacionStock?.codigo || "-"}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tipos de albarán</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm text-gray-600">Tipo de entrada</label>
                    <span className="text-sm text-blue-600">{selectedDeposito.nombre}: Recepciones</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm text-gray-600">Tipo interno</label>
                    <span className="text-sm text-blue-600">{selectedDeposito.nombre}: Transferencias internas</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-32 text-sm text-gray-600">Tipo de salida</label>
                    <span className="text-sm text-blue-600">{selectedDeposito.nombre}: Órdenes de entrega</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lista de ubicaciones del depósito */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Ubicaciones del depósito ({ubicacionesDeposito.length})</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Código</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Nombre</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Tipo</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ubicacionesDeposito.map(ub => (
                      <tr key={ub.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm text-blue-600">{ub.codigo}</td>
                        <td className="py-2 px-4 text-sm text-gray-900">{ub.nombre}</td>
                        <td className="py-2 px-4 text-sm text-gray-600 capitalize">{ub.tipo === "interna" ? "Ubicación interna" : ub.tipo}</td>
                        <td className="py-2 px-4 text-sm text-gray-600">{ub.categoria_nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>
      )
    }
    
    // Formulario de crear depósito
    if (creandoDeposito) {
      return (
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => setCreandoDeposito(false)} className="hover:text-amber-700">Depósitos</button>
            <span>/</span>
            <span className="font-medium text-gray-900">Nuevo Depósito</span>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nuevo Depósito</h2>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Nombre *</label>
                  <input type="text" placeholder="Nombre del depósito" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Código *</label>
                  <input type="text" placeholder="Ej: CC, PN" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Sucursal *</label>
                  <input type="text" placeholder="Sucursal" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Dirección</label>
                  <input type="text" placeholder="Dirección completa" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Distribución</label>
                  <input type="checkbox" className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">De Tercero</label>
                  <input type="checkbox" className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Activo</label>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setCreandoDeposito(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button onClick={() => setCreandoDeposito(false)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Lista de depósitos
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Depósitos</h1>
          <button 
            onClick={() => setCreandoDeposito(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nombre del almacén</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nombre corto</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sucursal</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Dirección</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Activo</th>
              </tr>
            </thead>
            <tbody>
              {mockDepositos.map(deposito => (
                <tr 
                  key={deposito.id} 
                  className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer"
                  onClick={() => setSelectedDeposito(deposito)}
                >
                  <td className="py-3 px-4 text-sm text-blue-600 hover:underline">{deposito.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{deposito.codigo}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{deposito.sucursal}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{deposito.direccion}</td>
                  <td className="py-3 px-4 text-center">
                    <input type="checkbox" checked={deposito.activo} readOnly className="rounded border-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Configuración - Ubicaciones
  const renderConfigUbicaciones = () => {
    // Si hay una ubicación seleccionada, mostrar la ficha
    if (selectedUbicacion) {
      const deposito = mockDepositos.find(d => d.id === selectedUbicacion.deposito_id)
      
      return (
        <div>
          {/* Breadcrumb con acciones */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => setSelectedUbicacion(null)} className="hover:text-amber-700">Ubicaciones</button>
              <span>/</span>
              <span className="font-medium text-gray-900">{selectedUbicacion.codigo}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setEditandoUbicacion(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Editar
              </button>
              <button 
                onClick={() => { setSelectedUbicacion(null); setCreandoUbicacion(true) }}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Crear
              </button>
            </div>
          </div>
          
          {/* Formulario de edición */}
          {editandoUbicacion ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Ubicación</h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Código</label>
                    <input type="text" defaultValue={selectedUbicacion.codigo} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Nombre</label>
                    <input type="text" defaultValue={selectedUbicacion.nombre} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Tipo</label>
                    <select defaultValue={selectedUbicacion.tipo} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="interna">Ubicación interna</option>
                      <option value="cliente">Cliente</option>
                      <option value="proveedor">Proveedor</option>
                      <option value="inventario">Inventario</option>
                      <option value="produccion">Producción</option>
                      <option value="transito">Tránsito</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Categoría</label>
                    <select defaultValue={selectedUbicacion.categoria_id} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {mockCategoriasUbicacion.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Depósito</label>
                    <select defaultValue={selectedUbicacion.deposito_id} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {mockDepositos.map(dep => (
                        <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Es Scrap</label>
                    <input type="checkbox" defaultChecked={selectedUbicacion.es_scrap} className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Es Devolución</label>
                    <input type="checkbox" defaultChecked={selectedUbicacion.es_devolucion} className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Disponible NV</label>
                    <input type="checkbox" defaultChecked={selectedUbicacion.disponible_venta} className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Activa</label>
                    <input type="checkbox" defaultChecked={selectedUbicacion.activa} className="rounded border-gray-300" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setEditandoUbicacion(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
                <button onClick={() => setEditandoUbicacion(false)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm">
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            /* Ficha de la ubicación (solo lectura) */
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Physical Locations / {selectedUbicacion.codigo}</h2>
              
              {/* Campos principales */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Ubicación padre</label>
                    <span className="text-sm text-blue-600">Physical Locations</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Nombre de la ubicación</label>
                    <span className="text-sm text-gray-900">{selectedUbicacion.nombre}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Tipo de ubicación</label>
                    <span className="text-sm text-gray-900 capitalize">{selectedUbicacion.tipo === "interna" ? "Ubicación interna" : selectedUbicacion.tipo}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Categoría</label>
                    <span className="text-sm text-gray-900">{selectedUbicacion.categoria_nombre}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Depósito</label>
                    <span className="text-sm text-blue-600">{deposito?.nombre || "-"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Sucursal</label>
                    <span className="text-sm text-gray-900">{deposito?.sucursal || "-"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Es ubicación Scrap</label>
                    <input type="checkbox" checked={selectedUbicacion.es_scrap} readOnly className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Es ubicación devolución</label>
                    <input type="checkbox" checked={selectedUbicacion.es_devolucion} readOnly className="rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600">Disponible para NV</label>
                    <input type="checkbox" checked={selectedUbicacion.disponible_venta} readOnly className="rounded border-gray-300" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
    
    // Formulario de crear ubicación
    if (creandoUbicacion) {
      return (
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => setCreandoUbicacion(false)} className="hover:text-amber-700">Ubicaciones</button>
            <span>/</span>
            <span className="font-medium text-gray-900">Nueva Ubicación</span>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Ubicación</h2>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Código *</label>
                  <input type="text" placeholder="Ej: CC/Stock/A1" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Nombre *</label>
                  <input type="text" placeholder="Nombre de la ubicación" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Tipo *</label>
                  <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="interna">Ubicación interna</option>
                    <option value="cliente">Cliente</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="inventario">Inventario</option>
                    <option value="produccion">Producción</option>
                    <option value="transito">Tránsito</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Categoría</label>
                  <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Seleccionar...</option>
                    {mockCategoriasUbicacion.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Depósito *</label>
                  <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Seleccionar...</option>
                    {mockDepositos.map(dep => (
                      <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Es Scrap</label>
                  <input type="checkbox" className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Es Devolución</label>
                  <input type="checkbox" className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Disponible NV</label>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-40 text-sm text-gray-600">Activa</label>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setCreandoUbicacion(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button onClick={() => setCreandoUbicacion(false)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Lista de ubicaciones
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ubicaciones</h1>
          <button 
            onClick={() => setCreandoUbicacion(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>
        
        {/* Buscador */}
        <div className="mb-4">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar ubicación..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Nombre de la Ubicación</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Tipo de ubicación</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Categoría de Ubicación</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Depósito</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Sucursal</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Disp. NV</th>
              </tr>
            </thead>
            <tbody>
              {mockUbicaciones.map(ubicacion => {
                const deposito = mockDepositos.find(d => d.id === ubicacion.deposito_id)
                return (
                  <tr 
                    key={ubicacion.id} 
                    className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer"
                    onClick={() => setSelectedUbicacion(ubicacion)}
                  >
                    <td className="py-3 px-4 text-sm text-blue-600 hover:underline">Physical Locations / {ubicacion.codigo}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 capitalize">{ubicacion.tipo === "interna" ? "Ubicación interna" : ubicacion.tipo}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{ubicacion.categoria_nombre}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{deposito?.nombre || "-"}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{deposito?.sucursal || "-"}</td>
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" checked={ubicacion.disponible_venta} readOnly className="rounded border-gray-300" />
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

  // Datos del cubo de stock (memoizado)
  const cuboDatosCubo = useMemo(() => {
    const datos: Array<{
      producto: string
      categoria: string
      marca: string
      deposito: string
      ubicacion: string
      tracking: string
      estado_lote: string
      cantidad: number
      costo: number
      valor_total: number
      stock_minimo: number
      stock_maximo: number
    }> = []

    productos.forEach(p => {
      const ubicacion = mockUbicaciones.find(u => u.id === p.ubicacion_id)
      const deposito = mockDepositos.find(d => d.id === p.deposito_id)
      
      const lotesProducto = lotesSeries.filter(l => l.producto_id === p.id)
      
      if (lotesProducto.length > 0) {
        lotesProducto.forEach(lote => {
          datos.push({
            producto: p.nombre,
            categoria: p.categoria_ruta.split(" / ").pop() || p.categoria_ruta,
            marca: p.marca || "-",
            deposito: deposito?.codigo || "-",
            ubicacion: ubicacion?.codigo || "-",
            tracking: p.tracking === "serie" ? "Serie (IMEI)" : p.tracking === "lote" ? "Lote" : "Ninguno",
            estado_lote: lote.estado,
            cantidad: lote.cantidad_disponible,
            costo: p.precio_costo,
            valor_total: lote.cantidad_disponible * p.precio_costo,
            stock_minimo: p.stock_minimo,
            stock_maximo: p.stock_maximo,
          })
        })
      } else {
        datos.push({
          producto: p.nombre,
          categoria: p.categoria_ruta.split(" / ").pop() || p.categoria_ruta,
          marca: p.marca || "-",
          deposito: deposito?.codigo || "-",
          ubicacion: ubicacion?.codigo || "-",
          tracking: p.tracking === "serie" ? "Serie (IMEI)" : p.tracking === "lote" ? "Lote" : "Ninguno",
          estado_lote: "-",
          cantidad: p.stock_real,
          costo: p.precio_costo,
          valor_total: p.stock_real * p.precio_costo,
          stock_minimo: p.stock_minimo,
          stock_maximo: p.stock_maximo,
        })
      }
    })

    return datos
  }, [productos, lotesSeries])

  // Datos agrupados del cubo con estructura jerárquica (memoizado)
  const cuboDatosAgrupados = useMemo(() => {
    type NodoArbol = {
      clave: string
      nivel: number
      valores: string[]
      datos: Record<string, Record<string, number>>
      hijos: NodoArbol[]
      tieneHijos: boolean
    }

    const valoresColumnas = new Set<string>()
    
    // Primero recoger todas las columnas
    cuboDatosCubo.forEach(fila => {
      const claveColumnaPartes = cuboDimensionColumnas.map(dim => String(fila[dim as keyof typeof fila]))
      const claveColumna = claveColumnaPartes.join(" | ")
      valoresColumnas.add(claveColumna)
    })
    
    const columnasOrdenadas = Array.from(valoresColumnas).sort()

    // Construir árbol jerárquico basado en dimensiones de filas
    const construirArbol = (datos: typeof cuboDatosCubo, nivel: number, prefijo: string[]): NodoArbol[] => {
      if (nivel >= cuboDimensionFilas.length) return []
      
      const dimension = cuboDimensionFilas[nivel]
      const grupos: Record<string, typeof cuboDatosCubo> = {}
      
      datos.forEach(fila => {
        const valor = String(fila[dimension as keyof typeof fila])
        if (!grupos[valor]) grupos[valor] = []
        grupos[valor].push(fila)
      })

      return Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0])).map(([valor, filas]) => {
        const valoresActuales = [...prefijo, valor]
        const clave = valoresActuales.join(" | ")
        
        // Calcular totales para este nodo
        const totalesPorColumna: Record<string, Record<string, number>> = {}
        columnasOrdenadas.forEach(col => {
          totalesPorColumna[col] = {}
          cuboMedidasSeleccionadas.forEach(m => {
            totalesPorColumna[col][m] = 0
          })
        })
        
        filas.forEach(fila => {
          const claveColumnaPartes = cuboDimensionColumnas.map(dim => String(fila[dim as keyof typeof fila]))
          const claveColumna = claveColumnaPartes.join(" | ")
          
          cuboMedidasSeleccionadas.forEach(medida => {
            if (totalesPorColumna[claveColumna]) {
              totalesPorColumna[claveColumna][medida] += Number(fila[medida as keyof typeof fila]) || 0
            }
          })
        })
        
        const tieneHijos = nivel < cuboDimensionFilas.length - 1
        const hijos = tieneHijos ? construirArbol(filas, nivel + 1, valoresActuales) : []

        return {
          clave,
          nivel,
          valores: valoresActuales,
          datos: totalesPorColumna,
          hijos,
          tieneHijos
        }
      })
    }

    const arbol = construirArbol(cuboDatosCubo, 0, [])

    return { arbol, columnas: columnasOrdenadas }
  }, [cuboDatosCubo, cuboDimensionFilas, cuboDimensionColumnas, cuboMedidasSeleccionadas])

  // Render Configuración - Categorías de Ubicación
  const renderConfigCategorias = () => {
    const categoriasFiltradas = mockCategoriasUbicacion.filter(cat =>
      cat.nombre.toLowerCase().includes(busquedaCategoria.toLowerCase()) ||
      cat.codigo.toLowerCase().includes(busquedaCategoria.toLowerCase())
    )

    // Ver ficha de categoría
    if (selectedCategoria) {
      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <button onClick={() => { setSelectedCategoria(null); setEditandoCategoria(false) }} className="hover:text-amber-700">Categorías de Ubicación</button>
              <span>/</span>
              <span className="font-medium text-gray-900">{selectedCategoria.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setEditandoCategoria(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Editar
              </button>
              <button 
                onClick={() => { setSelectedCategoria(null); setCreandoCategoria(true) }}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                Crear
              </button>
            </div>
          </div>

          {editandoCategoria ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Categoría</h2>
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Código *</label>
                  <input type="text" defaultValue={selectedCategoria.codigo} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Nombre *</label>
                  <input type="text" defaultValue={selectedCategoria.nombre} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Descripción</label>
                  <textarea defaultValue={selectedCategoria.descripcion} rows={3} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setEditandoCategoria(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                  Cancelar
                </button>
                <button onClick={() => setEditandoCategoria(false)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm">
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedCategoria.nombre}</h2>
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Código</label>
                  <span className="text-sm text-gray-900">{selectedCategoria.codigo}</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Nombre</label>
                  <span className="text-sm text-gray-900">{selectedCategoria.nombre}</span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-32 text-sm text-gray-600">Descripción</label>
                  <span className="text-sm text-gray-900">{selectedCategoria.descripcion || "-"}</span>
                </div>
              </div>

              {/* Ubicaciones con esta categoría */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Ubicaciones con esta categoría ({mockUbicaciones.filter(u => u.categoria_nombre === selectedCategoria.nombre).length})
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Código</th>
                        <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Nombre</th>
                        <th className="text-left py-2 px-4 text-xs font-medium text-gray-600">Depósito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockUbicaciones.filter(u => u.categoria_nombre === selectedCategoria.nombre).map(ub => {
                        const dep = mockDepositos.find(d => d.id === ub.deposito_id)
                        return (
                          <tr key={ub.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-4 text-sm text-blue-600">{ub.codigo}</td>
                            <td className="py-2 px-4 text-sm text-gray-900">{ub.nombre}</td>
                            <td className="py-2 px-4 text-sm text-gray-600">{dep?.nombre || "-"}</td>
                          </tr>
                        )
                      })}
                      {mockUbicaciones.filter(u => u.categoria_nombre === selectedCategoria.nombre).length === 0 && (
                        <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-500">No hay ubicaciones con esta categoría</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Formulario de crear categoría
    if (creandoCategoria) {
      return (
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <button onClick={() => setCreandoCategoria(false)} className="hover:text-amber-700">Categorías de Ubicación</button>
            <span>/</span>
            <span className="font-medium text-gray-900">Nueva Categoría</span>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nueva Categoría</h2>
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Código *</label>
                <input type="text" placeholder="Ej: STOCK, TRANS" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Nombre *</label>
                <input type="text" placeholder="Nombre de la categoría" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-32 text-sm text-gray-600">Descripción</label>
                <textarea placeholder="Descripción opcional" rows={3} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setCreandoCategoria(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                Cancelar
              </button>
              <button onClick={() => setCreandoCategoria(false)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Lista de categorías
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Categorías de Ubicación</h1>
          <button 
            onClick={() => setCreandoCategoria(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>
        
        {/* Buscador */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={busquedaCategoria}
              onChange={(e) => setBusquedaCategoria(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Tabla de categorías */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Ubicaciones</th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.map(cat => (
                <tr 
                  key={cat.id} 
                  onClick={() => setSelectedCategoria(cat)}
                  className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer"
                >
                  <td className="py-3 px-4 text-sm font-medium text-blue-600">{cat.codigo}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{cat.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{cat.descripcion || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {mockUbicaciones.filter(u => u.categoria_nombre === cat.nombre).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Configuración - Tipos de Operación
  const renderConfigTiposOperacion = () => {
    const tiposOperacion = [
      { id: 1, nombre: "Recepción", codigo: "IN", descripcion: "Entrada de mercadería", secuencia: "STK/IN/" },
      { id: 2, nombre: "Entrega", codigo: "OUT", descripcion: "Salida de mercadería", secuencia: "STK/OUT/" },
      { id: 3, nombre: "Transferencia Interna", codigo: "INT", descripcion: "Movimiento entre ubicaciones", secuencia: "STK/INT/" },
      { id: 4, nombre: "Ajuste de Inventario", codigo: "ADJ", descripcion: "Ajustes por diferencias", secuencia: "STK/ADJ/" },
      { id: 5, nombre: "Scrap", codigo: "SCRAP", descripcion: "Baja de productos", secuencia: "STK/SCRAP/" },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Operación</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Descripción</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Secuencia</th>
              </tr>
            </thead>
            <tbody>
              {tiposOperacion.map(tipo => (
                <tr key={tipo.id} className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer">
                  <td className="py-3 px-4 text-sm font-medium text-blue-600">{tipo.codigo}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{tipo.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{tipo.descripcion}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-mono">{tipo.secuencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Configuración - Posiciones de Ubicaciones
  const renderConfigPosiciones = () => {
    const posiciones = [
      { id: 1, codigo: "A1", nombre: "Estante A - Nivel 1", ubicacion: "CC/Stock/Estantería-A", capacidad: 100 },
      { id: 2, codigo: "A2", nombre: "Estante A - Nivel 2", ubicacion: "CC/Stock/Estantería-A", capacidad: 100 },
      { id: 3, codigo: "B1", nombre: "Estante B - Nivel 1", ubicacion: "CC/Stock/Estantería-B", capacidad: 150 },
      { id: 4, codigo: "B2", nombre: "Estante B - Nivel 2", ubicacion: "CC/Stock/Estantería-B", capacidad: 150 },
      { id: 5, codigo: "PISO-1", nombre: "Piso Zona 1", ubicacion: "CC/Stock/Piso", capacidad: 500 },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Posiciones de Ubicaciones</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Código</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Capacidad</th>
              </tr>
            </thead>
            <tbody>
              {posiciones.map(pos => (
                <tr key={pos.id} className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer">
                  <td className="py-3 px-4 text-sm font-medium text-blue-600">{pos.codigo}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{pos.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{pos.ubicacion}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{pos.capacidad} uds</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Configuración - Rutas
  const renderConfigRutas = () => {
    const rutas = [
      { id: 1, nombre: "Recepción → Stock", activa: true, secuencia: 10 },
      { id: 2, nombre: "Stock → Clientes", activa: true, secuencia: 20 },
      { id: 3, nombre: "Stock → Producción", activa: true, secuencia: 30 },
      { id: 4, nombre: "Proveedor → Calidad → Stock", activa: false, secuencia: 40 },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rutas</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Secuencia</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Activa</th>
              </tr>
            </thead>
            <tbody>
              {rutas.map(ruta => (
                <tr key={ruta.id} className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer">
                  <td className="py-3 px-4 text-sm font-medium text-blue-600">{ruta.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{ruta.secuencia}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${ruta.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {ruta.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Configuración - Reglas
  const renderConfigReglas = () => {
    const reglas = [
      { id: 1, nombre: "Comprar", accion: "Comprar", ruta: "Recepción → Stock", activa: true },
      { id: 2, nombre: "Entregar en 1 paso", accion: "Pull", ruta: "Stock → Clientes", activa: true },
      { id: 3, nombre: "Reabastecer desde Stock", accion: "Pull", ruta: "Stock → Producción", activa: true },
      { id: 4, nombre: "Fabricar", accion: "Fabricar", ruta: "Producción", activa: true },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reglas</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <Plus className="w-4 h-4" />
            Crear
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Nombre</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Acción</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Ruta</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 uppercase">Activa</th>
              </tr>
            </thead>
            <tbody>
              {reglas.map(regla => (
                <tr key={regla.id} className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer">
                  <td className="py-3 px-4 text-sm font-medium text-blue-600">{regla.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{regla.accion}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{regla.ruta}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${regla.activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {regla.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render Cubo de Stock
  const renderCuboStock = () => {
    const dimensionesDisponibles = [
      { id: "producto", nombre: "Producto" },
      { id: "categoria", nombre: "Categoría" },
      { id: "marca", nombre: "Marca" },
      { id: "deposito", nombre: "Depósito" },
      { id: "ubicacion", nombre: "Ubicación" },
      { id: "tracking", nombre: "Tracking" },
      { id: "estado_lote", nombre: "Estado Lote" },
    ]
    
    const medidasDisponibles = [
      { id: "cantidad", nombre: "Cantidad" },
      { id: "costo", nombre: "Costo" },
      { id: "valor_total", nombre: "Valor Total" },
      { id: "stock_minimo", nombre: "Stock Mínimo" },
      { id: "stock_maximo", nombre: "Stock Máximo" },
    ]

    const toggleDimension = (lista: string[], setLista: (v: string[]) => void, dim: string) => {
      if (lista.includes(dim)) {
        if (lista.length > 1) setLista(lista.filter(d => d !== dim))
      } else {
        setLista([...lista, dim])
      }
    }

    const formatNumber = (num: number) => num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formatCurrency = (num: number) => "$ " + num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Cubo de Stock
          </h1>
        </div>

        {/* Toolbar del cubo estilo Odoo */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
          {/* Header con toggle y botón exportar */}
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => setCuboCamposOcultos(!cuboCamposOcultos)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${cuboCamposOcultos ? "" : "rotate-90"}`} />
              {cuboCamposOcultos ? "Mostrar campos" : "Ocultar campos"}
            </button>
            <button className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded flex items-center gap-1 hover:bg-amber-700">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>

          {/* Contenido colapsable */}
          {!cuboCamposOcultos && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {/* Fila 1: Pool de Campos disponibles */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase w-16">Campos</span>
                {dimensionesDisponibles
                  .filter(dim => !cuboDimensionFilas.includes(dim.id) && !cuboDimensionColumnas.includes(dim.id))
                  .map(dim => (
                    <span 
                      key={dim.id}
                      draggable
                      onDragStart={() => setCuboDragItem({ tipo: "pool", idx: -1, dimId: dim.id } as any)}
                      onDragEnd={() => { setCuboDragItem(null); setCuboDragOverIdx(null) }}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded flex items-center gap-1 cursor-grab active:cursor-grabbing select-none hover:bg-gray-200 transition-all"
                    >
                      <GripVertical className="w-3 h-3 text-gray-400" />
                      {dim.nombre}
                    </span>
                  ))}
                {dimensionesDisponibles.filter(dim => !cuboDimensionFilas.includes(dim.id) && !cuboDimensionColumnas.includes(dim.id)).length === 0 && (
                  <span className="text-xs text-gray-400 italic">Todos los campos asignados</span>
                )}
              </div>

              {/* Fila 2: Filas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-amber-600 uppercase w-16">Filas</span>
                <div 
                  className={`flex flex-wrap items-center gap-2 min-h-[32px] flex-1 px-2 py-1 rounded border-2 border-dashed transition-all ${
                    (cuboDragItem as any)?.tipo === "pool" || cuboDragItem?.tipo === "columnas" 
                      ? "border-amber-300 bg-amber-50" 
                      : "border-transparent"
                  }`}
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={() => {
                    const item = cuboDragItem as any
                    if (item?.tipo === "pool" && item.dimId) {
                      setCuboDimensionFilas([...cuboDimensionFilas, item.dimId])
                    } else if (item?.tipo === "columnas") {
                      const dimId = cuboDimensionColumnas[item.idx]
                      setCuboDimensionColumnas(cuboDimensionColumnas.filter((_, i) => i !== item.idx))
                      setCuboDimensionFilas([...cuboDimensionFilas, dimId])
                    }
                    setCuboDragItem(null)
                    setCuboDragOverIdx(null)
                  }}
                >
                  {cuboDimensionFilas.map((dim, idx) => (
                    <span 
                      key={dim} 
                      draggable
                      onDragStart={() => setCuboDragItem({ tipo: "filas", idx })}
                      onDragEnd={() => { setCuboDragItem(null); setCuboDragOverIdx(null) }}
                      onDragOver={(e) => { e.preventDefault(); if (cuboDragItem?.tipo === "filas") setCuboDragOverIdx(idx) }}
                      onDrop={(e) => {
                        e.stopPropagation()
                        if (cuboDragItem?.tipo === "filas" && cuboDragItem.idx !== idx) {
                          const newArr = [...cuboDimensionFilas]
                          const [removed] = newArr.splice(cuboDragItem.idx, 1)
                          newArr.splice(idx, 0, removed)
                          setCuboDimensionFilas(newArr)
                        }
                        setCuboDragItem(null)
                        setCuboDragOverIdx(null)
                      }}
                      className={`px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded flex items-center gap-1 cursor-grab active:cursor-grabbing select-none transition-all ${
                        cuboDragItem?.tipo === "filas" && cuboDragOverIdx === idx ? "ring-2 ring-amber-400 ring-offset-1" : ""
                      } ${cuboDragItem?.tipo === "filas" && cuboDragItem.idx === idx ? "opacity-50" : ""}`}
                    >
                      <GripVertical className="w-3 h-3 text-amber-400" />
                      {dimensionesDisponibles.find(d => d.id === dim)?.nombre}
                      <button onClick={() => setCuboDimensionFilas(cuboDimensionFilas.filter(d => d !== dim))} className="hover:text-amber-900 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {cuboDimensionFilas.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Arrastra campos aquí</span>
                  )}
                </div>
              </div>

              {/* Fila 3: Columnas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 uppercase w-16">Columnas</span>
                <div 
                  className={`flex flex-wrap items-center gap-2 min-h-[32px] flex-1 px-2 py-1 rounded border-2 border-dashed transition-all ${
                    (cuboDragItem as any)?.tipo === "pool" || cuboDragItem?.tipo === "filas" 
                      ? "border-blue-300 bg-blue-50" 
                      : "border-transparent"
                  }`}
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={() => {
                    const item = cuboDragItem as any
                    if (item?.tipo === "pool" && item.dimId) {
                      setCuboDimensionColumnas([...cuboDimensionColumnas, item.dimId])
                    } else if (item?.tipo === "filas") {
                      const dimId = cuboDimensionFilas[item.idx]
                      setCuboDimensionFilas(cuboDimensionFilas.filter((_, i) => i !== item.idx))
                      setCuboDimensionColumnas([...cuboDimensionColumnas, dimId])
                    }
                    setCuboDragItem(null)
                    setCuboDragOverIdx(null)
                  }}
                >
                  {cuboDimensionColumnas.map((dim, idx) => (
                    <span 
                      key={dim} 
                      draggable
                      onDragStart={() => setCuboDragItem({ tipo: "columnas", idx })}
                      onDragEnd={() => { setCuboDragItem(null); setCuboDragOverIdx(null) }}
                      onDragOver={(e) => { e.preventDefault(); if (cuboDragItem?.tipo === "columnas") setCuboDragOverIdx(idx) }}
                      onDrop={(e) => {
                        e.stopPropagation()
                        if (cuboDragItem?.tipo === "columnas" && cuboDragItem.idx !== idx) {
                          const newArr = [...cuboDimensionColumnas]
                          const [removed] = newArr.splice(cuboDragItem.idx, 1)
                          newArr.splice(idx, 0, removed)
                          setCuboDimensionColumnas(newArr)
                        }
                        setCuboDragItem(null)
                        setCuboDragOverIdx(null)
                      }}
                      className={`px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1 cursor-grab active:cursor-grabbing select-none transition-all ${
                        cuboDragItem?.tipo === "columnas" && cuboDragOverIdx === idx ? "ring-2 ring-blue-400 ring-offset-1" : ""
                      } ${cuboDragItem?.tipo === "columnas" && cuboDragItem.idx === idx ? "opacity-50" : ""}`}
                    >
                      <GripVertical className="w-3 h-3 text-blue-400" />
                      {dimensionesDisponibles.find(d => d.id === dim)?.nombre}
                      <button onClick={() => setCuboDimensionColumnas(cuboDimensionColumnas.filter(d => d !== dim))} className="hover:text-blue-900 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {cuboDimensionColumnas.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Arrastra campos aquí</span>
                  )}
                </div>
              </div>

              {/* Fila 4: Medidas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-emerald-600 uppercase w-16">Medidas</span>
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  {medidasDisponibles.map(med => (
                    <button
                      key={med.id}
                      onClick={() => {
                        if (cuboMedidasSeleccionadas.includes(med.id)) {
                          if (cuboMedidasSeleccionadas.length > 1) {
                            setCuboMedidasSeleccionadas(cuboMedidasSeleccionadas.filter(m => m !== med.id))
                          }
                        } else {
                          setCuboMedidasSeleccionadas([...cuboMedidasSeleccionadas, med.id])
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded transition-all ${
                        cuboMedidasSeleccionadas.includes(med.id) 
                          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {med.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPIs compactos */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-3 border-amber-500">
            <span className="text-gray-500 uppercase text-xs">Productos:</span>
            <span className="font-bold text-gray-900 text-base">{productos.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-3 border-blue-500">
            <span className="text-gray-500 uppercase text-xs">Ubicaciones:</span>
            <span className="font-bold text-gray-900 text-base">{mockUbicaciones.filter(u => u.activa).length}</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-3 border-emerald-500">
            <span className="text-gray-500 uppercase text-xs">Unidades:</span>
            <span className="font-bold text-gray-900 text-base">{formatNumber(productos.reduce((sum, p) => sum + p.stock_real, 0))}</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border-l-3 border-violet-500">
            <span className="text-gray-500 uppercase text-xs">Valor Total:</span>
            <span className="font-bold text-gray-900 text-base">{formatCurrency(productos.reduce((sum, p) => sum + (p.stock_real * p.precio_costo), 0))}</span>
          </div>
        </div>

        {/* Tabla del Cubo con Plegado */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Encabezado de columnas */}
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                    {cuboDimensionFilas.map(d => dimensionesDisponibles.find(dim => dim.id === d)?.nombre).join(" / ")}
                  </th>
                  {cuboDatosAgrupados.columnas.map(col => (
                    <th key={col} colSpan={cuboMedidasSeleccionadas.length} className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200 bg-blue-50">
                      {col}
                    </th>
                  ))}
                  <th colSpan={cuboMedidasSeleccionadas.length} className="px-4 py-3 text-center font-semibold text-gray-900 border-b border-gray-200 bg-amber-50">
                    Total
                  </th>
                </tr>
                {/* Sub-encabezado de medidas */}
                {cuboMedidasSeleccionadas.length > 1 && (
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-10"></th>
                    {cuboDatosAgrupados.columnas.map(col => (
                      cuboMedidasSeleccionadas.map(med => (
                        <th key={`${col}-${med}`} className="px-3 py-2 text-right text-xs font-medium text-gray-500 border-b border-gray-200">
                          {medidasDisponibles.find(m => m.id === med)?.nombre}
                        </th>
                      ))
                    ))}
                    {cuboMedidasSeleccionadas.map(med => (
                      <th key={`total-${med}`} className="px-3 py-2 text-right text-xs font-medium text-amber-700 border-b border-gray-200 bg-amber-50">
                        {medidasDisponibles.find(m => m.id === med)?.nombre}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {(() => {
                  // Función recursiva para renderizar nodos del árbol
                  type NodoArbol = {
                    clave: string
                    nivel: number
                    valores: string[]
                    datos: Record<string, Record<string, number>>
                    hijos: NodoArbol[]
                    tieneHijos: boolean
                  }
                  
                  const renderNodo = (nodo: NodoArbol, idx: number): React.ReactNode[] => {
                    const estaExpandido = cuboFilasExpandidas.has(nodo.clave)
                    const toggleExpand = () => {
                      const nuevasExpandidas = new Set(cuboFilasExpandidas)
                      if (estaExpandido) {
                        nuevasExpandidas.delete(nodo.clave)
                      } else {
                        nuevasExpandidas.add(nodo.clave)
                      }
                      setCuboFilasExpandidas(nuevasExpandidas)
                    }

                    // Calcular totales de la fila
                    const totalesFila: Record<string, number> = {}
                    cuboMedidasSeleccionadas.forEach(med => {
                      totalesFila[med] = Object.values(nodo.datos).reduce((sum, col) => sum + (col[med] || 0), 0)
                    })

                    const filas: React.ReactNode[] = []
                    const bgColor = nodo.nivel === 0 ? "bg-amber-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    const fontWeight = nodo.nivel === 0 ? "font-semibold" : "font-normal"
                    
                    filas.push(
                      <tr key={nodo.clave} className={`${bgColor} hover:bg-amber-100/50 transition-colors`}>
                        <td className={`px-4 py-2 ${fontWeight} text-gray-900 border-r border-gray-100 sticky left-0 z-10 ${bgColor}`}>
                          <div className="flex items-center" style={{ paddingLeft: `${nodo.nivel * 20}px` }}>
                            {nodo.tieneHijos ? (
                              <button 
                                onClick={toggleExpand}
                                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-amber-600 mr-1"
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${estaExpandido ? "rotate-90" : ""}`} />
                              </button>
                            ) : (
                              <span className="w-5 h-5 mr-1" />
                            )}
                            <span className={nodo.nivel === 0 ? "text-amber-800" : ""}>{nodo.valores[nodo.valores.length - 1]}</span>
                          </div>
                        </td>
                        {cuboDatosAgrupados.columnas.map(col => (
                          cuboMedidasSeleccionadas.map(med => (
                            <td key={`${nodo.clave}-${col}-${med}`} className="px-3 py-2 text-right text-gray-700">
                              {nodo.datos[col]?.[med] !== undefined && nodo.datos[col][med] !== 0
                                ? (med === "costo" || med === "valor_total" 
                                    ? formatCurrency(nodo.datos[col][med]) 
                                    : formatNumber(nodo.datos[col][med]))
                                : "-"
                              }
                            </td>
                          ))
                        ))}
                        {cuboMedidasSeleccionadas.map(med => (
                          <td key={`${nodo.clave}-total-${med}`} className={`px-3 py-2 text-right ${fontWeight} text-amber-700 bg-amber-50`}>
                            {totalesFila[med] !== 0
                              ? (med === "costo" || med === "valor_total" 
                                  ? formatCurrency(totalesFila[med]) 
                                  : formatNumber(totalesFila[med]))
                              : "-"
                            }
                          </td>
                        ))}
                      </tr>
                    )

                    // Renderizar hijos si está expandido
                    if (estaExpandido && nodo.hijos.length > 0) {
                      nodo.hijos.forEach((hijo, hijoIdx) => {
                        filas.push(...renderNodo(hijo, hijoIdx))
                      })
                    }

                    return filas
                  }

                  return cuboDatosAgrupados.arbol.map((nodo, idx) => renderNodo(nodo, idx))
                })()}
                
                {/* Fila de totales */}
                <tr className="bg-amber-100 font-semibold border-t-2 border-amber-300">
                  <td className="px-4 py-3 text-gray-900 border-r border-amber-200 sticky left-0 bg-amber-100 z-10">
                    Total General
                  </td>
                  {cuboDatosAgrupados.columnas.map(col => (
                    cuboMedidasSeleccionadas.map(med => {
                      let totalColumna = 0
                      const sumarNodo = (nodo: { datos: Record<string, Record<string, number>>; hijos: typeof cuboDatosAgrupados.arbol }) => {
                        if (nodo.hijos.length === 0) {
                          totalColumna += nodo.datos[col]?.[med] || 0
                        } else {
                          nodo.hijos.forEach(sumarNodo)
                        }
                      }
                      cuboDatosAgrupados.arbol.forEach(sumarNodo)
                      return (
                        <td key={`total-col-${col}-${med}`} className="px-3 py-3 text-right text-gray-900">
                          {totalColumna !== 0
                            ? (med === "costo" || med === "valor_total" 
                                ? formatCurrency(totalColumna) 
                                : formatNumber(totalColumna))
                            : "-"
                          }
                        </td>
                      )
                    })
                  ))}
                  {cuboMedidasSeleccionadas.map(med => {
                    let totalGeneral = 0
                    const sumarNodo = (nodo: { datos: Record<string, Record<string, number>>; hijos: typeof cuboDatosAgrupados.arbol }) => {
                      if (nodo.hijos.length === 0) {
                        totalGeneral += Object.values(nodo.datos).reduce((s, col) => s + (col[med] || 0), 0)
                      } else {
                        nodo.hijos.forEach(sumarNodo)
                      }
                    }
                    cuboDatosAgrupados.arbol.forEach(sumarNodo)
                    return (
                      <td key={`total-general-${med}`} className="px-3 py-3 text-right text-amber-900 bg-amber-200">
                        {totalGeneral !== 0
                          ? (med === "costo" || med === "valor_total" 
                              ? formatCurrency(totalGeneral) 
                              : formatNumber(totalGeneral))
                          : "-"
                        }
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        
      </div>
    )
  }

  // Render principal del contenido
  const renderContent = () => {
    switch (activeView) {
      case "productos":
        return renderProductos()
      case "transferencias":
        return renderTransferencias()
      case "pedidos_abastecimiento":
        return renderPedidosAbastecimiento()
      case "lotes_series":
        return renderLotesSeries()
      case "lotes_stock":
        return renderLotesStock()
      case "control_inventario":
        return renderControlInventario()
      case "ajustes_positivos":
        return renderAjustes("positivo")
      case "ajustes_negativos":
        return renderAjustes("negativo")
      case "config_depositos":
        return renderConfigDepositos()
      case "config_ubicaciones":
        return renderConfigUbicaciones()
      case "config_categorias":
        return renderConfigCategorias()
      case "config_tipos_operacion":
        return renderConfigTiposOperacion()
      case "config_posiciones":
        return renderConfigPosiciones()
      case "config_rutas":
        return renderConfigRutas()
      case "config_reglas":
        return renderConfigReglas()
      case "cubo_stock":
        return renderCuboStock()
      default:
        return renderProductos()
    }
  }

  return (
    <div className="flex h-[calc(100vh-44px)]">
      {renderSidebar()}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
