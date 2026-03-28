"use client"

import React, { useState, useEffect } from "react"
import { Search, Filter, ChevronDown, ChevronRight, X, Plus, FileText, Truck, Receipt, CreditCard, Users, DollarSign, Package, ArrowRight, Eye, Edit, Trash2, Download, Mail, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Phone, Globe, Calendar, Tag, Percent, Star, TrendingUp, RefreshCw, User, Warehouse, Save, MessageSquare, Settings, Lock, Unlock, FileBox, Ship, Plane } from "lucide-react"
import BotonVolver from "./ui/boton-volver"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"

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

interface OrdenCompraLinea {
  producto_id: number
  producto_nombre: string
  descripcion: string
  cantidad: number
  cantidad_recibida: number
  precio_unitario: number
  descuento: number
  subtotal: number
}

interface OrdenCompra {
  id: number
  numero: string
  fecha: string
  sucursal: string
  proveedor_id: number
  proveedor_nombre: string
  termino_pago: string
  tipo_compra: string
  metodo_compra: "estandar" | "inmediato"
  estado: "borrador" | "confirmada" | "recibida_parcial" | "recibida" | "cancelada"
  fecha_entrega_estimada: string
  deposito_destino: string
  ubicacion_destino?: string
  moneda: "ARS" | "USD" | "EUR"
  tipo_cambio: number
  subtotal: number
  impuestos: number
  total: number
  observaciones: string
  legajo_id?: number
  despacho_simple_id?: number
  lineas: OrdenCompraLinea[]
  cancelacion?: {
    usuario: string
    fecha: string
    motivo: string
  }
  seguimiento?: SeguimientoEntry[]
}

interface UnidadSerie {
  nro_serie: string
  lote?: string
  bateria_pct?: number
  color?: string
  outlet: boolean
  fallas?: string
}

interface RecepcionLinea {
  producto_id: number
  producto_nombre: string
  producto_sku: string
  tiene_serie: boolean
  cantidad_pedida: number
  cantidad_recibida: number
  udm: string
  precio_unitario: number
  estado_linea: "pendiente" | "recibido" | "recibido_parcial"
  unidades_serie?: UnidadSerie[]
}

interface Recepcion {
  id: number
  numero: string
  fecha: string
  sucursal: string
  proveedor_id?: number
  proveedor_nombre?: string
  deposito_destino: string
  ubicacion_destino?: string
  documento_origen_tipo: "oc" | "toma_equipo" | "transferencia"
  documento_origen_id?: number
  documento_origen_ref: string
  fecha_pedido?: string
  fecha_entrega_esperada?: string
  fecha_recepcion_real?: string
  remito_numero?: string
  remito_fecha?: string
  observaciones?: string
  estado: "esperando_recepcion" | "recibida" | "cancelada"
  recepcion_anterior_id?: number
  recepcion_complementaria_id?: number
  lineas: RecepcionLinea[]
  cancelacion?: {
    usuario: string
    fecha: string
    motivo: string
  }
  // backward compat para legajo
  orden_compra_id?: number
  orden_compra_numero?: string
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
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [editandoProveedor, setEditandoProveedor] = useState(false)
  const [proveedorSearchText, setProveedorSearchText] = useState("")
  const [proveedorFiltroCategoria, setProveedorFiltroCategoria] = useState<"todos" | "publico" | "privado">("todos")
  const [proveedorFiltroTipo, setProveedorFiltroTipo] = useState<"todos" | "nacional" | "internacional" | "despachante">("todos")

