"use client"

// Tipos, helpers, persistencia (sessionStorage), SeguimientoPanel y StockListSection.
// Extraído de components/modulo-stock.tsx (interfaces ~125-260, SeguimientoPanel ~262-394,
// StockListSection ~574-634).

import { useMemo, useState } from "react"
import { ArrowRight, MessageSquare, Star, User } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface SeguimientoEntry {
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

export interface TransferenciaLinea {
  producto_id: number
  producto_nombre: string
  producto_codigo?: string
  stock_virtual: number
  cantidad: number
  observacion: string
}

export interface TransferenciaInterna {
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
  lineas: TransferenciaLinea[]
  seguimiento?: SeguimientoEntry[]
}

export interface PedidoAbastecimiento {
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

export interface ProductoStock {
  id: number
  codigo: string
  nombre: string
  ubicacion_id: number
  ubicacion_codigo: string
  stock_virtual: number
  stock_real?: number
  precio_costo?: number
  categoria_ruta?: string
  marca?: string
  codigo_barras?: string
}

export interface Deposito {
  id: number
  codigo: string
  nombre: string
  sucursal: string
  activo: boolean
}

export interface Ubicacion {
  id: number
  deposito_id: number
  codigo: string
  nombre: string
  tipo?: string
  categoria_nombre?: string
  activa: boolean
  disponible_venta?: boolean
}

export interface LoteSerie {
  id: number
  producto_id: number
  producto_codigo: string
  producto_nombre: string
  producto_categoria: string
  marca: string
  numero: string
  referencia_interna: string
  cantidad: number
  ubicacion_id: number
  ubicacion_nombre: string
  deposito_id: number
  deposito_nombre: string
  sucursal: string
  fecha_vencimiento: string | null
  bateria: number | null
  color: string | null
  estado: "disponible" | "reservado" | "vendido"
}

export interface ControlInventario {
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
}

export interface AjusteInventario {
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
}

export interface CategoriaUbicacion {
  id: number
  codigo: string
  nombre: string
  descripcion: string
}

export const mockCategoriasUbicacion: CategoriaUbicacion[] = [
  { id: 1, codigo: "STOCK", nombre: "Stock", descripcion: "Ubicaciones de stock principal" },
  { id: 2, codigo: "TRANS", nombre: "Transitoria", descripcion: "Ubicaciones temporales" },
  { id: 3, codigo: "CONS", nombre: "Cliente en Consignación", descripcion: "Stock en consignación" },
  { id: 4, codigo: "BU", nombre: "Bienes de Uso", descripcion: "Activos fijos" },
]

// ─── Helpers de estado ──────────────────────────────────────────────────────

export function getEstadoTransferenciaColor(estado: TransferenciaInterna["estado"]) {
  if (estado === "confirmada") return "bg-green-100 text-green-800"
  if (estado === "cancelada") return "bg-red-100 text-red-800"
  return "bg-gray-100 text-gray-800"
}

export function getEstadoPedidoColor(estado: PedidoAbastecimiento["estado"]) {
  if (estado === "realizado") return "bg-green-100 text-green-800"
  if (estado === "en_ejecucion") return "bg-blue-100 text-blue-800"
  if (estado === "cancelado") return "bg-red-100 text-red-800"
  return "bg-gray-100 text-gray-800"
}

export function getEstadoControlColor(estado: string) {
  if (estado === "confirmado") return "bg-green-100 text-green-800"
  if (estado === "en_proceso") return "bg-blue-100 text-blue-800"
  if (estado === "cancelado") return "bg-red-100 text-red-800"
  return "bg-gray-100 text-gray-800"
}

export function getEstadoLabel(estado: string) {
  const labels: Record<string, string> = {
    borrador: "Borrador",
    confirmada: "Confirmada",
    cancelada: "Cancelada",
    en_ejecucion: "En ejecución",
    realizado: "Realizado",
    cancelado: "Cancelado",
  }
  return labels[estado] ?? estado
}

export { formatDate } from "@/lib/format"

// ─── sessionStorage para Transferencias y Pedidos ──────────────────────────
// El monolito no persiste estos en backend. Para que el listado y el form
// puedan compartir estado entre páginas, los guardamos en sessionStorage.
// (El usuario no pierde nada porque tampoco persistían antes — sólo vivían
// en memoria del componente raíz mientras navegaba dentro del monolito.)

const KEY_TRANSFERENCIAS = "stock.transferencias"
const KEY_PEDIDOS = "stock.pedidosAbastecimiento"

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota/serialization errors
  }
}

export function loadTransferencias(): TransferenciaInterna[] {
  return readJson<TransferenciaInterna[]>(KEY_TRANSFERENCIAS, [])
}

export function saveTransferencias(items: TransferenciaInterna[]) {
  writeJson(KEY_TRANSFERENCIAS, items)
}

export function addTransferencia(t: TransferenciaInterna) {
  const items = loadTransferencias()
  saveTransferencias([t, ...items])
}

