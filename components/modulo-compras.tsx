"use client"

import React, { useState, useEffect } from "react"
import { Search, Filter, ChevronDown, ChevronRight, X, Plus, FileText, Truck, Receipt, CreditCard, Users, DollarSign, Package, ArrowRight, Eye, Edit, Trash2, Download, Mail, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Phone, Globe, Calendar, Tag, Percent, Star, TrendingUp, RefreshCw, User, Warehouse, Save, MessageSquare, Settings, Lock, Unlock, FileBox, Ship, Plane, Pencil, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react"
import BotonVolver from "./ui/boton-volver"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import {
  getCategoriaProveedores,
  createCategoriaProveedor,
  updateCategoriaProveedor,
  deleteCategoriaProveedor,
} from "@/lib/categorias-proveedor-actions"
import { fetchProductos } from "@/lib/productos-actions"
import { procesarEntradaRecepcion, fetchDepositos, fetchUbicaciones } from "@/lib/stock-actions"
import { useERP } from "@/contexts/erp-context"
import {
  fetchProveedores,
  guardarProveedor,
  eliminarProveedor,
  fetchOrdenesCompra,
  guardarOrdenCompra,
  eliminarOrdenCompra,
  fetchRecepciones,
  guardarRecepcion,
  fetchFacturasCompra,
  guardarFacturaCompra,
  fetchOrdenesPago,
  guardarOrdenPago,
  fetchNotasCreditoCompra,
  guardarNotaCreditoCompra,
  fetchNotasDebitoCompra,
  guardarNotaDebitoCompra,
} from "@/lib/compras-actions"

// ── Datos geográficos ────────────────────────────────────────────────────────

const PAISES_LISTA = [
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Ecuador",
  "México", "Paraguay", "Perú", "Uruguay", "Venezuela",
  "Alemania", "Australia", "Bélgica", "Canadá", "China", "Corea del Sur",
  "España", "Estados Unidos", "Francia", "India", "Italia", "Japón",
  "Países Bajos", "Portugal", "Reino Unido", "Rusia", "Sudáfrica",
  "Suiza", "Turquía",
]

const PROVINCIAS_AR = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
]