  // Órdenes de Compra
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([])
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null)
  const [creandoOC, setCreandoOC] = useState(false)
  // UI state OC — listado
  const [ocFiltroEstado, setOcFiltroEstado] = useState<"todos" | "borrador" | "confirmada" | "cancelada">("todos")
  const [ocFiltroMetodo, setOcFiltroMetodo] = useState<"todos" | "estandar" | "inmediato">("todos")
  const [ocBusqueda, setOcBusqueda] = useState("")
  // UI state OC — ficha
  const [ocTabActivo, setOcTabActivo] = useState<"productos" | "recepciones" | "facturas" | "observaciones">("productos")
  // UI state OC — cancelación
  const [ocModalCancelacionOpen, setOcModalCancelacionOpen] = useState(false)
  const [ocCancelacionMotivo, setOcCancelacionMotivo] = useState("")
  // UI state OC — creación/edición
  const [nuevaOC, setNuevaOC] = useState<Partial<OrdenCompra> & { lineas: OrdenCompraLinea[] }>({
    sucursal: "",
    proveedor_id: 0,
    proveedor_nombre: "",
    termino_pago: "Contado",
    tipo_compra: "nacional",
    metodo_compra: "estandar",
    fecha: new Date().toISOString().slice(0, 10),
    fecha_entrega_estimada: "",
    deposito_destino: "",
    ubicacion_destino: "",
    moneda: "ARS",
    tipo_cambio: 1,
    observaciones: "",
    lineas: []
  })

  // OdooFilterBar states
  const [savedFiltersOC, setSavedFiltersOC] = useState<SavedFilter[]>([])
  const [activeFiltersOC, setActiveFiltersOC] = useState<FilterOption[]>([])
  const [activeGroupByOC, setActiveGroupByOC] = useState<GroupByOption[]>([])

  const [savedFiltersRec, setSavedFiltersRec] = useState<SavedFilter[]>([])
  const [activeFiltersRec, setActiveFiltersRec] = useState<FilterOption[]>([])
  const [activeGroupByRec, setActiveGroupByRec] = useState<GroupByOption[]>([])

  const [savedFiltersFC, setSavedFiltersFC] = useState<SavedFilter[]>([])
  const [activeFiltersFC, setActiveFiltersFC] = useState<FilterOption[]>([])
  const [activeGroupByFC, setActiveGroupByFC] = useState<GroupByOption[]>([])

  const [savedFiltersProv, setSavedFiltersProv] = useState<SavedFilter[]>([])
  const [activeFiltersProv, setActiveFiltersProv] = useState<FilterOption[]>([])
  const [activeGroupByProv, setActiveGroupByProv] = useState<GroupByOption[]>([])

  const makeSavedFilterHandlersC = (
    setter: React.Dispatch<React.SetStateAction<SavedFilter[]>>,
    setActiveFilters: React.Dispatch<React.SetStateAction<FilterOption[]>>,
    setActiveGroupBy: React.Dispatch<React.SetStateAction<GroupByOption[]>>,
    setSearch: (s: string) => void
  ) => ({
    onSaveFilter: (f: Omit<SavedFilter, "id" | "createdBy">) => setter(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "Admin" }]),
    onDeleteFilter: (id: string) => setter(prev => prev.filter(sf => sf.id !== id)),
    onApplyFilter: (f: SavedFilter) => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy); setSearch("") }
  })

  // Recepciones
  const [recepciones, setRecepciones] = useState<Recepcion[]>([])
  const [selectedRecepcion, setSelectedRecepcion] = useState<Recepcion | null>(null)
  const [creandoRecepcion, setCreandoRecepcion] = useState(false)
  // UI state recepciones
  const [recepcionFiltroEstado, setRecepcionFiltroEstado] = useState<"todos" | "esperando_recepcion" | "recibida" | "cancelada">("todos")
  const [recepcionBusqueda, setRecepcionBusqueda] = useState("")
  // Cantidades editadas en la ficha (producto_id → cantidad recibida)
  const [recepcionCantidades, setRecepcionCantidades] = useState<Record<number, number>>({})
  // Modal de N° serie
  const [modalSerieOpen, setModalSerieOpen] = useState(false)
  const [modalSerieProducto, setModalSerieProducto] = useState<RecepcionLinea | null>(null)
  const [modalSerieUnidades, setModalSerieUnidades] = useState<UnidadSerie[]>([])
  // Modal de cancelación
  const [modalCancelacionOpen, setModalCancelacionOpen] = useState(false)
  const [cancelacionMotivo, setCancelacionMotivo] = useState("")
  // Unidades serie acumuladas durante confirmación (producto_id → lista)
  const [seriesConfirmadas, setSeriesConfirmadas] = useState<Record<number, UnidadSerie[]>>({})

  // Cargar recepciones pendientes generadas desde Toma de Equipo (ventas)
  useEffect(() => {
    const pendientes = JSON.parse(localStorage.getItem('recepciones_pendientes_toma') || '[]') as Recepcion[]
    if (pendientes.length === 0) return
    setRecepciones(prev => {
      const idsExistentes = new Set(prev.map(r => r.id))
      const nuevas = pendientes.filter((r: Recepcion) => !idsExistentes.has(r.id))
      return nuevas.length > 0 ? [...prev, ...nuevas] : prev
    })
    // Limpiar el storage una vez leído
    localStorage.removeItem('recepciones_pendientes_toma')
  }, [])

  // Facturas de Compra
  const [facturasCompra, setFacturasCompra] = useState<FacturaCompra[]>([])
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
  const [legajosImportacion, setLegajosImportacion] = useState<LegajoImportacion[]>([])
  const [selectedLegajo, setSelectedLegajo] = useState<LegajoImportacion | null>(null)
  const [creandoLegajo, setCreandoLegajo] = useState(false)
  const [legajoTab, setLegajoTab] = useState<"compras" | "gastos" | "distribucion" | "observaciones">("compras")

  // Despachos Simples
  const [despachosSimples, setDespachosSimples] = useState<DespachoSimple[]>([])
  const [selectedDespachoSimple, setSelectedDespachoSimple] = useState<DespachoSimple | null>(null)
  const [creandoDespachoSimple, setCreandoDespachoSimple] = useState(false)

  // Tipos de Gasto (Configuración)
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([])

  // Movimientos Cuenta Corriente Proveedores
  const [movimientosCtaCte, setMovimientosCtaCte] = useState<MovimientoCtaCteProveedor[]>([])

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
        <div className="mb-6">
          <OdooFilterBar
            moduleName="proveedores"
            filterOptions={[
              { field: "categoria", label: "Categoría", values: [
                { value: "publico", label: "Público" },
                { value: "privado", label: "Privado" },
              ]},
              { field: "tipo", label: "Tipo", values: [
                { value: "nacional", label: "Nacional" },
                { value: "internacional", label: "Internacional" },
                { value: "despachante", label: "Despachante" },
              ]},
            ]}
            groupByOptions={[
              { id: "categoria", label: "Categoría", field: "categoria" },
              { id: "tipo", label: "Tipo", field: "tipo" },
              { id: "moneda_habitual", label: "Moneda", field: "moneda_habitual" },
            ]}
            activeFilters={activeFiltersProv}
            activeGroupBy={activeGroupByProv}
            searchTerm={proveedorSearchText}
            onFiltersChange={f => {
              setActiveFiltersProv(f)
              setProveedorFiltroCategoria((f.find(x => x.field === "categoria")?.value as any) ?? "todos")
              setProveedorFiltroTipo((f.find(x => x.field === "tipo")?.value as any) ?? "todos")
            }}
            onGroupByChange={setActiveGroupByProv}
            onSearchChange={setProveedorSearchText}
            savedFilters={savedFiltersProv}
            {...makeSavedFilterHandlersC(setSavedFiltersProv, setActiveFiltersProv, setActiveGroupByProv, setProveedorSearchText)}
            totalCount={proveedores.length}
            filteredCount={filteredProveedores.length}
          />
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

    const estadoColor: Record<string, string> = {
      borrador:        "bg-gray-100 text-gray-700",
      confirmada:      "bg-blue-100 text-blue-700",
      recibida_parcial:"bg-amber-100 text-amber-700",
      recibida:        "bg-green-100 text-green-700",
      cancelada:       "bg-red-100 text-red-700",
    }
    const estadoLabel: Record<string, string> = {
      borrador:        "Borrador",
      confirmada:      "Confirmada",
      recibida_parcial:"Recibida parcial",
      recibida:        "Recibida",
      cancelada:       "Cancelada",
    }

    const ocsFiltradas = ordenesCompra.filter(oc => {
      const matchEstado = ocFiltroEstado === "todos" || oc.estado === ocFiltroEstado
      const matchMetodo = ocFiltroMetodo === "todos" || oc.metodo_compra === ocFiltroMetodo
      const q = ocBusqueda.toLowerCase()
      const matchBusqueda = !q ||
        oc.numero.toLowerCase().includes(q) ||
        oc.proveedor_nombre.toLowerCase().includes(q) ||
        oc.lineas.some(l => l.producto_nombre.toLowerCase().includes(q))
      return matchEstado && matchMetodo && matchBusqueda
    })

    const recsPendientes = ordenesCompra.filter(o => o.estado === 'confirmada' || o.estado === 'recibida_parcial').length

    return (
      <div>
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
            <p className="text-gray-500 mt-1 text-sm">Gestione las órdenes de compra a proveedores</p>
          </div>
          <button
            onClick={() => {
              setNuevaOC({
                sucursal: "", proveedor_id: 0, proveedor_nombre: "", termino_pago: "Contado",
                tipo_compra: "nacional", metodo_compra: "estandar",
                fecha: new Date().toISOString().slice(0, 10), fecha_entrega_estimada: "",
                deposito_destino: "", ubicacion_destino: "", moneda: "ARS", tipo_cambio: 1,
                observaciones: "", lineas: []
              })
              setCreandoOC(true)
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva OC
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total OC</p>
            <p className="text-2xl font-bold text-gray-900">{ordenesCompra.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Borradores</p>
            <p className="text-2xl font-bold text-gray-600">{ordenesCompra.filter(o => o.estado === 'borrador').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pend. Recepción</p>
            <p className="text-2xl font-bold text-amber-600">{recsPendientes}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-600">{ordenesCompra.filter(o => o.estado === 'recibida').length}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="ordenes-compra"
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "borrador", label: "Borrador" },
                { value: "confirmada", label: "Confirmada" },
                { value: "recibida_parcial", label: "Recibida parcial" },
                { value: "recibida", label: "Recibida" },
                { value: "cancelada", label: "Cancelada" },
              ]},
              { field: "metodo_compra", label: "Método", values: [
                { value: "estandar", label: "Estándar" },
                { value: "inmediato", label: "Inmediato" },
              ]},
              { field: "moneda", label: "Moneda", values: [
                { value: "ARS", label: "ARS" },
                { value: "USD", label: "USD" },
                { value: "EUR", label: "EUR" },
              ]},
            ]}
            groupByOptions={[
              { id: "estado", label: "Estado", field: "estado" },
              { id: "proveedor", label: "Proveedor", field: "proveedor" },
              { id: "sucursal", label: "Sucursal", field: "sucursal" },
              { id: "metodo_compra", label: "Método de Compra", field: "metodo_compra" },
            ]}
            activeFilters={activeFiltersOC}
            activeGroupBy={activeGroupByOC}
            searchTerm={ocBusqueda}
            onFiltersChange={f => {
              setActiveFiltersOC(f)
              setOcFiltroEstado((f.find(x => x.field === "estado")?.value as any) ?? "todos")
              setOcFiltroMetodo((f.find(x => x.field === "metodo_compra")?.value as any) ?? "todos")
            }}
            onGroupByChange={setActiveGroupByOC}
            onSearchChange={setOcBusqueda}
            savedFilters={savedFiltersOC}
            {...makeSavedFilterHandlersC(setSavedFiltersOC, setActiveFiltersOC, setActiveGroupByOC, setOcBusqueda)}
            totalCount={ordenesCompra.length}
            filteredCount={ocsFiltradas.length}
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4">N° OC</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Sucursal</th>
                <th className="text-center py-3 px-4">Método</th>
                <th className="text-left py-3 px-4">Moneda</th>
                <th className="text-right py-3 px-4">Total</th>
                <th className="text-center py-3 px-4">Recepción</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ocsFiltradas.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-gray-400">
                    No se encontraron órdenes de compra
                  </td>
                </tr>
              )}
              {ocsFiltradas.map(oc => {
                const recsVinculadas = recepciones.filter(r => r.documento_origen_id === oc.id)
                const recEstado = recsVinculadas.length === 0 ? null :
                  recsVinculadas.every(r => r.estado === 'recibida') ? 'recibida' :
                  recsVinculadas.some(r => r.estado === 'recibida') ? 'parcial' : 'esperando'
                return (
                  <tr
                    key={oc.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setSelectedOC(oc); setOcTabActivo("productos") }}
                  >
                    <td className="py-3 px-4 font-medium text-blue-700">{oc.numero}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(oc.fecha)}</td>
                    <td className="py-3 px-4 text-sm font-medium">{oc.proveedor_nombre}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{oc.sucursal || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        oc.metodo_compra === 'inmediato' ? 'bg-cyan-100 text-cyan-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {oc.metodo_compra === 'inmediato' ? 'Inmediato' : 'Estándar'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{oc.moneda}</td>
                    <td className="py-3 px-4 text-right font-medium text-sm">
                      {formatCurrency(oc.total, oc.moneda)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {recEstado === null ? <span className="text-gray-300 text-xs">-</span> :
                       recEstado === 'recibida' ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Recibida</span> :
                       recEstado === 'parcial' ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Parcial</span> :
                       <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Esperando</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[oc.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {estadoLabel[oc.estado] || oc.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <ChevronRight className="w-4 h-4 text-gray-400" />
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

  const confirmarOC = (oc: OrdenCompra) => {
    const ahora = new Date().toISOString()
    const nuevoId = Math.max(...recepciones.map(r => r.id), 0) + 1
    const esInmediato = oc.metodo_compra === 'inmediato'

    const nuevaRec: Recepcion = {
      id: nuevoId,
      numero: `REC-${String(nuevoId).padStart(5, '0')}`,
      fecha: ahora,
      sucursal: oc.sucursal,
      proveedor_id: oc.proveedor_id,
      proveedor_nombre: oc.proveedor_nombre,
      deposito_destino: oc.deposito_destino,
      ubicacion_destino: oc.ubicacion_destino,
      documento_origen_tipo: "oc",
      documento_origen_id: oc.id,
      documento_origen_ref: oc.numero,
      orden_compra_id: oc.id,
      orden_compra_numero: oc.numero,
      fecha_pedido: oc.fecha.slice(0, 10),
      fecha_entrega_esperada: oc.fecha_entrega_estimada,
      estado: esInmediato ? "recibida" : "esperando_recepcion",
      fecha_recepcion_real: esInmediato ? ahora : undefined,
      lineas: oc.lineas.map(l => ({
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre,
        producto_sku: l.producto_nombre.substring(0, 8).toUpperCase().replace(/\s/g, '-'),
        tiene_serie: false,
        cantidad_pedida: l.cantidad,
        cantidad_recibida: esInmediato ? l.cantidad : 0,
        udm: "un",
        precio_unitario: l.precio_unitario,
        estado_linea: esInmediato ? "recibido" : "pendiente"
      }))
    }

    const ocConfirmada: OrdenCompra = {
      ...oc,
      estado: esInmediato ? "recibida" : "confirmada",
      lineas: oc.lineas.map(l => ({
        ...l,
        cantidad_recibida: esInmediato ? l.cantidad : 0
      }))
    }

    setRecepciones(prev => [...prev, nuevaRec])
    setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? ocConfirmada : o))
    setSelectedOC(ocConfirmada)
  }

  const renderFichaOC = () => {
    if (!selectedOC) return null
    const oc = selectedOC
    const editable = oc.estado === 'borrador'

    const estadoColor: Record<string, string> = {
      borrador:        "bg-gray-100 text-gray-700",
      confirmada:      "bg-blue-100 text-blue-700",
      recibida_parcial:"bg-amber-100 text-amber-700",
      recibida:        "bg-green-100 text-green-700",
      cancelada:       "bg-red-100 text-red-700",
    }
    const estadoLabel: Record<string, string> = {
      borrador:        "Borrador",
      confirmada:      "Confirmada",
      recibida_parcial:"Recibida parcial",
      recibida:        "Recibida",
      cancelada:       "Cancelada",
    }

    const recsVinculadas = recepciones.filter(r => r.documento_origen_id === oc.id)
    const facturasVinculadas = facturasCompra.filter(f => f.orden_compra_id === oc.id)
    const totalRecibido = oc.lineas.reduce((s, l) => s + l.cantidad_recibida, 0)
    const totalPedido = oc.lineas.reduce((s, l) => s + l.cantidad, 0)

    const tabs = [
      { key: "productos",     label: "Productos",                           count: oc.lineas.length },
      { key: "recepciones",   label: "Entregas / Recepciones",              count: recsVinculadas.length },
      { key: "facturas",      label: "Facturas vinculadas",                 count: facturasVinculadas.length },
      { key: "observaciones", label: "Observaciones",                       count: null },
    ] as const

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setSelectedOC(null)} className="hover:text-blue-600">Ordenes de Compra</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{oc.numero}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedOC(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{oc.numero}</h1>
              <p className="text-sm text-gray-500">{formatDate(oc.fecha)} | {oc.proveedor_nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <>
                <button
                  onClick={() => confirmarOC(oc)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar
                </button>
                <button
                  onClick={() => setOcModalCancelacionOpen(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Eliminar
                </button>
              </>
            )}
            {(oc.estado === 'confirmada' || oc.estado === 'recibida_parcial') && oc.metodo_compra === 'estandar' && (
              <button
                onClick={() => setOcTabActivo("recepciones")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full hover:bg-emerald-100"
              >
                <Truck className="w-3.5 h-3.5" />
                Recepciones ({recsVinculadas.length})
              </button>
            )}
            {(oc.estado === 'confirmada' || oc.estado === 'recibida') && oc.metodo_compra === 'inmediato' && (
              <button
                onClick={() => setOcTabActivo("facturas")}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-100"
              >
                <FileText className="w-3.5 h-3.5" />
                Crear Factura
              </button>
            )}
            {!editable && (
              <button
                onClick={() => setOcModalCancelacionOpen(true)}
                className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50"
              >
                Cancelar OC
              </button>
            )}
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${estadoColor[oc.estado] || 'bg-gray-100 text-gray-700'}`}>
              {estadoLabel[oc.estado] || oc.estado}
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="bg-white rounded-lg border px-6 py-4 mb-4">
          <div className="flex items-center gap-0">
            {(['borrador', 'confirmada', 'recibida'] as const).map((step, idx) => {
              const stepLabel = { borrador: 'Borrador', confirmada: 'Confirmada', recibida: 'Recibida' }[step]
              const stepsDone = ['borrador', 'confirmada', 'recibida'].indexOf(oc.estado)
              const isCurrent = oc.estado === step || (oc.estado === 'recibida_parcial' && step === 'confirmada')
              const isDone = stepsDone > idx || oc.estado === 'recibida'
              return (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      oc.estado === 'cancelada' ? 'bg-red-100 text-red-600' :
                      isDone ? 'bg-blue-600 text-white' :
                      isCurrent ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone && oc.estado !== 'cancelada' ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-medium ${isCurrent || isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {stepLabel}
                    </span>
                  </div>
                  {idx < 2 && <div className={`flex-1 h-0.5 mx-3 ${isDone ? 'bg-blue-400' : 'bg-gray-200'}`} />}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Cabecera datos */}
        <div className="bg-white rounded-lg border p-6 mb-4">
          <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sucursal</p>
              <p className="font-medium">{oc.sucursal || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Proveedor</p>
              <p className="font-medium">{oc.proveedor_nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Término de Pago</p>
              <p className="font-medium">{oc.termino_pago || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo de Compra</p>
              <p className="font-medium">{oc.tipo_compra || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Método de Compra</p>
              <p className={`font-medium ${oc.metodo_compra === 'inmediato' ? 'text-cyan-700' : 'text-indigo-700'}`}>
                {oc.metodo_compra === 'inmediato' ? 'Inmediato' : 'Estándar'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Moneda</p>
              <p className="font-medium">{oc.moneda}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Pedido</p>
              <p className="font-medium">{formatDate(oc.fecha)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Entrega Estimada</p>
              <p className="font-medium">{oc.fecha_entrega_estimada ? formatDate(oc.fecha_entrega_estimada) : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Depósito Destino</p>
              <p className="font-medium">{oc.deposito_destino || '-'}{oc.ubicacion_destino ? ` / ${oc.ubicacion_destino}` : ''}</p>
            </div>
          </div>
          {oc.cancelacion && (
            <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Cancelación</p>
              <p className="text-sm text-red-700"><span className="font-medium">{oc.cancelacion.usuario}</span> — {new Date(oc.cancelacion.fecha).toLocaleString('es-AR')}</p>
              <p className="text-sm text-red-600 mt-1">{oc.cancelacion.motivo}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex border-b">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setOcTabActivo(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  ocTabActivo === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                    ocTabActivo === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Productos */}
          {ocTabActivo === "productos" && (
            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4">Descripcion</th>
                    <th className="text-right py-3 px-4">Cant.</th>
                    <th className="text-right py-3 px-4">Recibido</th>
                    <th className="text-right py-3 px-4">Precio Unit.</th>
                    <th className="text-right py-3 px-4">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {oc.lineas.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">Sin líneas</td></tr>
                  )}
                  {oc.lineas.map((l, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{l.producto_nombre}</td>
                      <td className="py-3 px-4 text-gray-500">{l.descripcion || '-'}</td>
                      <td className="py-3 px-4 text-right">{l.cantidad}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={l.cantidad_recibida > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                          {l.cantidad_recibida}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(l.precio_unitario, oc.moneda)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(l.subtotal, oc.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-sm text-gray-500">
                      {totalPedido > 0 && (
                        <span>{totalRecibido} de {totalPedido} unidades recibidas</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Total</td>
                    <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                      {formatCurrency(oc.total, oc.moneda)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Tab: Recepciones */}
          {ocTabActivo === "recepciones" && (
            <div className="p-4">
              {recsVinculadas.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No hay recepciones generadas aún</p>
              ) : (
                <div className="space-y-2">
                  {recsVinculadas.map(r => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRecepcion(r)
                        setRecepcionCantidades(Object.fromEntries(r.lineas.map(l => [l.producto_id, l.cantidad_recibida])))
                        setSelectedOC(null)
                        setActiveView("recepciones")
                      }}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 text-sm border border-gray-100"
                    >
                      <span className="font-medium text-emerald-700">{r.numero}</span>
                      <span className="text-gray-500">{new Date(r.fecha).toLocaleDateString('es-AR')}</span>
                      <span className="text-gray-500">{r.lineas.length} producto{r.lineas.length !== 1 ? 's' : ''}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.estado === 'recibida' ? 'bg-green-100 text-green-700' :
                        r.estado === 'esperando_recepcion' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.estado === 'recibida' ? 'Recibida' : r.estado === 'esperando_recepcion' ? 'Esperando recepcion' : 'Cancelada'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
              {(oc.estado === 'confirmada' || oc.estado === 'recibida_parcial') && oc.metodo_compra === 'estandar' && (
                <div className="mt-4 text-xs text-gray-400 text-center">
                  Las recepciones se generan automáticamente al confirmar la OC
                </div>
              )}
            </div>
          )}

          {/* Tab: Facturas */}
          {ocTabActivo === "facturas" && (
            <div className="p-4">
              {facturasVinculadas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 mb-4">No hay facturas vinculadas aún</p>
                  {oc.metodo_compra === 'inmediato' && oc.estado !== 'borrador' && (
                    <button className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      <Plus className="w-4 h-4" />
                      Crear Factura de Compra
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {facturasVinculadas.map(f => (
                    <div key={f.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                      <span className="font-medium text-blue-700">{f.numero}</span>
                      <span className="text-gray-500">{formatDate(f.fecha)}</span>
                      <span className="font-medium">{formatCurrency(f.total, oc.moneda)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.estado === 'pagada' ? 'bg-green-100 text-green-700' :
                        f.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{f.estado}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Observaciones */}
          {ocTabActivo === "observaciones" && (
            <div className="p-6">
              {editable ? (
                <textarea
                  defaultValue={oc.observaciones || ''}
                  rows={6}
                  placeholder="Notas internas sobre esta orden de compra (no se comparte con el proveedor)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  onChange={e => setSelectedOC({ ...oc, observaciones: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{oc.observaciones || 'Sin observaciones.'}</p>
              )}
            </div>
          )}
        </div>

        {/* Modal cancelación OC */}
        {ocModalCancelacionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold text-gray-900">{editable ? 'Eliminar OC' : 'Cancelar OC'}</h2>
                <button onClick={() => { setOcModalCancelacionOpen(false); setOcCancelacionMotivo("") }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4">
                {!editable && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                      {recsVinculadas.some(r => r.estado === 'recibida')
                        ? 'Existe una recepción confirmada vinculada. Cancela primero la recepción para poder cancelar la OC.'
                        : 'Esta acción cancelará también las recepciones en estado "Esperando recepción" vinculadas.'}
                    </div>
                  </div>
                )}
                {recsVinculadas.some(r => r.estado === 'recibida') ? (
                  <div className="text-center py-2">
                    <button onClick={() => setOcModalCancelacionOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cerrar</button>
                  </div>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={ocCancelacionMotivo}
                      onChange={e => setOcCancelacionMotivo(e.target.value)}
                      rows={3}
                      placeholder="Motivo..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none"
                    />
                    <div className="flex items-center justify-end gap-3 mt-4">
                      <button onClick={() => { setOcModalCancelacionOpen(false); setOcCancelacionMotivo("") }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Volver</button>
                      <button
                        disabled={!ocCancelacionMotivo.trim()}
                        onClick={() => {
                          if (!ocCancelacionMotivo.trim()) return
                          if (editable) {
                            setOrdenesCompra(prev => prev.filter(o => o.id !== oc.id))
                            setSelectedOC(null)
                          } else {
                            const ocCancelada = { ...oc, estado: 'cancelada' as const, cancelacion: { usuario: 'Admin', fecha: new Date().toISOString(), motivo: ocCancelacionMotivo.trim() } }
                            setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? ocCancelada : o))
                            setSelectedOC(ocCancelada)
                            // cancelar recepciones pendientes vinculadas
                            setRecepciones(prev => prev.map(r =>
                              r.documento_origen_id === oc.id && r.estado === 'esperando_recepcion'
                                ? { ...r, estado: 'cancelada' as const, cancelacion: { usuario: 'Admin', fecha: new Date().toISOString(), motivo: `OC cancelada: ${ocCancelacionMotivo.trim()}` } }
                                : r
                            ))
                          }
                          setOcModalCancelacionOpen(false)
                          setOcCancelacionMotivo("")
                        }}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-40"
                      >
                        {editable ? 'Eliminar' : 'Confirmar Cancelación'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCrearOC = () => {
    const oc = nuevaOC
    const totalOC = oc.lineas.reduce((s, l) => s + l.subtotal, 0)

    const guardarOC = () => {
      if (!oc.proveedor_nombre || !oc.deposito_destino || oc.lineas.length === 0) {
        alert("Complete proveedor, depósito destino y al menos una línea.")
        return
      }
      const nuevoId = Math.max(...ordenesCompra.map(o => o.id), 0) + 1
      const nuevaOrden: OrdenCompra = {
        id: nuevoId,
        numero: `OC-${String(nuevoId).padStart(5, '0')}`,
        fecha: oc.fecha || new Date().toISOString().slice(0, 10),
        sucursal: oc.sucursal || "",
        proveedor_id: oc.proveedor_id || 0,
        proveedor_nombre: oc.proveedor_nombre || "",
        termino_pago: oc.termino_pago || "Contado",
        tipo_compra: oc.tipo_compra || "nacional",
        metodo_compra: oc.metodo_compra || "estandar",
        estado: "borrador",
        fecha_entrega_estimada: oc.fecha_entrega_estimada || "",
        deposito_destino: oc.deposito_destino || "",
        ubicacion_destino: oc.ubicacion_destino || "",
        moneda: oc.moneda || "ARS",
        tipo_cambio: oc.tipo_cambio || 1,
        subtotal: totalOC,
        impuestos: 0,
        total: totalOC,
        observaciones: oc.observaciones || "",
        lineas: oc.lineas
      }
      setOrdenesCompra(prev => [...prev, nuevaOrden])
      setCreandoOC(false)
      setSelectedOC(nuevaOrden)
      setOcTabActivo("productos")
    }

    return (
      <div>
        {/* Acciones guardar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={guardarOC}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={() => setCreandoOC(false)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
            Descartar
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setCreandoOC(false)} className="hover:text-blue-600">Ordenes de Compra</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Nueva OC</span>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <BotonVolver onClick={() => setCreandoOC(false)} variant="minimal" texto="" />
          <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Compra</h1>
        </div>

        {/* Cabecera */}
        <div className="bg-white rounded-lg border p-6 mb-4">
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">N° de OC</label>
                <p className="text-sm text-gray-400 italic">Generado automáticamente</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Sucursal <span className="text-red-500">*</span></label>
                <select
                  value={oc.sucursal || ""}
                  onChange={e => setNuevaOC(prev => ({ ...prev, sucursal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar sucursal...</option>
                  <option value="Puerto Norte">Puerto Norte</option>
                  <option value="Centro">Centro</option>
                  <option value="Sur">Sur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Proveedor <span className="text-red-500">*</span></label>
                {proveedores.length > 0 ? (
                  <select
                    value={oc.proveedor_id || ""}
                    onChange={e => {
                      const p = proveedores.find(p => p.id === Number(e.target.value))
                      if (p) setNuevaOC(prev => ({ ...prev, proveedor_id: p.id, proveedor_nombre: p.nombre, moneda: p.moneda_habitual }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={oc.proveedor_nombre || ""}
                    onChange={e => setNuevaOC(prev => ({ ...prev, proveedor_nombre: e.target.value }))}
                    placeholder="Nombre del proveedor..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Termino de Pago</label>
                <select
                  value={oc.termino_pago || "Contado"}
                  onChange={e => setNuevaOC(prev => ({ ...prev, termino_pago: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option>Contado</option>
                  <option>30 dias</option>
                  <option>60 dias</option>
                  <option>90 dias</option>
                  <option>Anticipado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo de Compra</label>
                <select
                  value={oc.tipo_compra || "nacional"}
                  onChange={e => setNuevaOC(prev => ({ ...prev, tipo_compra: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="nacional">Compra Nacional</option>
                  <option value="importacion">Importacion</option>
                  <option value="reposicion">Reposicion</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Metodo de Compra <span className="text-red-500">*</span></label>
                <select
                  value={oc.metodo_compra}
                  onChange={(e) => setNuevaOC(prev => ({ ...prev, metodo_compra: e.target.value as "estandar" | "inmediato" }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="estandar">Estándar — Mercadería llega en fecha futura</option>
                  <option value="inmediato">Inmediato — Mercadería ingresa en el momento</option>
                </select>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Pedido</label>
                <input
                  type="date"
                  value={oc.fecha || ""}
                  onChange={e => setNuevaOC(prev => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Entrega Estimada</label>
                <input
                  type="date"
                  value={oc.fecha_entrega_estimada || ""}
                  onChange={e => setNuevaOC(prev => ({ ...prev, fecha_entrega_estimada: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Deposito Destino <span className="text-red-500">*</span></label>
                <select
                  value={oc.deposito_destino || ""}
                  onChange={e => setNuevaOC(prev => ({ ...prev, deposito_destino: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar deposito...</option>
                  <option value="Deposito Principal">Deposito Principal</option>
                  <option value="Deposito Usados">Deposito Usados</option>
                  <option value="Deposito Reparacion">Deposito Reparacion</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Ubicacion Destino</label>
                <input
                  type="text"
                  value={oc.ubicacion_destino || ""}
                  onChange={e => setNuevaOC(prev => ({ ...prev, ubicacion_destino: e.target.value }))}
                  placeholder="Ej: Estante A1..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Moneda</label>
                <select
                  value={oc.moneda || "ARS"}
                  onChange={e => setNuevaOC(prev => ({ ...prev, moneda: e.target.value as "ARS" | "USD" | "EUR" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dolar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Grilla de productos */}
        <div className="bg-white rounded-lg border overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-sm text-gray-900">Productos</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-2.5 px-4">Producto</th>
                <th className="text-left py-2.5 px-4">Descripcion</th>
                <th className="text-right py-2.5 px-4 w-24">Cantidad</th>
                <th className="text-right py-2.5 px-4 w-36">Precio Unit.</th>
                <th className="text-right py-2.5 px-4 w-32">Subtotal</th>
                <th className="w-10 py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {oc.lineas.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    No hay productos. Agregue una linea para comenzar.
                  </td>
                </tr>
              )}
              {oc.lineas.map((linea, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={linea.producto_nombre}
                      onChange={e => {
                        const updated = [...oc.lineas]
                        updated[idx] = { ...updated[idx], producto_nombre: e.target.value }
                        setNuevaOC(prev => ({ ...prev, lineas: updated }))
                      }}
                      placeholder="Nombre del producto..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={linea.descripcion}
                      onChange={e => {
                        const updated = [...oc.lineas]
                        updated[idx] = { ...updated[idx], descripcion: e.target.value }
                        setNuevaOC(prev => ({ ...prev, lineas: updated }))
                      }}
                      placeholder="Descripcion..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      min={1}
                      value={linea.cantidad}
                      onChange={e => {
                        const updated = [...oc.lineas]
                        const cant = Math.max(1, Number(e.target.value))
                        updated[idx] = { ...updated[idx], cantidad: cant, subtotal: cant * updated[idx].precio_unitario }
                        setNuevaOC(prev => ({ ...prev, lineas: updated }))
                      }}
                      className="w-full text-right px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      min={0}
                      value={linea.precio_unitario}
                      onChange={e => {
                        const updated = [...oc.lineas]
                        const precio = Math.max(0, Number(e.target.value))
                        updated[idx] = { ...updated[idx], precio_unitario: precio, subtotal: updated[idx].cantidad * precio }
                        setNuevaOC(prev => ({ ...prev, lineas: updated }))
                      }}
                      className="w-full text-right px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-gray-700">
                    {formatCurrency(linea.subtotal, oc.moneda)}
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => setNuevaOC(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== idx) }))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-gray-50">
              <tr>
                <td colSpan={3} className="py-3 px-4">
                  <button
                    onClick={() => setNuevaOC(prev => ({
                      ...prev,
                      lineas: [...prev.lineas, {
                        producto_id: Date.now(),
                        producto_nombre: "",
                        descripcion: "",
                        cantidad: 1,
                        cantidad_recibida: 0,
                        precio_unitario: 0,
                        descuento: 0,
                        subtotal: 0
                      }]
                    }))}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar linea
                  </button>
                </td>
                <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Total</td>
                <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                  {formatCurrency(totalOC, oc.moneda)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
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
  // LÓGICA CONFIRMAR RECEPCIÓN
  // =====================================================
  const handleConfirmarRecepcion = () => {
    if (!selectedRecepcion) return
    const rec = selectedRecepcion

    // Validación: cantidades > 0
    const lineasConCantidad = rec.lineas.filter(l => (recepcionCantidades[l.producto_id] ?? 0) > 0)
    if (lineasConCantidad.length === 0) {
      alert("Debe ingresar al menos una cantidad recibida mayor a 0.")
      return
    }

    // Validación: series registradas para productos con serie
    for (const linea of rec.lineas) {
      if (!linea.tiene_serie) continue
      const cantRequerida = recepcionCantidades[linea.producto_id] ?? 0
      if (cantRequerida === 0) continue
      const seriesDelProducto = seriesConfirmadas[linea.producto_id] || []
      if (seriesDelProducto.length < cantRequerida) {
        alert(`Debe registrar los N° de serie para: ${linea.producto_nombre}`)
        setModalSerieProducto(linea)
        setModalSerieUnidades(seriesDelProducto.length > 0 ? seriesDelProducto : Array.from({ length: cantRequerida }, () => ({ nro_serie: '', outlet: false })))
        setModalSerieOpen(true)
        return
      }
    }

    const ahora = new Date().toISOString()
    const lineasActualizadas: RecepcionLinea[] = rec.lineas.map(l => {
      const cantRec = recepcionCantidades[l.producto_id] ?? 0
      const estadoLinea: RecepcionLinea['estado_linea'] = cantRec === 0
        ? 'pendiente'
        : cantRec < l.cantidad_pedida
        ? 'recibido_parcial'
        : 'recibido'
      return {
        ...l,
        cantidad_recibida: cantRec,
        estado_linea: estadoLinea,
        unidades_serie: l.tiene_serie ? (seriesConfirmadas[l.producto_id] || []) : l.unidades_serie
      }
    })

    // Determinar si hay recepción parcial
    const hayParcial = lineasActualizadas.some(l => l.estado_linea === 'recibido_parcial')

    // Generar recepción complementaria si hay parcial
    let recCompId: number | undefined = undefined
    if (hayParcial) {
      const lineasPendientes: RecepcionLinea[] = lineasActualizadas
        .filter(l => l.cantidad_pedida - l.cantidad_recibida > 0)
        .map(l => ({
          ...l,
          cantidad_pedida: l.cantidad_pedida - l.cantidad_recibida,
          cantidad_recibida: 0,
          estado_linea: 'pendiente' as const,
          unidades_serie: []
        }))

      if (lineasPendientes.length > 0) {
        const nuevoId = Math.max(...recepciones.map(r => r.id)) + 1
        recCompId = nuevoId
        const recComp: Recepcion = {
          ...rec,
          id: nuevoId,
          numero: `REC-${String(nuevoId).padStart(5, '0')}`,
          fecha: ahora,
          estado: 'esperando_recepcion',
          fecha_recepcion_real: undefined,
          remito_numero: undefined,
          remito_fecha: undefined,
          recepcion_anterior_id: rec.id,
          recepcion_complementaria_id: undefined,
          lineas: lineasPendientes,
          cancelacion: undefined
        }
        setRecepciones(prev => [...prev, recComp])
      }
    }

    // Actualizar la recepción actual
    const recActualizada: Recepcion = {
      ...rec,
      estado: 'recibida',
      fecha_recepcion_real: ahora,
      lineas: lineasActualizadas,
      recepcion_complementaria_id: recCompId
    }
    setRecepciones(prev => prev.map(r => r.id === rec.id ? recActualizada : r))
    setSelectedRecepcion(recActualizada)

    // Actualizar OC vinculada
    if (rec.documento_origen_tipo === 'oc' && rec.documento_origen_id) {
      setOrdenesCompra(prev => prev.map(oc => {
        if (oc.id !== rec.documento_origen_id) return oc
        const todasRecibidas = lineasActualizadas.every(l => l.estado_linea === 'recibido')
        return {
          ...oc,
          estado: todasRecibidas && !hayParcial ? 'recibida' : 'recibida_parcial',
          lineas: oc.lineas.map(ol => {
            const linRec = lineasActualizadas.find(l => l.producto_id === ol.producto_id)
            return linRec ? { ...ol, cantidad_recibida: ol.cantidad_recibida + linRec.cantidad_recibida } : ol
          })
        }
      }))
    }

    // Limpiar estado temporal
    setSeriesConfirmadas({})
    setRecepcionCantidades({})
  }

  // =====================================================
  // RENDER RECEPCIONES
  // =====================================================
  const renderRecepciones = () => {
    if (selectedRecepcion) return renderFichaRecepcion()

    const estadoColor: Record<string, string> = {
      recibida:             'bg-green-100 text-green-700',
      esperando_recepcion:  'bg-amber-100 text-amber-700',
      cancelada:            'bg-red-100 text-red-700',
    }
    const estadoLabel: Record<string, string> = {
      recibida:             'Recibida',
      esperando_recepcion:  'Esperando Recepción',
      cancelada:            'Cancelada',
    }
    const origenLabel: Record<string, string> = {
      oc:           'Orden de Compra',
      toma_equipo:  'Toma de Equipo',
      transferencia:'Transferencia',
    }

    const recepcionesFiltradas = recepciones.filter(r => {
      const matchEstado = recepcionFiltroEstado === "todos" || r.estado === recepcionFiltroEstado
      const q = recepcionBusqueda.toLowerCase()
      const matchBusqueda = !q ||
        r.numero.toLowerCase().includes(q) ||
        (r.proveedor_nombre || '').toLowerCase().includes(q) ||
        r.documento_origen_ref.toLowerCase().includes(q) ||
        r.lineas.some(l =>
          l.producto_nombre.toLowerCase().includes(q) ||
          l.producto_sku.toLowerCase().includes(q) ||
          (l.unidades_serie || []).some(u => u.nro_serie.toLowerCase().includes(q))
        )
      return matchEstado && matchBusqueda
    })

    return (
      <div>
        {/* Cabecera */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recepciones de Compra</h1>
            <p className="text-gray-500 mt-1 text-sm">Las recepciones se generan automáticamente desde Órdenes de Compra, Tomas de Equipo y Transferencias.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>No se crean manualmente</span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{recepciones.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Esperando Recepción</p>
            <p className="text-2xl font-bold text-amber-600">{recepciones.filter(r => r.estado === 'esperando_recepcion').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recibidas</p>
            <p className="text-2xl font-bold text-green-600">{recepciones.filter(r => r.estado === 'recibida').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Canceladas</p>
            <p className="text-2xl font-bold text-red-600">{recepciones.filter(r => r.estado === 'cancelada').length}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="recepciones"
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "esperando_recepcion", label: "Esperando recepción" },
                { value: "recibida", label: "Recibida" },
                { value: "cancelada", label: "Cancelada" },
              ]},
              { field: "origen", label: "Origen", values: [
                { value: "oc", label: "Orden de Compra" },
                { value: "devolucion", label: "Devolución" },
                { value: "toma_equipo", label: "Toma de Equipo" },
              ]},
            ]}
            groupByOptions={[
              { id: "estado", label: "Estado", field: "estado" },
              { id: "proveedor", label: "Proveedor", field: "proveedor" },
              { id: "sucursal", label: "Sucursal", field: "sucursal" },
              { id: "origen", label: "Origen", field: "origen" },
            ]}
            activeFilters={activeFiltersRec}
            activeGroupBy={activeGroupByRec}
            searchTerm={recepcionBusqueda}
            onFiltersChange={f => {
              setActiveFiltersRec(f)
              setRecepcionFiltroEstado((f.find(x => x.field === "estado")?.value as any) ?? "todos")
            }}
            onGroupByChange={setActiveGroupByRec}
            onSearchChange={setRecepcionBusqueda}
            savedFilters={savedFiltersRec}
            {...makeSavedFilterHandlersC(setSavedFiltersRec, setActiveFiltersRec, setActiveGroupByRec, setRecepcionBusqueda)}
            totalCount={recepciones.length}
            filteredCount={recepcionesFiltradas.length}
          />
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4">N° Recepción</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Proveedor / Origen</th>
                <th className="text-left py-3 px-4">Sucursal / Depósito</th>
                <th className="text-left py-3 px-4">Doc. Origen</th>
                <th className="text-center py-3 px-4">Productos</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recepcionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">
                    No se encontraron recepciones
                  </td>
                </tr>
              )}
              {recepcionesFiltradas.map(rec => (
                <tr
                  key={rec.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedRecepcion(rec)
                    setRecepcionCantidades(
                      Object.fromEntries(rec.lineas.map(l => [l.producto_id, l.cantidad_recibida]))
                    )
                  }}
                >
                  <td className="py-3 px-4 font-medium text-emerald-700">{rec.numero}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{new Date(rec.fecha).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className="font-medium">{rec.proveedor_nombre || '-'}</span>
                    <span className="ml-2 text-xs text-gray-400">{origenLabel[rec.documento_origen_tipo]}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <span>{rec.sucursal}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span>{rec.deposito_destino}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-blue-600 font-medium">{rec.documento_origen_ref}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-sm">{rec.lineas.length}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[rec.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {estadoLabel[rec.estado] || rec.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
  // RENDER FICHA RECEPCION
  // =====================================================
  const renderFichaRecepcion = () => {
    if (!selectedRecepcion) return null
    const rec = selectedRecepcion
    const editable = rec.estado === "esperando_recepcion"

    const estadoColor: Record<string, string> = {
      recibida:             'bg-green-100 text-green-700',
      esperando_recepcion:  'bg-amber-100 text-amber-700',
      cancelada:            'bg-red-100 text-red-700',
    }
    const estadoLabel: Record<string, string> = {
      recibida:             'Recibida',
      esperando_recepcion:  'Esperando Recepción',
      cancelada:            'Cancelada',
    }
    const estadoLineaColor: Record<string, string> = {
      pendiente:        'bg-gray-100 text-gray-600',
      recibido:         'bg-green-100 text-green-700',
      recibido_parcial: 'bg-amber-100 text-amber-700',
    }
    const estadoLineaLabel: Record<string, string> = {
      pendiente:        'Pendiente',
      recibido:         'Recibido',
      recibido_parcial: 'Parcial',
    }
    const origenLabel: Record<string, string> = {
      oc:           'Orden de Compra',
      toma_equipo:  'Toma de Equipo',
      transferencia:'Transferencia',
    }

    // Check si todas las cantidades recibidas = pedidas (para "Recibir todo")
    const todasCompletas = rec.lineas.every(l => (recepcionCantidades[l.producto_id] ?? l.cantidad_recibida) >= l.cantidad_pedida)

    const ocVinculada = rec.documento_origen_tipo === "oc" && rec.documento_origen_id
      ? ordenesCompra.find(o => o.id === rec.documento_origen_id)
      : null

    const recAnterior = rec.recepcion_anterior_id
      ? recepciones.find(r => r.id === rec.recepcion_anterior_id)
      : null

    const recComplementaria = rec.recepcion_complementaria_id
      ? recepciones.find(r => r.id === rec.recepcion_complementaria_id)
      : null

    return (
      <div>
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => setSelectedRecepcion(null)} className="hover:text-emerald-600">
            Recepciones
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{rec.numero}</span>
        </div>

        {/* Smart buttons de navegación cruzada */}
        {(ocVinculada || recAnterior || recComplementaria) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {ocVinculada && (
              <button
                onClick={() => { setSelectedOC(ocVinculada); setActiveView("ordenes_compra") }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Ver OC: {ocVinculada.numero}
              </button>
            )}
            {recAnterior && (
              <button
                onClick={() => {
                  setSelectedRecepcion(recAnterior)
                  setRecepcionCantidades(Object.fromEntries(recAnterior.lineas.map(l => [l.producto_id, l.cantidad_recibida])))
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Recepción anterior: {recAnterior.numero}
              </button>
            )}
            {recComplementaria && (
              <button
                onClick={() => {
                  setSelectedRecepcion(recComplementaria)
                  setRecepcionCantidades(Object.fromEntries(recComplementaria.lineas.map(l => [l.producto_id, l.cantidad_recibida])))
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full hover:bg-amber-100 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Recepción complementaria: {recComplementaria.numero}
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => setSelectedRecepcion(null)} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{rec.numero}</h1>
              <p className="text-sm text-gray-500">
                {new Date(rec.fecha).toLocaleDateString('es-AR')} | {rec.proveedor_nombre || 'Sin proveedor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {editable && (
              <button
                onClick={handleConfirmarRecepcion}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Recepción
              </button>
            )}
            {rec.estado === 'recibida' && (
              <button
                onClick={() => setModalCancelacionOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </button>
            )}
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${estadoColor[rec.estado]}`}>
              {estadoLabel[rec.estado]}
            </span>
          </div>
        </div>

        {/* Cabecera datos */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sucursal</p>
              <p className="font-medium">{rec.sucursal}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Depósito Destino</p>
              <p className="font-medium">{rec.deposito_destino}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ubicación</p>
              <p className="font-medium">{rec.ubicacion_destino || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Documento Origen</p>
              {ocVinculada ? (
                <button
                  onClick={() => { setSelectedOC(ocVinculada); setActiveView("ordenes_compra") }}
                  className="text-blue-600 font-medium hover:underline"
                >
                  {origenLabel[rec.documento_origen_tipo]}: {rec.documento_origen_ref}
                </button>
              ) : (
                <p className="font-medium">{origenLabel[rec.documento_origen_tipo]}: {rec.documento_origen_ref}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha Pedido</p>
              <p className="font-medium">{rec.fecha_pedido ? new Date(rec.fecha_pedido).toLocaleDateString('es-AR') : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Entrega Esperada</p>
              <p className="font-medium">{rec.fecha_entrega_esperada ? new Date(rec.fecha_entrega_esperada).toLocaleDateString('es-AR') : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha Recepción Real</p>
              <p className={`font-medium ${rec.fecha_recepcion_real ? 'text-green-700' : 'text-gray-400'}`}>
                {rec.fecha_recepcion_real ? new Date(rec.fecha_recepcion_real).toLocaleString('es-AR') : 'Pendiente'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Remito N°</p>
              {editable ? (
                <input
                  type="text"
                  defaultValue={rec.remito_numero || ''}
                  placeholder="Ingrese N° de remito"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500"
                  onChange={e => setSelectedRecepcion({ ...rec, remito_numero: e.target.value })}
                />
              ) : (
                <p className="font-medium">{rec.remito_numero || '-'}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha Remito</p>
              {editable ? (
                <input
                  type="date"
                  defaultValue={rec.remito_fecha || ''}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500"
                  onChange={e => setSelectedRecepcion({ ...rec, remito_fecha: e.target.value })}
                />
              ) : (
                <p className="font-medium">{rec.remito_fecha ? new Date(rec.remito_fecha).toLocaleDateString('es-AR') : '-'}</p>
              )}
            </div>
          </div>
          {(editable || rec.observaciones) && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Observaciones</p>
              {editable ? (
                <textarea
                  defaultValue={rec.observaciones || ''}
                  rows={2}
                  placeholder="Observaciones sobre la recepción..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 resize-none"
                  onChange={e => setSelectedRecepcion({ ...rec, observaciones: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-700">{rec.observaciones || '-'}</p>
              )}
            </div>
          )}
          {rec.cancelacion && (
            <div className="mt-4 pt-4 border-t border-red-200 bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-wide mb-1">Cancelación</p>
              <p className="text-sm text-red-700">
                <span className="font-medium">{rec.cancelacion.usuario}</span> — {new Date(rec.cancelacion.fecha).toLocaleString('es-AR')}
              </p>
              <p className="text-sm text-red-600 mt-1">{rec.cancelacion.motivo}</p>
            </div>
          )}
        </div>

        {/* Grilla de productos */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Líneas de Recepción</h3>
            {editable && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={todasCompletas}
                  onChange={e => {
                    if (e.target.checked) {
                      const nuevo: Record<number, number> = {}
                      rec.lineas.forEach(l => { nuevo[l.producto_id] = l.cantidad_pedida })
                      setRecepcionCantidades(nuevo)
                    } else {
                      const nuevo: Record<number, number> = {}
                      rec.lineas.forEach(l => { nuevo[l.producto_id] = 0 })
                      setRecepcionCantidades(nuevo)
                    }
                  }}
                  className="rounded border-gray-300 text-emerald-600"
                />
                Recibir todo
              </label>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-2.5 px-4">Producto</th>
                <th className="text-left py-2.5 px-4">SKU</th>
                <th className="text-center py-2.5 px-4">Cant. Pedida</th>
                <th className="text-center py-2.5 px-4">Cant. Recibida</th>
                <th className="text-center py-2.5 px-4">UdM</th>
                <th className="text-center py-2.5 px-4">Estado</th>
                {editable && <th className="text-center py-2.5 px-4">Serie/IMEI</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rec.lineas.map((linea, idx) => {
                const cantRec = recepcionCantidades[linea.producto_id] ?? linea.cantidad_recibida
                const estadoLinea = editable
                  ? (cantRec === 0 ? 'pendiente' : cantRec < linea.cantidad_pedida ? 'recibido_parcial' : 'recibido')
                  : linea.estado_linea
                const seriesRegistradas = (seriesConfirmadas[linea.producto_id] || []).length

                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{linea.producto_nombre}</td>
                    <td className="py-3 px-4 text-gray-500">{linea.producto_sku}</td>
                    <td className="py-3 px-4 text-center">{linea.cantidad_pedida}</td>
                    <td className="py-3 px-4 text-center">
                      {editable ? (
                        <input
                          type="number"
                          min={0}
                          max={linea.cantidad_pedida}
                          value={cantRec}
                          onChange={e => setRecepcionCantidades(prev => ({
                            ...prev,
                            [linea.producto_id]: Math.min(linea.cantidad_pedida, Math.max(0, Number(e.target.value)))
                          }))}
                          className="w-16 text-center px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="font-medium">{linea.cantidad_recibida}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-500">{linea.udm}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoLineaColor[estadoLinea]}`}>
                        {estadoLineaLabel[estadoLinea]}
                      </span>
                    </td>
                    {editable && (
                      <td className="py-3 px-4 text-center">
                        {linea.tiene_serie ? (
                          <button
                            onClick={() => {
                              setModalSerieProducto(linea)
                              setModalSerieUnidades(seriesConfirmadas[linea.producto_id] || Array.from({ length: cantRec }, () => ({ nro_serie: '', outlet: false })))
                              setModalSerieOpen(true)
                            }}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              seriesRegistradas >= cantRec && cantRec > 0
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {seriesRegistradas >= cantRec && cantRec > 0
                              ? `${seriesRegistradas} registradas`
                              : `Registrar (${seriesRegistradas}/${cantRec})`
                            }
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
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
    const facturasMock: { id: number; numero: string; fecha: string; proveedor: string; recepcion: string; subtotal: number; iva: number; total: number; estado: string }[] = []

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

        <div className="mb-4">
          <OdooFilterBar
            moduleName="facturas-compra"
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "pendiente", label: "Pendiente" },
                { value: "pagada", label: "Pagada" },
                { value: "vencida", label: "Vencida" },
              ]},
            ]}
            groupByOptions={[
              { id: "estado", label: "Estado", field: "estado" },
              { id: "proveedor", label: "Proveedor", field: "proveedor" },
            ]}
            activeFilters={activeFiltersFC}
            activeGroupBy={activeGroupByFC}
            searchTerm=""
            onFiltersChange={setActiveFiltersFC}
            onGroupByChange={setActiveGroupByFC}
            onSearchChange={() => {}}
            savedFilters={savedFiltersFC}
            {...makeSavedFilterHandlersC(setSavedFiltersFC, setActiveFiltersFC, setActiveGroupByFC, () => {})}
            totalCount={facturasMock.length}
            filteredCount={facturasMock.length}
          />
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
    const ncMock: { id: number; numero: string; fecha: string; proveedor: string; factura_origen: string; motivo: string; total: number; estado: string }[] = []

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
    const ndMock: { id: number; numero: string; fecha: string; proveedor: string; factura_origen: string; motivo: string; total: number; estado: string }[] = []

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
    const ordenesPagoMock: { id: number; numero: string; fecha: string; proveedor: string; facturas: string[]; monto: number; forma_pago: string; estado: string }[] = []

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
    const movimientosMock: { id: number; fecha: string; proveedor: string; tipo: string; numero: string; debe: number; haber: number }[] = []

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
    const tiposGastoMock: { id: number; codigo: string; nombre: string; activa_costo: boolean; criterio_distribucion: string }[] = []

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

      {/* ===== MODAL REGISTRO N° SERIE ===== */}
      {modalSerieOpen && modalSerieProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Registrar unidades — {modalSerieProducto.producto_nombre}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {modalSerieUnidades.filter(u => u.nro_serie.trim() !== '').length} de {recepcionCantidades[modalSerieProducto.producto_id] ?? modalSerieProducto.cantidad_pedida} unidades registradas
                </p>
              </div>
              <button onClick={() => setModalSerieOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Tabla unidades */}
            <div className="overflow-auto flex-1 p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-left py-2 pr-3">N° Serie / IMEI *</th>
                    <th className="text-left py-2 pr-3">Lote</th>
                    <th className="text-left py-2 pr-3">% Batería</th>
                    <th className="text-left py-2 pr-3">Color</th>
                    <th className="text-center py-2 pr-3">Outlet</th>
                    <th className="text-left py-2">Fallas / Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalSerieUnidades.map((u, idx) => (
                    <tr key={idx}>
                      <td className="py-2 pr-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={u.nro_serie}
                          placeholder="IMEI / N° serie"
                          onChange={e => {
                            const updated = [...modalSerieUnidades]
                            updated[idx] = { ...updated[idx], nro_serie: e.target.value }
                            setModalSerieUnidades(updated)
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={u.lote || ''}
                          placeholder="Lote"
                          onChange={e => {
                            const updated = [...modalSerieUnidades]
                            updated[idx] = { ...updated[idx], lote: e.target.value }
                            setModalSerieUnidades(updated)
                          }}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={u.bateria_pct ?? ''}
                          placeholder="%"
                          onChange={e => {
                            const updated = [...modalSerieUnidades]
                            updated[idx] = { ...updated[idx], bateria_pct: Number(e.target.value) }
                            setModalSerieUnidades(updated)
                          }}
                          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={u.color || ''}
                          onChange={e => {
                            const updated = [...modalSerieUnidades]
                            updated[idx] = { ...updated[idx], color: e.target.value }
                            setModalSerieUnidades(updated)
                          }}
                          className="w-28 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-</option>
                          {['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Gris', 'Plata', 'Oro', 'Morado'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <input
                          type="checkbox"
                          checked={u.outlet}
                          onChange={e => {
                            const updated = [...modalSerieUnidades]
                            updated[idx] = { ...updated[idx], outlet: e.target.checked }
                            setModalSerieUnidades(updated)
                          }}
                          className="rounded border-gray-300 text-emerald-600"
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={u.fallas || ''}
                          placeholder="Fallas u observaciones..."
                          onChange={e => {
                            const updated = [...modalSerieUnidades]
                            updated[idx] = { ...updated[idx], fallas: e.target.value }
                            setModalSerieUnidades(updated)
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => setModalSerieUnidades(prev => [...prev, { nro_serie: '', outlet: false }])}
                className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-4 h-4" /> Añadir unidad
              </button>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <p className="text-xs text-gray-500">
                * N° Serie / IMEI obligatorio. No puede repetirse dentro de la misma recepción.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setModalSerieOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!modalSerieProducto) return
                    const cantRequerida = recepcionCantidades[modalSerieProducto.producto_id] ?? modalSerieProducto.cantidad_pedida
                    const validas = modalSerieUnidades.filter(u => u.nro_serie.trim() !== '')
                    if (validas.length < cantRequerida) {
                      alert(`Debe registrar ${cantRequerida} unidades. Registradas: ${validas.length}`)
                      return
                    }
                    const series = validas.map(u => u.nro_serie.trim())
                    const duplicados = series.filter((s, i) => series.indexOf(s) !== i)
                    if (duplicados.length > 0) {
                      alert(`N° de serie duplicado: ${duplicados[0]}`)
                      return
                    }
                    setSeriesConfirmadas(prev => ({
                      ...prev,
                      [modalSerieProducto.producto_id]: validas.slice(0, cantRequerida)
                    }))
                    setModalSerieOpen(false)
                  }}
                  className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  Confirmar Series
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL CANCELACIÓN ===== */}
      {modalCancelacionOpen && selectedRecepcion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Cancelar Recepción</h2>
              <button onClick={() => { setModalCancelacionOpen(false); setCancelacionMotivo("") }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Esta acción revierte el stock recibido.</p>
                  <p className="mt-1 text-red-600">Solo es posible si el stock no fue consumido (vendido o transferido).</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de cancelación <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelacionMotivo}
                onChange={e => setCancelacionMotivo(e.target.value)}
                rows={4}
                placeholder="Describa el motivo de la cancelación..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => { setModalCancelacionOpen(false); setCancelacionMotivo("") }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                disabled={!cancelacionMotivo.trim()}
                onClick={() => {
                  if (!cancelacionMotivo.trim() || !selectedRecepcion) return
                  const rec = selectedRecepcion
                  const recActualizada: Recepcion = {
                    ...rec,
                    estado: "cancelada",
                    cancelacion: {
                      usuario: "Admin",
                      fecha: new Date().toISOString(),
                      motivo: cancelacionMotivo.trim()
                    }
                  }
                  setRecepciones(prev => prev.map(r => r.id === rec.id ? recActualizada : r))
                  setSelectedRecepcion(recActualizada)
                  setModalCancelacionOpen(false)
                  setCancelacionMotivo("")
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
