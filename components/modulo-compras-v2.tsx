"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import ComprobantePopup, { type ComprobantePopupProps } from "./comprobante-popup"
import { useRouter, useSearchParams } from "next/navigation"

// Componente helper: redirige a /compras/op desde dentro del monolito cuando
// el activeView quedó en "ordenes_pago" (típicamente porque venimos de un Link
// viejo o de navegación interna). Hace router.replace en useEffect — fuera de
// render para no romper React.
function OrdenesPagoRedirect({ router }: { router: ReturnType<typeof useRouter> }) {
  React.useEffect(() => {
    router.replace("/compras/op")
  }, [router])
  return <div className="p-12 text-center text-gray-500">Llevándote a Órdenes de Pago…</div>
}
import ReactDOM from "react-dom"
import { Search, Filter, ChevronDown, ChevronRight, X, Plus, FileText, Truck, Receipt, CreditCard, Users, DollarSign, Package, ArrowRight, Eye, Edit, Trash2, Download, Mail, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Phone, Globe, Calendar, Tag, Percent, Star, TrendingUp, RefreshCw, User, Warehouse, Save, MessageSquare, Settings, Lock, Unlock, FileBox, Ship, Plane, Pencil, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react"
import BotonVolver from "./ui/boton-volver"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import { ModalMedioPago } from "./modal-medio-pago"
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
  fetchOrdenPagoDetalle,
  guardarOrdenPago,
  eliminarOrdenPago,
  confirmarOrdenPagoAPI,
  cancelarOrdenPagoAPI,
  fetchNotasCreditoCompra,
  guardarNotaCreditoCompra,
  fetchNotasDebitoCompra,
  guardarNotaDebitoCompra,
  publicarFacturaCompra,
  cancelarFacturaCompra,
  fetchAsientoFacturaCompra,
  fetchAsientoRecepcion,
  fetchAsientoOrdenPago,
} from "@/lib/compras-actions"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"

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
  moneda: string
}

interface CategoriaProveedor {
  id: number
  nombre: string
  disponible_clientes: boolean
  disponible_proveedores: boolean
  tipo_control: "Ninguno" | "Por Avisos" | "Por Bloqueo"
  cuenta_cobrar_defecto: string
  cuenta_pagar_defecto: string
  cuenta_pagar_id: string | null       // UUID → contabilidad_plan_cuentas (por defecto)
  cuenta_pagar_codigo?: string
  cuenta_pagar_nombre?: string
  requiere_oc_para_facturar: boolean
  comprobantes_confidenciales: boolean
  listas_precios: ListaPrecioPermitida[]
  cuentas_permitidas: { id: string; codigo: string; nombre: string }[]  // pivot categorias_proveedor_cuentas
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
  moneda_habitual: string
  categoria: "publico" | "privado"
  confidencial: boolean
  tipo: "nacional" | "internacional" | "despachante"
  saldo: number
  activo: boolean
  // Contactos múltiples
  contactos: ContactoProveedor[]
  // Tab Ventas & Compras
  sucursal_origen: string
  moneda_defecto: string
  // Tab Contabilidad
  aplica_circuito_compras: boolean
  cuenta_gastos_defecto: string
  cuenta_gastos_defecto_codigo: string
  cuenta_gastos_defecto_nombre: string
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
  nac?: boolean
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
  deposito_destino_id?: number
  ubicacion_destino?: string
  ubicacion_destino_id?: number
  moneda: string
  tipo_cotizacion?: string   // 'oficial' | 'blue' | 'mep'
  cotizacion_dia?: number | null  // valor ARS/USD al emitir la OC
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
  // Circuito de compras
  factura_circuito_id?: number | null
  recepcion_circuito_id?: number | null
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
  nac?: boolean
}

interface Recepcion {
  id: number
  numero: string
  fecha: string
  sucursal: string
  proveedor_id?: number
  proveedor_nombre?: string
  deposito_destino: string
  deposito_destino_id?: number
  ubicacion_destino?: string
  ubicacion_destino_id?: number
  documento_origen_tipo: "oc" | "toma_equipo" | "transferencia"
  documento_origen_id?: number
  documento_origen_ref: string
  fecha_pedido?: string
  fecha_entrega_esperada?: string
  fecha_recepcion_real?: string
  remito_numero?: string
  remito_fecha?: string
  observaciones?: string
  estado: "esperando_recepcion" | "recibida" | "recibida_parcial" | "cancelada"
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
  asiento_id?: string | null
}

interface FacturaCompraLinea {
  id?: string
  cuenta_contable_id: string | null
  cuenta_codigo: string
  cuenta_nombre: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento_pct: number
  alicuota_iva: number
  subtotal: number
  iva: number
  total_linea: number
  orden: number
}

