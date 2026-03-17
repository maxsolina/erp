"use client"

import React, { useState } from "react"
import { Search, Filter, ChevronDown, ChevronRight, X, Plus, FileText, Truck, Receipt, CreditCard, Users, DollarSign, Package, ArrowRight, Eye, Edit, Trash2, Download, Mail, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Phone, Globe, Calendar, Tag, Percent, Star, TrendingUp, RefreshCw, User, Warehouse, Save, MessageSquare, Settings, Lock, Unlock, FileBox, Ship, Plane } from "lucide-react"
import BotonVolver from "./ui/boton-volver"

// Types
interface Proveedor {
  id: number
  codigo: string
  nombre: string
  razon_social: string
  cuit: string
  tipo_documento: string
  numero_documento: string
  direccion: string
  ciudad: string
  provincia: string
  codigo_postal: string
  telefono: string
  email: string
  web: string
  contacto_nombre: string
  contacto_telefono: string
  contacto_email: string
  condicion_pago: string
  moneda_habitual: "ARS" | "USD"
  categoria: "publico" | "privado"
  tipo: "nacional" | "internacional" | "despachante"
  saldo: number
  activo: boolean
}

interface OrdenCompra {
  id: number
  numero: string
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "confirmada" | "recibida_parcial" | "recibida" | "cancelada"
  tipo_compra: "nacional" | "importacion"
  fecha_entrega_estimada: string
  moneda: "ARS" | "USD"
  tipo_cambio: number
  subtotal: number
  impuestos: number
  total: number
  observaciones: string
  legajo_id?: number
  despacho_simple_id?: number
  lineas: {
    producto_id: number
    producto_nombre: string
    cantidad: number
    cantidad_recibida: number
    precio_unitario: number
    descuento: number
    subtotal: number
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface Recepcion {
  id: number
  numero: string
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  orden_compra_id: number
  orden_compra_numero: string
  estado: "borrador" | "confirmada" | "cancelada"
  tipo: "total" | "parcial"
  observaciones: string
  legajo_id?: number
  despacho_simple_id?: number
  lineas: {
    producto_id: number
    producto_nombre: string
    cantidad_ordenada: number
    cantidad_recibida: number
    cantidad_esta_recepcion: number
    precio_unitario: number
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface FacturaCompra {
  id: number
  numero: string
  tipo: "A" | "B" | "C" | "E"
  fecha: string
  fecha_vencimiento: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "pendiente" | "pagada_parcial" | "pagada" | "cancelada"
  orden_compra_id?: number
  recepcion_id?: number
  moneda: "ARS" | "USD"
  tipo_cambio: number
  subtotal: number
  impuestos: number
  total: number
  saldo: number
  legajo_id?: number
  despacho_simple_id?: number
  lineas: {
    producto_id?: number
    producto_nombre: string
    cantidad: number
    precio_unitario: number
    subtotal: number
    cuenta_contable?: string
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface NotaCreditoCompra {
  id: number
  numero: string
  tipo: "A" | "B" | "C"
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  factura_id?: number
  factura_numero?: string
  estado: "borrador" | "confirmada" | "aplicada" | "cancelada"
  motivo: string
  moneda: "ARS" | "USD"
  subtotal: number
  impuestos: number
  total: number
  legajo_id?: number
  lineas: {
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
}

interface NotaDebitoCompra {
  id: number
  numero: string
  tipo: "A" | "B" | "C"
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  factura_id?: number
  factura_numero?: string
  estado: "borrador" | "confirmada" | "pagada" | "cancelada"
  motivo: string
  moneda: "ARS" | "USD"
  subtotal: number
  impuestos: number
  total: number
  legajo_id?: number
  lineas: {
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
}

interface OrdenPago {
  id: number
  numero: string
  fecha: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "confirmada" | "cancelada"
  moneda: "ARS" | "USD"
  tipo_cambio: number
  total: number
  facturas_aplicadas: {
    factura_id: number
    factura_numero: string
    importe_aplicado: number
  }[]
  pagos: {
    forma_pago: string
    importe: number
    referencia?: string
  }[]
  seguimiento?: SeguimientoEntry[]
}

interface LegajoImportacion {
  id: number
  numero: string
  nombre: string
  responsable: string
  despachante_id?: number
  despachante_nombre?: string
  fecha_apertura: string
  estado: "borrador" | "abierto" | "finalizado"
  subcompania: string
  sucursal: string
  tc_referencia: number
  total_compras: number
  total_gastos: number
  ordenes_compra_ids: number[]
  recepciones_ids: number[]
  facturas_ids: number[]
  notas_credito_ids: number[]
  notas_debito_ids: number[]
  gastos: GastoImportacion[]
  observaciones: string
}

interface GastoImportacion {
  id: number
  tipo_gasto_id: number
  tipo_gasto_nombre: string
  proveedor_id?: number
  proveedor_nombre?: string
  comprobante_numero?: string
  importe: number
  moneda: "ARS" | "USD" | "EUR"
  tipo_cambio_tipo: "dia_factura" | "dia_dji" | "manual"
  tipo_cambio: number
  importe_base: number
  clasificacion: "activable" | "resultado"
  criterio_distribucion: "fob" | "peso" | "cantidad" | "posicion_arancelaria" | "manual"
  estado: "pendiente" | "distribuido"
}

interface DespachoSimple {
  id: number
  numero: string
  nombre: string
  proveedor_id: number
  proveedor_nombre: string
  responsable: string
  fecha: string
  estado: "borrador" | "abierto" | "finalizado"
  subcompania: string
  sucursal: string
  total_mercaderia: number
  total_fletes: number
  flete_internacional: {
    importe: number
    moneda: "ARS" | "USD"
    tipo_cambio: number
    importe_base: number
  }
  flete_nacional: {
    importe: number
    moneda: "ARS" | "USD"
    tipo_cambio: number
    importe_base: number
  }
  productos: {
    producto_id: number
    producto_nombre: string
    cantidad: number
    peso_unitario: number
    peso_total: number
    precio_fob_unitario: number
    total_fob: number
    flete_int_asignado?: number
    flete_nac_asignado?: number
    costo_landing_unitario?: number
  }[]
  ordenes_compra_ids: number[]
  recepciones_ids: number[]
  facturas_ids: number[]
}

interface TipoGasto {
  id: number
  nombre: string
  clasificacion_defecto: "activable" | "resultado"
  cuenta_debe: string
  cuenta_haber: string
  criterio_sugerido: "fob" | "peso" | "cantidad" | "posicion_arancelaria" | "manual"
  moneda_habitual: "ARS" | "USD" | "EUR"
  tc_defecto: "dia_factura" | "dia_dji" | "manual"
}

interface SeguimientoEntry {
  fecha: string
  usuario: string
  accion: string
  detalle?: string
}

interface MovimientoCtaCteProveedor {
  id: number
  proveedor_id: number
  tipo: "factura" | "nota_credito" | "nota_debito" | "pago" | "ajuste"
  numero: string
  fecha: string
  concepto: string
  debe: number
  haber: number
  saldo: number
}

export default function ModuloCompras() {
  // Active view state
  const [activeView, setActiveView] = useState("proveedores")
  const [expandedSections, setExpandedSections] = useState<string[]>(["proveedores", "compras", "comprobantes", "pagos", "configuracion"])

  // Proveedores
  const [proveedores, setProveedores] = useState<Proveedor[]>([
    {
      id: 1,
      codigo: "PROV-001",
      nombre: "Tech Supplies SA",
      razon_social: "Tech Supplies SA",
      cuit: "30-12345678-9",
      tipo_documento: "CUIT",
      numero_documento: "30-12345678-9",
      direccion: "Av. Corrientes 1234",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      codigo_postal: "1043",
      telefono: "011-4555-1234",
      email: "compras@techsupplies.com",
      web: "www.techsupplies.com",
      contacto_nombre: "Juan Pérez",
      contacto_telefono: "011-4555-1235",
      contacto_email: "jperez@techsupplies.com",
      condicion_pago: "30 días",
      moneda_habitual: "ARS",
      categoria: "publico",
      tipo: "nacional",
      saldo: 150000,
      activo: true
    },
    {
      id: 2,
      codigo: "PROV-002",
      nombre: "Mobile World Inc",
      razon_social: "Mobile World Inc",
      cuit: "30-98765432-1",
      tipo_documento: "Tax ID",
      numero_documento: "US-12345678",
      direccion: "123 Tech Street",
      ciudad: "Miami",
      provincia: "Florida",
      codigo_postal: "33101",
      telefono: "+1-305-555-1234",
      email: "sales@mobileworld.com",
      web: "www.mobileworld.com",
      contacto_nombre: "John Smith",
      contacto_telefono: "+1-305-555-1235",
      contacto_email: "jsmith@mobileworld.com",
      condicion_pago: "Anticipado",
      moneda_habitual: "USD",
      categoria: "publico",
      tipo: "internacional",
      saldo: 0,
      activo: true
    },
    {
      id: 3,
      codigo: "PROV-003",
      nombre: "Despachante García",
      razon_social: "García y Asociados SRL",
      cuit: "30-55555555-5",
      tipo_documento: "CUIT",
      numero_documento: "30-55555555-5",
      direccion: "Puerto Madero 456",
      ciudad: "Buenos Aires",
      provincia: "Buenos Aires",
      codigo_postal: "1107",
      telefono: "011-4312-5678",
      email: "contacto@despachanteg.com",
      web: "www.despachanteg.com",
      contacto_nombre: "María García",
      contacto_telefono: "011-4312-5679",
      contacto_email: "mgarcia@despachanteg.com",
      condicion_pago: "Contado",
      moneda_habitual: "ARS",
      categoria: "publico",
      tipo: "despachante",
      saldo: 25000,
      activo: true
    }
  ])
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [editandoProveedor, setEditandoProveedor] = useState(false)
  const [proveedorSearchText, setProveedorSearchText] = useState("")
  const [proveedorFiltroCategoria, setProveedorFiltroCategoria] = useState<"todos" | "publico" | "privado">("todos")
  const [proveedorFiltroTipo, setProveedorFiltroTipo] = useState<"todos" | "nacional" | "internacional" | "despachante">("todos")

  // Órdenes de Compra
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([
    {
      id: 1,
      numero: "OC-00001",
      fecha: "2026-03-10T10:00:00",
      proveedor_id: 1,
      proveedor_nombre: "Tech Supplies SA",
      estado: "confirmada",
      tipo_compra: "nacional",
      fecha_entrega_estimada: "2026-03-15",
      moneda: "ARS",
      tipo_cambio: 1,
      subtotal: 500000,
      impuestos: 105000,
      total: 605000,
      observaciones: "Urgente",
      lineas: [
        { producto_id: 1, producto_nombre: "Pantalla iPhone 13", cantidad: 10, cantidad_recibida: 0, precio_unitario: 50000, descuento: 0, subtotal: 500000 }
      ]
    },
    {
      id: 2,
      numero: "OC-00002",
      fecha: "2026-03-08T14:30:00",
      proveedor_id: 2,
      proveedor_nombre: "Mobile World Inc",
      estado: "confirmada",
      tipo_compra: "importacion",
      fecha_entrega_estimada: "2026-03-25",
      moneda: "USD",
      tipo_cambio: 1050,
      subtotal: 5000,
      impuestos: 0,
      total: 5000,
      observaciones: "Importación USA",
      legajo_id: 1,
      lineas: [
        { producto_id: 2, producto_nombre: "iPhone 14 Pro 128GB", cantidad: 10, cantidad_recibida: 0, precio_unitario: 500, descuento: 0, subtotal: 5000 }
      ]
    }
  ])
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null)
  const [creandoOC, setCreandoOC] = useState(false)

  // Recepciones
  const [recepciones, setRecepciones] = useState<Recepcion[]>([
    {
      id: 1,
      numero: "REC-00001",
      fecha: "2026-03-12T09:00:00",
      proveedor_id: 1,
      proveedor_nombre: "Tech Supplies SA",
      orden_compra_id: 1,
      orden_compra_numero: "OC-00001",
      estado: "confirmada",
      tipo: "total",
      observaciones: "",
      lineas: [
        { producto_id: 1, producto_nombre: "Pantalla iPhone 13", cantidad_ordenada: 10, cantidad_recibida: 10, cantidad_esta_recepcion: 10, precio_unitario: 50000 }
      ]
    }
  ])
  const [selectedRecepcion, setSelectedRecepcion] = useState<Recepcion | null>(null)
  const [creandoRecepcion, setCreandoRecepcion] = useState(false)

  // Facturas de Compra
  const [facturasCompra, setFacturasCompra] = useState<FacturaCompra[]>([
    {
      id: 1,
      numero: "FC-A-00001",
      tipo: "A",
      fecha: "2026-03-12T10:00:00",
      fecha_vencimiento: "2026-04-12",
      proveedor_id: 1,
      proveedor_nombre: "Tech Supplies SA",
      estado: "pendiente",
      orden_compra_id: 1,
      recepcion_id: 1,
      moneda: "ARS",
      tipo_cambio: 1,
      subtotal: 500000,
      impuestos: 105000,
      total: 605000,
      saldo: 605000,
      lineas: [
        { producto_id: 1, producto_nombre: "Pantalla iPhone 13", cantidad: 10, precio_unitario: 50000, subtotal: 500000 }
      ]
    }
  ])
  const [selectedFacturaCompra, setSelectedFacturaCompra] = useState<FacturaCompra | null>(null)
  const [creandoFacturaCompra, setCreandoFacturaCompra] = useState(false)

  // Notas de Crédito de Compra
  const [notasCreditoCompra, setNotasCreditoCompra] = useState<NotaCreditoCompra[]>([])
  const [selectedNCCompra, setSelectedNCCompra] = useState<NotaCreditoCompra | null>(null)
  const [creandoNCCompra, setCreandoNCCompra] = useState(false)

  // Notas de Débito de Compra
  const [notasDebitoCompra, setNotasDebitoCompra] = useState<NotaDebitoCompra[]>([])
  const [selectedNDCompra, setSelectedNDCompra] = useState<NotaDebitoCompra | null>(null)
  const [creandoNDCompra, setCreandoNDCompra] = useState(false)

  // Órdenes de Pago
  const [ordenesPago, setOrdenesPago] = useState<OrdenPago[]>([])
  const [selectedOP, setSelectedOP] = useState<OrdenPago | null>(null)
  const [creandoOP, setCreandoOP] = useState(false)

  // Legajos de Importación
  const [legajosImportacion, setLegajosImportacion] = useState<LegajoImportacion[]>([
    {
      id: 1,
      numero: "LEG-2026-001",
      nombre: "Importación iPhone USA Marzo",
      responsable: "Admin",
      despachante_id: 3,
      despachante_nombre: "Despachante García",
      fecha_apertura: "2026-03-01",
      estado: "abierto",
      subcompania: "Cell Home",
      sucursal: "Puerto Norte",
      tc_referencia: 1050,
      total_compras: 5250000,
      total_gastos: 525000,
      ordenes_compra_ids: [2],
      recepciones_ids: [],
      facturas_ids: [],
      notas_credito_ids: [],
      notas_debito_ids: [],
      gastos: [
        {
          id: 1,
          tipo_gasto_id: 1,
          tipo_gasto_nombre: "Flete Internacional",
          proveedor_id: 2,
          proveedor_nombre: "Mobile World Inc",
          importe: 300,
          moneda: "USD",
          tipo_cambio_tipo: "dia_factura",
          tipo_cambio: 1050,
          importe_base: 315000,
          clasificacion: "activable",
          criterio_distribucion: "peso",
          estado: "pendiente"
        },
        {
          id: 2,
          tipo_gasto_id: 2,
          tipo_gasto_nombre: "Gastos de Despachante",
          proveedor_id: 3,
          proveedor_nombre: "Despachante García",
          importe: 200000,
          moneda: "ARS",
          tipo_cambio_tipo: "dia_factura",
          tipo_cambio: 1,
          importe_base: 200000,
          clasificacion: "activable",
          criterio_distribucion: "fob",
          estado: "pendiente"
        }
      ],
      observaciones: "Importación de equipos nuevos para stock"
    }
  ])
  const [selectedLegajo, setSelectedLegajo] = useState<LegajoImportacion | null>(null)
  const [creandoLegajo, setCreandoLegajo] = useState(false)
  const [legajoTab, setLegajoTab] = useState<"compras" | "gastos" | "distribucion" | "observaciones">("compras")

  // Despachos Simples
  const [despachosSimples, setDespachosSimples] = useState<DespachoSimple[]>([
    {
      id: 1,
      numero: "DS-2026-001",
      nombre: "Despacho USA Telefonía",
      proveedor_id: 2,
      proveedor_nombre: "Mobile World Inc",
      responsable: "Admin",
      fecha: "2026-03-05",
      estado: "abierto",
      subcompania: "Cell Home",
      sucursal: "Puerto Norte",
      total_mercaderia: 2500000,
      total_fletes: 157500,
      flete_internacional: {
        importe: 100,
        moneda: "USD",
        tipo_cambio: 1050,
        importe_base: 105000
      },
      flete_nacional: {
        importe: 50000,
        moneda: "ARS",
        tipo_cambio: 1,
        importe_base: 50000
      },
      productos: [
        { producto_id: 3, producto_nombre: "iPhone 13 128GB", cantidad: 5, peso_unitario: 0.2, peso_total: 1, precio_fob_unitario: 400, total_fob: 2000 },
        { producto_id: 4, producto_nombre: "iPhone 13 Pro 128GB", cantidad: 3, peso_unitario: 0.21, peso_total: 0.63, precio_fob_unitario: 500, total_fob: 1500 }
      ],
      ordenes_compra_ids: [],
      recepciones_ids: [],
      facturas_ids: []
    }
  ])
  const [selectedDespachoSimple, setSelectedDespachoSimple] = useState<DespachoSimple | null>(null)
  const [creandoDespachoSimple, setCreandoDespachoSimple] = useState(false)

  // Tipos de Gasto (Configuración)
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([
    { id: 1, nombre: "Flete Internacional", clasificacion_defecto: "activable", cuenta_debe: "1.1.3.01", cuenta_haber: "2.1.1.01", criterio_sugerido: "peso", moneda_habitual: "USD", tc_defecto: "dia_factura" },
    { id: 2, nombre: "Gastos de Despachante", clasificacion_defecto: "activable", cuenta_debe: "1.1.3.01", cuenta_haber: "2.1.1.01", criterio_sugerido: "fob", moneda_habitual: "ARS", tc_defecto: "dia_factura" },
    { id: 3, nombre: "Seguro", clasificacion_defecto: "activable", cuenta_debe: "1.1.3.01", cuenta_haber: "2.1.1.01", criterio_sugerido: "fob", moneda_habitual: "USD", tc_defecto: "dia_factura" },
    { id: 4, nombre: "Derechos de Importación", clasificacion_defecto: "activable", cuenta_debe: "1.1.3.01", cuenta_haber: "2.1.1.01", criterio_sugerido: "posicion_arancelaria", moneda_habitual: "ARS", tc_defecto: "dia_dji" },
    { id: 5, nombre: "Tasa de Estadística", clasificacion_defecto: "activable", cuenta_debe: "1.1.3.01", cuenta_haber: "2.1.1.01", criterio_sugerido: "fob", moneda_habitual: "ARS", tc_defecto: "dia_dji" },
    { id: 6, nombre: "IVA Importación", clasificacion_defecto: "resultado", cuenta_debe: "1.1.5.01", cuenta_haber: "2.1.1.01", criterio_sugerido: "fob", moneda_habitual: "ARS", tc_defecto: "dia_dji" },
    { id: 7, nombre: "Percepciones IIBB", clasificacion_defecto: "resultado", cuenta_debe: "1.1.5.02", cuenta_haber: "2.1.1.01", criterio_sugerido: "fob", moneda_habitual: "ARS", tc_defecto: "dia_dji" },
    { id: 8, nombre: "Percepciones Ganancias", clasificacion_defecto: "resultado", cuenta_debe: "1.1.5.03", cuenta_haber: "2.1.1.01", criterio_sugerido: "fob", moneda_habitual: "ARS", tc_defecto: "dia_dji" },
  ])

  // Movimientos Cuenta Corriente Proveedores
  const [movimientosCtaCte, setMovimientosCtaCte] = useState<MovimientoCtaCteProveedor[]>([
    { id: 1, proveedor_id: 1, tipo: "factura", numero: "FC-A-00001", fecha: "2026-03-12", concepto: "Compra repuestos", debe: 605000, haber: 0, saldo: 605000 }
  ])

  // Helpers
  const formatCurrency = (amount: number, currency: "ARS" | "USD" = "ARS") => {
    if (currency === "USD") {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR')
  }

  // Menu structure
  const menuSections = [
    {
      id: "proveedores",
      label: "Proveedores",
      icon: Building2,
      items: [
        { id: "proveedores", label: "Proveedores", icon: Building2 },
        { id: "cta_cte_proveedores", label: "Cuenta Corriente", icon: CreditCard },
        { id: "historial_proveedores", label: "Historial", icon: Clock },
        { id: "conciliacion_deuda", label: "Conciliación de Deuda", icon: RefreshCw },
      ]
    },
    {
      id: "compras",
      label: "Compras",
      icon: Package,
      items: [
        { id: "ordenes_compra", label: "Órdenes de Compra", icon: FileText },
        { id: "recepciones", label: "Recepciones", icon: Truck },
      ]
    },
    {
      id: "comprobantes",
      label: "Comprobantes",
      icon: Receipt,
      items: [
        { id: "facturas_compra", label: "Facturas de Compra", icon: Receipt },
        { id: "nc_compra", label: "Notas de Crédito", icon: FileText },
        { id: "nd_compra", label: "Notas de Débito", icon: FileText },
        { id: "legajos_importacion", label: "Legajos de Importación", icon: Ship },
        { id: "despachos_simples", label: "Despachos Simples", icon: Plane },
      ]
    },
    {
      id: "pagos",
      label: "Pagos",
      icon: DollarSign,
      items: [
        { id: "ordenes_pago", label: "Órdenes de Pago", icon: DollarSign },
      ]
    },
    {
      id: "configuracion",
      label: "Configuración",
      icon: Settings,
      items: [
        { id: "tipos_gasto", label: "Tipos de Gasto", icon: Tag },
        { id: "componentes_evaluacion", label: "Componentes Evaluación", icon: CheckCircle },
        { id: "rangos_precio", label: "Rangos de Precio por Rol", icon: Percent },
      ]
    },
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Render Sidebar
  const renderSidebar = () => (
    <div className="p-3 space-y-1">
      {menuSections.map(section => (
        <div key={section.id}>
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <span className="flex items-center gap-2">
              <section.icon className="w-4 h-4" />
              {section.label}
            </span>
            {expandedSections.includes(section.id) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {expandedSections.includes(section.id) && (
            <div className="ml-4 mt-1 space-y-1">
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    activeView === item.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  // =====================================================
  // RENDER PROVEEDORES
  // =====================================================
  const renderProveedores = () => {
    const filteredProveedores = proveedores.filter(p => {
      const matchesSearch = p.nombre.toLowerCase().includes(proveedorSearchText.toLowerCase()) ||
                           p.codigo.toLowerCase().includes(proveedorSearchText.toLowerCase()) ||
                           p.cuit.includes(proveedorSearchText)
      const matchesCategoria = proveedorFiltroCategoria === "todos" || p.categoria === proveedorFiltroCategoria
      const matchesTipo = proveedorFiltroTipo === "todos" || p.tipo === proveedorFiltroTipo
      return matchesSearch && matchesCategoria && matchesTipo
    })

    if (selectedProveedor) return renderFichaProveedor()
    if (creandoProveedor) return renderCrearProveedor()

    return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
            <p className="text-gray-500 mt-1">Gestione sus proveedores nacionales e internacionales</p>
          </div>
          <button 
            onClick={() => setCreandoProveedor(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o CUIT..."
              value={proveedorSearchText}
              onChange={(e) => setProveedorSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={proveedorFiltroCategoria}
            onChange={(e) => setProveedorFiltroCategoria(e.target.value as "todos" | "publico" | "privado")}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todas las categorías</option>
            <option value="publico">Públicos</option>
            <option value="privado">Privados</option>
          </select>
          <select
            value={proveedorFiltroTipo}
            onChange={(e) => setProveedorFiltroTipo(e.target.value as "todos" | "nacional" | "internacional" | "despachante")}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los tipos</option>
            <option value="nacional">Nacional</option>
            <option value="internacional">Internacional</option>
            <option value="despachante">Despachante</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Proveedores</p>
            <p className="text-2xl font-bold text-gray-900">{proveedores.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Nacionales</p>
            <p className="text-2xl font-bold text-blue-600">{proveedores.filter(p => p.tipo === "nacional").length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Internacionales</p>
            <p className="text-2xl font-bold text-purple-600">{proveedores.filter(p => p.tipo === "internacional").length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Deuda Total</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(proveedores.reduce((s, p) => s + p.saldo, 0))}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Código</th>
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">CUIT</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-center py-3 px-4">Categoría</th>
                <th className="text-right py-3 px-4">Saldo</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map(proveedor => (
                <tr 
                  key={proveedor.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedProveedor(proveedor)}
                >
                  <td className="py-3 px-4 font-medium text-blue-700">{proveedor.codigo}</td>
                  <td className="py-3 px-4">{proveedor.nombre}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{proveedor.cuit}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      proveedor.tipo === 'nacional' ? 'bg-blue-100 text-blue-700' :
                      proveedor.tipo === 'internacional' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {proveedor.tipo.charAt(0).toUpperCase() + proveedor.tipo.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {proveedor.categoria === 'privado' ? (
                      <Lock className="w-4 h-4 text-red-500 mx-auto" />
                    ) : (
                      <Unlock className="w-4 h-4 text-green-500 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={proveedor.saldo > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {formatCurrency(proveedor.saldo)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      proveedor.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
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

  const renderFichaProveedor = () => {
    if (!selectedProveedor) return null

    const movimientos = movimientosCtaCte.filter(m => m.proveedor_id === selectedProveedor.id)

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setSelectedProveedor(null)} className="hover:text-blue-600">Proveedores</button>
          <span>/</span>
          <span className="text-gray-900">{selectedProveedor.codigo}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedProveedor(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedProveedor.nombre}</h1>
              <p className="text-sm text-gray-500">{selectedProveedor.codigo} | {selectedProveedor.cuit}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1">
              <Edit className="w-4 h-4" /> Editar
            </button>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              selectedProveedor.tipo === 'nacional' ? 'bg-blue-100 text-blue-700' :
              selectedProveedor.tipo === 'internacional' ? 'bg-purple-100 text-purple-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {selectedProveedor.tipo.charAt(0).toUpperCase() + selectedProveedor.tipo.slice(1)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Info principal */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Información General</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Razón Social:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.razon_social}</span>
                </div>
                <div>
                  <span className="text-gray-500">Documento:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.tipo_documento}: {selectedProveedor.numero_documento}</span>
                </div>
                <div>
                  <span className="text-gray-500">Dirección:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.direccion}</span>
                </div>
                <div>
                  <span className="text-gray-500">Ciudad:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.ciudad}, {selectedProveedor.provincia}</span>
                </div>
                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.telefono}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium text-blue-600">{selectedProveedor.email}</span>
                </div>
                <div>
                  <span className="text-gray-500">Web:</span>
                  <span className="ml-2 font-medium text-blue-600">{selectedProveedor.web}</span>
                </div>
                <div>
                  <span className="text-gray-500">Condición de Pago:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.condicion_pago}</span>
                </div>
                <div>
                  <span className="text-gray-500">Moneda Habitual:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.moneda_habitual}</span>
                </div>
                <div>
                  <span className="text-gray-500">Categoría:</span>
                  <span className={`ml-2 font-medium ${selectedProveedor.categoria === 'privado' ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedProveedor.categoria === 'privado' ? 'Privado' : 'Público'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contacto</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.contacto_nombre}</span>
                </div>
                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium">{selectedProveedor.contacto_telefono}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium text-blue-600">{selectedProveedor.contacto_email}</span>
                </div>
              </div>
            </div>

            {/* Últimos Movimientos */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Últimos Movimientos</h3>
                <button 
                  onClick={() => setActiveView("cta_cte_proveedores")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Ver cuenta corriente completa
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2">Fecha</th>
                    <th className="text-left py-2">Tipo</th>
                    <th className="text-left py-2">Número</th>
                    <th className="text-right py-2">Debe</th>
                    <th className="text-right py-2">Haber</th>
                    <th className="text-right py-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.slice(0, 5).map(mov => (
                    <tr key={mov.id} className="border-b">
                      <td className="py-2">{formatDate(mov.fecha)}</td>
                      <td className="py-2 capitalize">{mov.tipo.replace('_', ' ')}</td>
                      <td className="py-2 text-blue-600">{mov.numero}</td>
                      <td className="py-2 text-right">{mov.debe > 0 ? formatCurrency(mov.debe) : '-'}</td>
                      <td className="py-2 text-right">{mov.haber > 0 ? formatCurrency(mov.haber) : '-'}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(mov.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel lateral */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Resumen</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Saldo Actual:</span>
                  <span className={`text-xl font-bold ${selectedProveedor.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedProveedor.saldo)}
                  </span>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Facturas Pendientes:</span>
                    <span className="font-medium">{facturasCompra.filter(f => f.proveedor_id === selectedProveedor.id && f.estado === 'pendiente').length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">OC Pendientes:</span>
                    <span className="font-medium">{ordenesCompra.filter(o => o.proveedor_id === selectedProveedor.id && o.estado === 'confirmada').length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    setCreandoOC(true)
                    setSelectedProveedor(null)
                    setActiveView("ordenes_compra")
                  }}
                  className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  Nueva Orden de Compra
                </button>
                <button 
                  onClick={() => {
                    setCreandoOP(true)
                    setSelectedProveedor(null)
                    setActiveView("ordenes_pago")
                  }}
                  className="w-full px-3 py-2 text-sm text-left border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Nueva Orden de Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCrearProveedor = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoProveedor(false)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Proveedor</h1>
            <p className="text-sm text-gray-500">Complete los datos del nuevo proveedor</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <p className="text-center text-gray-500 py-8">Formulario de creación de proveedor (en desarrollo)</p>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER ÓRDENES DE COMPRA
  // =====================================================
  const renderOrdenesCompra = () => {
    if (selectedOC) return renderFichaOC()
    if (creandoOC) return renderCrearOC()

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
            <p className="text-gray-500 mt-1">Gestione las órdenes de compra a proveedores</p>
          </div>
          <button 
            onClick={() => setCreandoOC(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva OC
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total OC</p>
            <p className="text-2xl font-bold text-gray-900">{ordenesCompra.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Confirmadas</p>
            <p className="text-2xl font-bold text-blue-600">{ordenesCompra.filter(o => o.estado === 'confirmada').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pendientes Recepción</p>
            <p className="text-2xl font-bold text-amber-600">{ordenesCompra.filter(o => o.estado === 'confirmada' || o.estado === 'recibida_parcial').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Monto Total</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(ordenesCompra.reduce((s, o) => s + o.total, 0))}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-center py-3 px-4">Legajo/Despacho</th>
              </tr>
            </thead>
            <tbody>
              {ordenesCompra.map(oc => (
                <tr 
                  key={oc.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedOC(oc)}
                >
                  <td className="py-3 px-4 font-medium text-blue-700">{oc.numero}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(oc.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{oc.proveedor_nombre}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      oc.tipo_compra === 'nacional' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {oc.tipo_compra === 'nacional' ? 'Nacional' : 'Importación'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {oc.moneda === 'USD' ? formatCurrency(oc.total, 'USD') : formatCurrency(oc.total)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      oc.estado === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                      oc.estado === 'recibida' ? 'bg-green-100 text-green-700' :
                      oc.estado === 'recibida_parcial' ? 'bg-amber-100 text-amber-700' :
                      oc.estado === 'borrador' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {oc.estado.replace('_', ' ').charAt(0).toUpperCase() + oc.estado.replace('_', ' ').slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {oc.legajo_id && (
                      <span className="text-xs text-purple-600">LEG-{oc.legajo_id}</span>
                    )}
                    {oc.despacho_simple_id && (
                      <span className="text-xs text-cyan-600">DS-{oc.despacho_simple_id}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderFichaOC = () => {
    if (!selectedOC) return null
    return (
      <div>
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setSelectedOC(null)} className="hover:text-blue-600">Órdenes de Compra</button>
          <span>/</span>
          <span className="text-gray-900">{selectedOC.numero}</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedOC(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedOC.numero}</h1>
              <p className="text-sm text-gray-500">{formatDate(selectedOC.fecha)} | {selectedOC.proveedor_nombre}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            selectedOC.estado === 'confirmada' ? 'bg-blue-100 text-blue-700' :
            selectedOC.estado === 'recibida' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {selectedOC.estado.charAt(0).toUpperCase() + selectedOC.estado.slice(1)}
          </span>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Líneas de la Orden</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2">Producto</th>
                <th className="text-right py-2">Cantidad</th>
                <th className="text-right py-2">Recibido</th>
                <th className="text-right py-2">Precio Unit.</th>
                <th className="text-right py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {selectedOC.lineas.map((linea, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{linea.producto_nombre}</td>
                  <td className="py-2 text-right">{linea.cantidad}</td>
                  <td className="py-2 text-right">{linea.cantidad_recibida}</td>
                  <td className="py-2 text-right">{selectedOC.moneda === 'USD' ? formatCurrency(linea.precio_unitario, 'USD') : formatCurrency(linea.precio_unitario)}</td>
                  <td className="py-2 text-right font-medium">{selectedOC.moneda === 'USD' ? formatCurrency(linea.subtotal, 'USD') : formatCurrency(linea.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={4} className="py-2 text-right">Total:</td>
                <td className="py-2 text-right">{selectedOC.moneda === 'USD' ? formatCurrency(selectedOC.total, 'USD') : formatCurrency(selectedOC.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  const renderCrearOC = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoOC(false)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Compra</h1>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-center text-gray-500 py-8">Formulario de creación de OC (en desarrollo)</p>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER LEGAJOS DE IMPORTACIÓN
  // =====================================================
  const renderLegajosImportacion = () => {
    if (selectedLegajo) return renderFichaLegajo()
    if (creandoLegajo) return renderCrearLegajo()

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Legajos de Importación</h1>
            <p className="text-gray-500 mt-1">Gestione importaciones complejas con múltiples gastos</p>
          </div>
          <button 
            onClick={() => setCreandoLegajo(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nuevo Legajo
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Legajos</p>
            <p className="text-2xl font-bold text-gray-900">{legajosImportacion.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Abiertos</p>
            <p className="text-2xl font-bold text-blue-600">{legajosImportacion.filter(l => l.estado === 'abierto').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Compras</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(legajosImportacion.reduce((s, l) => s + l.total_compras, 0))}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Gastos</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(legajosImportacion.reduce((s, l) => s + l.total_gastos, 0))}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">Fecha Apertura</th>
                <th className="text-left py-3 px-4">Despachante</th>
                <th className="text-right py-3 px-4">Total Compras</th>
                <th className="text-right py-3 px-4">Total Gastos</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {legajosImportacion.map(legajo => (
                <tr 
                  key={legajo.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedLegajo(legajo)}
                >
                  <td className="py-3 px-4 font-medium text-purple-700">{legajo.numero}</td>
                  <td className="py-3 px-4">{legajo.nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(legajo.fecha_apertura)}</td>
                  <td className="py-3 px-4 text-sm">{legajo.despachante_nombre || '-'}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(legajo.total_compras)}</td>
                  <td className="py-3 px-4 text-right font-medium text-amber-600">{formatCurrency(legajo.total_gastos)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      legajo.estado === 'abierto' ? 'bg-blue-100 text-blue-700' :
                      legajo.estado === 'finalizado' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {legajo.estado.charAt(0).toUpperCase() + legajo.estado.slice(1)}
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

  const renderFichaLegajo = () => {
    if (!selectedLegajo) return null

    const ocsVinculadas = ordenesCompra.filter(o => selectedLegajo.ordenes_compra_ids.includes(o.id))
    const recepcionesVinculadas = recepciones.filter(r => selectedLegajo.recepciones_ids.includes(r.id))

    return (
      <div>
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setSelectedLegajo(null)} className="hover:text-blue-600">Legajos de Importación</button>
          <span>/</span>
          <span className="text-gray-900">{selectedLegajo.numero}</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedLegajo(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedLegajo.numero}</h1>
              <p className="text-sm text-gray-500">{selectedLegajo.nombre} | {formatDate(selectedLegajo.fecha_apertura)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedLegajo.estado === 'borrador' && (
              <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Confirmar
              </button>
            )}
            {selectedLegajo.estado === 'abierto' && (
              <button className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                Finalizar
              </button>
            )}
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              selectedLegajo.estado === 'abierto' ? 'bg-blue-100 text-blue-700' :
              selectedLegajo.estado === 'finalizado' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {selectedLegajo.estado.charAt(0).toUpperCase() + selectedLegajo.estado.slice(1)}
            </span>
          </div>
        </div>

        {/* Info cabecera */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Responsable:</span>
              <p className="font-medium">{selectedLegajo.responsable}</p>
            </div>
            <div>
              <span className="text-gray-500">Despachante:</span>
              <p className="font-medium">{selectedLegajo.despachante_nombre || '-'}</p>
            </div>
            <div>
              <span className="text-gray-500">Sucursal:</span>
              <p className="font-medium">{selectedLegajo.sucursal}</p>
            </div>
            <div>
              <span className="text-gray-500">TC Referencia:</span>
              <p className="font-medium">{formatCurrency(selectedLegajo.tc_referencia)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Compras:</span>
              <p className="font-medium text-green-600">{formatCurrency(selectedLegajo.total_compras)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Gastos:</span>
              <p className="font-medium text-amber-600">{formatCurrency(selectedLegajo.total_gastos)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-4">
            {[
              { id: "compras", label: "Compras" },
              { id: "gastos", label: "Gastos de Importación" },
              { id: "distribucion", label: "Distribución de Costos" },
              { id: "observaciones", label: "Observaciones" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setLegajoTab(tab.id as "compras" | "gastos" | "distribucion" | "observaciones")}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  legajoTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg border p-6">
          {legajoTab === "compras" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Órdenes de Compra Vinculadas</h3>
                {ocsVinculadas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay órdenes de compra vinculadas</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2">Número</th>
                        <th className="text-left py-2">Proveedor</th>
                        <th className="text-left py-2">Fecha</th>
                        <th className="text-right py-2">Total</th>
                        <th className="text-center py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocsVinculadas.map(oc => (
                        <tr key={oc.id} className="border-b">
                          <td className="py-2 text-blue-600">{oc.numero}</td>
                          <td className="py-2">{oc.proveedor_nombre}</td>
                          <td className="py-2">{formatDate(oc.fecha)}</td>
                          <td className="py-2 text-right">{oc.moneda === 'USD' ? formatCurrency(oc.total, 'USD') : formatCurrency(oc.total)}</td>
                          <td className="py-2 text-center">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {oc.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-4">Recepciones Vinculadas</h3>
                {recepcionesVinculadas.length === 0 ? (
                  <p className="text-gray-500 text-sm">No hay recepciones vinculadas</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2">Número</th>
                        <th className="text-left py-2">OC Origen</th>
                        <th className="text-left py-2">Fecha</th>
                        <th className="text-center py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recepcionesVinculadas.map(rec => (
                        <tr key={rec.id} className="border-b">
                          <td className="py-2 text-blue-600">{rec.numero}</td>
                          <td className="py-2">{rec.orden_compra_numero}</td>
                          <td className="py-2">{formatDate(rec.fecha)}</td>
                          <td className="py-2 text-center">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {rec.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {legajoTab === "gastos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Gastos de Importación</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Agregar Gasto
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500 uppercase">
                    <th className="text-left py-2">Tipo de Gasto</th>
                    <th className="text-left py-2">Proveedor</th>
                    <th className="text-right py-2">Importe</th>
                    <th className="text-center py-2">Moneda</th>
                    <th className="text-right py-2">TC</th>
                    <th className="text-right py-2">Importe Base</th>
                    <th className="text-center py-2">Clasificación</th>
                    <th className="text-center py-2">Criterio</th>
                    <th className="text-center py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLegajo.gastos.map(gasto => (
                    <tr key={gasto.id} className="border-b">
                      <td className="py-2">{gasto.tipo_gasto_nombre}</td>
                      <td className="py-2">{gasto.proveedor_nombre || '-'}</td>
                      <td className="py-2 text-right">{gasto.moneda === 'USD' ? formatCurrency(gasto.importe, 'USD') : formatCurrency(gasto.importe)}</td>
                      <td className="py-2 text-center">{gasto.moneda}</td>
                      <td className="py-2 text-right">{formatCurrency(gasto.tipo_cambio)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(gasto.importe_base)}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gasto.clasificacion === 'activable' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {gasto.clasificacion === 'activable' ? 'Activable' : 'Resultado'}
                        </span>
                      </td>
                      <td className="py-2 text-center text-xs">{gasto.criterio_distribucion.toUpperCase()}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gasto.estado === 'distribuido' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {gasto.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-gray-50">
                    <td colSpan={5} className="py-2 text-right">Total Gastos Activables:</td>
                    <td className="py-2 text-right text-green-600">
                      {formatCurrency(selectedLegajo.gastos.filter(g => g.clasificacion === 'activable').reduce((s, g) => s + g.importe_base, 0))}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                  <tr className="font-semibold bg-gray-50">
                    <td colSpan={5} className="py-2 text-right">Total Gastos a Resultado:</td>
                    <td className="py-2 text-right text-amber-600">
                      {formatCurrency(selectedLegajo.gastos.filter(g => g.clasificacion === 'resultado').reduce((s, g) => s + g.importe_base, 0))}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {legajoTab === "distribucion" && (
            <div>
              <h3 className="font-semibold mb-4">Distribución de Costos a Productos</h3>
              <p className="text-gray-500 text-sm">Vista previa de distribución (en desarrollo)</p>
            </div>
          )}

          {legajoTab === "observaciones" && (
            <div>
              <h3 className="font-semibold mb-4">Observaciones</h3>
              <textarea
                value={selectedLegajo.observaciones}
                readOnly
                className="w-full h-32 p-3 border rounded-lg text-sm"
                placeholder="Sin observaciones"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCrearLegajo = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoLegajo(false)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Legajo de Importación</h1>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-center text-gray-500 py-8">Formulario de creación de legajo (en desarrollo)</p>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER DESPACHOS SIMPLES
  // =====================================================
  const renderDespachosSimples = () => {
    if (selectedDespachoSimple) return renderFichaDespachoSimple()
    if (creandoDespachoSimple) return renderCrearDespachoSimple()

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Despachos Simples</h1>
            <p className="text-gray-500 mt-1">Importaciones USA con estructura de costos simplificada</p>
          </div>
          <button 
            onClick={() => setCreandoDespachoSimple(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nuevo Despacho
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Despachos</p>
            <p className="text-2xl font-bold text-gray-900">{despachosSimples.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Abiertos</p>
            <p className="text-2xl font-bold text-cyan-600">{despachosSimples.filter(d => d.estado === 'abierto').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Mercadería</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(despachosSimples.reduce((s, d) => s + d.total_mercaderia, 0))}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Fletes</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(despachosSimples.reduce((s, d) => s + d.total_fletes, 0))}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-right py-3 px-4">Mercadería</th>
                <th className="text-right py-3 px-4">Fletes</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {despachosSimples.map(despacho => (
                <tr 
                  key={despacho.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedDespachoSimple(despacho)}
                >
                  <td className="py-3 px-4 font-medium text-cyan-700">{despacho.numero}</td>
                  <td className="py-3 px-4">{despacho.nombre}</td>
                  <td className="py-3 px-4 text-sm">{despacho.proveedor_nombre}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(despacho.fecha)}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(despacho.total_mercaderia)}</td>
                  <td className="py-3 px-4 text-right font-medium text-amber-600">{formatCurrency(despacho.total_fletes)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      despacho.estado === 'abierto' ? 'bg-cyan-100 text-cyan-700' :
                      despacho.estado === 'finalizado' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {despacho.estado.charAt(0).toUpperCase() + despacho.estado.slice(1)}
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

  const renderFichaDespachoSimple = () => {
    if (!selectedDespachoSimple) return null

    const pesoTotal = selectedDespachoSimple.productos.reduce((s, p) => s + p.peso_total, 0)

    return (
      <div>
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setSelectedDespachoSimple(null)} className="hover:text-blue-600">Despachos Simples</button>
          <span>/</span>
          <span className="text-gray-900">{selectedDespachoSimple.numero}</span>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedDespachoSimple(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedDespachoSimple.numero}</h1>
              <p className="text-sm text-gray-500">{selectedDespachoSimple.nombre} | {formatDate(selectedDespachoSimple.fecha)}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            selectedDespachoSimple.estado === 'abierto' ? 'bg-cyan-100 text-cyan-700' :
            selectedDespachoSimple.estado === 'finalizado' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {selectedDespachoSimple.estado.charAt(0).toUpperCase() + selectedDespachoSimple.estado.slice(1)}
          </span>
        </div>

        {/* Info */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Proveedor:</span>
              <p className="font-medium">{selectedDespachoSimple.proveedor_nombre}</p>
            </div>
            <div>
              <span className="text-gray-500">Responsable:</span>
              <p className="font-medium">{selectedDespachoSimple.responsable}</p>
            </div>
            <div>
              <span className="text-gray-500">Sucursal:</span>
              <p className="font-medium">{selectedDespachoSimple.sucursal}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Mercadería:</span>
              <p className="font-medium text-green-600">{formatCurrency(selectedDespachoSimple.total_mercaderia)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Fletes:</span>
              <p className="font-medium text-amber-600">{formatCurrency(selectedDespachoSimple.total_fletes)}</p>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="font-semibold mb-4">Productos</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2">Producto</th>
                <th className="text-right py-2">Cantidad</th>
                <th className="text-right py-2">Peso Unit.</th>
                <th className="text-right py-2">Peso Total</th>
                <th className="text-right py-2">FOB Unit.</th>
                <th className="text-right py-2">Total FOB</th>
              </tr>
            </thead>
            <tbody>
              {selectedDespachoSimple.productos.map((prod, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{prod.producto_nombre}</td>
                  <td className="py-2 text-right">{prod.cantidad}</td>
                  <td className="py-2 text-right">{prod.peso_unitario} kg</td>
                  <td className="py-2 text-right">{prod.peso_total} kg</td>
                  <td className="py-2 text-right">{formatCurrency(prod.precio_fob_unitario, 'USD')}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(prod.total_fob, 'USD')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Gastos */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="font-semibold mb-4">Gastos (Fletes)</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2">Flete Internacional</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Importe:</span>
                  <span>{selectedDespachoSimple.flete_internacional.moneda === 'USD' 
                    ? formatCurrency(selectedDespachoSimple.flete_internacional.importe, 'USD')
                    : formatCurrency(selectedDespachoSimple.flete_internacional.importe)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">TC:</span>
                  <span>{formatCurrency(selectedDespachoSimple.flete_internacional.tipo_cambio)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Importe Base:</span>
                  <span className="text-amber-600">{formatCurrency(selectedDespachoSimple.flete_internacional.importe_base)}</span>
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2">Flete Nacional</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Importe:</span>
                  <span>{selectedDespachoSimple.flete_nacional.moneda === 'USD' 
                    ? formatCurrency(selectedDespachoSimple.flete_nacional.importe, 'USD')
                    : formatCurrency(selectedDespachoSimple.flete_nacional.importe)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">TC:</span>
                  <span>{formatCurrency(selectedDespachoSimple.flete_nacional.tipo_cambio)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Importe Base:</span>
                  <span className="text-amber-600">{formatCurrency(selectedDespachoSimple.flete_nacional.importe_base)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribución */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Distribución de Costos (por Peso)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="text-left py-2">Producto</th>
                <th className="text-right py-2">Cant.</th>
                <th className="text-right py-2">Peso Total</th>
                <th className="text-right py-2">% Peso</th>
                <th className="text-right py-2">Flete Int.</th>
                <th className="text-right py-2">Flete Nac.</th>
                <th className="text-right py-2">Costo Landing Unit.</th>
              </tr>
            </thead>
            <tbody>
              {selectedDespachoSimple.productos.map((prod, idx) => {
                const porcentajePeso = (prod.peso_total / pesoTotal) * 100
                const fleteIntAsignado = (selectedDespachoSimple.flete_internacional.importe_base * porcentajePeso) / 100
                const fleteNacAsignado = (selectedDespachoSimple.flete_nacional.importe_base * porcentajePeso) / 100
                const costoLandingTotal = (prod.total_fob * selectedDespachoSimple.flete_internacional.tipo_cambio) + fleteIntAsignado + fleteNacAsignado
                const costoLandingUnit = costoLandingTotal / prod.cantidad

                return (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{prod.producto_nombre}</td>
                    <td className="py-2 text-right">{prod.cantidad}</td>
                    <td className="py-2 text-right">{prod.peso_total} kg</td>
                    <td className="py-2 text-right">{porcentajePeso.toFixed(1)}%</td>
                    <td className="py-2 text-right">{formatCurrency(fleteIntAsignado)}</td>
                    <td className="py-2 text-right">{formatCurrency(fleteNacAsignado)}</td>
                    <td className="py-2 text-right font-semibold text-green-600">{formatCurrency(costoLandingUnit)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderCrearDespachoSimple = () => {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setCreandoDespachoSimple(false)} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Despacho Simple</h1>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-center text-gray-500 py-8">Formulario de creación de despacho simple (en desarrollo)</p>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER RECEPCIONES
  // =====================================================
  const renderRecepciones = () => {
    const recepcionesMock = [
      { id: 1, numero: "REC-00001", fecha: "2026-03-10", proveedor: "Tech Import SA", oc_numero: "OC-00001", estado: "completa", items: 5, total: 2500000 },
      { id: 2, numero: "REC-00002", fecha: "2026-03-12", proveedor: "Distribuidora Norte", oc_numero: "OC-00002", estado: "parcial", items: 3, total: 890000 },
      { id: 3, numero: "REC-00003", fecha: "2026-03-14", proveedor: "Tech Import SA", oc_numero: "OC-00003", estado: "completa", items: 10, total: 4200000 },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Recepciones de Compra</h1>
            <p className="text-gray-500 mt-1">Gestione las recepciones de mercadería</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nueva Recepción
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Recepciones</p>
            <p className="text-2xl font-bold text-gray-900">{recepcionesMock.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Completas</p>
            <p className="text-2xl font-bold text-emerald-600">{recepcionesMock.filter(r => r.estado === 'completa').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Parciales</p>
            <p className="text-2xl font-bold text-amber-600">{recepcionesMock.filter(r => r.estado === 'parcial').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Valor Total</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(recepcionesMock.reduce((s, r) => s + r.total, 0))}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">OC Origen</th>
                <th className="text-center py-3 px-4">Items</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {recepcionesMock.map(rec => (
                <tr key={rec.id} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-medium text-emerald-700">{rec.numero}</td>
                  <td className="py-3 px-4 text-sm">{new Date(rec.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">{rec.proveedor}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{rec.oc_numero}</td>
                  <td className="py-3 px-4 text-sm text-center">{rec.items}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(rec.total)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rec.estado === 'completa' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {rec.estado.charAt(0).toUpperCase() + rec.estado.slice(1)}
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

  // =====================================================
  // RENDER FACTURAS DE COMPRA
  // =====================================================
  const renderFacturasCompra = () => {
    const facturasMock = [
      { id: 1, numero: "FC-A-00001", fecha: "2026-03-10", proveedor: "Tech Import SA", recepcion: "REC-00001", subtotal: 2500000, iva: 525000, total: 3025000, estado: "pendiente" },
      { id: 2, numero: "FC-A-00002", fecha: "2026-03-12", proveedor: "Distribuidora Norte", recepcion: "REC-00002", subtotal: 890000, iva: 186900, total: 1076900, estado: "pagada" },
      { id: 3, numero: "FC-B-00001", fecha: "2026-03-14", proveedor: "Mayorista Sur", recepcion: "REC-00003", subtotal: 1200000, iva: 0, total: 1200000, estado: "vencida" },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Facturas de Compra</h1>
            <p className="text-gray-500 mt-1">Gestione las facturas de proveedores</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Facturas</p>
            <p className="text-2xl font-bold text-gray-900">{facturasMock.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{facturasMock.filter(f => f.estado === 'pendiente').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Vencidas</p>
            <p className="text-2xl font-bold text-red-600">{facturasMock.filter(f => f.estado === 'vencida').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Adeudado</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(facturasMock.filter(f => f.estado !== 'pagada').reduce((s, f) => s + f.total, 0))}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Recepción</th>
                <th className="text-right py-3 px-4">Subtotal</th>
                <th className="text-right py-3 px-4">IVA</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {facturasMock.map(fac => (
                <tr key={fac.id} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-medium text-emerald-700">{fac.numero}</td>
                  <td className="py-3 px-4 text-sm">{new Date(fac.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">{fac.proveedor}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{fac.recepcion}</td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(fac.subtotal)}</td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(fac.iva)}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(fac.total)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      fac.estado === 'pagada' ? 'bg-green-100 text-green-700' : 
                      fac.estado === 'vencida' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {fac.estado.charAt(0).toUpperCase() + fac.estado.slice(1)}
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

  // =====================================================
  // RENDER NOTAS DE CRÉDITO DE COMPRA
  // =====================================================
  const renderNotasCreditoCompra = () => {
    const ncMock = [
      { id: 1, numero: "NC-A-00001", fecha: "2026-03-11", proveedor: "Tech Import SA", factura_origen: "FC-A-00001", motivo: "Devolución mercadería", total: 150000, estado: "aplicada" },
      { id: 2, numero: "NC-A-00002", fecha: "2026-03-13", proveedor: "Distribuidora Norte", factura_origen: "FC-A-00002", motivo: "Diferencia de precio", total: 25000, estado: "pendiente" },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Notas de Crédito de Compra</h1>
            <p className="text-gray-500 mt-1">Gestione las notas de crédito recibidas de proveedores</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nueva NC
          </button>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Factura Origen</th>
                <th className="text-left py-3 px-4">Motivo</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ncMock.map(nc => (
                <tr key={nc.id} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-medium text-emerald-700">{nc.numero}</td>
                  <td className="py-3 px-4 text-sm">{new Date(nc.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">{nc.proveedor}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{nc.factura_origen}</td>
                  <td className="py-3 px-4 text-sm">{nc.motivo}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-green-600">{formatCurrency(nc.total)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      nc.estado === 'aplicada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {nc.estado.charAt(0).toUpperCase() + nc.estado.slice(1)}
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

  // =====================================================
  // RENDER NOTAS DE DÉBITO DE COMPRA
  // =====================================================
  const renderNotasDebitoCompra = () => {
    const ndMock = [
      { id: 1, numero: "ND-A-00001", fecha: "2026-03-12", proveedor: "Tech Import SA", factura_origen: "FC-A-00001", motivo: "Intereses por mora", total: 35000, estado: "pendiente" },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Notas de Débito de Compra</h1>
            <p className="text-gray-500 mt-1">Gestione las notas de débito recibidas de proveedores</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nueva ND
          </button>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Factura Origen</th>
                <th className="text-left py-3 px-4">Motivo</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ndMock.map(nd => (
                <tr key={nd.id} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-medium text-emerald-700">{nd.numero}</td>
                  <td className="py-3 px-4 text-sm">{new Date(nd.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">{nd.proveedor}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{nd.factura_origen}</td>
                  <td className="py-3 px-4 text-sm">{nd.motivo}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-red-600">{formatCurrency(nd.total)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      nd.estado === 'pagada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {nd.estado.charAt(0).toUpperCase() + nd.estado.slice(1)}
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

  // =====================================================
  // RENDER ÓRDENES DE PAGO
  // =====================================================
  const renderOrdenesPago = () => {
    const ordenesPagoMock = [
      { id: 1, numero: "OP-00001", fecha: "2026-03-10", proveedor: "Tech Import SA", facturas: ["FC-A-00001"], monto: 3025000, forma_pago: "Transferencia", estado: "pagada" },
      { id: 2, numero: "OP-00002", fecha: "2026-03-12", proveedor: "Distribuidora Norte", facturas: ["FC-A-00002"], monto: 1051900, forma_pago: "Cheque", estado: "emitida" },
      { id: 3, numero: "OP-00003", fecha: "2026-03-14", proveedor: "Mayorista Sur", facturas: ["FC-B-00001"], monto: 600000, forma_pago: "Efectivo", estado: "borrador" },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Órdenes de Pago</h1>
            <p className="text-gray-500 mt-1">Gestione los pagos a proveedores</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nueva Orden de Pago
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Órdenes</p>
            <p className="text-2xl font-bold text-gray-900">{ordenesPagoMock.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pagadas</p>
            <p className="text-2xl font-bold text-emerald-600">{ordenesPagoMock.filter(o => o.estado === 'pagada').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Emitidas</p>
            <p className="text-2xl font-bold text-blue-600">{ordenesPagoMock.filter(o => o.estado === 'emitida').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Pagado</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(ordenesPagoMock.filter(o => o.estado === 'pagada').reduce((s, o) => s + o.monto, 0))}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Facturas</th>
                <th className="text-left py-3 px-4">Forma de Pago</th>
                <th className="text-right py-3 px-4">Monto</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ordenesPagoMock.map(op => (
                <tr key={op.id} className="border-b hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 px-4 font-medium text-emerald-700">{op.numero}</td>
                  <td className="py-3 px-4 text-sm">{new Date(op.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">{op.proveedor}</td>
                  <td className="py-3 px-4 text-sm text-blue-600">{op.facturas.join(", ")}</td>
                  <td className="py-3 px-4 text-sm">{op.forma_pago}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(op.monto)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      op.estado === 'pagada' ? 'bg-green-100 text-green-700' : 
                      op.estado === 'emitida' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {op.estado.charAt(0).toUpperCase() + op.estado.slice(1)}
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

  // =====================================================
  // RENDER CTA CTE PROVEEDORES
  // =====================================================
  const renderCtaCteProveedores = () => {
    const movimientosMock = [
      { id: 1, fecha: "2026-03-10", proveedor: "Tech Import SA", tipo: "factura", numero: "FC-A-00001", debe: 3025000, haber: 0 },
      { id: 2, fecha: "2026-03-11", proveedor: "Tech Import SA", tipo: "nc", numero: "NC-A-00001", debe: 0, haber: 150000 },
      { id: 3, fecha: "2026-03-10", proveedor: "Tech Import SA", tipo: "pago", numero: "OP-00001", debe: 0, haber: 3025000 },
      { id: 4, fecha: "2026-03-12", proveedor: "Distribuidora Norte", tipo: "factura", numero: "FC-A-00002", debe: 1076900, haber: 0 },
      { id: 5, fecha: "2026-03-12", proveedor: "Distribuidora Norte", tipo: "pago", numero: "OP-00002", debe: 0, haber: 1051900 },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Cuenta Corriente Proveedores</h1>
            <p className="text-gray-500 mt-1">Movimientos de cuenta corriente con proveedores</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Deuda</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(movimientosMock.reduce((s, m) => s + m.debe - m.haber, 0))}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Facturas</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(movimientosMock.reduce((s, m) => s + m.debe, 0))}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Pagado</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(movimientosMock.reduce((s, m) => s + m.haber, 0))}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Número</th>
                <th className="text-right py-3 px-4">Debe</th>
                <th className="text-right py-3 px-4">Haber</th>
              </tr>
            </thead>
            <tbody>
              {movimientosMock.map(mov => (
                <tr key={mov.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{new Date(mov.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">{mov.proveedor}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mov.tipo === 'factura' ? 'bg-blue-100 text-blue-700' :
                      mov.tipo === 'nc' ? 'bg-green-100 text-green-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {mov.tipo === 'factura' ? 'Factura' : mov.tipo === 'nc' ? 'Nota Crédito' : 'Pago'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-blue-600">{mov.numero}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-red-600">{mov.debe > 0 ? formatCurrency(mov.debe) : '-'}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-emerald-600">{mov.haber > 0 ? formatCurrency(mov.haber) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER TIPOS DE GASTO
  // =====================================================
  const renderTiposGasto = () => {
    const tiposGastoMock = [
      { id: 1, codigo: "FLE", nombre: "Flete Internacional", activa_costo: true, criterio_distribucion: "peso" },
      { id: 2, codigo: "SEG", nombre: "Seguro de Carga", activa_costo: true, criterio_distribucion: "valor" },
      { id: 3, codigo: "DES", nombre: "Despacho Aduanero", activa_costo: true, criterio_distribucion: "valor" },
      { id: 4, codigo: "ALM", nombre: "Almacenaje", activa_costo: false, criterio_distribucion: "unidades" },
      { id: 5, codigo: "COM", nombre: "Comisión Despachante", activa_costo: true, criterio_distribucion: "valor" },
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Tipos de Gasto de Importación</h1>
            <p className="text-gray-500 mt-1">Configure los tipos de gastos para importaciones</p>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nuevo Tipo
          </button>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Código</th>
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-center py-3 px-4">Activa Costo</th>
                <th className="text-left py-3 px-4">Criterio Distribución</th>
                <th className="text-center py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiposGastoMock.map(tipo => (
                <tr key={tipo.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{tipo.codigo}</td>
                  <td className="py-3 px-4 text-sm">{tipo.nombre}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tipo.activa_costo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tipo.activa_costo ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm capitalize">{tipo.criterio_distribucion}</td>
                  <td className="py-3 px-4 text-center">
                    <button className="text-gray-400 hover:text-emerald-600"><Edit className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // =====================================================
  // RENDER PLACEHOLDER
  // =====================================================
  const renderPlaceholder = (title: string) => (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
        <p>Módulo en desarrollo</p>
      </div>
    </div>
  )

  // =====================================================
  // RENDER CONTENT
  // =====================================================
  const renderContent = () => {
    switch (activeView) {
      case "proveedores":
        return renderProveedores()
      case "cta_cte_proveedores":
        return renderCtaCteProveedores()
      case "historial_proveedores":
        return renderPlaceholder("Historial Proveedores")
      case "conciliacion_deuda":
        return renderPlaceholder("Conciliación de Deuda")
      case "ordenes_compra":
        return renderOrdenesCompra()
      case "recepciones":
        return renderRecepciones()
      case "facturas_compra":
        return renderFacturasCompra()
      case "nc_compra":
        return renderNotasCreditoCompra()
      case "nd_compra":
        return renderNotasDebitoCompra()
      case "legajos_importacion":
        return renderLegajosImportacion()
      case "despachos_simples":
        return renderDespachosSimples()
      case "ordenes_pago":
        return renderOrdenesPago()
      case "tipos_gasto":
        return renderTiposGasto()
      case "componentes_evaluacion":
        return renderPlaceholder("Componentes de Evaluación de Equipos")
      case "rangos_precio":
        return renderPlaceholder("Rangos de Precio por Rol")
      default:
        return renderProveedores()
    }
  }

  return (
    <div className="flex pt-11">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 fixed top-11 left-0 bottom-0 overflow-y-auto">
        {renderSidebar()}
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-56 p-6 bg-gray-50 min-h-screen">
        {renderContent()}
      </main>
    </div>
  )
}