const CIUDADES_POR_PROVINCIA: Record<string, string[]> = {
  "Santa Fe": [
    "Rosario",
    "Santa Fe",
    "Rafaela",
    "Venado Tuerto",
    "Villa Gobernador Gálvez",
    "San Lorenzo",
    "Reconquista",
    "Casilda",
    "Firmat",
    "Cañada de Gómez",
    "Villa Constitución",
    "Esperanza",
    "Gálvez",
    "Santo Tomé",
    "Las Rosas",
    "Pérez",
    "Rufino",
    "Villa del Parque",
    "Vera",
    "Totoras",
    "Sastre",
    "Coronda",
    "Las Parejas",
    "Piamonte",
  ],
  "Buenos Aires": [
    "La Plata",
    "Mar del Plata",
    "Quilmes",
    "Lanús",
    "Tigre",
    "Lomas de Zamora",
    "Almirante Brown",
    "General San Martín",
    "Tres de Febrero",
    "Florencio Varela",
    "Berazategui",
    "Avellaneda",
    "Morón",
    "Merlo",
    "Moreno",
    "La Matanza",
    "San Isidro",
    "Vicente López",
    "Hurlingham",
    "Ituzaingó",
    "Bahía Blanca",
    "Tandil",
    "Junín",
    "Pergamino",
    "San Nicolás de los Arroyos",
    "Necochea",
    "Olavarría",
    "Azul",
    "Luján",
    "Pilar",
    "Campana",
    "Zárate",
    "San Pedro",
    "Chascomús",
    "Dolores",
    "Trenque Lauquen",
    "Pehuajó",
    "9 de Julio",
    "Bragado",
    "Chivilcoy",
  ],
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ListaPrecioPermitida {
  id: number
  nombre: string
  tipo: string
  moneda: "ARS" | "USD" | "EUR"
}

interface CategoriaProveedor {
  id: number
  nombre: string
  disponible_clientes: boolean
  disponible_proveedores: boolean
  tipo_control: "Ninguno" | "Por Avisos" | "Por Bloqueo"
  cuenta_cobrar_defecto: string
  cuenta_pagar_defecto: string
  requiere_oc_para_facturar: boolean
  comprobantes_confidenciales: boolean
  listas_precios: ListaPrecioPermitida[]
}

interface ContactoProveedor {
  id: number
  nombre: string
  sector: string
  puesto: string
  telefono: string
  email: string
  observaciones: string
}

interface Proveedor {
  id: number
  codigo: string
  nombre: string
  nombre_fantasia: string
  razon_social: string
  tipo_documento: "CUIT" | "DNI" | "Pasaporte" | "Sin documento"
  numero_documento: string
  posicion_fiscal: "Responsable Inscripto" | "Monotributista" | "Exento" | "Consumidor Final" | "No responsable" | "Exterior"
  categoria_proveedor: string
  celular: string
  email: string
  calle_numero: string
  ciudad: string
  provincia: string
  pais: string
  codigo_postal: string
  // Legacy compat
  cuit: string
  tipo_documento_legacy: string
  numero_documento_legacy: string
  direccion: string
  telefono: string
  web: string
  contacto_nombre: string
  contacto_telefono: string
  contacto_email: string
  condicion_pago: string
  moneda_habitual: "ARS" | "USD" | "EUR"
  categoria: "publico" | "privado"
  confidencial: boolean
  tipo: "nacional" | "internacional" | "despachante"
  saldo: number
  activo: boolean
  // Contactos múltiples
  contactos: ContactoProveedor[]
  // Tab Ventas & Compras
  sucursal_origen: string
  moneda_defecto: "ARS" | "USD" | "EUR"
  // Tab Contabilidad
  cuenta_gastos_defecto: string
  cuenta_analitica: string
  tipo_cotizacion_defecto: string
  // Tab Observaciones
  observaciones: string
}

interface OrdenCompraLinea {
  producto_id: number
  producto_nombre: string
  producto_sku?: string
  descripcion: string
  cantidad: number
  cantidad_recibida: number
  precio_unitario: number
  descuento: number
  subtotal: number
  tiene_serie?: boolean
  requiere_color?: boolean
  requiere_bateria?: boolean
  requiere_outlet?: boolean
  requiere_observaciones?: boolean
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
  requiere_color: boolean
  requiere_bateria: boolean
  requiere_outlet: boolean
  requiere_observaciones: boolean
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

// Depósitos y ubicaciones se cargan desde Supabase dinámicamente

export default function ModuloCompras() {
  // Estado global persistente
  const {
    proveedores,
    setProveedores,
    ordenesCompra,
    setOrdenesCompra,
    recepciones,
    setRecepciones,
    facturasCompra,
    setFacturasCompra,
    ordenesPago,
    setOrdenesPago,
  } = useERP()

  // Carga inicial desde Supabase
  useEffect(() => {
    fetchProveedores().then(data => setProveedores(data)).catch(console.error)
    fetchOrdenesCompra().then(data => setOrdenesCompra(data)).catch(console.error)
    fetchRecepciones().then(data => setRecepciones(data)).catch(console.error)
    fetchFacturasCompra().then(data => setFacturasCompra(data)).catch(console.error)
    fetchOrdenesPago().then(data => setOrdenesPago(data)).catch(console.error)
    fetchNotasCreditoCompra().then(data => setNotasCreditoCompra(data)).catch(console.error)
    fetchNotasDebitoCompra().then(data => setNotasDebitoCompra(data)).catch(console.error)
  }, [])

  // Active view state
  const [activeView, setActiveView] = useState("proveedores")
  const [expandedSections, setExpandedSections] = useState<string[]>(["proveedores", "compras", "comprobantes", "pagos", "configuracion", "cfg_categorias"])

  // Proveedores — estado local de UI (no de datos)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null)
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [editandoProveedor, setEditandoProveedor] = useState(false)
  const [proveedorSearchText, setProveedorSearchText] = useState("")
  const [proveedorFiltroCategoria, setProveedorFiltroCategoria] = useState<"todos" | "publico" | "privado">("todos")
  const [proveedorFiltroTipo, setProveedorFiltroTipo] = useState<"todos" | "nacional" | "internacional" | "despachante">("todos")
  const [proveedorTabActivo, setProveedorTabActivo] = useState<"contactos" | "ventas_compras" | "contabilidad" | "observaciones">("contactos")
  const [confirmandoConfidencial, setConfirmandoConfidencial] = useState(false)

  const [categoriasProveedor, setCategoriasProveedor] = useState<CategoriaProveedor[]>([])
  const [selectedCatProv, setSelectedCatProv] = useState<CategoriaProveedor | null>(null)
  const [creandoCatProv, setCreandoCatProv] = useState(false)
  const [catProvTabActivo, setCatProvTabActivo] = useState<"listas_precios" | "grupos_descuentos" | "cuentas_perm" | "leyenda" | "grupos">("listas_precios")
  const [loadingCatProv, setLoadingCatProv] = useState(false)

  useEffect(() => {
    setLoadingCatProv(true)
    getCategoriaProveedores()
      .then(rows => {
        setCategoriasProveedor(rows.map(r => ({
          id: r.id,
          nombre: r.nombre,
          disponible_clientes: r.disponible_clientes,
          disponible_proveedores: r.disponible_proveedores,
          tipo_control: r.tipo_control as CategoriaProveedor["tipo_control"],
          cuenta_cobrar_defecto: r.cuenta_cobrar_defecto,
          cuenta_pagar_defecto: r.cuenta_pagar_defecto,
          requiere_oc_para_facturar: r.requiere_oc_para_facturar,
          comprobantes_confidenciales: r.comprobantes_confidenciales,
          listas_precios: [],
        })))
      })
      .catch(console.error)
      .finally(() => setLoadingCatProv(false))
  }, [])

  const catProvFormVacio: Omit<CategoriaProveedor, "id"> = {
    nombre: "",
    disponible_clientes: true,
    disponible_proveedores: true,
    tipo_control: "Ninguno",
    cuenta_cobrar_defecto: "",
    cuenta_pagar_defecto: "",
    requiere_oc_para_facturar: false,
    comprobantes_confidenciales: false,
    listas_precios: [],
  }
  const [nuevaCatProv, setNuevaCatProv] = useState<Omit<CategoriaProveedor, "id">>(catProvFormVacio)

  // CATEGORIAS_PROVEEDOR es ahora dinámico
  const CATEGORIAS_PROVEEDOR = categoriasProveedor.map(c => c.nombre)

  const SUCURSALES_LISTA = ["Puerto Norte", "Centro", "Sur"]
  const MONEDAS_LISTA: Array<"ARS" | "USD" | "EUR"> = ["ARS", "USD", "EUR"]
  const CUENTAS_GASTOS = ["5.1.1 - Compras Mercadería", "5.1.2 - Gastos Importación", "5.2.1 - Servicios", "5.2.2 - Flete y Aduanas"]
  const TIPOS_COTIZACION = ["Dólar Oficial", "Dólar MEP", "Dólar Blue"]

  const proveedorFormVacio: Omit<Proveedor, "id" | "codigo" | "saldo"> = {
    nombre: "",
    nombre_fantasia: "",
    razon_social: "",
    tipo_documento: "CUIT",
    numero_documento: "",
    posicion_fiscal: "Responsable Inscripto",
    categoria_proveedor: "Proveedor Nacional",
    celular: "",
    email: "",
    calle_numero: "",
    ciudad: "",
    provincia: "",
    pais: "Argentina",
    codigo_postal: "",
    cuit: "",
    tipo_documento_legacy: "CUIT",
    numero_documento_legacy: "",
    direccion: "",
    telefono: "",
    web: "",
    contacto_nombre: "",
    contacto_telefono: "",
    contacto_email: "",
    condicion_pago: "Contado",
    moneda_habitual: "ARS",
    categoria: "publico",
    confidencial: false,
    tipo: "nacional",
    activo: true,
    contactos: [],
    sucursal_origen: "",
    moneda_defecto: "ARS",
    cuenta_gastos_defecto: "",
    cuenta_analitica: "",
    tipo_cotizacion_defecto: "",
    observaciones: "",
  }

  const [nuevoProveedor, setNuevoProveedor] = useState<Omit<Proveedor, "id" | "codigo" | "saldo">>(proveedorFormVacio)

  // Órdenes de Compra
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
  // UI state OC — depósitos y ubicaciones desde Supabase
  const [depositosOC, setDepositosOC] = useState<{ id: number; nombre: string; codigo: string }[]>([])
  const [ubicacionesOC, setUbicacionesOC] = useState<{ id: number; nombre: string; codigo: string }[]>([])
  const [loadingUbicacionesOC, setLoadingUbicacionesOC] = useState(false)

  // Cargar depósitos al montar
  useEffect(() => {
    fetchDepositos().then(data => setDepositosOC(data ?? [])).catch(console.error)
  }, [])

  // Cargar ubicaciones cuando cambia el depósito seleccionado
  const handleDepositoOCChange = async (depositoId: number, depositoNombre: string) => {
    setNuevaOC(prev => ({ ...prev, deposito_destino: depositoNombre, deposito_destino_id: depositoId, ubicacion_destino: "", ubicacion_destino_id: undefined }))
    if (!depositoId) { setUbicacionesOC([]); return }
    setLoadingUbicacionesOC(true)
    try {
      const data = await fetchUbicaciones(depositoId)
      setUbicacionesOC(data ?? [])
    } catch (e) {
      console.error("[v0] Error cargando ubicaciones:", e)
      setUbicacionesOC([])
    } finally {
      setLoadingUbicacionesOC(false)
    }
  }

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

  // OC — dropdown búsqueda de producto por línea
  const [ocProductoSearch, setOcProductoSearch] = useState<Record<number, string>>({})
  const [ocProductoOpciones, setOcProductoOpciones] = useState<Record<number, any[]>>({})
  const [ocProductoDropdownAbierto, setOcProductoDropdownAbierto] = useState<Record<number, boolean>>({})
  const ocProductoInputRefs = React.useRef<Record<number, HTMLInputElement | null>>({})

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
  const [modalSerieUnidadActiva, setModalSerieUnidadActiva] = useState(0)
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
  ]

  // Sub-grupos dentro de Configuración
  const configSubGroups = [
    {
      id: "cfg_general",
      label: null, // ítems sueltos sin grupo
      items: [
        { id: "tipos_gasto", label: "Tipos de Gasto" },
        { id: "componentes_evaluacion", label: "Componentes Evaluación" },
        { id: "rangos_precio", label: "Rangos de Precio por Rol" },
      ]
    },
    {
      id: "cfg_categorias",
      label: "Categorías",
      items: [
        { id: "cat_proveedores", label: "Proveedores" },
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
      {/* Secciones principales (Proveedores, Compras, Comprobantes, Pagos) */}
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
                      ? "bg-orange-50 text-orange-600 font-medium"
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

      {/* ── CONFIGURACIÓN ─────────────────────── */}
      <div className="mt-3">
        <button
          onClick={() => toggleSection("configuracion")}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuración
          </span>
          {expandedSections.includes("configuracion") ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.includes("configuracion") && (
          <div className="ml-4 mt-1 space-y-0.5">
            {configSubGroups.map(group => (
              <div key={group.id}>
                {/* Sub-grupo con label (ej: Categorías) */}
                {group.label ? (
                  <div>
                    <button
                      onClick={() => toggleSection(group.id)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                    >
                      {expandedSections.includes(group.id) ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-700">{group.label}</span>
                    </button>
                    {expandedSections.includes(group.id) && (
                      <div className="ml-5 space-y-0.5">
                        {group.items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => setActiveView(item.id)}
                            className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              activeView === item.id
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Ítems sueltos (sin sub-grupo) */
                  <div className="space-y-0.5">
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          activeView === item.id
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // =====================================================
  // RENDER PROVEEDORES
  // =====================================================
  const renderProveedores = () => {
    const filteredProveedores = proveedores.filter(p => {
      const searchLower = proveedorSearchText.toLowerCase()
      const matchesSearch = (p.nombre?.toLowerCase() ?? "").includes(searchLower) ||
                           (p.codigo?.toLowerCase() ?? "").includes(searchLower) ||
                           (p.cuit ?? "").includes(proveedorSearchText)
      const matchesCategoria = proveedorFiltroCategoria === "todos" || p.categoria === proveedorFiltroCategoria
      const matchesTipo = proveedorFiltroTipo === "todos" || p.tipo === proveedorFiltroTipo
      return matchesSearch && matchesCategoria && matchesTipo
    })

    if (editandoProveedor) return renderFormularioProveedor(true)
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
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">Nombre Fantasía</th>
                <th className="text-left py-3 px-4">CUIT / Doc.</th>
                <th className="text-left py-3 px-4">Categoría</th>
                <th className="text-center py-3 px-4">Moneda</th>
                <th className="text-center py-3 px-4">Activo</th>
                <th className="text-center py-3 px-4">Confidencial</th>
              </tr>
            </thead>
            <tbody>
              {filteredProveedores.map(proveedor => (
                <tr
                  key={proveedor.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedProveedor(proveedor)}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{proveedor.nombre}</div>
                    <div className="text-xs text-gray-400">{proveedor.codigo}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{proveedor.nombre_fantasia || <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{proveedor.cuit || proveedor.numero_documento || <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{proveedor.categoria_proveedor || proveedor.tipo}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {proveedor.moneda_habitual}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      proveedor.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {proveedor.activo ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {(proveedor.confidencial || proveedor.categoria === 'privado') ? (
                      <Lock className="w-4 h-4 text-red-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
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
            <button
              onClick={() => {
                if (!selectedProveedor) return
                setNuevoProveedor({
                  nombre: selectedProveedor.nombre,
                  nombre_fantasia: selectedProveedor.nombre_fantasia ?? "",
                  razon_social: selectedProveedor.razon_social,
                  tipo_documento: selectedProveedor.tipo_documento,
                  numero_documento: selectedProveedor.numero_documento,
                  posicion_fiscal: selectedProveedor.posicion_fiscal ?? "Responsable Inscripto",
                  categoria_proveedor: selectedProveedor.categoria_proveedor ?? "Proveedor Nacional",
                  celular: selectedProveedor.celular ?? selectedProveedor.telefono ?? "",
                  email: selectedProveedor.email,
                  calle_numero: selectedProveedor.calle_numero ?? selectedProveedor.direccion ?? "",
                  ciudad: selectedProveedor.ciudad,
                  provincia: selectedProveedor.provincia ?? "",
                  pais: selectedProveedor.pais ?? "Argentina",
                  codigo_postal: selectedProveedor.codigo_postal ?? "",
                  cuit: selectedProveedor.cuit,
                  tipo_documento_legacy: selectedProveedor.tipo_documento_legacy ?? selectedProveedor.tipo_documento,
                  numero_documento_legacy: selectedProveedor.numero_documento_legacy ?? selectedProveedor.numero_documento,
                  direccion: selectedProveedor.direccion,
                  telefono: selectedProveedor.telefono,
                  web: selectedProveedor.web ?? "",
                  contacto_nombre: selectedProveedor.contacto_nombre ?? "",
                  contacto_telefono: selectedProveedor.contacto_telefono ?? "",
                  contacto_email: selectedProveedor.contacto_email ?? "",
                  condicion_pago: selectedProveedor.condicion_pago,
                  moneda_habitual: selectedProveedor.moneda_habitual,
                  categoria: selectedProveedor.categoria,
                  confidencial: selectedProveedor.confidencial ?? selectedProveedor.categoria === "privado",
                  tipo: selectedProveedor.tipo,
                  activo: selectedProveedor.activo,
                  contactos: selectedProveedor.contactos ?? [],
                  sucursal_origen: selectedProveedor.sucursal_origen ?? "",
                  moneda_defecto: selectedProveedor.moneda_defecto ?? selectedProveedor.moneda_habitual,
                  cuenta_gastos_defecto: selectedProveedor.cuenta_gastos_defecto ?? "",
                  cuenta_analitica: selectedProveedor.cuenta_analitica ?? "",
                  tipo_cotizacion_defecto: selectedProveedor.tipo_cotizacion_defecto ?? "",
                  observaciones: selectedProveedor.observaciones ?? "",
                })
                setProveedorTabActivo("contactos")
                setEditandoProveedor(true)
              }}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
            >
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

  const renderFormularioProveedor = (modoEdicion: boolean) => {
    const prov = nuevoProveedor
    const setP = (patch: Partial<typeof prov>) => setNuevoProveedor(prev => ({ ...prev, ...patch }))

    const handleGuardar = async () => {
      if (!prov.nombre.trim()) return
      if (prov.tipo_documento !== "Sin documento" && !prov.numero_documento.trim()) return

      const payload = {
        razon_social: prov.nombre,
        nombre_fantasia: prov.nombre_fantasia || null,
        cuit: prov.numero_documento || null,
        categoria: prov.categoria || "privado",
        tipo: prov.tipo || "nacional",
        email: prov.email || null,
        telefono: prov.telefono || null,
        direccion: prov.direccion || null,
        ciudad: prov.ciudad || null,
        pais: prov.pais || "Argentina",
        condicion_pago: prov.condicion_pago || null,
        moneda_habitual: prov.moneda_habitual || "ARS",
        estado: prov.activo ? "activo" : "inactivo",
      }

      try {
        if (modoEdicion && selectedProveedor) {
          const updated = await guardarProveedor(payload, selectedProveedor.id)
          setProveedores(prev => prev.map(p => p.id === selectedProveedor.id ? { ...p, ...updated } : p))
          setSelectedProveedor(prev => prev ? { ...prev, ...updated } : null)
          setEditandoProveedor(false)
        } else {
          const codigoAuto = `PROV-${String(proveedores.length + 1).padStart(3, "0")}`
          const created = await guardarProveedor({ ...payload, codigo: codigoAuto, saldo: 0 })
          setProveedores(prev => [...prev, created])
          setCreandoProveedor(false)
          setNuevoProveedor(proveedorFormVacio)
          setProveedorTabActivo("contactos")
        }
      } catch (err: any) {
        console.error("[v0] Error al guardar proveedor:", err.message)
      }
    }

    const handleCancelar = () => {
      if (modoEdicion) {
        setEditandoProveedor(false)
      } else {
        setCreandoProveedor(false)
        setNuevoProveedor(proveedorFormVacio)
        setProveedorTabActivo("contactos")
      }
    }

    const addContacto = () => {
      setP({
        contactos: [...prov.contactos, {
          id: Date.now(), nombre: "", sector: "", puesto: "", telefono: "", email: "", observaciones: ""
        }]
      })
    }

    const removeContacto = (id: number) => {
      setP({ contactos: prov.contactos.filter(c => c.id !== id) })
    }

    const updateContacto = (id: number, patch: Partial<ContactoProveedor>) => {
      setP({ contactos: prov.contactos.map(c => c.id === id ? { ...c, ...patch } : c) })
    }

    return (
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <BotonVolver onClick={handleCancelar} variant="minimal" texto="" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {modoEdicion ? `Editando: ${selectedProveedor?.nombre}` : "Nuevo Proveedor"}
            </h1>
            <p className="text-sm text-gray-500">
              {modoEdicion ? selectedProveedor?.codigo : "Complete los datos del nuevo proveedor"}
            </p>
          </div>
        </div>

        {/* Cabecera del formulario */}
        <div className="bg-white rounded-lg border p-6 mb-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Columna izquierda */}
            <div className="space-y-4">
              {/* Razón Social */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Razón Social / Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={prov.nombre}
                  onChange={e => setP({ nombre: e.target.value, razon_social: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Razón social"
                />
              </div>

              {/* Nombre de Fantasía */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de Fantasía</label>
                <input
                  type="text"
                  value={prov.nombre_fantasia}
                  onChange={e => setP({ nombre_fantasia: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre comercial"
                />
              </div>

              {/* Tipo y N° de Documento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Documento</label>
                  <select
                    value={prov.tipo_documento}
                    onChange={e => setP({ tipo_documento: e.target.value as Proveedor["tipo_documento"] })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CUIT">CUIT</option>
                    <option value="DNI">DNI</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Sin documento">Sin documento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Número {prov.tipo_documento !== "Sin documento" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={prov.numero_documento}
                    onChange={e => setP({ numero_documento: e.target.value, cuit: e.target.value })}
                    disabled={prov.tipo_documento === "Sin documento"}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder={prov.tipo_documento === "CUIT" ? "XX-XXXXXXXX-X" : ""}
                  />
                </div>
              </div>

              {/* Posición Fiscal */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Posición Fiscal</label>
                <select
                  value={prov.posicion_fiscal}
                  onChange={e => setP({ posicion_fiscal: e.target.value as Proveedor["posicion_fiscal"] })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">Exento</option>
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="No responsable">No responsable</option>
                  <option value="Exterior">Exterior</option>
                </select>
              </div>

              {/* Categoría de Proveedor */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Categoría de Proveedor</label>
                <select
                  value={prov.categoria_proveedor}
                  onChange={e => setP({ categoria_proveedor: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIAS_PROVEEDOR.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="space-y-4">
              {/* Celular */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Celular</label>
                <input
                  type="text"
                  value={prov.celular}
                  onChange={e => setP({ celular: e.target.value, telefono: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+54 9 11 ..."
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={prov.email}
                  onChange={e => setP({ email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@proveedor.com"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Calle y Número</label>
                <input
                  type="text"
                  value={prov.calle_numero}
                  onChange={e => setP({ calle_numero: e.target.value, direccion: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Av. Ejemplo 1234"
                />
              </div>

              {/* País */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">País</label>
                <select
                  value={prov.pais}
                  onChange={e => setP({ pais: e.target.value, provincia: "", ciudad: "" })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAISES_LISTA.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Provincia + Ciudad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Provincia</label>
                  {prov.pais === "Argentina" ? (
                    <select
                      value={prov.provincia}
                      onChange={e => setP({ provincia: e.target.value, ciudad: "" })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Seleccionar —</option>
                      {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={prov.provincia}
                      onChange={e => setP({ provincia: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ciudad</label>
                  {(() => {
                    const ciudadesDisponibles = CIUDADES_POR_PROVINCIA[prov.provincia]
                    return ciudadesDisponibles ? (
                      <select
                        value={prov.ciudad}
                        onChange={e => setP({ ciudad: e.target.value })}
                        disabled={!prov.provincia}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">— Seleccionar —</option>
                        {ciudadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={prov.ciudad}
                        onChange={e => setP({ ciudad: e.target.value })}
                        disabled={prov.pais === "Argentina" && !prov.provincia}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                        placeholder={prov.pais === "Argentina" && !prov.provincia ? "Seleccioná provincia primero" : ""}
                      />
                    )
                  })()}
                </div>
              </div>

              {/* Código Postal */}
              <div className="w-1/2 pr-1.5">
                <label className="block text-xs font-medium text-gray-700 mb-1">Código Postal</label>
                <input
                  type="text"
                  value={prov.codigo_postal}
                  onChange={e => setP({ codigo_postal: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={prov.activo}
                    onChange={e => setP({ activo: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  Activo
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={prov.confidencial}
                    onChange={e => {
                      if (e.target.checked) {
                        setConfirmandoConfidencial(true)
                      } else {
                        setP({ confidencial: false, categoria: "publico" })
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-red-600"
                  />
                  Es confidencial
                </label>
              </div>

              {/* Aviso confidencial */}
              {confirmandoConfidencial && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="text-amber-800 font-medium mb-2">
                    Este proveedor solo será visible para usuarios del grupo Proveedores Privados. ¿Confirmás?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setP({ confidencial: true, categoria: "privado" }); setConfirmandoConfidencial(false) }}
                      className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmandoConfidencial(false)}
                      className="px-3 py-1 border text-xs rounded hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {prov.confidencial && !confirmandoConfidencial && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  Proveedor confidencial — solo visible para usuarios autorizados
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b">
            {[
              { id: "contactos", label: "Contactos" },
              { id: "ventas_compras", label: "Ventas & Compras" },
              { id: "contabilidad", label: "Contabilidad" },
              { id: "observaciones", label: "Observaciones" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setProveedorTabActivo(tab.id as typeof proveedorTabActivo)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  proveedorTabActivo === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.id === "contactos" && prov.contactos.length > 0 && (
                  <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                    {prov.contactos.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">

            {/* TAB: CONTACTOS */}
            {proveedorTabActivo === "contactos" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Personas de contacto dentro de esta empresa</p>
                  <button
                    onClick={addContacto}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4" /> Agregar contacto
                  </button>
                </div>

                {prov.contactos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                    Sin contactos registrados. Hacé clic en &quot;Agregar contacto&quot; para añadir uno.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-gray-500 uppercase">
                          <th className="text-left py-2 px-2">Nombre</th>
                          <th className="text-left py-2 px-2">Sector / Área</th>
                          <th className="text-left py-2 px-2">Puesto / Cargo</th>
                          <th className="text-left py-2 px-2">Teléfono</th>
                          <th className="text-left py-2 px-2">Email</th>
                          <th className="text-left py-2 px-2">Observaciones</th>
                          <th className="py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {prov.contactos.map(c => (
                          <tr key={c.id} className="border-b">
                            <td className="py-1.5 px-2">
                              <input type="text" value={c.nombre} onChange={e => updateContacto(c.id, { nombre: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nombre" />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="text" value={c.sector} onChange={e => updateContacto(c.id, { sector: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ventas" />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="text" value={c.puesto} onChange={e => updateContacto(c.id, { puesto: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Gerente" />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="text" value={c.telefono} onChange={e => updateContacto(c.id, { telefono: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="+54..." />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="email" value={c.email} onChange={e => updateContacto(c.id, { email: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="email@..." />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="text" value={c.observaciones} onChange={e => updateContacto(c.id, { observaciones: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="" />
                            </td>
                            <td className="py-1.5 px-2">
                              <button onClick={() => removeContacto(c.id)} className="text-red-400 hover:text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: VENTAS & COMPRAS */}
            {proveedorTabActivo === "ventas_compras" && (
              <div className="grid grid-cols-2 gap-6 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sucursal de Origen</label>
                  <select
                    value={prov.sucursal_origen}
                    onChange={e => setP({ sucursal_origen: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Ninguna —</option>
                    {SUCURSALES_LISTA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Moneda por Defecto</label>
                  <select
                    value={prov.moneda_defecto}
                    onChange={e => setP({ moneda_defecto: e.target.value as "ARS" | "USD" | "EUR", moneda_habitual: e.target.value as "ARS" | "USD" | "EUR" })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONEDAS_LISTA.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* TAB: CONTABILIDAD */}
            {proveedorTabActivo === "contabilidad" && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Gastos por Defecto</label>
                  <select
                    value={prov.cuenta_gastos_defecto}
                    onChange={e => setP({ cuenta_gastos_defecto: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Sin asignar —</option>
                    {CUENTAS_GASTOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta Analítica para Compras</label>
                  <input
                    type="text"
                    value={prov.cuenta_analitica}
                    onChange={e => setP({ cuenta_analitica: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Cotización por Defecto</label>
                  <select
                    value={prov.tipo_cotizacion_defecto}
                    onChange={e => setP({ tipo_cotizacion_defecto: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Sin asignar —</option>
                    {TIPOS_COTIZACION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {prov.moneda_defecto === "ARS" && (
                    <p className="text-xs text-gray-400 mt-1">Relevante principalmente cuando la moneda es distinta de ARS.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: OBSERVACIONES */}
            {proveedorTabActivo === "observaciones" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Notas internas sobre el proveedor
                </label>
                <textarea
                  value={prov.observaciones}
                  onChange={e => setP({ observaciones: e.target.value })}
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notas internas. No se imprime ni se comparte."
                />
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={handleCancelar}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!prov.nombre.trim() || (prov.tipo_documento !== "Sin documento" && !prov.numero_documento.trim())}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {modoEdicion ? "Guardar Cambios" : "Crear Proveedor"}
          </button>
        </div>
      </div>
    )
  }

  const renderCrearProveedor = () => renderFormularioProveedor(false)

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

  const confirmarOC = async (oc: OrdenCompra) => {
    const ahora = new Date().toISOString()
    const esInmediato = oc.metodo_compra === 'inmediato'
    const nuevoNumRec = Math.max(...recepciones.map(r => r.id ?? 0), 0) + 1

    const recPayload = {
      numero: `REC-${String(nuevoNumRec).padStart(5, '0')}`,
      fecha: ahora,
      orden_compra_id: oc.id,
      orden_compra_numero: oc.numero,
      proveedor_id: oc.proveedor_id,
      proveedor_nombre: oc.proveedor_nombre,
      estado: esInmediato ? "confirmada" : "borrador",
      items: oc.lineas.map(l => ({
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre,
        cantidad: esInmediato ? l.cantidad : 0,
        precio_unitario: l.precio_unitario,
      })),
      total: esInmediato ? oc.total : 0,
    }

    const ocEstadoNuevo = esInmediato ? "completa" : "confirmada"

    try {
      const [recCreada, ocActualizada] = await Promise.all([
        guardarRecepcion(recPayload),
        guardarOrdenCompra({ estado: ocEstadoNuevo }, oc.id),
      ])
      const nuevaRec: Recepcion = { ...recCreada, lineas: oc.lineas.map(l => ({
        producto_id: l.producto_id, producto_nombre: l.producto_nombre,
        producto_sku: l.producto_sku ?? "", cantidad_pedida: l.cantidad,
        cantidad_recibida: esInmediato ? l.cantidad : 0,
        precio_unitario: l.precio_unitario, estado_linea: esInmediato ? "recibido" : "pendiente",
        tiene_serie: false, requiere_color: false, requiere_bateria: false,
        requiere_outlet: false, requiere_observaciones: false, udm: "un",
      })) }
      const ocConfirmada: OrdenCompra = { ...oc, ...ocActualizada, lineas: oc.lineas }
      setRecepciones(prev => [...prev, nuevaRec])
      setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? ocConfirmada : o))
      setSelectedOC(ocConfirmada)
    } catch (err: any) {
      console.error("[v0] Error al confirmar OC:", err.message)
      alert("Error al confirmar OC: " + err.message)
    }
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
                        : 'Esta acción cancelará también las recepciones en estado "Esperando recepci��n" vinculadas.'}
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

    const guardarOC = async () => {
      if (!oc.proveedor_nombre || !oc.deposito_destino || oc.lineas.length === 0) {
        alert("Complete proveedor, depósito destino y al menos una línea.")
        return
      }
      const nextNum = Math.max(...ordenesCompra.map(o => o.id ?? 0), 0) + 1
      const payload = {
        numero: `OC-${String(nextNum).padStart(5, '0')}`,
        fecha: oc.fecha || new Date().toISOString(),
        proveedor_id: oc.proveedor_id || 0,
        proveedor_nombre: oc.proveedor_nombre || "",
        estado: "borrador",
        moneda: oc.moneda || "ARS",
        items: oc.lineas,
        subtotal: totalOC,
        total: totalOC,
      }
      try {
        const created = await guardarOrdenCompra(payload)
        const nuevaOrden: OrdenCompra = { ...created, lineas: oc.lineas }
        setOrdenesCompra(prev => [...prev, nuevaOrden])
        setCreandoOC(false)
        setSelectedOC(nuevaOrden)
        setOcTabActivo("productos")
      } catch (err: any) {
        console.error("[v0] Error al guardar OC:", err.message)
        alert("Error al guardar la orden de compra: " + err.message)
      }
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
                <select
                  value={oc.proveedor_id || ""}
                  onChange={e => {
                    const p = proveedores.find(p => p.id === Number(e.target.value))
                    if (p) setNuevaOC(prev => ({ ...prev, proveedor_id: p.id, proveedor_nombre: p.nombre, moneda: p.moneda_habitual }))
                    else setNuevaOC(prev => ({ ...prev, proveedor_id: undefined, proveedor_nombre: "" }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
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
                  <option value="estandar">Estándar</option>
                  <option value="inmediato">Inmediato</option>
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
                  value={(oc as any).deposito_destino_id || ""}
                  onChange={e => {
                    const id = Number(e.target.value)
                    const dep = depositosOC.find(d => d.id === id)
                    handleDepositoOCChange(id, dep?.nombre ?? "")
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar depósito...</option>
                  {depositosOC.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-xs uppercase tracking-wide mb-1 ${oc.deposito_destino ? "text-gray-500" : "text-gray-300"}`}>
                  Ubicacion Destino
                </label>
                <select
                  value={(oc as any).ubicacion_destino_id || ""}
                  onChange={e => {
                    const id = Number(e.target.value)
                    const ub = ubicacionesOC.find(u => u.id === id)
                    setNuevaOC(prev => ({ ...prev, ubicacion_destino: ub?.nombre ?? "", ubicacion_destino_id: id }))
                  }}
                  disabled={!oc.deposito_destino || loadingUbicacionesOC}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white transition-colors ${
                    oc.deposito_destino
                      ? "border-gray-300 text-gray-900"
                      : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                  }`}
                >
                  <option value="">
                    {loadingUbicacionesOC
                      ? "Cargando ubicaciones..."
                      : oc.deposito_destino
                        ? ubicacionesOC.length === 0
                          ? "Sin ubicaciones en este depósito"
                          : "Seleccionar ubicación..."
                        : "Seleccione un depósito primero"}
                  </option>
                  {ubicacionesOC.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
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
                    <div className="relative">
                      <input
                        ref={el => { ocProductoInputRefs.current[idx] = el }}
                        type="text"
                        value={ocProductoSearch[idx] ?? linea.producto_nombre}
                        onChange={async e => {
                          const val = e.target.value
                          setOcProductoSearch(prev => ({ ...prev, [idx]: val }))
                          if (val.trim().length === 0) {
                            setOcProductoOpciones(prev => ({ ...prev, [idx]: [] }))
                            setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: false }))
                            const updated = [...oc.lineas]
                            updated[idx] = { ...updated[idx], producto_id: 0, producto_nombre: "" }
                            setNuevaOC(prev => ({ ...prev, lineas: updated }))
                            return
                          }
                          setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: true }))
                          try {
                            const res = await fetchProductos({ busqueda: val, activo: true })
                            setOcProductoOpciones(prev => ({ ...prev, [idx]: res }))
                          } catch {
                            setOcProductoOpciones(prev => ({ ...prev, [idx]: [] }))
                          }
                        }}
                        onFocus={() => {
                          if ((ocProductoSearch[idx] ?? linea.producto_nombre).length > 0 && (ocProductoOpciones[idx] ?? []).length > 0) {
                            setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: true }))
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: false }))
                          }, 150)
                        }}
                        placeholder="Nombre del producto..."
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                      {ocProductoDropdownAbierto[idx] && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                          {(ocProductoOpciones[idx] ?? []).length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
                          ) : (
                            (ocProductoOpciones[idx] ?? []).map((p: any) => (
                              <div
                                key={p.id}
                                onMouseDown={e => {
                                  e.preventDefault()
                                  const updated = [...oc.lineas]
                                  updated[idx] = {
                                    ...updated[idx],
                                    producto_id: p.id,
                                    producto_nombre: p.nombre,
                                    producto_sku: p.codigo_interno ?? p.sku ?? "",
                                    descripcion: updated[idx].descripcion || p.descripcion || "",
                                    precio_unitario: updated[idx].precio_unitario || p.precio_compra || p.costo_manual || 0,
                                    subtotal: updated[idx].cantidad * (updated[idx].precio_unitario || p.precio_compra || p.costo_manual || 0),
                                    tiene_serie: p.tiene_numero_serie ?? false,
                                    requiere_color: p.requiere_color ?? false,
                                    requiere_bateria: p.requiere_bateria ?? false,
                                    requiere_outlet: p.requiere_outlet ?? false,
                                    requiere_observaciones: p.requiere_observaciones ?? false,
                                  }
                                  setNuevaOC(prev => ({ ...prev, lineas: updated }))
                                  setOcProductoSearch(prev => ({ ...prev, [idx]: p.nombre }))
                                  setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: false }))
                                }}
                                className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer text-xs"
                              >
                                <span className="font-medium">[{p.sku ?? p.codigo ?? "—"}]</span> {p.nombre}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
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
                      onClick={() => {
                        setNuevaOC(prev => ({ ...prev, lineas: prev.lineas.filter((_, i) => i !== idx) }))
                        setOcProductoSearch(prev => { const n = { ...prev }; delete n[idx]; return n })
                        setOcProductoOpciones(prev => { const n = { ...prev }; delete n[idx]; return n })
                        setOcProductoDropdownAbierto(prev => { const n = { ...prev }; delete n[idx]; return n })
                      }}
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
                <th className="text-left py-3 px-4">N��mero</th>
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
  // LÓGICA CONFIRMAR RECEPCIÓN (async - persiste en Supabase)
  // =====================================================
  const handleConfirmarRecepcion = async (): Promise<void> => {
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

    // Actualizar UI de forma síncrona
    setRecepciones(prev => prev.map(r => r.id === rec.id ? recActualizada : r))
    setSelectedRecepcion(recActualizada)
    if (rec.documento_origen_tipo === 'oc' && rec.documento_origen_id) {
      const todasRecibidas = lineasActualizadas.every(l => l.estado_linea === 'recibido')
      setOrdenesCompra(prev => prev.map(oc => {
        if (oc.id !== rec.documento_origen_id) return oc
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

    // Persistir a Supabase de forma async sin bloquear la UI
    ;(async () => {
      try {
        const todasRecibidas = lineasActualizadas.every(l => l.estado_linea === 'recibido')
        await guardarRecepcion({
          estado: "confirmada",
          items: lineasActualizadas.map(l => ({
            producto_id: l.producto_id,
            producto_nombre: l.producto_nombre,
            cantidad: l.cantidad_recibida,
            precio_unitario: l.precio_unitario,
          })),
          total: lineasActualizadas.reduce((s, l) => s + l.cantidad_recibida * l.precio_unitario, 0),
        }, rec.id)
        if (rec.documento_origen_tipo === 'oc' && rec.documento_origen_id) {
          const ocVinculada = ordenesCompra.find(o => o.id === rec.documento_origen_id)
          if (ocVinculada) {
            await guardarOrdenCompra({ estado: todasRecibidas && !hayParcial ? "completa" : "parcial" }, ocVinculada.id)
          }
        }
      } catch (err: any) {
        console.error("[v0] Error al persistir recepción:", err.message)
      }
    })()

    // Entrada de stock en Supabase
    ;(async () => {
      try {
        // Obtener el depósito destino por nombre desde Supabase
        const depositos = await fetchDepositos()
        const depositoDestino = depositos.find(
          (d: any) => d.nombre?.toLowerCase() === recActualizada.deposito_destino?.toLowerCase()
            || d.codigo?.toLowerCase() === recActualizada.deposito_destino?.toLowerCase()
        ) ?? depositos[0]

        if (!depositoDestino) return

        // Obtener ubicación destino por defecto del depósito
        const ubicaciones = await fetchUbicaciones(depositoDestino.id)
        const ubicacionDestino = ubicaciones.find((u: any) => u.es_defecto) ?? ubicaciones[0]

        if (!ubicacionDestino) return

        await procesarEntradaRecepcion({
          recepcion_id: recActualizada.id,
          recepcion_numero: recActualizada.numero,
          deposito_id: depositoDestino.id,
          ubicacion_id: ubicacionDestino.id,
          lineas: lineasActualizadas
            .filter(l => l.cantidad_recibida > 0)
            .map(l => ({
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              tiene_serie: !!l.tiene_serie,
              cantidad: l.cantidad_recibida,
              unidades: l.tiene_serie
                ? (l.unidades_serie ?? []).slice(0, l.cantidad_recibida).map((u: any) => ({
                    nro_serie: u.nro_serie || undefined,
                    color: u.color || undefined,
                    bateria_pct: u.bateria_pct ?? undefined,
                    es_outlet: u.outlet ?? false,
                    observaciones: u.observaciones || undefined,
                  }))
                : undefined,
            })),
        })
      } catch (err) {
        console.error("[stock] Error procesando entrada de stock:", err)
      }
    })()

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
                {editable && <th className="text-center py-2.5 px-4">Tracking</th>}
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
                    {editable && (() => {
                      const necesitaTracking = linea.tiene_serie || linea.requiere_color || linea.requiere_bateria || linea.requiere_outlet || linea.requiere_observaciones
                      const totalUnidades = linea.cantidad_pedida
                      const completadas = (seriesConfirmadas[linea.producto_id] || []).filter(u =>
                        (!linea.tiene_serie || u.nro_serie.trim() !== '')
                      ).length
                      const todoCompleto = completadas >= totalUnidades && totalUnidades > 0
                      return (
                        <td className="py-3 px-4 text-center">
                          {necesitaTracking ? (
                            <button
                              title="Registrar datos de unidades"
                              onClick={() => {
                                const existentes = seriesConfirmadas[linea.producto_id]
                                const iniciales = existentes && existentes.length >= totalUnidades
                                  ? existentes.slice(0, totalUnidades)
                                  : Array.from({ length: totalUnidades }, (_, i) => existentes?.[i] ?? { nro_serie: '', outlet: false })
                                setModalSerieProducto(linea)
                                setModalSerieUnidades(iniciales)
                                setModalSerieUnidadActiva(0)
                                setModalSerieOpen(true)
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                todoCompleto
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              {todoCompleto
                                ? `${completadas}/${totalUnidades} listo`
                                : `${completadas}/${totalUnidades}`}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      )
                    })()}
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
  // RENDER CATEGORÍAS PROVEEDORES
  // =====================================================
  const renderCatProveedores = () => {
    const cat = nuevaCatProv
    const setCat = (patch: Partial<typeof cat>) => setNuevaCatProv(prev => ({ ...prev, ...patch }))

    const CUENTAS_COBRAR = ["1.1.1 - Clientes", "1.1.2 - Documentos a Cobrar", "1.1.3 - Cheques en Cartera"]
    const CUENTAS_PAGAR = ["2.1.1 - Proveedores", "2.1.2 - Documentos a Pagar", "2.1.3 - Anticipo Proveedores"]

    const handleGuardarCat = async () => {
      if (!cat.nombre.trim()) return
      const payload = {
        nombre: cat.nombre,
        disponible_clientes: cat.disponible_clientes,
        disponible_proveedores: cat.disponible_proveedores,
        tipo_control: cat.tipo_control,
        cuenta_cobrar_defecto: cat.cuenta_cobrar_defecto,
        cuenta_pagar_defecto: cat.cuenta_pagar_defecto,
        requiere_oc_para_facturar: cat.requiere_oc_para_facturar,
        comprobantes_confidenciales: cat.comprobantes_confidenciales,
      }
      try {
        if (selectedCatProv) {
          const updated = await updateCategoriaProveedor(selectedCatProv.id, payload)
          setCategoriasProveedor(prev => prev.map(c =>
            c.id === selectedCatProv.id
              ? { ...c, ...updated, tipo_control: updated.tipo_control as CategoriaProveedor["tipo_control"], listas_precios: c.listas_precios }
              : c
          ))
          setSelectedCatProv(null)
        } else {
          const created = await createCategoriaProveedor(payload)
          setCategoriasProveedor(prev => [...prev, {
            id: created.id,
            nombre: created.nombre,
            disponible_clientes: created.disponible_clientes,
            disponible_proveedores: created.disponible_proveedores,
            tipo_control: created.tipo_control as CategoriaProveedor["tipo_control"],
            cuenta_cobrar_defecto: created.cuenta_cobrar_defecto,
            cuenta_pagar_defecto: created.cuenta_pagar_defecto,
            requiere_oc_para_facturar: created.requiere_oc_para_facturar,
            comprobantes_confidenciales: created.comprobantes_confidenciales,
            listas_precios: [],
          }])
        }
        setCreandoCatProv(false)
        setNuevaCatProv(catProvFormVacio)
        setCatProvTabActivo("listas_precios")
      } catch (e) {
        console.error(e)
      }
    }

    const handleNueva = () => {
      setSelectedCatProv(null)
      setNuevaCatProv(catProvFormVacio)
      setCatProvTabActivo("listas_precios")
      setCreandoCatProv(true)
    }

    const handleVerDetalle = (c: CategoriaProveedor) => {
      setSelectedCatProv(c)
      setCreandoCatProv(false)
    }

    const handleEditar = (c: CategoriaProveedor) => {
      setNuevaCatProv({
        nombre: c.nombre,
        disponible_clientes: c.disponible_clientes,
        disponible_proveedores: c.disponible_proveedores,
        tipo_control: c.tipo_control,
        cuenta_cobrar_defecto: c.cuenta_cobrar_defecto,
        cuenta_pagar_defecto: c.cuenta_pagar_defecto,
        requiere_oc_para_facturar: c.requiere_oc_para_facturar,
        comprobantes_confidenciales: c.comprobantes_confidenciales,
        listas_precios: c.listas_precios,
      })
      setSelectedCatProv(c)
      setCatProvTabActivo("listas_precios")
      setCreandoCatProv(true)
    }

    const handleEliminarCat = async (id: number) => {
      try {
        await deleteCategoriaProveedor(id)
        setCategoriasProveedor(prev => prev.filter(c => c.id !== id))
      } catch (e) {
        console.error(e)
      }
    }

    const addListaPrecio = () => {
      setCat({ listas_precios: [...cat.listas_precios, { id: Date.now(), nombre: "", tipo: "", moneda: "ARS" }] })
    }

    const removeListaPrecio = (id: number) => {
      setCat({ listas_precios: cat.listas_precios.filter(l => l.id !== id) })
    }

    const updateListaPrecio = (id: number, patch: Partial<ListaPrecioPermitida>) => {
      setCat({ listas_precios: cat.listas_precios.map(l => l.id === id ? { ...l, ...patch } : l) })
    }

    // Vista ficha (detalle, solo lectura)
    if (selectedCatProv && !creandoCatProv) {
      const c = selectedCatProv
      return (
        <div>
          {/* Breadcrumb */}
          <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <button onClick={() => setSelectedCatProv(null)} className="hover:text-blue-600">Categorías de Proveedores</button>
            <span>/</span>
            <span className="text-gray-900">{c.nombre}</span>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <BotonVolver onClick={() => setSelectedCatProv(null)} variant="minimal" texto="" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{c.nombre}</h1>
                <p className="text-sm text-gray-500">Categoría de Proveedor</p>
              </div>
            </div>
            <button
              onClick={() => handleEditar(c)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
            >
              <Edit className="w-4 h-4" /> Editar
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Configuración</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Disponible para clientes:</span>
                    <span className={`ml-2 font-medium ${c.disponible_clientes ? "text-green-600" : "text-gray-400"}`}>
                      {c.disponible_clientes ? "Sí" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Disponible para proveedores:</span>
                    <span className={`ml-2 font-medium ${c.disponible_proveedores ? "text-green-600" : "text-gray-400"}`}>
                      {c.disponible_proveedores ? "Sí" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tipo de Control:</span>
                    <span className="ml-2 font-medium">{c.tipo_control}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Req. OC para facturar:</span>
                    <span className={`ml-2 font-medium ${c.requiere_oc_para_facturar ? "text-green-600" : "text-gray-400"}`}>
                      {c.requiere_oc_para_facturar ? "Sí" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Comprobantes confidenciales:</span>
                    <span className={`ml-2 font-medium ${c.comprobantes_confidenciales ? "text-red-600" : "text-gray-400"}`}>
                      {c.comprobantes_confidenciales ? "Sí" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {(c.cuenta_cobrar_defecto || c.cuenta_pagar_defecto) && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Cuentas Contables</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {c.cuenta_cobrar_defecto && (
                      <div>
                        <span className="text-gray-500">Cuenta a cobrar por defecto:</span>
                        <span className="ml-2 font-medium">{c.cuenta_cobrar_defecto}</span>
                      </div>
                    )}
                    {c.cuenta_pagar_defecto && (
                      <div>
                        <span className="text-gray-500">Cuenta a pagar por defecto:</span>
                        <span className="ml-2 font-medium">{c.cuenta_pagar_defecto}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel lateral */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Resumen</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Proveedores con esta categoría:</span>
                    <span className="font-bold text-gray-900">
                      {proveedores.filter(p => p.categoria_proveedor === c.nombre).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Vista formulario
    if (creandoCatProv) {
      return (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <BotonVolver onClick={() => { setCreandoCatProv(false); setSelectedCatProv(null); setNuevaCatProv(catProvFormVacio) }} variant="minimal" texto="" />
            <h1 className="text-xl font-bold text-gray-900">
              {selectedCatProv ? `Editando: ${selectedCatProv.nombre}` : "Nueva Categoría de Proveedor"}
            </h1>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            {/* Nombre */}
            <div className="px-6 pt-5 pb-4 border-b">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={cat.nombre}
                onChange={e => setCat({ nombre: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Fila de controles */}
            <div className="grid grid-cols-2 gap-x-12 px-6 py-5 border-b">
              {/* Columna izquierda */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cat.disponible_clientes}
                    onChange={e => setCat({ disponible_clientes: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                  />
                  Disponible para clientes
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cat.disponible_proveedores}
                    onChange={e => setCat({ disponible_proveedores: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                  />
                  Disponible para proveedores
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-sm text-gray-700 whitespace-nowrap">Tipo de Control</span>
                  <select
                    value={cat.tipo_control}
                    onChange={e => setCat({ tipo_control: e.target.value as CategoriaProveedor["tipo_control"] })}
                    className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ninguno">Ninguno</option>
                    <option value="Por Avisos">Por Avisos</option>
                    <option value="Por Bloqueo">Por Bloqueo</option>
                  </select>
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 whitespace-nowrap w-52">Cuenta a cobrar por defecto</span>
                  <select
                    value={cat.cuenta_cobrar_defecto}
                    onChange={e => setCat({ cuenta_cobrar_defecto: e.target.value })}
                    className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value=""></option>
                    {CUENTAS_COBRAR.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 whitespace-nowrap w-52">Cuenta a pagar por defecto</span>
                  <select
                    value={cat.cuenta_pagar_defecto}
                    onChange={e => setCat({ cuenta_pagar_defecto: e.target.value })}
                    className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value=""></option>
                    {CUENTAS_PAGAR.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cat.requiere_oc_para_facturar}
                    onChange={e => setCat({ requiere_oc_para_facturar: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Requiere Orden de Compra para Facturar
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cat.comprobantes_confidenciales}
                    onChange={e => setCat({ comprobantes_confidenciales: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Comprobantes confidenciales
                </label>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6 pt-2">
              {[
                { id: "listas_precios", label: "Listas de Precios Permitidas" },
                { id: "grupos_descuentos", label: "Grupos de Descuentos Permitidos" },
                { id: "cuentas_perm", label: "Cuentas Permitidas para Proveedores" },
                { id: "leyenda", label: "Leyenda para Impresión de Presupuestos" },
                { id: "grupos", label: "Grupos" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCatProvTabActivo(tab.id as typeof catProvTabActivo)}
                  className={`px-4 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                    catProvTabActivo === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="px-6 py-4">
              {catProvTabActivo === "listas_precios" && (
                <div>
                  <p className="text-xs text-gray-500 mb-3">Si no se selecciona ninguna se permitirán todas las Listas de Precios</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                        <th className="text-left py-2 px-3">Nombre lista de precios</th>
                        <th className="text-left py-2 px-3">Tipo de lista de precios</th>
                        <th className="text-left py-2 px-3">Moneda</th>
                        <th className="py-2 px-3 w-8">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.listas_precios.map(lp => (
                        <tr key={lp.id} className="border-b">
                          <td className="py-1.5 px-3">
                            <input type="text" value={lp.nombre} onChange={e => updateListaPrecio(lp.id, { nombre: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nombre" />
                          </td>
                          <td className="py-1.5 px-3">
                            <input type="text" value={lp.tipo} onChange={e => updateListaPrecio(lp.id, { tipo: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Tipo" />
                          </td>
                          <td className="py-1.5 px-3">
                            <select value={lp.moneda} onChange={e => updateListaPrecio(lp.id, { moneda: e.target.value as "ARS" | "USD" | "EUR" })}
                              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="ARS">ARS</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-3">
                            <button onClick={() => removeListaPrecio(lp.id)} className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={addListaPrecio} className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Añadir un elemento
                  </button>
                </div>
              )}
              {catProvTabActivo !== "listas_precios" && (
                <p className="text-sm text-gray-400 py-4 text-center">Sin elementos configurados.</p>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setCreandoCatProv(false)
                setNuevaCatProv(catProvFormVacio)
                // Si estábamos editando, volver a la ficha; si era nueva, volver al listado
                if (!selectedCatProv) setSelectedCatProv(null)
                else setCreandoCatProv(false)
              }}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarCat}
              disabled={!cat.nombre.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {selectedCatProv ? "Guardar Cambios" : "Crear Categoría"}
            </button>
          </div>
        </div>
      )
    }

    // Vista listado
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorías de Proveedores</h1>
            <p className="text-gray-500 mt-1">Configure las categorías para clasificar sus proveedores</p>
          </div>
          <button
            onClick={handleNueva}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-center py-3 px-4">Clientes</th>
                <th className="text-center py-3 px-4">Proveedores</th>
                <th className="text-left py-3 px-4">Tipo Control</th>
                <th className="text-center py-3 px-4">Req. OC</th>
                <th className="text-center py-3 px-4">Confidencial</th>
              </tr>
            </thead>
            <tbody>
              {loadingCatProv && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                    Cargando categorías...
                  </td>
                </tr>
              )}
              {!loadingCatProv && categoriasProveedor.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                    No hay categorías configuradas. Hacé clic en &quot;Nueva Categoría&quot; para crear una.
                  </td>
                </tr>
              )}
              {categoriasProveedor.map(c => (
                <tr
                  key={c.id}
                  onClick={() => handleVerDetalle(c)}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{c.nombre}</td>
                  <td className="py-3 px-4 text-center">
                    {c.disponible_clientes ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {c.disponible_proveedores ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{c.tipo_control}</td>
                  <td className="py-3 px-4 text-center">
                    {c.requiere_oc_para_facturar ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {c.comprobantes_confidenciales ? <Lock className="w-4 h-4 text-red-500 mx-auto" /> : <span className="text-gray-300">—</span>}
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
      case "cat_proveedores":
        return renderCatProveedores()
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

      {/* ===== MODAL WIZARD REGISTRO DE UNIDADES ===== */}
      {modalSerieOpen && modalSerieProducto && (() => {
        const linea = modalSerieProducto
        const cantTotal = Math.max(linea.cantidad_pedida, 1)
        const unidadIdx = Math.min(modalSerieUnidadActiva, cantTotal - 1)
        const unidadActual = modalSerieUnidades[unidadIdx] ?? { nro_serie: '', outlet: false }

        const updateUnidad = (patch: Partial<UnidadSerie>) => {
          setModalSerieUnidades(prev => {
            const updated = [...prev]
            while (updated.length < cantTotal) updated.push({ nro_serie: '', outlet: false })
            updated[unidadIdx] = { ...updated[unidadIdx], ...patch }
            return updated
          })
        }

        const unidadCompleta = (u: UnidadSerie) =>
          (!linea.tiene_serie || u.nro_serie.trim() !== '') &&
          (!linea.requiere_color || (u.color ?? '').trim() !== '') &&
          (!linea.requiere_bateria || (u.bateria_pct !== undefined && u.bateria_pct !== null))

        const completadas = modalSerieUnidades.filter((u, i) => i < cantTotal && unidadCompleta(u)).length

        const irA = (i: number) => setModalSerieUnidadActiva(Math.max(0, Math.min(cantTotal - 1, i)))

        const irSiguiente = () => {
          if (unidadIdx < cantTotal - 1) irA(unidadIdx + 1)
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{linea.producto_nombre}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Registro de unidades
                  </p>
                </div>
                <button onClick={() => setModalSerieOpen(false)} className="text-gray-400 hover:text-gray-600 ml-4">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de progreso + counter */}
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progreso</span>
                  <span className="text-sm font-semibold text-gray-800">
                    <span className={completadas === cantTotal ? 'text-emerald-600' : 'text-amber-600'}>{completadas}</span>
                    <span className="text-gray-400"> / {cantTotal} completados</span>
                  </span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: cantTotal }).map((_, i) => {
                    const u = modalSerieUnidades[i] ?? { nro_serie: '', outlet: false }
                    const completa = unidadCompleta(u)
                    return (
                      <button
                        key={i}
                        onClick={() => irA(i)}
                        title={`Unidad ${i + 1}`}
                        className={`h-2 flex-1 rounded-full transition-colors ${
                          i === unidadIdx
                            ? 'bg-emerald-500 ring-2 ring-emerald-300 ring-offset-1'
                            : completa
                            ? 'bg-emerald-400'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Navegador de unidad */}
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-y">
                <button
                  onClick={() => irA(unidadIdx - 1)}
                  disabled={unidadIdx === 0}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <span className="text-sm font-semibold text-gray-800">
                  Unidad {unidadIdx + 1} <span className="text-gray-400 font-normal">de {cantTotal}</span>
                </span>
                <button
                  onClick={() => irA(unidadIdx + 1)}
                  disabled={unidadIdx === cantTotal - 1}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
                >
                  Siguiente <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario de la unidad activa */}
              <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[55vh]">
                {/* N° Serie / IMEI */}
                {linea.tiene_serie && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      N° Serie / IMEI <span className="text-red-500">*</span>
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={unidadActual.nro_serie}
                      placeholder="Ej: 359173012345678"
                      onChange={e => updateUnidad({ nro_serie: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') irSiguiente() }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Color */}
                {linea.requiere_color && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Color <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={unidadActual.color ?? ''}
                      onChange={e => updateUnidad({ color: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Seleccionar color...</option>
                      {['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Gris', 'Plata', 'Oro', 'Morado', 'Rosa', 'Naranja'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* % Batería */}
                {linea.requiere_bateria && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      % Batería <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={unidadActual.bateria_pct ?? ''}
                        placeholder="0 – 100"
                        onChange={e => updateUnidad({ bateria_pct: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <span className="text-sm text-gray-400">%</span>
                      {unidadActual.bateria_pct !== undefined && (
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (unidadActual.bateria_pct ?? 0) >= 80 ? 'bg-emerald-500' :
                              (unidadActual.bateria_pct ?? 0) >= 50 ? 'bg-yellow-400' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, unidadActual.bateria_pct ?? 0)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Outlet */}
                {linea.requiere_outlet && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="modal-outlet"
                      checked={unidadActual.outlet}
                      onChange={e => updateUnidad({ outlet: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600"
                    />
                    <label htmlFor="modal-outlet" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Equipo Outlet (tiene daño estético)
                    </label>
                  </div>
                )}

                {/* Observaciones / Fallas */}
                {linea.requiere_observaciones && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      Observaciones / Fallas
                    </label>
                    <textarea
                      value={unidadActual.fallas ?? ''}
                      placeholder="Describa fallas, daños o notas relevantes..."
                      rows={2}
                      onChange={e => updateUnidad({ fallas: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Footer — botones de acción */}
              <div className="flex items-center justify-end gap-2 px-6 py-3 bg-gray-50 rounded-b-xl border-t">
                <button
                  onClick={() => setModalSerieOpen(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  Cancelar
                </button>
                {/* Guardar: persiste sin cerrar, permite seguir editando */}
                <button
                  onClick={() => {
                    const finales = Array.from({ length: cantTotal }, (_, i) => modalSerieUnidades[i] ?? { nro_serie: '', outlet: false })
                    setSeriesConfirmadas(prev => ({ ...prev, [linea.producto_id]: finales }))
                    // Sincronizar cant. recibida con las unidades que tienen serie completa
                    const cantCompletas = finales.filter(u => unidadCompleta(u)).length
                    setRecepcionCantidades(prev => ({ ...prev, [linea.producto_id]: cantCompletas }))
                    // Feedback visual
                    const btn = document.getElementById('btn-guardar-serie')
                    if (btn) {
                      btn.textContent = '¡Guardado!'
                      btn.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-800')
                      setTimeout(() => {
                        btn.textContent = 'Guardar'
                        btn.classList.remove('bg-emerald-100', 'border-emerald-500', 'text-emerald-800')
                      }, 1500)
                    }
                  }}
                  id="btn-guardar-serie"
                  className="px-4 py-2 text-sm border border-emerald-400 rounded-lg text-emerald-700 hover:bg-emerald-50 font-medium transition-colors"
                >
                  Guardar
                </button>
                {/* Confirmar: valida duplicados, guarda y cierra */}
                <button
                  onClick={() => {
                    if (linea.tiene_serie) {
                      const series = modalSerieUnidades.slice(0, cantTotal).map(u => u.nro_serie.trim()).filter(Boolean)
                      const duplicados = series.filter((s, i) => series.indexOf(s) !== i)
                      if (duplicados.length > 0) {
                        alert(`N° de serie duplicado: ${duplicados[0]}`)
                        return
                      }
                    }
                    const finales = Array.from({ length: cantTotal }, (_, i) => modalSerieUnidades[i] ?? { nro_serie: '', outlet: false })
                    setSeriesConfirmadas(prev => ({ ...prev, [linea.producto_id]: finales }))
                    // Sincronizar cant. recibida con las unidades completas
                    const cantCompletas = finales.filter(u => unidadCompleta(u)).length
                    setRecepcionCantidades(prev => ({ ...prev, [linea.producto_id]: cantCompletas }))
                    setModalSerieOpen(false)
                  }}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Confirmar ({completadas}/{cantTotal})
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