export function getTransferencia(id: number): TransferenciaInterna | undefined {
  return loadTransferencias().find(t => t.id === id)
}

export function loadPedidos(): PedidoAbastecimiento[] {
  return readJson<PedidoAbastecimiento[]>(KEY_PEDIDOS, [])
}

export function savePedidos(items: PedidoAbastecimiento[]) {
  writeJson(KEY_PEDIDOS, items)
}

// ─── SeguimientoPanel ───────────────────────────────────────────────────────

export function SeguimientoPanel({
  seguimiento,
  collapsed = true,
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
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 px-4 text-sm text-purple-700 hover:text-purple-800 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        {isExpanded ? "Ocultar seguimiento" : "Ver seguimiento"}
      </button>
      {isExpanded && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {seguimiento.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No hay actividad registrada</div>
            ) : (
              seguimiento.map(entry => (
                <div key={entry.id} className="flex gap-3 p-4 hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{renderEntryContent(entry)}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="font-medium text-purple-700">{entry.usuario}</span>
                      <span>·</span>
                      <span>{formatFechaRelativa(entry.fecha)}</span>
                      <span>·</span>
                      <button className="hover:text-purple-700">Me gusta</button>
                    </div>
                  </div>
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

// ─── Mappers de respuestas API ──────────────────────────────────────────────

export function mapDeposito(raw: any): Deposito {
  return {
    id: raw.id,
    codigo: raw.codigo,
    nombre: raw.nombre,
    sucursal: raw.sucursales?.nombre ?? "",
    activo: !!raw.activo,
  }
}

export function mapUbicacion(raw: any): Ubicacion {
  return {
    id: raw.id,
    deposito_id: raw.deposito_id,
    codigo: raw.codigo,
    nombre: raw.nombre,
    activa: !!raw.activa,
  }
}

export function mapProducto(raw: any): ProductoStock {
  return {
    id: raw.id,
    codigo: raw.codigo_interno ?? "",
    nombre: raw.nombre ?? "",
    ubicacion_id: 0,
    ubicacion_codigo: "",
    stock_virtual: raw.stock_real ?? 0,
    stock_real: raw.stock_real ?? 0,
    precio_costo: raw.costo_manual ?? 0,
    categoria_ruta: raw.categoria ?? "",
    marca: raw.marca ?? "",
    codigo_barras: raw.codigo_barras ?? undefined,
  }
}

export function mapLoteSerie(raw: any, prodById?: Map<number, any>): LoteSerie {
  const prod = prodById?.get(raw.producto_id) ?? {}
  return {
    id: raw.id,
    producto_id: raw.producto_id,
    producto_codigo: raw.productos?.codigo_interno ?? prod.codigo_interno ?? "",
    producto_nombre: raw.productos?.nombre ?? prod.nombre ?? "",
    producto_categoria: prod.categoria ?? "",
    marca: prod.marca ?? "",
    numero: raw.nro_serie ?? "",
    referencia_interna: raw.nro_serie ?? "",
    cantidad: 1,
    ubicacion_id: raw.ubicacion_id,
    ubicacion_nombre: raw.ubicaciones?.nombre ?? "",
    deposito_id: raw.deposito_id,
    deposito_nombre: raw.depositos?.nombre ?? "",
    sucursal: "",
    fecha_vencimiento: null,
    bateria: raw.bateria_pct ?? null,
    color: raw.color ?? null,
    estado:
      raw.estado === "disponible" ? "disponible" : raw.estado === "reservado" ? "reservado" : "vendido",
  }
}

// ─── StockListSection (wrapper reutilizable con OdooFilterBar) ──────────────
// Extraído de components/modulo-stock.tsx (~574-634).

export function StockListSection<T extends object>({
  title,
  moduleName,
  data,
  searchFields,
  filterFields,
  actions,
  children,
}: {
  title: string
  moduleName: string
  data: T[]
  searchFields: (keyof T)[]
  filterFields: { field: keyof T; label: string }[]
  actions?: React.ReactNode
  children: (filtered: T[]) => React.ReactNode
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

  const filterOptions = useMemo(
    () =>
      filterFields
        .map(ff => {
          const vals = [
            ...new Set(
              data.map(row => String(row[ff.field] ?? "")).filter(v => v && v !== "null" && v !== "undefined"),
            ),
          ]
          return {
            field: String(ff.field),
            label: ff.label,
            values: vals.sort().map(v => ({ value: v, label: v })),
          }
        })
        .filter(f => f.values.length > 0),
    [data, filterFields],
  )

  const groupByOptions: GroupByOption[] = filterFields.map(ff => ({
    id: String(ff.field),
    label: ff.label,
    field: String(ff.field),
  }))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        {actions}
      </div>
      <OdooFilterBar
        moduleName={moduleName}
        filterOptions={filterOptions}
        groupByOptions={groupByOptions}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={data.length}
        filteredCount={filtered.length}
      />
      <div className="mt-4">{children(filtered)}</div>
    </div>
  )
}