interface FacturaCompra {
  id: number
  numero: string
  tipo: "A" | "B" | "C" | "E" | "NC-A" | "NC-B" | "NC-C" | "Ticket" | "Recibo"
  fecha: string
  fecha_vencimiento: string
  proveedor_id: number
  proveedor_nombre: string
  estado: "borrador" | "pendiente" | "pagada_parcial" | "pagada" | "cancelada"
  orden_compra_id?: number
  recepcion_id?: number
  moneda: string
  tipo_cambio: number
  cotizacion?: number
  tipo_cotizacion?: string
  sucursal?: string
  subtotal: number
  impuestos: number
  total: number
  saldo: number
  legajo_id?: number
  despacho_simple_id?: number
  asiento_id?: string | null
  es_automatica?: boolean
  lineas: FacturaCompraLinea[]
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
  moneda: string
  subtotal: number
  impuestos: number
  total: number
  saldo_disponible?: number | null
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
  moneda: string
  subtotal: number
  impuestos: number
  total: number
  saldo_disponible?: number | null
  legajo_id?: number
  lineas: {
    descripcion: string
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
}

interface OrdenPago {
  id: string
  numero: string
  fecha: string
  sucursal_id?: string
  sucursal_nombre?: string
  proveedor_id: number
  proveedor_nombre: string
  caja_id?: string
  caja_nombre?: string
  moneda: string
  tipo_cotizacion?: "oficial" | "blue" | "mep"
  cotizacion?: number
  importe: number
  importe_ars?: number
  importe_a_cuenta: number
  importe_no_conciliado: number
  concepto?: string
  orden_compra_id?: number
  orden_compra_numero?: string
  estado: "borrador" | "publicado" | "cancelado"
  periodo?: string
  observaciones?: string
  created_by?: string
  created_at?: string
  medios_pago?: OPMedioPago[]
  comprobantes?: OPComprobante[]
}

interface OPMedioPago {
  id?: string
  op_id?: string
  nombre?: string
  forma_pago_id?: string
  forma_pago_nombre?: string
  tipo_operacion?: string
  tipo_cotizacion?: "oficial" | "blue" | "mep"
  cotizacion?: number
  numero_operacion?: string
  fecha_operacion?: string
  importe: number
  moneda: string
  importe_comp: number
  moneda_comp?: string
  observaciones?: string
}

interface OPComprobante {
  id?: string
  op_id?: string
  tipo: "debito" | "credito"
  factura_id?: number
  referencia: string
  fecha?: string
  vencimiento?: string
  saldo_mon?: number
  moneda_comp?: string
  tipo_cotizacion?: string
  cotizacion_original?: number
  saldo_original: number
  cotizacion?: number
  importe_en_liquidacion?: number
  saldo: number
  total: number
  importe: number
}

interface CajaDisponible {
  id: string
  nombre: string
  sucursal: string
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
  moneda: string
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
    moneda: string
    tipo_cambio: number
    importe_base: number
  }
  flete_nacional: {
    importe: number
    moneda: string
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
  moneda_habitual: string
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

// ─── ComprasListSection (wrapper reutilizable con OdooFilterBar) ─────────────
function ComprasListSection<T extends object>({
  title, subtitle, moduleName, data, searchFields, filterFields, actions, children,
}: {
  title: string; subtitle?: string; moduleName: string; data: T[]
  searchFields: (keyof T)[]; filterFields: { field: keyof T; label: string }[]
  actions?: React.ReactNode; children: (filtered: T[]) => React.ReactNode
}) {
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const filtered = useMemo(() => {
    let result = [...data]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(row => searchFields.some(f => String(row[f] ?? "").toLowerCase().includes(q)))
    }
    for (const f of activeFilters) {
      result = result.filter(row => String(row[f.field as keyof T] ?? "") === f.value)
    }
    return result
  }, [data, search, activeFilters, searchFields])

  const filterOptions = useMemo(() =>
    filterFields.map(ff => {
      const vals = [...new Set(data.map(row => String(row[ff.field] ?? "")).filter(v => v && v !== "null" && v !== "undefined"))]
      return { field: String(ff.field), label: ff.label, values: vals.sort().map(v => ({ value: v, label: v })) }
    }).filter(f => f.values.length > 0),
  [data, filterFields])

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({ id: String(ff.field), label: ff.label, field: String(ff.field) }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <OdooFilterBar moduleName={moduleName} filterOptions={filterOptions} groupByOptions={groupByOptions}
        activeFilters={activeFilters} activeGroupBy={activeGroupBy} searchTerm={search}
        onFiltersChange={setActiveFilters} onGroupByChange={setActiveGroupBy} onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={(f) => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={(id) => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={(f) => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }}
        totalCount={data.length} filteredCount={filtered.length}
      />
      <div className="mt-4">{children(filtered)}</div>
    </div>
  )
}

// ─── ModalCuentaContable ──────────────────────────────────────────────────────
const GRUPOS_CUENTA: Record<string, string> = {
  "1": "Activo",
  "2": "Pasivo",
  "3": "Patrimonio Neto",
  "4": "Resultado – Ingresos",
  "5": "Costo de Ventas",
  "6": "Gastos",
  "7": "Otros Ingresos",
  "8": "Otros Egresos",
  "9": "Cuentas de Orden",
}

function ModalCuentaContable({
  onSelect,
  onClose,
  cuentasPermitidas,
}: {
  onSelect: (c: { id: string; codigo: string; nombre: string }) => void
  onClose: () => void
  cuentasPermitidas?: { id: string; codigo: string; nombre: string }[]
}) {
  type Cuenta = { id: string; codigo: string; nombre: string }
  const tieneRestriccion = (cuentasPermitidas?.length ?? 0) > 0
  const [todas, setTodas] = React.useState<Cuenta[]>([])
  const [busqueda, setBusqueda] = React.useState("")
  const [activeFilters, setActiveFilters] = React.useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = React.useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = React.useState<SavedFilter[]>([])

  React.useEffect(() => {
    if (tieneRestriccion) { setTodas(cuentasPermitidas!); return }
    fetch("/api/contabilidad/cuentas?q=&limit=500")
      .then(r => r.json())
      .then(d => setTodas(Array.isArray(d?.data) ? d.data : []))
      .catch(() => {})
  }, [tieneRestriccion])

  const filtradas = React.useMemo(() => {
    let result = todas
    const q = busqueda.trim().toLowerCase()
    if (q) result = result.filter(c => c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q))
    // Aplicar filtros activos (por prefijo de código)
    for (const f of activeFilters) {
      if (f.field === "prefijo") result = result.filter(c => c.codigo.startsWith(f.value))
    }
    return result
  }, [todas, busqueda, activeFilters])

  // Agrupar por tipo (primer dígito)
  const agrupadoPorTipo = activeGroupBy.some(g => g.field === "tipo")
  const grupos = React.useMemo(() => {
    if (!agrupadoPorTipo) return null
    const map: Record<string, Cuenta[]> = {}
    for (const c of filtradas) {
      const k = c.codigo[0] ?? "?"
      if (!map[k]) map[k] = []
      map[k].push(c)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtradas, agrupadoPorTipo])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }} onClick={e => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-amber-900">Seleccionar cuenta contable</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* OdooFilterBar */}
        <div className="border-b">
          <OdooFilterBar
            moduleName="cuentas-contables-selector"
            filterOptions={[
              {
                field: "prefijo", label: "Tipo de cuenta",
                values: Object.entries(GRUPOS_CUENTA).map(([v, l]) => ({ value: v, label: `${v} — ${l}` })),
              },
            ]}
            groupByOptions={[
              { id: "tipo", label: "Tipo de cuenta", field: "tipo" },
            ]}
            activeFilters={activeFilters}
            activeGroupBy={activeGroupBy}
            searchTerm={busqueda}
            onFiltersChange={setActiveFilters}
            onGroupByChange={setActiveGroupBy}
            onSearchChange={setBusqueda}
            savedFilters={savedFilters}
            onSaveFilter={f => setSavedFilters(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "usuario" }])}
            onDeleteFilter={id => setSavedFilters(prev => prev.filter(f => f.id !== id))}
            onApplyFilter={f => { setActiveFilters(f.filters); setActiveGroupBy(f.groupBy) }}
            totalCount={todas.length}
            filteredCount={filtradas.length}
            hideFavorites
          />
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              {busqueda || activeFilters.length > 0 ? "Sin resultados para los filtros aplicados" : "Cargando cuentas..."}
            </div>
          )}

          {grupos ? (
            grupos.map(([prefijo, cuentas]) => (
              <div key={prefijo}>
                <div className="px-5 py-2 bg-gray-50 border-b border-t text-xs font-semibold text-gray-500 uppercase sticky top-0">
                  {prefijo} — {GRUPOS_CUENTA[prefijo] ?? `Grupo ${prefijo}`}
                  <span className="ml-2 font-normal text-gray-400">({cuentas.length})</span>
                </div>
                {cuentas.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { onSelect(c); onClose() }}
                    className="w-full text-left px-5 py-2.5 hover:bg-indigo-50 border-b border-gray-50 flex items-center gap-3 transition-colors">
                    <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
                    <span className="text-sm text-gray-800">{c.nombre}</span>
                  </button>
                ))}
              </div>
            ))
          ) : (
            filtradas.map(c => (
              <button key={c.id} type="button"
                onClick={() => { onSelect(c); onClose() }}
                className="w-full text-left px-5 py-2.5 hover:bg-indigo-50 border-b border-gray-50 flex items-center gap-3 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{c.codigo}</span>
                <span className="text-sm text-gray-800">{c.nombre}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ProveedorSelector ────────────────────────────────────────────────────────
function ProveedorSelector({
  value, onChange, proveedores, placeholder = "Seleccionar proveedor...",
}: {
  value: number | undefined | null
  onChange: (id: number | undefined, nombre: string, moneda?: string, tipoCotizacion?: string) => void
  proveedores: any[]
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [abierto, setAbierto] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalSearch, setModalSearch] = useState("")
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 240 })
  const refTrigger = React.useRef<HTMLButtonElement>(null)

  const proveedorActual = proveedores.find(p => p.id === value)

  const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  const filtrar = (q: string) =>
    proveedores.filter(p => {
      if (!q.trim()) return true
      const n = normalizar(q)
      return normalizar(p.nombre ?? "").includes(n) || normalizar(p.razon_social ?? "").includes(n) || (p.cuit ?? "").includes(q)
    })

  const opciones = filtrar(query).slice(0, 5)
  const opcionesModal = filtrar(modalSearch)

  const abrirDropdown = () => {
    if (!refTrigger.current) return
    const r = refTrigger.current.getBoundingClientRect()
    setDropdownPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width })
    setAbierto(true)
  }

  const seleccionar = (p: any) => {
    onChange(p.id, p.nombre || p.razon_social || "", p.moneda_habitual, p.tipo_cotizacion_defecto)
    setQuery("")
    setAbierto(false)
    setModalAbierto(false)
  }

  const limpiar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined, "")
  }

  React.useEffect(() => {
    if (!abierto) return
    const handler = (e: MouseEvent) => {
      const dd = document.getElementById("prov-selector-dropdown")
      if (dd && dd.contains(e.target as Node)) return
      if (refTrigger.current && refTrigger.current.contains(e.target as Node)) return
      setAbierto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [abierto])

  const dropdown = (
    <div id="prov-selector-dropdown" style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, minWidth: Math.min(dropdownPos.width, 300), maxWidth: 440, zIndex: 9999 }}
      className="bg-white border border-gray-200 shadow-xl rounded-lg flex flex-col overflow-hidden">
      <div className="p-2 border-b">
        <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar proveedor..."
          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      {opciones.map(p => (
        <div key={p.id} onMouseDown={e => { e.preventDefault(); seleccionar(p) }}
          className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-b-0">
          <span className="font-medium">{p.nombre || p.razon_social}</span>
          {p.cuit && <span className="ml-2 text-xs text-gray-400">{p.cuit}</span>}
        </div>
      ))}
      {opciones.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
      )}
      <div role="button"
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); requestAnimationFrame(() => { setModalAbierto(true); setModalSearch(query); setAbierto(false) }) }}
        className="px-3 py-2 text-sm font-medium flex items-center gap-2 cursor-pointer"
        style={{ backgroundColor: "#eef2ff", color: "#3730a3", borderTop: "2px solid #c7d2fe" }}>
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>{filtrar(query).length > 5 ? `Buscar más… (${filtrar(query).length - 5} más)` : "Buscar en todos los proveedores..."}</span>
      </div>
    </div>
  )

  return (
    <>
      <button ref={refTrigger} type="button" onClick={abrirDropdown}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
        <span className={proveedorActual ? "text-gray-900" : "text-gray-400"}>
          {proveedorActual ? (proveedorActual.nombre || proveedorActual.razon_social) : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {proveedorActual && (
            <span onMouseDown={e => { e.preventDefault(); limpiar(e) }} className="text-gray-300 hover:text-gray-500 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </span>
      </button>
      {abierto && typeof document !== "undefined" && ReactDOM.createPortal(dropdown, document.body)}

      {/* Modal búsqueda completa */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
          onMouseDown={e => { if (e.target === e.currentTarget) setModalAbierto(false) }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-amber-900">Seleccionar proveedor</h2>
              <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-5 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input autoFocus type="text" value={modalSearch} onChange={e => setModalSearch(e.target.value)}
                  placeholder="Buscar por nombre, razón social o CUIT..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                {modalSearch && <button onClick={() => setModalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <p className="text-xs text-gray-400 mt-1">{opcionesModal.length} proveedores</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {opcionesModal.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Sin resultados para "{modalSearch}"</div>
              ) : opcionesModal.map(p => (
                <div key={p.id} onClick={() => seleccionar(p)}
                  className="px-5 py-2.5 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-gray-900">{p.nombre || p.razon_social}</span>
                    {p.categoria_proveedor && <span className="ml-2 text-xs text-gray-400">{p.categoria_proveedor}</span>}
                  </div>
                  {p.cuit && <span className="text-xs text-gray-400">{p.cuit}</span>}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <button onClick={() => setModalAbierto(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── CuentaContableSelector ───────────────────────────────────────────────────
function CuentaContableSelector({
  value, onChange, cuentasPermitidas,
}: {
  value: string
  onChange: (id: string, codigo?: string, nombre?: string) => void
  cuentasPermitidas?: { id: string; codigo: string; nombre: string }[]
}) {
  const tieneRestriccion = (cuentasPermitidas?.length ?? 0) > 0
  const [query, setQuery] = React.useState("")
  const [opciones, setOpciones] = React.useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [abierto, setAbierto] = React.useState(false)
  const [modalAbierto, setModalAbierto] = React.useState(false)
  const [seleccionada, setSeleccionada] = React.useState<{ id: string; codigo: string; nombre: string } | null>(null)
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0, width: 0 })
  const refTrigger = React.useRef<HTMLDivElement>(null)

  // Resolver cuenta seleccionada desde id
  React.useEffect(() => {
    if (!value) { setSeleccionada(null); return }
    if (tieneRestriccion) {
      setSeleccionada(cuentasPermitidas!.find(c => c.id === value) ?? null)
      return
    }
    fetch(`/api/contabilidad/cuentas?id=${value}`)
      .then(r => r.json())
      .then(data => { if (data?.data) setSeleccionada(data.data) })
      .catch(() => {})
  }, [value, tieneRestriccion])

  // Calcular posición del dropdown relativa al viewport
  const abrirDropdown = () => {
    if (refTrigger.current) {
      const rect = refTrigger.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width })
    }
    setAbierto(v => !v)
  }

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    if (!abierto) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const dropdown = document.getElementById("cuenta-selector-dropdown")
      if (refTrigger.current && !refTrigger.current.contains(target) && !dropdown?.contains(target)) {
        setAbierto(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [abierto])

  // Cargar 5 sugerencias al abrir o cambiar query
  React.useEffect(() => {
    if (!abierto) { setOpciones([]); return }
    if (tieneRestriccion) {
      const q = query.trim().toLowerCase()
      const filtradas = q
        ? cuentasPermitidas!.filter(c => c.codigo.includes(q) || c.nombre.toLowerCase().includes(q))
        : cuentasPermitidas!
      setOpciones(filtradas.slice(0, 5))
      return
    }
    const delay = query.trim().length > 0 ? 300 : 0
    const t = setTimeout(() => {
      const qs = query.trim()
      const url = qs.length > 0
        ? `/api/contabilidad/cuentas?q=${encodeURIComponent(qs)}&limit=5`
        : `/api/contabilidad/cuentas?q=&limit=5`
      fetch(url)
        .then(r => r.json())
        .then(data => setOpciones(Array.isArray(data?.data) ? data.data : []))
        .catch(() => {})
    }, delay)
    return () => clearTimeout(t)
  }, [query, abierto, tieneRestriccion])

  const seleccionar = (op: { id: string; codigo: string; nombre: string }) => {
    setSeleccionada(op)
    onChange(op.id, op.codigo, op.nombre)
    setAbierto(false)
    setQuery("")
  }

  const dropdown = abierto ? (
    <div
      id="cuenta-selector-dropdown"
      style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, minWidth: Math.min(dropdownPos.width, 360), maxWidth: 480, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
    >
      <input
        autoFocus
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Código o nombre..."
        className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none rounded-t-lg"
      />
      {opciones.map(op => (
        <div key={op.id}
          className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 transition-colors"
          onMouseDown={e => { e.preventDefault(); seleccionar(op) }}>
          <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{op.codigo}</span>
          <span className="text-gray-800">{op.nombre}</span>
        </div>
      ))}
      {opciones.length === 0 && query.trim() && (
        <div className="px-3 py-2 text-sm text-gray-400 italic">Sin resultados</div>
      )}
      {/* Botón buscar más — siempre visible */}
      <div
        role="button"
        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setAbierto(false); requestAnimationFrame(() => setModalAbierto(true)) }}
        className="px-3 py-2 text-sm font-medium flex items-center gap-2 rounded-b-lg cursor-pointer"
        style={{ backgroundColor: '#eef2ff', color: '#3730a3', borderTop: '2px solid #c7d2fe' }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>Buscar en todas las cuentas...</span>
      </div>
    </div>
  ) : null

  return (
    <>
      <div ref={refTrigger} className="flex-1">
        {/* Trigger */}
        <div
          className="w-full px-3 py-2 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-indigo-400 bg-white cursor-pointer flex items-center justify-between text-sm"
          onClick={abrirDropdown}
        >
          <span className={seleccionada ? "text-gray-900 font-mono text-xs" : "text-gray-400 text-sm"}>
            {seleccionada ? `${seleccionada.codigo} — ${seleccionada.nombre}` : "Buscar cuenta contable..."}
          </span>
          {seleccionada ? (
            <button type="button" className="text-gray-400 hover:text-red-500 ml-2"
              onClick={e => { e.stopPropagation(); setSeleccionada(null); onChange("") }}>
              <X className="w-3 h-3" />
            </button>
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Dropdown renderizado en body via portal */}
      {typeof document !== "undefined" && abierto && ReactDOM.createPortal(dropdown, document.body)}

      {/* Modal completo */}
      {modalAbierto && (
        <ModalCuentaContable
          cuentasPermitidas={cuentasPermitidas}
          onSelect={seleccionar}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  )
}

interface ModuloComprasProps {
  initialRecepcionNumero?: string | null
  onNavigationHandled?: () => void
}

export default function ModuloCompras({
  initialRecepcionNumero,
  onNavigationHandled,
  forcedView,
  embedded = false,
}: ModuloComprasProps & { forcedView?: string; embedded?: boolean } = {}) {
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
    sucursales,
    sucursalActiva,
    recargarProductos,
    currentUser,
    canSee,
  } = useERP()

  // Mapeo del id del sidebar al sub-vista del catálogo (catalogo_permisos).
  const SIDEBAR_COMPRAS_TO_VISTA: Record<string, string | null> = {
    proveedores:           "proveedores",
    cta_cte_proveedores:   "cta_cte",
    historial_proveedores: "historial",
    conciliacion_deuda:    "conciliacion_deuda",
    ordenes_compra:        "ordenes_compra",
    recepciones:           "recepciones",
    facturas_compra:       "facturas",
    nc_compra:             "notas_credito",
    nd_compra:             "notas_debito",
    legajos_importacion:   "legajos_importacion",
    despachos_simples:     "despachos_simples",
    ordenes_pago:          "ordenes_pago",
    cat_proveedores:       "cat_proveedores",
  }
  const itemPermitido = (id: string): boolean => {
    const sub = SIDEBAR_COMPRAS_TO_VISTA[id]
    if (sub === null || sub === undefined) return true
    return canSee("compras", sub)
  }

  // Carga inicial desde Supabase
  useEffect(() => {
    let cancelled = false
    fetchProveedores().then(data => {
      if (cancelled) return
      setProveedores(
        (data ?? []).map((p: any) => ({ ...p, nombre: p.nombre ?? p.razon_social ?? "" }))
      )
    }).catch(console.error)
    fetchOrdenesCompra().then(data => {
      if (cancelled) return
      setOrdenesCompra((data ?? []).map((oc: any) => ({
        ...oc,
        lineas: Array.isArray(oc.lineas) ? oc.lineas
              : Array.isArray(oc.items)  ? oc.items
              : [],
      })))
    }).catch(console.error)
    fetchRecepciones().then(data => {
      if (cancelled) return
      setRecepciones((data ?? []).map((r: any) => {
        const rawLineas = Array.isArray(r.lineas) ? r.lineas
                        : Array.isArray(r.items)  ? r.items
                        : []
        return {
          ...r,
          lineas: rawLineas.map((l: any) => ({
            ...l,
            cantidad_pedida:        l.cantidad_pedida        ?? l.cantidad ?? 0,
            cantidad_recibida:      l.cantidad_recibida      ?? 0,
            producto_sku:           l.producto_sku           ?? "",
            udm:                    l.udm                    ?? "un",
            estado_linea:           l.estado_linea           ?? "pendiente",
            tiene_serie:            l.tiene_serie            ?? false,
            requiere_color:         l.requiere_color         ?? false,
            requiere_bateria:       l.requiere_bateria       ?? false,
            requiere_outlet:        l.requiere_outlet        ?? false,
            requiere_observaciones: l.requiere_observaciones ?? false,
          })),
        }
      }))
    }).catch(console.error)
    fetchFacturasCompra().then(data => { if (!cancelled) setFacturasCompra(data) }).catch(console.error)
    fetchOrdenesPago().then(data => { if (!cancelled) setOrdenesPago(data) }).catch(console.error)
    fetchNotasCreditoCompra().then(data => { if (!cancelled) setNotasCreditoCompra(data) }).catch(console.error)
    fetchNotasDebitoCompra().then(data => { if (!cancelled) setNotasDebitoCompra(data) }).catch(console.error)
    return () => { cancelled = true }
  }, [])

  // Active view state
  // Si embedded=true, forcedView define la vista. Si no, sincroniza con ?view= en la URL.
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialView = forcedView ?? searchParams?.get("view") ?? "ordenes_compra"
  const [activeView, setActiveView] = useState(initialView)
  useEffect(() => {
    if (forcedView) {
      setActiveView(forcedView)
      return
    }
    const v = searchParams?.get("view")
    if (v) setActiveView(v)
  }, [searchParams, forcedView])

  // Guard: si el usuario está en una vista que ya no puede ver, lo mandamos al primer item permitido.
  useEffect(() => {
    if (itemPermitido(activeView)) return
    const fallbacks = ["proveedores", "ordenes_compra", "facturas_compra", "ordenes_pago", "cta_cte_proveedores", "historial_proveedores"]
    const ok = fallbacks.find(itemPermitido)
    if (ok) setActiveView(ok)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, canSee])
  const [expandedSections, setExpandedSections] = useState<string[]>(["proveedores", "compras", "comprobantes", "pagos", "configuracion", "cfg_categorias"])

  // Navegación externa: ir a una recepción por número
  useEffect(() => {
    if (!initialRecepcionNumero || recepciones.length === 0) return
    const rec = recepciones.find(r => r.numero === initialRecepcionNumero)
    if (rec) {
      setActiveView("recepciones")
      setSelectedRecepcion(rec)
      onNavigationHandled?.()
    }
  }, [initialRecepcionNumero, recepciones])

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
  const [monedas, setMonedas] = useState<{ codigo: string; nombre: string }[]>([])
  const [selectedCatProv, setSelectedCatProv] = useState<CategoriaProveedor | null>(null)
  const [creandoCatProv, setCreandoCatProv] = useState(false)
  const [catProvTabActivo, setCatProvTabActivo] = useState<"listas_precios" | "grupos_descuentos" | "cuentas_perm" | "leyenda" | "grupos">("listas_precios")
  const [loadingCatProv, setLoadingCatProv] = useState(false)
  const [catGuardando, setCatGuardando] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [provGuardando, setProvGuardando] = useState(false)
  const [provErrorGuardando, setProvErrorGuardando] = useState<string | null>(null)
  const [provGuardadoOk, setProvGuardadoOk] = useState(false)
  const [cuentaPtTransito, setCuentaPtTransito] = useState<{ id: string; codigo: string; nombre: string } | null>(null)

  useEffect(() => {
    fetch("/api/monedas", { cache: 'no-store' }).then(r => r.json()).then(d => setMonedas(Array.isArray(d) ? d : [])).catch(console.error)
    setLoadingCatProv(true)
    getCategoriaProveedores()
      .then(async rows => {
        const supabase = createSupabaseClient()
        // Cargar nombres de cuenta_pagar_id para cada categoría
        const ids = [...new Set(rows.map(r => r.cuenta_pagar_id).filter(Boolean))]
        const cuentasMap: Record<string, { codigo: string; nombre: string }> = {}
        if (ids.length > 0) {
          const { data: cuentas } = await supabase
            .from("contabilidad_plan_cuentas")
            .select("id, codigo, nombre")
            .in("id", ids as string[])
          for (const c of cuentas ?? []) {
            cuentasMap[c.id] = { codigo: c.codigo, nombre: c.nombre }
          }
        }
        // Cargar cuentas permitidas (pivot categorias_proveedor_cuentas)
        const catIds = rows.map(r => r.id)
        const cuentasPermitidasMap: Record<number, { id: string; codigo: string; nombre: string }[]> = {}
        if (catIds.length > 0) {
          const { data: pivot } = await supabase
            .from("categorias_proveedor_cuentas")
            .select("categoria_id, cuenta_id, contabilidad_plan_cuentas(id, codigo, nombre)")
            .in("categoria_id", catIds)
          for (const row of pivot ?? []) {
            const c = (row as any).contabilidad_plan_cuentas
            if (!c) continue
            if (!cuentasPermitidasMap[row.categoria_id]) cuentasPermitidasMap[row.categoria_id] = []
            cuentasPermitidasMap[row.categoria_id].push({ id: c.id, codigo: c.codigo, nombre: c.nombre })
          }
        }
        // Cargar cuenta PT en Tránsito para el circuito de compras
        const { data: ptRow } = await supabase.from("contabilidad_plan_cuentas").select("id, codigo, nombre").eq("codigo", "11050301").maybeSingle()
        if (ptRow) setCuentaPtTransito({ id: ptRow.id, codigo: ptRow.codigo, nombre: ptRow.nombre })
        setCategoriasProveedor(rows.map(r => ({
          id: r.id,
          nombre: r.nombre,
          disponible_clientes: r.disponible_clientes,
          disponible_proveedores: r.disponible_proveedores,
          tipo_control: r.tipo_control as CategoriaProveedor["tipo_control"],
          cuenta_cobrar_defecto: r.cuenta_cobrar_defecto,
          cuenta_pagar_defecto: r.cuenta_pagar_defecto,
          cuenta_pagar_id: r.cuenta_pagar_id ?? null,
          cuenta_pagar_codigo: r.cuenta_pagar_id ? cuentasMap[r.cuenta_pagar_id]?.codigo : undefined,
          cuenta_pagar_nombre: r.cuenta_pagar_id ? cuentasMap[r.cuenta_pagar_id]?.nombre : undefined,
          requiere_oc_para_facturar: r.requiere_oc_para_facturar,
          comprobantes_confidenciales: r.comprobantes_confidenciales,
          aplica_circuito_compras: r.aplica_circuito_compras ?? false,
          listas_precios: [],
          cuentas_permitidas: cuentasPermitidasMap[r.id] ?? [],
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
    cuenta_pagar_id: null,
    cuenta_pagar_codigo: undefined,
    cuenta_pagar_nombre: undefined,
    requiere_oc_para_facturar: false,
    comprobantes_confidenciales: false,
    listas_precios: [],
    cuentas_permitidas: [],
  }
  const [nuevaCatProv, setNuevaCatProv] = useState<Omit<CategoriaProveedor, "id">>(catProvFormVacio)

  // CATEGORIAS_PROVEEDOR es ahora dinámico
  const CATEGORIAS_PROVEEDOR = categoriasProveedor.map(c => c.nombre)

  const SUCURSALES_LISTA = sucursales.map(s => s.nombre)

  const proveedorFormVacio: Omit<Proveedor, "id" | "codigo" | "saldo"> = {
    nombre: "",
    nombre_fantasia: "",
    razon_social: "",
    tipo_documento: "CUIT",
    numero_documento: "",
    posicion_fiscal: "Responsable Inscripto",
    categoria_proveedor: "",
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
    aplica_circuito_compras: false,
    cuenta_gastos_defecto: "",
    cuenta_gastos_defecto_codigo: "",
    cuenta_gastos_defecto_nombre: "",
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
  const [confirmandoOC, setConfirmandoOC] = useState(false)
  const [confirmandoRec, setConfirmandoRec] = useState(false)
  // UI state OC — depósitos y ubicaciones desde Supabase
  const [depositosOC, setDepositosOC] = useState<{ id: number; nombre: string; codigo: string }[]>([])
  const [ubicacionesOC, setUbicacionesOC] = useState<{ id: number; nombre: string; codigo: string }[]>([])
  const [loadingUbicacionesOC, setLoadingUbicacionesOC] = useState(false)

  // Cargar depósitos al montar
  useEffect(() => {
    fetchDepositos().then(data => setDepositosOC(data ?? [])).catch(console.error)
  }, [])

  // Cuando carguen los depósitos, setear el de la sucursal activa como default en nuevaOC
  useEffect(() => {
    if (!depositosOC.length) return
    const match = depositosOC.find(d => d.nombre === sucursalActiva?.nombre) ?? depositosOC[0]
    if (!match) return
    setNuevaOC(prev => {
      if (prev.deposito_destino) return prev // ya tiene uno seleccionado, no pisar
      return { ...prev, deposito_destino: match.nombre, deposito_destino_id: match.id }
    })
    // Cargar ubicaciones del depósito default (sin llamar handleDepositoOCChange para evitar problema de hoisting)
    fetchUbicaciones(match.id).then(data => setUbicacionesOC(data ?? [])).catch(console.error)
  }, [depositosOC, sucursalActiva])

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
    tipo_cotizacion: "oficial",
    cotizacion_dia: null,
    tipo_cambio: 1,
    observaciones: "",
    lineas: []
  })

  // Auto-fetch cotización vigente al cambiar moneda o tipo en el form de OC
  useEffect(() => {
    const moneda = nuevaOC.moneda ?? "ARS"
    const tipo = nuevaOC.tipo_cotizacion ?? "oficial"
    if (moneda === "ARS") {
      setNuevaOC(prev => ({ ...prev, cotizacion_dia: null }))
      return
    }
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${moneda}&tipo=${tipo}&latest=true`)
      .then(r => r.json())
      .then(data => {
        const tasa = data?.tasa ?? null
        setNuevaOC(prev => ({ ...prev, cotizacion_dia: tasa }))
      })
      .catch(err => console.error("[OC] Error fetching cotización:", err))
  }, [nuevaOC.moneda, nuevaOC.tipo_cotizacion])

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
  const [recepcionFiltroEstado, setRecepcionFiltroEstado] = useState<"todos" | "esperando_recepcion" | "recibida" | "recibida_parcial" | "cancelada">("todos")
  const [recepcionBusqueda, setRecepcionBusqueda] = useState("")
  // Cantidades editadas en la ficha (producto_id → cantidad recibida)
  const [recepcionCantidades, setRecepcionCantidades] = useState<Record<number, number>>({})
  // Modo edición de la ficha de recepción (false = solo lectura)
  const [recepcionModoEdicion, setRecepcionModoEdicion] = useState(false)

  // Resetear modo edición cuando se cambia de recepción
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRecepcionModoEdicion(false)
    setRecDetalleTab("info")
    setRecAsientos([])
  }, [selectedRecepcion?.id])

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

  // Cargar recepciones generadas desde Toma de Equipo (ventas) — desde Supabase
  useEffect(() => {
    fetch("/api/recepciones-toma")
      .then(r => r.json())
      .then((tomasRecs: Recepcion[]) => {
        if (!Array.isArray(tomasRecs)) return
        setRecepciones(prev => {
          // Evitar duplicados: las recepciones de toma tienen id único de la tabla recepciones_toma
          // pero pueden colisionar con ids de recepciones de OC (que vienen de otra tabla).
          // Las identificamos con un prefijo negativo para que no choquen.
          const idsExistentes = new Set(prev.map(r => `${r.documento_origen_tipo}-${r.id}`))
          const nuevas = tomasRecs.filter(r => !idsExistentes.has(`toma_equipo-${r.id}`))
          return nuevas.length > 0 ? [...prev, ...nuevas] : prev
        })
      })
      .catch(console.error)
  }, [])

  // Facturas de Compra
  const [selectedFacturaCompra, setSelectedFacturaCompra] = useState<FacturaCompra | null>(null)
  const [creandoFacturaCompra, setCreandoFacturaCompra] = useState(false)
  const [fcBusqueda, setFcBusqueda] = useState("")
  const [fcErrorPublicar, setFcErrorPublicar] = useState<string | null>(null)
  const [fcPublicando, setFcPublicando] = useState(false)
  const [fcDetalleTab, setFcDetalleTab] = useState<"info" | "detalles">("info")
  type FcAsientoItem = { id: string; numero: string | null; fecha: string; concepto: string | null; estado: string; referencia: string | null; lineas: { id: string; cuenta_codigo: string; cuenta_nombre: string; debe: number; haber: number; descripcion: string | null }[] }
  const [fcAsientos, setFcAsientos] = useState<FcAsientoItem[]>([])
  const [fcAsientoCargando, setFcAsientoCargando] = useState(false)
  const [fcAsientoModalOpen, setFcAsientoModalOpen] = useState(false)
  const [fcAsientoModalItem, setFcAsientoModalItem] = useState<FcAsientoItem | null>(null)
  // Recepciones — tab detalles asiento
  const [recDetalleTab, setRecDetalleTab] = useState<"info" | "detalles">("info")
  const [recAsientos, setRecAsientos] = useState<FcAsientoItem[]>([])
  const [recAsientoCargando, setRecAsientoCargando] = useState(false)
  const [recAsientoModalOpen, setRecAsientoModalOpen] = useState(false)
  const [recAsientoModalItem, setRecAsientoModalItem] = useState<FcAsientoItem | null>(null)
  const [fcLineas, setFcLineas] = useState<FacturaCompraLinea[]>([])
  const [fcImpuestos, setFcImpuestos] = useState<{ nombre: string; redondeo: number; importe: number }[]>([])
  const fcLineaVacia = (): FacturaCompraLinea => ({
    cuenta_contable_id: null,
    cuenta_codigo: "",
    cuenta_nombre: "",
    descripcion: "",
    cantidad: 1,
    precio_unitario: 0,
    descuento_pct: 0,
    alicuota_iva: 0,
    subtotal: 0,
    iva: 0,
    total_linea: 0,
    orden: 0,
  })
  const facturaFormVacio: Omit<FacturaCompra, "id" | "lineas" | "seguimiento"> = {
    numero: "",
    tipo: "A",
    fecha: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "",
    proveedor_id: 0,
    proveedor_nombre: "",
    estado: "borrador",
    moneda: "ARS",
    tipo_cambio: 1,
    cotizacion: undefined,
    tipo_cotizacion: "blue",
    sucursal: "",
    subtotal: 0,
    impuestos: 0,
    total: 0,
    saldo: 0,
  }
  const [fcForm, setFcForm] = useState<Omit<FacturaCompra, "id" | "lineas" | "seguimiento">>(facturaFormVacio)
  const setFc = (patch: Partial<typeof fcForm>) => setFcForm(prev => ({ ...prev, ...patch }))

  // Auto-fetch cotización vigente al cambiar moneda o tipo_cotizacion en el form de factura compra
  useEffect(() => {
    const moneda = fcForm.moneda ?? "ARS"
    const tipo = (fcForm.tipo_cotizacion ?? "oficial").toLowerCase()
    if (moneda === "ARS") {
      setFcForm(prev => ({ ...prev, cotizacion: undefined }))
      return
    }
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${moneda}&tipo=${tipo}&latest=true`)
      .then(r => r.json())
      .then(data => {
        const tasa = data?.tasa ?? null
        if (tasa) setFcForm(prev => ({ ...prev, cotizacion: tasa }))
      })
      .catch(err => console.error("[FC] Error fetching cotización:", err))
  }, [fcForm.moneda, fcForm.tipo_cotizacion])

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
  const [opTabActivo, setOpTabActivo] = useState<"info_pago" | "comprobantes" | "otra_info" | "observaciones" | "detalles">("info_pago")
  const [opAsientos, setOpAsientos] = useState<FcAsientoItem[]>([])
  const [opAsientoCargando, setOpAsientoCargando] = useState(false)
  const [opAsientoModalOpen, setOpAsientoModalOpen] = useState(false)
  const [opAsientoModalItem, setOpAsientoModalItem] = useState<FcAsientoItem | null>(null)
  const [opForm, setOpForm] = useState<Partial<OrdenPago>>({
    proveedor_id: undefined,
  })
  const [opMediosPago, setOpMediosPago] = useState<OPMedioPago[]>([])
  const [opComprobantesDebito, setOpComprobantesDebito] = useState<OPComprobante[]>([])
  const [opComprobantesCredito, setOpComprobantesCredito] = useState<OPComprobante[]>([])
  const [opModalMedioPago, setOpModalMedioPago] = useState(false)
  const [opModalCancelacion, setOpModalCancelacion] = useState(false)
  const [opSaving, setOpSaving] = useState(false)
  const [cajasDisponibles, setCajasDisponibles] = useState<CajaDisponible[]>([])
  const [opOCsProveedor, setOpOCsProveedor] = useState<{id: number; numero: string}[]>([])

  // Cargar cajas disponibles
  useEffect(() => {
    const supabase = createSupabaseClient()
    supabase.from("cajas").select("id, nombre, sucursal").eq("activo", true).order("nombre")
      .then(({ data }) => { if (data) setCajasDisponibles(data) })
  }, [])

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

  // ─── Conciliación de Deuda Compras ────────────────────────────────────────
  const [cdcProveedorId, setCdcProveedorId] = useState<number | null>(null)
  const [cdcSelDebitos, setCdcSelDebitos] = useState<{id: number; tipo: 'factura'; moneda: 'ARS' | 'USD'; montoAplicar: number}[]>([])
  const [cdcSelCreditos, setCdcSelCreditos] = useState<{id: number | string; tipo: 'op' | 'nc'; moneda: 'ARS' | 'USD'; montoAplicar: number}[]>([])
  // medios_pago por OP cargados lazy cuando se selecciona proveedor en conciliación
  const [cdcMediosPorOP, setCdcMediosPorOP] = useState<Record<string, {moneda: string; importe: number; importe_comp: number}[]>>({})
  const [cdcHistorial, setCdcHistorial] = useState<{
    id: number; fecha: string; proveedor_id: number; proveedor_nombre: string
    total_conciliado: number; usuario: string; estado: 'activa' | 'cancelada'
    fecha_cancelacion: string | null
    aplicaciones: {debito_tipo: string; debito_numero: string; credito_tipo: string; credito_numero: string; monto: number; debito_moneda?: string; credito_moneda?: string; cotizacion?: number}[]
    // Flags para distinguir conciliaciones manuales vs auto-generadas por OP confirmar.
    // Las de OP no se revierten desde acá — hay que cancelar la OP directamente.
    esOP?: boolean
    opNumero?: string
    opId?: string
  }[]>([])
  const [cdcTab, setCdcTab] = useState<'conciliar' | 'historial'>('conciliar')
  const [cdcFiltroTextoDb, setCdcFiltroTextoDb] = useState('')
  const [cdcFiltroTextoCr, setCdcFiltroTextoCr] = useState('')
  const [cdcFiltroConciliado, setCdcFiltroConciliado] = useState<'no' | 'si' | 'todos'>('no')
  const [cdcMostrarTodosDb, setCdcMostrarTodosDb] = useState(false)
  const [cdcMostrarTodosCr, setCdcMostrarTodosCr] = useState(false)
  const [cdcCotizacion, setCdcCotizacion] = useState<number>(0)
  const [cdcEjecutando, setCdcEjecutando] = useState(false)
  const [cdcRevertiendoId, setCdcRevertiendoId] = useState<number | null>(null)

  // Popup compacto para previsualizar un comprobante desde la conciliación
  // (lupita en cada línea de Conciliar/Historial). Es presentacional —
  // recibe los props ya armados desde los helpers de abajo.
  const [comprobantePopup, setComprobantePopup] = useState<ComprobantePopupProps | null>(null)
  const cerrarComprobantePopup = () => setComprobantePopup(null)
  const abrirPopupFacturaCompra = (f: any) => {
    if (!f) return
    setComprobantePopup({
      open: true,
      onClose: cerrarComprobantePopup,
      tipoLabel: `FC ${f.tipo ?? ""}`.trim() || "Factura Compra",
      tipoColor: "indigo",
      numero: f.numero,
      fecha: f.fecha,
      estado: f.estado,
      moneda: f.moneda ?? "ARS",
      contraparteLabel: "Proveedor",
      contraparteNombre: f.proveedor_nombre,
      lineas: Array.isArray(f.lineas) ? f.lineas.map((l: any) => ({
        descripcion: l.descripcion ?? l.producto_nombre ?? l.cuenta_codigo ?? "—",
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
      })) : undefined,
      totales: [
        ...(f.subtotal != null ? [{ label: "Subtotal", value: Number(f.subtotal) }] : []),
        ...(f.impuestos != null && Number(f.impuestos) > 0 ? [{ label: "Impuestos", value: Number(f.impuestos) }] : []),
        { label: "Total", value: Number(f.total ?? 0), bold: true },
        ...(f.saldo != null ? [{ label: "Saldo", value: Number(f.saldo), color: Number(f.saldo) > 0 ? "red" as const : "emerald" as const }] : []),
      ],
    })
  }
  const abrirPopupOP = (o: any) => {
    if (!o) return
    setComprobantePopup({
      open: true,
      onClose: cerrarComprobantePopup,
      tipoLabel: "Orden de Pago",
      tipoColor: "blue",
      numero: o.numero,
      fecha: o.fecha,
      estado: o.estado,
      moneda: o.moneda ?? "ARS",
      contraparteLabel: "Proveedor",
      contraparteNombre: o.proveedor_nombre,
      totales: [
        { label: "Importe", value: Number(o.importe ?? 0), bold: true },
        ...(o.importe_no_conciliado != null
          ? [{ label: "No conciliado", value: Number(o.importe_no_conciliado), color: Number(o.importe_no_conciliado) > 0 ? "emerald" as const : "default" as const }]
          : []),
      ],
      observaciones: o.observaciones,
    })
  }
  const abrirPopupNCCompra = (n: any) => {
    if (!n) return
    setComprobantePopup({
      open: true,
      onClose: cerrarComprobantePopup,
      tipoLabel: "Nota de Crédito",
      tipoColor: "emerald",
      numero: n.numero,
      fecha: n.fecha,
      estado: n.estado,
      moneda: n.moneda ?? "ARS",
      contraparteLabel: "Proveedor",
      contraparteNombre: n.proveedor_nombre,
      concepto: n.concepto || n.motivo,
      totales: [
        { label: "Total", value: Number(n.total ?? 0), bold: true },
        ...(n.saldo_disponible != null
          ? [{ label: "Saldo disponible", value: Number(n.saldo_disponible), color: "emerald" as const }]
          : []),
      ],
    })
  }
  const abrirPopupNDCompra = (n: any) => {
    if (!n) return
    setComprobantePopup({
      open: true,
      onClose: cerrarComprobantePopup,
      tipoLabel: "Nota de Débito",
      tipoColor: "red",
      numero: n.numero,
      fecha: n.fecha,
      estado: n.estado,
      moneda: n.moneda ?? "ARS",
      contraparteLabel: "Proveedor",
      contraparteNombre: n.proveedor_nombre,
      concepto: n.concepto || n.motivo,
      totales: [
        { label: "Total", value: Number(n.total ?? 0), bold: true },
      ],
    })
  }

  // Helpers
  const formatCurrency = (amount: number, currency: string = "ARS") => {
    const num = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    const code = currency || "ARS"
    return `${code}\u00a0$\u00a0${num}`
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
      {menuSections.map(section => {
        const itemsVisibles = section.items.filter(it => itemPermitido(it.id))
        if (itemsVisibles.length === 0) return null
        return (
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
              {itemsVisibles.map(item => {
                // Items que ya viven en rutas top-level: usar Link para Ctrl+Click nativo
                if (item.id === "proveedores") {
                  return (
                    <Link
                      key={item.id}
                      href="/proveedores"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  )
                }
                return (
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
                )
              })}
            </div>
          )}
        </div>
        )
      })}

      {/* ── CONFIGURACIÓN ─────────────────────── */}
      {configSubGroups.some(g => g.items.some(it => itemPermitido(it.id))) && (
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
            {configSubGroups.map(group => {
              const itemsVisibles = group.items.filter(it => itemPermitido(it.id))
              if (itemsVisibles.length === 0) return null
              return (
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
                        {itemsVisibles.map(item => (
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
                    {itemsVisibles.map(item => (
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
              )
            })}
          </div>
        )}
      </div>
      )}
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
            <h1 className="text-2xl font-bold text-amber-900">Proveedores</h1>
            <p className="text-gray-500 mt-1">Gestione sus proveedores nacionales e internacionales</p>
          </div>
          <button 
            onClick={() => setCreandoProveedor(true)}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 transition-colors"
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedProveedor.nombre}</h1>
              <p className="text-sm text-gray-500">{selectedProveedor.codigo} | {selectedProveedor.cuit}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!selectedProveedor) return
                setNuevoProveedor({
                  nombre: selectedProveedor.nombre ?? selectedProveedor.razon_social ?? "",
                  nombre_fantasia: selectedProveedor.nombre_fantasia ?? "",
                  razon_social: selectedProveedor.razon_social ?? selectedProveedor.nombre ?? "",
                  tipo_documento: selectedProveedor.tipo_documento ?? "CUIT",
                  numero_documento: selectedProveedor.numero_documento ?? selectedProveedor.cuit ?? "",
                  posicion_fiscal: selectedProveedor.posicion_fiscal ?? "Responsable Inscripto",
                  categoria_proveedor: selectedProveedor.categoria_proveedor ?? "",
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
                  aplica_circuito_compras: (selectedProveedor as any).aplica_circuito_compras ?? false,
                  cuenta_gastos_defecto: selectedProveedor.cuenta_gastos_defecto ?? "",
                  cuenta_gastos_defecto_codigo: selectedProveedor.cuenta_gastos_defecto_codigo ?? "",
                  cuenta_gastos_defecto_nombre: selectedProveedor.cuenta_gastos_defecto_nombre ?? "",
                  cuenta_analitica: selectedProveedor.cuenta_analitica ?? "",
                  tipo_cotizacion_defecto: selectedProveedor.tipo_cotizacion_defecto ?? "",
                  observaciones: selectedProveedor.observaciones ?? "",
                })
                setEditandoProveedor(true)
              }}
              className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1"
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

        {/* Tabs + Content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="flex border-b">
                {(["contactos", "ventas_compras", "contabilidad", "observaciones"] as const).map(tab => {
                  const labels: Record<string, string> = { contactos: "Contactos", ventas_compras: "Ventas & Compras", contabilidad: "Contabilidad", observaciones: "Observaciones" }
                  return (
                    <button
                      key={tab}
                      onClick={() => setProveedorTabActivo(tab)}
                      className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                        proveedorTabActivo === tab
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {labels[tab]}
                    </button>
                  )
                })}
              </div>
              <div className="p-6">

            {/* Tab: Contactos */}
            {proveedorTabActivo === "contactos" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Razón Social:</span><span className="ml-2 font-medium">{selectedProveedor.razon_social || selectedProveedor.nombre}</span></div>
                  <div><span className="text-gray-500">Nombre Fantasía:</span><span className="ml-2 font-medium">{selectedProveedor.nombre_fantasia || "—"}</span></div>
                  <div><span className="text-gray-500">Tipo Documento:</span><span className="ml-2 font-medium">{selectedProveedor.tipo_documento || "—"}</span></div>
                  <div><span className="text-gray-500">N° Documento:</span><span className="ml-2 font-medium">{selectedProveedor.numero_documento || selectedProveedor.cuit || "—"}</span></div>
                  <div><span className="text-gray-500">Dirección:</span><span className="ml-2 font-medium">{selectedProveedor.calle_numero || selectedProveedor.direccion || "—"}</span></div>
                  <div><span className="text-gray-500">Ciudad:</span><span className="ml-2 font-medium">{[selectedProveedor.ciudad, selectedProveedor.provincia].filter(Boolean).join(", ") || "—"}</span></div>
                  <div><span className="text-gray-500">País:</span><span className="ml-2 font-medium">{selectedProveedor.pais || "Argentina"}</span></div>
                  <div><span className="text-gray-500">Código Postal:</span><span className="ml-2 font-medium">{selectedProveedor.codigo_postal || "—"}</span></div>
                  <div><span className="text-gray-500">Teléfono:</span><span className="ml-2 font-medium">{selectedProveedor.telefono || selectedProveedor.celular || "—"}</span></div>
                  <div><span className="text-gray-500">Email:</span><span className="ml-2 font-medium text-blue-600">{selectedProveedor.email || "—"}</span></div>
                  <div><span className="text-gray-500">Web:</span><span className="ml-2 font-medium text-blue-600">{selectedProveedor.web || "—"}</span></div>
                  <div><span className="text-gray-500">Posición Fiscal:</span><span className="ml-2 font-medium">{selectedProveedor.posicion_fiscal || "—"}</span></div>
                </div>
                {(selectedProveedor.contactos ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Contactos adicionales</p>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left py-2 px-2">Nombre</th>
                        <th className="text-left py-2 px-2">Sector</th>
                        <th className="text-left py-2 px-2">Teléfono</th>
                        <th className="text-left py-2 px-2">Email</th>
                      </tr></thead>
                      <tbody>
                        {(selectedProveedor.contactos ?? []).map((c: any) => (
                          <tr key={c.id} className="border-b">
                            <td className="py-2 px-2 font-medium">{c.nombre}</td>
                            <td className="py-2 px-2 text-gray-500">{c.sector || "—"}</td>
                            <td className="py-2 px-2">{c.telefono || "—"}</td>
                            <td className="py-2 px-2 text-blue-600">{c.email || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Ventas & Compras */}
            {proveedorTabActivo === "ventas_compras" && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Condición de Pago:</span><span className="ml-2 font-medium">{selectedProveedor.condicion_pago || "—"}</span></div>
                <div><span className="text-gray-500">Moneda Habitual:</span><span className="ml-2 font-medium">{selectedProveedor.moneda_habitual || "ARS"}</span></div>
                <div><span className="text-gray-500">Moneda por Defecto:</span><span className="ml-2 font-medium">{selectedProveedor.moneda_defecto || "—"}</span></div>
                <div><span className="text-gray-500">Tipo Cotización:</span><span className="ml-2 font-medium">{selectedProveedor.tipo_cotizacion_defecto || "—"}</span></div>
                <div><span className="text-gray-500">Categoría:</span><span className="ml-2 font-medium">{selectedProveedor.categoria_proveedor || "—"}</span></div>
                <div><span className="text-gray-500">Tipo:</span><span className="ml-2 font-medium capitalize">{selectedProveedor.tipo}</span></div>
                <div><span className="text-gray-500">Sucursal Origen:</span><span className="ml-2 font-medium">{selectedProveedor.sucursal_origen || "—"}</span></div>
                <div><span className="text-gray-500">Confidencial:</span><span className={`ml-2 font-medium ${selectedProveedor.confidencial ? "text-red-600" : "text-gray-900"}`}>{selectedProveedor.confidencial ? "Sí" : "No"}</span></div>
              </div>
            )}

            {/* Tab: Contabilidad */}
            {proveedorTabActivo === "contabilidad" && (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center ${(selectedProveedor as any).aplica_circuito_compras ? "bg-indigo-900 border-indigo-900" : "border-gray-300"}`}>
                    {(selectedProveedor as any).aplica_circuito_compras && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M2 6l3 3 5-5"/></svg>}
                  </span>
                  <span className="font-medium">Aplica Circuito de Compras</span>
                </div>
                {!(selectedProveedor as any).aplica_circuito_compras && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-gray-500">Cuenta Gastos por Defecto:</span><span className="ml-2 font-medium">{selectedProveedor.cuenta_gastos_defecto_codigo ? `${selectedProveedor.cuenta_gastos_defecto_codigo} — ${selectedProveedor.cuenta_gastos_defecto_nombre}` : "—"}</span></div>
                    <div><span className="text-gray-500">Cuenta Analítica:</span><span className="ml-2 font-medium">{selectedProveedor.cuenta_analitica || "—"}</span></div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Observaciones */}
            {proveedorTabActivo === "observaciones" && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedProveedor.observaciones || <span className="text-gray-400">Sin observaciones</span>}</p>
            )}
              </div>
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

            {/* Últimos Movimientos */}
            {movimientos.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Últimos Movimientos</h3>
                <div className="space-y-2">
                  {movimientos.slice(0, 5).map(mov => (
                    <div key={mov.id} className="flex justify-between text-xs border-b pb-1">
                      <span className="text-gray-500">{formatDate(mov.fecha)} · {mov.tipo.replace('_', ' ')}</span>
                      <span className="font-medium">{formatCurrency(mov.saldo)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderFormularioProveedor = (modoEdicion: boolean) => {
    const prov = nuevoProveedor
    const setP = (patch: Partial<typeof prov>) => setNuevoProveedor(prev => ({ ...prev, ...patch }))

    const handleGuardar = async () => {
      if (!(prov.nombre ?? "").trim()) return
      if (prov.tipo_documento !== "Sin documento" && !(prov.numero_documento ?? "").trim()) return

      setProvGuardando(true)
      setProvErrorGuardando(null)
      setProvGuardadoOk(false)

      const payload = {
        razon_social: prov.nombre,
        nombre_fantasia: prov.nombre_fantasia || null,
        cuit: prov.numero_documento || null,
        categoria: prov.categoria || "privado",
        tipo: prov.tipo || "nacional",
        posicion_fiscal: prov.posicion_fiscal || null,
        categoria_proveedor: prov.categoria_proveedor || null,
        email: prov.email || null,
        celular: prov.celular || null,
        telefono: prov.telefono || null,
        direccion: prov.calle_numero || prov.direccion || null,
        calle_numero: prov.calle_numero || null,
        ciudad: prov.ciudad || null,
        provincia: prov.provincia || null,
        pais: prov.pais || "Argentina",
        codigo_postal: prov.codigo_postal || null,
        condicion_pago: prov.condicion_pago || null,
        moneda_habitual: prov.moneda_habitual || "ARS",
        moneda_defecto: prov.moneda_defecto || prov.moneda_habitual || "ARS",
        estado: prov.activo ? "activo" : "inactivo",
        confidencial: prov.confidencial ?? false,
        sucursal_origen: prov.sucursal_origen || null,
        observaciones: prov.observaciones || null,
        aplica_circuito_compras: prov.aplica_circuito_compras ?? false,
        cuenta_gastos_defecto: prov.cuenta_gastos_defecto || null,
        cuenta_gastos_defecto_codigo: prov.cuenta_gastos_defecto_codigo || null,
        cuenta_gastos_defecto_nombre: prov.cuenta_gastos_defecto_nombre || null,
        cuenta_analitica: prov.cuenta_analitica || null,
        tipo_cotizacion_defecto: prov.tipo_cotizacion_defecto || null,
      }

      try {
        if (modoEdicion && selectedProveedor) {
          const updated = await guardarProveedor(payload, selectedProveedor.id)
          const updatedConNombre = { ...updated, nombre: updated.nombre ?? updated.razon_social ?? "" }
          setProveedores(prev => prev.map(p => p.id === selectedProveedor.id ? { ...p, ...updatedConNombre } : p))
          setSelectedProveedor(prev => prev ? { ...prev, ...updatedConNombre } : null)
          setEditandoProveedor(false)
        } else {
          // Código autogenerado en backend (con retries por colisión).
          const created = await guardarProveedor({ ...payload, codigo: "", saldo: 0 })
          setProveedores(prev => [{ ...created, nombre: created.nombre ?? created.razon_social ?? "" }, ...prev])
          setCreandoProveedor(false)
          setNuevoProveedor(proveedorFormVacio)
          setProveedorTabActivo("contactos")
        }
      } catch (err: any) {
        console.error("[v0] Error al guardar proveedor:", err.message)
        setProvErrorGuardando(err.message ?? "Error al guardar")
      } finally {
        setProvGuardando(false)
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
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={handleCancelar} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-amber-900">
                {modoEdicion ? `Editando: ${selectedProveedor?.nombre}` : "Nuevo Proveedor"}
              </h1>
              <p className="text-sm text-gray-500">
                {modoEdicion ? selectedProveedor?.codigo : "Complete los datos del nuevo proveedor"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {provGuardadoOk && (
              <span className="text-sm text-green-700 font-medium">✓ Guardado correctamente</span>
            )}
            {provErrorGuardando && (
              <span className="text-sm text-red-600 font-medium max-w-xs truncate" title={provErrorGuardando}>
                Error: {provErrorGuardando}
              </span>
            )}
            <button
              onClick={handleCancelar}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              {modoEdicion ? "Volver" : "Cancelar"}
            </button>
            <button
              onClick={handleGuardar}
              disabled={provGuardando || !(prov.nombre ?? "").trim() || (prov.tipo_documento !== "Sin documento" && !(prov.numero_documento ?? "").trim())}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {provGuardando ? "Guardando..." : modoEdicion ? "Guardar Cambios" : "Crear Proveedor"}
            </button>
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
                  <option value="">-- Sin categoría --</option>
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
                    onChange={e => setP({ moneda_defecto: e.target.value, moneda_habitual: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.nombre}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Cotización por Defecto</label>
                  <select
                    value={prov.tipo_cotizacion_defecto}
                    onChange={e => setP({ tipo_cotizacion_defecto: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
                  >
                    <option value="">— Sin asignar —</option>
                    <option value="oficial">Dólar Oficial</option>
                    <option value="blue">Dólar Blue</option>
                    <option value="mep">Dólar MEP</option>
                  </select>
                  {(!prov.moneda_defecto || prov.moneda_defecto === "ARS") && (
                    <p className="text-xs text-gray-400 mt-1">Relevante principalmente cuando la moneda por defecto es distinta de ARS.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: CONTABILIDAD */}
            {proveedorTabActivo === "contabilidad" && (
              <div className="space-y-4 max-w-lg">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prov.aplica_circuito_compras}
                    onChange={e => setP({ aplica_circuito_compras: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Aplica circuito de compras
                </label>
                {prov.aplica_circuito_compras && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    Las facturas de este proveedor solo podrán imputar a la cuenta <strong>PT en Tránsito (11050301)</strong>.
                  </div>
                )}
                {!prov.aplica_circuito_compras && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cuenta de Gastos por Defecto</label>
                    <CuentaContableSelector
                      value={prov.cuenta_gastos_defecto}
                      onChange={(id, codigo, nombre) => setP({ cuenta_gastos_defecto: id, cuenta_gastos_defecto_codigo: codigo ?? "", cuenta_gastos_defecto_nombre: nombre ?? "" })}
                    />
                  </div>
                )}
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
        (oc.lineas ?? []).some(l => l.producto_nombre?.toLowerCase().includes(q))
      return matchEstado && matchMetodo && matchBusqueda
    })

    const recsPendientes = ordenesCompra.filter(o => o.estado === 'confirmada' || o.estado === 'recibida_parcial').length

    return (
      <div>
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Órdenes de Compra</h1>
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
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 text-sm font-medium"
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
              { field: "moneda", label: "Moneda", values: monedas.map(m => ({ value: m.codigo, label: m.codigo })) },
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
    const recsVinculadas = recepciones.filter(r =>
      Number(r.documento_origen_id) === Number(oc.id) ||
      Number(r.orden_compra_id)     === Number(oc.id)
    )
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
    if (confirmandoOC) return
    setConfirmandoOC(true)
    try {
    const ahora = new Date().toISOString()
    const esInmediato = oc.metodo_compra === 'inmediato'

    // Verificar si el proveedor aplica circuito de compras
    const provOC = proveedores.find(p => p.id === oc.proveedor_id)
    const aplicaCircuito = (provOC as any)?.aplica_circuito_compras === true

    if (aplicaCircuito) {
      // ── Circuito de compras: endpoint atómico con OPTIMISTIC UI ──
      // Igual que en la confirmación de recepción, primero actualizamos el UI
      // local con datos provisorios para que el usuario vea la transición
      // inmediata. El server llega después y completa con FC + Recepción reales.
      // Si el server falla, revertimos el estado original.
      const ocOptimista: OrdenCompra = {
        ...oc,
        estado: "confirmada" as any,
        // FC y Recepción todavía no existen — se llenan cuando vuelve el server
        factura_circuito_id: -1 as any,      // placeholder negativo = "creando"
        recepcion_circuito_id: -1 as any,
      }
      setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? ocOptimista : o))
      setSelectedOC(ocOptimista)

      // Placeholder de Recepción en el listado para que aparezca al toque
      const recPlaceholder: Recepcion = {
        id: -oc.id,  // ID negativo = placeholder (se reemplaza al volver el server)
        numero: "REC-•••••",
        fecha: ahora,
        estado: "esperando_recepcion" as any,
        proveedor_id: oc.proveedor_id,
        proveedor_nombre: oc.proveedor_nombre,
        documento_origen_tipo: "oc",
        documento_origen_id: oc.id,
        documento_origen_ref: oc.numero,
        sucursal: oc.sucursal ?? "",
        deposito_destino: oc.deposito_destino ?? "",
        deposito_destino_id: (oc as any).deposito_destino_id ?? null,
        ubicacion: (oc as any).ubicacion ?? "",
        lineas: (oc.lineas ?? []).map(l => ({
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          producto_sku: l.producto_sku ?? "",
          cantidad_pedida: l.cantidad,
          cantidad_recibida: 0,
          precio_unitario: l.precio_unitario,
          estado_linea: "pendiente" as const,
          udm: l.udm ?? "un",
          tiene_serie: l.tiene_serie ?? false,
          requiere_color: l.requiere_color ?? false,
          requiere_bateria: l.requiere_bateria ?? false,
          requiere_outlet: l.requiere_outlet ?? false,
          requiere_observaciones: l.requiere_observaciones ?? false,
          nac: l.nac ?? false,
        })),
      } as any
      setRecepciones(prev => [recPlaceholder, ...prev])

      // Liberar el spinner del botón YA — el usuario percibe la confirmación
      // como instantánea. El trabajo real sigue en background.
      setConfirmandoOC(false)

      // Server-side: el endpoint atómico ya está corriendo en paralelo.
      try {
        const res = await fetch(`/api/compras/ordenes-compra/${oc.id}/confirmar`, { method: "POST" })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "Error al confirmar OC con circuito")

        const { oc: ocActualizada, factura, recepcion } = json

        // Reemplazar el placeholder con los datos reales
        const ocConfirmada: OrdenCompra = {
          ...oc,
          ...ocActualizada,
          lineas: oc.lineas,
          factura_circuito_id: factura?.id ?? null,
          recepcion_circuito_id: recepcion?.id ?? null,
        }
        setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? ocConfirmada : o))
        setSelectedOC(prev => prev && prev.id === oc.id ? ocConfirmada : prev)

        // Reemplazar el placeholder de recepción con la real
        if (recepcion) {
          const recReal: Recepcion = {
            ...recepcion,
            documento_origen_tipo: "oc",
            documento_origen_id: oc.id,
            documento_origen_ref: oc.numero,
            sucursal: oc.sucursal ?? "",
            deposito_destino: oc.deposito_destino ?? "",
            deposito_destino_id: (oc as any).deposito_destino_id ?? null,
            ubicacion: (oc as any).ubicacion ?? "",
            lineas: recPlaceholder.lineas,
          }
          setRecepciones(prev => prev.map(r => r.id === -oc.id ? recReal : r))
        } else {
          // Si por algún motivo no vino, sacar el placeholder
          setRecepciones(prev => prev.filter(r => r.id !== -oc.id))
        }

        // Agregar factura al listado local
        if (factura) {
          setFacturasCompra(prev => [{ ...factura, lineas: [] }, ...prev])
        }
      } catch (err: any) {
        // REVERTIR el optimistic update
        console.error("[circuito] Error al confirmar OC:", err.message)
        setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? oc : o))
        setSelectedOC(prev => prev && prev.id === oc.id ? oc : prev)
        setRecepciones(prev => prev.filter(r => r.id !== -oc.id))
        alert("Error al confirmar OC: " + err.message + "\n\nSe revirtió el cambio. Probá de nuevo.")
      }
      return
    }

    // ── Flujo estándar (sin circuito) ──

    const recPayload = {
      fecha:                   ahora,
      orden_compra_id:         oc.id,
      orden_compra_numero:     oc.numero,
      proveedor_id:            oc.proveedor_id,
      proveedor_nombre:        oc.proveedor_nombre,
      estado:                  esInmediato ? "confirmada" : "borrador",
      // nuevos campos para la ficha
      documento_origen_tipo:   "oc",
      documento_origen_id:     oc.id,
      documento_origen_ref:    oc.numero,
      sucursal:                oc.sucursal ?? "",
      deposito_destino:        oc.deposito_destino ?? "",
      deposito_destino_id:     (oc as any).deposito_destino_id ?? null,
      ubicacion:               (oc as any).ubicacion ?? "",
      fecha_esperada:          oc.fecha_entrega_esperada ?? null,
      items: (oc.lineas ?? []).map(l => ({
        producto_id:            l.producto_id,
        producto_nombre:        l.producto_nombre,
        producto_sku:           l.producto_sku            ?? "",
        cantidad_pedida:        l.cantidad,
        cantidad_recibida:      esInmediato ? l.cantidad : 0,
        precio_unitario:        l.precio_unitario,
        udm:                    l.udm                     ?? "un",
        estado_linea:           esInmediato ? "recibido" : "pendiente",
        tiene_serie:            l.tiene_serie             ?? false,
        requiere_color:         l.requiere_color          ?? false,
        requiere_bateria:       l.requiere_bateria        ?? false,
        requiere_outlet:        l.requiere_outlet         ?? false,
        requiere_observaciones: l.requiere_observaciones  ?? false,
        nac:                    l.nac                     ?? false,
      })),
      total: esInmediato ? oc.total : 0,
    }

    const ocEstadoNuevo = esInmediato ? "completa" : "confirmada"

    try {
      const [recCreada, ocActualizada] = await Promise.all([
        guardarRecepcion(recPayload),
        guardarOrdenCompra({ estado: ocEstadoNuevo }, oc.id),
      ])
      const nuevaRec: Recepcion = {
        ...recCreada,
        documento_origen_tipo: "oc",
        documento_origen_id:   oc.id,
        documento_origen_ref:  oc.numero,
        sucursal:              oc.sucursal ?? "",
        deposito_destino:      oc.deposito_destino ?? "",
        deposito_destino_id:   (oc as any).deposito_destino_id ?? null,
        ubicacion:             (oc as any).ubicacion ?? "",
        lineas: (oc.lineas ?? []).map(l => ({
          producto_id:       l.producto_id,
          producto_nombre:   l.producto_nombre,
          producto_sku:      l.producto_sku ?? "",
          cantidad_pedida:   l.cantidad,
          cantidad_recibida: esInmediato ? l.cantidad : 0,
          precio_unitario:   l.precio_unitario,
          estado_linea:      esInmediato ? "recibido" : "pendiente",
          udm:               l.udm ?? "un",
          tiene_serie:            l.tiene_serie            ?? false,
          requiere_color:         l.requiere_color         ?? false,
          requiere_bateria:       l.requiere_bateria       ?? false,
          requiere_outlet:        l.requiere_outlet        ?? false,
          requiere_observaciones: l.requiere_observaciones ?? false,
          nac:                    l.nac                    ?? false,
        })),
      }
      const ocConfirmada: OrdenCompra = { ...oc, ...ocActualizada, lineas: oc.lineas }
      setRecepciones(prev => [nuevaRec, ...prev])
      setOrdenesCompra(prev => prev.map(o => o.id === oc.id ? ocConfirmada : o))
      setSelectedOC(ocConfirmada)
    } catch (err: any) {
      console.error("[v0] Error al confirmar OC:", err.message)
      alert("Error al confirmar OC: " + err.message)
    }
    } finally {
      setConfirmandoOC(false)
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
    const totalRecibido = (oc.lineas ?? []).reduce((s, l) => s + (l.cantidad_recibida ?? 0), 0)
    const totalPedido = (oc.lineas ?? []).reduce((s, l) => s + (l.cantidad ?? 0), 0)

    // Circuito de compras
    const provOC = proveedores.find(p => p.id === oc.proveedor_id)
    const esCircuito = (provOC as any)?.aplica_circuito_compras === true
    const facturaCircuito = oc.factura_circuito_id
      ? facturasCompra.find(f => f.id === oc.factura_circuito_id)
      : facturasVinculadas.find(f => f.es_automatica)
    const recepcionCircuito = oc.recepcion_circuito_id
      ? recepciones.find(r => r.id === oc.recepcion_circuito_id)
      : recsVinculadas.find(r => r.estado === 'esperando_recepcion')

    const tabs = [
      { key: "productos",     label: "Productos",                           count: (oc.lineas ?? []).length },
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
              <h1 className="text-2xl font-bold text-amber-900">{oc.numero}</h1>
              <p className="text-sm text-gray-500">{formatDate(oc.fecha)} | {oc.proveedor_nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <>
                <button
                  onClick={() => confirmarOC(oc)}
                  disabled={confirmandoOC}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {confirmandoOC ? "Confirmando..." : "Confirmar"}
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
            {!editable && (oc.estado === 'confirmada' || oc.estado === 'recibida_parcial') && (() => {
              const recVinculada = recepciones.find(r => Number(r.documento_origen_id) === Number(oc.id) && r.estado !== 'cancelada')
              if (!recVinculada) return null
              return (
                <button
                  onClick={() => {
                    setSelectedRecepcion(recVinculada)
                    setRecepcionCantidades(Object.fromEntries((recVinculada.lineas ?? []).map(l => [l.producto_id, l.cantidad_recibida])))
                    setSelectedOC(null)
                    setActiveView("recepciones")
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-lg text-xs font-medium hover:bg-emerald-100"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Ir a Recepción · {recVinculada.numero}
                </button>
              )
            })()}
            {!editable && (
              <button
                onClick={() => setOcModalCancelacionOpen(true)}
                className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50"
              >
                Cancelar OC
              </button>
            )}
            {/* Circuito: factura vinculada */}
            {esCircuito && oc.estado !== 'borrador' && facturaCircuito && (
              <button
                onClick={() => { setSelectedFacturaCompra(facturaCircuito); setActiveView("facturas_compra") }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100"
              >
                <FileText className="w-3.5 h-3.5" />
                Factura {facturaCircuito.numero} · {facturaCircuito.estado}
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
                  {(oc.lineas ?? []).length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-gray-400">Sin líneas</td></tr>
                  )}
                  {(oc.lineas ?? []).map((l, idx) => (
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
                        setRecepcionCantidades(Object.fromEntries((r.lineas ?? []).map(l => [l.producto_id, l.cantidad_recibida])))
                        setSelectedOC(null)
                        setActiveView("recepciones")
                      }}
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 text-sm border border-gray-100"
                    >
                      <span className="font-medium text-emerald-700">{r.numero}</span>
                      <span className="text-gray-500">{new Date(r.fecha).toLocaleDateString('es-AR')}</span>
                      <span className="text-gray-500">{(r.lineas ?? []).length} producto{(r.lineas ?? []).length !== 1 ? 's' : ''}</span>
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
                    <button className="flex items-center gap-2 mx-auto px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800">
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
                        : esCircuito && (facturaCircuito || recepcionCircuito)
                        ? `Esta OC tiene un circuito de compras activo${facturaCircuito ? ` con Factura ${facturaCircuito.numero}` : ''}${recepcionCircuito ? ` y Recepción ${recepcionCircuito.numero}` : ''}. Al cancelar se cancelarán ambos comprobantes y se generará asiento de reversa para la factura.`
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
    const totalOC = (oc.lineas ?? []).reduce((s, l) => s + (l.subtotal ?? 0), 0)

    const guardarOC = async () => {
      if (!oc.proveedor_nombre) {
        alert("Debe seleccionar un proveedor.")
        return
      }
      if (!oc.deposito_destino) {
        alert("Debe seleccionar un Depósito Destino. Las recepciones generadas desde esta OC necesitan saber a qué depósito ingresar el stock.")
        return
      }
      if (!oc.ubicacion_destino) {
        alert("Debe seleccionar una Ubicación Destino. Las recepciones generadas desde esta OC necesitan saber en qué ubicación ingresar el stock.")
        return
      }
      if ((oc.lineas ?? []).length === 0) {
        alert("Debe agregar al menos una línea de producto.")
        return
      }
      const lineaSinProducto = (oc.lineas ?? []).findIndex(l => !l.producto_nombre || !l.producto_id)
      if (lineaSinProducto !== -1) {
        alert(`La línea ${lineaSinProducto + 1} no tiene un producto seleccionado. Buscá y seleccioná un producto del listado.`)
        return
      }
      const payload = {
        // numero lo genera el backend consultando la DB
        fecha: oc.fecha || new Date().toISOString(),
        proveedor_id: oc.proveedor_id || 0,
        proveedor_nombre: oc.proveedor_nombre || "",
        estado: "borrador",
        moneda: oc.moneda || "ARS",
        tipo_cotizacion: oc.tipo_cotizacion ?? "oficial",
        cotizacion_dia: oc.cotizacion_dia ?? null,
        sucursal: oc.sucursal ?? "",
        sucursal_id: (oc as any).sucursal_id ?? null,
        deposito_destino: oc.deposito_destino ?? "",
        deposito_destino_id: (oc as any).deposito_destino_id ?? null,
        ubicacion: (oc as any).ubicacion_destino ?? "",
        items: oc.lineas,
        subtotal: totalOC,
        total: totalOC,
      }
      try {
        const created = await guardarOrdenCompra(payload)
        const nuevaOrden: OrdenCompra = { ...created, lineas: oc.lineas }
        // Agregar al estado local inmediatamente (UX) y también recargar desde DB
        // para evitar que el fetch inicial en vuelo pise la lista
        setOrdenesCompra(prev => {
          const sinDuplicado = prev.filter(o => o.id !== created.id)
          return [nuevaOrden, ...sinDuplicado]
        })
        setCreandoOC(false)
        setSelectedOC(nuevaOrden)
        setOcTabActivo("productos")
        // Recargar lista desde DB en background para sincronizar
        fetchOrdenesCompra()
          .then(data => setOrdenesCompra((data ?? []).map((oc: any) => ({
            ...oc,
            lineas: Array.isArray(oc.lineas) ? oc.lineas : Array.isArray(oc.items) ? oc.items : [],
          }))))
          .catch(console.error)
        setOcTabActivo("productos")
        // Resetear el formulario para la próxima vez
        setNuevaOC({
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
          tipo_cotizacion: "oficial",
          cotizacion_dia: null,
          tipo_cambio: 1,
          observaciones: "",
          lineas: []
        })
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800"
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
          <h1 className="text-2xl font-bold text-amber-900">Nueva Orden de Compra</h1>
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
                  {sucursales.filter(s => s.activa).map(s => (
                    <option key={s.id} value={s.nombre}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Proveedor <span className="text-red-500">*</span></label>
                <ProveedorSelector
                  value={oc.proveedor_id ?? null}
                  onChange={(id, nombre, moneda, tipoCotizacion) => {
                    if (id) setNuevaOC(prev => ({
                      ...prev,
                      proveedor_id: id,
                      proveedor_nombre: nombre,
                      moneda: moneda ?? prev.moneda,
                      tipo_cotizacion: tipoCotizacion ?? prev.tipo_cotizacion ?? "oficial",
                    }))
                    else setNuevaOC(prev => ({ ...prev, proveedor_id: undefined, proveedor_nombre: "" }))
                  }}
                  proveedores={proveedores}
                />
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
                  Ubicacion Destino <span className="text-red-500">*</span>
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
                  onChange={e => setNuevaOC(prev => ({ ...prev, moneda: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {monedas.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.nombre}</option>
                  ))}
                </select>
              </div>
              {(oc.moneda && oc.moneda !== "ARS") && (
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo Cotización</label>
                  <select
                    value={oc.tipo_cotizacion ?? "oficial"}
                    onChange={e => setNuevaOC(prev => ({ ...prev, tipo_cotizacion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="oficial">Oficial</option>
                    <option value="blue">Blue</option>
                    <option value="mep">MEP</option>
                  </select>
                </div>
              )}
              {(oc.moneda && oc.moneda !== "ARS") && (
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Cotización del Día</label>
                  <input
                    type="number"
                    value={oc.cotizacion_dia ?? ""}
                    onChange={e => setNuevaOC(prev => ({ ...prev, cotizacion_dia: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Ingrese cotización..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
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
                <th className="text-center py-2.5 px-2 w-14" title="No Actualiza Costo contable">NAC</th>
                <th className="text-left py-2.5 px-4">Producto</th>
                <th className="text-left py-2.5 px-4">Descripcion</th>
                <th className="text-right py-2.5 px-4 w-24">Cantidad</th>
                <th className="text-right py-2.5 px-4 w-36">Precio Unit.</th>
                <th className="text-right py-2.5 px-4 w-32">Subtotal</th>
                <th className="w-10 py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(oc.lineas ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                    No hay productos. Agregue una linea para comenzar.
                  </td>
                </tr>
              )}
              {(oc.lineas ?? []).map((linea, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2 px-2 text-center">
                    <label title="No Actualiza Costo contable">
                      <input
                        type="checkbox"
                        checked={linea.nac ?? false}
                        onChange={e => {
                          const updated = [...oc.lineas]
                          updated[idx] = { ...updated[idx], nac: e.target.checked }
                          setNuevaOC(prev => ({ ...prev, lineas: updated }))
                        }}
                        className="w-4 h-4 rounded border-gray-300 accent-indigo-900"
                      />
                    </label>
                  </td>
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
                            // Excluir servicios — no se compran (no van en OC).
                            const res = await fetchProductos({ busqueda: val, activo: true })
                            const filtrado = (res ?? []).filter((p: any) => p.tipo !== "servicio")
                            setOcProductoOpciones(prev => ({ ...prev, [idx]: filtrado }))
                          } catch {
                            setOcProductoOpciones(prev => ({ ...prev, [idx]: [] }))
                          }
                        }}
                        onFocus={async () => {
                          const currentSearch = ocProductoSearch[idx] ?? linea.producto_nombre
                          if ((ocProductoOpciones[idx] ?? []).length > 0) {
                            setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: true }))
                            return
                          }
                          // Cargar primeros productos si no hay búsqueda
                          try {
                            const res = await fetchProductos({ busqueda: currentSearch || "", activo: true })
                            const filtrado = (res ?? []).filter((p: any) => p.tipo !== "servicio")
                            setOcProductoOpciones(prev => ({ ...prev, [idx]: filtrado }))
                            setOcProductoDropdownAbierto(prev => ({ ...prev, [idx]: true }))
                          } catch {}
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
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-xs text-gray-500 pointer-events-none select-none">$</span>
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
                        className="w-full text-right pl-5 pr-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-gray-700">
                    {formatCurrency(linea.subtotal, oc.moneda)}
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => {
                        setNuevaOC(prev => ({ ...prev, lineas: (prev.lineas ?? []).filter((_, i) => i !== idx) }))
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
                <td colSpan={4} className="py-3 px-4">
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
                        subtotal: 0,
                        nac: false
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
      <ComprasListSection
        title="Legajos de Importación"
        subtitle="Gestione importaciones complejas con múltiples gastos"
        moduleName="legajos_importacion"
        data={legajosImportacion}
        searchFields={["numero", "nombre", "despachante_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }]}
        actions={
          <button onClick={() => setCreandoLegajo(true)} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nuevo Legajo
          </button>
        }
      >
        {(filtered) => (
          <>
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
              {filtered.map(legajo => (
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
          </>
        )}
      </ComprasListSection>
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedLegajo.numero}</h1>
              <p className="text-sm text-gray-500">{selectedLegajo.nombre} | {formatDate(selectedLegajo.fecha_apertura)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedLegajo.estado === 'borrador' && (
              <button className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">
                Confirmar
              </button>
            )}
            {selectedLegajo.estado === 'abierto' && (
              <button className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800">
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
            <h1 className="text-2xl font-bold text-amber-900">Nuevo Legajo de Importación</h1>
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
      <ComprasListSection
        title="Despachos Simples"
        subtitle="Importaciones USA con estructura de costos simplificada"
        moduleName="despachos_simples"
        data={despachosSimples}
        searchFields={["numero", "nombre", "proveedor_nombre"]}
        filterFields={[{ field: "estado", label: "Estado" }]}
        actions={
          <button onClick={() => setCreandoDespachoSimple(true)} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nuevo Despacho
          </button>
        }
      >
        {(filtered) => (
          <>
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
              {filtered.map(despacho => (
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
          </>
        )}
      </ComprasListSection>
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedDespachoSimple.numero}</h1>
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
            <h1 className="text-2xl font-bold text-amber-900">Nuevo Despacho Simple</h1>
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
    if (confirmandoRec) return
    setConfirmandoRec(true)
    try {
    const rec = selectedRecepcion

    // Validar depósito destino obligatorio
    if (!rec.deposito_destino_id && !rec.deposito_destino) {
      alert("Debe seleccionar un Depósito Destino antes de confirmar la recepción. Sin depósito no se puede ingresar el stock.")
      return
    }

    // Helper: obtener cantidad efectiva (para productos con serie, es el nro de series cargadas)
    const getCantEfectiva = (l: RecepcionLinea) =>
      l.tiene_serie
        ? (seriesConfirmadas[l.producto_id] || []).filter(u => u.nro_serie?.trim() !== '').length
        : (recepcionCantidades[l.producto_id] ?? 0)

    // Validación: cantidades > 0
    const lineasConCantidad = (rec.lineas ?? []).filter(l => getCantEfectiva(l) > 0)
    if (lineasConCantidad.length === 0) {
      alert("Debe ingresar al menos una cantidad recibida mayor a 0.")
      return
    }

    // Validación: series registradas para productos con serie
    for (const linea of rec.lineas) {
      if (!linea.tiene_serie) continue
      const cantEfectiva = getCantEfectiva(linea)
      if (cantEfectiva === 0) continue
      const seriesDelProducto = seriesConfirmadas[linea.producto_id] || []
      const seriesValidas = seriesDelProducto.filter(u => u.nro_serie?.trim() !== '')
      if (seriesValidas.length < cantEfectiva) {
        alert(`Debe registrar los N° de serie para: ${linea.producto_nombre}`)
        setModalSerieProducto(linea)
        setModalSerieUnidades(seriesDelProducto.length > 0 ? seriesDelProducto : Array.from({ length: linea.cantidad_pedida }, () => ({ nro_serie: '', outlet: false })))
        setModalSerieOpen(true)
        return
      }
    }

    const ahora = new Date().toISOString()
    const lineasActualizadas: RecepcionLinea[] = (rec.lineas ?? []).map(l => {
      const cantRec = getCantEfectiva(l)
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

    // Calcular líneas pendientes para recepción complementaria
    const lineasPendientes: RecepcionLinea[] = hayParcial
      ? lineasActualizadas
          .filter(l => l.cantidad_pedida - l.cantidad_recibida > 0)
          .map(l => ({
            ...l,
            cantidad_pedida: l.cantidad_pedida - l.cantidad_recibida,
            cantidad_recibida: 0,
            estado_linea: 'pendiente' as const,
            unidades_serie: []
          }))
      : []

    // Actualizar la recepción actual en UI de forma síncrona (sin recepcion_complementaria_id todavía)
    const recActualizada: Recepcion = {
      ...rec,
      estado: 'recibida',
      fecha_recepcion_real: ahora,
      lineas: lineasActualizadas,
      recepcion_complementaria_id: undefined
    }

    setRecepciones(prev => prev.map(r => r.id === rec.id ? recActualizada : r))
    setSelectedRecepcion(recActualizada)
    if (rec.documento_origen_tipo === 'oc' && rec.documento_origen_id) {
      const todasRecibidas = lineasActualizadas.every(l => l.estado_linea === 'recibido')
      setOrdenesCompra(prev => prev.map(oc => {
        if (oc.id !== rec.documento_origen_id) return oc
        return {
          ...oc,
          estado: todasRecibidas && !hayParcial ? 'recibida' : 'recibida_parcial',
          lineas: (oc.lineas ?? []).map(ol => {
            const linRec = lineasActualizadas.find(l => l.producto_id === ol.producto_id)
            return linRec ? { ...ol, cantidad_recibida: ol.cantidad_recibida + linRec.cantidad_recibida } : ol
          })
        }
      }))
    }

    // Persistir recepción a Supabase
    const todasRecibidasFinal = lineasActualizadas.every(l => l.estado_linea === 'recibido')

    let recGuardada: any
    try {
      recGuardada = await guardarRecepcion({
        estado: todasRecibidasFinal ? "recibida" : "recibida_parcial",
        fecha_recepcion_real: ahora,
        sucursal: rec.sucursal ?? "",
        deposito_destino: rec.deposito_destino ?? "",
        deposito_destino_id: rec.deposito_destino_id ?? null,
        ubicacion: rec.ubicacion ?? "",
        items: lineasActualizadas.map(l => ({
          producto_id:            l.producto_id,
          producto_nombre:        l.producto_nombre,
          producto_sku:           l.producto_sku ?? "",
          cantidad_pedida:        l.cantidad_pedida,
          cantidad_recibida:      l.cantidad_recibida,
          precio_unitario:        l.precio_unitario,
          udm:                    l.udm ?? "un",
          estado_linea:           l.estado_linea,
          tiene_serie:            l.tiene_serie ?? false,
          requiere_color:         l.requiere_color ?? false,
          requiere_bateria:       l.requiere_bateria ?? false,
          requiere_outlet:        l.requiere_outlet ?? false,
          requiere_observaciones: l.requiere_observaciones ?? false,
          nac:                    l.nac ?? false,
        })),
        total: lineasActualizadas.reduce((s, l) => s + l.cantidad_recibida * (l.precio_unitario ?? 0), 0),
      }, rec.id)
    } catch (err: any) {
      console.error("[v0] Error al persistir recepción:", err.message)
      return
    }

    // Actualizar OC vinculada
    if (rec.documento_origen_tipo === 'oc' && rec.documento_origen_id) {
      const ocVinculada = ordenesCompra.find(o => o.id === rec.documento_origen_id)
      if (ocVinculada) {
        guardarOrdenCompra({ estado: todasRecibidasFinal && !hayParcial ? "completa" : "parcial" }, ocVinculada.id)
          .catch((err: any) => console.error("[v0] Error al actualizar OC:", err.message))
      }
    }

    // Crear recepción complementaria si hay líneas pendientes
    if (hayParcial && lineasPendientes.length > 0) {
      try {
        const idRecConfirmada = recGuardada?.id ?? rec.id
        // Obtener proveedor desde la OC vinculada si la recepción no lo tiene directamente
        const ocVinc = ordenesCompra.find(o => o.id === rec.documento_origen_id)
        const proveedorId = rec.proveedor_id ?? ocVinc?.proveedor_id
        const proveedorNombre = rec.proveedor_nombre ?? ocVinc?.proveedor_nombre ?? ""
        if (!proveedorId) {
          console.error("[v0] No se encontró proveedor_id para la recepción complementaria")
        }
        const recCompGuardada = await guardarRecepcion({
          fecha:                   ahora,
          estado:                  "esperando_recepcion",
          orden_compra_id:         rec.orden_compra_id ?? ocVinc?.id,
          orden_compra_numero:     rec.orden_compra_numero ?? ocVinc?.numero,
          proveedor_id:            proveedorId,
          proveedor_nombre:        proveedorNombre,
          documento_origen_tipo:   rec.documento_origen_tipo,
          documento_origen_id:     rec.documento_origen_id,
          documento_origen_ref:    rec.documento_origen_ref,
          sucursal:                rec.sucursal ?? "",
          deposito_destino:        rec.deposito_destino ?? "",
          deposito_destino_id:     rec.deposito_destino_id ?? null,
          fecha_esperada:          rec.fecha_esperada ?? null,
          recepcion_anterior_id:   idRecConfirmada,
          items: lineasPendientes.map(l => ({
            producto_id:            l.producto_id,
            producto_nombre:        l.producto_nombre,
            producto_sku:           l.producto_sku ?? "",
            cantidad_pedida:        l.cantidad_pedida,
            cantidad_recibida:      0,
            precio_unitario:        l.precio_unitario,
            udm:                    l.udm ?? "un",
            estado_linea:           "pendiente",
            tiene_serie:            l.tiene_serie ?? false,
            requiere_color:         l.requiere_color ?? false,
            requiere_bateria:       l.requiere_bateria ?? false,
            requiere_outlet:        l.requiere_outlet ?? false,
            requiere_observaciones: l.requiere_observaciones ?? false,
            nac:                    l.nac ?? false,
          })),
          total: 0,
        })

        // Vincular la recepción original con la complementaria
        await guardarRecepcion({ recepcion_complementaria_id: recCompGuardada.id }, idRecConfirmada)

        // Actualizar UI
        const recCompLocal: Recepcion = {
          ...rec,
          id: recCompGuardada.id,
          numero: recCompGuardada.numero ?? "REC-?????",
          fecha: ahora,
          estado: 'esperando_recepcion',
          fecha_recepcion_real: undefined,
          remito_numero: undefined,
          remito_fecha: undefined,
          recepcion_anterior_id: idRecConfirmada,
          recepcion_complementaria_id: undefined,
          lineas: lineasPendientes,
          cancelacion: undefined
        }
        setRecepciones(prev => {
          const sinDuplicados = prev.filter(r => r.id !== recCompGuardada.id)
          return sinDuplicados.map(r =>
            r.id === rec.id ? { ...r, recepcion_complementaria_id: recCompGuardada.id } : r
          ).concat(recCompLocal)
        })
        setSelectedRecepcion(prev =>
          prev?.id === rec.id ? { ...prev, recepcion_complementaria_id: recCompGuardada.id } : prev
        )
      } catch (err: any) {
        console.error("[v0] Error al crear recepción complementaria:", err.message)
      }
    }

    // Entrada de stock en Supabase via .then() sin await
    fetchDepositos().then(depositos => {
      // Usar deposito_destino_id si existe, sino buscar por nombre/código, sino primer depósito
      const depositoDestino =
        depositos.find((d: any) => d.id === recActualizada.deposito_destino_id) ??
        depositos.find((d: any) =>
          d.nombre?.toLowerCase() === recActualizada.deposito_destino?.toLowerCase() ||
          d.codigo?.toLowerCase() === recActualizada.deposito_destino?.toLowerCase()
        ) ??
        depositos[0]
      if (!depositoDestino) {
        console.error("[v0] Sin depósito destino para entrada de stock")
        return
      }
      fetchUbicaciones(depositoDestino.id).then(ubicaciones => {
        // Usar ubicacion_destino_id si existe, sino es_defecto, sino primera ubicación
        const ubicacionDestino =
          ubicaciones.find((u: any) => u.id === recActualizada.ubicacion_destino_id) ??
          ubicaciones.find((u: any) => u.es_defecto) ??
          ubicaciones[0]
        if (!ubicacionDestino) {
          console.error("[v0] Sin ubicación destino para entrada de stock — depósito:", depositoDestino.nombre)
          return
        }
        // Persistir los IDs de depósito y ubicación en la recepción
        guardarRecepcion({
          deposito_destino_id: depositoDestino.id,
          ubicacion_destino_id: ubicacionDestino.id,
          deposito_destino: depositoDestino.nombre,
        }, rec.id).catch((e: any) => console.error("[v0] Error guardando IDs depósito:", e.message))

        procesarEntradaRecepcion({
          recepcion_id:      recActualizada.id,
          recepcion_numero:  recActualizada.numero,
          deposito_id:       depositoDestino.id,
          ubicacion_id:      ubicacionDestino.id,
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
        }).then(() => {
          // Recargar stock_real de productos en el contexto global
          recargarProductos()
        }).catch((err: any) => console.error("[stock] Error procesando entrada de stock:", err))
      }).catch((err: any) => console.error("[stock] Error obteniendo ubicaciones:", err))
    }).catch((err: any) => console.error("[stock] Error obteniendo depósitos:", err))

    // Asiento contable del circuito de compras (si aplica)
    // Siempre se llama al endpoint cuando hay una OC vinculada; el backend valida aplica_circuito_compras
    if (rec.orden_compra_id || rec.documento_origen_tipo === 'oc') {
      try {
        const asientoRes = await fetch(`/api/compras/recepciones/${rec.id}/asiento-circuito`, { method: "POST" })
        const asientoJson = await asientoRes.json()
        if (asientoRes.ok && asientoJson.asiento_id) {
          const withAsiento = { ...recActualizada, asiento_id: asientoJson.asiento_id }
          setSelectedRecepcion(withAsiento)
          setRecepciones(prev => prev.map(r => r.id === rec.id ? withAsiento : r))
        } else if (!asientoJson.skip && !asientoRes.ok) {
          console.error("[circuito] Error asiento recepción:", asientoJson.error)
          alert(`Advertencia: la recepción se confirmó pero no se pudo generar el asiento contable.\n${asientoJson.error ?? "Error desconocido"}`)
        }
      } catch (err: any) {
        console.error("[circuito] Error generando asiento recepción:", err.message)
        alert(`Advertencia: la recepción se confirmó pero no se pudo contactar el servidor para el asiento contable.\n${err.message}`)
      }
    }

    // Actualizar costo_contable (sistema último costo)
    // Las recepciones de toma de equipo no actualizan el costo; el flag NAC por línea lo maneja el backend
    if (rec.documento_origen_tipo !== 'toma_equipo') {
      fetch(`/api/compras/recepciones/${rec.id}/actualizar-costos`, { method: "POST" })
        .then(r => r.json())
        .then(json => {
          if (json.skip) {
            console.log("[costos] Salteado:", json.reason)
          } else if (json.ok) {
            console.log(`[costos] Actualizados ${json.actualizados?.length ?? 0} productos:`, json.actualizados)
          } else {
            console.error("[costos] Error actualizando costo_contable:", json.error, json)
          }
        })
        .catch(err => console.error("[costos] Error actualizando costo_contable:", err.message))
    }

    // Limpiar estado temporal
    setSeriesConfirmadas({})
    setRecepcionCantidades({})
    } finally {
      setConfirmandoRec(false)
    }
  }

  // =====================================================
  // RENDER RECEPCIONES
  // =====================================================
  const renderRecepciones = () => {
    if (selectedRecepcion) return renderFichaRecepcion()

    const estadoColor: Record<string, string> = {
      recibida:            'bg-green-100 text-green-700',
      recibida_parcial:    'bg-green-50 text-green-600',
      esperando_recepcion: 'bg-amber-100 text-amber-700',
      cancelada:           'bg-red-100 text-red-700',
    }
    const estadoLabel: Record<string, string> = {
      recibida:            'Recibida',
      recibida_parcial:    'Recibida parcial',
      esperando_recepcion: 'Esperando Recepción',
      cancelada:           'Cancelada',
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
        (r.lineas ?? []).some(l =>
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
            <h1 className="text-2xl font-bold text-amber-900">Recepciones de Compra</h1>
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
        { value: "recibida_parcial", label: "Recibida parcial" },
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
                <th className="text-left py-3 px-4">Proveedor</th>
                <th className="text-left py-3 px-4">Origen</th>
                <th className="text-left py-3 px-4">Depósito / Ubicación</th>
                <th className="text-left py-3 px-4">Doc. Origen</th>
                <th className="text-center py-3 px-4">Productos</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recepcionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-gray-400">
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
                      Object.fromEntries((rec.lineas ?? []).map(l => [l.producto_id, l.cantidad_recibida]))
                    )
                  }}
                >
                  <td className="py-3 px-4 font-medium text-emerald-700">{rec.numero}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{new Date(rec.fecha).toLocaleDateString('es-AR')}</td>
                  {/* Proveedor: vacío para tomas de equipo ya que el "proveedor" es el cliente */}
                  <td className="py-3 px-4 text-sm font-medium">
                    {rec.documento_origen_tipo === 'toma_equipo' ? '-' : (rec.proveedor_nombre || '-')}
                  </td>
                  {/* Origen */}
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {origenLabel[rec.documento_origen_tipo] || rec.documento_origen_tipo}
                  </td>
                  {/* Depósito / Ubicación — columna DB: deposito_destino + ubicacion */}
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <span>{(rec as any).deposito_destino || '-'}</span>
                    {(rec as any).ubicacion && (
                      <>
                        <span className="text-gray-400 mx-1">/</span>
                        <span>{(rec as any).ubicacion}</span>
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-blue-600 font-medium">{rec.documento_origen_ref}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-sm">{(rec.lineas ?? []).length}</td>
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
    const canEdit = ["borrador", "esperando_recepcion"].includes(rec.estado ?? "")
    const editable = canEdit && recepcionModoEdicion

    const handleCambiarTabRec = async (tab: "info" | "detalles") => {
      setRecDetalleTab(tab)
      if (tab === "detalles" && recAsientos.length === 0 && !recAsientoCargando) {
        setRecAsientoCargando(true)
        try {
          const { asientos } = await fetchAsientoRecepcion(rec.id)
          setRecAsientos(asientos)
        } catch {
          setRecAsientos([])
        } finally {
          setRecAsientoCargando(false)
        }
      }
    }

    const estadoColor: Record<string, string> = {
      borrador:             'bg-gray-100 text-gray-600',
      esperando_recepcion:  'bg-amber-100 text-amber-700',
      parcial:              'bg-orange-100 text-orange-700',
      confirmada:           'bg-blue-100 text-blue-700',
      recibida:             'bg-green-100 text-green-700',
      completa:             'bg-green-100 text-green-700',
      cancelada:            'bg-red-100 text-red-700',
    }
    const estadoLabel: Record<string, string> = {
      borrador:             'Borrador',
      esperando_recepcion:  'Esperando recepción',
      recibida_parcial:     'Recibida parcial',
      parcial:              'Parcial',
      confirmada:           'Confirmada',
      recibida:             'Recibida',
      completa:             'Completa',
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
      const todasCompletas = (rec.lineas ?? []).every(l => (recepcionCantidades[l.producto_id] ?? l.cantidad_recibida) >= l.cantidad_pedida)

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
        {/* Modal popup asiento (recepción) */}
        {recAsientoModalOpen && recAsientoModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Asiento {recAsientoModalItem.numero ?? "S/N"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(recAsientoModalItem.fecha)}
                    {recAsientoModalItem.concepto ? ` · ${recAsientoModalItem.concepto}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => { setRecAsientoModalOpen(false); setRecAsientoModalItem(null) }}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold text-gray-500 uppercase">
                      <th className="text-left py-2 pr-4">Cuenta</th>
                      <th className="text-left py-2 pr-4">Descripción</th>
                      <th className="text-right py-2 pr-4">Debe</th>
                      <th className="text-right py-2">Haber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recAsientoModalItem.lineas.map((linea, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-xs text-gray-800 whitespace-nowrap">
                          <span className="font-semibold">{linea.cuenta_codigo}</span>
                          <span className="text-gray-500 ml-1">— {linea.cuenta_nombre}</span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{linea.descripcion ?? "—"}</td>
                        <td className="py-2 pr-4 text-right font-medium text-gray-800">
                          {linea.debe > 0 ? formatCurrency(linea.debe) : "—"}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-800">
                          {linea.haber > 0 ? formatCurrency(linea.haber) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold text-sm">
                      <td colSpan={2} className="py-2 text-gray-600">Total</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(recAsientoModalItem.lineas.reduce((s, l) => s + l.debe, 0))}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(recAsientoModalItem.lineas.reduce((s, l) => s + l.haber, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => { setRecAsientoModalOpen(false); setRecAsientoModalItem(null) }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

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
                  setRecepcionCantidades(Object.fromEntries((recAnterior.lineas ?? []).map(l => [l.producto_id, l.cantidad_recibida])))
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
                  setRecepcionCantidades(Object.fromEntries((recComplementaria.lineas ?? []).map(l => [l.producto_id, l.cantidad_recibida])))
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
              <h1 className="text-2xl font-bold text-amber-900">{rec.numero}</h1>
              <p className="text-sm text-gray-500">
                {new Date(rec.fecha).toLocaleDateString('es-AR')} | {rec.proveedor_nombre || 'Sin proveedor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && !editable && (
              <button
                onClick={() => setRecepcionModoEdicion(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Editar
              </button>
            )}
            {editable && (
              <>
                <button
                  onClick={() => setRecepcionModoEdicion(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarRecepcion}
                  disabled={confirmandoRec}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {confirmandoRec ? "Procesando..." : "Confirmar Recepción"}
                </button>
              </>
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

        {/* Tabs estilo Odoo */}
        <div className="border-b mb-6">
          <div className="flex gap-1">
            {(["info", "detalles"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => handleCambiarTabRec(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  recDetalleTab === tab
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab === "info" ? "Información" : "Detalles"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Información */}
        {recDetalleTab === "info" && (
          <>
        {/* Cabecera datos */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sucursal</p>
              <p className="font-medium">{rec.sucursal || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Depósito Destino</p>
              <p className="font-medium">{rec.deposito_destino || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ubicación</p>
              <p className="font-medium">{(rec as any).ubicacion || '-'}</p>
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
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Remito N��</p>
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
                      ;(rec.lineas ?? []).forEach(l => { nuevo[l.producto_id] = l.cantidad_pedida })
                      setRecepcionCantidades(nuevo)
                    } else {
                      const nuevo: Record<number, number> = {}
                      ;(rec.lineas ?? []).forEach(l => { nuevo[l.producto_id] = 0 })
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
              {(rec.lineas ?? []).map((linea, idx) => {
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
                        linea.tiene_serie ? (
                          <span className="inline-block w-16 text-center px-2 py-1 border border-gray-200 rounded text-sm bg-gray-50 text-gray-700 font-medium">
                            {(seriesConfirmadas[linea.producto_id] || []).filter(u => u.nro_serie?.trim() !== '').length}
                          </span>
                        ) : (
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
                        )
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
          </>
        )}

        {/* Tab: Detalles (Asientos contables) */}
        {recDetalleTab === "detalles" && (
          <div>
            {recAsientoCargando ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                Cargando asientos contables...
              </div>
            ) : recAsientos.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <p className="text-gray-400 text-sm">
                  {["borrador", "esperando_recepcion"].includes(rec.estado)
                    ? "Esta recepción aún no tiene asiento contable. Confírmala para generarlo."
                    : "No se encontró asiento contable para esta recepción."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recAsientos.map((asiento) => (
                  <div key={asiento.id} className="bg-white rounded-lg border overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asiento Contable</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        asiento.estado === "publicado" ? "bg-green-100 text-green-700" :
                        asiento.estado === "cancelado" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {asiento.estado === "publicado" ? "Publicado" : asiento.estado === "cancelado" ? "Cancelado" : asiento.estado}
                      </span>
                    </div>
                    <button
                      onClick={() => { setRecAsientoModalItem(asiento); setRecAsientoModalOpen(true) }}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50 transition-colors group text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-indigo-900 group-hover:text-indigo-700">
                            {asiento.numero ?? "Asiento S/N"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(asiento.fecha)}
                            {asiento.concepto ? ` · ${asiento.concepto}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-indigo-600">
                        <span>{asiento.lineas.length} líneas</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // =====================================================
  // RENDER FACTURAS DE COMPRA
  // =====================================================
  const renderFacturasCompra = () => {
    const facturasFiltradas = facturasCompra.filter(f => {
      const q = fcBusqueda.toLowerCase()
      if (!q) return true
      return (
        f.numero?.toLowerCase().includes(q) ||
        f.proveedor_nombre?.toLowerCase().includes(q)
      )
    })

    const handleNuevaFac = async () => {
      setSelectedFacturaCompra(null)
      // Generar número correlativo automático
      let numeroAuto = ""
      try {
        const res = await fetch("/api/compras/facturas/numero-siguiente")
        if (res.ok) {
          const json = await res.json()
          numeroAuto = json.numero ?? ""
        }
      } catch {}
      setFcForm({ ...facturaFormVacio, numero: numeroAuto })
      setFcLineas([fcLineaVacia()])
      setFcImpuestos([])
      setFcErrorPublicar(null)
      setCreandoFacturaCompra(true)
    }

    // Calcular totales desde líneas (sin IVA en línea — IVA va en sección separada)
    const calcularTotalesLineas = (lineas: FacturaCompraLinea[], _tipo?: string) => {
      let subtotal = 0
      for (const l of lineas) {
        subtotal += l.cantidad * l.precio_unitario * (1 - l.descuento_pct / 100)
      }
      return { subtotal }
    }

    const actualizarLinea = (idx: number, patch: Partial<FacturaCompraLinea>) => {
      setFcLineas(prev => {
        const nueva = prev.map((l, i) => {
          if (i !== idx) return l
          const merged = { ...l, ...patch }
          merged.subtotal = merged.cantidad * merged.precio_unitario * (1 - merged.descuento_pct / 100)
          merged.iva = 0
          merged.total_linea = merged.subtotal
          return merged
        })
        const tots = calcularTotalesLineas(nueva)
        const ivaSum = fcImpuestos.reduce((s, t) => s + t.importe, 0)
        setFcForm(prev2 => ({ ...prev2, subtotal: tots.subtotal, impuestos: ivaSum, total: tots.subtotal + ivaSum, saldo: tots.subtotal + ivaSum }))
        return nueva
      })
    }

    const getCuentaDefectoCategoria = (proveedorId: number) => {
      const prov = proveedores.find(p => p.id === proveedorId)
      if (!prov?.categoria_proveedor) return null
      const cat = categoriasProveedor.find(c => c.nombre === prov.categoria_proveedor)
      if (!cat?.cuenta_pagar_id) return null
      return { cuenta_contable_id: cat.cuenta_pagar_id, cuenta_codigo: cat.cuenta_pagar_codigo ?? "", cuenta_nombre: cat.cuenta_pagar_nombre ?? "" }
    }

    const agregarLinea = () => {
      const cuentaDefecto = getCuentaDefectoCategoria(fcForm.proveedor_id) ?? {}
      setFcLineas(prev => [...prev, { ...fcLineaVacia(), orden: prev.length, ...cuentaDefecto }])
    }
    const eliminarLinea = (idx: number) => {
      setFcLineas(prev => {
        const nueva = prev.filter((_, i) => i !== idx)
        const tots = calcularTotalesLineas(nueva)
        const ivaSum = fcImpuestos.reduce((s, t) => s + t.importe, 0)
        setFcForm(prev2 => ({ ...prev2, subtotal: tots.subtotal, impuestos: ivaSum, total: tots.subtotal + ivaSum, saldo: tots.subtotal + ivaSum }))
        return nueva
      })
    }

    const actualizarImpuesto = (idx: number, patch: Partial<{ nombre: string; redondeo: number; importe: number }>) => {
      setFcImpuestos(prev => {
        const nueva = prev.map((t, i) => i === idx ? { ...t, ...patch } : t)
        const ivaSum = nueva.reduce((s, t) => s + t.importe, 0)
        const sub = fcLineas.reduce((s, l) => s + l.cantidad * l.precio_unitario * (1 - l.descuento_pct / 100), 0)
        setFcForm(prev2 => ({ ...prev2, impuestos: ivaSum, total: sub + ivaSum, saldo: sub + ivaSum }))
        return nueva
      })
    }
    const agregarImpuesto = () => setFcImpuestos(prev => [...prev, { nombre: "", redondeo: 0, importe: 0 }])
    const eliminarImpuesto = (idx: number) => {
      setFcImpuestos(prev => {
        const nueva = prev.filter((_, i) => i !== idx)
        const ivaSum = nueva.reduce((s, t) => s + t.importe, 0)
        const sub = fcLineas.reduce((s, l) => s + l.cantidad * l.precio_unitario * (1 - l.descuento_pct / 100), 0)
        setFcForm(prev2 => ({ ...prev2, impuestos: ivaSum, total: sub + ivaSum, saldo: sub + ivaSum }))
        return nueva
      })
    }

    const importarLineasDesdeOC = () => {
      if (!fcForm.orden_compra_id) return
      const oc = ordenesCompra.find(o => o.id === fcForm.orden_compra_id)
      if (!oc) return
      const lineasOC: FacturaCompraLinea[] = (oc.items ?? []).map((item: any, idx: number) => ({
        ...fcLineaVacia(),
        descripcion: item.descripcion ?? item.producto_nombre ?? "",
        cantidad: item.cantidad ?? 1,
        precio_unitario: item.precio_unitario ?? 0,
        subtotal: (item.cantidad ?? 1) * (item.precio_unitario ?? 0),
        orden: idx,
      }))
      if (lineasOC.length === 0) return
      setFcLineas(lineasOC)
      const tots = calcularTotalesLineas(lineasOC)
      const ivaSum = fcImpuestos.reduce((s, t) => s + t.importe, 0)
      setFcForm(prev => ({
        ...prev,
        moneda: oc.moneda ?? prev.moneda,
        cotizacion: (oc as any).cotizacion_dia ?? prev.cotizacion,
        tipo_cotizacion: (oc as any).tipo_cotizacion ?? prev.tipo_cotizacion,
        subtotal: tots.subtotal,
        impuestos: ivaSum,
        total: tots.subtotal + ivaSum,
        saldo: tots.subtotal + ivaSum,
      }))
    }

    const handleGuardarFac = async () => {
      if (!fcForm.proveedor_id) return
      try {
        const sub = fcLineas.reduce((s, l) => s + l.subtotal, 0)
        const ivaSum = fcImpuestos.reduce((s, t) => s + t.importe, 0)
        const payload = {
          numero: fcForm.numero,
          tipo: fcForm.tipo,
          fecha: fcForm.fecha,
          fecha_vencimiento: fcForm.fecha_vencimiento || null,
          proveedor_id: fcForm.proveedor_id,
          proveedor_nombre: fcForm.proveedor_nombre,
          estado: selectedFacturaCompra?.estado ?? "borrador",
          moneda: fcForm.moneda,
          tipo_cambio: fcForm.tipo_cambio,
          cotizacion: fcForm.cotizacion ?? null,
          tipo_cotizacion: fcForm.tipo_cotizacion ?? null,
          sucursal: fcForm.sucursal ?? null,
          subtotal: sub,
          impuestos: ivaSum,
          total: sub + ivaSum,
          saldo: sub + ivaSum,
          orden_compra_id: fcForm.orden_compra_id ?? null,
          lineas: fcLineas.map((l, i) => ({ ...l, orden: i })),
        }
        if (selectedFacturaCompra) {
          const updated = await guardarFacturaCompra(payload, selectedFacturaCompra.id)
          const merged = { ...selectedFacturaCompra, ...updated, lineas: fcLineas }
          setFacturasCompra(prev => prev.map(f => f.id === selectedFacturaCompra.id ? merged : f))
          setCreandoFacturaCompra(false)
          setSelectedFacturaCompra(merged)
        } else {
          const created = await guardarFacturaCompra(payload)
          const mergedNew = { ...created, lineas: fcLineas }
          setFacturasCompra(prev => [...prev, mergedNew])
          setCreandoFacturaCompra(false)
          setSelectedFacturaCompra(mergedNew)
        }
      } catch (e: any) {
        setFcErrorPublicar(e.message ?? "Error al guardar")
      }
    }

    const handlePublicarFac = async (fac: FacturaCompra) => {
      setFcPublicando(true)
      setFcErrorPublicar(null)
      try {
        await publicarFacturaCompra(fac.id)
        setFacturasCompra(prev => prev.map(f => f.id === fac.id ? { ...f, estado: "pendiente" } : f))
        setSelectedFacturaCompra(prev => prev ? { ...prev, estado: "pendiente" } : prev)
      } catch (e: any) {
        setFcErrorPublicar(e.message ?? "Error al publicar")
      } finally {
        setFcPublicando(false)
      }
    }

    const estadoColor: Record<string, string> = {
      borrador:      "bg-gray-100 text-gray-600",
      pendiente:     "bg-amber-100 text-amber-700",
      pagada_parcial:"bg-blue-100 text-blue-700",
      pagada:        "bg-green-100 text-green-700",
      cancelada:     "bg-red-100 text-red-700",
    }
    const estadoLabel: Record<string, string> = {
      borrador:      "Borrador",
      pendiente:     "Pendiente",
      pagada_parcial:"Pago Parcial",
      pagada:        "Pagada",
      cancelada:     "Cancelada",
    }

    // ── Vista detalle ──
    if (selectedFacturaCompra && !creandoFacturaCompra) {
      const f = selectedFacturaCompra

      const handleCambiarTabDetalle = async (tab: "info" | "detalles") => {
        setFcDetalleTab(tab)
        if (tab === "detalles" && fcAsientos.length === 0 && !fcAsientoCargando) {
          setFcAsientoCargando(true)
          try {
            const { asientos } = await fetchAsientoFacturaCompra(f.id)
            setFcAsientos(asientos)
          } catch {
            setFcAsientos([])
          } finally {
            setFcAsientoCargando(false)
          }
        }
      }

      return (
        <div>
          {/* Modal popup asiento */}
          {fcAsientoModalOpen && fcAsientoModalItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Asiento {fcAsientoModalItem.numero ?? "S/N"}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(fcAsientoModalItem.fecha)}
                      {fcAsientoModalItem.concepto ? ` · ${fcAsientoModalItem.concepto}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => { setFcAsientoModalOpen(false); setFcAsientoModalItem(null) }}
                    className="text-gray-400 hover:text-gray-700 p-1 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 py-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs font-semibold text-gray-500 uppercase">
                        <th className="text-left py-2 pr-4">Cuenta</th>
                        <th className="text-left py-2 pr-4">Descripción</th>
                        <th className="text-right py-2 pr-4">Debe</th>
                        <th className="text-right py-2">Haber</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fcAsientoModalItem.lineas.map((linea, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-2 pr-4 font-mono text-xs text-gray-800 whitespace-nowrap">
                            <span className="font-semibold">{linea.cuenta_codigo}</span>
                            <span className="text-gray-500 ml-1">— {linea.cuenta_nombre}</span>
                          </td>
                          <td className="py-2 pr-4 text-xs text-gray-500">{linea.descripcion ?? "—"}</td>
                          <td className="py-2 pr-4 text-right font-medium text-gray-800">
                            {linea.debe > 0 ? formatCurrency(linea.debe) : "—"}
                          </td>
                          <td className="py-2 text-right font-medium text-gray-800">
                            {linea.haber > 0 ? formatCurrency(linea.haber) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold text-sm">
                        <td colSpan={2} className="py-2 text-gray-600">Total</td>
                        <td className="py-2 pr-4 text-right">
                          {formatCurrency(fcAsientoModalItem.lineas.reduce((s, l) => s + l.debe, 0))}
                        </td>
                        <td className="py-2 text-right">
                          {formatCurrency(fcAsientoModalItem.lineas.reduce((s, l) => s + l.haber, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                  <button
                    onClick={() => { setFcAsientoModalOpen(false); setFcAsientoModalItem(null) }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <button onClick={() => { setSelectedFacturaCompra(null); setFcDetalleTab("info"); setFcAsientos([]) }} className="hover:text-blue-600">Facturas de Compra</button>
            <span>/</span>
            <span className="text-gray-900">{f.numero}</span>
          </div>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <BotonVolver onClick={() => { setSelectedFacturaCompra(null); setFcDetalleTab("info"); setFcAsientos([]) }} variant="minimal" texto="" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-amber-900">Factura {f.tipo} — {f.numero}</h1>
                  {f.es_automatica && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">Circuito de Compras</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{f.proveedor_nombre} · {formatDate(f.fecha)}</p>
                {f.es_automatica && f.orden_compra_id && (() => {
                  const ocVinc = ordenesCompra.find(o => o.id === f.orden_compra_id)
                  if (!ocVinc) return null
                  return (
                    <button
                      onClick={() => { setSelectedOC(ocVinc); setActiveView("ordenes_compra") }}
                      className="text-xs text-indigo-600 hover:underline mt-0.5"
                    >
                      Generada automáticamente por OC {ocVinc.numero}
                    </button>
                  )
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {f.estado === "borrador" && (
                <button
                  onClick={() => handlePublicarFac(f)}
                  disabled={fcPublicando}
                  className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50"
                >
                  {fcPublicando ? "Publicando..." : "Publicar"}
                </button>
              )}
              {f.estado === "pendiente" && (
                <button
                  onClick={async () => {
                    if (!confirm("¿Cancelar la factura? Se generará un asiento de reversión y la factura quedará cancelada.")) return
                    setFcPublicando(true)
                    setFcErrorPublicar(null)
                    try {
                      await cancelarFacturaCompra(f.id)
                      const updated = { ...f, estado: "cancelada" as const }
                      setFacturasCompra(prev => prev.map(fc => fc.id === f.id ? updated : fc))
                      setSelectedFacturaCompra(updated)
                      setFcAsientos([])
                    } catch (e: any) {
                      setFcErrorPublicar(e.message ?? "Error al cancelar")
                    } finally {
                      setFcPublicando(false)
                    }
                  }}
                  disabled={fcPublicando}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  {fcPublicando ? "Cancelando..." : "Cancelar Factura"}
                </button>
              )}
              {f.estado === "borrador" && (
                <button
                  onClick={() => {
                    setFcForm({
                      numero: f.numero, tipo: f.tipo, fecha: f.fecha,
                      fecha_vencimiento: f.fecha_vencimiento ?? "",
                      proveedor_id: f.proveedor_id, proveedor_nombre: f.proveedor_nombre,
                      estado: f.estado, moneda: f.moneda, tipo_cambio: f.tipo_cambio,
                      cotizacion: f.cotizacion, tipo_cotizacion: f.tipo_cotizacion,
                      sucursal: f.sucursal,
                      subtotal: f.subtotal, impuestos: f.impuestos, total: f.total, saldo: f.saldo,
                      orden_compra_id: f.orden_compra_id,
                    })
                    setFcLineas(f.lineas && f.lineas.length > 0 ? f.lineas : [fcLineaVacia()])
                    setCreandoFacturaCompra(true)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" /> Editar
                </button>
              )}
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${estadoColor[f.estado] ?? "bg-gray-100 text-gray-600"}`}>
                {estadoLabel[f.estado] ?? f.estado}
              </span>
            </div>
          </div>

          {fcErrorPublicar && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{fcErrorPublicar}</div>
          )}

          {/* Tabs estilo Odoo */}
          <div className="border-b mb-6">
            <div className="flex gap-1">
              {(["info", "detalles"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleCambiarTabDetalle(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    fcDetalleTab === tab
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab === "info" ? "Información" : "Detalles"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab: Información */}
          {fcDetalleTab === "info" && (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Datos del Comprobante</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Proveedor:</span><span className="ml-2 font-medium">{f.proveedor_nombre}</span></div>
                    <div><span className="text-gray-500">Tipo:</span><span className="ml-2 font-medium">Factura {f.tipo}</span></div>
                    <div><span className="text-gray-500">Número:</span><span className="ml-2 font-medium">{f.numero}</span></div>
                    <div><span className="text-gray-500">Fecha:</span><span className="ml-2 font-medium">{formatDate(f.fecha)}</span></div>
                    {f.fecha_vencimiento && <div><span className="text-gray-500">Vencimiento:</span><span className="ml-2 font-medium">{formatDate(f.fecha_vencimiento)}</span></div>}
                    <div><span className="text-gray-500">Moneda:</span><span className="ml-2 font-medium">{f.moneda}</span></div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Importes</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(f.subtotal, f.moneda)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">IVA</span><span className="font-medium">{formatCurrency(f.impuestos, f.moneda)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total</span><span className="font-bold text-lg">{formatCurrency(f.total, f.moneda)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Saldo</span><span className={`font-medium ${f.saldo > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(f.saldo, f.moneda)}</span></div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Referencias</h3>
                  <div className="space-y-2 text-sm">
                    {f.orden_compra_id && <div><span className="text-gray-500">OC:</span><span className="ml-2 font-medium text-blue-600">#{f.orden_compra_id}</span></div>}
                    {f.recepcion_id && <div><span className="text-gray-500">Recepción:</span><span className="ml-2 font-medium text-blue-600">#{f.recepcion_id}</span></div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Detalles (Asientos contables) */}
          {fcDetalleTab === "detalles" && (
            <div>
              {fcAsientoCargando ? (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                  Cargando asientos contables...
                </div>
              ) : fcAsientos.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <p className="text-gray-400 text-sm">
                    {f.estado === "borrador"
                      ? "Esta factura aún no tiene asiento contable. Publícala para generarlo."
                      : "No se encontró asiento contable para esta factura."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fcAsientos.map((asiento) => (
                    <div key={asiento.id} className="bg-white rounded-lg border overflow-hidden">
                      <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asiento Contable</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          asiento.estado === "publicado" ? "bg-green-100 text-green-700" :
                          asiento.estado === "cancelado" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {asiento.estado === "publicado" ? "Publicado" : asiento.estado === "cancelado" ? "Cancelado" : asiento.estado}
                        </span>
                      </div>
                      <button
                        onClick={() => { setFcAsientoModalItem(asiento); setFcAsientoModalOpen(true) }}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-indigo-900 group-hover:text-indigo-700">
                              {asiento.numero ?? "Asiento S/N"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(asiento.fecha)}
                              {asiento.concepto ? ` · ${asiento.concepto}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-indigo-600">
                          <span>{asiento.lineas.length} líneas</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    // ── Vista formulario ──
    if (creandoFacturaCompra) {
      const f = fcForm
      const tots = calcularTotalesLineas(fcLineas)
      // Cuentas permitidas según la categoría del proveedor seleccionado
      const provSeleccionado = proveedores.find(p => p.id === f.proveedor_id)
      const catProvSeleccionada = provSeleccionado?.categoria_proveedor
        ? categoriasProveedor.find(c => c.nombre === provSeleccionado.categoria_proveedor)
        : null
      // Prioridad: circuito de compras (proveedor) → cuentas_permitidas de la categoría → cuenta_gastos_defecto del proveedor → cuenta_pagar_id de la categoría → sin restricción
      const cuentasPermitidasFac: { id: string; codigo: string; nombre: string }[] =
        ((provSeleccionado as any)?.aplica_circuito_compras && cuentaPtTransito)
          ? [cuentaPtTransito]
          : (catProvSeleccionada?.cuentas_permitidas?.length ?? 0) > 0
          ? catProvSeleccionada!.cuentas_permitidas
          : provSeleccionado?.cuenta_gastos_defecto
            ? [{ id: provSeleccionado.cuenta_gastos_defecto, codigo: provSeleccionado.cuenta_gastos_defecto_codigo ?? "", nombre: provSeleccionado.cuenta_gastos_defecto_nombre ?? "" }]
            : catProvSeleccionada?.cuenta_pagar_id
              ? [{ id: catProvSeleccionada.cuenta_pagar_id, codigo: catProvSeleccionada.cuenta_pagar_codigo ?? "", nombre: catProvSeleccionada.cuenta_pagar_nombre ?? "" }]
              : []

      return (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <BotonVolver onClick={() => { setCreandoFacturaCompra(false); setSelectedFacturaCompra(null) }} variant="minimal" texto="" />
              <h1 className="text-xl font-bold text-amber-900">
                {selectedFacturaCompra ? `Editando Factura ${selectedFacturaCompra.numero}` : "Nueva Factura de Compra"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {fcErrorPublicar && <p className="text-sm text-red-600">{fcErrorPublicar}</p>}
              <button onClick={() => { setCreandoFacturaCompra(false); setSelectedFacturaCompra(null) }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardarFac}
                disabled={!fcForm.proveedor_id}
                className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-40 transition-colors">
                Guardar borrador
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">

            {/* ── Encabezado ── */}
            <div className="px-6 py-2 bg-gray-50 border-b">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del comprobante</span>
            </div>
            <div className="px-6 pt-5 pb-4 border-b grid grid-cols-3 gap-5">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor <span className="text-red-500">*</span></label>
                <ProveedorSelector
                  value={f.proveedor_id ?? null}
                  onChange={(id, nombre) => {
                    const prov = id ? proveedores.find(p => p.id === id) : null
                    setFc({ proveedor_id: id ?? 0, proveedor_nombre: nombre })
                    if (prov?.categoria_proveedor) {
                      const cat = categoriasProveedor.find(c => c.nombre === prov.categoria_proveedor)
                      if (cat?.cuenta_pagar_id) {
                        setFcLineas(prev => prev.map(l => ({
                          ...l,
                          cuenta_contable_id: cat.cuenta_pagar_id!,
                          cuenta_codigo: cat.cuenta_pagar_codigo ?? "",
                          cuenta_nombre: cat.cuenta_pagar_nombre ?? "",
                        })))
                      }
                    }
                  }}
                  proveedores={proveedores}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                <input type="text" value={f.numero} readOnly
                  className="w-full border rounded px-3 py-2 text-sm bg-gray-100 text-gray-500 cursor-default" />
              </div>
            </div>
            <div className="px-6 pt-4 pb-4 border-b grid grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input type="date" value={f.fecha} onChange={e => setFc({ fecha: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento</label>
                <input type="date" value={f.fecha_vencimiento ?? ""} onChange={e => setFc({ fecha_vencimiento: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                <select value={f.moneda} onChange={e => {
                  const newMoneda = e.target.value
                  setFc({
                    moneda: newMoneda,
                    tipo_cotizacion: newMoneda === "ARS" ? undefined : (f.tipo_cotizacion || "blue"),
                  })
                }}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} {m.nombre}</option>)}
                </select>
              </div>
            </div>
            {f.moneda !== "ARS" && (
              <div className="px-6 pt-4 pb-4 border-b grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cotización ({f.moneda} → ARS)</label>
                  <input type="number" min="0" step="0.01" value={f.cotizacion ?? ""}
                    onChange={e => setFc({ cotizacion: Number(e.target.value) })}
                    placeholder="Ej: 1200.00"
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de cotización</label>
                  <select value={f.tipo_cotizacion ?? ""} onChange={e => setFc({ tipo_cotizacion: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Seleccionar...</option>
                    <option value="oficial">Oficial</option>
                    <option value="blue">Blue</option>
                    <option value="ccl">CCL</option>
                    <option value="mep">MEP</option>
                  </select>
                </div>
              </div>
            )}

            {/* Orden de Compra */}
            <div className="px-6 pt-4 pb-4 border-b flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Orden de Compra vinculada <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                <select value={f.orden_compra_id ?? ""} onChange={e => {
                  const ocId = e.target.value ? Number(e.target.value) : undefined
                  const oc = ocId ? ordenesCompra.find(o => o.id === ocId) : undefined
                  setFc({
                    orden_compra_id: ocId,
                    ...(oc ? {
                      moneda: oc.moneda ?? "ARS",
                      cotizacion: (oc as any).cotizacion_dia ?? undefined,
                      tipo_cotizacion: (oc as any).tipo_cotizacion ?? undefined,
                    } : {}),
                  })
                }}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin OC vinculada</option>
                  {ordenesCompra.filter(oc => !f.proveedor_id || oc.proveedor_id === f.proveedor_id)
                    .map(oc => <option key={oc.id} value={oc.id}>{oc.numero} — {oc.proveedor_nombre}</option>)}
                </select>
              </div>
              {f.orden_compra_id && (
                <button onClick={importarLineasDesdeOC}
                  className="px-3 py-2 text-sm border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap">
                  Importar líneas desde OC
                </button>
              )}
            </div>

            {/* ── Grilla de líneas ── */}
            <div className="px-6 py-2 bg-gray-50 border-b">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Líneas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-56">Cuenta Contable</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Cant.</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Precio</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Dto. %</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Importe</th>
                    <th className="py-2 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fcLineas.map((linea, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <CuentaContableSelector
                          value={linea.cuenta_contable_id ?? ""}
                          cuentasPermitidas={cuentasPermitidasFac.length > 0 ? cuentasPermitidasFac : undefined}
                          onChange={(id, codigo, nombre) => actualizarLinea(idx, { cuenta_contable_id: id || null, cuenta_codigo: codigo ?? "", cuenta_nombre: nombre ?? "" })}
                        />
                        {linea.cuenta_codigo && (
                          <div className="text-xs text-gray-400 mt-0.5">{linea.cuenta_codigo} — {linea.cuenta_nombre}</div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={linea.descripcion}
                          onChange={e => actualizarLinea(idx, { descripcion: e.target.value })}
                          placeholder="Detalle del ítem"
                          className="w-full border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min="0.001" step="0.001" value={linea.cantidad}
                          onChange={e => actualizarLinea(idx, { cantidad: Number(e.target.value) })}
                          className="w-20 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min="0" step="0.01" value={linea.precio_unitario}
                          onChange={e => actualizarLinea(idx, { precio_unitario: Number(e.target.value) })}
                          className="w-28 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min="0" max="100" step="0.01" value={linea.descuento_pct}
                          onChange={e => actualizarLinea(idx, { descuento_pct: Number(e.target.value) })}
                          className="w-20 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent" />
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-800">
                        {formatCurrency(linea.subtotal, f.moneda)}
                      </td>
                      <td className="py-2 px-3">
                        <button onClick={() => eliminarLinea(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-dashed border-gray-200">
              <button onClick={agregarLinea}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                <Plus className="w-4 h-4" /> Añadir un elemento
              </button>
            </div>

            {/* ── Impuestos + Totales ── */}
            <div className="border-t flex">
              {/* Sección impuestos (izquierda) */}
              <div className="flex-1 border-r">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase">Impuesto</th>
                      <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase w-28">Redondeo</th>
                      <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Importe</th>
                      <th className="py-2 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fcImpuestos.map((imp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <input type="text" value={imp.nombre}
                            onChange={e => actualizarImpuesto(idx, { nombre: e.target.value })}
                            placeholder="Ej: IVA 21%, Percepción IIBB..."
                            className="w-full border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent" />
                        </td>
                        <td className="py-2 px-4">
                          <input type="number" step="0.01" value={imp.redondeo}
                            onChange={e => actualizarImpuesto(idx, { redondeo: Number(e.target.value) })}
                            className="w-28 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent" />
                        </td>
                        <td className="py-2 px-4">
                          <input type="number" step="0.01" value={imp.importe}
                            onChange={e => actualizarImpuesto(idx, { importe: Number(e.target.value) })}
                            className="w-32 text-right border-0 border-b border-gray-200 px-0 py-1 text-sm focus:outline-none focus:border-indigo-400 bg-transparent font-medium" />
                        </td>
                        <td className="py-2 px-3">
                          <button onClick={() => eliminarImpuesto(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-dashed border-gray-200">
                  <button onClick={agregarImpuesto}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                    <Plus className="w-4 h-4" /> Añadir un impuesto
                  </button>
                </div>
              </div>

              {/* Totales (derecha) */}
              <div className="w-72 px-6 py-5 space-y-2 text-sm self-start">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(tots.subtotal, f.moneda)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Impuestos:</span>
                  <span className="font-medium">{formatCurrency(fcImpuestos.reduce((s, t) => s + t.importe, 0), f.moneda)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
                  <span>Total:</span>
                  <span>{formatCurrency(tots.subtotal + fcImpuestos.reduce((s, t) => s + t.importe, 0), f.moneda)}</span>
                </div>
                {f.moneda !== "ARS" && f.cotizacion && (
                  <div className="flex justify-between text-gray-400 text-xs pt-1 border-t">
                    <span>Saldo:</span>
                    <span>{formatCurrency(tots.subtotal + fcImpuestos.reduce((s, t) => s + t.importe, 0), f.moneda)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )
    }

    // ── Vista lista ──
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Facturas de Compra</h1>
            <p className="text-gray-500 mt-1">Gestione las facturas de proveedores</p>
          </div>
          <button
            onClick={handleNuevaFac}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800"
          >
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Facturas</p>
            <p className="text-2xl font-bold text-gray-900">{facturasCompra.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">{facturasCompra.filter(f => f.estado === 'pendiente').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Borradores</p>
            <p className="text-2xl font-bold text-gray-500">{facturasCompra.filter(f => f.estado === 'borrador').length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500">Total Adeudado</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(facturasCompra.filter(f => f.estado !== 'pagada' && f.estado !== 'cancelada').reduce((s, f) => s + (f.saldo ?? 0), 0))}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <OdooFilterBar
            moduleName="facturas-compra"
            filterOptions={[
              { field: "estado", label: "Estado", values: [
                { value: "borrador",       label: "Borrador" },
                { value: "pendiente",      label: "Pendiente" },
                { value: "pagada_parcial", label: "Pago Parcial" },
                { value: "pagada",         label: "Pagada" },
                { value: "cancelada",      label: "Cancelada" },
              ]},
            ]}
            groupByOptions={[
              { id: "estado",    label: "Estado",    field: "estado" },
              { id: "proveedor", label: "Proveedor", field: "proveedor_nombre" },
            ]}
            activeFilters={activeFiltersFC}
            activeGroupBy={activeGroupByFC}
            searchTerm={fcBusqueda}
            onFiltersChange={setActiveFiltersFC}
            onGroupByChange={setActiveGroupByFC}
            onSearchChange={setFcBusqueda}
            savedFilters={savedFiltersFC}
            {...makeSavedFilterHandlersC(setSavedFiltersFC, setActiveFiltersFC, setActiveGroupByFC, setFcBusqueda)}
            totalCount={facturasCompra.length}
            filteredCount={facturasFiltradas.length}
          />
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                {["Número", "Fecha", "Proveedor", "Subtotal", "IVA", "Total", "Saldo", "Estado"].map(h => (
                  <th key={h} className={`py-3 px-4 text-xs font-semibold text-gray-600 uppercase ${h === "Número" || h === "Fecha" || h === "Proveedor" ? "text-left" : "text-right"} ${h === "Estado" ? "text-center" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">No hay facturas de compra registradas</td></tr>
              )}
              {facturasFiltradas.map(fac => (
                <tr
                  key={fac.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelectedFacturaCompra(fac); setCreandoFacturaCompra(false); setFcErrorPublicar(null) }}
                >
                  <td className="py-3 px-4 font-medium text-emerald-700">Fac {fac.tipo} {fac.numero}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(fac.fecha)}</td>
                  <td className="py-3 px-4 text-sm">{fac.proveedor_nombre}</td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(fac.subtotal, fac.moneda)}</td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(fac.impuestos, fac.moneda)}</td>
                  <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(fac.total, fac.moneda)}</td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(fac.saldo ?? 0, fac.moneda)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoColor[fac.estado] ?? "bg-gray-100 text-gray-500"}`}>
                      {estadoLabel[fac.estado] ?? fac.estado}
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
      <ComprasListSection
        title="Notas de Crédito de Compra"
        subtitle="Gestione las notas de crédito recibidas de proveedores"
        moduleName="nc_compra"
        data={ncMock}
        searchFields={["numero", "proveedor", "factura_origen"]}
        filterFields={[{ field: "estado", label: "Estado" }]}
        actions={
          <button className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nueva NC
          </button>
        }
      >
        {(filtered) => (
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
              {filtered.map(nc => (
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
        )}
      </ComprasListSection>
    )
  }

  // =====================================================
  // RENDER NOTAS DE DÉBITO DE COMPRA
  // =====================================================
  const renderNotasDebitoCompra = () => {
    const ndMock: { id: number; numero: string; fecha: string; proveedor: string; factura_origen: string; motivo: string; total: number; estado: string }[] = []

    return (
      <ComprasListSection
        title="Notas de Débito de Compra"
        subtitle="Gestione las notas de débito recibidas de proveedores"
        moduleName="nd_compra"
        data={ndMock}
        searchFields={["numero", "proveedor", "factura_origen"]}
        filterFields={[{ field: "estado", label: "Estado" }]}
        actions={
          <button className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nueva ND
          </button>
        }
      >
        {(filtered) => (
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
              {filtered.map(nd => (
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
        )}
      </ComprasListSection>
    )
  }

  // =====================================================
  // RENDER ÓRDENES DE PAGO
  // =====================================================

  // ---- helpers OP ----
  const initNuevaOP = () => {
    const suc = sucursalActiva
    setOpForm({
      fecha: new Date().toISOString().split("T")[0],
      moneda: "ARS",
      importe: 0,
      importe_a_cuenta: 0,
      importe_no_conciliado: 0,
      sucursal_nombre: suc?.nombre ?? "",
      estado: "borrador",
    })
    setOpMediosPago([])
    setOpComprobantesDebito([])
    setOpComprobantesCredito([])
    setOpTabActivo("info_pago")
    setOpAsientos([])
    setCreandoOP(true)
    setSelectedOP(null)
  }

  const abrirFichaOP = (op: OrdenPago) => {
    setSelectedOP(op)
    setOpForm({ ...op })
    setOpMediosPago(op.medios_pago ?? [])
    setOpComprobantesDebito((op.comprobantes ?? []).filter(c => c.tipo === "debito"))
    setOpComprobantesCredito((op.comprobantes ?? []).filter(c => c.tipo === "credito"))
    setOpTabActivo("info_pago")
    setOpAsientos([])
    setCreandoOP(false)
    // Cargar OCs del proveedor
    setOpOCsProveedor(ordenesCompra.filter(oc => oc.proveedor_id === op.proveedor_id).map(oc => ({ id: oc.id, numero: oc.numero })))
  }

  const calcOpTotales = (medios: OPMedioPago[], debitos: OPComprobante[], creditos: OPComprobante[]) => {
    const totalMedios = medios.reduce((s, m) => s + (m.importe_comp || 0), 0)
    const totalDebitos = debitos.reduce((s, c) => s + (c.importe || 0), 0)
    const totalCreditos = creditos.reduce((s, c) => s + (c.importe || 0), 0)
    const noConciliado = totalMedios - totalDebitos + totalCreditos
    const aCuenta = Math.max(0, noConciliado)
    return { totalMedios, totalDebitos, totalCreditos, noConciliado, aCuenta }
  }

  const asignarPagosAFacturas = () => {
    const facturasDelProv = facturasCompra
      .filter(f => f.proveedor_id === opForm.proveedor_id && f.estado !== "pagada" && f.estado !== "cancelada" && (f.saldo ?? f.total) > 0)
      .sort((a, b) => new Date(a.fecha_vencimiento || a.fecha).getTime() - new Date(b.fecha_vencimiento || b.fecha).getTime())

    const totalDisponible = opMediosPago.reduce((s, m) => s + (m.importe_comp || 0), 0) -
      opComprobantesCredito.reduce((s, c) => s + (c.importe || 0), 0)

    let restante = totalDisponible
    const nuevosDebitos: OPComprobante[] = []

    for (const fac of facturasDelProv) {
      if (restante <= 0) break
      const saldoFac = fac.saldo ?? fac.total
      const asignar = Math.min(restante, saldoFac)
      nuevosDebitos.push({
        tipo: "debito",
        factura_id: fac.id,
        referencia: fac.numero,
        fecha: fac.fecha,
        vencimiento: fac.fecha_vencimiento,
        saldo_mon: saldoFac,
        moneda_comp: fac.moneda,
        cotizacion_original: fac.tipo_cambio,
        saldo_original: saldoFac,
        cotizacion: opForm.cotizacion,
        saldo: saldoFac - asignar,
        total: fac.total,
        importe: asignar,
      })
      restante -= asignar
    }

    setOpComprobantesDebito(nuevosDebitos)
    const tots = calcOpTotales(opMediosPago, nuevosDebitos, opComprobantesCredito)
    setOpForm(prev => ({
      ...prev,
      importe_a_cuenta: tots.aCuenta,
      importe_no_conciliado: tots.noConciliado,
    }))
  }

  // Lógica core de guardado sin manejo de opSaving ni abrirFichaOP
  const _guardarOPCore = async (): Promise<OrdenPago | null> => {
    if (!opForm.proveedor_id || typeof opForm.proveedor_id !== "number" || opForm.proveedor_id <= 0) {
      alert("Debe seleccionar un proveedor válido antes de guardar la Orden de Pago.")
      return null
    }
    const payload = {
      ...opForm,
      medios_pago: opMediosPago.map(({ id: _id, ...rest }) => rest),
      comprobantes: [
        ...opComprobantesDebito.map(({ id: _id, ...rest }) => rest),
        ...opComprobantesCredito.map(({ id: _id, ...rest }) => rest),
      ],
    }
    const saved = await guardarOrdenPago(payload, selectedOP?.id)
    const [all, detalle] = await Promise.all([
      fetchOrdenesPago(),
      fetchOrdenPagoDetalle(String(saved.id)),
    ])
    setOrdenesPago(all)
    return detalle as OrdenPago
  }

  const guardarOPCompleta = async (): Promise<OrdenPago | null> => {
    try {
      setOpSaving(true)
      const detalle = await _guardarOPCore()
      if (detalle) abrirFichaOP(detalle as OrdenPago)
      return detalle
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al guardar OP")
      return null
    } finally {
      setOpSaving(false)
    }
  }

  const confirmarOPAction = async () => {
    if (opSaving) return
    try {
      setOpSaving(true)
      const opGuardada = await _guardarOPCore()
      if (!opGuardada?.id) return
      const resConfirmar = await confirmarOrdenPagoAPI(String(opGuardada.id))
      const [all, detalle] = await Promise.all([
        fetchOrdenesPago(),
        fetchOrdenPagoDetalle(String(opGuardada.id)),
      ])
      setOrdenesPago(all)
      if (detalle) abrirFichaOP(detalle as OrdenPago)
      if (resConfirmar?.aviso_asiento) {
        alert(`⚠️ ${resConfirmar.aviso_asiento}`)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al confirmar OP")
    } finally {
      setOpSaving(false)
    }
  }

  const cancelarOPAction = async () => {
    if (!selectedOP) return
    try {
      setOpSaving(true)
      await cancelarOrdenPagoAPI(selectedOP.id)
      const all = await fetchOrdenesPago()
      setOrdenesPago(all)
      const opActualizada = all.find((o: OrdenPago) => o.id === selectedOP.id)
      if (opActualizada) abrirFichaOP(opActualizada)
      setOpModalCancelacion(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al cancelar OP")
    } finally {
      setOpSaving(false)
    }
  }

  const eliminarOPAction = async () => {
    if (!selectedOP) return
    if (!confirm("¿Eliminar esta orden de pago en borrador?")) return
    try {
      await eliminarOrdenPago(selectedOP.id)
      const all = await fetchOrdenesPago()
      setOrdenesPago(all)
      setSelectedOP(null)
      setCreandoOP(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al eliminar OP")
    }
  }

  // ---- Ficha OP ----
  const renderFichaOP = () => {
    const editable = (opForm.estado ?? "borrador") === "borrador"
    const estadoColor: Record<string, string> = {
      borrador: "bg-gray-100 text-gray-700",
      publicado: "bg-green-100 text-green-700",
      cancelado: "bg-red-100 text-red-700",
    }
    const estadoLabel: Record<string, string> = {
      borrador: "Borrador",
      publicado: "Publicado",
      cancelado: "Cancelado",
    }

    const tots = calcOpTotales(opMediosPago, opComprobantesDebito, opComprobantesCredito)
    const cajasFiltered = sucursalActiva
      ? cajasDisponibles.filter(c => c.sucursal === sucursalActiva.nombre)
      : cajasDisponibles

    const tabsOP = [
      { key: "info_pago" as const, label: "Información de Pago", count: opMediosPago.length },
      { key: "comprobantes" as const, label: "Comprobantes", count: opComprobantesDebito.length + opComprobantesCredito.length },
      { key: "otra_info" as const, label: "Otra Información", count: null },
      { key: "observaciones" as const, label: "Observaciones", count: null },
      { key: "detalles" as const, label: "Detalles", count: null },
    ]

    const handleCambiarTabOP = async (tab: typeof opTabActivo) => {
      setOpTabActivo(tab)
      if (tab === "detalles" && opAsientos.length === 0 && !opAsientoCargando && selectedOP?.id) {
        setOpAsientoCargando(true)
        try {
          const { asientos } = await fetchAsientoOrdenPago(String(selectedOP.id))
          setOpAsientos(asientos)
        } catch {
          setOpAsientos([])
        } finally {
          setOpAsientoCargando(false)
        }
      }
    }

    return (
      <div>
        {/* Modal popup asiento OP */}
        {opAsientoModalOpen && opAsientoModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Asiento {opAsientoModalItem.numero ?? "S/N"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(opAsientoModalItem.fecha)}
                    {opAsientoModalItem.concepto ? ` · ${opAsientoModalItem.concepto}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => { setOpAsientoModalOpen(false); setOpAsientoModalItem(null) }}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs font-semibold text-gray-500 uppercase">
                      <th className="text-left py-2 pr-4">Cuenta</th>
                      <th className="text-left py-2 pr-4">Descripción</th>
                      <th className="text-right py-2 pr-4">Debe</th>
                      <th className="text-right py-2">Haber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {opAsientoModalItem.lineas.map((linea, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-xs text-gray-800 whitespace-nowrap">
                          <span className="font-semibold">{linea.cuenta_codigo}</span>
                          <span className="text-gray-500 ml-1">— {linea.cuenta_nombre}</span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-500">{linea.descripcion ?? "—"}</td>
                        <td className="py-2 pr-4 text-right font-medium text-gray-800">
                          {linea.debe > 0 ? formatCurrency(linea.debe) : "—"}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-800">
                          {linea.haber > 0 ? formatCurrency(linea.haber) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold text-sm">
                      <td colSpan={2} className="py-2 text-gray-600">Total</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(opAsientoModalItem.lineas.reduce((s, l) => s + l.debe, 0))}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(opAsientoModalItem.lineas.reduce((s, l) => s + l.haber, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => { setOpAsientoModalOpen(false); setOpAsientoModalItem(null) }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
          <button onClick={() => { setSelectedOP(null); setCreandoOP(false) }} className="hover:text-blue-600">Órdenes de Pago</button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{opForm.numero || "Nueva OP"}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={() => { setSelectedOP(null); setCreandoOP(false) }} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-amber-900">{opForm.numero || "Nueva Orden de Pago"}</h1>
              <p className="text-sm text-gray-500">{opForm.fecha ? formatDate(opForm.fecha) : ""} {opForm.proveedor_nombre ? `| ${opForm.proveedor_nombre}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <>
                <button
                  onClick={guardarOPCompleta}
                  disabled={opSaving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
                {(selectedOP || creandoOP) && opForm.proveedor_id && opForm.importe && opForm.importe > 0 && opMediosPago.length > 0 && opForm.caja_id && (
                  <button
                    onClick={confirmarOPAction}
                    disabled={opSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </button>
                )}
                {selectedOP && (
                  <button onClick={eliminarOPAction} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">
                    Eliminar
                  </button>
                )}
              </>
            )}
            {opForm.estado === "publicado" && (
              <>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  onClick={() => setOpModalCancelacion(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                >
                  Cancelar
                </button>
              </>
            )}
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${estadoColor[opForm.estado ?? "borrador"] ?? "bg-gray-100 text-gray-700"}`}>
              {estadoLabel[opForm.estado ?? "borrador"] ?? opForm.estado}
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="bg-white rounded-lg border px-6 py-4 mb-4">
          <div className="flex items-center gap-0">
            {(["borrador", "publicado"] as const).map((step, idx) => {
              const stepLabel = { borrador: "Borrador", publicado: "Publicado" }[step]
              const steps = ["borrador", "publicado"]
              const currentIdx = steps.indexOf(opForm.estado ?? "borrador")
              const isCurrent = opForm.estado === step
              const isDone = currentIdx > idx || opForm.estado === "publicado"
              return (
                <React.Fragment key={step}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      opForm.estado === "cancelado" ? "bg-red-100 text-red-600" :
                      isDone ? "bg-blue-600 text-white" :
                      isCurrent ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {isDone && opForm.estado !== "cancelado" ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-medium ${isCurrent || isDone ? "text-gray-900" : "text-gray-400"}`}>{stepLabel}</span>
                  </div>
                  {idx < 1 && <div className={`flex-1 h-0.5 mx-3 ${isDone ? "bg-blue-400" : "bg-gray-200"}`} />}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Cabecera datos - 2 columnas */}
        <div className="bg-white rounded-lg border p-6 mb-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Sucursal</label>
                {editable ? (
                  <select
                    value={opForm.sucursal_nombre ?? ""}
                    onChange={e => setOpForm(prev => ({ ...prev, sucursal_nombre: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                  </select>
                ) : <p className="font-medium text-sm">{opForm.sucursal_nombre || "-"}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Proveedor</label>
                {editable ? (
                  <ProveedorSelector
                    value={opForm.proveedor_id ?? null}
                    onChange={(id, nombre) => {
                      setOpForm(prev => ({ ...prev, proveedor_id: id, proveedor_nombre: nombre }))
                      if (id) {
                        setOpOCsProveedor(ordenesCompra.filter(oc => oc.proveedor_id === id).map(oc => ({ id: oc.id, numero: oc.numero })))
                      }
                    }}
                    proveedores={proveedores}
                  />
                ) : <p className="font-medium text-sm">{opForm.proveedor_nombre || "-"}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Importe</label>
                <p className="font-medium text-sm text-lg">{formatCurrency(tots.totalMedios, opForm.moneda as string || "ARS")}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Importe no Conciliado</label>
                <p className={`font-medium text-sm ${tots.noConciliado > 0 ? "text-amber-600" : "text-gray-600"}`}>
                  {formatCurrency(Math.abs(tots.noConciliado), opForm.moneda as string || "ARS")}
                </p>
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Fecha</label>
                {editable ? (
                  <input
                    type="date"
                    value={opForm.fecha ?? ""}
                    onChange={e => setOpForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                ) : <p className="font-medium text-sm">{opForm.fecha ? formatDate(opForm.fecha) : "-"}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Caja</label>
                {editable ? (
                  <select
                    value={opForm.caja_id ?? ""}
                    onChange={e => {
                      const caja = cajasFiltered.find(c => c.id === e.target.value)
                      setOpForm(prev => ({ ...prev, caja_id: e.target.value, caja_nombre: caja?.nombre ?? "" }))
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Seleccionar caja...</option>
                    {cajasFiltered.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                ) : <p className="font-medium text-sm">{opForm.caja_nombre || "-"}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Importe a Cuenta</label>
                <p className="font-medium text-sm text-emerald-600">{formatCurrency(tots.aCuenta, opForm.moneda as string || "ARS")}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Concepto</label>
                {editable ? (
                  <input
                    value={opForm.concepto ?? ""}
                    onChange={e => setOpForm(prev => ({ ...prev, concepto: e.target.value }))}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    placeholder="Descripción del pago..."
                  />
                ) : <p className="font-medium text-sm">{opForm.concepto || "-"}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Orden de Compra</label>
                {editable ? (
                  <select
                    value={opForm.orden_compra_id ?? ""}
                    onChange={e => {
                      const oc = opOCsProveedor.find(o => o.id === Number(e.target.value))
                      setOpForm(prev => ({ ...prev, orden_compra_id: oc ? oc.id : undefined, orden_compra_numero: oc?.numero }))
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Sin OC vinculada</option>
                    {opOCsProveedor.map(oc => <option key={oc.id} value={oc.id}>{oc.numero}</option>)}
                  </select>
                ) : <p className="font-medium text-sm">{opForm.orden_compra_numero || "-"}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex border-b">
            {tabsOP.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleCambiarTabOP(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  opTabActivo === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count !== null && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="p-4">
            {/* TAB INFORMACIÓN DE PAGO */}
            {opTabActivo === "info_pago" && (
              <div className="space-y-3">
                {editable && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpModalMedioPago(true)}
                      className="bg-indigo-900 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />Añadir un elemento
                    </button>
                  </div>
                )}
                {opMediosPago.length > 0 ? (
                  <div className="space-y-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-gray-500">
                          <th className="py-2 px-3">Nombre (valor)</th>
                          <th className="text-right py-2 px-3">Imp. Comp.</th>
                          <th className="py-2 px-3">Mon. Comp.</th>
                          <th className="text-right py-2 px-3">Importe</th>
                          <th className="py-2 px-3">Moneda</th>
                          {editable && <th className="w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {opMediosPago.map((mp, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-1.5 px-3">{mp.nombre || mp.forma_pago_nombre || "-"}</td>
                            <td className="text-right px-3">{formatCurrency(mp.importe_comp, mp.moneda_comp || "ARS")}</td>
                            <td className="px-3">{mp.moneda_comp || opForm.moneda || "ARS"}</td>
                            <td className="text-right px-3 font-medium">{formatCurrency(mp.importe, mp.moneda || "ARS")}</td>
                            <td className="px-3">{mp.moneda}</td>
                            {editable && (
                              <td className="text-center">
                                <button
                                  onClick={() => {
                                    const nuevosMedios = opMediosPago.filter((_, i) => i !== idx)
                                    setOpMediosPago(nuevosMedios)
                                    const t = calcOpTotales(nuevosMedios, opComprobantesDebito, opComprobantesCredito)
                                    setOpForm(prev => ({ ...prev, importe: t.totalMedios, importe_a_cuenta: t.aCuenta, importe_no_conciliado: t.noConciliado }))
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Resumen de totales */}
                    {(() => {
                      const totalARS = opMediosPago.filter(m => m.moneda !== "USD").reduce((s, m) => s + (m.importe || 0), 0)
                      const totalUSD = opMediosPago.filter(m => m.moneda === "USD").reduce((s, m) => s + (m.importe || 0), 0)
                      const hasMixed = totalARS > 0 && totalUSD > 0
                      const fmt = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      if (!hasMixed) {
                        return (
                          <div className="flex justify-end pt-2 border-t">
                            <span className="text-sm font-semibold text-gray-800">
                              Total:&nbsp;
                              {totalUSD > 0 ? `USD ${fmt(totalUSD)}` : `$ ${fmt(totalARS)}`}
                            </span>
                          </div>
                        )
                      }
                      // Derivar cotización desde el importe_comp del primer medio USD
                      const primerUSD = opMediosPago.find(m => m.moneda === "USD")
                      const cotiz = primerUSD?.cotizacion
                        ?? (primerUSD && primerUSD.importe > 0 ? primerUSD.importe_comp / primerUSD.importe : 1)
                      const totalEnARS = Math.round((totalARS + totalUSD * cotiz) * 100) / 100
                      const totalEnUSD = cotiz > 0 ? Math.round((totalUSD + totalARS / cotiz) * 100) / 100 : totalUSD
                      return (
                        <div className="flex justify-end">
                          <div className="bg-gray-50 rounded-lg border border-gray-200 text-sm overflow-hidden min-w-[280px]">
                            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200">
                              <span className="text-gray-500">Efectivo / ARS</span>
                              <span className="font-medium text-gray-800">$ {fmt(totalARS)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2 border-b border-dashed border-gray-200">
                              <span className="text-gray-500">Dólares</span>
                              <span className="font-medium text-gray-800">USD {fmt(totalUSD)}</span>
                            </div>
                            <div className="px-4 py-1.5 text-xs text-gray-400 text-center border-b border-gray-100">
                              TC 1 USD = $ {fmt(cotiz)}
                            </div>
                            <div className="flex justify-between items-center px-4 py-2 bg-indigo-50">
                              <span className="font-semibold text-gray-700">Total en ARS</span>
                              <span className="font-bold text-indigo-900">$ {fmt(totalEnARS)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2 bg-indigo-50 border-t border-indigo-100">
                              <span className="font-semibold text-gray-700">Total en USD</span>
                              <span className="font-bold text-indigo-900">USD {fmt(totalEnUSD)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-6 text-center">No hay medios de pago agregados.</p>
                )}
              </div>
            )}

            {/* TAB COMPROBANTES */}
            {opTabActivo === "comprobantes" && (
              <div className="space-y-6">
                {/* DÉBITOS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Débitos (Facturas a pagar)</h3>
                    {editable && opForm.proveedor_id && (
                      <button
                        onClick={asignarPagosAFacturas}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Asignar pagos a las facturas
                      </button>
                    )}
                  </div>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-xs font-semibold text-gray-600 uppercase">
                        <th className="text-left py-2 px-3">Referencia</th>
                        <th className="text-left py-2 px-3">Fecha</th>
                        <th className="text-left py-2 px-3">Vencimiento</th>
                        <th className="text-right py-2 px-3">Saldo Orig.</th>
                        <th className="text-right py-2 px-3">Total</th>
                        <th className="text-right py-2 px-3">Importe</th>
                        <th className="text-right py-2 px-3">Saldo</th>
                        {editable && <th className="w-10"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {opComprobantesDebito.map((comp, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-sm text-blue-600 font-medium">{comp.referencia}</td>
                          <td className="py-2 px-3 text-sm">{comp.fecha ? formatDate(comp.fecha) : "-"}</td>
                          <td className="py-2 px-3 text-sm">{comp.vencimiento ? formatDate(comp.vencimiento) : "-"}</td>
                          <td className="py-2 px-3 text-sm text-right">{formatCurrency(comp.saldo_original, comp.moneda_comp || "ARS")}</td>
                          <td className="py-2 px-3 text-sm text-right">{formatCurrency(comp.total, comp.moneda_comp || "ARS")}</td>
                          <td className="py-2 px-3 text-sm text-right">
                            {editable ? (
                              <input
                                type="number"
                                value={comp.importe}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0
                                  const newDebitos = [...opComprobantesDebito]
                                  newDebitos[idx] = { ...newDebitos[idx], importe: val, saldo: newDebitos[idx].saldo_original - val }
                                  setOpComprobantesDebito(newDebitos)
                                  const t = calcOpTotales(opMediosPago, newDebitos, opComprobantesCredito)
                                  setOpForm(prev => ({ ...prev, importe_a_cuenta: t.aCuenta, importe_no_conciliado: t.noConciliado }))
                                }}
                                className="w-24 border rounded px-2 py-1 text-sm text-right"
                                min="0"
                                max={comp.saldo_original}
                              />
                            ) : (
                              <span className="font-medium">{formatCurrency(comp.importe, comp.moneda_comp || "ARS")}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-sm text-right">{formatCurrency(comp.saldo, comp.moneda_comp || "ARS")}</td>
                          {editable && (
                            <td className="py-2 px-3">
                              <button
                                onClick={() => {
                                  const newD = opComprobantesDebito.filter((_, i) => i !== idx)
                                  setOpComprobantesDebito(newD)
                                  const t = calcOpTotales(opMediosPago, newD, opComprobantesCredito)
                                  setOpForm(prev => ({ ...prev, importe_a_cuenta: t.aCuenta, importe_no_conciliado: t.noConciliado }))
                                }}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {opComprobantesDebito.length === 0 && (
                        <tr><td colSpan={8} className="py-4 text-center text-gray-400 text-sm">Sin facturas asignadas</td></tr>
                      )}
                    </tbody>
                    {opComprobantesDebito.length > 0 && (
                      <tfoot className="bg-gray-50 font-semibold text-sm">
                        <tr>
                          <td colSpan={5} className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(tots.totalDebitos)}</td>
                          <td></td>
                          {editable && <td></td>}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* CRÉDITOS */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Créditos (Notas de Crédito)</h3>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-xs font-semibold text-gray-600 uppercase">
                        <th className="text-left py-2 px-3">Referencia</th>
                        <th className="text-left py-2 px-3">Fecha</th>
                        <th className="text-right py-2 px-3">Total</th>
                        <th className="text-right py-2 px-3">Importe</th>
                        {editable && <th className="w-10"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {opComprobantesCredito.map((comp, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-sm text-green-600 font-medium">{comp.referencia}</td>
                          <td className="py-2 px-3 text-sm">{comp.fecha ? formatDate(comp.fecha) : "-"}</td>
                          <td className="py-2 px-3 text-sm text-right">{formatCurrency(comp.total, comp.moneda_comp || "ARS")}</td>
                          <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(comp.importe, comp.moneda_comp || "ARS")}</td>
                          {editable && (
                            <td className="py-2 px-3">
                              <button
                                onClick={() => {
                                  const newC = opComprobantesCredito.filter((_, i) => i !== idx)
                                  setOpComprobantesCredito(newC)
                                  const t = calcOpTotales(opMediosPago, opComprobantesDebito, newC)
                                  setOpForm(prev => ({ ...prev, importe_a_cuenta: t.aCuenta, importe_no_conciliado: t.noConciliado }))
                                }}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {opComprobantesCredito.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-400 text-sm">Sin notas de crédito aplicadas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB OTRA INFORMACIÓN */}
            {opTabActivo === "otra_info" && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Periodo</p>
                  <p className="font-medium">{opForm.periodo || (opForm.fecha ? `${String(new Date(opForm.fecha).getMonth()+1).padStart(2,"0")}/${new Date(opForm.fecha).getFullYear()}` : "-")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Diario</p>
                  <p className="font-medium">Compras ({opForm.moneda || "ARS"})</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Creado por</p>
                  <p className="font-medium">{opForm.created_by || "-"}</p>
                </div>
              </div>
            )}

            {/* TAB OBSERVACIONES */}
            {opTabActivo === "observaciones" && (
              <div>
                {editable ? (
                  <textarea
                    value={opForm.observaciones ?? ""}
                    onChange={e => setOpForm(prev => ({ ...prev, observaciones: e.target.value }))}
                    rows={6}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Observaciones de la orden de pago..."
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{opForm.observaciones || "Sin observaciones"}</p>
                )}
              </div>
            )}

            {/* TAB DETALLES (Asientos contables) */}
            {opTabActivo === "detalles" && (
              <div>
                {opAsientoCargando ? (
                  <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                    Cargando asientos contables...
                  </div>
                ) : opAsientos.length === 0 ? (
                  <div className="bg-white rounded-lg border p-8 text-center">
                    <p className="text-gray-400 text-sm">
                      {opForm.estado === "borrador"
                        ? "Esta orden de pago aún no tiene asiento contable. Confirmala para generarlo."
                        : "No se encontró asiento contable para esta orden de pago."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opAsientos.map((asiento) => (
                      <div key={asiento.id} className="bg-white rounded-lg border overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Asiento Contable</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            asiento.estado === "publicado" ? "bg-green-100 text-green-700" :
                            asiento.estado === "cancelado" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {asiento.estado === "publicado" ? "Publicado" : asiento.estado === "cancelado" ? "Cancelado" : asiento.estado}
                          </span>
                        </div>
                        <button
                          onClick={() => { setOpAsientoModalItem(asiento); setOpAsientoModalOpen(true) }}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50 transition-colors group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-indigo-900 group-hover:text-indigo-700">
                                {asiento.numero ?? "Asiento S/N"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(asiento.fecha)}
                                {asiento.concepto ? ` · ${asiento.concepto}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 group-hover:text-indigo-600">
                            <span>{asiento.lineas.length} líneas</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODAL CANCELACIÓN */}
        {opModalCancelacion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cancelar Orden de Pago</h3>
              <p className="text-sm text-gray-600 mb-4">
                ¿Confirmar cancelación de la OP {opForm.numero}? Esta acción revierte todos los movimientos de caja y restaura los saldos de facturas.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpModalCancelacion(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                  No, volver
                </button>
                <button
                  onClick={cancelarOPAction}
                  disabled={opSaving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Sí, cancelar OP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Lista OP ----
  const renderOrdenesPago = () => {
    // OP fue migrado al form modular nuevo en /compras/op. Si llegamos acá
    // (típicamente por un Link viejo o navegación interna del monolito),
    // redirigimos al modular en vez de mostrar el form viejo (en deprecación).
    return <OrdenesPagoRedirect router={router} />
    // Code legacy debajo queda inalcanzable pero lo dejamos por si necesitamos rollback.
    // eslint-disable-next-line no-unreachable
    if (selectedOP || creandoOP) return renderFichaOP()

    return (
      <ComprasListSection
        title="Órdenes de Pago"
        subtitle="Gestione los pagos a proveedores"
        moduleName="ordenes_pago"
        data={ordenesPago as (OrdenPago & Record<string, unknown>)[]}
        searchFields={["numero", "proveedor_nombre"]}
        filterFields={[
          { field: "estado", label: "Estado" },
          { field: "moneda", label: "Moneda" },
          { field: "sucursal_nombre", label: "Sucursal" },
        ]}
        actions={
          <button
            onClick={initNuevaOP}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800"
          >
            <Plus className="w-4 h-4" /> Nueva OP
          </button>
        }
      >
        {(filtered) => (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Total Órdenes</p>
                <p className="text-2xl font-bold text-gray-900">{ordenesPago.length}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Publicadas</p>
                <p className="text-2xl font-bold text-emerald-600">{ordenesPago.filter(o => o.estado === "publicado").length}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Borrador</p>
                <p className="text-2xl font-bold text-gray-600">{ordenesPago.filter(o => o.estado === "borrador").length}</p>
              </div>
              <div className="bg-white rounded-lg border p-4">
                <p className="text-sm text-gray-500">Total Pagado</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(ordenesPago.filter(o => o.estado === "publicado").reduce((s, o) => s + (o.importe || 0), 0))}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs font-semibold text-gray-600 uppercase">
                    <th className="text-left py-3 px-4">Número</th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-left py-3 px-4">Sucursal</th>
                    <th className="text-left py-3 px-4">Caja</th>
                    <th className="text-center py-3 px-4">Moneda</th>
                    <th className="text-right py-3 px-4">Importe</th>
                    <th className="text-center py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(op => (
                    <tr
                      key={op.id}
                      onClick={() => abrirFichaOP(op as unknown as OrdenPago)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium text-emerald-700">{op.numero}</td>
                      <td className="py-3 px-4 text-sm">{op.fecha ? new Date(op.fecha).toLocaleDateString("es-AR") : "-"}</td>
                      <td className="py-3 px-4 text-sm">{op.proveedor_nombre}</td>
                      <td className="py-3 px-4 text-sm">{(op as unknown as OrdenPago).sucursal_nombre || "-"}</td>
                      <td className="py-3 px-4 text-sm">{(op as unknown as OrdenPago).caja_nombre || "-"}</td>
                      <td className="py-3 px-4 text-sm text-center">{(op as unknown as OrdenPago).moneda}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency((op as unknown as OrdenPago).importe || 0)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          op.estado === "publicado" ? "bg-green-100 text-green-700" :
                          op.estado === "cancelado" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {op.estado === "publicado" ? "Publicado" : op.estado === "cancelado" ? "Cancelado" : "Borrador"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">No hay órdenes de pago</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ComprasListSection>
    )
  }

  // =====================================================
  // RENDER CTA CTE PROVEEDORES
  // =====================================================
  const renderCtaCteProveedores = () => {
    const movimientosMock: { id: number; fecha: string; proveedor: string; tipo: string; numero: string; debe: number; haber: number }[] = []

    return (
      <ComprasListSection
        title="Cuenta Corriente Proveedores"
        subtitle="Movimientos de cuenta corriente con proveedores"
        moduleName="cta_cte_proveedores"
        data={movimientosMock}
        searchFields={["proveedor", "numero", "tipo"]}
        filterFields={[{ field: "tipo", label: "Tipo" }]}
      >
        {(filtered) => (
          <>
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
              {filtered.map(mov => (
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
          </>
        )}
      </ComprasListSection>
    )
  }

  // =====================================================
  // RENDER TIPOS DE GASTO
  // =====================================================
  const renderTiposGasto = () => {
    const tiposGastoMock: { id: number; codigo: string; nombre: string; activa_costo: boolean; criterio_distribucion: string }[] = []

    return (
      <ComprasListSection
        title="Tipos de Gasto de Importación"
        subtitle="Configure los tipos de gastos para importaciones"
        moduleName="tipos_gasto"
        data={tiposGastoMock}
        searchFields={["codigo", "nombre"]}
        filterFields={[{ field: "criterio_distribucion", label: "Criterio Distribución" }]}
        actions={
          <button className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nuevo Tipo
          </button>
        }
      >
        {(filtered) => (
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
              {filtered.map(tipo => (
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
        )}
      </ComprasListSection>
    )
  }

  // =====================================================
  // RENDER CATEGORÍAS PROVEEDORES
  // =====================================================
  const renderCatProveedores = () => {
    const cat = nuevaCatProv
    const setCat = (patch: Partial<typeof cat>) => setNuevaCatProv(prev => ({ ...prev, ...patch }))

    const CUENTAS_COBRAR = ["1.1.1 - Clientes", "1.1.2 - Documentos a Cobrar", "1.1.3 - Cheques en Cartera"]

    const handleGuardarCat = async () => {
      if (!cat.nombre.trim()) return
      setCatGuardando(true)
      setCatError(null)
      const payload = {
        nombre: cat.nombre,
        disponible_clientes: cat.disponible_clientes,
        disponible_proveedores: cat.disponible_proveedores,
        tipo_control: cat.tipo_control,
        cuenta_cobrar_defecto: cat.cuenta_cobrar_defecto,
        cuenta_pagar_defecto: cat.cuenta_pagar_defecto,
        cuenta_pagar_id: cat.cuenta_pagar_id ?? null,
        requiere_oc_para_facturar: cat.requiere_oc_para_facturar,
        comprobantes_confidenciales: cat.comprobantes_confidenciales,
      }
      try {
        const supabase = createSupabaseClient()
        let catId: number
        if (selectedCatProv) {
          const updated = await updateCategoriaProveedor(selectedCatProv.id, payload)
          catId = selectedCatProv.id
          setCategoriasProveedor(prev => prev.map(c =>
            c.id === selectedCatProv.id
              ? { ...c, ...updated, tipo_control: updated.tipo_control as CategoriaProveedor["tipo_control"], listas_precios: c.listas_precios,
                  cuenta_pagar_id: updated.cuenta_pagar_id ?? null,
                  cuenta_pagar_codigo: cat.cuenta_pagar_codigo,
                  cuenta_pagar_nombre: cat.cuenta_pagar_nombre,
                  cuentas_permitidas: cat.cuentas_permitidas }
              : c
          ))
          setSelectedCatProv(null)
        } else {
          const created = await createCategoriaProveedor(payload)
          catId = created.id
          setCategoriasProveedor(prev => [...prev, {
            id: created.id,
            nombre: created.nombre,
            disponible_clientes: created.disponible_clientes,
            disponible_proveedores: created.disponible_proveedores,
            tipo_control: created.tipo_control as CategoriaProveedor["tipo_control"],
            cuenta_cobrar_defecto: created.cuenta_cobrar_defecto,
            cuenta_pagar_defecto: created.cuenta_pagar_defecto,
            cuenta_pagar_id: created.cuenta_pagar_id ?? null,
            cuenta_pagar_codigo: cat.cuenta_pagar_codigo,
            cuenta_pagar_nombre: cat.cuenta_pagar_nombre,
            requiere_oc_para_facturar: created.requiere_oc_para_facturar,
            comprobantes_confidenciales: created.comprobantes_confidenciales,
            listas_precios: [],
            cuentas_permitidas: cat.cuentas_permitidas,
          }])
        }
        // Sincronizar cuentas_permitidas al pivot categorias_proveedor_cuentas
        await supabase.from("categorias_proveedor_cuentas").delete().eq("categoria_id", catId)
        if (cat.cuentas_permitidas.length > 0) {
          await supabase.from("categorias_proveedor_cuentas").insert(
            cat.cuentas_permitidas.map(cp => ({ categoria_id: catId, cuenta_id: cp.id }))
          )
        }
        setCreandoCatProv(false)
        setNuevaCatProv(catProvFormVacio)
        setCatProvTabActivo("listas_precios")
      } catch (e: any) {
        setCatError(e.message ?? "Error al guardar la categoría")
      } finally {
        setCatGuardando(false)
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
        cuenta_pagar_id: c.cuenta_pagar_id,
        cuenta_pagar_codigo: c.cuenta_pagar_codigo,
        cuenta_pagar_nombre: c.cuenta_pagar_nombre,
        requiere_oc_para_facturar: c.requiere_oc_para_facturar,
        comprobantes_confidenciales: c.comprobantes_confidenciales,
        listas_precios: c.listas_precios,
        cuentas_permitidas: c.cuentas_permitidas ?? [],
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
                <h1 className="text-2xl font-bold text-amber-900">{c.nombre}</h1>
                <p className="text-sm text-gray-500">Categoría de Proveedor</p>
              </div>
            </div>
            <button
              onClick={() => handleEditar(c)}
              className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1"
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

              {(c.cuenta_cobrar_defecto || c.cuenta_pagar_defecto || c.cuenta_pagar_id) && (
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Cuentas Contables</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {c.cuenta_cobrar_defecto && (
                      <div>
                        <span className="text-gray-500">Cuenta a cobrar por defecto:</span>
                        <span className="ml-2 font-medium">{c.cuenta_cobrar_defecto}</span>
                      </div>
                    )}
                    {c.cuenta_pagar_id ? (
                      <div>
                        <span className="text-gray-500">Cuenta a pagar (contable):</span>
                        <span className="ml-2 font-mono font-medium text-xs">
                          {c.cuenta_pagar_codigo ? `${c.cuenta_pagar_codigo} — ${c.cuenta_pagar_nombre}` : c.cuenta_pagar_id}
                        </span>
                      </div>
                    ) : c.cuenta_pagar_defecto ? (
                      <div>
                        <span className="text-gray-500">Cuenta a pagar por defecto:</span>
                        <span className="ml-2 font-medium">{c.cuenta_pagar_defecto}</span>
                      </div>
                    ) : null}
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
      const cancelar = () => { setCreandoCatProv(false); setSelectedCatProv(null); setNuevaCatProv(catProvFormVacio) }
      return (
        <div className="w-full">
          {/* Breadcrumb */}
          <div className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <button onClick={cancelar} className="hover:text-blue-600">Categorías de Proveedores</button>
            <span>/</span>
            <span className="text-gray-900">{selectedCatProv ? selectedCatProv.nombre : "Nueva"}</span>
          </div>
          {/* Header con botones arriba a la derecha */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <BotonVolver onClick={cancelar} variant="minimal" texto="" />
              <h1 className="text-2xl font-bold text-amber-900">
                {selectedCatProv ? `Editando: ${selectedCatProv.nombre}` : "Nueva Categoría de Proveedor"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={cancelar} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleGuardarCat}
                disabled={!cat.nombre.trim() || catGuardando}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {catGuardando ? "Guardando..." : selectedCatProv ? "Guardar Cambios" : "Crear Categoría"}
              </button>
            </div>
          </div>

          {catError && (
            <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{catError}</div>
          )}

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
            <div className="flex items-center gap-6 px-6 py-5 border-b">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 whitespace-nowrap w-52">Cuenta a pagar (contable)</span>
                <CuentaContableSelector
                  value={cat.cuenta_pagar_id ?? ""}
                  onChange={(id, codigo, nombre) => setCat({ cuenta_pagar_id: id || null, cuenta_pagar_codigo: codigo, cuenta_pagar_nombre: nombre })}
                />
              </div>
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

            {/* Tabs */}
            <div className="flex border-b px-6 pt-2">
              {[
                { id: "cuentas_perm", label: "Cuentas Permitidas para Proveedores" },
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
              {catProvTabActivo !== "cuentas_perm" && (
                <p className="text-sm text-gray-400 py-4 text-center">Sin elementos configurados.</p>
              )}
              {catProvTabActivo === "cuentas_perm" && (
                <div>
                  <p className="text-xs text-gray-500 mb-3">
                    Si configura cuentas aquí, el selector de la factura de compra mostrará <strong>solo estas cuentas</strong> al cargar un proveedor de esta categoría.
                    Si la lista está vacía, se muestran todas las cuentas del plan.
                  </p>
                  <table className="w-full text-sm mb-2">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-gray-600 uppercase">
                        <th className="text-left py-2 px-3">Código</th>
                        <th className="text-left py-2 px-3">Nombre</th>
                        <th className="py-2 px-3 w-8"><Trash2 className="w-3.5 h-3.5 text-gray-400" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.cuentas_permitidas.map((cp, idx) => (
                        <tr key={cp.id} className="border-b">
                          <td className="py-1.5 px-3 font-mono text-xs text-gray-600">{cp.codigo}</td>
                          <td className="py-1.5 px-3 text-gray-800">{cp.nombre}</td>
                          <td className="py-1.5 px-3">
                            <button
                              onClick={() => setNuevaCatProv(prev => ({ ...prev, cuentas_permitidas: prev.cuentas_permitidas.filter((_, i) => i !== idx) }))}
                              className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {cat.cuentas_permitidas.length === 0 && (
                        <tr><td colSpan={3} className="py-3 text-center text-gray-400 text-xs">Sin cuentas configuradas — se mostrarán todas las cuentas del plan.</td></tr>
                      )}
                    </tbody>
                  </table>
                  <div className="mt-2">
                    <CuentaContableSelector
                      value=""
                      onChange={(id, codigo, nombre) => {
                        if (!id || cat.cuentas_permitidas.some(c => c.id === id)) return
                        setNuevaCatProv(prev => ({
                          ...prev,
                          cuentas_permitidas: [...prev.cuentas_permitidas, { id, codigo: codigo ?? "", nombre: nombre ?? "" }],
                        }))
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1">Buscar y seleccionar una cuenta para agregarla a la lista.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )
    }

    // Vista listado
    return (
      <ComprasListSection
        title="Categorías de Proveedores"
        subtitle="Configure las categorías para clasificar sus proveedores"
        moduleName="categorias_proveedores"
        data={categoriasProveedor}
        searchFields={["nombre"]}
        filterFields={[{ field: "tipo_control", label: "Tipo Control" }]}
        actions={
          <button onClick={handleNueva} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800">
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        }
      >
        {(filtered) => (
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
              {filtered.map(c => (
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
        )}
      </ComprasListSection>
    )
  }

  // =====================================================
  // CONCILIACIÓN DE DEUDA - COMPRAS
  // =====================================================

  const cargarHistorialCdcCompras = async (proveedorId: number) => {
    const supabase = createSupabaseClient()
    // 1. Conciliaciones manuales desde conciliaciones_deuda_compras + 2. OPs
    //    confirmadas (que también son conciliaciones — el operador asignó
    //    medios de pago a facturas/NCs). Las OPs se traen en paralelo con
    //    sus comprobantes asignados para mostrar las imputaciones en el historial.
    const [{ data: manualData }, { data: opsData }] = await Promise.all([
      supabase
        .from('conciliaciones_deuda_compras')
        .select('id, fecha, proveedor_id, proveedor_nombre, total_conciliado, usuario, estado, fecha_cancelacion, conciliaciones_deuda_compras_aplicaciones(debito_tipo, debito_numero, credito_tipo, credito_numero, monto, debito_moneda, credito_moneda, cotizacion)')
        .eq('proveedor_id', proveedorId)
        .order('fecha', { ascending: false }),
      supabase
        .from('compras_ordenes_pago')
        .select('id, numero, fecha, proveedor_id, proveedor_nombre, importe, moneda, estado, created_by, compras_op_comprobantes(tipo, factura_id, referencia, importe, moneda_comp, cotizacion)')
        .eq('proveedor_id', proveedorId)
        .eq('estado', 'publicado')
        .order('fecha', { ascending: false }),
    ])

    // Entradas manuales
    const manualEntries = ((manualData ?? []) as any[]).map(c => ({
      id: c.id as number,
      fecha: c.fecha as string,
      proveedor_id: c.proveedor_id as number,
      proveedor_nombre: c.proveedor_nombre as string,
      total_conciliado: c.total_conciliado as number,
      usuario: c.usuario as string,
      estado: c.estado as 'activa' | 'cancelada',
      fecha_cancelacion: c.fecha_cancelacion as string | null,
      aplicaciones: (c.conciliaciones_deuda_compras_aplicaciones ?? []) as any[],
    }))

    // Entradas auto-generadas por OPs confirmadas
    // Modelo: para cada comprobante débito (factura) de la OP, generamos una
    // aplicación {Factura X → OP Y}. Las NCs aplicadas se anotan como
    // entradas extra {NC X → OP Y} para que el operador vea qué créditos
    // del proveedor consumió la OP.
    const opEntries = ((opsData ?? []) as any[])
      .filter(op => Array.isArray(op.compras_op_comprobantes) && op.compras_op_comprobantes.length > 0)
      .map(op => {
        const debitos = (op.compras_op_comprobantes ?? []).filter((c: any) => c.tipo === 'debito')
        const creditos = (op.compras_op_comprobantes ?? []).filter((c: any) => c.tipo === 'credito')
        const aplicaciones = [
          ...debitos.map((c: any) => ({
            debito_tipo: 'Factura',
            debito_numero: c.referencia ?? '',
            credito_tipo: 'OP',
            credito_numero: op.numero,
            monto: Number(c.importe ?? 0),
            debito_moneda: c.moneda_comp ?? 'ARS',
            credito_moneda: op.moneda ?? 'ARS',
            cotizacion: c.cotizacion ?? null,
          })),
          ...creditos.map((c: any) => ({
            debito_tipo: 'NC',
            debito_numero: c.referencia ?? '',
            credito_tipo: 'OP',
            credito_numero: op.numero,
            monto: Number(c.importe ?? 0),
            debito_moneda: c.moneda_comp ?? 'ARS',
            credito_moneda: op.moneda ?? 'ARS',
            cotizacion: c.cotizacion ?? null,
          })),
        ]
        const totalConciliado = aplicaciones.reduce((s, a) => s + a.monto, 0)
        // ID sintético negativo derivado del UUID — único + distinguible de las manuales
        const opIdStr = String(op.id)
        const hashHex = opIdStr.replace(/-/g, '').slice(0, 12) || '0'
        const idNumerico = -Math.abs(parseInt(hashHex, 16))
        return {
          id: idNumerico,
          fecha: op.fecha as string,
          proveedor_id: op.proveedor_id as number,
          proveedor_nombre: op.proveedor_nombre as string,
          total_conciliado: totalConciliado,
          usuario: (op.created_by ?? '') as string,
          estado: 'activa' as const, // OP publicada = conciliación activa. Si se cancela la OP, esto se actualiza.
          fecha_cancelacion: null,
          aplicaciones,
          esOP: true,
          opNumero: op.numero as string,
          opId: opIdStr,
        }
      })

    const loaded = [...manualEntries, ...opEntries].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )
    setCdcHistorial(prev => [...prev.filter(h => h.proveedor_id !== proveedorId), ...loaded])
  }

  const cargarMediosCdcOP = async (proveedorId: number) => {
    const supabase = createSupabaseClient()
    // Query directo a DB para evitar race condition con el estado ordenesPago
    const { data: ops } = await supabase
      .from('compras_ordenes_pago')
      .select('id, importe_no_conciliado_ars, importe_no_conciliado_usd')
      .eq('proveedor_id', proveedorId)
      .eq('estado', 'publicado')
    if (!ops || ops.length === 0) return
    const opIds = ops.map((o: any) => o.id)
    const { data: medios } = await supabase
      .from('compras_op_medios_pago')
      .select('op_id, moneda, importe, importe_comp')
      .in('op_id', opIds)
    if (!medios) return
    const byOP: Record<string, {moneda: string; importe: number; importe_comp: number}[]> = {}
    for (const m of medios as any[]) {
      if (!byOP[m.op_id]) byOP[m.op_id] = []
      byOP[m.op_id].push({ moneda: m.moneda || 'ARS', importe: Number(m.importe), importe_comp: Number(m.importe_comp ?? m.importe) })
    }
    setCdcMediosPorOP(prev => ({ ...prev, ...byOP }))
    // Actualizar las columnas per-currency en el estado de ordenesPago
    setOrdenesPago(prev => prev.map(o => {
      const dbOp = ops.find((dbO: any) => dbO.id === o.id)
      if (!dbOp) return o
      return {
        ...o,
        importe_no_conciliado_ars: dbOp.importe_no_conciliado_ars,
        importe_no_conciliado_usd: dbOp.importe_no_conciliado_usd,
      }
    }))
  }

  const confirmarConciliacionCompras = async () => {
    if (cdcEjecutando) return
    if (cdcSelDebitos.length === 0 || cdcSelCreditos.length === 0) { alert('Seleccioná al menos un débito y un crédito.'); return }
    const proveedor = proveedores.find(p => p.id === cdcProveedorId)
    if (!proveedor) return
    const hayMixto = (cdcSelDebitos.some(d => d.moneda === 'ARS') && cdcSelCreditos.some(c => c.moneda === 'USD')) ||
                     (cdcSelDebitos.some(d => d.moneda === 'USD') && cdcSelCreditos.some(c => c.moneda === 'ARS'))
    if (hayMixto && cdcCotizacion <= 0) { alert('Para conciliar entre monedas distintas ingresá la cotización.'); return }
    setCdcEjecutando(true)
    try {
      const supabase = createSupabaseClient()
      const aplicaciones: {debito_tipo: string; debito_numero: string; credito_tipo: string; credito_numero: string; monto: number; debito_moneda: string; credito_moneda: string; cotizacion?: number}[] = []
      const debitosWork = cdcSelDebitos.map(d => ({ ...d, restante: d.montoAplicar }))
      const creditosWork = cdcSelCreditos.map(c => ({ ...c, restante: c.montoAplicar }))
      const facturaUpdates: {id: number; saldoNuevo: number}[] = []
      const opUpdates: {id: string; importeNuevo: number; noConcARS?: number; noConcUSD?: number}[] = []
      const ncUpdates: {id: number; saldoNuevo: number}[] = []
      for (const d of debitosWork) {
        if (d.restante <= 0) continue
        const factura = facturasCompra.find(f => f.id === d.id)
        if (!factura) continue
        for (const c of creditosWork) {
          if (c.restante <= 0) continue
          let montoAplicar = 0
          if (d.moneda === c.moneda) {
            montoAplicar = Math.min(d.restante, c.restante)
          } else if (cdcCotizacion > 0) {
            if (d.moneda === 'ARS' && c.moneda === 'USD') montoAplicar = Math.min(d.restante, c.restante * cdcCotizacion)
            else if (d.moneda === 'USD' && c.moneda === 'ARS') montoAplicar = Math.min(d.restante * cdcCotizacion, c.restante)
          }
          if (montoAplicar <= 0) continue
          const opSel = c.tipo === 'op' ? ordenesPago.find(o => o.id === c.id) : null
          const ncSel = c.tipo === 'nc' ? notasCreditoCompra.find(n => n.id === c.id) : null
          const montoRegistrado = d.moneda === c.moneda ? montoAplicar : d.moneda === 'USD' ? montoAplicar / cdcCotizacion : montoAplicar
          aplicaciones.push({
            debito_tipo: `FC ${factura.tipo}`, debito_numero: factura.numero,
            credito_tipo: c.tipo === 'op' ? 'OP' : `NC ${ncSel?.tipo ?? ''}`.trim(),
            credito_numero: opSel?.numero ?? ncSel?.numero ?? String(c.id),
            monto: montoRegistrado,
            debito_moneda: d.moneda,
            credito_moneda: c.moneda,
            cotizacion: d.moneda !== c.moneda && cdcCotizacion > 0 ? cdcCotizacion : undefined,
          })
          if (d.moneda === c.moneda) { d.restante -= montoAplicar; c.restante -= montoAplicar }
          else if (d.moneda === 'ARS') { d.restante -= montoAplicar; c.restante -= montoAplicar / cdcCotizacion }
          else { d.restante -= montoAplicar / cdcCotizacion; c.restante -= montoAplicar }
        }
        facturaUpdates.push({ id: d.id, saldoNuevo: Math.max(0, factura.saldo - (d.montoAplicar - d.restante)) })
      }
      for (const c of creditosWork) {
        const reduccion = c.montoAplicar - c.restante
        if (reduccion <= 0) continue
        if (c.tipo === 'op') {
          const op = ordenesPago.find(o => o.id === c.id)
          if (op) {
            const mediosOP = cdcMediosPorOP[op.id] ?? []
            const usdM = mediosOP.filter(m => m.moneda === 'USD')
            const usdTotal = usdM.reduce((s, m) => s + m.importe, 0)
            const usdTotalARS = usdM.reduce((s, m) => s + (m.importe_comp || 0), 0)
            const cotiz = usdTotal > 0 ? usdTotalARS / usdTotal : 1
            let reduccionARS = reduccion
            let noConcARS: number | undefined
            let noConcUSD: number | undefined
            if (c.moneda === 'USD') {
              reduccionARS = reduccion * cotiz
              noConcUSD = Math.max(0, (op.importe_no_conciliado_usd ?? usdTotal) - reduccion)
              noConcARS = op.importe_no_conciliado_ars ?? undefined
            } else {
              // ARS credit
              noConcARS = Math.max(0, (op.importe_no_conciliado_ars ?? (mediosOP.filter(m => !m.moneda || m.moneda === 'ARS').reduce((s, m) => s + (m.importe_comp || m.importe), 0))) - reduccion)
              noConcUSD = op.importe_no_conciliado_usd ?? undefined
            }
            opUpdates.push({ id: op.id, importeNuevo: Math.max(0, (op.importe_no_conciliado ?? op.importe) - reduccionARS), noConcARS, noConcUSD })
          }
        } else { const nc = notasCreditoCompra.find(n => n.id === c.id); if (nc) ncUpdates.push({ id: nc.id, saldoNuevo: Math.max(0, (nc.saldo_disponible ?? nc.total) - reduccion) }) }
      }
      if (aplicaciones.length === 0) { alert('No se encontraron pares válidos.'); return }
      for (const u of facturaUpdates) {
        const total = facturasCompra.find(f => f.id === u.id)?.total ?? 0
        const estado = u.saldoNuevo <= 0.01 ? 'pagada' : u.saldoNuevo < total ? 'pagada_parcial' : 'pendiente'
        const { error } = await supabase.from('facturas_compra').update({ saldo: u.saldoNuevo, estado }).eq('id', u.id)
        if (error) { alert('Error al actualizar factura: ' + error.message); return }
      }
      for (const u of opUpdates) {
        const updateData: any = { importe_no_conciliado: u.importeNuevo }
        if (u.noConcARS !== undefined) updateData.importe_no_conciliado_ars = u.noConcARS
        if (u.noConcUSD !== undefined) updateData.importe_no_conciliado_usd = u.noConcUSD
        await supabase.from('compras_ordenes_pago').update(updateData).eq('id', u.id)
      }
      for (const u of ncUpdates) {
        const estado = u.saldoNuevo <= 0.01 ? 'aplicada' : 'confirmada'
        await supabase.from('notas_credito_compra').update({ saldo_disponible: u.saldoNuevo, estado }).eq('id', u.id)
      }
      for (const u of facturaUpdates) {
        const total = facturasCompra.find(f => f.id === u.id)?.total ?? 0
        const estado = u.saldoNuevo <= 0.01 ? 'pagada' as const : u.saldoNuevo < total ? 'pagada_parcial' as const : 'pendiente' as const
        setFacturasCompra(prev => prev.map(f => f.id === u.id ? { ...f, saldo: u.saldoNuevo, estado } : f))
      }
      for (const u of opUpdates) setOrdenesPago(prev => prev.map(o => o.id === u.id ? { ...o, importe_no_conciliado: u.importeNuevo, ...(u.noConcARS !== undefined ? { importe_no_conciliado_ars: u.noConcARS } : {}), ...(u.noConcUSD !== undefined ? { importe_no_conciliado_usd: u.noConcUSD } : {}) } : o))
      for (const u of ncUpdates) {
        const estado = u.saldoNuevo <= 0.01 ? 'aplicada' as const : 'confirmada' as const
        setNotasCreditoCompra(prev => prev.map(n => n.id === u.id ? { ...n, saldo_disponible: u.saldoNuevo, estado } : n))
      }
      const totalConciliado = aplicaciones.reduce((s, a) => {
        const factura = facturasCompra.find(f => f.numero === a.debito_numero)
        if (factura?.moneda === 'USD') {
          // Buscar cotizacion de la OP o NC para convertir a ARS
          const cred = creditosWork.find(c => (c.tipo === 'op' ? ordenesPago.find(o => o.id === c.id)?.numero : notasCreditoCompra.find(n => n.id === c.id)?.numero) === a.credito_numero)
          if (cred?.tipo === 'op') {
            const mediosOP = cdcMediosPorOP[cred.id as string] ?? []
            const usdM = mediosOP.filter(m => m.moneda === 'USD')
            const usdTotal = usdM.reduce((acc, m) => acc + m.importe, 0)
            const usdTotalARS = usdM.reduce((acc, m) => acc + (m.importe_comp || 0), 0)
            const cotiz = usdTotal > 0 ? usdTotalARS / usdTotal : (cdcCotizacion || 1)
            return s + a.monto * cotiz
          }
          return s + a.monto * (cdcCotizacion || 1)
        }
        return s + a.monto
      }, 0)
      const { data: nuevaConc, error: concErr } = await supabase
        .from('conciliaciones_deuda_compras')
        .insert({ fecha: new Date().toISOString(), proveedor_id: proveedor.id, proveedor_nombre: proveedor.nombre, total_conciliado: totalConciliado, usuario: currentUser?.nombre || 'Admin', sucursal_id: sucursalActiva?.id ?? null })
        .select('id').single()
      if (concErr) { alert('Error al guardar historial: ' + concErr.message); return }
      await supabase.from('conciliaciones_deuda_compras_aplicaciones').insert(aplicaciones.map(a => ({ conciliacion_id: nuevaConc.id, ...a })))
      setCdcHistorial(prev => [{ id: nuevaConc.id, fecha: new Date().toISOString(), proveedor_id: proveedor.id, proveedor_nombre: proveedor.nombre, total_conciliado: totalConciliado, usuario: currentUser?.nombre || 'Admin', estado: 'activa', fecha_cancelacion: null, aplicaciones }, ...prev.filter(h => h.id !== nuevaConc.id)])
    } catch (err) { alert('Error inesperado: ' + (err as Error).message) }
    finally { setCdcEjecutando(false); setCdcSelDebitos([]); setCdcSelCreditos([]) }
  }

  // Cancela una OP desde el historial de conciliación (cuando la entrada es esOP=true).
  // Llama al endpoint /cancelar que revierte movimientos, saldos y asiento contable.
  const cancelarOPDesdeHistorial = async (opId: string) => {
    const motivo = prompt("Motivo de la cancelación (obligatorio):", "Revertido desde Conciliación de Deuda")
    if (!motivo?.trim()) return
    try {
      const res = await fetch(`/api/compras/ordenes-pago/${opId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      })
      if (!res.ok) {
        const text = await res.text()
        alert(`Error al cancelar la OP: ${text}`)
        return
      }
      // Refrescar el historial del proveedor actual
      if (cdcProveedorId) await cargarHistorialCdcCompras(cdcProveedorId)
      alert("OP cancelada y conciliación revertida.")
    } catch (e: any) {
      alert(`Error de red: ${e?.message ?? e}`)
    }
  }

  const revertirConciliacionCompras = async (concId: number) => {
    if (!confirm('¿Confirmás revertir esta conciliación? Se restaurarán los saldos involucrados.')) return
    setCdcRevertiendoId(concId)
    try {
      const supabase = createSupabaseClient()
      const { data: apls, error: aplErr } = await supabase.from('conciliaciones_deuda_compras_aplicaciones').select('*').eq('conciliacion_id', concId)
      if (aplErr || !apls) { alert('Error al obtener aplicaciones: ' + aplErr?.message); return }
      for (const apl of apls) {
        const factura = facturasCompra.find(f => f.numero === apl.debito_numero)
        if (factura) {
          const saldoR = Math.min((factura.saldo || 0) + apl.monto, factura.total)
          await supabase.from('facturas_compra').update({ saldo: saldoR, estado: 'pendiente' }).eq('id', factura.id)
          setFacturasCompra(prev => prev.map(f => f.id === factura.id ? { ...f, saldo: saldoR, estado: 'pendiente' } : f))
        }
        if (apl.credito_tipo?.startsWith('NC')) {
          const nc = notasCreditoCompra.find(n => n.numero === apl.credito_numero)
          if (nc) {
            const saldoR = Math.min((nc.saldo_disponible ?? nc.total ?? 0) + apl.monto, nc.total)
            await supabase.from('notas_credito_compra').update({ saldo_disponible: saldoR, estado: 'confirmada' }).eq('id', nc.id)
            setNotasCreditoCompra(prev => prev.map(n => n.id === nc.id ? { ...n, saldo_disponible: saldoR, estado: 'confirmada' as const } : n))
          }
        } else {
          const op = ordenesPago.find(o => o.numero === apl.credito_numero)
          if (op) {
            const creditoMoneda = apl.credito_moneda ?? 'ARS'
            const { data: mediosOP } = await supabase.from('compras_op_medios_pago')
              .select('moneda, importe, importe_comp').eq('op_id', op.id)
            const usdM = (mediosOP ?? []).filter((m: any) => m.moneda === 'USD')
            const usdTotal = usdM.reduce((s: number, m: any) => s + Number(m.importe), 0)
            const usdTotalARS = usdM.reduce((s: number, m: any) => s + Number(m.importe_comp || 0), 0)
            const cotiz = usdTotal > 0 ? usdTotalARS / usdTotal : 1
            // Calcular cuánto se restaura en ARS para el total
            const montoARS = creditoMoneda === 'USD' ? apl.monto * cotiz : apl.monto
            const importeR = Math.min((op.importe_no_conciliado ?? op.importe ?? 0) + montoARS, op.importe)
            const updateData: any = { importe_no_conciliado: importeR }
            if (creditoMoneda === 'USD' && op.importe_no_conciliado_usd != null) {
              const usdR = Math.min((op.importe_no_conciliado_usd ?? 0) + apl.monto, usdTotal)
              updateData.importe_no_conciliado_usd = usdR
            } else if (creditoMoneda === 'ARS' && op.importe_no_conciliado_ars != null) {
              const arsM = (mediosOP ?? []).filter((m: any) => !m.moneda || m.moneda === 'ARS')
              const arsTotal = arsM.reduce((s: number, m: any) => s + Number(m.importe_comp ?? m.importe), 0)
              const arsR = Math.min((op.importe_no_conciliado_ars ?? 0) + apl.monto, arsTotal)
              updateData.importe_no_conciliado_ars = arsR
            }
            await supabase.from('compras_ordenes_pago').update(updateData).eq('id', op.id)
            setOrdenesPago(prev => prev.map(o => o.id === op.id ? { ...o, ...updateData } : o))
          }
        }
      }
      const fechaCancelacion = new Date().toISOString()
      const { error: updErr } = await supabase.from('conciliaciones_deuda_compras').update({ estado: 'cancelada', fecha_cancelacion: fechaCancelacion }).eq('id', concId)
      if (updErr) { alert('Error al cancelar: ' + updErr.message); return }
      setCdcHistorial(prev => prev.map(h => h.id === concId ? { ...h, estado: 'cancelada', fecha_cancelacion: fechaCancelacion } : h))
    } catch (err) { alert('Error inesperado: ' + (err as Error).message) }
    finally { setCdcRevertiendoId(null) }
  }

  const renderConciliacionDeudaCompras = () => {
    const proveedorSel = proveedores.find(p => p.id === cdcProveedorId)
    // Débitos = facturas + notas de débito (ND incrementan la deuda al proveedor,
    // igual que una factura). Ambas se muestran mezcladas en el mismo panel.
    const facturasDelProv = cdcProveedorId
      ? facturasCompra.filter(f => f.proveedor_id === cdcProveedorId && f.estado !== 'borrador' && f.estado !== 'cancelada')
      : []
    const ndsDelProv = cdcProveedorId
      ? notasDebitoCompra
          .filter(n => n.proveedor_id === cdcProveedorId
            && (n.estado === 'confirmada' || n.estado === 'pendiente')
            && Number(n.saldo_disponible ?? n.total ?? 0) > 0)
          .map((n: any) => ({
            // Map a la forma de "factura" para que el panel las pueda mostrar sin cambios.
            id: n.id,
            numero: n.numero,
            fecha: n.fecha,
            fecha_vencimiento: n.fecha,
            total: Number(n.total ?? 0),
            saldo: Number(n.saldo_disponible ?? n.total ?? 0),
            moneda: n.moneda ?? 'ARS',
            estado: n.estado,
            proveedor_id: n.proveedor_id,
            condicion_pago: 'ND',
            nota_venta_numero: '',
            _esND: true,
          }))
      : []
    const todasFacts = [...facturasDelProv, ...(ndsDelProv as any[])] as typeof facturasDelProv
    const factsARS = todasFacts.filter(f => !f.moneda || f.moneda === 'ARS')
    const factsUSD = todasFacts.filter(f => f.moneda === 'USD')
    const todasOP = cdcProveedorId ? ordenesPago.filter(o => o.proveedor_id === cdcProveedorId && o.estado === 'publicado') : []
    const todasNC = cdcProveedorId ? notasCreditoCompra.filter(n => n.proveedor_id === cdcProveedorId && n.estado === 'confirmada') : []
    const ncARS = todasNC.filter(n => !n.moneda || n.moneda === 'ARS')
    const ncUSD = todasNC.filter(n => n.moneda === 'USD')

    // Construir credit items per currency desde medios_pago de cada OP
    type OPCreditItem = { id: string; numero: string; fecha: string; importe: number; importeNoConc: number; moneda: 'ARS' | 'USD' }
    const opCreditosARS: OPCreditItem[] = []
    const opCreditosUSD: OPCreditItem[] = []
    for (const op of todasOP) {
      const medios = cdcMediosPorOP[op.id]
      if (medios && medios.length > 0) {
        const arsM = medios.filter(m => !m.moneda || m.moneda === 'ARS')
        const usdM = medios.filter(m => m.moneda === 'USD')
        const arsTotal = arsM.reduce((s, m) => s + (m.importe_comp || m.importe || 0), 0)
        const usdTotal = usdM.reduce((s, m) => s + (m.importe || 0), 0)
        const usdTotalARS = usdM.reduce((s, m) => s + (m.importe_comp || 0), 0)
        const cotizUSD = usdTotal > 0 ? usdTotalARS / usdTotal : 1
        const noConc = Number(op.importe_no_conciliado ?? op.importe ?? 0)
        // Usar columnas per-currency si están disponibles (script 059)
        const noConcARS = typeof op.importe_no_conciliado_ars === 'number'
          ? op.importe_no_conciliado_ars
          : (() => { const applied = Math.max(0, (arsTotal + usdTotalARS) - noConc); return Math.max(0, arsTotal - Math.min(arsTotal, applied)) })()
        const noConcUSD = typeof op.importe_no_conciliado_usd === 'number'
          ? op.importe_no_conciliado_usd
          : (() => { const applied = Math.max(0, (arsTotal + usdTotalARS) - noConc); const appARS = Math.min(arsTotal, applied); return Math.max(0, usdTotalARS - (applied - appARS)) / cotizUSD })()
        if (arsTotal > 0) opCreditosARS.push({ id: op.id, numero: op.numero, fecha: op.fecha, importe: arsTotal, importeNoConc: noConcARS, moneda: 'ARS' })
        if (usdTotal > 0) opCreditosUSD.push({ id: op.id, numero: op.numero, fecha: op.fecha, importe: usdTotal, importeNoConc: noConcUSD, moneda: 'USD' })
      } else {
        // Fallback si no se cargaron medios: usar moneda de la OP
        const noConc = Number(op.importe_no_conciliado ?? op.importe ?? 0)
        if (!op.moneda || op.moneda === 'ARS') {
          opCreditosARS.push({ id: op.id, numero: op.numero, fecha: op.fecha, importe: op.importe, importeNoConc: noConc, moneda: 'ARS' })
        } else {
          opCreditosUSD.push({ id: op.id, numero: op.numero, fecha: op.fecha, importe: op.importe, importeNoConc: noConc, moneda: 'USD' })
        }
      }
    }

    const debitoARSTotal = factsARS.filter(f => f.saldo > 0).reduce((s, f) => s + f.saldo, 0)
    const creditoARSTotal = opCreditosARS.filter(o => o.importeNoConc > 0).reduce((s, o) => s + o.importeNoConc, 0) + ncARS.filter(n => (n.saldo_disponible ?? n.total) > 0).reduce((s, n) => s + (n.saldo_disponible ?? n.total), 0)
    const debitoUSDTotal = factsUSD.filter(f => f.saldo > 0).reduce((s, f) => s + f.saldo, 0)
    const creditoUSDTotal = opCreditosUSD.filter(o => o.importeNoConc > 0).reduce((s, o) => s + o.importeNoConc, 0) + ncUSD.filter(n => (n.saldo_disponible ?? n.total) > 0).reduce((s, n) => s + (n.saldo_disponible ?? n.total), 0)
    const hayMixto = (cdcSelDebitos.some(d => d.moneda === 'ARS') && cdcSelCreditos.some(c => c.moneda === 'USD')) || (cdcSelDebitos.some(d => d.moneda === 'USD') && cdcSelCreditos.some(c => c.moneda === 'ARS'))
    const haySeleccion = (cdcSelDebitos.some(d => d.moneda === 'ARS') && cdcSelCreditos.some(c => c.moneda === 'ARS')) ||
      (cdcSelDebitos.some(d => d.moneda === 'USD') && cdcSelCreditos.some(c => c.moneda === 'USD')) ||
      (hayMixto && cdcCotizacion > 0)
    const toggleDebito = (id: number, moneda: 'ARS' | 'USD', saldo: number) =>
      setCdcSelDebitos(prev => prev.find(d => d.id === id) ? prev.filter(d => d.id !== id) : [...prev, { id, tipo: 'factura' as const, moneda, montoAplicar: saldo }])
    const toggleCredito = (id: number | string, tipo: 'op' | 'nc', moneda: 'ARS' | 'USD', saldo: number) =>
      setCdcSelCreditos(prev => prev.find(c => c.id === id && c.tipo === tipo) ? prev.filter(c => !(c.id === id && c.tipo === tipo)) : [...prev, { id, tipo, moneda, montoAplicar: saldo }])

    const PanelDebitos = ({ moneda, factsList }: { moneda: 'ARS' | 'USD'; factsList: typeof factsARS }) => {
      const filtro = cdcFiltroTextoDb.toLowerCase()
      const visibles = cdcFiltroConciliado === 'si' ? factsList.filter(f => f.saldo <= 0) : cdcFiltroConciliado === 'no' ? factsList.filter(f => f.saldo > 0) : cdcMostrarTodosDb ? factsList : factsList.filter(f => f.saldo > 0)
      const filtradas = filtro ? visibles.filter(f => f.numero?.toLowerCase().includes(filtro)) : visibles
      return (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 bg-red-50 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">Débitos {moneda}</span>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Filtrar..." value={cdcFiltroTextoDb} onChange={e => setCdcFiltroTextoDb(e.target.value)} className="px-2 py-0.5 text-xs border rounded w-24" />
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={cdcMostrarTodosDb} onChange={e => setCdcMostrarTodosDb(e.target.checked)} className="w-3 h-3 rounded" /> Todos</label>
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{filtradas.length}</span>
            </div>
          </div>
          <div className="overflow-auto max-h-52">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b"><tr className="text-gray-500 uppercase">
                <th className="py-1.5 px-2 text-left font-semibold">N°</th>
                <th className="py-1.5 px-2 text-left font-semibold">Tipo</th>
                <th className="py-1.5 px-2 text-left font-semibold">Venc.</th>
                <th className="py-1.5 px-2 text-right font-semibold">Total</th>
                <th className="py-1.5 px-2 text-right font-semibold">Saldo</th>
                <th className="py-1.5 px-2 text-center font-semibold">✓</th>
              </tr></thead>
              <tbody>
                {filtradas.length > 0 ? filtradas.map(f => {
                  const sel = cdcSelDebitos.find(d => d.id === f.id)
                  const conciliada = f.saldo <= 0
                  const esND = (f as any)._esND === true
                  return (
                    <tr key={`${esND ? 'nd' : 'fc'}-${f.id}`} onClick={() => !conciliada && toggleDebito(f.id, moneda, f.saldo)}
                      className={`border-b cursor-pointer ${sel ? 'bg-red-50' : 'hover:bg-gray-50'} ${conciliada ? 'opacity-40' : ''}`}>
                      <td className="py-1 px-2 text-blue-600">
                        <span className="inline-flex items-center gap-1.5">
                          {f.numero}
                          <button
                            type="button"
                            title={esND ? "Ver nota de débito" : "Ver factura de compra"}
                            className="text-gray-400 hover:text-indigo-700"
                            onClick={e => {
                              e.stopPropagation()
                              if (esND) {
                                const nd = notasDebitoCompra.find(n => n.id === f.id)
                                if (nd) abrirPopupNDCompra(nd)
                              } else {
                                abrirPopupFacturaCompra(f)
                              }
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </td>
                      <td className="py-1 px-2 text-gray-500">{esND ? "ND" : "FC"}</td>
                      <td className="py-1 px-2 text-gray-500">{f.fecha_vencimiento ? f.fecha_vencimiento.split('T')[0] : '-'}</td>
                      <td className="py-1 px-2 text-right">{moneda === 'USD' ? `USD ${f.total?.toLocaleString('es-AR')}` : `$${f.total?.toLocaleString('es-AR')}`}</td>
                      <td className="py-1 px-2 text-right font-semibold text-red-600">{moneda === 'USD' ? `USD ${f.saldo?.toLocaleString('es-AR')}` : `$${f.saldo?.toLocaleString('es-AR')}`}</td>
                      <td className="py-1 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {!conciliada && <input type="checkbox" checked={!!sel} onChange={() => toggleDebito(f.id, moneda, f.saldo)} className="w-3.5 h-3.5 rounded border-gray-300" />}
                      </td>
                    </tr>
                  )
                }) : <tr><td colSpan={6} className="py-6 text-center text-gray-400">{!cdcProveedorId ? 'Seleccioná un proveedor' : `Sin débitos ${moneda}`}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    const PanelCreditos = ({ moneda, opItems, ncList }: { moneda: 'ARS' | 'USD'; opItems: OPCreditItem[]; ncList: typeof ncARS }) => {
      const filtro = cdcFiltroTextoCr.toLowerCase()
      const opFilt = (cdcMostrarTodosCr ? opItems : opItems.filter(o => o.importeNoConc > 0)).filter(o => !filtro || o.numero?.toLowerCase().includes(filtro))
      const ncFilt = (cdcFiltroConciliado === 'si' ? ncList.filter(n => (n.saldo_disponible ?? n.total) <= 0) : ncList.filter(n => cdcMostrarTodosCr ? true : (n.saldo_disponible ?? n.total) > 0)).filter(n => !filtro || n.numero?.toLowerCase().includes(filtro))
      return (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Créditos {moneda}</span>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Filtrar..." value={cdcFiltroTextoCr} onChange={e => setCdcFiltroTextoCr(e.target.value)} className="px-2 py-0.5 text-xs border rounded w-24" />
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={cdcMostrarTodosCr} onChange={e => setCdcMostrarTodosCr(e.target.checked)} className="w-3 h-3 rounded" /> Todos</label>
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{opFilt.length + ncFilt.length}</span>
            </div>
          </div>
          <div className="overflow-auto max-h-52">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b"><tr className="text-gray-500 uppercase">
                <th className="py-1.5 px-2 text-center font-semibold">✓</th>
                <th className="py-1.5 px-2 text-right font-semibold">Saldo</th>
                <th className="py-1.5 px-2 text-right font-semibold">Importe</th>
                <th className="py-1.5 px-2 text-left font-semibold">Fecha</th>
                <th className="py-1.5 px-2 text-left font-semibold">N°</th>
                <th className="py-1.5 px-2 text-left font-semibold">Tipo</th>
              </tr></thead>
              <tbody>
                {opFilt.map(o => {
                  const saldo = o.importeNoConc
                  const sel = cdcSelCreditos.find(c => c.id === o.id && c.tipo === 'op' && c.moneda === moneda)
                  const aplicado = saldo <= 0
                  return (
                    <tr key={`op-${o.id}-${moneda}`} onClick={() => !aplicado && toggleCredito(o.id, 'op', moneda, saldo)}
                      className={`border-b cursor-pointer ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'} ${aplicado ? 'opacity-40' : ''}`}>
                      <td className="py-1 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {!aplicado && <input type="checkbox" checked={!!sel} onChange={() => toggleCredito(o.id, 'op', moneda, saldo)} className="w-3.5 h-3.5 rounded border-gray-300" />}
                      </td>
                      <td className="py-1 px-2 text-right font-semibold text-green-600">{moneda === 'USD' ? `USD ${saldo?.toLocaleString('es-AR')}` : `$${saldo?.toLocaleString('es-AR')}`}</td>
                      <td className="py-1 px-2 text-right">{moneda === 'USD' ? `USD ${o.importe?.toLocaleString('es-AR')}` : `$${o.importe?.toLocaleString('es-AR')}`}</td>
                      <td className="py-1 px-2 text-gray-500">{o.fecha?.split('T')[0]}</td>
                      <td className="py-1 px-2 text-blue-600">
                        <span className="inline-flex items-center gap-1.5">
                          {o.numero}
                          <button
                            type="button"
                            title="Ver orden de pago"
                            className="text-gray-400 hover:text-indigo-700"
                            onClick={e => {
                              e.stopPropagation()
                              const op = ordenesPago.find(x => x.id === o.id)
                              abrirPopupOP(op)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </td>
                      <td className="py-1 px-2 text-gray-500">OP</td>
                    </tr>
                  )
                })}
                {ncFilt.map(n => {
                  const saldo = n.saldo_disponible ?? n.total
                  const sel = cdcSelCreditos.find(c => c.id === n.id && c.tipo === 'nc')
                  const aplicada = saldo <= 0
                  return (
                    <tr key={`nc-${n.id}`} onClick={() => !aplicada && toggleCredito(n.id, 'nc', moneda, saldo)}
                      className={`border-b cursor-pointer bg-emerald-50/30 ${sel ? 'bg-emerald-100' : 'hover:bg-emerald-50'} ${aplicada ? 'opacity-40' : ''}`}>
                      <td className="py-1 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {!aplicada && <input type="checkbox" checked={!!sel} onChange={() => toggleCredito(n.id, 'nc', moneda, saldo)} className="w-3.5 h-3.5 rounded border-gray-300 accent-emerald-600" />}
                      </td>
                      <td className="py-1 px-2 text-right font-semibold text-green-600">{moneda === 'USD' ? `USD ${saldo?.toLocaleString('es-AR')}` : `$${saldo?.toLocaleString('es-AR')}`}</td>
                      <td className="py-1 px-2 text-right">{moneda === 'USD' ? `USD ${n.total?.toLocaleString('es-AR')}` : `$${n.total?.toLocaleString('es-AR')}`}</td>
                      <td className="py-1 px-2 text-gray-500">{n.fecha?.split('T')[0]}</td>
                      <td className="py-1 px-2 text-emerald-700 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {n.numero}
                          <button
                            type="button"
                            title="Ver nota de crédito"
                            className="text-gray-400 hover:text-indigo-700"
                            onClick={e => { e.stopPropagation(); abrirPopupNCCompra(n) }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </td>
                      <td className="py-1 px-2"><span className="bg-emerald-100 text-emerald-600 rounded px-1 text-xs">NC</span></td>
                    </tr>
                  )
                })}
                {opFilt.length === 0 && ncFilt.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">{!cdcProveedorId ? 'Seleccioná un proveedor' : `Sin créditos ${moneda}`}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    const historialProveedor = cdcProveedorId ? cdcHistorial.filter(h => h.proveedor_id === cdcProveedorId) : []

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Conciliación de Deuda - Compras</h1>
          <div className="flex gap-2">
            <button onClick={() => setCdcTab('conciliar')} className={`px-4 py-2 text-sm font-medium rounded ${cdcTab === 'conciliar' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Conciliar</button>
            <button onClick={() => { setCdcTab('historial'); if (cdcProveedorId) cargarHistorialCdcCompras(cdcProveedorId) }} className={`px-4 py-2 text-sm font-medium rounded ${cdcTab === 'historial' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Historial</button>
          </div>
        </div>

        {cdcTab === 'conciliar' && (
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                  <select value={cdcProveedorId ?? ''} onChange={e => { const id = Number(e.target.value) || null; setCdcProveedorId(id); setCdcSelDebitos([]); setCdcSelCreditos([]); if (id) { cargarHistorialCdcCompras(id); cargarMediosCdcOP(id) } }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.filter((p: any) => p.activo !== false).map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Filtro</label>
                  <select value={cdcFiltroConciliado} onChange={e => setCdcFiltroConciliado(e.target.value as 'no' | 'si' | 'todos')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="no">Pendientes</option>
                    <option value="todos">Todos</option>
                    <option value="si">Conciliados</option>
                  </select>
                </div>
              </div>
              {proveedorSel && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-red-50 rounded p-2 text-center"><p className="text-xs text-red-600">Deuda ARS</p><p className="text-sm font-bold text-red-700">${debitoARSTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</p></div>
                  <div className="bg-blue-50 rounded p-2 text-center"><p className="text-xs text-blue-600">Crédito ARS</p><p className="text-sm font-bold text-blue-700">${creditoARSTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</p></div>
                  <div className="bg-red-50 rounded p-2 text-center"><p className="text-xs text-red-600">Deuda USD</p><p className="text-sm font-bold text-red-700">USD {debitoUSDTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</p></div>
                  <div className="bg-blue-50 rounded p-2 text-center"><p className="text-xs text-blue-600">Crédito USD</p><p className="text-sm font-bold text-blue-700">USD {creditoUSDTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</p></div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b"><span className="text-xs font-semibold text-gray-600 uppercase">Pesos (ARS)</span></div>
                <div className="flex divide-x">{PanelDebitos({ moneda: "ARS", factsList: factsARS })}{PanelCreditos({ moneda: "ARS", opItems: opCreditosARS, ncList: ncARS })}</div>
              </div>
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b"><span className="text-xs font-semibold text-gray-600 uppercase">Dólares (USD)</span></div>
                <div className="flex divide-x">{PanelDebitos({ moneda: "USD", factsList: factsUSD })}{PanelCreditos({ moneda: "USD", opItems: opCreditosUSD, ncList: ncUSD })}</div>
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-4">
                {hayMixto && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-orange-600">⚠ Cotización USD/ARS <span className="font-bold">(requerida)</span></label>
                    <input
                      type="number"
                      value={cdcCotizacion || ''}
                      onChange={e => setCdcCotizacion(Number(e.target.value))}
                      placeholder="Ej: 1400"
                      className={`w-28 border rounded px-2 py-1 text-sm font-medium ${cdcCotizacion > 0 ? 'border-green-400 focus:ring-green-400' : 'border-orange-400 bg-orange-50 ring-1 ring-orange-400 animate-pulse'}`}
                    />
                    {cdcCotizacion <= 0 && <span className="text-xs text-orange-600">Ingresá la cotización para habilitar el botón</span>}
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  {cdcSelDebitos.filter(d => d.moneda === 'ARS').length > 0 && (
                    <span className="text-red-600 font-medium">Deuda ARS: <span className="font-bold">${cdcSelDebitos.filter(d => d.moneda === 'ARS').reduce((s, d) => s + d.montoAplicar, 0).toLocaleString('es-AR')}</span></span>
                  )}
                  {cdcSelDebitos.filter(d => d.moneda === 'USD').length > 0 && (
                    <span className="text-red-600 font-medium">Deuda USD: <span className="font-bold">USD {cdcSelDebitos.filter(d => d.moneda === 'USD').reduce((s, d) => s + d.montoAplicar, 0).toLocaleString('es-AR')}</span></span>
                  )}
                  {(cdcSelDebitos.length > 0 && cdcSelCreditos.length > 0) && <span className="text-gray-400">→</span>}
                  {cdcSelCreditos.filter(c => c.moneda === 'ARS').length > 0 && (
                    <span className="text-green-600 font-medium">Crédito ARS: <span className="font-bold">${cdcSelCreditos.filter(c => c.moneda === 'ARS').reduce((s, c) => s + c.montoAplicar, 0).toLocaleString('es-AR')}</span></span>
                  )}
                  {cdcSelCreditos.filter(c => c.moneda === 'USD').length > 0 && (
                    <span className="text-green-600 font-medium">Crédito USD: <span className="font-bold">USD {cdcSelCreditos.filter(c => c.moneda === 'USD').reduce((s, c) => s + c.montoAplicar, 0).toLocaleString('es-AR')}</span></span>
                  )}
                  {cdcSelDebitos.length === 0 && cdcSelCreditos.length === 0 && (
                    <span className="text-gray-400 text-xs">Seleccioná facturas y créditos para conciliar</span>
                  )}
                </div>
                <div className="ml-auto flex gap-3">
                  <button onClick={() => { setCdcSelDebitos([]); setCdcSelCreditos([]) }} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Limpiar selección</button>
                  <button onClick={confirmarConciliacionCompras} disabled={!haySeleccion || cdcEjecutando} className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg font-medium hover:bg-indigo-800 disabled:opacity-50 transition-colors">{cdcEjecutando ? 'Conciliando...' : 'Conciliar'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {cdcTab === 'historial' && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50"><p className="text-sm font-medium text-gray-700">{proveedorSel ? `Historial de ${proveedorSel.nombre}` : 'Seleccioná un proveedor para ver el historial'}</p></div>
            {historialProveedor.length === 0 ? (
              <div className="py-12 text-center text-gray-400">{cdcProveedorId ? 'Sin conciliaciones registradas' : 'Seleccioná un proveedor'}</div>
            ) : (
              <div className="divide-y">
                {historialProveedor.map(h => (
                  <div key={h.id} className={`p-4 ${h.estado === 'cancelada' ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${h.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{h.estado === 'activa' ? 'Activa' : 'Cancelada'}</span>
                        {h.esOP && h.opId && (
                          <a
                            href={`/compras/op/${h.opId}`}
                            className="text-xs px-2 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                            title="Abrir la Orden de Pago en una nueva pantalla"
                          >
                            OP {h.opNumero} →
                          </a>
                        )}
                        <span className="text-sm text-gray-600">{h.fecha.split('T')[0]}</span>
                        <span className="text-sm font-semibold">${h.total_conciliado.toLocaleString('es-AR', {minimumFractionDigits:2})}</span>
                        <span className="text-xs text-gray-400">{h.usuario}</span>
                      </div>
                      {h.estado === 'activa' && (
                        <button
                          onClick={() => {
                            if (h.esOP && h.opId) {
                              // Revertir una conciliación auto-generada por OP = cancelar la OP completa.
                              // Esto revierte movimientos de caja, saldos de facturas/NCs, y el asiento.
                              if (!confirm(`Revertir esta conciliación va a CANCELAR la OP ${h.opNumero} completa.\n\nSe van a revertir:\n• Los movimientos de caja\n• Los saldos de las facturas pagadas\n• Las NCs aplicadas (saldo disponible vuelve)\n• El asiento contable\n\n¿Continuar?`)) return
                              cancelarOPDesdeHistorial(h.opId)
                            } else {
                              revertirConciliacionCompras(h.id)
                            }
                          }}
                          disabled={cdcRevertiendoId === h.id}
                          className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                          title={h.esOP ? `Cancela la OP ${h.opNumero} y revierte toda esta conciliación` : "Revertir esta conciliación manual"}
                        >
                          {cdcRevertiendoId === h.id ? 'Revirtiendo...' : 'Revertir'}
                        </button>
                      )}
                    </div>
                    {h.aplicaciones.length > 0 && (
                      <div className="mt-2 ml-2">
                        <table className="w-full text-xs text-gray-500 table-fixed">
                          <colgroup>
                            <col className="w-16" /><col className="w-32" />
                            <col className="w-12" /><col className="w-32" />
                            <col className="w-52" />
                            <col className="w-24" />
                          </colgroup>
                          <thead><tr>
                            <th className="text-left py-1 font-medium">Débito</th><th className="text-left py-1 font-medium">N° Débito</th>
                            <th className="text-left py-1 font-medium">Crédito</th><th className="text-left py-1 font-medium">N° Crédito</th>
                            <th className="text-left py-1 font-medium">Monedas</th>
                            <th className="text-right py-1 font-medium">Monto</th>
                          </tr></thead>
                          <tbody>
                            {h.aplicaciones.map((a, i) => {
                              const dm = a.debito_moneda ?? 'ARS'
                              const cm = a.credito_moneda ?? 'ARS'
                              const esMixto = dm !== cm
                              const parLabel = `${dm}→${cm}`
                              // El monto se guarda en moneda del DÉBITO — usar `dm`
                              // para etiquetarlo (mismo bug que tenía ventas).
                              const montoFmt = dm === 'USD'
                                ? `USD ${a.monto.toLocaleString('es-AR', {minimumFractionDigits:2})}`
                                : `$${a.monto.toLocaleString('es-AR', {minimumFractionDigits:2})}`

                              // Resolver el comprobante en memoria por (tipo, numero) y abrir popup.
                              const abrirDesdeHistorial = (tipo: string, numero: string) => {
                                if (!numero) return
                                const t = tipo.toLowerCase()
                                if (t.startsWith('fc') || t.startsWith('factura')) {
                                  const f = facturasCompra.find(x => x.numero === numero)
                                  if (f) abrirPopupFacturaCompra(f)
                                } else if (t === 'op') {
                                  const o = ordenesPago.find(x => x.numero === numero)
                                  if (o) abrirPopupOP(o)
                                } else if (t.startsWith('nc')) {
                                  const n = notasCreditoCompra.find(x => x.numero === numero)
                                  if (n) abrirPopupNCCompra(n)
                                } else if (t.startsWith('nd')) {
                                  const n = notasDebitoCompra.find(x => x.numero === numero)
                                  if (n) abrirPopupNDCompra(n)
                                }
                              }
                              const tieneDeb = !!facturasCompra.find(x => x.numero === a.debito_numero)
                                            || !!notasDebitoCompra.find(x => x.numero === a.debito_numero)
                              const tieneCre = !!ordenesPago.find(x => x.numero === a.credito_numero)
                                            || !!notasCreditoCompra.find(x => x.numero === a.credito_numero)

                              return (
                                <tr key={i} className="border-t border-gray-100">
                                  <td className="py-1">{a.debito_tipo}</td>
                                  <td className="py-1 text-blue-600">
                                    <span className="inline-flex items-center gap-1.5">
                                      {a.debito_numero}
                                      {tieneDeb && (
                                        <button
                                          type="button"
                                          title="Ver comprobante"
                                          className="text-gray-400 hover:text-indigo-700 transition-colors"
                                          onClick={() => abrirDesdeHistorial(a.debito_tipo, a.debito_numero)}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-1">{a.credito_tipo}</td>
                                  <td className="py-1 text-blue-600">
                                    <span className="inline-flex items-center gap-1.5">
                                      {a.credito_numero}
                                      {tieneCre && (
                                        <button
                                          type="button"
                                          title="Ver comprobante"
                                          className="text-gray-400 hover:text-indigo-700 transition-colors"
                                          onClick={() => abrirDesdeHistorial(a.credito_tipo, a.credito_numero)}
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </span>
                                  </td>
                                  <td className="py-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${esMixto ? 'bg-orange-100 text-orange-700' : cm === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {parLabel}
                                      </span>
                                      {esMixto && a.cotizacion && (
                                        <span className="text-gray-400 text-xs">cotización: {a.cotizacion.toLocaleString('es-AR')}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1 text-right font-mono">{montoFmt}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // =====================================================
  // RENDER PLACEHOLDER
  // =====================================================
  const renderPlaceholder = (title: string) => (
    <div>
      <h1 className="text-2xl font-bold text-amber-900 mb-4">{title}</h1>
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
      // case "proveedores": migrado a /proveedores top-level. Sidebar tiene Link.
      case "cta_cte_proveedores":
        return renderCtaCteProveedores()
      case "historial_proveedores":
        return renderPlaceholder("Historial Proveedores")
      case "conciliacion_deuda":
        return renderConciliacionDeudaCompras()
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
      case "cat_proveedores":
        return renderCatProveedores()
      default:
        return renderProveedores()
    }
  }

  // Modo embedded — sin sidebar propio (lo aporta el layout de Next)
  if (embedded) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        {renderContent()}
        {/* Popup de previsualización de comprobantes (lupita en conciliación) */}
        {comprobantePopup && <ComprobantePopup {...comprobantePopup} />}
      </div>
    )
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

      {/* ===== MODAL MEDIO DE PAGO OP ===== */}
      {opModalMedioPago && (
        <ModalMedioPago
          cajaId={opForm.caja_id || ""}
          onGuardar={(result, yNuevo) => {
            const nuevoMedio: OPMedioPago = {
              forma_pago_id: result.valor_id,
              forma_pago_nombre: result.valor_nombre,
              nombre: `${result.valor_nombre} - ${result.moneda} ${result.importe.toFixed(2)}`,
              tipo_operacion: result.tipo_operacion || result.valor_subtipo || undefined,
              tipo_cotizacion: result.tipo_cotizacion,
              cotizacion: result.cotizacion,
              numero_operacion: result.numero_operacion || result.numero_cheque || undefined,
              fecha_operacion: result.fecha_operacion || result.vencimiento_cheque || undefined,
              importe: result.importe,
              moneda: result.moneda as string,
              importe_comp: result.importe_ars ?? result.importe,
              moneda_comp: opForm.moneda ?? "ARS",
              observaciones: result.observaciones,
            }
            const nuevosMedios = [...opMediosPago, nuevoMedio]
            setOpMediosPago(nuevosMedios)
            const t = calcOpTotales(nuevosMedios, opComprobantesDebito, opComprobantesCredito)
            setOpForm(prev => ({ ...prev, importe: t.totalMedios, importe_a_cuenta: t.aCuenta, importe_no_conciliado: t.noConciliado }))
            if (!yNuevo) setOpModalMedioPago(false)
          }}
          onCerrar={() => setOpModalMedioPago(false)}
        />
      )}

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
                {/* Confirmar: valida duplicados, valida incompletas y cierra */}
                <button
                  onClick={() => {
                    // Validar unidades parcialmente completadas:
                    // Una unidad "parcialmente" llenada es aquella donde empezaron a escribir
                    // el IMEI pero le faltan campos obligatorios, o viceversa.
                    const unidadParcialmenteCompleta = (u: UnidadSerie) => {
                      const tieneAlgo =
                        u.nro_serie.trim() !== '' ||
                        (linea.requiere_color && (u.color ?? '').trim() !== '') ||
                        (linea.requiere_bateria && u.bateria_pct !== undefined && u.bateria_pct !== null)
                      return tieneAlgo && !unidadCompleta(u)
                    }

                    for (let i = 0; i < cantTotal; i++) {
                      const u = modalSerieUnidades[i] ?? { nro_serie: '', outlet: false }
                      if (unidadParcialmenteCompleta(u)) {
                        const faltantes: string[] = []
                        if (linea.tiene_serie && u.nro_serie.trim() === '') faltantes.push('N° Serie / IMEI')
                        if (linea.requiere_color && (u.color ?? '').trim() === '') faltantes.push('Color')
                        if (linea.requiere_bateria && (u.bateria_pct === undefined || u.bateria_pct === null)) faltantes.push('% Batería')
                        alert(`Unidad ${i + 1}: faltan completar los campos obligatorios: ${faltantes.join(', ')}`)
                        irA(i)
                        return
                      }
                    }

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
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors bg-indigo-900 hover:bg-indigo-800 text-white"
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

      {/* Popup compacto de previsualización de comprobantes (lupita en
          conciliación de deuda). Renderizado a nivel raíz. */}
      {comprobantePopup && <ComprobantePopup {...comprobantePopup} />}
    </div>
  )
}
