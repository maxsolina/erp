// Tipos y helpers compartidos para los componentes de Listas de Precios.
// Estos tipos están duplicados desde el closure interno de `components/ventas-module.tsx`
// (líneas ~72-118 y ~141-152). Si la fuente cambia, mantener en sync.

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

export interface ListaPrecios {
  id: number
  nombre: string
  tipo: string
  moneda_base: "ARS" | "USD" | "EUR"
  incluye_iva: boolean
  activa: boolean
  no_visible: boolean
  visible_en_ot?: boolean
  dias_validez: number
  estado: "borrador" | "creada" | "activa" | "inactiva"
  tipo_cotizacion: "oficial" | "blue" | "ccl" | "mep" | "divisa" | "billete"
  usuarios_admin: number[]
  usuarios_habilitados: number[]
  observaciones_filtro: string
  seguimiento?: SeguimientoEntry[]
}

export interface LineaListaPrecios {
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

export interface VersionListaPrecios {
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

export interface ProductoMaestro {
  id: number
  sku: string
  nombre: string
  descripcion?: string
  precio_venta?: number
  costo?: number
  costo_manual?: number
  moneda_costo?: "ARS" | "USD"
  stock?: number
  categoria?: string
  requiere_serie?: boolean
}

export interface UsuarioVendedor {
  id: number
  nombre: string
  activo?: boolean
}

export interface MonedaItem {
  id: number
  codigo: string
  nombre: string
  simbolo: string
  es_base: boolean
}

// ─── Helpers ───────────────────────────────────────────────

export { formatCurrency } from "@/lib/format"

export function formatPrecioForzadoARS(amount: number) {
  const formatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
  return `ARS ${formatted}`
}

// Mapea la respuesta cruda de /api/productos al shape que usa el grilla de líneas
export function mapearProductos(data: any[]): ProductoMaestro[] {
  return (data ?? []).map(p => ({
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

// Normaliza una lista cruda de la API al shape que espera el frontend
export function normalizarLista(l: any): ListaPrecios {
  return {
    ...l,
    moneda_base: l.moneda_base ?? l.moneda ?? "ARS",
    estado: l.estado ?? (l.activa ? "activa" : "borrador"),
    tipo_cotizacion: l.tipo_cotizacion ?? "blue",
  }
}
