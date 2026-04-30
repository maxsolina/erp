"use client"

// Modulo de Ventas - Cell Home ERP v5
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useClientes } from "@/hooks/use-clientes"
import { crearCliente as apiCrearCliente, actualizarCliente as apiActualizarCliente } from "@/hooks/use-clientes"
import type { ClienteDB } from "@/hooks/use-clientes"
import { useERP } from "@/contexts/erp-context"
import { fetchDepositos, fetchUbicaciones } from "@/lib/stock-actions"
import { getCategoriaProveedores } from "@/lib/categorias-proveedor-actions"
import { Search, Filter, ChevronDown, ChevronRight, X, Plus, FileText, Truck, Receipt, CreditCard, Users, DollarSign, Package, ArrowRight, ArrowLeft, ArrowRightLeft, Eye, Edit, Trash2, Download, Mail, CheckCircle, Clock, AlertCircle, XCircle, MoreHorizontal, Building2, MapPin, Phone, Globe, Calendar, Tag, Percent, Star, TrendingUp, RefreshCw, User, Warehouse, Save, MessageSquare, Repeat, Smartphone, Battery, Camera, Monitor, Layers, Copy, Upload, History, Banknote } from "lucide-react"
 import BotonVolver from "./ui/boton-volver"
import ProductoDropdown from "./producto-dropdown"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "./odoo-filter-bar"
import { ModalMedioPago } from "./modal-medio-pago"
import type { MedioPagoResult } from "./modal-medio-pago"
import type { Tarjeta as TarjetaFinanzas, GrupoTarjeta as GrupoTarjetaFinanzas, RecargoTarjeta as RecargoTarjetaFinanzas, RecargoTarjeta } from "./modulo-finanzas"
import CriteriosCotizador from "./criterios-cotizador"

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
  categoria_id: number | null
  categoria_nombre?: string | null
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
  cuenta_cobrar_id: string | null   // UUID → contabilidad_plan_cuentas
  cuenta_cobrar_codigo?: string     // ej. '11030101'
  cuenta_cobrar_nombre?: string     // ej. 'Deudores por Ventas'
  seguimiento?: SeguimientoEntry[]
}

interface ListaPrecios {
  id: number
  nombre: string
  tipo: string
  moneda_base: "ARS" | "USD" | "EUR"
  incluye_iva: boolean
  activa: boolean
  no_visible: boolean
  dias_validez: number
  estado: "borrador" | "creada" | "activa" | "inactiva"
  tipo_cotizacion: "oficial" | "blue" | "ccl" | "mep" | "divisa" | "billete"
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
  costo_manual?: number
  moneda_costo?: "ARS" | "USD"
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
  iva: number
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
  estado: "borrador" | "a_facturar" | "verificacion_factura" | "verificacion_oe" | "finalizada" | "cancelada" | "abierta" | "facturada" | "parcial"
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
  estado: "borrador" | "esperando" | "parcial" | "disponible" | "confirmada" | "finalizada"
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

interface RemitoLinea {
  producto_id: number
  producto_nombre: string
  cantidad: number
  requiere_serie: boolean
  series_seleccionadas: { id: number; serie: string; detalles?: string }[]
}

interface Remito {
  id: number
  numero: string
  orden_entrega_id: number
  orden_entrega_numero: string
  nota_venta_id?: number
  nota_venta_numero: string
  sucursal: string
  deposito: string
  deposito_id?: number
  ubicacion_id?: number
  ubicacion?: string
  peso_kg: number
  peso_neto_kg: number
  bultos: number
  valor_declarado: number
  control_factura: "facturado" | "pendiente"
  asiento_id?: string | null
  lineas?: RemitoLinea[]
  seguimiento?: SeguimientoEntry[]
}

interface SeniaEquipo {
  id: number
  numero: string
  fecha: string
  fecha_limite: string
  estado: "en_curso" | "confirmada" | "cancelada"
  vendedor_id: number | null
  sucursal_id: number | null
  cliente_id: number
  cliente_nombre: string
  stock_item_id: number | null
  equipo_nombre: string
  equipo_imei: string | null
  equipo_color: string | null
  equipo_bateria: number | null
  precio_venta: number
  descuento: number
  precio_final: number
  moneda: 'ARS' | 'USD'
  cotizacion: number
  monto_senia: number
  medio_pago_senia: string | null
  estado_senia: "sin_senia" | "registrada"
  recibo_senia_numero: string | null
  nota_venta_numero: string | null
  nota_venta_id: number | null
  oe_numero: string | null
  oe_id: number | null
  remito_numero: string | null
  remito_id: number | null
  factura_numero: string | null
  factura_id: number | null
  medios_pago_cierre: { medio: string; monto: number }[]
  toma_equipo_id: number | null
  seguimiento?: SeguimientoEntry[]
}

interface Factura {
  id: number
  numero: string
  nota_venta_id: number
  nota_venta_numero: string
  cliente_id: number
  cliente_nombre: string
  cliente_documento: string
  estado: "borrador" | "abierta" | "confirmada" | "parcial" | "cobrada" | "conciliada" | "cancelada" | "esperando_confirmacion" | "ejecucion_senia"
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
  medios_pago_detalle?: {
    medio: string
    tarjeta_nombre?: string | null
    cuotas?: number
    grupo_nombre?: string
    monto_base: number
    iva?: number
    recargo_pct?: number
    importe_recargo?: number
    cargos?: { nombre: string; pct: number; importe: number }[]
    total_recargo: number
    total_acreditar: number
  }[]
}

interface CCResumen {
  saldo_ars: number
  saldo_usd: number
  tipo_cotizacion_usd: string
  cotizacion_referencia: number // valor referencial para mostrar equivalencia
}

interface ReciboPago {
  id: string
  recibo_id: string
  valor_id: string
  valor_nombre: string
  tipo_valor: string
  importe_comprobante: number
  moneda_comprobante: string
  importe: number
  moneda: string
  es_tarjeta: boolean
  tarjeta_nombre: string | null
  cantidad_cuotas: number
  numero_cupon: string | null
  recargo_porcentaje: number
  recargo_importe: number
  es_cheque: boolean
  cheque_id: string | null
  cupon_tarjeta_id: string | null
  // Medio de pago original (cuando el pago viene pre-cargado desde una factura).
  // Se usa para re-mapear el valor_id al cambiar de caja.
  medio_origen?: "efectivo" | "transferencia" | "tarjeta" | null
  // Bimonetario: a qué CC se imputa este pago (solo relevante para pagos en ARS)
  imputacion_cuenta: 'ARS' | 'USD' | null
  cotizacion_cruce: number | null // cotización usada si imputacion_cuenta='USD' y moneda='ARS'
  // Cotización de moneda extranjera aplicada al cobrar este valor
  cotizacion: number | null
  tipo_cotizacion: string | null
}

interface ReciboImputacion {
  id: string
  recibo_id: string
  tipo_comprobante: 'factura' | 'nota_debito'
  comprobante_id: string
  comprobante_referencia: string
  fecha_comprobante: string
  fecha_vencimiento: string
  saldo_moneda: number
  moneda_comprobante: string
  tipo_cotizacion: string
  cotizacion_original: number
  saldo_original: number
  cotizacion_actual: number
  saldo_actual: number
  asignacion: number
}

interface Recibo {
  id: string
  numero: string
  sucursal: string
  cliente_id: string | null
  cliente_nombre: string | null
  caja_id: string | null
  caja_nombre: string | null
  factura_id: number | null
  nota_venta_id: string | null
  nota_venta_numero: string | null
  cobrador_id: string | null
  cobrador_nombre: string | null
  concepto: string | null
  importe: number
  importe_no_conciliado: number
  importe_no_conciliado_ars: number
  moneda: string
  tipo_cotizacion: string | null
  cotizacion: number | null
  fecha: string
  estado: 'borrador' | 'publicado' | 'cancelado'
  fecha_publicacion: string | null
  fecha_cancelacion: string | null
  motivo_cancelacion: string | null
  observaciones: string | null
  pagos?: ReciboPago[]
  imputaciones?: ReciboImputacion[]
}

interface AjusteCliente {
  id: number
  numero: string
  cliente_id: number
  cliente_nombre: string
  estado: "borrador" | "activo" | "publicado" | "cancelado"
  fecha: string
  concepto: string
  moneda: "ARS" | "USD"
  nota_venta_numero: string | null
  sucursal: string
  categoria: string | null
  toma_equipo_id: number | null
  es_automatica: boolean | null
  lineas: {
    descripcion: string
    fecha_vencimiento: string
    importe: number
  }[]
  total: number
  saldo_disponible?: number
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



// ─── Bloque Medios de Pago (dentro de ficha de Factura) ────────────────������─────

interface LineaPago {
  id: number
  medio: "efectivo" | "transferencia" | "tarjeta"
  // Moneda en la que el cliente paga esta línea. Solo es independiente del
  // factura.moneda para "efectivo" (ARS/USD). Para tarjeta/transferencia
  // siempre coincide con factura.moneda.
  moneda: "ARS" | "USD"
  tarjeta_id?: number
  cuotas?: number
  // Monto en la moneda indicada por `moneda` (no necesariamente la de la factura)
  monto: number
  // Cotización por línea: solo se usa cuando factura.moneda === "ARS" y line.moneda === "USD"
  // (caso "Efectivo USD" sobre factura ARS — la factura no tiene cotización propia).
  tipo_cotizacion?: string
  cotizacion?: number
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
function BloquesMediosPago({
  factura,
  tarjetas,
  grupos,
  recargos,
  textoBoton = "Confirmar cobro y registrar en cuenta corriente",
  textoConfirmado = "Cobro registrado — movimientos generados en cuenta corriente.",
  onConfirmarCobro,
  onCobroConfirmado,
  onEstadoPagoChange,
}: {
  factura: Factura
  tarjetas: TarjetaFinanzas[]
  grupos: GrupoTarjetaFinanzas[]
  recargos: RecargoTarjetaFinanzas[]
  textoBoton?: string
  textoConfirmado?: string
  onConfirmarCobro?: (lineas: LineaPago[], totalConRecargos: number, totalRecargos: number) => void
  onCobroConfirmado?: (totalRecargos: number, desglose: { nombre: string; importe: number }[]) => void
  onEstadoPagoChange?: (estado: { cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }) => void
}) {
  const [lineas, setLineas] = useState<LineaPago[]>([])
  const [cobrado, setCobrado] = useState(false)
  const [tiposCotizacion, setTiposCotizacion] = useState<string[]>([])

  // Cargar tipos de cotización disponibles (blue, oficial, etc.)
  useEffect(() => {
    fetch('/api/contabilidad/tipos-cotizacion?activo=true')
      .then(r => r.json())
      .then((tipos: { nombre: string }[] | unknown) => {
        if (Array.isArray(tipos) && tipos.length > 0) {
          setTiposCotizacion(tipos.map(t => t.nombre))
        }
      })
      .catch(() => {})
  }, [])

  // Pide la última cotización para un tipo dado (USD/ARS)
  const fetchCotizacion = async (tipo: string): Promise<number> => {
    try {
      const r = await fetch(`/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=${tipo}&latest=true`)
      const d = await r.json()
      return Number(d?.tasa) > 0 ? Number(d.tasa) : 0
    } catch { return 0 }
  }

  // Resuelve la cotización a usar para convertir entre moneda de línea y moneda de factura.
  // - Si factura es USD: la cotización viene de la factura.
  // - Si factura es ARS y línea es USD: la cotización es por línea (tipo_cotizacion + cotizacion).
  const cotizacionParaLinea = (linea: { moneda: "ARS" | "USD"; cotizacion?: number }): number => {
    const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
    if (linea.moneda === monedaFac) return 1
    if (monedaFac === "USD") return factura.cotizacion ?? 0
    return linea.cotizacion ?? 0
  }

  // Convierte un monto en una moneda dada al equivalente en la moneda de la factura.
  const montoEnFacturaMoneda = (monto: number, monedaLinea: "ARS" | "USD", cotizacionLinea?: number): number => {
    const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
    if (monedaLinea === monedaFac) return monto
    const cot = monedaFac === "USD" ? (factura.cotizacion ?? 0) : (cotizacionLinea ?? 0)
    if (cot <= 0) return 0
    if (monedaLinea === "USD" && monedaFac === "ARS") return monto * cot
    if (monedaLinea === "ARS" && monedaFac === "USD") return monto / cot
    return monto
  }

  // Convierte un monto desde la moneda de la factura a otra moneda destino.
  const montoDesdeFacturaMoneda = (montoFac: number, monedaDestino: "ARS" | "USD", cotizacionLinea?: number): number => {
    const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
    if (monedaDestino === monedaFac) return montoFac
    const cot = monedaFac === "USD" ? (factura.cotizacion ?? 0) : (cotizacionLinea ?? 0)
    if (cot <= 0) return 0
    if (monedaFac === "USD" && monedaDestino === "ARS") return montoFac * cot
    if (monedaFac === "ARS" && monedaDestino === "USD") return montoFac / cot
    return montoFac
  }

  const sumarEnFacturaMoneda = (lns: LineaPago[]) =>
    lns.reduce((s, l) => s + montoEnFacturaMoneda(l.monto || 0, l.moneda, l.cotizacion), 0)

  // Notificar estado al padre cada vez que cambie algo relevante
  useEffect(() => {
    const totalIngresado = sumarEnFacturaMoneda(lineas)
    const diferencia = totalIngresado - factura.total
    onEstadoPagoChange?.({
      cobrado,
      tieneLineas: lineas.length > 0 && totalIngresado > 0,
      diferenciaOk: Math.abs(diferencia) <= 0.5,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, cobrado, factura.total, factura.moneda, factura.cotizacion])
  const CUOTAS_OPTS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

  const formatARS = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n)

  const formatMoneda = (n: number, moneda: "ARS" | "USD") =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: moneda, minimumFractionDigits: 2 }).format(n)

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
    const yaIngresado = sumarEnFacturaMoneda(lineas)
    const monedaDefault = (factura.moneda ?? "ARS") as "ARS" | "USD"
    const restanteFac = esLaPrimera ? 0 : Math.max(0, factura.total - yaIngresado)
    const restanteEnMonedaDefault = montoDesdeFacturaMoneda(restanteFac, monedaDefault)
    setLineas(prev => [...prev, { id: Date.now(), medio: "efectivo", moneda: monedaDefault, monto: restanteEnMonedaDefault }])
  }

  const actualizarLinea = (id: number, cambios: Partial<LineaPago>) => {
    setLineas(prev => prev.map(l => l.id === id ? { ...l, ...cambios } : l))
  }

  // Cambia el medio (incluyendo moneda en caso de "efectivo") y recalcula el
  // monto sugerido basado en lo que falta para cubrir la factura.
  const cambiarMedio = async (id: number, opcion: "efectivo_ars" | "efectivo_usd" | "transferencia" | "tarjeta") => {
    let medio: LineaPago["medio"] = "efectivo"
    let moneda: "ARS" | "USD" = (factura.moneda ?? "ARS") as "ARS" | "USD"
    if (opcion === "efectivo_ars") { medio = "efectivo"; moneda = "ARS" }
    else if (opcion === "efectivo_usd") { medio = "efectivo"; moneda = "USD" }
    else if (opcion === "transferencia") { medio = "transferencia"; moneda = (factura.moneda ?? "ARS") as "ARS" | "USD" }
    else if (opcion === "tarjeta") { medio = "tarjeta"; moneda = (factura.moneda ?? "ARS") as "ARS" | "USD" }

    // Si la moneda de la línea difiere de la factura y la factura es ARS,
    // pre-cargar tipo_cotizacion + cotización del primer tipo disponible.
    let tipoCotLinea: string | undefined
    let cotLinea: number | undefined
    const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
    if (moneda !== monedaFac && monedaFac === "ARS") {
      tipoCotLinea = tiposCotizacion[0] || "blue"
      cotLinea = await fetchCotizacion(tipoCotLinea)
    }

    setLineas(prev => {
      const restoDeLineas = prev.filter(l => l.id !== id)
      const yaIngresadoExclu = sumarEnFacturaMoneda(restoDeLineas)
      const restanteFac = Math.max(0, factura.total - yaIngresadoExclu)
      const montoSugerido = montoDesdeFacturaMoneda(restanteFac, moneda, cotLinea)
      return prev.map(l => l.id === id
        ? { ...l, medio, moneda, monto: montoSugerido, tarjeta_id: undefined, cuotas: undefined, tipo_cotizacion: tipoCotLinea, cotizacion: cotLinea }
        : l
      )
    })
  }

  // Cambia el tipo de cotización en una línea: re-fetchea la tasa y recalcula el monto sugerido.
  const cambiarTipoCotizacionLinea = async (id: number, tipo: string) => {
    const cot = await fetchCotizacion(tipo)
    setLineas(prev => {
      const linea = prev.find(l => l.id === id)
      if (!linea) return prev
      const restoDeLineas = prev.filter(l => l.id !== id)
      const yaIngresadoExclu = sumarEnFacturaMoneda(restoDeLineas)
      const restanteFac = Math.max(0, factura.total - yaIngresadoExclu)
      const montoSugerido = montoDesdeFacturaMoneda(restanteFac, linea.moneda, cot)
      return prev.map(l => l.id === id
        ? { ...l, tipo_cotizacion: tipo, cotizacion: cot, monto: montoSugerido }
        : l
      )
    })
  }

  const eliminarLinea = (id: number) => {
    setLineas(prev => prev.filter(l => l.id !== id))
  }

  // Totales (todos en moneda de la factura)
  const totalRecargos = lineas.reduce((sum, l) => {
    const c = calcularLinea(l)
    return sum + (c?.totalRecargo || 0)
  }, 0)
  const totalIngresado = sumarEnFacturaMoneda(lineas)
  const totalConRecargos = totalIngresado + totalRecargos
  const totalEsperado = factura.total + totalRecargos
  const diferencia = totalIngresado - factura.total

  if (cobrado) {
    return (
      <div className="mt-6 border-t pt-4">
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm">
          <CheckCircle className="w-4 h-4" />
          {textoConfirmado}
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
          // Monto ingresado por las OTRAS líneas (excluye esta), en moneda de factura
          const montoOtrasFac = lineas.filter(l => l.id !== linea.id).reduce((s, l) => s + montoEnFacturaMoneda(l.monto || 0, l.moneda, l.cotizacion), 0)
          const restanteParaEstaLineaFac = factura.total - montoOtrasFac
          const restanteParaEstaLineaEnMonedaLinea = montoDesdeFacturaMoneda(restanteParaEstaLineaFac, linea.moneda, linea.cotizacion)
          const excedeLimite = (linea.monto || 0) > restanteParaEstaLineaEnMonedaLinea + 0.5
          const opcionMedio = linea.medio === "efectivo"
            ? (linea.moneda === "USD" ? "efectivo_usd" : "efectivo_ars")
            : linea.medio
          const monedaFac = (factura.moneda ?? "ARS") as "ARS" | "USD"
          const requiereCotizacionLinea = linea.moneda !== monedaFac && monedaFac === "ARS"
          const cotizacionResuelta = cotizacionParaLinea(linea)
          const faltaCotizacion = requiereCotizacionLinea && cotizacionResuelta <= 0
          return (
            <div key={linea.id} className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Fila de inputs */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50">
                <select
                  value={opcionMedio}
                  onChange={e => cambiarMedio(linea.id, e.target.value as "efectivo_ars" | "efectivo_usd" | "transferencia" | "tarjeta")}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="efectivo_ars">Efectivo ARS</option>
                  <option value="efectivo_usd">Efectivo USD</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>

                {requiereCotizacionLinea && (
                  <select
                    value={linea.tipo_cotizacion || ""}
                    onChange={e => cambiarTipoCotizacionLinea(linea.id, e.target.value)}
                    title={cotizacionResuelta > 0 ? `1 USD = ${cotizacionResuelta.toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS` : "Sin cotización configurada"}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {tiposCotizacion.length === 0 && <option value="">—</option>}
                    {tiposCotizacion.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                )}

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
                        checked={Math.abs(linea.monto - restanteParaEstaLineaEnMonedaLinea) < 0.5 && restanteParaEstaLineaEnMonedaLinea > 0}
                        onChange={e => actualizarLinea(linea.id, { monto: e.target.checked ? restanteParaEstaLineaEnMonedaLinea : 0 })}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">Todo efectivo</span>
                    </label>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium shrink-0">{linea.moneda}</span>
                      <MontoInputField
                        value={linea.monto || 0}
                        onChange={val => actualizarLinea(linea.id, { monto: val })}
                        disabled={linea.medio === "tarjeta" && !linea.tarjeta_id}
                        title={linea.medio === "tarjeta" && !linea.tarjeta_id ? "Seleccioná una tarjeta primero" : undefined}
                        hasError={excedeLimite}
                      />
                    </div>
                    {linea.medio === "efectivo" && linea.moneda !== monedaFac && linea.monto > 0 && cotizacionResuelta > 0 && (
                      <span className="text-xs text-gray-500">
                        ≈ {formatMoneda(montoEnFacturaMoneda(linea.monto, linea.moneda, linea.cotizacion), monedaFac)}
                      </span>
                    )}
                    {excedeLimite && (
                      <span className="text-xs text-red-600 font-medium">
                        Supera el total a abonar ({formatMoneda(restanteParaEstaLineaEnMonedaLinea, linea.moneda)})
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
          className="mt-3 w-full py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {textoBoton}
        </button>
      )}
    </div>
  )
}

// ─── CuentaContableSelector ───────────────────────────────────────────────────
// Busca cuentas en contabilidad_plan_cuentas y permite seleccionar una por código
function CuentaContableSelector({ value, onChange }: { value: string; onChange: (id: string, codigo?: string, nombre?: string) => void }) {
  const [query, setQuery] = React.useState("")
  const [opciones, setOpciones] = React.useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [abierto, setAbierto] = React.useState(false)
  const [seleccionada, setSeleccionada] = React.useState<{ id: string; codigo: string; nombre: string } | null>(null)

  // Cargar la cuenta actual si viene de DB
  React.useEffect(() => {
    if (!value) { setSeleccionada(null); return }
    fetch(`/api/contabilidad/cuentas?id=${value}`)
      .then(r => r.json())
      .then(data => {
        if (data?.data) setSeleccionada(data.data)
      })
      .catch(() => {})
  }, [value])

  React.useEffect(() => {
    if (!abierto) { setOpciones([]); return }
    const t = setTimeout(() => {
      const qs = query.trim()
      const url = qs.length > 0
        ? `/api/contabilidad/cuentas?q=${encodeURIComponent(qs)}&limit=20`
        : `/api/contabilidad/cuentas?q=&limit=20`
      fetch(url)
        .then(r => r.json())
        .then(data => setOpciones(Array.isArray(data?.data) ? data.data : []))
        .catch(() => {})
    }, query.length > 0 ? 300 : 0)
    return () => clearTimeout(t)
  }, [query, abierto])

  return (
    <div className="relative">
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-emerald-500 bg-white cursor-pointer flex items-center justify-between"
        onClick={() => setAbierto(v => !v)}
      >
        <span className={seleccionada ? "text-gray-900 font-mono text-sm" : "text-gray-400 text-sm"}>
          {seleccionada ? `${seleccionada.codigo} — ${seleccionada.nombre}` : "Buscar cuenta contable..."}
        </span>
        {seleccionada && (
          <button type="button" className="text-gray-400 hover:text-red-500 ml-2"
            onClick={(e) => { e.stopPropagation(); setSeleccionada(null); onChange("") }}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {abierto && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Código o nombre..."
            className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            {opciones.length === 0 && query.length >= 2 && (
              <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
            )}
            {opciones.map(op => (
              <div key={op.id}
                className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer flex items-center gap-2"
                onClick={() => { setSeleccionada(op); onChange(op.id, op.codigo, op.nombre); setAbierto(false); setQuery("") }}>
                <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{op.codigo}</span>
                <span className="text-gray-800">{op.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── VentasListSection (wrapper reutilizable con OdooFilterBar) ───────────────
function VentasListSection<T extends object>({
  title, subtitle, moduleName, data, searchFields, filterFields, actions, children, emptyMessage,
}: {
  title: string
  subtitle?: string
  moduleName: string
  data: T[]
  searchFields: (keyof T)[]
  filterFields: { field: keyof T; label: string }[]
  actions?: React.ReactNode
  children: (filtered: T[]) => React.ReactNode
  emptyMessage?: string
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
      <div className="mt-4">
        {children(filtered)}
      </div>
    </div>
  )
}

// === Componente ModuloVentas ===
export type { ClienteVenta }

interface ModuloVentasProps {
  clientesIniciales?: ClienteVenta[]
  onNuevoCliente?: (c: ClienteVenta) => void
}

// Mapeo de id del sidebar de Ventas al sub-vista del catálogo (catalogo_permisos).
const SIDEBAR_VENTAS_TO_VISTA: Record<string, string | null> = {
  listado:             "clientes",
  conciliacion:        "conciliacion",
  ajustes:             "ajustes",
  notas_venta:         "notas_venta",
  toma_equipo:         "toma_equipo",
  senia_equipo:        "senia_equipo",
  ordenes_entrega:     "ordenes_entrega",
  remitos:             "remitos",
  facturas:            "facturas",
  notas_debito:        "notas_debito",
  notas_credito:       "notas_credito",
  recibos:             "recibos",
  listas_precios:      "listas_precios",
  versiones_lista:     "versiones_lista",
  categorias_cliente:  "categorias_cliente",
  criterios_cotizador: "criterios_cotizador",
  nc_categorias:       "nc_categorias",
}

export default function ModuloVentas({ clientesIniciales, onNuevoCliente }: ModuloVentasProps = {}) {
  const { sucursales, sucursalActiva, currentUser, canSee } = useERP()
  const [depositos, setDepositos] = useState<{ id: number; nombre: string; codigo: string; sucursal_id?: number | null }[]>([])
  const [ubicaciones, setUbicaciones] = useState<{ id: number; deposito_id: number; codigo: string; nombre: string }[]>([])
  useEffect(() => {
    fetchDepositos().then(d => setDepositos(Array.isArray(d) ? d : [])).catch(console.error)
    fetchUbicaciones().then(u => setUbicaciones(Array.isArray(u) ? u : [])).catch(console.error)
  }, [])

  // Sincronizar depósito default con la sucursal activa cuando carguen los depósitos
  useEffect(() => {
    if (!depositos.length) return
    const match = depositos.find(d => (d.sucursal_id && sucursalActiva?.id ? d.sucursal_id === sucursalActiva.id : d.nombre === sucursalActiva?.nombre))
    const defaultDeposito = match ?? depositos[0]
    if (!defaultDeposito) return
    setNvDepositoId(defaultDeposito.id)
    const ubicacionStock = ubicaciones.find(u => u.deposito_id === defaultDeposito.id && u.nombre === "Stock")
      ?? ubicaciones.find(u => u.deposito_id === defaultDeposito.id)
    if (ubicacionStock) setNvUbicacionId(ubicacionStock.id)
  }, [depositos, ubicaciones, sucursalActiva])

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
  
  // Categorías de clientes — debe declararse antes del useMemo de clientes
  const [categoriasCliente, setCategoriasCliente] = useState<CategoriaCliente[]>([])

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
    categoria_id: c.categoria_id ?? null,
    categoria_nombre: categoriasCliente.find(cat => cat.id === c.categoria_id)?.nombre ?? null,
    vendedor_id: c.vendedor_id,
    cobrador_id: null,
    lista_precios_id: c.lista_precios_id ?? null,
    descuento_default: 0,
    moneda_cuenta_corriente: "ARS" as "ARS" | "USD",
    termino_pago_id: c.termino_pago_id ?? null,
    activo: c.activo,
    es_confidencial: false,
    sucursal_origen: "Puerto Norte",
    fecha_alta: c.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    saldo_cuenta_corriente: c.saldo_cuenta_corriente,
    total_facturado: c.total_facturado,
    seguimiento: []
  })), [clientesDB, categoriasCliente])
  const setClientes = useCallback((_updater: any) => {
    // Los cambios ahora se persisten via API y se refresca con mutateClientes
    mutateClientes()
  }, [mutateClientes])

  // Helper para construir ClienteVenta desde form
  const buildClienteFromForm = useCallback((formData: FormData, editingItem: ClienteVenta | null, formClienteCategoriaId: number | null, categoriasCliente: { id: number, nombre: string }[]): ClienteVenta => {
    const catObj = categoriasCliente.find(c => c.id === formClienteCategoriaId)
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
      categoria_id: formClienteCategoriaId ?? editingItem?.categoria_id ?? null,
      categoria_nombre: catObj?.nombre ?? editingItem?.categoria_nombre ?? null,
      vendedor_id: parseInt(formData.get("vendedor_id") as string) || null,
      cobrador_id: null,
      lista_precios_id: parseInt(formData.get("lista_precios_id") as string) || null,
      descuento_default: parseFloat(formData.get("descuento_default") as string) || 0,
      moneda_cuenta_corriente: editingItem?.moneda_cuenta_corriente || "ARS",
      termino_pago_id: parseInt(formData.get("termino_pago_id") as string) || null,
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
      termino_pago_id: newCliente.termino_pago_id || null, vendedor_id: newCliente.vendedor_id || null,
      lista_precios_id: newCliente.lista_precios_id || null, activo: true,
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

  const [notasVenta, setNotasVenta] = useState<NotaVenta[]>([])
  const [ordenesEntrega, setOrdenesEntrega] = useState<OrdenEntrega[]>([])
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [recibosLoaded, setRecibosLoaded] = useState(false)
  const [ajustes, setAjustes] = useState<AjusteCliente[]>([])
  const [movimientosCC, setMovimientosCC] = useState<MovimientoCuentaCorriente[]>([])

  // Tarjetas, grupos y recargos cargados desde DB (no usar mocks)
  const [tarjetasDB, setTarjetasDB] = useState<TarjetaFinanzas[]>([])
  const [gruposDB, setGruposDB] = useState<GrupoTarjetaFinanzas[]>([])
  const [recargosDB, setRecargosDB] = useState<RecargoTarjetaFinanzas[]>([])

  useEffect(() => {
    fetch("/api/tarjetas").then(r => r.json()).then(d => setTarjetasDB(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/grupos-tarjeta").then(r => r.json()).then(d => setGruposDB(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/recargos-tarjeta").then(r => r.json()).then(d => setRecargosDB(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

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
  const [confirmandoRemito, setConfirmandoRemito] = useState(false)

  const handleConfirmarEntregaRemito = async (remito: Remito) => {
    if (confirmandoRemito) return
    setConfirmandoRemito(true)
    try {
      // Construir las líneas desde remito.lineas o remito.productos como fallback
      const fuenteLineas = (remito.lineas && remito.lineas.length > 0)
        ? remito.lineas
        : (remito.productos ?? [])

      const lineas = fuenteLineas.map((l: any) => ({
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre ?? l.nombre ?? "",
        cantidad: l.cantidad ?? 1,
        requiere_serie: l.requiere_serie ?? false,
        series_seleccionadas: l.series_seleccionadas ?? l.series ?? [],
      }))
      const res = await fetch(`/api/remitos/${remito.id}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remito_numero: remito.numero,
          nv_numero: remito.nota_venta_numero ?? null,
          oe_numero: remito.orden_entrega_numero ?? null,
          deposito_id: remito.deposito_id ?? null,
          deposito_nombre: remito.deposito ?? null,
          ubicacion_id: remito.ubicacion_id ?? null,
          ubicacion_nombre: remito.ubicacion ?? null,
          usuario: "admin",
          lineas,
        }),
      })

      const data = await res.json()

      if (res.ok && data.ok) {
        // Actualizar estado local del remito a entregado
        const remitoActualizado: Remito = {
          ...remito,
          estado: "entregado",
        }
        setRemitos(prev => prev.map(r => r.id === remito.id ? remitoActualizado : r))
        setSelectedRemito(remitoActualizado)
        alert(`Entrega confirmada. ${data.movimientos_registrados} movimiento(s) de stock registrado(s).`)
      } else {
        const msgs = data.errores?.join("\n") ?? data.error ?? "Error al confirmar"
        alert(`Hubo problemas al confirmar:\n${msgs}`)
      }
    } catch (e) {
      alert("Error de red al confirmar la entrega")
    } finally {
      setConfirmandoRemito(false)
    }
  }
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null)
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [editandoCliente, setEditandoCliente] = useState(false)
  const [creandoNV, setCreandoNV] = useState(false)
  const [guardandoNV, setGuardandoNV] = useState(false)
  const [editingNVId, setEditingNVId] = useState<number | null>(null)
  const [creandoOE, setCreandoOE] = useState(false)
  const [creandoFactura, setCreandoFactura] = useState(false)
  const [facturaPrevisualizando, setFacturaPrevisualizando] = useState(false)
  const [creandoRecibo, setCreandoRecibo] = useState(false)
  const [editandoRecibo, setEditandoRecibo] = useState(false)
  const [showCancelarReciboModal, setShowCancelarReciboModal] = useState(false)
  const [cancelarReciboMotivo, setCancelarReciboMotivo] = useState("")
  const [cancelarReciboDescripcion, setCancelarReciboDescripcion] = useState("")
  const [conciliacionRevertiendoId, setConciliacionRevertiendoId] = useState<number | null>(null)
  
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
  const [conciliacionSeleccionDebitos, setConciliacionSeleccionDebitos] = useState<{id: number; tipo: "factura" | "nd"; moneda: "ARS" | "USD"; montoAplicar: number}[]>([])
  const [conciliacionSeleccionCreditos, setConciliacionSeleccionCreditos] = useState<{id: number; tipo: "recibo" | "nc"; moneda: "ARS" | "USD"; montoAplicar: number}[]>([])
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
      debito_moneda?: string
      credito_moneda?: string
      cotizacion?: number | null
    }[]
    total_conciliado: number
    usuario: string
    estado: 'activa' | 'cancelada'
    fecha_cancelacion?: string | null
    esRecibo?: boolean
    reciboNumero?: string
  }[]>([])
  const [conciliacionTab, setConciliacionTab] = useState<"conciliar" | "historial">("conciliar")
  const [conciliacionFiltroNV, setConciliacionFiltroNV] = useState<string>("")
  const [conciliacionFiltroConciliado, setConciliacionFiltroConciliado] = useState<"no" | "si" | "todos">("no")
  const [conciliacionMostrarTodosDebitos, setConciliacionMostrarTodosDebitos] = useState(false)
  const [conciliacionMostrarTodosCreditos, setConciliacionMostrarTodosCreditos] = useState(false)
  const [conciliacionFiltroTextoDebitos, setConciliacionFiltroTextoDebitos] = useState("")
  const [conciliacionFiltroTextoCreditos, setConciliacionFiltroTextoCreditos] = useState("")
  const [conciliacionMonedaHistorial, setConciliacionMonedaHistorial] = useState<"todos" | "ARS" | "USD">("todos")
  const [conciliacionEjecutando, setConciliacionEjecutando] = useState(false)
  const [conciliacionCotizacion, setConciliacionCotizacion] = useState<number>(0)
  
  // Estados para formularios de creacion
  const [oeNvId, setOeNvId] = useState<number | null>(null)
  const [oeProductos, setOeProductos] = useState<{producto_id: number; producto_nombre: string; cantidad: number; reserva: number; estado: "pendiente" | "confirmado"}[]>([])
  const [facturaClienteId, setFacturaClienteId] = useState<number | null>(null)
  const [facturaListaPreciosId, setFacturaListaPreciosId] = useState<number>(1)
  const [facturaMoneda, setFacturaMoneda] = useState<"ARS" | "USD">("ARS")
  const [facturaCotizacion, setFacturaCotizacion] = useState<number>(1)
  const [facturaLineas, setFacturaLineas] = useState<{producto_nombre: string; descripcion: string; cantidad: number; precio_unitario: number; descuento: number; subtotal: number; producto_id?: number}[]>([])
  const [reciboClienteIdForm, setReciboClienteIdForm] = useState<string | null>(null)
  const [reciboFacturaIdForm, setReciboFacturaIdForm] = useState<number | null>(null)
  const [reciboPagosForm, setReciboPagosForm] = useState<ReciboPago[]>([])
  const [reciboImputacionesForm, setReciboImputacionesForm] = useState<ReciboImputacion[]>([])
  // Cuenta corriente bimonetaria del cliente seleccionado en el recibo
  const [reciboCCResumen, setReciboCCResumen] = useState<CCResumen | null>(null)
  const [reciboCCCargando, setReciboCCCargando] = useState(false)
  const [reciboFiltroARS, setReciboFiltroARS] = useState("")
  const [reciboFiltroUSD, setReciboFiltroUSD] = useState("")
  const [reciboTodosARS, setReciboTodosARS] = useState(false)
  const [reciboTodosUSD, setReciboTodosUSD] = useState(false)
  const [reciboMontoForm, setReciboMontoForm] = useState<number>(0)
  const [reciboPrevisualizando, setReciboPrevisualizando] = useState(false)
  const [reciboCajaId, setReciboCajaId] = useState<string>("")
  const [reciboMoneda, setReciboMoneda] = useState<string>("ARS")
  const [reciboTipoCotizacion, setReciboTipoCotizacion] = useState<string>("")
  const [reciboCotizacion, setReciboCotizacion] = useState<number>(0)
  const [reciboConcepto, setReciboConcepto] = useState<string>("")
  const [reciboCobradorNombre, setReciboCobradorNombre] = useState<string>("")
  const [reciboNvId, setReciboNvId] = useState<string>("")
  const [reciboObservaciones, setReciboObservaciones] = useState<string>("")
  const [reciboTab, setReciboTab] = useState<string>("pagos")
  const [reciboCajasDisponibles, setReciboCajasDisponibles] = useState<{id: string; nombre: string; sucursal: string}[]>([])
  const [reciboValoresCaja, setReciboValoresCaja] = useState<{id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string}[]>([])
  const [reciboGuardando, setReciboGuardando] = useState(false)
  const [confirmandoFactura, setConfirmandoFactura] = useState(false)
  const [reciboPublicando, setReciboPublicando] = useState(false)
  const [showAddPagoModal, setShowAddPagoModal] = useState(false)
  
  // Vendedores cargados desde Supabase
  const [vendedores, setVendedores] = useState<Vendedor[]>([])

  // Estados para Categorías de NC
  const [ncCategorias, setNcCategorias] = useState<NcCategoria[]>([])
  const [ncCategoriaNombre, setNcCategoriaNombre] = useState("")
  const [ncCategoriaCreando, setNcCategoriaCreando] = useState(false)
  const [ncCategoriaLoading, setNcCategoriaLoading] = useState(false)
  const [ncCategoriaEditId, setNcCategoriaEditId] = useState<number | null>(null)
  const [ncCategoriaEditNombre, setNcCategoriaEditNombre] = useState("")

  const [terminosPago, setTerminosPago] = useState<TerminoPago[]>([])
  const [tiposListaPrecios, setTiposListaPrecios] = useState<string[]>([])

  // Cargar vendedores y nc_categorias desde Supabase
  useEffect(() => {
    const cargar = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const [{ data: vData }, { data: ncData }] = await Promise.all([
        supabase.from("vendedores").select("id, nombre, activo").order("nombre"),
        supabase.from("nc_categorias").select("*").order("nombre"),
      ])
      if (vData) setVendedores(vData)
      if (ncData) setNcCategorias(ncData)
    }
    cargar()
    fetch("/api/terminos-pago").then(r => r.json()).then(d => setTerminosPago(Array.isArray(d) ? d : [])).catch(console.error)
    fetch("/api/tipos-lista-precios").then(r => r.json()).then(d => setTiposListaPrecios(Array.isArray(d) ? d.map((t: {nombre: string}) => t.nombre) : [])).catch(console.error)
  }, [])

  // Pre-cargar cotización blue USD al montar el módulo + resetear estado de ejecución
  useEffect(() => {
    setConciliacionEjecutando(false)
    fetch('/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tasa) setConciliacionCotizacion(Number(d.tasa)) })
      .catch(() => {})
  }, [])

  // Cargar últimas cotizaciones USD por tipo (todas en una sola query, agrupando)
  useEffect(() => {
    fetch('/api/contabilidad/cotizaciones?moneda_codigo=USD')
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return
        const byTipo: Record<string, number> = {}
        // rows ya viene ordenado por fecha desc, id desc → la primera ocurrencia de cada tipo es la última
        for (const r of rows) {
          if (r?.tipo && byTipo[r.tipo] === undefined) {
            byTipo[r.tipo] = Number(r.tasa ?? r.valor ?? 0)
          }
        }
        setCotizacionesUsdPorTipo(byTipo)
      })
      .catch(() => {})
  }, [])

  // Estados para Categorías de Clientes
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaCliente | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCliente | null>(null)
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [modoEdicionCategoria, setModoEdicionCategoria] = useState(false)
  const [categoriaSearchText, setCategoriaSearchText] = useState("")

  // Estado categoría seleccionada en form cliente
  const [formClienteCategoriaId, setFormClienteCategoriaId] = useState<number | null>(null)
  const [formClienteListaPreciosId, setFormClienteListaPreciosId] = useState<number | null>(null)

  // Estados para Listas de Precios
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [versionesLista, setVersionesLista] = useState<VersionListaPrecios[]>([])
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
  // Toggles "mostrar archivadas" — patrón Odoo: por default solo activos
  const [mostrarInactivasListas, setMostrarInactivasListas] = useState(false)
  const [mostrarInactivasVersiones, setMostrarInactivasVersiones] = useState(false)
  const [versionFilterLista, setVersionFilterLista] = useState<number | null>(null)
  const [listaPreciosTab, setListaPreciosTab] = useState<"versiones" | "filtros" | "usuarios_admin" | "usuarios_habilitados">("versiones")
  const [editandoLineas, setEditandoLineas] = useState(false)
  const [nuevaLineaVersion, setNuevaLineaVersion] = useState<Partial<LineaListaPrecios>>({})
  const [errorLineaPendiente, setErrorLineaPendiente] = useState(false)
  const [modalNuevaVersionBasada, setModalNuevaVersionBasada] = useState(false)
  const [nuevaVersionBasadaForm, setNuevaVersionBasadaForm] = useState({ nombre: "", fecha_inicial: "", fecha_final: "", copiar_lineas: true })

  // Monedas desde contabilidad_monedas
  const [monedas, setMonedas] = useState<{ id: number; codigo: string; nombre: string; simbolo: string; es_base: boolean }[]>([])

  // Estados para lista de precios y productos reales en NV
  const [nvListaPreciosId, setNvListaPreciosId] = useState<number | null>(null)
  const [productosNV, setProductosNV] = useState<ProductoVenta[]>([])
  const [productosNVCargando, setProductosNVCargando] = useState(false)
  // Maestro de productos reales (todos los productos de la DB, para selectores de lista de precios)
  const [productosMaestro, setProductosMaestro] = useState<ProductoVenta[]>([])

  // Estados para ubicación de stock en NV — se inicializan al depósito de la sucursal activa
  const [nvDepositoId, setNvDepositoId] = useState<number>(0)
  const [nvUbicacionId, setNvUbicacionId] = useState<number>(0)
  const [nvPrevisualizando, setNvPrevisualizando] = useState(false) // Para mostrar vista previa antes de confirmar
  
  // Estados para modal de selección de series/IMEI
  const [showSerieModal, setShowSerieModal] = useState(false)
  const [serieModalLineaIndex, setSerieModalLineaIndex] = useState<number | null>(null)
  const [seriesSeleccionadasTemp, setSeriesSeleccionadasTemp] = useState<number[]>([])
  const [serieModalBusqueda, setSerieModalBusqueda] = useState<string>('')
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
        estado: "disponible",
      })
      if (nvUbicacionId > 0) params.set("ubicacion_id", String(nvUbicacionId))
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
  // ── Modelos cotizables: vienen de cotizador_modelos con FK a productos ─────
  const [cotizadorModelos, setCotizadorModelos] = useState<{
    id: string                  // cotizador_modelos.id (UUID)
    producto_id: number
    producto_nombre: string
    valor_base_usd: number
  }[]>([])
  const [cotizadorCategorias, setCotizadorCategorias] = useState<{
    id: string; nombre: string; orden: number; accion: "descuento" | "whatsapp" | "cartel_sistema"
  }[]>([])
  const [cotizadorCriteriosByModelo, setCotizadorCriteriosByModelo] = useState<Record<string, {
    id: string; categoria_id: string; etiqueta: string; descuento_usd: number; descuento_porcentaje: number | null
  }[]>>({})
  const [cotizacionUsdBlue, setCotizacionUsdBlue] = useState<number>(0)
  // Cotizaciones USD por tipo (oficial/blue/ccl/mep/divisa/billete) — para que cada lista de precios
  // use la suya según el campo tipo_cotizacion. Se cargan una vez al montar.
  const [cotizacionesUsdPorTipo, setCotizacionesUsdPorTipo] = useState<Record<string, number>>({})

  const [tomaEquipoPaso, setTomaEquipoPaso] = useState(1)
  const [tomaEquipoClienteId, setTomaEquipoClienteId] = useState<number | null>(null)
  const [tomaEquipoModeloId, setTomaEquipoModeloId] = useState<string | null>(null)  // cotizador_modelos.id (UUID)
  const [tomaEquipoPrecioBaseUsd, setTomaEquipoPrecioBaseUsd] = useState(0)
  const [tomaEquipoPrecioFinalUsd, setTomaEquipoPrecioFinalUsd] = useState(0)
  // Una entrada por categoria. criterio_id=null para whatsapp; whatsapp_flag indica si tiene daño.
  const [tomaEquipoEvaluacion, setTomaEquipoEvaluacion] = useState<{
    categoria_id: string
    categoria_nombre: string
    accion: "descuento" | "whatsapp" | "cartel_sistema"
    criterio_id: string | null
    etiqueta: string
    descuento_usd: number
    whatsapp_flag: boolean
  }[]>([])
  const [tomaEquipoCreando, setTomaEquipoCreando] = useState(false)
  const [guardandoToma, setGuardandoToma] = useState(false)
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

  // ── Estados para Seña de Equipo ─────────────────────────────────────────────
  const [seniasEquipo, setSeniasEquipo] = useState<SeniaEquipo[]>([])
  const [selectedSenia, setSelectedSenia] = useState<SeniaEquipo | null>(null)
  const [creandoSenia, setCreandoSenia] = useState(false)
  // Formulario nueva seña
  const [seniaClienteId, setSeniaClienteId] = useState<number | null>(null)
  const [seniaStockItemId, setSeniaStockItemId] = useState<number | null>(null)
  const [seniaEquipoNombre, setSeniaEquipoNombre] = useState("")
  const [seniaEquipoImei, setSeniaEquipoImei] = useState("")
  const [seniaEquipoColor, setSeniaEquipoColor] = useState("")
  const [seniaEquipoBateria, setSeniaEquipoBateria] = useState<number | undefined>(undefined)
  const [seniaPrecioVenta, setSeniaPrecioVenta] = useState(0)
  const [seniaDescuento, setSeniaDescuento] = useState(0)
  const [seniaFechaLimite, setSeniaFechaLimite] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().split('T')[0]
  })
  // Lista de precios y moneda de la seña
  const [seniaListaPreciosId, setSeniaListaPreciosId] = useState<number | null>(null)
  const [seniaMoneda, setSeniaMoneda] = useState<'ARS' | 'USD'>('ARS')
  const [seniaCotizacion, setSeniaCotizacion] = useState(1)
  // Registrar seña (pago adelantado)
  const [seniaMontoInput, setSeniaMontoInput] = useState(0)
  const [seniaMedioPagoInput, setSeniaMedioPagoInput] = useState("efectivo")
  const [seniaCotizacionPago, setSeniaCotizacionPago] = useState(1)
  const [seniaRegistrando, setSeniaRegistrando] = useState(false)
  const [seniaCancelRecibo, setSeniaCancelRecibo] = useState(false)
  // Caja dinámica para recibo de seña
  const [seniaCajas, setSeniaCajas] = useState<{ id: string; nombre: string; sucursal: string }[]>([])
  const [seniaCajaId, setSeniaCajaId] = useState<string>("")
  const [seniaCajaValores, setSeniaCajaValores] = useState<{ id: string; nombre: string; moneda: string; tipo: string; subtipo: string | null }[]>([])
  const [seniaCajaValorId, setSeniaCajaValorId] = useState<string>("")
  // Editar fecha límite en detalle
  const [seniaEditandoFecha, setSeniaEditandoFecha] = useState(false)
  const [seniaFechaLimiteEdit, setSeniaFechaLimiteEdit] = useState("")
  // Cancelación
  const [seniaCancelando, setSeniaCancelando] = useState(false)
  const [seniaCancelMotivo, setSeniaCancelMotivo] = useState("")
  // Cierre
  const [seniaCerrando, setSeniaCerrando] = useState(false)
  const [seniaMediosCierre, setSeniaMediosCierre] = useState<{ medio: string; monto: number }[]>([{ medio: "efectivo", monto: 0 }])
  const [seniaConTomaIntegrada, setSeniaConTomaIntegrada] = useState(false)
  // Búsqueda de producto estilo NV para seña
  const seniaInputRef = useRef<HTMLInputElement | null>(null)
  const [seniaEquipoSearchText, setSeniaEquipoSearchText] = useState("")
  const [seniaEquipoSearchOpen, setSeniaEquipoSearchOpen] = useState(false)
  const [seniaProductoId, setSeniaProductoId] = useState<number | null>(null)
  const [seniaProductoRequiereSerie, setSeniaProductoRequiereSerie] = useState(false)
  // Modal de selección IMEI/Serie para seña
  const [showSeniaSerieModal, setShowSeniaSerieModal] = useState(false)
  const [seniaSerieBusqueda, setSeniaSerieBusqueda] = useState("")
  const [seniaSerieCargando, setSeniaSerieCargando] = useState(false)
  const [seniaSeriesDisponibles, setSeniaSeriesDisponibles] = useState<SerieDisponible[]>([])

  const [seniaFiltroEstado, setSeniaFiltroEstado] = useState("todos")
  const [seniaFiltroVencidas, setSeniaFiltroVencidas] = useState(false)

  // Modal de preview de documentos generados por la seña
  const [showSeniaDocModal, setShowSeniaDocModal] = useState(false)
  const [seniaDocModalTipo, setSeniaDocModalTipo] = useState<"nv" | "oe" | "remito" | null>(null)
  const [seniaDocModalLoading, setSeniaDocModalLoading] = useState(false)

  // Cerrar modal de doc-seña cuando el documento seleccionado se limpia (por el botón Volver interno)
  useEffect(() => {
    if (!showSeniaDocModal) return
    if (seniaDocModalTipo === "nv" && !selectedNV) { setShowSeniaDocModal(false); setSeniaDocModalTipo(null) }
    if (seniaDocModalTipo === "oe" && !selectedOE) { setShowSeniaDocModal(false); setSeniaDocModalTipo(null) }
    if (seniaDocModalTipo === "remito" && !selectedRemito) { setShowSeniaDocModal(false); setSeniaDocModalTipo(null) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNV, selectedOE, selectedRemito, selectedFactura])

  // Cargar monedas activas desde Supabase al montar
  useEffect(() => {
    fetch("/api/monedas")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMonedas(data) })
      .catch(console.error)
  }, [])

  // Cargar señas de equipo desde Supabase al montar
  useEffect(() => {
    fetch("/api/senias-equipo")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSeniasEquipo(data) })
      .catch(console.error)
  }, [])

  // Cargar cajas para recibo de seña
  useEffect(() => {
    ;(async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data } = await supabase
        .from("cajas")
        .select("id, nombre, sucursal")
        .eq("activo", true)
        .order("nombre")
      setSeniaCajas(data ?? [])
    })()
  }, [])

  // Cargar cotización blue del día para seña
  useEffect(() => {
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => r.json())
      .then(d => { if (d?.tasa && Number(d.tasa) > 1) setSeniaCotizacionPago(Number(d.tasa)) })
      .catch(() => {})
  }, [])

  // Cargar facturas/comprobantes pendientes cuando se selecciona un cliente en formulario de recibo
  useEffect(() => {
    if (reciboClienteIdForm && (creandoRecibo || editandoRecibo)) {
      cargarComprobantesCliente(reciboClienteIdForm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reciboClienteIdForm, creandoRecibo, editandoRecibo])

  // Cargar caja_valores al cambiar la caja seleccionada
  useEffect(() => {
    if (!seniaCajaId) { setSeniaCajaValores([]); setSeniaCajaValorId(""); setSeniaMedioPagoInput(""); return }
    ;(async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data } = await supabase
        .from("caja_valores")
        .select("id, nombre, moneda, tipo, subtipo")
        .eq("caja_id", seniaCajaId)
        .eq("activo", true)
        .in("tipo", ["efectivo", "transferencia"])
        .order("nombre")
      setSeniaCajaValores(data ?? [])
      setSeniaCajaValorId("")
      setSeniaMedioPagoInput("")
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seniaCajaId])

  // Cargar configuración del cotizador: modelos + categorías + criterios + cotización blue
  useEffect(() => {
    Promise.all([
      fetch("/api/cotizador/modelos").then(r => r.json()),
      fetch("/api/cotizador/categorias").then(r => r.json()),
      fetch("/api/cotizador/criterios").then(r => r.json()),
      fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true").then(r => r.json()),
    ])
      .then(([modelosResp, categorias, criterios, cotiz]) => {
        const modelos = (Array.isArray(modelosResp) ? modelosResp : [])
          .filter((m: any) => m.activo)
          .map((m: any) => ({
            id: m.id,
            producto_id: m.producto_id,
            producto_nombre: m.producto?.nombre ?? `#${m.producto_id}`,
            valor_base_usd: Number(m.valor_base_usd),
          }))
        setCotizadorModelos(modelos)

        const cats = (Array.isArray(categorias) ? categorias : [])
          .filter((c: any) => c.activo)
          .sort((a: any, b: any) => a.orden - b.orden)
        setCotizadorCategorias(cats)

        const byModelo: Record<string, any[]> = {}
        // Index modelos por id para resolver valor_base
        const modeloPorId: Record<string, number> = {}
        for (const m of modelos) modeloPorId[m.id] = m.valor_base_usd
        for (const c of (Array.isArray(criterios) ? criterios : [])) {
          if (!c.activo) continue
          if (!byModelo[c.modelo_id]) byModelo[c.modelo_id] = []
          // Si es porcentual dinámico, recalcular el USD efectivo desde el valor_base actual del modelo
          const pct = c.descuento_porcentaje !== null && c.descuento_porcentaje !== undefined ? Number(c.descuento_porcentaje) : null
          const base = modeloPorId[c.modelo_id] ?? 0
          const usdEfectivo = pct !== null ? Number(((base * pct) / 100).toFixed(2)) : Number(c.descuento_usd)
          byModelo[c.modelo_id].push({
            id: c.id,
            categoria_id: c.categoria_id,
            etiqueta: c.etiqueta,
            descuento_usd: usdEfectivo,
            descuento_porcentaje: pct,
          })
        }
        // Ordenar opciones por descuento ascendente (Impecable=0 primero)
        for (const mid of Object.keys(byModelo)) {
          byModelo[mid].sort((a, b) => a.descuento_usd - b.descuento_usd)
        }
        setCotizadorCriteriosByModelo(byModelo)

        if (cotiz?.tasa) setCotizacionUsdBlue(Number(cotiz.tasa))
      })
      .catch(console.error)
  }, [])

  // Cargar tomas de equipo desde Supabase al montar
  useEffect(() => {
    fetch("/api/tomas-equipo")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTomasEquipo(data)
      })
      .catch(console.error)
  }, [])

  // Cargar ajustes (NC/ND) desde Supabase al montar
  useEffect(() => {
    fetch("/api/ajustes-clientes")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAjustes(data)
      })
      .catch(console.error)
  }, [])

  // Cargar categorías de cliente desde tabla categorias_cliente
  useEffect(() => {
    fetch("/api/categorias-cliente")
      .then(r => r.json())
      .then((rows: any[]) => {
        const cats: CategoriaCliente[] = rows.map(r => ({
          id: r.id,
          nombre: r.nombre,
          lista_precios_defecto_id: r.lista_precios_defecto_id ?? null,
          descripcion: r.descripcion ?? "",
          activa: r.activa ?? true,
          cuenta_cobrar_id: r.cuenta_cobrar_id ?? null,
          cuenta_cobrar_codigo: r.cuenta_cobrar_codigo ?? undefined,
          cuenta_cobrar_nombre: r.cuenta_cobrar_nombre ?? undefined,
        }))
        if (cats.length > 0) setCategoriasCliente(cats)
      })
      .catch(console.error)
  }, [])
  const [selectedToma, setSelectedToma] = useState<typeof tomasEquipo[0] | null>(null)
  const [showConfirmarRecepcionModal, setShowConfirmarRecepcionModal] = useState(false)
  const [imeiInput, setImeiInput] = useState("")
  const [colorRecepcion, setColorRecepcion] = useState("")
  const [bateriaRecepcionPct, setBateriaRecepcionPct] = useState<number | undefined>(undefined)
  const [outletRecepcion, setOutletRecepcion] = useState(false)
  const [ubicacionRecepcionId, setUbicacionRecepcionId] = useState<number | null>(null)
  const [errorRecepcion, setErrorRecepcion] = useState<string | null>(null)
  const [observacionesRecepcion, setObservacionesRecepcion] = useState("")
  const [confirmandoRecepcion, setConfirmandoRecepcion] = useState(false)
  const [ncDetallePopup, setNcDetallePopup] = useState<AjusteCliente | null>(null)
  const [recDetallePopup, setRecDetallePopup] = useState<any | null>(null)
  const [selectedAjuste, setSelectedAjuste] = useState<AjusteCliente | null>(null)
  const [showCancelarTEModal, setShowCancelarTEModal] = useState(false)
  const [cancelandoTE, setCancelandoTE] = useState(false)
  
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

  // Cargar notas de venta desde Supabase al iniciar
  useEffect(() => {
    fetch("/api/notas-venta")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapeadas = data.map((nv: any) => ({
            id: nv.id,
            numero: nv.numero,
            cliente_id: nv.cliente_id,
            cliente_nombre: nv.cliente_nombre ?? "",
            cliente_codigo: nv.cliente_codigo ?? "",
            vendedor_id: nv.vendedor_id ?? 1,
            vendedor_nombre: nv.vendedor_nombre ?? "",
            fecha: nv.fecha ?? nv.created_at,
            estado: nv.estado ?? "abierta",
            moneda: nv.moneda ?? "ARS",
            tipo_cotizacion: nv.tipo_cotizacion ?? "blue",
            cotizacion: Number(nv.cotizacion) || 1450,
            lista_precios_id: nv.lista_precios_id ?? 1,
            termino_pago_id: nv.termino_pago_id ?? 1,
            termino_pago_nombre: nv.termino_pago_nombre ?? "Contado",
            deposito: nv.deposito ?? "",
            tipo_venta: nv.tipo_venta ?? "inmediata",
            lineas: (nv.notas_venta_lineas ?? []).map((l: any) => ({
              id: l.id,
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              descripcion: l.descripcion ?? "",
              cantidad: l.cantidad,
              precio_unitario: l.precio_unitario,
              descuento: l.descuento ?? 0,
              subtotal: Number(l.subtotal ?? 0),
              iva: Number(l.iva ?? 0),
              requiere_serie: false,
              series_seleccionadas: [],
            })),
            subtotal: Number(nv.subtotal ?? (nv.notas_venta_lineas ?? []).reduce((s: number, l: any) => s + Number(l.subtotal ?? 0), 0)),
            descuento_global: 0,
            impuestos: Number(nv.impuestos ?? (nv.notas_venta_lineas ?? []).reduce((s: number, l: any) => s + Number(l.subtotal ?? 0) * ((Number(l.iva ?? 0)) / 100), 0)),
            cotizacion_tipo: nv.tipo_cotizacion ?? "blue",
            total: Number(nv.total ?? 0),
            sucursal: nv.sucursal ?? "Puerto Norte",
            punto_venta: nv.punto_venta ?? "10000",
          }))
          setNotasVenta(mapeadas)
        }
      })
      .catch(() => {})
  }, [])

  // Cargar OEs desde Supabase al iniciar
  useEffect(() => {
    fetch("/api/ordenes-entrega")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setOrdenesEntrega(data.map((oe: any) => ({
            id: oe.id,
            numero: oe.numero,
            nota_venta_id: oe.nota_venta_id ?? 0,
            nota_venta_numero: oe.nota_venta_numero ?? "",
            cliente_id: oe.cliente_id ?? 0,
            cliente_nombre: oe.cliente_nombre ?? "",
            fecha: oe.fecha ?? oe.created_at,
            fecha_entrega_programada: oe.fecha_entrega_programada ?? oe.fecha ?? "",
            estado: oe.estado ?? "confirmada",
            tipo: oe.tipo ?? "venta",
            deposito_origen: oe.deposito_origen ?? "",
            ubicacion_origen: oe.ubicacion_origen ?? "",
            total_productos: oe.total_productos ?? 0,
            productos_entregados: oe.productos_entregados ?? 0,
            productos: oe.productos ?? [],
            seguimiento: oe.seguimiento ?? [],
          })))
        }
      })
      .catch(() => {})
  }, [])

  // Cargar Remitos desde Supabase al iniciar
  useEffect(() => {
    fetch("/api/remitos-venta")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRemitos(data.map((r: any) => ({
            id: r.id,
            numero: r.numero,
            orden_entrega_id: r.orden_entrega_id ?? 0,
            orden_entrega_numero: r.orden_entrega_numero ?? "",
            nota_venta_id: r.nota_venta_id ?? undefined,
            nota_venta_numero: r.nota_venta_numero ?? "",
            cliente_id: r.cliente_id ?? 0,
            cliente_nombre: r.cliente_nombre ?? "",
            fecha: r.fecha ?? r.created_at,
            estado: r.estado ?? "confirmado",
            tipo: r.tipo ?? "salida",
            deposito: r.deposito ?? "",
            ubicacion: r.ubicacion ?? "",
            total_bultos: r.total_bultos ?? 1,
            observaciones: r.observaciones ?? "",
            productos: r.productos ?? [],
            lineas: r.lineas ?? [],
            seguimiento: r.seguimiento ?? [],
          })))
        }
      })
      .catch(() => {})
  }, [])

  // Cargar facturas desde Supabase al iniciar
  useEffect(() => {
    fetch("/api/facturas")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setFacturas(data.map((f: any) => ({
            id: f.id,
            numero: f.numero ?? "",
            nota_venta_id: f.nota_venta_id ?? 0,
            nota_venta_numero: f.nota_venta_numero ?? "",
            cliente_id: f.cliente_id ?? 0,
            cliente_nombre: f.cliente_nombre ?? "",
            cliente_documento: f.cliente_documento ?? "",
            estado: f.estado ?? "abierta",
            fecha: f.fecha ?? f.created_at,
            vendedor_nombre: f.vendedor_nombre ?? "",
            domicilio_facturacion: f.domicilio_facturacion ?? "",
            moneda: f.moneda ?? "ARS",
            tipo_cotizacion: f.tipo_cotizacion ?? "blue",
            cotizacion: Number(f.cotizacion) || 1,
            termino_pago: f.termino_pago ?? "Contado",
            condicion_pago: f.condicion_pago ?? "",
            fecha_vencimiento: f.fecha_vencimiento ?? "",
            subtotal: Number(f.subtotal ?? 0),
            descuento: Number(f.descuento ?? 0),
            impuestos: Number(f.impuestos ?? 0),
            total: Number(f.total ?? 0),
            saldo: Number(f.saldo ?? 0),
            sucursal: f.sucursal ?? "",
            lineas: (f.facturas_lineas ?? []).map((l: any) => ({
              producto_nombre: l.producto_nombre ?? "",
              descripcion: l.descripcion ?? "",
              cantidad: l.cantidad ?? 1,
              precio_unitario: l.precio_unitario ?? 0,
              descuento: l.descuento ?? 0,
              subtotal: Number(l.subtotal ?? 0),
            })),
            vencimientos: (f.facturas_vencimientos ?? []).map((v: any) => ({
              descripcion: v.descripcion ?? "",
              fecha: v.fecha ?? "",
              total: Number(v.total ?? 0),
            })),
            seguimiento: f.seguimiento ?? [],
            medios_pago_detalle: (f.factura_medios_pago ?? []).map((mp: any) => ({
              medio: mp.medio,
              tarjeta_nombre: mp.tarjeta?.nombre ?? null,
              cuotas: mp.cuotas ?? undefined,
              monto_base: Number(mp.monto_base ?? 0),
              iva: Number(mp.iva_calculado ?? 0),
              total_recargo: Number(mp.recargo ?? 0),
              total_acreditar: Number(mp.monto_total ?? 0),
            })),
          })))
        }
      })
      .catch(() => {})
  }, [])

  // Cargar listas de precios al iniciar
  useEffect(() => {
    fetch("/api/listas-precios")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapeadas = data.map((l: any) => ({
            ...l,
            // Normalizar campos que la DB devuelve con nombres distintos
            moneda_base: l.moneda_base ?? l.moneda ?? "ARS",
            estado: l.estado ?? (l.activa ? "activa" : "borrador"),
            tipo_cotizacion: l.tipo_cotizacion ?? "blue",
          }))
          setListasPrecios(mapeadas)
        }
      })
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

  // Auto-fetch cotización para facturas de venta cuando se elige USD
  useEffect(() => {
    if (facturaMoneda !== "USD") { setFacturaCotizacion(1); return }
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => r.json())
      .then(data => { if (data?.tasa) setFacturaCotizacion(Number(data.tasa)) })
      .catch(() => {})
  }, [facturaMoneda])

  // Derivar moneda de la lista de precios seleccionada en factura
  useEffect(() => {
    const lista = listasPrecios.find(lp => lp.id === facturaListaPreciosId)
    if (lista) {
      const m = lista.moneda_base === "USD" ? "USD" : "ARS"
      setFacturaMoneda(m)
    }
  }, [facturaListaPreciosId, listasPrecios])

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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-"
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString('es-AR', { 
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
      abierta: "bg-blue-100 text-blue-700",
      borrador: "bg-gray-100 text-gray-700",
      a_facturar: "bg-blue-100 text-blue-700",
      verificacion_factura: "bg-yellow-100 text-yellow-700",
      verificacion_oe: "bg-orange-100 text-orange-700",
      facturada: "bg-purple-100 text-purple-700",
      finalizada: "bg-green-100 text-green-700",
      cancelada: "bg-red-100 text-red-700"
    }
    return colors[estado] || "bg-gray-100 text-gray-700"
  }

  const getEstadoNVLabel = (estado: string) => {
    const labels: Record<string, string> = {
      abierta: "Abierta",
      borrador: "Borrador",
      a_facturar: "A Facturar",
      verificacion_factura: "Verif. Factura",
      verificacion_oe: "Verif. OE",
      facturada: "Facturada",
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
      confirmada: "bg-indigo-100 text-indigo-700",
      parcial: "bg-amber-100 text-amber-700",
      cobrada: "bg-emerald-100 text-emerald-700",
      conciliada: "bg-green-100 text-green-700",
      cancelada: "bg-red-100 text-red-700",
      esperando_confirmacion: "bg-amber-100 text-amber-700",
      ejecucion_senia: "bg-amber-100 text-amber-700",
    }
    return colors[estado] || "bg-gray-100 text-gray-700"
  }

  const getEstadoFacturaLabel = (estado: string) => {
    const labels: Record<string, string> = {
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
    return labels[estado] || estado
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
    const lower = categoria?.toLowerCase() ?? ""
    if (lower.includes("mercado")) return "bg-yellow-100 text-yellow-700"
    if (lower.includes("mayorista")) return "bg-purple-100 text-purple-700"
    return "bg-gray-100 text-gray-700"
  }

  // Filtered data
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchSearch = searchQuery === "" || 
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategoria = categoriaFilter === "todos" || String(c.categoria_id) === categoriaFilter
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
        { id: "senia_equipo", label: "Seña de Equipo", icon: Banknote },
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
        { id: "criterios_cotizador", label: "Criterios para cotizador", icon: Smartphone },
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
  const itemPermitido = (itemId: string): boolean => {
    const sub = SIDEBAR_VENTAS_TO_VISTA[itemId]
    if (sub === null || sub === undefined) return true
    return canSee("ventas", sub)
  }

  // Si el usuario está en una vista que ya no puede ver (cambio de permisos),
  // lo mandamos al dashboard del módulo.
  useEffect(() => {
    if (activeView === "dashboard") return
    const sub = SIDEBAR_VENTAS_TO_VISTA[activeView]
    if (sub === null || sub === undefined) return
    if (!canSee("ventas", sub)) {
      setActiveView("dashboard")
    }
  }, [activeView, canSee])

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
        {menuSections.map(section => {
          const itemsVisibles = section.items.filter(it => itemPermitido(it.id))
          if (itemsVisibles.length === 0) return null
          return (
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
                {itemsVisibles.map(item => {
                  // Items que migraron a rutas top-level (Ctrl+Click nativo)
                  if (item.id === "listas_precios") {
                    return (
                      <Link
                        key={item.id}
                        href="/listas-precios"
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${section.id === "config_notas_credito" ? "text-xs" : "text-sm"} text-gray-600 hover:bg-gray-100`}
                      >
                        <item.icon className={section.id === "config_notas_credito" ? "w-3.5 h-3.5" : "w-4 h-4"} />
                        {item.label}
                      </Link>
                    )
                  }
                  if (item.id === "versiones_lista") {
                    return (
                      <Link
                        key={item.id}
                        href="/listas-precios/versiones"
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${section.id === "config_notas_credito" ? "text-xs" : "text-sm"} text-gray-600 hover:bg-gray-100`}
                      >
                        <item.icon className={section.id === "config_notas_credito" ? "w-3.5 h-3.5" : "w-4 h-4"} />
                        {item.label}
                      </Link>
                    )
                  }
                  if (item.id === "toma_equipo") {
                    return (
                      <Link
                        key={item.id}
                        href="/toma-equipo"
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${section.id === "config_notas_credito" ? "text-xs" : "text-sm"} text-gray-600 hover:bg-gray-100`}
                      >
                        <item.icon className={section.id === "config_notas_credito" ? "w-3.5 h-3.5" : "w-4 h-4"} />
                        {item.label}
                      </Link>
                    )
                  }
                  return (
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
                      setNcDetallePopup(null)
                      setRecDetallePopup(null)
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
                  )
                })}
              </div>
            )}
          </div>
          )
        })}
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
        <h1 className="text-2xl font-bold text-amber-900">Dashboard de Ventas</h1>
        
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
            <h1 className="text-2xl font-bold text-amber-900">{selectedOTData.nro}</h1>
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
          <h1 className="text-2xl font-bold text-amber-900">Clientes</h1>
          <button 
            onClick={() => { setEditingItem(null); setFormClienteCategoriaId(null); setFormClienteListaPreciosId(null); setCreandoCliente(true) }}
            className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <OdooFilterBar
            moduleName="clientes"
            filterOptions={[
              { field: "categoria_id", label: "Categoría", values: categoriasCliente.map(c => ({ value: String(c.id), label: c.nombre })) },
            ]}
            groupByOptions={[
              { id: "categoria_id", label: "Categoría", field: "categoria_id" },
              { id: "ciudad", label: "Ciudad", field: "ciudad" },
            ]}
            activeFilters={activeFiltersClientes}
            activeGroupBy={activeGroupByClientes}
            searchTerm={searchQuery}
            onFiltersChange={f => { setActiveFiltersClientes(f); setCategoriaFilter(f.find(x => x.field === "categoria_id")?.value ?? "todos") }}
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
              <tr className="border-b bg-gray-50">
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
                      const label = cliente.categoria_nombre ?? ""
                      if (!label) return null
                      return (
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(label)}`}>
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
            <h1 className="text-2xl font-bold text-amber-900">{editingItem ? "Editar Cliente" : "Nuevo Cliente"}</h1>
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
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
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
                  <select name="tipo_documento" defaultValue={editingItem?.tipo_documento || "DNI"} required
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="DNI">DNI</option>
                    <option value="CUIT">CUIT</option>
                    <option value="CUIL">CUIL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Número Documento *</label>
                  <input type="text" name="numero_documento" defaultValue={editingItem?.numero_documento || ""} required
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Posición Fiscal *</label>
                  <select name="posicion_fiscal" defaultValue={editingItem?.posicion_fiscal || "consumidor_final"} required
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
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
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Categoría de Cliente *</label>
                  <select
                    name="categoria_id"
                    value={formClienteCategoriaId ?? ""}
                    onChange={(e) => {
                      const catId = e.target.value ? Number(e.target.value) : null
                      setFormClienteCategoriaId(catId)
                    }}
                    required
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Seleccione una categoría</option>
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
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Lista de Precios por Defecto *</label>
                  <select
                    name="lista_precios_id"
                    value={formClienteListaPreciosId ?? ""}
                    onChange={(e) => setFormClienteListaPreciosId(e.target.value ? Number(e.target.value) : null)}
                    required
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Seleccione una lista</option>
                    {listasPrecios.map(lp => (
                      <option key={lp.id} value={lp.id}>{lp.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Descuento Default (%)</label>
                  <input type="number" name="descuento_default" defaultValue={editingItem?.descuento_default || 0} min="0" max="100" step="0.5"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Término de Pago</label>
                  <select name="termino_pago_id" defaultValue={editingItem?.termino_pago_id || 1}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    {terminosPago.map(tp => (
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
                onClick={() => { setCreandoCliente(false); setEditingItem(null); setFormClienteCategoriaId(null); setFormClienteListaPreciosId(null) }}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800 flex items-center gap-1.5"
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedCliente.nombre}</h1>
              {selectedCliente.categoria_nombre && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoriaColor(selectedCliente.categoria_nombre)}`}>
                  {selectedCliente.categoria_nombre}
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
              onClick={() => { setEditingItem(selectedCliente); setFormClienteCategoriaId(selectedCliente?.categoria_id ?? null); setFormClienteListaPreciosId(selectedCliente?.lista_precios_id ?? null); setCreandoCliente(true) }}
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
                      className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 flex items-center gap-2"
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
                      <span className="font-medium">{terminosPago.find(t => t.id === selectedCliente.termino_pago_id)?.nombre}</span>
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
          <h1 className="text-2xl font-bold text-amber-900">Notas de Venta</h1>
          <button 
            onClick={() => { 
              setCreandoNV(true)
              setNvLineas([])
              setNvClienteId(null)
            }}
            className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
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
              <tr className="border-b bg-gray-50">
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
  const handleCrearNVFinal = async (tipoVenta: "inmediata" | "pedido") => {
    if (guardandoNV) return
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

    const subtotalValido = lineasValidas.reduce((sum, l) => sum + Number(l.subtotal ?? 0), 0)
    // Todos los precios de las listas incluyen IVA. Para fines contables/factura,
    // se desagrega el IVA desde el precio con-IVA usando la tasa de cada línea.
    const impuestosValido = lineasValidas.reduce((sum, l) => {
      const tasa = (l.iva ?? 0) / 100
      const neto = Number(l.subtotal ?? 0) / (1 + tasa)
      return sum + (Number(l.subtotal ?? 0) - neto)
    }, 0)
    const totalValido = subtotalValido

    // Si estamos editando, usamos los datos existentes
    const existingNV = editingNVId ? notasVenta.find(nv => nv.id === editingNVId) : null
    const nvNumero = existingNV ? existingNV.numero : `NV X 10000-000${10737 + notasVenta.length}`
    const nvId = existingNV ? existingNV.id : notasVenta.length + 1
    const fechaHoy = existingNV ? existingNV.fecha : new Date().toISOString()
    const vendedorId = 1
    const vendedorNombre = vendedores[0]?.nombre || "Max Solina"
    const terminoPagoId = cliente.termino_pago_id || 1
    const terminoPagoNombre = terminosPago.find(tp => tp.id === terminoPagoId)?.nombre || "Contado Efectivo"
    setGuardandoNV(true)
    try {
    const depositoSeleccionado = depositos.find(d => d.id === nvDepositoId)
    const deposito = depositoSeleccionado?.nombre || "Sin depósito"
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
      sucursal: depositoSeleccionado?.nombre || "Puerto Norte",
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
      subtotal: subtotalValido,
      impuestos: impuestosValido,
      descuento_global: 0,
      cotizacion: 1450,
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
    
    // ── Persistir NV en Supabase ──────────────────────────────────────────
    let nvNumeroFinal = nvNumero
    let nvIdFinal = nvId
    let nvPersistida = false
    try {
      const nvRes = await fetch("/api/notas-venta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: existingNV ? nvNumero : null, // null = servidor genera el número
          cliente_id: cliente.id,
          vendedor_id: vendedorId,
          moneda,
          estado: tipoVenta === "inmediata" ? "facturada" : "abierta",
          sucursal_id: nvDepositoId || null,
          subtotal: subtotalValido,
          impuestos: impuestosValido,
          total: totalValido,
          lineas: lineasValidas.map(l => ({
            producto_id: l.producto_id,
            producto_nombre: l.producto_nombre,
            descripcion: l.descripcion ?? null,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario ?? 0,
            descuento: l.descuento ?? 0,
            subtotal: Number(l.subtotal ?? 0),
            iva: l.iva ?? 0,
          })),
        }),
      })
      if (nvRes.ok) {
        const nvData = await nvRes.json()
        nvNumeroFinal = nvData.numero || nvNumero
        nvIdFinal = nvData.id || nvId
        newNV.numero = nvNumeroFinal
        newNV.id = nvIdFinal
        nvPersistida = true
      }
    } catch (_) {
      // Error de red — la NV sigue en el state local
    }

    // ── Si es venta inmediata y NV persistida, crear OE y Remito ──────────
    if (tipoVenta === "inmediata" && !editingNVId && nvPersistida) {
      // 1. Orden de Entrega
      let oeNumero = ""
      try {
        const productosOE = lineasValidas.map(l => ({
          producto_id: l.producto_id,
          producto_nombre: l.producto_nombre,
          cantidad: l.cantidad,
          reserva: l.cantidad,
          estado: "confirmado" as const,
        }))
        const oeRes = await fetch("/api/ordenes-entrega", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero: null,
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            estado: "confirmada",
            deposito: deposito,
            sucursal_id: nvDepositoId || null,
            fecha: fechaHoy,
            total_productos: lineasValidas.length,
            productos: productosOE,
          }),
        })
        if (oeRes.ok) {
          const oeData = await oeRes.json()
          oeNumero = oeData.numero || ""
          const newOE: OrdenEntrega = {
            id: oeData.id,
            numero: oeNumero,
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            estado: "confirmada",
            deposito: deposito,
            fecha_creacion: fechaHoy,
            fecha_entrega: fechaHoy,
            domicilio_envio: "",
            sucursal: deposito,
            remito_numero: null,
            productos: productosOE,
            seguimiento: [],
          }
          setOrdenesEntrega(prev => [...prev, newOE])
        }
      } catch (_) {}

      // 2. Remito
      try {
        const remRes = await fetch("/api/remitos-venta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero: null,
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            orden_entrega_numero: oeNumero,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            estado: "emitido",
            deposito: deposito,
            sucursal_id: nvDepositoId || null,
            fecha: fechaHoy,
            lineas: lineasValidas.map(l => ({
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              cantidad: l.cantidad,
              requiere_serie: l.requiere_serie ?? false,
              series_seleccionadas: l.series_seleccionadas ?? [],
            })),
          }),
        })
        if (remRes.ok) {
          const remData = await remRes.json()
          const newRemito: Remito = {
            id: remData.id,
            numero: remData.numero || "",
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            orden_entrega_numero: oeNumero,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            estado: "emitido",
            deposito: deposito,
            fecha: fechaHoy,
            lineas: lineasValidas.map(l => ({
              id: l.id,
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              cantidad: l.cantidad,
              series: l.series_seleccionadas ?? [],
            })),
          }
          setRemitos(prev => [newRemito, ...prev])

          // ── Descontar stock inmediatamente al confirmar el remito ──
          try {
            const confirmarRes = await fetch(`/api/remitos/${remData.id}/confirmar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                remito_numero: remData.numero,
                nv_numero: nvNumeroFinal,
                oe_numero: oeNumero,
                deposito_id: nvDepositoId || null,
                deposito_nombre: deposito,
                ubicacion_id: nvUbicacionId || null,
                ubicacion_nombre: ubicaciones.find(u => u.id === nvUbicacionId)?.nombre ?? null,
                usuario: "sistema",
                lineas: lineasValidas.map(l => ({
                  producto_id: l.producto_id,
                  producto_nombre: l.producto_nombre,
                  cantidad: l.cantidad,
                  requiere_serie: l.requiere_serie ?? false,
                  series_seleccionadas: l.series_seleccionadas ?? [],
                })),
              }),
            })
            // Actualizar state local con estado entregado y asiento_id del resultado
            if (confirmarRes.ok) {
              const confirmarData = await confirmarRes.json()
              setRemitos(prev => prev.map(r =>
                r.id === remData.id
                  ? { ...r, estado: "entregado" as const, asiento_id: confirmarData.asiento_id ?? null }
                  : r
              ))
            }
          } catch (_) {}
        }
      } catch (_) {}

      // 3. Crear Factura abierta vinculada a la NV
      try {
        const facRes = await fetch("/api/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            vendedor_nombre: vendedorNombre,
            sucursal: deposito,
            fecha: fechaHoy,
            estado: "abierta",
            moneda,
            termino_pago: terminoPagoNombre,
            subtotal: subtotalValido,
            descuento: 0,
            impuestos: impuestosValido,
            total: totalValido,
            saldo: totalValido,
            lineas: lineasValidas.map(l => ({
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              descripcion: l.descripcion ?? null,
              cantidad: l.cantidad,
              precio_unitario: l.precio_unitario ?? 0,
              descuento: l.descuento ?? 0,
              subtotal: Number(l.subtotal ?? 0),
            })),
          }),
        })
        if (!facRes.ok) {
          const errText = await facRes.text()
          console.error("[FACTURA] Error HTTP al crear factura:", facRes.status, errText)
          alert(`❌ Error al crear factura (HTTP ${facRes.status}):\n\n${errText}`)
        }
        if (facRes.ok) {
          const facData = await facRes.json()
          console.log("[FACTURA] Respuesta completa:", JSON.stringify(facData))
          if (facData._advertencia_contable) {
            console.warn("[CONTABILIDAD] Factura creada sin asiento:", facData._advertencia_contable)
            alert(`⚠️ Factura creada pero sin asiento contable:\n\n${facData._advertencia_contable}`)
          } else {
            console.log("[CONTABILIDAD] Asiento creado:", facData.asiento_id)
          }
          const newFactura: Factura = {
            id: facData.id,
            numero: facData.numero,
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            cliente_documento: cliente.numero_documento ?? "",
            estado: "abierta",
            fecha: fechaHoy,
            vendedor_nombre: vendedorNombre,
            domicilio_facturacion: cliente.direccion ?? "",
            moneda,
            tipo_cotizacion: "blue",
            cotizacion: 1150,
            termino_pago: terminoPagoNombre,
            subtotal: subtotalValido,
            descuento: 0,
            impuestos: impuestosValido,
            total: totalValido,
            saldo: totalValido,
            sucursal: deposito,
            lineas: lineasValidas.map(l => ({
              producto_nombre: l.producto_nombre,
              descripcion: l.descripcion ?? "",
              cantidad: l.cantidad,
              precio_unitario: l.precio_unitario ?? 0,
              descuento: l.descuento ?? 0,
              subtotal: Number(l.subtotal ?? 0),
            })),
            vencimientos: [{ descripcion: "Vencimiento 1", fecha: fechaHoy.split("T")[0], total: totalValido }],
            seguimiento: [],
            medios_pago_detalle: [],
          }
          setFacturas(prev => [newFactura, ...prev])
        }
      } catch (err) {
        console.error("[handleCrearNVFinal] Error al crear factura:", err)
      }
    }

    // Si estamos editando, actualizar; si no, agregar nueva
    if (editingNVId) {
      setNotasVenta(prev => prev.map(nv => nv.id === editingNVId ? newNV : nv))
    } else {
      setNotasVenta(prev => [newNV, ...prev])
    }

    // Limpiar y abrir la NV creada
    setCreandoNV(false)
    setNvPrevisualizando(false)
    setNvLineas([])
    setNvClienteId(null)
    const defaultDep = depositos.find(d => (d.sucursal_id && sucursalActiva?.id ? d.sucursal_id === sucursalActiva.id : d.nombre === sucursalActiva?.nombre)) ?? depositos[0]
    setNvDepositoId(defaultDep?.id ?? 0)
    const defaultUbic = ubicaciones.find(u => u.deposito_id === defaultDep?.id && u.nombre === "Stock")
    setNvUbicacionId(defaultUbic?.id ?? 0)
    setEditingNVId(null)
    setSelectedNV(newNV)
    } finally {
      setGuardandoNV(false)
    }
  }

  // Vista de previsualización de NV
  const renderPrevisualizacionNV = () => {
    const selectedCliente = clientes.find(c => c.id === nvClienteId)
    const lineasValidas = nvLineas.filter(l => l.producto_id > 0 && l.producto_nombre.trim() !== "")
    const subtotal = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    const total = subtotal
    const deposito = depositos.find(d => d.id === nvDepositoId)
    const ubicacion = ubicaciones.find(u => u.id === nvUbicacionId)
    // Moneda de la lista de precios → determina moneda del comprobante
    const listaSelPrev = listasPrecios.find(l => l.id === nvListaPreciosId)
    const monedaPrev = listaSelPrev?.moneda_base ?? "ARS"
    const esUsdPrev = monedaPrev === "USD"

    return (
      <div>
        {/* Header con breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Notas de Venta / <span className="text-gray-700">Nueva Nota de Venta</span>
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setNvPrevisualizando(false)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-amber-900">Nueva Nota de Venta</h1>
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
              disabled={guardandoNV}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> {guardandoNV ? "Procesando..." : "Guardar Pedido"}
            </button>
            <button 
              onClick={() => handleCrearNVFinal("inmediata")}
              disabled={guardandoNV}
              className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" /> {guardandoNV ? "Procesando..." : "Confirmar Venta"}
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
                  <span className="ml-2 font-medium capitalize">{selectedCliente?.categoria_nombre ?? "-"}</span>
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
                {lineasValidas.map((linea, index) => {
                  const precioPrim = esUsdPrev ? (linea.precio_unitario_usd ?? linea.precio_unitario) : (linea.precio_unitario_ars ?? linea.precio_unitario)
                  const subtotalPrim = precioPrim * linea.cantidad * (1 - linea.descuento / 100)
                  return (
                    <tr key={index} className="border-b">
                      <td className="py-2">
                        <div className="font-medium">{linea.producto_nombre}</div>
                        {linea.series_seleccionadas && linea.series_seleccionadas.length > 0 && (
                          <div className="text-xs text-gray-500">IMEI: {linea.series_seleccionadas.map(s => typeof s === "string" ? s : s.serie).join(", ")}</div>
                        )}
                      </td>
                      <td className="py-2 text-center">{linea.cantidad}</td>
                      <td className="py-2 text-right">{formatCurrency(precioPrim, monedaPrev)}</td>
                      <td className="py-2 text-center">{linea.descuento}%</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(subtotalPrim, monedaPrev)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              {(() => {
                const subtotalPrim = lineasValidas.reduce((s, l) => s + (esUsdPrev ? (l.precio_unitario_usd ?? l.precio_unitario) : (l.precio_unitario_ars ?? l.precio_unitario)) * l.cantidad * (1 - l.descuento / 100), 0)
                const subtotalAry = lineasValidas.reduce((s, l) => s + (l.precio_unitario_ars ?? l.precio_unitario) * l.cantidad * (1 - l.descuento / 100), 0)
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal:</span>
                      <span>{formatCurrency(subtotalPrim, monedaPrev)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <div className="text-right">
                        <div className="text-emerald-700">
                          {monedaPrev === "USD" ? formatCurrency(subtotalPrim, "USD") : `ARS ${formatCurrency(subtotalPrim, "ARS")}`}
                        </div>
                        {esUsdPrev && <div className="text-xs text-gray-400 font-normal">ARS {formatCurrency(subtotalAry, "ARS")}</div>}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de Crear Nota de Venta (pantalla completa, no modal)
  const renderCrearNV = () => {
    const selectedCliente = clientes.find(c => c.id === nvClienteId)
  // Moneda del comprobante: viene de la lista de precios seleccionada
  const listaSelForm = listasPrecios.find(l => l.id === nvListaPreciosId)
  const monedaForm = listaSelForm?.moneda_base ?? "ARS"
  const esUsdForm = monedaForm === "USD"
  // Subtotal calculado dinámicamente en la moneda del comprobante
  // (linea.subtotal está siempre en ARS por cómo el dropdown retorna precio_unitario; recalculamos)
  const subtotalEnMoneda = (l: any) =>
    (esUsdForm ? (l.precio_unitario_usd ?? 0) : (l.precio_unitario_ars ?? l.precio_unitario ?? 0)) * l.cantidad * (1 - l.descuento / 100)
  const subtotal = nvLineas.reduce((s, l) => s + subtotalEnMoneda(l), 0)
  const total = subtotal
  // Subtotal/total en ARS (referencia) cuando la lista es USD
  const subtotalArsRef = esUsdForm
    ? nvLineas.reduce((s, l) => s + (l.precio_unitario_ars ?? 0) * l.cantidad * (1 - l.descuento / 100), 0)
    : 0
  
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
            <h1 className="text-2xl font-bold text-amber-900">{editingNVId ? "Editar Nota de Venta" : "Nueva Nota de Venta"}</h1>
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

            {/* Banner de aviso si no hay cliente */}
            {!nvClienteId && (
              <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Seleccioná un cliente arriba para habilitar la lista de precios, ubicación y productos.
              </div>
            )}

            {/* Bloque deshabilitado hasta que haya cliente */}
            <div className={!nvClienteId ? "space-y-6 opacity-50 pointer-events-none select-none" : "contents"}>
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
                    {listasPrecios.filter(l => l.activa !== false).map(l => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-500">
                  {nvListaPreciosId && (() => {
                    const listaSel = listasPrecios.find(l => l.id === nvListaPreciosId)
                    const moneda = listaSel?.moneda_base ?? "ARS"
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Moneda:</span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800" title="Determina la moneda de la NV, OE, REM y FAC">
                          {moneda}
                        </span>
                      </div>
                    )
                  })()}
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
                      const ubicacionStock = ubicaciones.find(u => u.deposito_id === newDepositoId && u.nombre === "Stock")
                        ?? ubicaciones.find(u => u.deposito_id === newDepositoId)
                      if (ubicacionStock) {
                        setNvUbicacionId(ubicacionStock.id)
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {depositos.map(d => (
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
                    {ubicaciones
                      .filter(u => u.deposito_id === nvDepositoId)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                El stock se descontará de: <span className="font-medium">{ubicaciones.find(u => u.id === nvUbicacionId)?.codigo || "-"}</span>
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
                                    onSelect={(p, precioUnitario, moneda, precioUSD, precioARS, iva) => {
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
                                      updated[index].iva = iva ?? 21
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
                        {formatCurrency(subtotalEnMoneda(linea), monedaForm)}
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
          </div>

          {/* Columna derecha - Resumen y acciones */}
          <div className="space-y-4">
            {/* Categoría de Cliente y Lista de Precios */}
            {(() => {
              const clienteNV = clientes.find(c => c.id === nvClienteId)
              const listaNV = clienteNV ? listasPrecios.find(l => l.id === clienteNV.lista_precios_id) : null
              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Configuración de Venta</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Categoría de Cliente</label>
                      {clienteNV ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {clienteNV.categoria_nombre || "Sin categoría"}
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
                  <span className="font-medium">{formatCurrency(subtotal, monedaForm)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <div className="text-right">
                      <div className="text-emerald-700">{formatCurrency(total, monedaForm)}</div>
                      {esUsdForm && (
                        <div className="text-xs text-gray-400 font-normal">ARS {formatCurrency(subtotalArsRef, "ARS")}</div>
                      )}
                    </div>
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
                  className="w-full bg-indigo-900 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
                <button
                  onClick={() => {
  setCreandoNV(false); setNvLineas([]); setNvClienteId(null)
  const cancelDep = depositos.find(d => (d.sucursal_id && sucursalActiva?.id ? d.sucursal_id === sucursalActiva.id : d.nombre === sucursalActiva?.nombre)) ?? depositos[0]
  setNvDepositoId(cancelDep?.id ?? 0)
  const cancelUbic = ubicaciones.find(u => u.deposito_id === cancelDep?.id && u.nombre === "Stock")
  setNvUbicacionId(cancelUbic?.id ?? 0)
  setEditingNVId(null); setNvPrevisualizando(false)
}}
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
    const nvId = Number(selectedNV.id)
    const nvNumero = selectedNV.numero
    const oesVinculadas = ordenesEntrega.filter(oe => Number(oe.nota_venta_id) === nvId)
    const remitosVinculados = remitos.filter(r =>
      (r.nota_venta_id != null && Number(r.nota_venta_id) === nvId) ||
      (r.nota_venta_id == null && r.nota_venta_numero === nvNumero)
    )
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedNV.numero}</h1>
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
                  const editDep = depositos.find(d => d.nombre === (selectedNV.deposito || sucursalActiva?.nombre)) ?? depositos.find(d => d.nombre === sucursalActiva?.nombre) ?? depositos[0]
                  setNvDepositoId(editDep?.id ?? 0)
                  const editUbic = ubicaciones.find(u => u.deposito_id === editDep?.id && u.nombre === "Stock")
                  setNvUbicacionId(editUbic?.id ?? 0)
                  setTipoVentaForm(selectedNV.tipo_venta || "inmediata")
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedOE.numero}</h1>
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
                  ) : selectedOE.nota_venta_numero ? (
                    <p className="font-mono text-lg font-bold text-blue-700">{selectedOE.nota_venta_numero}</p>
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
                    className="w-full bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800"
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
                      setRemitos(prev => [newRemito, ...prev])
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
            <h1 className="text-2xl font-bold text-amber-900">Nueva Orden de Entrega</h1>
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
                  className="w-full bg-indigo-900 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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

  // ── Modelos cotizables: filtrar los que tienen criterios completos ────────
  // Un modelo es "cotizable" si para cada categoría con accion='descuento' o
  // 'cartel_sistema' tiene al menos una opción con descuento_usd=0 (Impecable).
  const modelosCotizables = useMemo(() => {
    const catsRequeridas = cotizadorCategorias.filter(c => c.accion === "descuento" || c.accion === "cartel_sistema")
    return cotizadorModelos.filter(m => {
      const criterios = cotizadorCriteriosByModelo[m.id] ?? []
      return catsRequeridas.every(cat =>
        criterios.some(cr => cr.categoria_id === cat.id && Number(cr.descuento_usd) === 0)
      )
    })
  }, [cotizadorModelos, cotizadorCategorias, cotizadorCriteriosByModelo])

  // ── Cálculo del precio según la spec ──────────────────────────────────────
  // 1. Si alguna categoría 'cartel_sistema' tiene descuento>0 → -50% primero
  // 2. Sumar descuentos de categorías 'descuento' y 'whatsapp' (cuando tienen criterio seleccionado en ERP)
  // 3. Sin bonificación por múltiples daños
  // Nota: whatsapp con flag (sin criterios) no descuenta — solo es referencia visual
  const calcularPrecioFinalUsd = useCallback((
    base: number,
    eval_: typeof tomaEquipoEvaluacion
  ): { final: number; descuentoTotal: number; aplicaCartel: boolean } => {
    const aplicaCartel = eval_.some(e => e.accion === "cartel_sistema" && e.descuento_usd > 0)
    const baseAjustada = aplicaCartel ? base * 0.5 : base
    const descuentosNominales = eval_
      .filter(e => e.accion !== "cartel_sistema" && e.criterio_id)  // descuento + whatsapp con criterio
      .reduce((s, e) => s + Number(e.descuento_usd || 0), 0)
    const final = Math.max(0, baseAjustada - descuentosNominales)
    const descuentoTotal = base - final
    return { final: Number(final.toFixed(2)), descuentoTotal: Number(descuentoTotal.toFixed(2)), aplicaCartel }
  }, [])

  const handleCancelarTE = async () => {
    if (!selectedToma) return
    setCancelandoTE(true)
    try {
      const res = await fetch(`/api/tomas-equipo/${selectedToma.id}/cancelar`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "Error al cancelar la toma")
        return
      }
      // Recargar lista y cerrar ficha
      const updated = await fetch("/api/tomas-equipo")
      if (updated.ok) setTomasEquipo(await updated.json())
      setSelectedToma(null)
      setShowCancelarTEModal(false)
    } catch (e) {
      alert("Error de red al cancelar la toma")
    } finally {
      setCancelandoTE(false)
    }
  }

  const renderFichaTomaEquipo = () => {
    if (!selectedToma) return null
    const fechaObj = new Date(selectedToma.fecha)
    const fechaHora = fechaObj.toLocaleDateString('es-AR') + ' ' + fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const operacionEnCurso = selectedToma.estado !== 'cancelado' && selectedToma.estado_recepcion !== 'recibido' && selectedToma.estado_recepcion !== 'cancelado'

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
              selectedToma.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
              selectedToma.estado === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {selectedToma.estado.charAt(0).toUpperCase() + selectedToma.estado.slice(1)}
            </span>
            {selectedToma.estado !== 'cancelado' && (
              <button
                onClick={() => setShowCancelarTEModal(true)}
                className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancelar toma
              </button>
            )}
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
              <div className="flex justify-between"><span className="text-gray-500">Valor Base</span><span className="font-medium">USD {Number(selectedToma.precio_base).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Descuentos</span><span className="font-medium text-red-600">-USD {Number(selectedToma.descuentos).toFixed(2)}</span></div>
              <div className="flex justify-between border-t pt-3"><span className="text-gray-700 font-semibold">Precio Final Acordado</span><span className="font-bold text-emerald-600 text-base">USD {Number(selectedToma.precio_final).toFixed(2)}</span></div>
            </div>
          </div>

          {/* Evaluación de componentes */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Evaluación del Equipo</h3>
            <div className="space-y-2">
              {selectedToma.evaluacion.map((ev: any, i: number) => {
                // Compat con formato legacy {componente, estado, descuento} y nuevo {categoria, etiqueta, descuento_usd, accion, whatsapp_flag}
                const nombre = ev.categoria ?? ev.componente ?? "—"
                const etiqueta = ev.etiqueta ?? ev.estado ?? "—"
                const descUsd = Number(ev.descuento_usd ?? ev.descuento ?? 0)
                const whatsappFlag = ev.whatsapp_flag === true
                const esOk = descUsd === 0 && !whatsappFlag
                return (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{nombre}</span>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        esOk ? 'bg-green-100 text-green-700' :
                        whatsappFlag ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{etiqueta}</span>
                      {descUsd > 0 && <span className="text-red-600 text-xs">-USD {descUsd.toFixed(2)}</span>}
                    </div>
                  </div>
                )
              })}
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
                    onClick={async () => {
                      const nc = ajustes.find(a => a.numero === selectedToma.nota_credito_numero)
                      if (nc) {
                        setNcDetallePopup(nc)
                      } else {
                        // Fetch directo si no está en el state
                        const res = await fetch("/api/ajustes-clientes")
                        if (res.ok) {
                          const all = await res.json()
                          const found = all.find((a: any) => a.numero === selectedToma.nota_credito_numero)
                          if (found) setNcDetallePopup(found)
                        }
                      }
                    }}
                    className="font-medium text-emerald-700 hover:underline hover:text-emerald-900 cursor-pointer"
                  >
                    {selectedToma.nota_credito_numero}
                  </button>
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Concepto</span><span className="font-medium">Toma de equipo: {selectedToma.modelo_equipo}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Importe</span><span className="font-bold text-emerald-600">{formatCurrency(selectedToma.precio_final)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Estado</span>
                  {(() => {
                    const ncReal = ajustes.find(a => a.numero === selectedToma.nota_credito_numero)
                    const estadoNc = ncReal?.estado ?? "activo"
                    const isPublicada = estadoNc === "publicado" || estadoNc === "activo"
                    const isCancelada = estadoNc === "cancelado"
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isCancelada ? 'bg-red-100 text-red-700' :
                        isPublicada ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {isCancelada ? "Cancelada" :
                         estadoNc === "publicado" ? "Publicada" :
                         estadoNc === "activo" ? "Activa" : "Borrador"}
                      </span>
                    )
                  })()}
                </div>
                {selectedToma.estado === "cancelado"
                  ? <p className="text-xs text-red-500 pt-2 border-t">Esta NC fue revertida con un asiento de reversa.</p>
                  : <p className="text-xs text-gray-400 pt-2 border-t">Este crédito fue acreditado en la cuenta corriente del cliente.</p>}
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
                <div className="flex justify-between"><span className="text-gray-500">Número</span><button
                  onClick={async () => {
                    const res = await fetch("/api/recepciones-toma")
                    if (res.ok) {
                      const all = await res.json()
                      const found = all.find((r: any) => r.numero === selectedToma.recepcion_numero)
                      if (found) setRecDetallePopup(found)
                    }
                  }}
                  className="font-medium text-blue-700 hover:underline hover:text-blue-900 cursor-pointer"
                >{selectedToma.recepcion_numero}</button></div>
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
                        setImeiInput("")
                        setColorRecepcion("")
                        setBateriaRecepcionPct(undefined)
                        setOutletRecepcion(false)
                        setObservacionesRecepcion("")
                        setErrorRecepcion(null)
                        // Pre-seleccionar la primera ubicación del depósito de la sucursal activa
                        const dep = depositos.find(d => (d.sucursal_id && sucursalActiva?.id ? d.sucursal_id === sucursalActiva.id : d.nombre === sucursalActiva?.nombre)) ?? depositos[0]
                        const primeraUbic = ubicaciones.find(u => u.deposito_id === dep?.id)
                        setUbicacionRecepcionId(primeraUbic?.id ?? null)
                        setShowConfirmarRecepcionModal(true)
                      }}
                      className="w-full py-2 bg-indigo-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-800"
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

        {/* Modal confirmación cancelación TE */}
        {showCancelarTEModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelarTEModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Cancelar Toma de Equipo</h2>
              {selectedToma.estado_recepcion === 'recibido' ? (
                <p className="text-sm text-gray-600 mb-4">
                  El equipo <strong>{selectedToma.modelo_equipo}</strong> ya fue recibido físicamente. Al cancelar se revertirán <strong>la Nota de Crédito y la Recepción</strong>, generando los asientos de reversa correspondientes.
                </p>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  Se cancelarán la Nota de Crédito y la Recepción pendiente asociadas a esta toma, y se generará la reversa contable de la NC.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCancelarTEModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  No cancelar
                </button>
                <button
                  onClick={handleCancelarTE}
                  disabled={cancelandoTE}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelandoTE ? "Cancelando..." : "Confirmar cancelación"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCrearTomaEquipo = () => {
    const clienteSeleccionado = clientes.find(c => c.id === tomaEquipoClienteId)
    const modeloSeleccionado = cotizadorModelos.find(m => m.id === tomaEquipoModeloId)
    const criteriosDelModelo = tomaEquipoModeloId ? (cotizadorCriteriosByModelo[tomaEquipoModeloId] ?? []) : []
    const { final: precioCalculadoUsd, descuentoTotal: descuentoTotalUsd, aplicaCartel } =
      calcularPrecioFinalUsd(tomaEquipoPrecioBaseUsd, tomaEquipoEvaluacion)
    const precioFinalUsdEditable = tomaEquipoPrecioFinalUsd > 0 ? tomaEquipoPrecioFinalUsd : precioCalculadoUsd
    const precioFinalArs = cotizacionUsdBlue > 0 ? precioFinalUsdEditable * cotizacionUsdBlue : 0
    const tieneFlagWhatsapp = tomaEquipoEvaluacion.some(e => e.accion === "whatsapp" && e.whatsapp_flag)
    // Rango de tolerancia ±20% sobre el precio sugerido
    const rangoMinUsd = Number((precioCalculadoUsd * 0.8).toFixed(2))
    const rangoMaxUsd = Number((precioCalculadoUsd * 1.2).toFixed(2))
    const fueraDeRango = precioCalculadoUsd > 0 && (precioFinalUsdEditable < rangoMinUsd || precioFinalUsdEditable > rangoMaxUsd)

    const resetForm = () => {
      setTomaEquipoPaso(1)
      setTomaEquipoClienteId(null)
      setTomaEquipoModeloId(null)
      setTomaEquipoPrecioBaseUsd(0)
      setTomaEquipoPrecioFinalUsd(0)
      setTomaEquipoEvaluacion([])
      setTomaEquipoCreando(false)
    }

    // Inicializa la evaluación con la opción default por categoría (Impecable / sin daño)
    const inicializarEvaluacion = (modeloId: string) => {
      const criterios = cotizadorCriteriosByModelo[modeloId] ?? []
      const evalInicial = cotizadorCategorias.map(cat => {
        const opcionesCat = criterios.filter(c => c.categoria_id === cat.id).sort((a, b) => a.descuento_usd - b.descuento_usd)

        // whatsapp SIN criterios cargados → fallback a checkbox
        if (cat.accion === "whatsapp" && opcionesCat.length === 0) {
          return {
            categoria_id: cat.id, categoria_nombre: cat.nombre, accion: cat.accion,
            criterio_id: null, etiqueta: "Sin daño", descuento_usd: 0, whatsapp_flag: false,
          }
        }
        // Cualquier categoría con criterios → tomar el primero (Impecable / descuento más bajo)
        const impecable = opcionesCat.find(c => Number(c.descuento_usd) === 0) ?? opcionesCat[0]
        return {
          categoria_id: cat.id, categoria_nombre: cat.nombre, accion: cat.accion,
          criterio_id: impecable?.id ?? null,
          etiqueta: impecable?.etiqueta ?? "—",
          descuento_usd: Number(impecable?.descuento_usd ?? 0),
          whatsapp_flag: false,
        }
      })
      setTomaEquipoEvaluacion(evalInicial)
    }

    const handleConfirmar = async () => {
      if (!clienteSeleccionado || !modeloSeleccionado || guardandoToma) return
      if (!cotizacionUsdBlue || cotizacionUsdBlue <= 0) {
        alert("No hay cotización USD blue del día. Cargá una en Contabilidad → Cotizaciones antes de confirmar.")
        return
      }
      setGuardandoToma(true)

      try {
        const res = await fetch("/api/tomas-equipo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: clienteSeleccionado.id,
            cliente_nombre: clienteSeleccionado.nombre,
            modelo_equipo: modeloSeleccionado.producto_nombre,
            producto_id: modeloSeleccionado.producto_id,
            precio_base_usd: tomaEquipoPrecioBaseUsd,
            descuentos_usd: descuentoTotalUsd,
            precio_final_usd: precioFinalUsdEditable,
            cotizacion: cotizacionUsdBlue,
            sucursal_id: sucursalActiva?.id ?? null,
            evaluacion: tomaEquipoEvaluacion.map(e => ({
              categoria_id: e.categoria_id,
              categoria: e.categoria_nombre,
              accion: e.accion,
              criterio_id: e.criterio_id,
              etiqueta: e.etiqueta,
              descuento_usd: e.descuento_usd,
              whatsapp_flag: e.whatsapp_flag,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data.error ?? "Error al crear la toma")
          setGuardandoToma(false)
          return
        }
        if (data._asiento_nc_error) {
          alert(`⚠️ Toma registrada, pero el asiento contable de la NC no se generó:\n${data._asiento_nc_error}`)
        }
        // Refrescar lista de tomas desde el servidor
        const updated = await fetch("/api/tomas-equipo")
        if (updated.ok) {
          const tomas = await updated.json()
          setTomasEquipo(tomas)
          const tomaCreada = tomas.find((t: any) => t.id === data.id)
          if (tomaCreada) setSelectedToma(tomaCreada)
        }
        resetForm()
      } catch (err) {
        console.error("[tomas-equipo] error al persistir:", err)
        alert("Error de red al crear la toma")
      } finally {
        setGuardandoToma(false)
      }
    }

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={resetForm} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-amber-900">Nueva Toma de Equipo</h1>
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
                  className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
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
              <p className="text-sm text-gray-500 mb-6">Solo se muestran modelos con criterios de evaluación completos.</p>

              {modelosCotizables.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No hay modelos cotizables. Configurá modelos y criterios en Ventas → Configuración → Criterios para cotizador.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Equipo</label>
                  <select
                    value={tomaEquipoModeloId || ""}
                    onChange={(e) => {
                      const id = e.target.value
                      const modelo = cotizadorModelos.find(m => m.id === id)
                      setTomaEquipoModeloId(id || null)
                      setTomaEquipoPrecioBaseUsd(modelo?.valor_base_usd || 0)
                      // No pre-fill del precio final — queda 0 y el input muestra el sugerido (precio_base − descuentos)
                      setTomaEquipoPrecioFinalUsd(0)
                      if (id) inicializarEvaluacion(id)
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Seleccionar modelo...</option>
                    {modelosCotizables.map(m => (
                      <option key={m.id} value={m.id}>{m.producto_nombre} — USD {m.valor_base_usd.toFixed(2)}</option>
                    ))}
                  </select>
                </div>

                {modeloSeleccionado && (
                  <div className="bg-emerald-50 rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-10 h-10 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-emerald-900">{modeloSeleccionado.producto_nombre}</p>
                        <p className="text-sm text-emerald-700">Valor base: <span className="font-bold">USD {modeloSeleccionado.valor_base_usd.toFixed(2)}</span></p>
                        {cotizacionUsdBlue > 0 && (
                          <p className="text-xs text-emerald-600">≈ {formatCurrency(modeloSeleccionado.valor_base_usd * cotizacionUsdBlue)} (cotización blue: ${cotizacionUsdBlue.toFixed(2)})</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setTomaEquipoPaso(1)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={() => tomaEquipoModeloId && setTomaEquipoPaso(3)}
                  disabled={!tomaEquipoModeloId}
                  className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
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
              <p className="text-sm text-gray-500 mb-6">Evalúe cada categoría según el estado real del equipo. Los descuentos se aplican en USD.</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {tomaEquipoEvaluacion.map((ev, idx) => {
                  const opciones = criteriosDelModelo.filter(c => c.categoria_id === ev.categoria_id)

                  // whatsapp SIN criterios cargados → checkbox fallback (web behavior)
                  if (ev.accion === "whatsapp" && opciones.length === 0) {
                    return (
                      <div key={ev.categoria_id} className="border rounded-lg p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ev.whatsapp_flag}
                            onChange={(e) => {
                              const next = [...tomaEquipoEvaluacion]
                              next[idx] = { ...ev, whatsapp_flag: e.target.checked, etiqueta: e.target.checked ? "Con daño (sin criterios cargados)" : "Sin daño" }
                              setTomaEquipoEvaluacion(next)
                              setTomaEquipoPrecioFinalUsd(0)
                            }}
                          />
                          ¿Tiene daño en {ev.categoria_nombre}?
                        </label>
                        {ev.whatsapp_flag && (
                          <p className="text-xs text-amber-600 mt-1.5">Cargá criterios para esta categoría en Configuración para poder aplicar descuento.</p>
                        )}
                      </div>
                    )
                  }
                  // Cualquier categoría con criterios cargados (incluido whatsapp) → dropdown
                  return (
                    <div key={ev.categoria_id} className="border rounded-lg p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {ev.categoria_nombre}
                        {ev.accion === "cartel_sistema" && <span className="ml-2 text-xs text-amber-600">(-50% si aplica)</span>}
                      </label>
                      <select
                        value={ev.criterio_id ?? ""}
                        onChange={(e) => {
                          const opt = opciones.find(o => o.id === e.target.value)
                          if (!opt) return
                          const next = [...tomaEquipoEvaluacion]
                          next[idx] = { ...ev, criterio_id: opt.id, etiqueta: opt.etiqueta, descuento_usd: Number(opt.descuento_usd) }
                          setTomaEquipoEvaluacion(next)
                          setTomaEquipoPrecioFinalUsd(0)  // re-trackear el sugerido al cambiar evaluación
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        {opciones.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.etiqueta}{o.descuento_usd > 0 ? ` (-USD ${o.descuento_usd.toFixed(2)})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Panel de Resumen */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="font-semibold text-gray-900 mb-3">Resumen de Valorización (USD)</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Valor base:</span>
                    <span className="font-medium">USD {tomaEquipoPrecioBaseUsd.toFixed(2)}</span>
                  </div>
                  {aplicaCartel && (
                    <div className="flex justify-between text-amber-700">
                      <span>⚠️ Cartel de sistema (-50%):</span>
                      <span>-USD {(tomaEquipoPrecioBaseUsd * 0.5).toFixed(2)}</span>
                    </div>
                  )}
                  {tomaEquipoEvaluacion.filter(e => e.accion !== "cartel_sistema" && e.criterio_id && e.descuento_usd > 0).map(e => (
                    <div key={e.categoria_id} className="flex justify-between text-red-600">
                      <span>- {e.categoria_nombre} ({e.etiqueta}):</span>
                      <span>-USD {e.descuento_usd.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Precio sugerido:</span>
                    <span className="text-emerald-600">USD {precioCalculadoUsd.toFixed(2)}</span>
                  </div>
                  {cotizacionUsdBlue > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Equivalente ARS @ {cotizacionUsdBlue.toFixed(2)}:</span>
                      <span>{formatCurrency(precioCalculadoUsd * cotizacionUsdBlue)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Final acordado (USD)
                    {precioCalculadoUsd > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        Rango ±20%: USD {rangoMinUsd.toFixed(2)} – USD {rangoMaxUsd.toFixed(2)}
                      </span>
                    )}
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    value={tomaEquipoPrecioFinalUsd || precioCalculadoUsd}
                    onChange={(e) => setTomaEquipoPrecioFinalUsd(Number(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                      fueraDeRango
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  />
                  {fueraDeRango ? (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Precio fuera del rango permitido (±20%). Requiere aprobación del supervisor.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">El operador puede ajustar el precio final si negocia con el cliente.</p>
                  )}
                </div>
              </div>

              {tieneFlagWhatsapp && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 mt-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    El equipo tiene daños que requieren evaluación presencial. El precio final puede ajustarse después de la inspección física.
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button onClick={() => setTomaEquipoPaso(2)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button onClick={() => setTomaEquipoPaso(4)} className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 flex items-center gap-2">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Confirmación */}
          {tomaEquipoPaso === 4 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Confirmación de la Operación</h2>
              <p className="text-sm text-gray-500 mb-6">Revise los datos antes de confirmar. Se generará una recepción de compra y una nota de crédito en USD.</p>

              {(!cotizacionUsdBlue || cotizacionUsdBlue <= 0) && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No hay cotización USD blue del día. Cargá una en Contabilidad → Cotizaciones antes de confirmar.
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
                  <p className="text-sm">{clienteSeleccionado?.codigo} - {clienteSeleccionado?.nombre}</p>
                  <p className="text-sm text-gray-500">{clienteSeleccionado?.tipo_documento}: {clienteSeleccionado?.numero_documento}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Equipo</h3>
                  <p className="text-sm font-medium">{modeloSeleccionado?.producto_nombre}</p>
                  <div className="mt-2 space-y-1">
                    {tomaEquipoEvaluacion.map(e => (
                      <div key={e.categoria_id} className="flex justify-between text-xs">
                        <span className="text-gray-500">{e.categoria_nombre}:</span>
                        <span className={e.descuento_usd > 0 || e.whatsapp_flag ? 'text-red-600' : 'text-emerald-600'}>
                          {e.etiqueta}{e.descuento_usd > 0 ? ` (-USD ${e.descuento_usd.toFixed(2)})` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-4">
                  <h3 className="font-semibold text-emerald-900 mb-2">Resumen Financiero</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Valor base:</span>
                      <span>USD {tomaEquipoPrecioBaseUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Descuentos aplicados:</span>
                      <span>-USD {descuentoTotalUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-emerald-200">
                      <span>Precio Final Acordado:</span>
                      <span className="text-emerald-700">USD {precioFinalUsdEditable.toFixed(2)}</span>
                    </div>
                    {cotizacionUsdBlue > 0 && (
                      <div className="flex justify-between text-xs text-gray-600 pt-1">
                        <span>Equivalente ARS @ blue {cotizacionUsdBlue.toFixed(2)}:</span>
                        <span className="font-medium">{formatCurrency(precioFinalArs)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Comprobantes a Generar</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>Recepción de Compra (pendiente de recepción física)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Nota de Crédito por USD {precioFinalUsdEditable.toFixed(2)} en CC del cliente</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-700 pl-6">
                      <span>+ asiento contable en ARS al cambio del día (blue)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setTomaEquipoPaso(3)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={guardandoToma || !cotizacionUsdBlue || cotizacionUsdBlue <= 0}
                  className="px-6 py-2 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" /> {guardandoToma ? "Procesando..." : "Confirmar Operación"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // SEÑA DE EQUIPO — Listado, Ficha y Formulario de Creación
  // ============================================================

  const formatFechaLimite = (fecha: string) => {
    if (!fecha) return "—"
    const d = new Date(fecha + "T00:00:00")
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const diasRestantes = (fechaLimite: string) => {
    if (!fechaLimite) return null
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const limite = new Date(fechaLimite + "T00:00:00")
    return Math.ceil((limite.getTime() - hoy.getTime()) / 86400000)
  }

  const abrirSeniaDoc = async (tipo: "nv" | "oe" | "remito", id: number | null) => {
    if (!id) return
    setSeniaDocModalTipo(tipo)
    setSeniaDocModalLoading(true)
    setShowSeniaDocModal(true)
    try {
      if (tipo === "nv") {
        const res = await fetch(`/api/notas-venta?id=${id}`)
        const data = await res.json()
        const raw = Array.isArray(data) ? data[0] : data
        if (raw?.id) {
          setSelectedNV({
            id: raw.id, numero: raw.numero, cliente_id: raw.cliente_id,
            cliente_nombre: raw.cliente_nombre ?? "", cliente_codigo: raw.cliente_codigo ?? "",
            vendedor_id: raw.vendedor_id ?? 1, vendedor_nombre: raw.vendedor_nombre ?? "",
            fecha: raw.fecha ?? raw.created_at, estado: raw.estado ?? "abierta",
            moneda: raw.moneda ?? "ARS", tipo_cotizacion: raw.tipo_cotizacion ?? "blue",
            cotizacion: Number(raw.cotizacion) || 1450, lista_precios_id: raw.lista_precios_id ?? 1,
            termino_pago_id: raw.termino_pago_id ?? 1, termino_pago_nombre: raw.termino_pago_nombre ?? "Contado",
            deposito: raw.deposito ?? "", tipo_venta: raw.tipo_venta ?? "inmediata",
            lineas: (raw.notas_venta_lineas ?? []).map((l: any) => ({
              id: l.id, producto_id: l.producto_id, producto_nombre: l.producto_nombre,
              descripcion: l.descripcion ?? "", cantidad: l.cantidad, precio_unitario: l.precio_unitario,
              descuento: l.descuento ?? 0, subtotal: Number(l.subtotal ?? 0), iva: Number(l.iva ?? 0),
              requiere_serie: false, series_seleccionadas: [],
            })),
            subtotal: Number(raw.subtotal ?? 0), descuento_global: 0, impuestos: Number(raw.impuestos ?? 0),
            cotizacion_tipo: raw.tipo_cotizacion ?? "blue", total: Number(raw.total ?? 0),
            sucursal: raw.sucursal ?? "", punto_venta: raw.punto_venta ?? "10000",
          })
        }
      } else if (tipo === "oe") {
        const res = await fetch(`/api/ordenes-entrega?id=${id}`)
        const data = await res.json()
        const raw = Array.isArray(data) ? data[0] : data
        if (raw?.id) {
          setSelectedOE({
            id: raw.id, numero: raw.numero, nota_venta_id: raw.nota_venta_id ?? 0,
            nota_venta_numero: raw.nota_venta_numero ?? "", cliente_id: raw.cliente_id ?? 0,
            cliente_nombre: raw.cliente_nombre ?? "",
            fecha_creacion: raw.fecha ?? raw.created_at ?? "",
            fecha_entrega: raw.fecha_entrega_programada ?? raw.fecha ?? "",
            estado: (raw.estado ?? "confirmada") as OrdenEntrega["estado"],
            deposito: raw.deposito_origen ?? "",
            sucursal: "",
            domicilio_envio: "",
            remito_numero: null,
            productos: (raw.productos ?? []).map((p: any) => ({
              producto_id: p.producto_id ?? 0,
              producto_nombre: p.nombre ?? p.producto_nombre ?? "",
              cantidad: p.cantidad ?? 1,
              reserva: p.reserva ?? 0,
              estado: (p.estado === "confirmado" ? "confirmado" : "pendiente") as "pendiente" | "confirmado",
            })),
            seguimiento: raw.seguimiento ?? [],
          })
        }
      } else if (tipo === "remito") {
        const res = await fetch(`/api/remitos-venta?id=${id}`)
        const data = await res.json()
        const raw = Array.isArray(data) ? data[0] : data
        if (raw?.id) {
          setSelectedRemito({
            id: raw.id, numero: raw.numero, orden_entrega_id: raw.orden_entrega_id ?? 0,
            orden_entrega_numero: raw.orden_entrega_numero ?? "", nota_venta_id: raw.nota_venta_id,
            nota_venta_numero: raw.nota_venta_numero ?? "", cliente_id: raw.cliente_id ?? 0,
            cliente_nombre: raw.cliente_nombre ?? "", fecha: raw.fecha ?? raw.created_at,
            estado: raw.estado ?? "en_ejecucion", tipo: raw.tipo ?? "salida",
            deposito: raw.deposito ?? "", ubicacion: raw.ubicacion ?? "",
            sucursal: raw.sucursal ?? "",
            bultos: raw.total_bultos ?? raw.bultos ?? 1,
            peso_kg: raw.peso_kg ?? 0, peso_neto_kg: raw.peso_neto_kg ?? 0,
            valor_declarado: Number(raw.valor_declarado ?? 0),
            control_factura: (raw.control_factura ?? "pendiente") as "facturado" | "pendiente",
            observaciones: raw.observaciones ?? "",
            productos: raw.productos ?? [], lineas: raw.lineas ?? [], seguimiento: raw.seguimiento ?? [],
          })
        }
      }
    } catch { /* silent */ }
    finally { setSeniaDocModalLoading(false) }
  }

  const abrirModalSeriaSenia = async (productoId: number) => {
    setShowSeniaSerieModal(true)
    setSeniaSeriesDisponibles([])
    setSeniaSerieBusqueda("")
    try {
      const params = new URLSearchParams({ producto_id: String(productoId), estado: "disponible" })
      if (nvUbicacionId > 0) params.set("ubicacion_id", String(nvUbicacionId))
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
      setSeniaSeriesDisponibles(mapeadas)
    } catch {
      setSeniaSeriesDisponibles([])
    } finally {
      setSeniaSerieCargando(false)
    }
  }

  const resetFormSenia = () => {
    setSeniaClienteId(null)
    setSeniaStockItemId(null)
    setSeniaEquipoNombre("")
    setSeniaEquipoImei("")
    setSeniaEquipoColor("")
    setSeniaEquipoBateria(undefined)
    setSeniaPrecioVenta(0)
    setSeniaDescuento(0)
    const _d15 = new Date(); _d15.setDate(_d15.getDate() + 15)
    setSeniaFechaLimite(_d15.toISOString().split('T')[0])
    setSeniaListaPreciosId(null)
    setSeniaMoneda('ARS')
    setSeniaCotizacion(1)
    setSeniaMontoInput(0)
    setSeniaMedioPagoInput("")
    setSeniaCajaValorId("")
    setSeniaConTomaIntegrada(false)
    setSeniaMediosCierre([{ medio: "efectivo", monto: 0 }])
    setCreandoSenia(false)
    setSeniaEquipoSearchText("")
    setSeniaEquipoSearchOpen(false)
    setSeniaProductoId(null)
    setSeniaProductoRequiereSerie(false)
  }

  const renderCrearSeniaEquipo = () => {
    const clienteSeleccionado = clientes.find(c => c.id === seniaClienteId)
    const precioFinalCalculado = seniaPrecioVenta - seniaDescuento

    const handleCrear = async () => {
      if (!seniaClienteId || !seniaEquipoNombre) return
      try {
        const res = await fetch("/api/senias-equipo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: seniaClienteId,
            cliente_nombre: clienteSeleccionado?.nombre ?? "",
            stock_item_id: seniaStockItemId,
            equipo_nombre: seniaEquipoNombre,
            equipo_imei: seniaEquipoImei || null,
            equipo_color: seniaEquipoColor || null,
            equipo_bateria: seniaEquipoBateria ?? null,
            precio_venta: seniaPrecioVenta,
            descuento: seniaDescuento,
            precio_final: precioFinalCalculado,
            fecha_limite: seniaFechaLimite,
            lista_precios_id: seniaListaPreciosId,
            moneda: seniaMoneda,
            cotizacion: seniaMoneda === 'USD' ? seniaCotizacion : 1,
            sucursal_id: sucursalActiva?.id ?? null,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const nueva: SeniaEquipo = {
            id: data.id,
            numero: data.numero,
            fecha: new Date().toISOString(),
            fecha_limite: seniaFechaLimite,
            estado: "en_curso",
            vendedor_id: null,
            sucursal_id: sucursalActiva?.id ?? null,
            cliente_id: seniaClienteId,
            cliente_nombre: clienteSeleccionado?.nombre ?? "",
            stock_item_id: seniaStockItemId,
            equipo_nombre: seniaEquipoNombre,
            equipo_imei: seniaEquipoImei || null,
            equipo_color: seniaEquipoColor || null,
            equipo_bateria: seniaEquipoBateria ?? null,
            precio_venta: seniaPrecioVenta,
            descuento: seniaDescuento,
            precio_final: precioFinalCalculado,
            monto_senia: 0,
            medio_pago_senia: null,
            moneda: seniaMoneda,
            cotizacion: seniaMoneda === 'USD' ? seniaCotizacion : 1,
            estado_senia: "sin_senia",
            recibo_senia_numero: null,
            nota_venta_id: data.nota_venta_id ?? null,
            nota_venta_numero: data.nota_venta_numero ?? "",
            oe_id: data.oe_id ?? null,
            oe_numero: data.oe_numero ?? "",
            remito_id: null,
            remito_numero: null,
            factura_id: null,
            factura_numero: null,
            medios_pago_cierre: [],
            toma_equipo_id: null,
            seguimiento: [],
          }
          setSeniasEquipo(prev => [nueva, ...prev])
          resetFormSenia()
          setSelectedSenia(nueva)
          // Refrescar OEs para que la OE vinculada aparezca inmediatamente
          fetch("/api/ordenes-entrega").then(r => r.json()).then(data => {
            if (Array.isArray(data) && data.length > 0) {
              setOrdenesEntrega(data.map((oe: any) => ({
                id: oe.id, numero: oe.numero, nota_venta_id: oe.nota_venta_id ?? 0,
                nota_venta_numero: oe.nota_venta_numero ?? "", cliente_id: oe.cliente_id ?? 0,
                cliente_nombre: oe.cliente_nombre ?? "", fecha: oe.fecha ?? oe.created_at,
                fecha_entrega_programada: oe.fecha_entrega_programada ?? oe.fecha ?? "",
                estado: oe.estado ?? "confirmada", tipo: oe.tipo ?? "venta",
                deposito_origen: oe.deposito_origen ?? "", ubicacion_origen: oe.ubicacion_origen ?? "",
                total_productos: oe.total_productos ?? 0, productos_entregados: oe.productos_entregados ?? 0,
                productos: oe.productos ?? [], seguimiento: oe.seguimiento ?? [],
              })))
            }
          }).catch(() => {})
        }
      } catch (e) {
        console.error("[senias] crear error:", e)
      }
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BotonVolver onClick={resetFormSenia} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-amber-900">Nueva Seña de Equipo</h1>
            <p className="text-sm text-gray-500">Complete los datos para reservar el equipo</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* CABECERA */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" /> Datos de la Operación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <input type="text" value={sucursalActiva?.nombre ?? ""} readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
                <input type="date" value={seniaFechaLimite} onChange={e => setSeniaFechaLimite(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                <select
                  value={seniaClienteId ?? ""}
                  onChange={e => {
                    const clienteId = Number(e.target.value) || null
                    setSeniaClienteId(clienteId)
                    if (clienteId) {
                      const cliente = clientes.find(c => c.id === clienteId)
                      const categoria = categoriasCliente.find(cat => cat.id === cliente?.categoria_id)
                      const listaId = categoria?.lista_precios_defecto_id ?? cliente?.lista_precios_id ?? null
                      setSeniaListaPreciosId(listaId ?? null)
                      if (listaId) {
                        const lista = listasPrecios.find(l => l.id === listaId)
                        const moneda = (lista?.moneda_base === 'USD' ? 'USD' : 'ARS') as 'ARS' | 'USD'
                        setSeniaMoneda(moneda)
                        if (moneda === 'ARS') setSeniaCotizacion(1)
                      }
                    } else {
                      setSeniaListaPreciosId(null)
                      setSeniaMoneda('ARS')
                      setSeniaCotizacion(1)
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lista de precios</label>
                <input
                  type="text"
                  readOnly
                  value={seniaListaPreciosId ? (listasPrecios.find(l => l.id === seniaListaPreciosId)?.nombre ?? `Lista #${seniaListaPreciosId}`) : '— Sin lista —'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
              </div>
            </div>
          </div>

          {/* DATOS DEL CLIENTE Y EQUIPO */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> Datos del Cliente y Equipo
            </h3>
            <div className="space-y-4">
              {/* Selector de equipo — igual estilo NV */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipo <span className="text-red-500">*</span></label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={seniaInputRef}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={seniaEquipoSearchText}
                      onChange={e => {
                        setSeniaEquipoSearchText(e.target.value)
                        setSeniaEquipoSearchOpen(true)
                        setSeniaEquipoNombre(e.target.value)
                        setSeniaStockItemId(null)
                        setSeniaProductoId(null)
                        setSeniaProductoRequiereSerie(false)
                        setSeniaEquipoImei("")
                        setSeniaEquipoColor("")
                        setSeniaEquipoBateria(undefined)
                      }}
                      onFocus={() => setSeniaEquipoSearchOpen(true)}
                      onBlur={() => setTimeout(() => setSeniaEquipoSearchOpen(false), 200)}
                      placeholder="Buscar producto..."
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    {seniaEquipoSearchOpen && (
                      <ProductoDropdown
                        nvClienteId={seniaClienteId}
                        nvListaPreciosId={seniaListaPreciosId}
                        clientes={clientes}
                        listasPrecios={listasPrecios}
                        versionesLista={versionesLista}
                        productosConSerie={productosMaestro}
                        productoSearchText={seniaEquipoSearchText}
                        anchorRef={seniaInputRef as React.RefObject<HTMLInputElement>}
                        onSelect={(p, precioUnitario, moneda, precioUSD, precioARS) => {
                          setSeniaEquipoNombre(p.nombre)
                          setSeniaEquipoSearchText(p.nombre)
                          setSeniaEquipoSearchOpen(false)
                          // Usar el precio en la moneda correcta de la lista
                          setSeniaPrecioVenta(moneda === 'USD' ? precioUSD : precioARS)
                          setSeniaMoneda(moneda)
                          setSeniaProductoId(p.id)
                          setSeniaProductoRequiereSerie(p.requiere_serie ?? false)
                          setSeniaStockItemId(null)
                          setSeniaEquipoImei("")
                          setSeniaEquipoColor("")
                          setSeniaEquipoBateria(undefined)
                          if (p.requiere_serie) {
                            setTimeout(() => abrirModalSeriaSenia(p.id), 100)
                          }
                        }}
                      />
                    )}
                  </div>
                  {seniaProductoRequiereSerie && seniaProductoId && (
                    <button
                      type="button"
                      onClick={() => abrirModalSeriaSenia(seniaProductoId!)}
                      className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                        seniaStockItemId
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {seniaStockItemId ? "✓ IMEI" : "Sel. IMEI"}
                    </button>
                  )}
                </div>
                {seniaStockItemId && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ {seniaEquipoImei && `S/N: ${seniaEquipoImei}`}{seniaEquipoColor && ` | ${seniaEquipoColor}`}{seniaEquipoBateria != null && ` | 🔋${seniaEquipoBateria}%`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta {seniaMoneda === 'USD' ? '(USD)' : '($)'}</label>
                  <input type="text" readOnly value={seniaMoneda === 'USD' ? `USD ${seniaPrecioVenta.toLocaleString('es-AR', {minimumFractionDigits:2})}` : formatCurrency(seniaPrecioVenta)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento {seniaMoneda === 'USD' ? '(USD)' : '($)'}</label>
                  <input type="number" min={0} value={seniaDescuento} onChange={e => setSeniaDescuento(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio final acordado</label>
                  <input type="text" value={seniaMoneda === 'USD' ? `USD ${precioFinalCalculado.toLocaleString('es-AR', {minimumFractionDigits:2})}` : formatCurrency(precioFinalCalculado)} readOnly
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-emerald-50 text-emerald-800 font-semibold" />
                </div>
              </div>
            </div>
          </div>

          {/* DOCUMENTOS QUE SE GENERARÁN */}
          <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4">
            <p className="text-sm font-medium text-gray-600 mb-2">Al confirmar se generará automáticamente:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Nota de Venta — Abierta</div>
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-amber-500" /> Orden de Entrega — Confirmada</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Remito y Factura se generan al confirmar el cierre de la seña.</p>
          </div>

          {/* BOTÓN CONFIRMAR */}
          <div className="flex justify-end gap-3">
            <button onClick={resetFormSenia} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleCrear}
              disabled={!seniaClienteId || !seniaEquipoNombre}
              className="px-6 py-2.5 bg-indigo-900 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Crear Seña
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderFichaSeniaEquipo = () => {
    if (!selectedSenia) return null
    const s = selectedSenia
    const fechaObj = new Date(s.fecha)
    const fechaHora = fechaObj.toLocaleDateString("es-AR") + " " + fechaObj.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    const dias = diasRestantes(s.fecha_limite)
    const vencida = dias !== null && dias < 0 && s.estado === "en_curso"
    const saldoPendiente = Math.max(0, s.precio_final - s.monto_senia)
    const totalCierre = seniaMediosCierre.reduce((a, m) => a + (m.monto || 0), 0)

    const handleRegistrarSenia = async () => {
      if (!seniaMontoInput && seniaMontoInput !== 0) return
      setSeniaRegistrando(true)
      try {
        const res = await fetch(`/api/senias-equipo/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "registrar_senia",
            monto_senia: seniaMontoInput,
            medio_pago_senia: seniaMedioPagoInput,
            cotizacion_senia: seniaCotizacionPago,
            moneda_pago: seniaCajaValores.find(v => v.id === seniaCajaValorId)?.moneda ?? "ARS",
            caja_id: seniaCajaId || null,
            caja_valor_id: seniaCajaValorId || null,
            sucursal_id: sucursalActiva?.id ?? null,
            usuario: "Operador",
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const updated = { ...s, ...data.senia }
          setSeniasEquipo(prev => prev.map(x => x.id === s.id ? updated : x))
          setSelectedSenia(updated)
          setSeniaMontoInput(0)
          setSeniaCajaValorId("")
        } else {
          const err = await res.json().catch(() => ({ error: `Error ${res.status}` }))
          alert(`Error al registrar seña: ${err.error ?? res.status}`)
        }
      } catch (e) {
        console.error("[senias] registrar error:", e)
        alert("Error de conexión al registrar la seña.")
      } finally {
        setSeniaRegistrando(false)
      }
    }

    const handleActualizarFecha = async () => {
      if (!seniaFechaLimiteEdit) return
      try {
        const res = await fetch(`/api/senias-equipo/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "actualizar_fecha_limite", fecha_limite: seniaFechaLimiteEdit, usuario: "Operador" }),
        })
        if (res.ok) {
          const data = await res.json()
          const updated = { ...s, ...data.senia }
          setSeniasEquipo(prev => prev.map(x => x.id === s.id ? updated : x))
          setSelectedSenia(updated)
          setSeniaEditandoFecha(false)
        }
      } catch (e) {
        console.error("[senias] fecha error:", e)
      }
    }

    const handleCancelar = async () => {
      try {
        const res = await fetch(`/api/senias-equipo/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "cancelar", motivo: seniaCancelMotivo, usuario: "Operador" }),
        })
        if (res.ok) {
          const data = await res.json()
          const updated = { ...s, ...data.senia }
          setSeniasEquipo(prev => prev.map(x => x.id === s.id ? updated : x))
          setSelectedSenia(updated)
          setSeniaCancelando(false)
          setSeniaCancelMotivo("")
        }
      } catch (e) {
        console.error("[senias] cancelar error:", e)
      }
    }

    const handleConfirmarCierre = async () => {
      setSeniaCerrando(true)
      try {
        const res = await fetch(`/api/senias-equipo/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accion: "confirmar_cierre",
            medios_pago_cierre: seniaMediosCierre,
            usuario: "Operador",
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const updated = { ...s, ...data.senia }
          setSeniasEquipo(prev => prev.map(x => x.id === s.id ? updated : x))
          setSelectedSenia(updated)
          setSeniaMediosCierre([{ medio: "efectivo", monto: 0 }])
          setSeniaConTomaIntegrada(false)
          // Refrescar remitos, facturas, OEs y NVs tras el cierre
          fetch("/api/remitos-venta").then(r => r.json()).then(d => {
            if (Array.isArray(d) && d.length > 0) setRemitos(d.map((r: any) => ({
              id: r.id, numero: r.numero, orden_entrega_id: r.orden_entrega_id ?? 0,
              orden_entrega_numero: r.orden_entrega_numero ?? "",
              nota_venta_id: r.nota_venta_id ?? undefined, nota_venta_numero: r.nota_venta_numero ?? "",
              cliente_id: r.cliente_id ?? 0, cliente_nombre: r.cliente_nombre ?? "",
              fecha: r.fecha ?? r.created_at, estado: r.estado ?? "confirmado",
              tipo: r.tipo ?? "salida", deposito: r.deposito ?? "", ubicacion: r.ubicacion ?? "",
              sucursal: r.sucursal ?? "", bultos: r.total_bultos ?? r.bultos ?? 1,
              peso_kg: r.peso_kg ?? 0, peso_neto_kg: r.peso_neto_kg ?? 0,
              valor_declarado: Number(r.valor_declarado ?? 0),
              control_factura: (r.control_factura ?? "pendiente") as "facturado" | "pendiente",
              observaciones: r.observaciones ?? "", productos: r.productos ?? [],
              lineas: r.lineas ?? [], seguimiento: r.seguimiento ?? [],
            })))
          }).catch(() => {})
          fetch("/api/facturas").then(r => r.json()).then(d => {
            if (Array.isArray(d) && d.length > 0) setFacturas(d.map((f: any) => ({
              id: f.id, numero: f.numero ?? "",
              nota_venta_id: f.nota_venta_id ?? 0, nota_venta_numero: f.nota_venta_numero ?? "",
              cliente_id: f.cliente_id ?? 0, cliente_nombre: f.cliente_nombre ?? "",
              cliente_documento: f.cliente_documento ?? "", estado: f.estado ?? "abierta",
              fecha: f.fecha ?? f.created_at, vendedor_nombre: f.vendedor_nombre ?? "",
              domicilio_facturacion: f.domicilio_facturacion ?? "", moneda: f.moneda ?? "ARS",
              tipo_cotizacion: f.tipo_cotizacion ?? "blue", cotizacion: Number(f.cotizacion) || 1,
              termino_pago: f.termino_pago ?? "Contado", condicion_pago: f.condicion_pago ?? "",
              fecha_vencimiento: f.fecha_vencimiento ?? "",
              subtotal: Number(f.subtotal ?? 0), descuento: Number(f.descuento ?? 0),
              impuestos: Number(f.impuestos ?? 0), total: Number(f.total ?? 0),
              saldo: Number(f.saldo ?? 0), sucursal: f.sucursal ?? "",
              lineas: (f.facturas_lineas ?? []).map((l: any) => ({
                producto_nombre: l.producto_nombre ?? "", descripcion: l.descripcion ?? "",
                cantidad: l.cantidad ?? 1, precio_unitario: l.precio_unitario ?? 0,
                descuento: l.descuento ?? 0, subtotal: Number(l.subtotal ?? 0),
              })),
              vencimientos: (f.facturas_vencimientos ?? []).map((v: any) => ({
                descripcion: v.descripcion ?? "", fecha: v.fecha ?? "", total: Number(v.total ?? 0),
              })),
              seguimiento: f.seguimiento ?? [],
              medios_pago_detalle: (f.factura_medios_pago ?? []).map((mp: any) => ({
                medio: mp.medio,
                tarjeta_nombre: mp.tarjeta?.nombre ?? null,
                cuotas: mp.cuotas ?? undefined,
                monto_base: Number(mp.monto_base ?? 0),
                iva: Number(mp.iva_calculado ?? 0),
                total_recargo: Number(mp.recargo ?? 0),
                total_acreditar: Number(mp.monto_total ?? 0),
              })),
            })))
          }).catch(() => {})
          fetch("/api/ordenes-entrega").then(r => r.json()).then(d => {
            if (Array.isArray(d) && d.length > 0) setOrdenesEntrega(d.map((oe: any) => ({
              id: oe.id, numero: oe.numero, nota_venta_id: oe.nota_venta_id ?? 0,
              nota_venta_numero: oe.nota_venta_numero ?? "", cliente_id: oe.cliente_id ?? 0,
              cliente_nombre: oe.cliente_nombre ?? "", fecha: oe.fecha ?? oe.created_at,
              fecha_entrega_programada: oe.fecha_entrega_programada ?? oe.fecha ?? "",
              estado: oe.estado ?? "confirmada", tipo: oe.tipo ?? "venta",
              deposito_origen: oe.deposito_origen ?? "", ubicacion_origen: oe.ubicacion_origen ?? "",
              total_productos: oe.total_productos ?? 0, productos_entregados: oe.productos_entregados ?? 0,
              productos: oe.productos ?? [], seguimiento: oe.seguimiento ?? [],
            })))
          }).catch(() => {})
          fetch("/api/notas-venta").then(r => r.json()).then(d => {
            if (Array.isArray(d) && d.length > 0) {
              setNotasVenta(d.map((nv: any) => ({
                id: nv.id, numero: nv.numero, cliente_id: nv.cliente_id,
                cliente_nombre: nv.cliente_nombre ?? "", cliente_codigo: nv.cliente_codigo ?? "",
                vendedor_id: nv.vendedor_id ?? 1, vendedor_nombre: nv.vendedor_nombre ?? "",
                fecha: nv.fecha ?? nv.created_at, estado: nv.estado ?? "abierta",
                moneda: nv.moneda ?? "ARS", tipo_cotizacion: nv.tipo_cotizacion ?? "blue",
                cotizacion: Number(nv.cotizacion) || 1450, lista_precios_id: nv.lista_precios_id ?? 1,
                termino_pago_id: nv.termino_pago_id ?? 1, termino_pago_nombre: nv.termino_pago_nombre ?? "Contado",
                deposito: nv.deposito ?? "", tipo_venta: nv.tipo_venta ?? "inmediata",
                lineas: (nv.notas_venta_lineas ?? []).map((l: any) => ({
                  id: l.id, producto_id: l.producto_id, producto_nombre: l.producto_nombre,
                  descripcion: l.descripcion ?? "", cantidad: l.cantidad,
                  precio_unitario: l.precio_unitario, descuento: l.descuento ?? 0,
                  subtotal: Number(l.subtotal ?? 0), iva: Number(l.iva ?? 0),
                  requiere_serie: false, series_seleccionadas: [],
                })),
                subtotal: Number(nv.subtotal ?? 0), descuento_global: 0,
                impuestos: Number(nv.impuestos ?? 0),
                cotizacion_tipo: nv.tipo_cotizacion ?? "blue", total: Number(nv.total ?? 0),
                sucursal: nv.sucursal ?? "Puerto Norte", punto_venta: nv.punto_venta ?? "10000",
              })))
            }
          }).catch(() => {})
        }
      } catch (e) {
        console.error("[senias] cierre error:", e)
      } finally {
        setSeniaCerrando(false)
      }
    }

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedSenia(null); setSeniaEditandoFecha(false); setSeniaCancelando(false) }}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{s.numero}</h1>
            <p className="text-sm text-gray-500">{fechaHora}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            {/* Badge moneda */}
            {s.moneda === 'USD' && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                USD {s.cotizacion && s.cotizacion > 1 ? `@${s.cotizacion.toLocaleString('es-AR')}` : ''}
              </span>
            )}
            {s.estado === "en_curso" && dias !== null && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                vencida ? "bg-red-100 text-red-700" :
                dias <= 3 ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {vencida ? `Vencida hace ${Math.abs(dias)} día(s)` : dias === 0 ? "Vence hoy" : `${dias} día(s) restantes`}
              </span>
            )}
            {/* Badge estado principal */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              s.estado === "confirmada" ? "bg-green-100 text-green-700" :
              s.estado === "cancelada" ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {s.estado === "en_curso" ? "En curso" : s.estado === "confirmada" ? "Confirmada" : "Cancelada"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-5">
          {/* Datos de la operación */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Datos de la Operación</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Número</span><span className="font-medium">{s.numero}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fecha</span><span className="font-medium">{fechaHora}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="font-medium">{s.cliente_nombre}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Sucursal</span><span className="font-medium">{sucursalActiva?.nombre ?? "—"}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Fecha límite</span>
                <div className="flex items-center gap-2">
                  {seniaEditandoFecha && s.estado === "en_curso" ? (
                    <>
                      <input type="date" value={seniaFechaLimiteEdit} onChange={e => setSeniaFechaLimiteEdit(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs" />
                      <button onClick={handleActualizarFecha} className="text-xs bg-indigo-900 text-white px-2 py-1 rounded hover:bg-indigo-800">Guardar</button>
                      <button onClick={() => setSeniaEditandoFecha(false)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span className={`font-medium ${vencida ? "text-red-600" : ""}`}>{formatFechaLimite(s.fecha_limite)}</span>
                      {s.estado === "en_curso" && (
                        <button onClick={() => { setSeniaEditandoFecha(true); setSeniaFechaLimiteEdit(s.fecha_limite) }}
                          className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                          <Edit className="w-3 h-3" /> Modificar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Datos del equipo */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" /> Equipo
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Modelo</span><span className="font-medium">{s.equipo_nombre}</span></div>
              {s.equipo_imei && <div className="flex justify-between"><span className="text-gray-500">IMEI / S/N</span><span className="font-mono text-xs">{s.equipo_imei}</span></div>}
              {s.equipo_color && <div className="flex justify-between"><span className="text-gray-500">Color</span><span className="font-medium">{s.equipo_color}</span></div>}
              {s.equipo_bateria != null && <div className="flex justify-between"><span className="text-gray-500">Batería</span><span className="font-medium flex items-center gap-1"><Battery className="w-3 h-3" />{s.equipo_bateria}%</span></div>}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Precio de venta</span><span className="font-medium">{s.moneda === 'USD' ? `USD ${s.precio_venta.toLocaleString('es-AR',{minimumFractionDigits:2})}` : formatCurrency(s.precio_venta)}</span></div>
                {s.descuento > 0 && <div className="flex justify-between"><span className="text-gray-500">Descuento</span><span className="text-red-600 font-medium">-{s.moneda === 'USD' ? `USD ${s.descuento.toLocaleString('es-AR',{minimumFractionDigits:2})}` : formatCurrency(s.descuento)}</span></div>}
                <div className="flex justify-between font-semibold"><span>Precio final acordado</span><span className="text-emerald-600 text-base">{s.moneda === 'USD' ? `USD ${s.precio_final.toLocaleString('es-AR',{minimumFractionDigits:2})}` : formatCurrency(s.precio_final)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloque Seña Pagada */}
        <div className="bg-white rounded-lg border p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600" /> Seña (pago adelantado)
          </h3>
          {s.estado_senia === "registrada" ? (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="text-green-800 font-medium">
                  Seña registrada: {s.moneda === 'USD'
                    ? `USD ${s.monto_senia?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                    : formatCurrency(s.monto_senia)}
                  {(s as any).monto_senia_usd && s.moneda !== 'USD' && (
                    <span className="ml-2 text-blue-700 font-semibold">
                      → USD {Number((s as any).monto_senia_usd).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      {(s as any).cotizacion_senia ? ` @ $${(s as any).cotizacion_senia}` : ''}
                    </span>
                  )}
                </p>
                <p className="text-green-600 text-xs mt-0.5">
                  Medio: {s.medio_pago_senia}{s.recibo_senia_numero ? ` · Recibo: ${s.recibo_senia_numero}` : ''}
                </p>
                <p className="text-blue-600 text-xs mt-1 font-medium">
                  Imputado en cuenta corriente USD del cliente
                </p>
              </div>
              {/* Cancelar recibo */}
              {!seniaCancelRecibo ? (
                <button
                  onClick={() => setSeniaCancelRecibo(true)}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Cancelar recibo y registrar uno nuevo
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm space-y-2">
                  <p className="text-red-700 font-medium">¿Confirmar anulación del recibo {s.recibo_senia_numero}?</p>
                  <p className="text-red-600 text-xs">El recibo se marcará como anulado y podrás registrar uno nuevo.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/senias-equipo/${s.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ accion: "cancelar_recibo_senia", usuario: "Operador" }),
                        })
                        if (res.ok) {
                          const data = await res.json()
                          const updated = { ...s, ...data.senia }
                          setSeniasEquipo(prev => prev.map(x => x.id === s.id ? updated : x))
                          setSelectedSenia(updated)
                        }
                        setSeniaCancelRecibo(false)
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Sí, anular recibo
                    </button>
                    <button onClick={() => setSeniaCancelRecibo(false)} className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : s.estado === "en_curso" ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Sin seña registrada. Podés registrar el pago adelantado ahora o más adelante.</p>
              {(() => {
                const cajaValorSeleccionado = seniaCajaValores.find(v => v.id === seniaCajaValorId)
                const monedaPago = cajaValorSeleccionado?.moneda ?? 'ARS'
                const pagoEnARS = monedaPago !== 'USD'
                return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto recibido ({monedaPago})</label>
                  <input type="number" min={0} value={seniaMontoInput} onChange={e => setSeniaMontoInput(Number(e.target.value))}
                    disabled={!seniaCajaValorId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Caja</label>
                  <select
                    value={seniaCajaId}
                    onChange={e => setSeniaCajaId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">— Seleccionar caja —</option>
                    {seniaCajas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}{c.sucursal ? ` (${c.sucursal})` : ''}</option>
                    ))}
                  </select>
                </div>
                {seniaCajaId && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pago</label>
                    <select
                      value={seniaCajaValorId}
                      onChange={e => {
                        const vid = e.target.value
                        setSeniaCajaValorId(vid)
                        const val = seniaCajaValores.find(v => v.id === vid)
                        setSeniaMedioPagoInput(val ? `${val.nombre} (${val.moneda})` : "")
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">— Seleccionar —</option>
                      {seniaCajaValores.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} ({v.moneda}){v.subtipo ? ` · ${v.subtipo}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {pagoEnARS && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cotización ARS/USD al momento del pago</label>
                    <input type="number" min={1} value={seniaCotizacionPago || ''} onChange={e => setSeniaCotizacionPago(Number(e.target.value))}
                      placeholder="Ej: 1400"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
                  </div>
                )}
                {seniaMontoInput > 0 && pagoEnARS && seniaCotizacionPago > 1 && (
                  <div className="flex items-end">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm w-full">
                      <p className="text-xs text-blue-600 font-medium">Equivalente en USD (a imputar)</p>
                      <p className="text-blue-800 font-bold">USD {(seniaMontoInput / seniaCotizacionPago).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}
              </div>
                )
              })()}
              <button onClick={handleRegistrarSenia} disabled={seniaRegistrando || !seniaMontoInput || !seniaCajaId || !seniaCajaValorId}
                className="w-full py-2 bg-indigo-900 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" />
                {seniaRegistrando ? "Registrando..." : "Registrar seña → imputar en cuenta USD"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin seña pagada.</p>
          )}
        </div>

        {/* Documentos Generados */}
        <div className="bg-white rounded-lg border p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" /> Documentos Generados
          </h3>
          <div className="space-y-1 text-sm">
            {[
              { label: "Nota de Venta",    tipo: "nv" as const,      id: s.nota_venta_id,  numero: s.nota_venta_numero, icon: FileText, color: "text-blue-600"   },
              { label: "Orden de Entrega", tipo: "oe" as const,       id: s.oe_id,          numero: s.oe_numero,         icon: Truck,    color: "text-amber-600"  },
              ...(s.remito_id ? [{ label: "Remito", tipo: "remito" as const, id: s.remito_id, numero: s.remito_numero, icon: Package, color: "text-orange-600" }] : []),
              ...(s.factura_id ? [{ label: "Factura", tipo: null as any, id: null, numero: s.factura_numero, icon: Receipt, color: "text-purple-600" }] : []),
              ...(s.recibo_senia_numero ? [{ label: "Recibo seña", tipo: null as any, id: null, numero: s.recibo_senia_numero, icon: CreditCard, color: "text-emerald-600" }] : []),
            ].map((doc, i) => {
              const Icon = doc.icon
              const clickable = !!doc.id && !!doc.tipo
              return (
                <div key={i}
                  onClick={() => clickable && abrirSeniaDoc(doc.tipo, doc.id)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg border border-transparent transition-colors last:mb-0 ${
                    clickable
                      ? "hover:bg-gray-50 hover:border-gray-200 cursor-pointer group"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${doc.color}`} />
                    <span className="text-gray-700 font-medium">{doc.label}</span>
                    {doc.numero
                      ? <span className={`font-mono text-xs font-semibold ${doc.color} ${clickable ? "underline underline-offset-2 decoration-dotted" : ""}`}>{doc.numero}</span>
                      : <span className="text-xs text-gray-400 italic">no generado</span>
                    }
                  </div>
                  {clickable && doc.numero && (
                    <span className="text-xs text-gray-400 group-hover:text-gray-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Modal de preview de documento */}
        {showSeniaDocModal && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-6"
            onClick={() => {
              setShowSeniaDocModal(false)
              setSeniaDocModalTipo(null)
              if (seniaDocModalTipo === "nv") setSelectedNV(null)
              if (seniaDocModalTipo === "oe") setSelectedOE(null)
              if (seniaDocModalTipo === "remito") setSelectedRemito(null)
            }}
          >
            <div
              className="bg-gray-50 rounded-xl shadow-2xl w-[92vw] max-w-6xl relative flex flex-col"
              style={{ minHeight: "300px" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Barra superior del modal */}
              <div className="sticky top-0 bg-white border-b rounded-t-xl px-4 py-3 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  {seniaDocModalTipo === "nv" && <><FileText className="w-4 h-4 text-blue-600" /> Nota de Venta</>}
                  {seniaDocModalTipo === "oe" && <><Truck className="w-4 h-4 text-amber-600" /> Orden de Entrega</>}
                  {seniaDocModalTipo === "remito" && <><Package className="w-4 h-4 text-orange-600" /> Remito</>}
                  <span className="text-xs text-gray-400 ml-1">(vista previa — los cambios se reflejan en el módulo correspondiente)</span>
                </div>
                <button
                  onClick={() => {
                    setShowSeniaDocModal(false)
                    setSeniaDocModalTipo(null)
                    if (seniaDocModalTipo === "nv") setSelectedNV(null)
                    if (seniaDocModalTipo === "oe") setSelectedOE(null)
                    if (seniaDocModalTipo === "remito") setSelectedRemito(null)
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Contenido del modal */}
              <div className="p-5 flex-1">
                {seniaDocModalLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    {seniaDocModalTipo === "nv" && renderFormularioNV()}
                    {seniaDocModalTipo === "oe" && renderFichaOE()}
                    {seniaDocModalTipo === "remito" && renderFichaRemito()}
                  </>
                )}
              </div>
            </div>
          </div>
        )}


        {/* CIERRE DE OPERACIÓN — solo si está en curso */}
        {s.estado === "en_curso" && (
          <div className="bg-white rounded-lg border border-emerald-200 p-5 mb-5">
            <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Cierre de Operación
            </h3>
            <div className="space-y-4">
              {/* Resumen financiero */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-600">Precio final acordado</span><span className="font-medium">{formatCurrency(s.precio_final)}</span></div>
                {s.estado_senia === "registrada" && s.monto_senia > 0 && (
                  <div className="flex justify-between text-green-700"><span>Seña ya pagada</span><span>-{formatCurrency(s.monto_senia)}</span></div>
                )}
                <div className="flex justify-between font-bold border-t pt-2 text-emerald-700"><span>Saldo a pagar</span><span>{formatCurrency(saldoPendiente)}</span></div>
              </div>

              {/* Medios de pago del saldo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Medios de pago del saldo:</p>
                  <button onClick={() => setSeniaMediosCierre(prev => [...prev, { medio: "efectivo", monto: 0 }])}
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar medio
                  </button>
                </div>
                <div className="space-y-2">
                  {seniaMediosCierre.map((mp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select value={mp.medio} onChange={e => setSeniaMediosCierre(prev => prev.map((x, i) => i === idx ? { ...x, medio: e.target.value } : x))}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-emerald-500">
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta_debito">Tarjeta Débito</option>
                        <option value="tarjeta_credito">Tarjeta Crédito</option>
                        <option value="cuenta_corriente">Cuenta Corriente</option>
                        <option value="toma_equipo">Toma de equipo en parte de pago</option>
                      </select>
                      <input type="number" min={0} value={mp.monto} onChange={e => setSeniaMediosCierre(prev => prev.map((x, i) => i === idx ? { ...x, monto: Number(e.target.value) } : x))}
                        placeholder="$ 0"
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-36 focus:ring-2 focus:ring-emerald-500" />
                      {seniaMediosCierre.length > 1 && (
                        <button onClick={() => setSeniaMediosCierre(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                {seniaMediosCierre.some(m => m.medio === "toma_equipo") && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> El flujo de Toma de Equipo se procesará al confirmar el cierre.
                    </p>
                  </div>
                )}
                {/* Diferencia */}
                {totalCierre > 0 && (
                  <div className={`flex justify-between text-sm mt-2 font-medium ${Math.abs(totalCierre - saldoPendiente) < 1 ? "text-emerald-700" : "text-amber-700"}`}>
                    <span>Total medios de pago:</span>
                    <span>{formatCurrency(totalCierre)} {Math.abs(totalCierre - saldoPendiente) < 1 ? "✓" : `(diferencia: ${formatCurrency(totalCierre - saldoPendiente)})`}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleConfirmarCierre}
                disabled={seniaCerrando || seniaMediosCierre.length === 0}
                className="w-full py-3 bg-indigo-900 text-white font-semibold rounded-lg hover:bg-indigo-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {seniaCerrando ? "Procesando..." : "Confirmar y entregar equipo"}
              </button>
            </div>
          </div>
        )}

        {/* Cancelar operación */}
        {s.estado === "en_curso" && (
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" /> Cancelar Seña
            </h3>
            {seniaCancelando ? (
              <div className="space-y-3">
                <textarea value={seniaCancelMotivo} onChange={e => setSeniaCancelMotivo(e.target.value)}
                  placeholder="Motivo de la cancelación (opcional)"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400" />
                {s.estado_senia === "registrada" && s.monto_senia > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    La seña pagada de {formatCurrency(s.monto_senia)} quedará como crédito en la cuenta corriente del cliente.
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={handleCancelar} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                    Confirmar cancelación
                  </button>
                  <button onClick={() => { setSeniaCancelando(false); setSeniaCancelMotivo("") }} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    No cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Cancelar libera el stock y anula la reserva del equipo.</p>
                <button onClick={() => setSeniaCancelando(true)} className="text-sm text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50">
                  Cancelar seña
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ir a factura — solo visible tras confirmar cierre */}
        {s.estado === "confirmada" && s.factura_id && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-emerald-800">Operación confirmada</p>
              <p className="text-sm text-emerald-600">Equipo entregado — completá la facturación para finalizar.</p>
            </div>
            <button
              onClick={() => {
                const fac = facturas.find(f => f.id === s.factura_id)
                if (fac) {
                  setSelectedSenia(null)
                  setSelectedFactura(fac)
                  setActiveView("facturas")
                }
              }}
              className="px-4 py-2.5 bg-indigo-900 text-white font-semibold rounded-lg hover:bg-indigo-800 flex items-center gap-2 whitespace-nowrap"
            >
              <Receipt className="w-4 h-4" /> Ir a factura para finalizar operación
            </button>
          </div>
        )}

        {/* Seguimiento */}
        {s.seguimiento && s.seguimiento.length > 0 && (
          <div className="bg-white rounded-lg border p-5 mt-5">
            <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" /> Seguimiento
            </h3>
            <div className="space-y-3">
              {[...s.seguimiento].reverse().map((entry: SeguimientoEntry, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800">{entry.accion}</p>
                    {entry.detalle && <p className="text-gray-500 text-xs">{entry.detalle}</p>}
                    <p className="text-gray-400 text-xs">{new Date(entry.fecha).toLocaleString("es-AR")} · {entry.usuario}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderListadoSeniasEquipo = () => {
    return (
      <VentasListSection
        title="Seña de Equipo"
        subtitle="Gestione las reservas de equipos con seña"
        moduleName="senias_equipo"
        data={seniasEquipo}
        searchFields={["numero", "cliente_nombre", "equipo_nombre"]}
        filterFields={[{field: "estado", label: "Estado"}, {field: "estado_senia", label: "Estado Seña"}]}
        actions={
          <button onClick={() => { setCreandoSenia(true) }}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> Nueva Seña
          </button>
        }
      >
        {(filtered) => (
          <>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{seniasEquipo.length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">En curso</p>
            <p className="text-2xl font-bold text-blue-600">{seniasEquipo.filter(s => s.estado === "en_curso").length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Confirmadas</p>
            <p className="text-2xl font-bold text-emerald-600">{seniasEquipo.filter(s => s.estado === "confirmada").length}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Vencidas</p>
            <p className="text-2xl font-bold text-red-500">
              {seniasEquipo.filter(s => s.estado === "en_curso" && diasRestantes(s.fecha_limite) !== null && (diasRestantes(s.fecha_limite) as number) < 0).length}
            </p>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left py-3 px-4">N° Seña</th>
                <th className="text-left py-3 px-4">Fecha</th>
                <th className="text-left py-3 px-4">Cliente</th>
                <th className="text-left py-3 px-4">Equipo</th>
                <th className="text-right py-3 px-4">Precio</th>
                <th className="text-right py-3 px-4">Seña pagada</th>
                <th className="text-center py-3 px-4">Fecha límite</th>
                <th className="text-center py-3 px-4">Estado</th>
                <th className="text-center py-3 px-4">Días rest.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No hay señas de equipo registradas</td></tr>
              )}
              {filtered.map(s => {
                const dias = diasRestantes(s.fecha_limite)
                const vencida = dias !== null && dias < 0 && s.estado === "en_curso"
                return (
                  <tr key={s.id} onClick={() => setSelectedSenia(s)}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${vencida ? "bg-red-50" : ""}`}>
                    <td className="py-3 px-4 font-medium text-emerald-700 font-mono text-sm">{s.numero}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{new Date(s.fecha).toLocaleDateString("es-AR")}</td>
                    <td className="py-3 px-4 text-sm">{s.cliente_nombre}</td>
                    <td className="py-3 px-4 text-sm max-w-[200px] truncate">{s.equipo_nombre}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      {s.moneda === 'USD'
                        ? <span className="text-blue-700">USD {s.precio_final.toLocaleString('es-AR', {minimumFractionDigits:2})}</span>
                        : formatCurrency(s.precio_final)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      {s.estado_senia === "registrada"
                        ? <span className="text-emerald-600 font-medium">{s.moneda === 'USD' ? `USD ${s.monto_senia.toLocaleString('es-AR',{minimumFractionDigits:2})}` : formatCurrency(s.monto_senia)}</span>
                        : <span className="text-gray-400 text-xs">Sin seña</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-center text-sm">{formatFechaLimite(s.fecha_limite)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        s.estado === "confirmada" ? "bg-green-100 text-green-700" :
                        s.estado === "cancelada" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {s.estado === "en_curso" ? "En curso" : s.estado === "confirmada" ? "Confirmada" : "Cancelada"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.estado === "en_curso" && dias !== null ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          vencida ? "bg-red-100 text-red-700" :
                          dias <= 3 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {vencida ? `−${Math.abs(dias)}d` : dias === 0 ? "Hoy" : `${dias}d`}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
          </>
        )}
      </VentasListSection>
    )
  }

  const renderSeniaEquipo = () => {
    if (selectedSenia) return renderFichaSeniaEquipo()
    if (creandoSenia) return renderCrearSeniaEquipo()
    return renderListadoSeniasEquipo()
  }

  const renderTomaEquipo = () => {
    if (selectedToma) return renderFichaTomaEquipo()
  if (tomaEquipoCreando) return renderCrearTomaEquipo()

    return (
      <VentasListSection
        title="Toma de Equipo en Parte de Pago"
        subtitle="Gestione las tomas de equipos usados como parte de pago"
        moduleName="tomas_equipo"
        data={tomasEquipo}
        searchFields={["numero", "cliente_nombre", "modelo_equipo"] as const}
        filterFields={[{field: "estado", label: "Estado"}, {field: "estado_recepcion", label: "Recepción"}]}
        actions={
          <button 
            onClick={() => setTomaEquipoCreando(true)}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Toma
          </button>
        }
      >
        {(filtered) => (
          <>
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
                <th className="text-center py-3 px-4">Operación</th>
                <th className="text-center py-3 px-4">Recepción</th>
                <th className="text-center py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-gray-400">No hay tomas de equipo registradas</td>
                </tr>
              )}
              {filtered.map(toma => {
                const fechaObj = new Date(toma.fecha)
                const fecha = fechaObj.toLocaleDateString('es-AR')
                const hora = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                // Una toma cancelada o ya recibida no está "en curso"
                const operacionEnCurso = toma.estado !== 'cancelado' && toma.estado_recepcion !== 'recibido' && toma.estado_recepcion !== 'cancelado'
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
                        toma.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                        operacionEnCurso ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {toma.estado === 'cancelado' ? 'Cancelada' : operacionEnCurso ? 'En curso' : 'Finalizada'}
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
          </>
        )}
      </VentasListSection>
    )
  }

  // Ordenes de Entrega
  const renderOrdenesEntrega = () => {
    if (selectedOE) return renderFichaOE()
    if (creandoOE) return renderCrearOE()
    
    return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Ordenes de Entrega</h1>
        <button
          onClick={() => { setCreandoOE(true); setOeNvId(null) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
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
            <tr className="border-b bg-gray-50">
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedRemito.numero}</h1>
              <p className="text-sm text-gray-500">{formatDateTime(selectedRemito.fecha)} | {selectedRemito.sucursal}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            selectedRemito.estado === 'entregado' ? 'bg-green-100 text-green-700' :
            selectedRemito.estado === 'en_transito' ? 'bg-blue-100 text-blue-700' :
            selectedRemito.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
            selectedRemito.estado === 'borrador' ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {selectedRemito.estado === 'entregado' ? 'Entregado' :
             selectedRemito.estado === 'en_transito' ? 'En Tránsito' :
             selectedRemito.estado === 'aprobado' ? 'Aprobado' :
             selectedRemito.estado === 'borrador' ? 'Borrador' :
             selectedRemito.estado}
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
          {selectedRemito.estado === "aprobado" && (
            <button
              onClick={() => handleConfirmarEntregaRemito(selectedRemito)}
              disabled={confirmandoRemito}
              className="ml-auto px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {confirmandoRemito ? "Confirmando..." : "Confirmar Entrega"}
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
                <div className="col-span-2">
                  <span className="text-gray-500">Asiento CMV:</span>{" "}
                  {selectedRemito.asiento_id ? (
                    <button
                      onClick={() => {
                        setActiveView("contabilidad")
                        setSelectedRemito(null)
                      }}
                      className="font-medium text-indigo-700 hover:underline"
                      title={selectedRemito.asiento_id}
                    >
                      Ver asiento →
                    </button>
                  ) : (
                    <span className="text-gray-400">Sin asiento generado</span>
                  )}
                </div>
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
    <VentasListSection
      title="Remitos"
      moduleName="remitos"
      data={remitos}
      searchFields={["numero", "cliente_nombre"]}
      filterFields={[{field: "estado", label: "Estado"}, {field: "control_factura", label: "Control Factura"}]}
    >
      {(filtered) => (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
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
            {filtered.map(remito => (
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron remitos
          </div>
)}
      </div>
      )}
    </VentasListSection>
    )
  }
  
  // Vista de Crear Factura
  // Función para guardar factura como borrador
  const handleGuardarFacturaBorrador = () => {
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const lineasValidas = facturaLineas.filter(l => l.producto_nombre.trim() !== "")
    const subtotal = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    // Todos los precios incluyen IVA → total = subtotal
    const total = subtotal
    
    if (!clienteSeleccionado || lineasValidas.length === 0) {
      alert("Debe seleccionar un cliente y agregar al menos un producto")
      return
    }

    const facturaNumero = `FAC-${String(facturas.length + 1).padStart(5, "0")}`
    const facturaId = facturas.length + 1
    const fechaHoy = new Date().toISOString()

    const newFactura: Factura = {
      id: facturaId,
      numero: facturaNumero,
      nota_venta_id: 0,
      nota_venta_numero: "-",
      cliente_id: clienteSeleccionado.id,
      cliente_nombre: clienteSeleccionado.nombre,
      cliente_documento: `${clienteSeleccionado.tipo_documento} ${clienteSeleccionado.numero_documento}`,
      estado: "borrador",
      fecha: fechaHoy,
      vendedor_nombre: vendedores[0]?.nombre || "Max Solina",
      domicilio_facturacion: clienteSeleccionado.direccion,
      moneda: facturaMoneda,
      tipo_cotizacion: "blue",
      cotizacion: facturaMoneda === "USD" ? facturaCotizacion : 1,
      termino_pago: terminosPago.find(tp => tp.id === clienteSeleccionado.termino_pago_id)?.nombre || "Contado",
      subtotal: subtotal,
      descuento: 0,
      impuestos: 0,
      total: subtotal,
      saldo: subtotal,
      sucursal: "Puerto Norte",
      lineas: lineasValidas,
      vencimientos: [{ descripcion: "Vencimiento 1", fecha: fechaHoy.split('T')[0], total: subtotal }]
    }
    setFacturas(prev => [newFactura, ...prev])

    setCreandoFactura(false)
    setFacturaPrevisualizando(false)
    setFacturaClienteId(null)
    setFacturaLineas([])
    setFacturaListaPreciosId(1)
    setFacturaMoneda("ARS")
    setFacturaCotizacion(1)
    setSelectedFactura(newFactura)
  }

  // Función para crear factura (usada desde previsualización)
  const handleCrearFacturaFinal = async () => {
    if (confirmandoFactura) return
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const subtotal = facturaLineas.reduce((sum, l) => sum + l.subtotal, 0)

    if (!clienteSeleccionado || facturaLineas.length === 0) {
      alert("Debe seleccionar un cliente y agregar al menos un producto")
      return
    }
    if (prevMediosLineas.length === 0) {
      alert("Faltan medios de pago. Completá el bloque de medios y apretá 'Listo'.")
      return
    }

    setConfirmandoFactura(true)
    try {
    const fechaHoy = new Date().toISOString()
    const sucursalNombre = sucursalActiva?.nombre ?? "Casa Central"
    const vendedorNombre = vendedores[0]?.nombre || "Admin"
    const terminoPago = terminosPago.find(tp => tp.id === clienteSeleccionado.termino_pago_id)?.nombre || "Contado"

    // PASO 1 — Crear factura "en negro" (sin IVA, total = subtotal).
    let facData: { id: number; numero: string; asiento_id?: string }
    try {
      const facRes = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteSeleccionado.id,
          cliente_nombre: clienteSeleccionado.nombre,
          vendedor_nombre: vendedorNombre,
          sucursal: sucursalNombre,
          fecha: fechaHoy,
          estado: "abierta",
          moneda: facturaMoneda,
          cotizacion: facturaMoneda === "USD" ? facturaCotizacion : 1,
          termino_pago: terminoPago,
          subtotal,
          descuento: 0,
          lineas: facturaLineas.filter(l => l.producto_nombre.trim() !== "").map(l => ({
            producto_id: l.producto_id ?? null,
            producto_nombre: l.producto_nombre,
            descripcion: l.descripcion ?? null,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario ?? 0,
            descuento: l.descuento ?? 0,
            subtotal: Number(l.subtotal ?? 0),
          })),
        }),
      })

      if (!facRes.ok) {
        const errText = await facRes.text()
        alert(`Error al guardar factura: ${errText}`)
        return
      }

      facData = await facRes.json()
      if ((facData as { _advertencia_contable?: string })._advertencia_contable) {
        alert(`Factura creada pero sin asiento contable:\n\n${(facData as { _advertencia_contable: string })._advertencia_contable}`)
      }
    } catch (err) {
      alert(`Error inesperado al crear factura: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    // PASO 2 — Construir payload de medios para el endpoint /confirmar.
    // Cada línea puede estar en su propia moneda (efectivo ARS / efectivo USD);
    // hay que convertir a la moneda de la factura antes de mandar al API.
    const medios = prevMediosLineas
      .filter(l => l.monto > 0)
      .map(l => {
        let recargo_pct = 0
        if (l.medio === "tarjeta" && l.tarjeta_id) {
          const hoy = new Date()
          const diasKeys = ["dom","lun","mar","mie","jue","vie","sab"] as const
          const diaKey = diasKeys[hoy.getDay()]
          const rec = recargosDB.find(r =>
            r.tarjeta_id === l.tarjeta_id && r.activo &&
            (l.cuotas||1) >= r.desde_cuota && (l.cuotas||1) <= r.hasta_cuota && r.dias[diaKey]
          )
          recargo_pct = rec?.recargo_pct ?? 0
        }
        // Convertir el monto a la moneda de la factura.
        // Cuando factura es USD se usa facturaCotizacion (la de la propia factura).
        // Cuando factura es ARS y la línea es USD, la cotización viene en la línea.
        let montoEnFac = l.monto
        if (l.moneda && l.moneda !== facturaMoneda) {
          if (l.moneda === "USD" && facturaMoneda === "ARS") {
            const cotLinea = l.cotizacion ?? 0
            montoEnFac = l.monto * cotLinea
          } else if (l.moneda === "ARS" && facturaMoneda === "USD" && facturaCotizacion > 0) {
            montoEnFac = l.monto / facturaCotizacion
          }
        }
        montoEnFac = Math.round(montoEnFac * 100) / 100
        return {
          medio: l.medio,
          monto: montoEnFac,
          tarjeta_id: l.medio === "tarjeta" ? l.tarjeta_id : undefined,
          cuotas: l.medio === "tarjeta" ? (l.cuotas ?? 1) : undefined,
          recargo_pct,
        }
      })

    // PASO 3 — Si la factura es USD y hay medios facturable, convertir a ARS primero.
    const tieneFacturable = medios.some(m => m.medio === "tarjeta" || m.medio === "transferencia")
    let monedaActual: "ARS" | "USD" = facturaMoneda
    if (facturaMoneda !== "ARS" && tieneFacturable) {
      const subtotalArs = subtotal * facturaCotizacion
      const ok = window.confirm(
        `Esta factura está en ${facturaMoneda}.\n\n` +
        `Para aplicar IVA y recargos hay que convertirla a pesos.\n\n` +
        `Cotización: blue · 1 ${facturaMoneda} = $${facturaCotizacion.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n` +
        `Subtotal en pesos: $${subtotalArs.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n\n` +
        `(El IVA y el recargo de tarjeta se calculan después y se suman al total final.)\n\n` +
        `¿Convertir y continuar?`
      )
      if (!ok) {
        alert(`La factura ${facData.numero} quedó en estado "abierta" en ${facturaMoneda}. Podés cancelarla o completar la confirmación más tarde.`)
        return
      }
      try {
        const conv = await fetch(`/api/facturas/${facData.id}/convertir-a-ars`, { method: "POST" })
        if (!conv.ok) {
          const err = await conv.json().catch(() => ({ error: "Error al convertir factura" }))
          alert(`No se pudo convertir la factura: ${err.error}\n\nQueda en estado "abierta" en ${facturaMoneda}.`)
          return
        }
        monedaActual = "ARS"
        // Convertir los montos de los medios también a ARS
        for (const m of medios) {
          m.monto = Math.round(m.monto * facturaCotizacion * 100) / 100
        }
      } catch (e) {
        alert(`Error de red al convertir factura: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    }

    // PASO 4 — Confirmar la factura: el backend calcula IVA + recargo y emite asiento 2.
    try {
      const confRes = await fetch(`/api/facturas/${facData.id}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medios }),
      })
      if (!confRes.ok) {
        const err = await confRes.json().catch(() => ({ error: "Error al confirmar factura" }))
        alert(`Factura ${facData.numero} creada pero no se pudo confirmar: ${err.error}\n\nQueda en estado "abierta".`)
        return
      }
      const confResult = await confRes.json()

      const totalFinal: number = confResult.total_final
      const ivaTotal: number = confResult.iva_total
      const recargoTotal: number = confResult.recargo_total
      const subtotalFinal = monedaActual === "ARS" && facturaMoneda !== "ARS"
        ? Math.round(subtotal * facturaCotizacion * 100) / 100
        : subtotal

      const newFactura: Factura = {
        id: facData.id,
        numero: facData.numero,
        nota_venta_id: 0,
        nota_venta_numero: "-",
        cliente_id: clienteSeleccionado.id,
        cliente_nombre: clienteSeleccionado.nombre,
        cliente_documento: `${clienteSeleccionado.tipo_documento} ${clienteSeleccionado.numero_documento}`,
        estado: "confirmada",
        fecha: fechaHoy,
        vendedor_nombre: vendedorNombre,
        domicilio_facturacion: clienteSeleccionado.direccion,
        moneda: monedaActual,
        tipo_cotizacion: "blue",
        cotizacion: facturaMoneda === "USD" ? facturaCotizacion : 1,
        termino_pago: terminoPago,
        subtotal: subtotalFinal,
        descuento: 0,
        impuestos: ivaTotal,
        total: totalFinal,
        saldo: totalFinal,
        sucursal: sucursalNombre,
        lineas: facturaLineas,
        vencimientos: [{ descripcion: "Vencimiento 1", fecha: fechaHoy.split('T')[0], total: totalFinal }]
      }
      setFacturas(prev => [newFactura, ...prev])
      setSelectedFactura(newFactura)
    } catch (err) {
      alert(`Factura creada pero falló la confirmación: ${err instanceof Error ? err.message : String(err)}`)
      return
    }

    // Resetear estado de previsualización
    setPrevRecargosConfirmados(null)
    setPrevMediosLineas([])
    setPrevEstadoPago({ cobrado: false, tieneLineas: false, diferenciaOk: false })
    setCreandoFactura(false)
    setFacturaPrevisualizando(false)
    setFacturaClienteId(null)
    setFacturaLineas([])
    setFacturaListaPreciosId(1)
    setFacturaMoneda("ARS")
    setFacturaCotizacion(1)
    } finally {
      setConfirmandoFactura(false)
    }
  }

  // Vista de previsualización de Factura
  const [prevRecargosConfirmados, setPrevRecargosConfirmados] = useState<{ totalRecargos: number; desglose: { nombre: string; importe: number }[] } | null>(null)
  const [prevMediosLineas, setPrevMediosLineas] = useState<LineaPago[]>([])
  const [prevEstadoPago, setPrevEstadoPago] = useState<{ cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }>({ cobrado: false, tieneLineas: false, diferenciaOk: false })
  const [modalValidacionMsg, setModalValidacionMsg] = useState<string | null>(null)
  // Estado de pago para la ficha de factura en estado borrador
  const [fichaEstadoPago, setFichaEstadoPago] = useState<{ cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }>({ cobrado: false, tieneLineas: false, diferenciaOk: false })
  const [fichaModalValidacionMsg, setFichaModalValidacionMsg] = useState<string | null>(null)

  const renderPrevisualizacionFactura = () => {
    const clienteSeleccionado = clientes.find(c => c.id === facturaClienteId)
    const lineasValidas = facturaLineas.filter(l => l.producto_nombre.trim() !== "")
    const subtotal = lineasValidas.reduce((sum, l) => sum + l.subtotal, 0)
    const numeroProvisorio = `FAC-${String(facturas.length + 1).padStart(5, "0")}`
    return (
      <div>
        {/* Header con breadcrumb */}
        <div className="text-sm text-gray-500 mb-2">
          Facturas / <span className="text-gray-700">{numeroProvisorio}</span>
        </div>
        <div className="flex items-center gap-4 mb-6">
<BotonVolver onClick={() => setFacturaPrevisualizando(false)} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-amber-900">{numeroProvisorio}</h1>
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
              disabled={confirmandoFactura}
              onClick={() => {
                const subtotalPrev = facturaLineas.reduce((s, l) => s + l.subtotal, 0)
                const totalRecPrev = prevRecargosConfirmados?.totalRecargos || 0
                if ((subtotalPrev + totalRecPrev) <= 0) {
                  setModalValidacionMsg("No se puede confirmar una factura con total $0.00. Revisá los precios de las líneas.")
                  return
                }
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
              className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" /> {confirmandoFactura ? "Confirmando..." : "Confirmar Factura"}
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
                  <span className="ml-2 font-medium">{facturaMoneda}</span>
                  {facturaMoneda !== "ARS" && facturaCotizacion > 0 && (
                    <span className="ml-2 text-gray-500 text-xs">
                      · blue · 1 {facturaMoneda} = ${facturaCotizacion.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Condición:</span>
                  <span className="ml-2 font-medium">{terminosPago.find(tp => tp.id === clienteSeleccionado?.termino_pago_id)?.nombre || "Contado"}</span>
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
                  <th className="text-right py-2 w-28">Precio{facturaMoneda !== "ARS" && <span className="text-blue-600 normal-case font-semibold ml-1">({facturaMoneda})</span>}</th>
                  <th className="text-center py-2 w-16">Dto.%</th>
                  <th className="text-right py-2 w-28">Subtotal{facturaMoneda !== "ARS" && <span className="text-blue-600 normal-case font-semibold ml-1">({facturaMoneda})</span>}</th>
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
                    <td className="py-2 text-right">{formatCurrency(linea.precio_unitario, facturaMoneda)}</td>
                    <td className="py-2 text-center">{linea.descuento}%</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(linea.subtotal, facturaMoneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          {facturaMoneda === "USD" && facturaCotizacion > 1 ? (
            // Layout 3 columnas (concepto / USD / ARS) cuando hay conversión
            <div className="flex justify-end">
              <div className="text-sm" style={{ minWidth: "32rem" }}>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-1.5">
                  <div className="col-span-2 flex justify-between border-b border-gray-200 pb-1.5 mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Concepto</span>
                    <span className="text-xs uppercase tracking-wide text-gray-400 font-semibold text-right pr-12">USD</span>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold text-right border-b border-gray-200 pb-1.5 mb-1">ARS</div>

                  <span className="text-gray-500">Subtotal (precio contado):</span>
                  <span className="text-right tabular-nums">{formatCurrency(subtotal, "USD")}</span>
                  <span className="text-right tabular-nums text-xs">{formatCurrency(subtotal * facturaCotizacion, "ARS")}</span>

                  {prevRecargosConfirmados && prevRecargosConfirmados.desglose.map((d, i) => (
                    <React.Fragment key={i}>
                      <span className="text-amber-700">{d.nombre}:</span>
                      <span className="text-right tabular-nums text-amber-700">+ {formatCurrency(d.importe, "USD")}</span>
                      <span className="text-right tabular-nums text-amber-700 text-xs">+ {formatCurrency(d.importe * facturaCotizacion, "ARS")}</span>
                    </React.Fragment>
                  ))}

                  {prevRecargosConfirmados && prevRecargosConfirmados.totalRecargos > 0 && (
                    <>
                      <span className="text-amber-700 font-medium">Total recargos:</span>
                      <span className="text-right tabular-nums text-amber-700 font-medium">+ {formatCurrency(prevRecargosConfirmados.totalRecargos, "USD")}</span>
                      <span className="text-right tabular-nums text-amber-700 font-medium text-xs">+ {formatCurrency(prevRecargosConfirmados.totalRecargos * facturaCotizacion, "ARS")}</span>
                    </>
                  )}

                  <span className="font-bold text-base pt-2 border-t mt-1">Total:</span>
                  <span className="text-right tabular-nums text-emerald-700 font-bold text-base pt-2 border-t mt-1">{formatCurrency(subtotal + (prevRecargosConfirmados?.totalRecargos || 0), "USD")}</span>
                  <span className="text-right tabular-nums text-emerald-700 font-bold text-sm pt-2 border-t mt-1">{formatCurrency((subtotal + (prevRecargosConfirmados?.totalRecargos || 0)) * facturaCotizacion, "ARS")}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-right">Cotización aplicada: 1 USD = ${facturaCotizacion.toLocaleString("es-AR")} (blue)</p>
              </div>
            </div>
          ) : (
            // Layout simple (concepto + monto) cuando moneda es ARS
            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal (precio contado):</span>
                  <span>{formatCurrency(subtotal, facturaMoneda)}</span>
                </div>
                {prevRecargosConfirmados && prevRecargosConfirmados.desglose.map((d, i) => (
                  <div key={i} className="flex justify-between text-amber-700 gap-2">
                    <span>{d.nombre}:</span>
                    <span className="whitespace-nowrap">+ {formatCurrency(d.importe, facturaMoneda)}</span>
                  </div>
                ))}
                {prevRecargosConfirmados && prevRecargosConfirmados.totalRecargos > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium gap-2">
                    <span>Total recargos:</span>
                    <span className="whitespace-nowrap">+ {formatCurrency(prevRecargosConfirmados.totalRecargos, facturaMoneda)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-emerald-700 whitespace-nowrap">
                    {formatCurrency(subtotal + (prevRecargosConfirmados?.totalRecargos || 0), facturaMoneda)} <span className="text-sm text-gray-500 font-normal">{facturaMoneda}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

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
            tarjetas={tarjetasDB}
            grupos={gruposDB}
            recargos={recargosDB}
            textoBoton="Listo (los IVA y recargos se calculan al confirmar)"
            textoConfirmado="Medios de pago listos."
            onEstadoPagoChange={(estado) => setPrevEstadoPago(estado)}
            onConfirmarCobro={(lineas, totalConRecargos, totalRecargos) => {
              setPrevMediosLineas(lineas)
              setPrevRecargosConfirmados({ totalRecargos, desglose: [] })
            }}
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
              moneda: facturaMoneda,
              tipo_cotizacion: "blue",
              cotizacion: facturaMoneda === "USD" ? facturaCotizacion : 1,
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
            <h1 className="text-2xl font-bold text-amber-900">Nueva Factura</h1>
            <p className="text-sm text-gray-500">Complete los datos para crear la factura</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Cliente</h3>
              <select
                value={facturaClienteId || ""}
                onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null
                setFacturaClienteId(id)
                if (id) {
                  const cli = clientes.find(c => c.id === id)
                  if (cli?.lista_precios_id) setFacturaListaPreciosId(cli.lista_precios_id)
                }
              }}
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

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Lista de Precios:</span>
                    <span className="font-medium">
                      {listasPrecios.find(lp => lp.id === facturaListaPreciosId)?.nombre ?? `Lista #${facturaListaPreciosId}`}
                    </span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${facturaMoneda === "USD" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {facturaMoneda}
                    </span>
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
                    <th className="text-right py-2 px-3 w-32">Precio Unit.<span className={`normal-case font-semibold ml-1 ${facturaMoneda === "ARS" ? "text-gray-500" : "text-blue-600"}`}>({facturaMoneda})</span></th>
                    <th className="text-center py-2 px-3 w-24">Dto. %</th>
                    <th className="text-right py-2 px-3 w-32">Subtotal<span className={`normal-case font-semibold ml-1 ${facturaMoneda === "ARS" ? "text-gray-500" : "text-blue-600"}`}>({facturaMoneda})</span></th>
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
                                  // Buscar precio en la versión activa y vigente de la lista seleccionada
                                  const hoyIso = new Date().toISOString().split("T")[0]
                                  const versionActiva = versionesLista
                                    .filter(v => v.lista_precios_id === facturaListaPreciosId)
                                    .filter(v => v.activa !== false)
                                    .filter(v => v.fecha_inicial <= hoyIso && (!v.fecha_final || v.fecha_final >= hoyIso))
                                    .sort((a, b) => b.fecha_inicial.localeCompare(a.fecha_inicial))[0]
                                  const lineaVersion = versionActiva?.lineas?.find(l => l.producto_id === p.id)
                                  const precioLista = lineaVersion?.precio_venta ?? p.precio_venta
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
                        <div className="flex items-center gap-1">
                          {facturaMoneda !== "ARS" && <span className="text-xs text-blue-600 font-semibold shrink-0">{facturaMoneda}</span>}
                          <input type="number" value={linea.precio_unitario} min="0" step="0.01"
                            onChange={(e) => {
                              const updated = [...facturaLineas]
                              updated[index].precio_unitario = parseFloat(e.target.value) || 0
                              updated[index].subtotal = updated[index].cantidad * updated[index].precio_unitario * (1 - updated[index].descuento / 100)
                              setFacturaLineas(updated)
                            }}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                        </div>
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
                      <td className="py-2 px-3 text-right font-medium">{formatCurrency(linea.subtotal, facturaMoneda)}</td>
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
              <h3 className="font-semibold text-gray-900 mb-4">
                Resumen {facturaMoneda !== "ARS" && <span className="text-sm font-normal text-blue-600 ml-1">en {facturaMoneda}</span>}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{formatCurrency(subtotal, facturaMoneda)}</span></div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold"><span>Total:</span><span className="text-emerald-700 whitespace-nowrap">{formatCurrency(subtotal, facturaMoneda)} <span className="text-sm text-gray-500 font-normal">{facturaMoneda}</span></span></div>
                </div>
                {facturaMoneda === "USD" && facturaCotizacion > 1 && (
                  <div className="border-t pt-2 text-xs text-gray-500 flex justify-between">
                    <span>Equivalente ARS (TC ${facturaCotizacion.toLocaleString("es-AR")}):</span>
                    <span className="font-medium text-gray-700">{formatCurrency(subtotal * facturaCotizacion, "ARS")}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="space-y-3">
                <button onClick={() => setFacturaPrevisualizando(true)} disabled={!facturaClienteId || facturaLineas.filter(l => l.producto_nombre.trim() !== "").length === 0}
                  className="w-full bg-indigo-900 text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                  Continuar
                </button>
                <button onClick={() => { setCreandoFactura(false); setFacturaClienteId(null); setFacturaLineas([]); setFacturaPrevisualizando(false); setFacturaListaPreciosId(1); setFacturaMoneda("ARS"); setFacturaCotizacion(1) }}
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
              <h1 className="text-2xl font-bold text-amber-900">{selectedFactura.numero}</h1>
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
                  setFacturaPrevisualizando(false)
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
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoFacturaColor(selectedFactura.estado)}`}>
              {getEstadoFacturaLabel(selectedFactura.estado)}
            </span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-t-lg px-4 py-3 flex items-center justify-between mb-0">
          <div className="flex items-center gap-2">
            {selectedFactura.estado === 'borrador' && (
              <>
                <button
                  onClick={async () => {
                    if (!confirm(`¿Suprimir definitivamente la factura ${selectedFactura.numero}? Esta acción no se puede deshacer y no deja registro.`)) return
                    try {
                      const r = await fetch(`/api/facturas/${selectedFactura.id}`, { method: "DELETE" })
                      const d = await r.json().catch(() => ({}))
                      if (!r.ok) {
                        alert(`No se pudo suprimir: ${d.error || "error desconocido"}`)
                        return
                      }
                      setFacturas(prev => prev.filter(f => f.id !== selectedFactura.id))
                      setSelectedFactura(null)
                    } catch (err) {
                      alert("Error al suprimir factura: " + (err as Error).message)
                    }
                  }}
                  className="px-3 py-1.5 text-sm border border-red-400 text-red-300 rounded-md hover:bg-red-900/30 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Suprimir
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
                  className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> Confirmar Factura
                </button>
              </>
            )}
            {(selectedFactura.estado === 'abierta' || selectedFactura.estado === 'confirmada' || selectedFactura.estado === 'parcial') && (
              <>
                <button
                  onClick={() => setShowCancelarFacturaModal(true)}
                  className="px-3 py-1.5 text-sm border border-gray-400 text-white rounded-md hover:bg-gray-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  onClick={async () => {
                    const facturaListado = selectedFactura
                    setReciboClienteIdForm(facturaListado.cliente_id)
                    setReciboFacturaIdForm(facturaListado.id)
                    setReciboMontoForm(facturaListado.saldo)

                    // Fetch fresco de la factura para asegurar medios_pago_detalle actualizado
                    let mediosPagoDetalle = facturaListado.medios_pago_detalle || []
                    try {
                      const r = await fetch(`/api/facturas?id=${facturaListado.id}`)
                      const d = await r.json()
                      const fresh = Array.isArray(d) ? d[0] : d
                      if (fresh?.factura_medios_pago) {
                        mediosPagoDetalle = fresh.factura_medios_pago.map((mp: { medio: string; tarjeta?: { nombre: string }; cuotas?: number; monto_base: number; iva_calculado: number; recargo: number; monto_total: number }) => ({
                          medio: mp.medio,
                          tarjeta_nombre: mp.tarjeta?.nombre ?? null,
                          cuotas: mp.cuotas ?? undefined,
                          monto_base: Number(mp.monto_base ?? 0),
                          iva: Number(mp.iva_calculado ?? 0),
                          total_recargo: Number(mp.recargo ?? 0),
                          total_acreditar: Number(mp.monto_total ?? 0),
                        }))
                      }
                    } catch (err) {
                      console.error("[RegistrarCobro] error fetch factura:", err)
                    }

                    if (mediosPagoDetalle.length === 0) {
                      alert("Esta factura no tiene medios de pago registrados (probablemente fue confirmada antes de implementarse este sistema). Vas a tener que cargar el cobro manualmente.")
                    }

                    // Cargar cajas de la sucursal y elegir la primera como default
                    const { createClient } = await import("@/lib/supabase/client")
                    const supabase = createClient()
                    const { data: cajasData } = await supabase
                      .from("cajas")
                      .select("id, nombre, sucursal, activo")
                      .eq("activo", true)
                    const cajasFiltradas = (cajasData || []).filter(
                      (c: { sucursal: string }) => c.sucursal === sucursalActiva?.nombre
                    ) as { id: string; nombre: string; sucursal: string }[]
                    setReciboCajasDisponibles(cajasFiltradas)

                    const cajaDefaultId = cajasFiltradas[0]?.id || ""
                    setReciboCajaId(cajaDefaultId)
                    const valoresDefault = cajaDefaultId ? await cargarValoresCaja(cajaDefaultId) : []

                    const monedaFactura = facturaListado.moneda || "ARS"
                    const lineas: ReciboPago[] = mediosPagoDetalle.map((mp: { medio: string; tarjeta_nombre?: string | null; cuotas?: number; total_recargo: number; total_acreditar: number }) => {
                      const cv = mapearMedioACajaValor(mp.medio, valoresDefault)
                      return {
                        id: crypto.randomUUID(),
                        recibo_id: "",
                        valor_id: cv?.id || "",
                        valor_nombre: cv?.nombre || "",
                        tipo_valor: cv?.tipo || "",
                        importe_comprobante: mp.total_acreditar,
                        moneda_comprobante: monedaFactura,
                        importe: mp.total_acreditar,
                        moneda: monedaFactura,
                        es_tarjeta: mp.medio === "tarjeta",
                        tarjeta_nombre: mp.tarjeta_nombre || null,
                        cantidad_cuotas: mp.cuotas || 1,
                        numero_cupon: null,
                        recargo_porcentaje: 0,
                        recargo_importe: mp.total_recargo || 0,
                        es_cheque: false,
                        cheque_id: null,
                        cupon_tarjeta_id: null,
                        imputacion_cuenta: null,
                        cotizacion_cruce: null,
                        cotizacion: null,
                        tipo_cotizacion: null,
                        medio_origen: mp.medio as "efectivo" | "transferencia" | "tarjeta",
                      }
                    })
                    setReciboPagosForm(lineas)

                    setCreandoRecibo(true)
                    setEditandoRecibo(true)
                    setReciboPrevisualizando(false)
                    setSelectedFactura(null)
                    setActiveView("recibos")
                  }}
                  className="px-3 py-1.5 text-sm bg-indigo-900 text-white rounded-md hover:bg-indigo-800 flex items-center gap-1"
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
                <div className="col-span-2">
                  <span className="text-gray-500">Moneda:</span>{" "}
                  <span className="font-medium">{selectedFactura.moneda}</span>
                  {selectedFactura.moneda !== "ARS" && selectedFactura.cotizacion > 0 && (
                    <span className="text-gray-500 ml-2">
                      · {selectedFactura.tipo_cotizacion} · 1 {selectedFactura.moneda} = ${selectedFactura.cotizacion.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
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
              {(selectedFactura.descuento ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-gray-500">Descuento:</span><span>-{formatCurrency(selectedFactura.descuento ?? 0, selectedFactura.moneda)}</span></div>
              )}

              {/* Desglose detallado por medio de pago */}
              {selectedFactura.medios_pago_detalle && selectedFactura.medios_pago_detalle.length > 0 && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medios de Pago</p>
                  {selectedFactura.medios_pago_detalle.map((mp, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                      {/* Header */}
                      <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
                        {mp.medio === "tarjeta" ? <CreditCard className="w-3.5 h-3.5" /> : mp.medio === "efectivo" ? <Banknote className="w-3.5 h-3.5" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                        {mp.medio === "tarjeta"
                          ? `${mp.tarjeta_nombre} ${mp.cuotas && mp.cuotas > 1 ? `— ${mp.cuotas} cuotas` : "— 1 cuota"}${mp.grupo_nombre ? ` · ${mp.grupo_nombre}` : ""}`
                          : mp.medio === "efectivo" ? "Efectivo" : "Transferencia"}
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Monto abonado:</span>
                        <span>{formatCurrency(mp.monto_base, selectedFactura.moneda)}</span>
                      </div>
                      {(mp.iva ?? 0) > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>IVA proporcional:</span>
                          <span>+ {formatCurrency(mp.iva ?? 0, selectedFactura.moneda)}</span>
                        </div>
                      )}
                      {(mp.recargo_pct ?? 0) > 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Recargo ({mp.recargo_pct}%):</span>
                          <span>+ {formatCurrency(mp.importe_recargo ?? 0, selectedFactura.moneda)}</span>
                        </div>
                      )}
                      {mp.cargos?.map((c, j) => (
                        <div key={j} className="flex justify-between text-gray-500">
                          <span>{c.nombre} ({c.pct}%):</span>
                          <span>+ {formatCurrency(c.importe, selectedFactura.moneda)}</span>
                        </div>
                      ))}
                      {(mp.total_recargo > 0 || (mp.iva ?? 0) > 0) && (
                        <>
                          <div className="border-t border-gray-200 my-1" />
                          {mp.total_recargo > 0 && (
                            <div className="flex justify-between text-amber-700 font-semibold">
                              <span>Total recargo:</span>
                              <span>+ {formatCurrency(mp.total_recargo, selectedFactura.moneda)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-800">
                            <span>Total a acreditar:</span>
                            <span>{formatCurrency(mp.total_acreditar, selectedFactura.moneda)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total:</span><span className="whitespace-nowrap">{formatCurrency(selectedFactura.total, selectedFactura.moneda)} <span className="text-sm text-gray-500 font-normal">{selectedFactura.moneda}</span></span></div>
              <div className="flex justify-between text-red-600 font-medium"><span>Saldo:</span><span>{formatCurrency(selectedFactura.saldo ?? 0, selectedFactura.moneda)}</span></div>
            </div>
          </div>

          {/* Bloque Medios de Pago — solo en estado "abierta" */}
          {selectedFactura.estado === "abierta" && (
          <BloquesMediosPago
            key={selectedFactura.id}
            factura={selectedFactura}
            tarjetas={tarjetasDB}
            grupos={gruposDB}
            recargos={recargosDB}
            textoBoton="Confirmar factura (calcula IVA + recargos)"
            textoConfirmado="Factura confirmada. Para registrar el cobro, generá un Recibo desde Ventas."
            onConfirmarCobro={async (lineasPago) => {
              // Modelo "todo en negro": al confirmar la factura llamamos al endpoint
              // que calcula IVA proporcional + recargo según los medios elegidos y
              // genera el segundo asiento contable. La factura queda "confirmada"
              // con saldo = total_final. El COBRO real (descuento de saldo cliente,
              // movimientos en cuenta corriente) se registra después con un Recibo.
              const cotFac = selectedFactura.cotizacion || 1
              const medios = lineasPago
                .filter(l => l.monto > 0)
                .map(l => {
                  let recargo_pct = 0
                  if (l.medio === "tarjeta" && l.tarjeta_id) {
                    const hoy = new Date()
                    const diasKeys = ["dom","lun","mar","mie","jue","vie","sab"] as const
                    const diaKey = diasKeys[hoy.getDay()]
                    const rec = recargosDB.find(r =>
                      r.tarjeta_id === l.tarjeta_id && r.activo &&
                      (l.cuotas||1) >= r.desde_cuota && (l.cuotas||1) <= r.hasta_cuota && r.dias[diaKey]
                    )
                    recargo_pct = rec?.recargo_pct ?? 0
                  }
                  // Convertir el monto a la moneda de la factura.
                  // Si factura ARS + línea USD: usar cotización de la línea.
                  // Si factura USD + línea ARS: usar cotización de la factura.
                  let montoEnFac = l.monto
                  if (l.moneda && l.moneda !== selectedFactura.moneda) {
                    if (l.moneda === "USD" && selectedFactura.moneda === "ARS") {
                      const cotLinea = l.cotizacion ?? 0
                      montoEnFac = l.monto * cotLinea
                    } else if (l.moneda === "ARS" && selectedFactura.moneda === "USD" && cotFac > 0) {
                      montoEnFac = l.monto / cotFac
                    }
                  }
                  montoEnFac = Math.round(montoEnFac * 100) / 100
                  return {
                    medio: l.medio,
                    monto: montoEnFac,
                    tarjeta_id: l.medio === "tarjeta" ? l.tarjeta_id : undefined,
                    cuotas: l.medio === "tarjeta" ? (l.cuotas ?? 1) : undefined,
                    recargo_pct,
                  }
                })

              // Caso especial: factura en USD + medio facturable (tarjeta/transferencia).
              // El IVA y los recargos son siempre en ARS, así que primero hay que
              // convertir la factura a ARS usando la cotización guardada.
              let facturaParaConfirmar = selectedFactura
              const tieneFacturable = medios.some(m => m.medio === "tarjeta" || m.medio === "transferencia")
              if (selectedFactura.moneda !== "ARS" && tieneFacturable) {
                if (!(selectedFactura.cotizacion > 0)) {
                  alert(`Esta factura está en ${selectedFactura.moneda} pero no tiene una cotización válida. Editá la factura y cargá la cotización antes de confirmar con tarjeta o transferencia.`)
                  return
                }
                const subtotalArs = selectedFactura.subtotal * selectedFactura.cotizacion
                const ok = window.confirm(
                  `Esta factura está en ${selectedFactura.moneda}.\n\n` +
                  `Para aplicar IVA y recargos hay que convertirla a pesos.\n\n` +
                  `Cotización: ${selectedFactura.tipo_cotizacion} · 1 ${selectedFactura.moneda} = $${selectedFactura.cotizacion.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n` +
                  `Subtotal en pesos: $${subtotalArs.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n\n` +
                  `(El IVA y el recargo de tarjeta se calculan después y se suman al total final.)\n\n` +
                  `¿Convertir y continuar?`
                )
                if (!ok) return

                try {
                  const conv = await fetch(`/api/facturas/${selectedFactura.id}/convertir-a-ars`, { method: "POST" })
                  if (!conv.ok) {
                    const err = await conv.json().catch(() => ({ error: "Error al convertir factura a ARS" }))
                    alert(`No se pudo convertir la factura: ${err.error}`)
                    return
                  }
                  const convResult = await conv.json()
                  // Refrescar state local con los nuevos valores en ARS
                  facturaParaConfirmar = {
                    ...selectedFactura,
                    moneda: "ARS" as const,
                    subtotal: convResult.subtotal_ars,
                    total: convResult.total_ars,
                    saldo: convResult.total_ars,
                  }
                  setFacturas(prev => prev.map(f => f.id === selectedFactura.id ? facturaParaConfirmar : f))
                  setSelectedFactura(facturaParaConfirmar)
                  // Recalcular medios ahora que el monto está en ARS — los lineasPago
                  // que ingresó el operador siguen siendo en USD: hay que convertirlos.
                  for (const m of medios) {
                    m.monto = Math.round(m.monto * selectedFactura.cotizacion * 100) / 100
                  }
                } catch (e) {
                  alert(`Error de red al convertir factura: ${e instanceof Error ? e.message : String(e)}`)
                  return
                }
              }

              try {
                const res = await fetch(`/api/facturas/${facturaParaConfirmar.id}/confirmar`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ medios }),
                })
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ error: "Error al confirmar factura" }))
                  alert(`No se pudo confirmar la factura: ${err.error}`)
                  return
                }
                const result = await res.json()

                // Construir desglose visual de medios para mostrar en el detalle
                const medioPagoDetalle = (result.medios as Array<{
                  medio: string; tarjeta_id: number | null; cuotas: number | null
                  monto_base: number; iva_calculado: number; recargo: number; monto_total: number
                }>).map(m => {
                  const tarjetaInfo = m.tarjeta_id ? tarjetasDB.find(t => t.id === m.tarjeta_id) : null
                  return {
                    medio: m.medio,
                    tarjeta_nombre: tarjetaInfo?.nombre,
                    cuotas: m.cuotas ?? undefined,
                    monto_base: m.monto_base,
                    iva: m.iva_calculado,
                    total_recargo: m.recargo,
                    total_acreditar: m.monto_total,
                  }
                })

                const facturaActualizada = {
                  ...facturaParaConfirmar,
                  estado: "confirmada" as const,
                  impuestos: result.iva_total,
                  total: result.total_final,
                  saldo: result.total_final,
                  medios_pago_detalle: medioPagoDetalle,
                }
                setFacturas(prev => prev.map(f => f.id === facturaParaConfirmar.id ? facturaActualizada : f))
                setSelectedFactura(facturaActualizada)
              } catch (e) {
                alert(`Error de red al confirmar factura: ${e instanceof Error ? e.message : String(e)}`)
              }
            }}
            onEstadoPagoChange={(estado) => setFichaEstadoPago(estado)}
          />
          )}

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
                onClick={async () => {
                  if (!cancelarFacturaMotivo || !cancelarFacturaDescripcion.trim()) {
                    alert("Debe completar el motivo y la descripción para cancelar la factura")
                    return
                  }

                  // Llamar al endpoint que cancela la factura y genera asiento de reversión
                  const res = await fetch(`/api/facturas/${selectedFactura.id}/cancelar`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      motivo: cancelarFacturaMotivo,
                      descripcion: cancelarFacturaDescripcion.trim(),
                    }),
                  })

                  if (!res.ok) {
                    const err = await res.json()
                    alert(`❌ Error al cancelar: ${err.error}`)
                    return
                  }

                  const result = await res.json()
                  if (result._advertencia) {
                    console.warn("[CANCELAR FACTURA]", result._advertencia)
                  }
                  if (result.numero_reversion) {
                    console.log("[CONTABILIDAD] Asiento de reversión:", result.numero_reversion)
                  }

                  const fechaHoy = new Date().toISOString()
                  const clienteFactura = clientes.find(c => c.id === selectedFactura.cliente_id)

                  // Revertir movimiento de cuenta corriente
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
                        usuario: "Admin",
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
                onClickCapture={e => { (e.currentTarget as HTMLButtonElement).disabled = true }}
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
        <h1 className="text-2xl font-bold text-amber-900">Facturas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={recargarFacturas}
            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 flex items-center gap-1"
            title="Recargar facturas desde la base de datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCreandoFactura(true); setFacturaClienteId(null); setFacturaLineas([]) }}
            className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        </div>
      </div>

      <div className="mb-4">
        <OdooFilterBar
          moduleName="facturas-venta"
          filterOptions={[
            { field: "estado", label: "Estado", values: [
              { value: "borrador", label: "Borrador" },
              { value: "abierta", label: "Abierta" },
              { value: "confirmada", label: "Confirmada" },
              { value: "parcial", label: "Parcial" },
              { value: "cobrada", label: "Cobrada" },
              { value: "conciliada", label: "Conciliada" },
              { value: "cancelada", label: "Cancelada" },
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
            <tr className="border-b bg-gray-50">
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
                    {getEstadoFacturaLabel(factura.estado)}
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

  // ─── RECIBOS — Supabase-connected ─────────────────────────────────────────

  const cargarRecibos = async () => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const { data } = await supabase.from("recibos").select("*").order("created_at", { ascending: false })
    if (data) { setRecibos(data as any); setRecibosLoaded(true) }
  }

  const recargarFacturas = async () => {
    try {
      const res = await fetch("/api/facturas")
      const data = await res.json()
      if (Array.isArray(data)) {
        setFacturas(data.map((f: any) => ({
          id: f.id, numero: f.numero ?? "",
          nota_venta_id: f.nota_venta_id ?? 0, nota_venta_numero: f.nota_venta_numero ?? "",
          cliente_id: f.cliente_id ?? 0, cliente_nombre: f.cliente_nombre ?? "",
          cliente_documento: f.cliente_documento ?? "", estado: f.estado ?? "abierta",
          fecha: f.fecha ?? f.created_at, vendedor_nombre: f.vendedor_nombre ?? "",
          domicilio_facturacion: f.domicilio_facturacion ?? "", moneda: f.moneda ?? "ARS",
          tipo_cotizacion: f.tipo_cotizacion ?? "blue", cotizacion: Number(f.cotizacion) || 1,
          termino_pago: f.termino_pago ?? "Contado", condicion_pago: f.condicion_pago ?? "",
          fecha_vencimiento: f.fecha_vencimiento ?? "",
          subtotal: Number(f.subtotal ?? 0), descuento: Number(f.descuento ?? 0),
          impuestos: Number(f.impuestos ?? 0), total: Number(f.total ?? 0),
          saldo: Number(f.saldo ?? 0), sucursal: f.sucursal ?? "",
          lineas: (f.facturas_lineas ?? []).map((l: any) => ({
            producto_nombre: l.producto_nombre ?? "", descripcion: l.descripcion ?? "",
            cantidad: l.cantidad ?? 1, precio_unitario: l.precio_unitario ?? 0,
            descuento: l.descuento ?? 0, subtotal: Number(l.subtotal ?? 0),
          })),
          vencimientos: (f.facturas_vencimientos ?? []).map((v: any) => ({
            descripcion: v.descripcion ?? "", fecha: v.fecha ?? "", total: Number(v.total ?? 0),
          })),
          seguimiento: f.seguimiento ?? [],
          medios_pago_detalle: (f.factura_medios_pago ?? []).map((mp: any) => ({
            medio: mp.medio,
            tarjeta_nombre: mp.tarjeta?.nombre ?? null,
            cuotas: mp.cuotas ?? undefined,
            monto_base: Number(mp.monto_base ?? 0),
            iva: Number(mp.iva_calculado ?? 0),
            total_recargo: Number(mp.recargo ?? 0),
            total_acreditar: Number(mp.monto_total ?? 0),
          })),
        })))
      }
    } catch { /* no bloquear */ }
  }

  const cargarDetalleRecibo = async (id: string) => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const [{ data: rec }, { data: pagos }, { data: imps }] = await Promise.all([
      supabase.from("recibos").select("*").eq("id", id).single(),
      supabase.from("recibo_pagos").select("*").eq("recibo_id", id),
      supabase.from("recibo_imputaciones").select("*").eq("recibo_id", id),
    ])
    if (rec) {
      const r = { ...rec, pagos: pagos || [], imputaciones: imps || [] } as any
      setSelectedRecibo(r)
      setReciboPagosForm(pagos || [])
      setReciboImputacionesForm(imps || [])
      setReciboClienteIdForm(rec.cliente_id)
      setReciboCajaId(rec.caja_id || "")
      setReciboTipoCotizacion(rec.tipo_cotizacion || "")
      setReciboCotizacion(rec.cotizacion || 0)
      setReciboConcepto(rec.concepto || "")
      setReciboFacturaIdForm(rec.factura_id || null)
      setReciboNvId(rec.nota_venta_id || "")
      setReciboObservaciones(rec.observaciones || "")
      setReciboTab("pagos")

      // Cargar CC del cliente para que calcularCasoImputacion funcione al publicar
      if (rec.cliente_id) {
        try {
          const ccRes = await fetch(`/api/clientes/${rec.cliente_id}/cc`)
          if (ccRes.ok) {
            const cc = await ccRes.json()
            setReciboCCResumen({
              saldo_ars: cc.saldo_ars ?? 0,
              saldo_usd: cc.saldo_usd ?? 0,
              cotizacion_cliente: cc.cotizacion_cliente ?? 0,
              tipo_cotizacion_cliente: cc.tipo_cotizacion_cliente ?? "",
            })
          }
        } catch {
          // no bloquear si la CC no está disponible
        }
      }
    }
  }

  const cargarCajasDisponibles = async () => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const suc = sucursalActiva?.nombre || ""
    const { data } = await supabase.from("cajas").select("id, nombre, sucursal, activo").eq("activo", true)
    const filtradas = (data || []).filter((c: any) => c.sucursal === suc)
    setReciboCajasDisponibles(filtradas)
    if (filtradas.length > 0 && !reciboCajaId) {
      setReciboCajaId(filtradas[0].id)
      await cargarValoresCaja(filtradas[0].id)
      return
    }

    if (reciboCajaId) {
      await cargarValoresCaja(reciboCajaId)
    }
  }

  const cargarValoresCaja = async (cajaId: string) => {
    if (!cajaId) { setReciboValoresCaja([]); return [] as { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }[] }
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const { data, error } = await supabase
      .from("caja_valores")
      .select("id, nombre, tipo, subtipo, moneda")
      .eq("caja_id", cajaId)
      .or("activo.eq.true,activo.is.null")
      .order("nombre")

    if (error) {
      const { data: fallbackData } = await supabase
        .from("caja_valores")
        .select("id, nombre, tipo, subtipo, moneda")
        .eq("caja_id", cajaId)
        .order("nombre")

      const valores = (fallbackData || []) as { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }[]
      setReciboValoresCaja(valores)
      return valores
    }

    const valores = (data || []) as { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }[]
    setReciboValoresCaja(valores)
    return valores
  }

  // Mapea un medio_pago de factura al caja_valor correspondiente
  const mapearMedioACajaValor = (
    medio: string,
    valores: { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }[]
  ) => {
    if (medio === "efectivo") return valores.find(v => v.tipo === "efectivo")
    if (medio === "tarjeta") return valores.find(v => v.subtipo === "tarjeta")
    if (medio === "transferencia") return valores.find(v => v.subtipo === "banco")
    return undefined
  }

  const cargarComprobantesCliente = async (clienteId: string) => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    const { data: facts } = await supabase.from("facturas").select("id, numero, fecha, fecha_vencimiento, total, saldo, moneda").eq("cliente_id", clienteId).gt("saldo", 0).order("fecha_vencimiento", { ascending: true })
    const imps: ReciboImputacion[] = (facts || []).map((f: any) => ({
      id: crypto.randomUUID(),
      recibo_id: "",
      tipo_comprobante: "factura" as const,
      comprobante_id: f.id,
      comprobante_referencia: f.numero,
      fecha_comprobante: f.fecha,
      fecha_vencimiento: f.fecha_vencimiento || f.fecha,
      saldo_moneda: f.saldo,
      moneda_comprobante: f.moneda || "ARS",
      tipo_cotizacion: "",
      cotizacion_original: 1,
      saldo_original: f.saldo,
      cotizacion_actual: 1,
      saldo_actual: f.saldo,
      asignacion: 0,
    }))
    setReciboImputacionesForm(imps)

    // Cargar cuenta corriente bimonetaria del cliente
    setReciboCCCargando(true)
    try {
      const res = await fetch(`/api/clientes/${clienteId}/cc`)
      if (res.ok) {
        const cc = await res.json()
        setReciboCCResumen({
          saldo_ars: cc.saldo_ars ?? 0,
          saldo_usd: cc.saldo_usd ?? 0,
          cotizacion_cliente: cc.cotizacion_cliente ?? 0,
          tipo_cotizacion_cliente: cc.tipo_cotizacion_cliente ?? "",
        })
      }
    } catch {
      // no bloquear si la CC no está disponible
    } finally {
      setReciboCCCargando(false)
    }
  }

  /** Determina el caso de imputación bimonetaria según los saldos de CC.
   * Saldo positivo = el cliente nos debe (deuda). Negativo = el cliente tiene crédito.
   * A = solo deuda ARS | B = solo deuda USD | C = ambas deudas | D = sin deuda */
  const calcularCasoImputacion = (cc: CCResumen | null): 'A' | 'B' | 'C' | 'D' => {
    if (!cc) return 'D'
    const tieneDeudaARS = cc.saldo_ars > 0
    const tieneDeudaUSD = cc.saldo_usd > 0
    if (tieneDeudaARS && tieneDeudaUSD) return 'C'
    if (tieneDeudaARS) return 'A'
    if (tieneDeudaUSD) return 'B'
    return 'D'
  }

  const guardarRecibo = async () => {
    if (reciboGuardando) return

    // Validar que haya al menos una factura asociada
    const tieneFactura = reciboImputacionesForm.some(i => i.tipo_comprobante === "factura")
    if (!tieneFactura) {
      alert("No se puede crear un recibo sin una factura asociada. Agregá al menos una factura antes de guardar.")
      return
    }

    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    const extractMissingColumn = (message?: string | null) => {
      if (!message) return null
      const m = message.match(/Could not find the '([^']+)' column/)
      return m?.[1] ?? null
    }

    const updateReciboCompat = async (id: string, payload: Record<string, unknown>) => {
      const currentPayload: Record<string, unknown> = { ...payload }
      let lastError: Error | null = null

      for (let i = 0; i < 20; i++) {
        const { error } = await supabase.from("recibos").update(currentPayload).eq("id", id)
        if (!error) return

        lastError = new Error(error.message)
        const missingColumn = extractMissingColumn(error.message)
        if (missingColumn && missingColumn in currentPayload) { delete currentPayload[missingColumn]; continue }
        // Si el error es de tipo uuid y tenemos cliente_id, lo quitamos y reintentamos
        if (error.message.includes("invalid input syntax for type uuid") && "cliente_id" in currentPayload) {
          delete currentPayload["cliente_id"]; continue
        }
        throw lastError
      }

      throw lastError ?? new Error("No se pudo actualizar el recibo por incompatibilidad de esquema")
    }

    const insertReciboCompat = async (payload: Record<string, unknown>) => {
      const currentPayload: Record<string, unknown> = { ...payload }
      let lastError: Error | null = null

      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.from("recibos").insert(currentPayload).select().single()
        if (!error) return data

        lastError = new Error(error.message)
        const missingColumn = extractMissingColumn(error.message)
        if (missingColumn && missingColumn in currentPayload) { delete currentPayload[missingColumn]; continue }
        // Si el error es de tipo uuid y tenemos cliente_id, lo quitamos y reintentamos
        if (error.message.includes("invalid input syntax for type uuid") && "cliente_id" in currentPayload) {
          delete currentPayload["cliente_id"]; continue
        }
        throw lastError
      }

      throw lastError ?? new Error("No se pudo crear el recibo por incompatibilidad de esquema")
    }

    const insertManyCompat = async (table: "recibo_pagos" | "recibo_imputaciones", rows: Record<string, unknown>[]) => {
      if (rows.length === 0) return
      const currentRows = rows.map(r => ({ ...r }))
      let lastError: Error | null = null

      for (let i = 0; i < 20; i++) {
        console.log(`[insertManyCompat] intento ${i + 1} en ${table}, cols:`, Object.keys(currentRows[0] || {}))
        const { error } = await supabase.from(table).insert(currentRows)
        if (!error) return

        console.error(`[insertManyCompat] error en ${table}:`, error.message, error.code, error.details)

        // Si la tabla no existe, avisar y no bloquear el guardado del recibo
        if (error.message.includes("Could not find the table")) {
          console.warn(`[insertManyCompat] Tabla ${table} no existe. Ejecutá scripts/create-recibos.sql en Supabase SQL Editor.`)
          return // no lanzar error, el recibo ya se guardó
        }

        lastError = new Error(error.message)
        const missingColumn = extractMissingColumn(error.message)
        if (!error.message.includes("schema cache") || !missingColumn) {
          throw lastError
        }

        let removedAny = false
        for (const row of currentRows) {
          if (missingColumn in row) {
            delete row[missingColumn]
            removedAny = true
          }
        }

        if (!removedAny) {
          throw lastError
        }
      }

      throw lastError ?? new Error(`No se pudo insertar en ${table} por incompatibilidad de esquema`)
    }

    setReciboGuardando(true)
    try {
      const totalPagos = reciboPagosForm.reduce((s, p) => s + (p.importe_comprobante || 0), 0)
      const totalAsig = reciboImputacionesForm.reduce((s, i) => s + (i.asignacion || 0), 0)
      const suc = sucursalActiva?.nombre || ""

      // Cotización del recibo: tomar la del primer pago en moneda extranjera
      const pagoUSD = reciboPagosForm.find(p => p.moneda === 'USD')
      const cotizacionRecibo = pagoUSD?.cotizacion ?? null
      const tipoCotizacionRecibo = pagoUSD?.tipo_cotizacion ?? null

      if (selectedRecibo) {
        // Actualizar existente
        const payloadUpdate = {
          cliente_id: reciboClienteIdForm ? Number(reciboClienteIdForm) : null,
          cliente_nombre: clientes.find(c => String(c.id) === String(reciboClienteIdForm))?.nombre || "",
          caja_id: reciboCajaId || null,
          caja_nombre: reciboCajasDisponibles.find(c => c.id === reciboCajaId)?.nombre || null,
          factura_id: reciboFacturaIdForm || null,
          nota_venta_id: reciboNvId || null,
          cobrador_nombre: null,
          concepto: reciboConcepto || null,
          importe: totalPagos,
          importe_no_conciliado: Math.max(0, totalPagos - totalAsig),
          moneda: reciboPagosForm.some(p => p.moneda === 'USD') ? 'USD' : 'ARS',
          tipo_cotizacion: tipoCotizacionRecibo,
          cotizacion: cotizacionRecibo,
          observaciones: reciboObservaciones || null,
          updated_at: new Date().toISOString(),
        }

        await updateReciboCompat(selectedRecibo.id, payloadUpdate)

        // Recrear pagos
        const { error: delPagosErr } = await supabase.from("recibo_pagos").delete().eq("recibo_id", selectedRecibo.id)
        if (delPagosErr && !delPagosErr.message.includes("Could not find the table")) throw delPagosErr
        if (reciboPagosForm.length > 0) {
          await insertManyCompat("recibo_pagos", reciboPagosForm.map(({ id: _, ...p }) => ({ ...p, recibo_id: selectedRecibo.id })))
        }
        // Recrear imputaciones
        const { error: delImpsErr } = await supabase.from("recibo_imputaciones").delete().eq("recibo_id", selectedRecibo.id)
        if (delImpsErr && !delImpsErr.message.includes("Could not find the table")) throw delImpsErr
        const impsConAsig = reciboImputacionesForm.filter(i => i.asignacion > 0)
        if (impsConAsig.length > 0) {
          await insertManyCompat("recibo_imputaciones", impsConAsig.map(({ id: _, ...i }) => ({ ...i, recibo_id: selectedRecibo.id })))
        }

        await cargarDetalleRecibo(selectedRecibo.id)
      } else {
        // Crear nuevo
        const { data: numData } = await supabase.rpc("generar_numero_recibo", { p_sucursal: suc })
        const numero = numData || `REC X 00000-${Date.now()}`
        const clienteNombre = clientes.find(c => String(c.id) === String(reciboClienteIdForm))?.nombre || ""
        const payloadInsert = {
          numero,
          sucursal: suc,
          cliente_id: reciboClienteIdForm ? Number(reciboClienteIdForm) : null,
          cliente_nombre: clienteNombre,
          caja_id: reciboCajaId || null,
          caja_nombre: reciboCajasDisponibles.find(c => c.id === reciboCajaId)?.nombre || null,
          factura_id: reciboFacturaIdForm || null,
          nota_venta_id: reciboNvId || null,
          cobrador_nombre: reciboCobradorNombre || null,
          concepto: reciboConcepto || null,
          importe: totalPagos,
          importe_no_conciliado: Math.max(0, totalPagos - totalAsig),
          moneda: reciboPagosForm.some(p => p.moneda === 'USD') ? 'USD' : 'ARS',
          tipo_cotizacion: tipoCotizacionRecibo,
          cotizacion: cotizacionRecibo,
          observaciones: reciboObservaciones || null,
          estado: "borrador",
          fecha: new Date().toISOString().split("T")[0],
        }

        const newRec = await insertReciboCompat(payloadInsert)
        if (!newRec) throw new Error("No se pudo crear el recibo en borrador")

        if (reciboPagosForm.length > 0) {
          await insertManyCompat("recibo_pagos", reciboPagosForm.map(({ id: _, ...p }) => ({ ...p, recibo_id: newRec.id })))
        }
        const impsConAsig = reciboImputacionesForm.filter(i => i.asignacion > 0)
        if (impsConAsig.length > 0) {
          await insertManyCompat("recibo_imputaciones", impsConAsig.map(({ id: _, ...i }) => ({ ...i, recibo_id: newRec.id })))
        }
        setCreandoRecibo(false)
        await cargarDetalleRecibo(newRec.id)
      }
      await cargarRecibos()
    } catch (err) {
      const msg = (err as Error).message || "Error desconocido"
      console.error("[guardarRecibo] Error completo:", err)
      console.error("[guardarRecibo] Mensaje:", msg)
      alert("Error al guardar recibo: " + msg)
    }
    finally { setReciboGuardando(false) }
  }

  const publicarRecibo = async () => {
    if (!selectedRecibo || reciboPublicando) return
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    setReciboPublicando(true)

    try {

      // Validaciones
      if (!selectedRecibo.cliente_id) { alert("El recibo debe tener un cliente."); return }
      const pagos = reciboPagosForm
      if (!pagos || pagos.length === 0) { alert("El recibo debe tener al menos un medio de pago."); return }
      const cajaIdParaPublicar = (selectedRecibo as Record<string, unknown>).caja_id as string | undefined || reciboCajaId
      const cajaNombreParaPublicar = (selectedRecibo as Record<string, unknown>).caja_nombre as string | undefined || reciboCajasDisponibles.find(c => c.id === cajaIdParaPublicar)?.nombre
      if (!cajaIdParaPublicar) { alert("Seleccioná una caja antes de confirmar."); return }

      // Validar tarjeta sin factura/NV
      if (pagos.some(p => p.es_tarjeta) && !selectedRecibo.factura_id && !selectedRecibo.nota_venta_id) {
        alert("Para cobrar con tarjeta, el recibo debe estar vinculado a una factura donde el recargo ya esté calculado.")
        return
      }

      // Extracto abierto
      const { data: extracto } = await supabase.from("extractos_caja").select("id").eq("caja_id", cajaIdParaPublicar).eq("estado", "abierto").single()
      if (!extracto) { alert(`No hay extracto abierto para "${cajaNombreParaPublicar || "la caja seleccionada"}". Abrí un extracto en Finanzas → Extractos de Caja.`); return }

    // Movimientos en caja
    const isUUID = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    for (const pago of pagos) {
      const movPayload: Record<string, unknown> = {
        extracto_id: extracto.id,
        valor_id: pago.valor_id,
        valor_nombre: pago.valor_nombre,
        tipo_movimiento: "ingreso",
        importe: pago.importe,
        moneda: pago.moneda,
        concepto: `Recibo ${selectedRecibo.numero} - ${selectedRecibo.cliente_nombre}`,
        documento_origen_tipo: "recibo",
        documento_origen_numero: selectedRecibo.numero,
        estado_movimiento: "confirmado",
      }
      // Solo enviar documento_origen_id si es UUID válido
      if (isUUID(String(selectedRecibo.id))) {
        movPayload.documento_origen_id = String(selectedRecibo.id)
      }
      let { error: movErr } = await supabase.from("movimientos_caja").insert(movPayload)
      if (movErr) {
        console.error("[publicarRecibo] Error movimiento_caja:", movErr.message)
        // Si falla por columna inexistente, reintentar sin ella
        if (movErr.message.includes("schema cache")) {
          const col = movErr.message.match(/Could not find the '([^']+)' column/)?.[1]
          if (col) delete movPayload[col]
          else delete movPayload.estado_movimiento
          const retry = await supabase.from("movimientos_caja").insert(movPayload)
          if (retry.error) throw new Error("Error al crear movimiento en caja: " + retry.error.message)
        } else {
          throw new Error("Error al crear movimiento en caja: " + movErr.message)
        }
      }
      // Cupón si tarjeta
      if (pago.es_tarjeta) {
        const { data: cupon } = await supabase.from("cupones_tarjeta").insert({
          numero_cupon: pago.numero_cupon || null,
          tarjeta_nombre: pago.tarjeta_nombre,
          forma_pago_nombre: pago.valor_nombre,
          forma_pago_id: pago.valor_id,
          cliente_nombre: selectedRecibo.cliente_nombre,
          sucursal: selectedRecibo.sucursal,
          extracto_id: extracto.id,
          importe: pago.importe,
          estado: "en_cartera",
          venta_id: selectedRecibo.nota_venta_id,
          venta_numero: selectedRecibo.nota_venta_numero,
        }).select().single()
        if (cupon) {
          await supabase.from("recibo_pagos").update({ cupon_tarjeta_id: cupon.id }).eq("id", pago.id)
        }
      }
      // Cheque
      if (pago.es_cheque && pago.cheque_id) {
        await supabase.from("cheques_terceros").update({ origen_nombre: selectedRecibo.cliente_nombre }).eq("id", pago.cheque_id)
      }
    }

    // Imputar comprobantes
    const facturasActualizadas: { id: number | string; saldo: number; estado: string }[] = []
    for (const imp of reciboImputacionesForm) {
      if (imp.asignacion <= 0) continue
      const { data: factura } = await supabase.from("facturas").select("saldo, estado, total").eq("id", imp.comprobante_id).single()
      if (factura) {
        const nuevoSaldo = Math.max(0, (factura.saldo || 0) - imp.asignacion)
        const nuevoEstado = nuevoSaldo <= 0.01 ? "conciliada" : factura.estado
        await supabase.from("facturas").update({
          saldo: nuevoSaldo,
          estado: nuevoEstado,
        }).eq("id", imp.comprobante_id)
        facturasActualizadas.push({ id: imp.comprobante_id, saldo: nuevoSaldo, estado: nuevoEstado })
      }
    }
    // Actualizar estado local de facturas para que el listado refleje cambios sin reload
    if (facturasActualizadas.length > 0) {
      setFacturas(prev => prev.map(f => {
        const upd = facturasActualizadas.find(u => String(u.id) === String(f.id))
        return upd ? { ...f, saldo: upd.saldo, estado: upd.estado as typeof f.estado } : f
      }))
    }

    // Calcular no conciliado en la moneda correcta
    const hasUSDPayment = reciboPagosForm.some(p => p.moneda === 'USD')
    let noConciliado: number
    let noConciliadoARS: number
    if (hasUSDPayment) {
      // Recibo en USD: calcular saldo restante en USD
      const totalUSDPagos = reciboPagosForm.reduce((s, p) => s + (p.moneda === 'USD' ? (p.importe || 0) : 0), 0)
      const totalUSDAsig = reciboImputacionesForm
        .filter(i => (i.moneda_comprobante ?? 'USD') === 'USD')
        .reduce((s, i) => s + (i.asignacion || 0), 0)
      noConciliado = Math.max(0, totalUSDPagos - totalUSDAsig)
      // Porción ARS: pagos ARS directos (no cruzados) que no fueron imputados a comprobantes ARS
      const totalARSPagosDirectos = reciboPagosForm
        .filter(p => p.moneda === 'ARS' && !p.cotizacion_cruce)
        .reduce((s, p) => s + (p.importe || 0), 0)
      noConciliadoARS = Math.max(0, totalARSPagosDirectos)
    } else {
      const totalPagos = reciboPagosForm.reduce((s, p) => s + (p.importe_comprobante || 0), 0)
      const totalAsig = reciboImputacionesForm.reduce((s, i) => s + (i.asignacion || 0), 0)
      noConciliado = Math.max(0, totalPagos - totalAsig)
      noConciliadoARS = 0
    }

    // Crear movimientos en cuenta corriente bimonetaria (partida doble por moneda)
    const casoImputacion = calcularCasoImputacion(reciboCCResumen)
    const cotizacionCC = reciboCCResumen?.cotizacion_cliente || reciboCotizacion || 1
    const tipoCotizCC = reciboCCResumen?.tipo_cotizacion_cliente || reciboTipoCotizacion || 'blue'
    const ccMovs: Record<string, unknown>[] = []

    // Resolver comprobante_id vs comprobante_id_int según si el id es UUID o entero
    const idStr = String(selectedRecibo.id)
    const isUUIDRec = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr)

    for (const pago of pagos) {
      // Restricción: pagos USD nunca a CC ARS (spec Sección 5, regla 1)
      if (pago.moneda === 'USD' && pago.imputacion_cuenta === 'ARS') {
        throw new Error('Los pagos en USD solo pueden imputarse a la Cuenta Corriente en USD.')
      }

      const baseMovCC: Record<string, unknown> = {
        cliente_id: selectedRecibo.cliente_id,
        sentido: 'haber',
        comprobante_tipo: 'recibo',
        comprobante_id: isUUIDRec ? idStr : null,
        comprobante_id_int: !isUUIDRec ? Number(selectedRecibo.id) : null,
        comprobante_numero: selectedRecibo.numero,
        fecha: new Date().toISOString().split('T')[0],
      }

      if (pago.moneda === 'USD') {
        // Pago en USD → siempre CC USD, tipo_movimiento: 'recibo'
        const cotizPago = pago.cotizacion || 1
        ccMovs.push({
          ...baseMovCC,
          moneda: 'USD',
          tipo_movimiento: 'recibo',
          importe: pago.importe,
          cotizacion_aplicada: cotizPago,
          tipo_cotizacion: pago.tipo_cotizacion || tipoCotizCC || null,
        })
      } else {
        // Pago en ARS: determinar destino según caso de imputación
        const destino = casoImputacion === 'C'
          ? (pago.imputacion_cuenta || 'ARS')
          : casoImputacion === 'B' ? 'USD' : 'ARS'

        if (destino === 'USD') {
          // Conciliación cruzada ARS → USD: DOS filas vinculadas por conciliacion_id
          const conciliacionId = crypto.randomUUID()
          const cotiz = pago.cotizacion_cruce || cotizacionCC > 0 ? (pago.cotizacion_cruce || cotizacionCC) : 1
          const importeUSD = Math.round((pago.importe / cotiz) * 100) / 100

          // Fila 1 – CC ARS: registra el haber en ARS (el dinero que entra)
          ccMovs.push({
            ...baseMovCC,
            moneda: 'ARS',
            tipo_movimiento: 'conciliacion_cruzada',
            importe: pago.importe,
            cotizacion_aplicada: cotiz,
            tipo_cotizacion: tipoCotizCC,
            conciliacion_id: conciliacionId,
          })

          // Fila 2 – CC USD: registra los USD cancelados equivalentes
          ccMovs.push({
            ...baseMovCC,
            moneda: 'USD',
            tipo_movimiento: 'conciliacion_cruzada',
            importe: importeUSD,
            importe_conversion: pago.importe,
            cotizacion_aplicada: cotiz,
            tipo_cotizacion: tipoCotizCC,
            conciliacion_id: conciliacionId,
          })
        } else {
          // ARS directo a CC ARS, tipo_movimiento: 'recibo'
          ccMovs.push({
            ...baseMovCC,
            moneda: 'ARS',
            tipo_movimiento: 'recibo',
            importe: pago.importe,
            cotizacion_aplicada: 1,
          })
        }
      }
    }

    if (ccMovs.length > 0) {
      const { error: ccErr } = await supabase.from('ventas_cc_movimientos').insert(ccMovs)
      if (ccErr) {
        if (!ccErr.message.includes('does not exist') && !ccErr.message.includes('Could not find the table')) {
          console.error('[publicarRecibo] Error CC movimientos:', ccErr.message)
        }
      }
    }

      // Publicar
      const { error: pubErr } = await supabase.from("recibos").update({
        estado: "publicado",
        importe_no_conciliado: noConciliado,
        importe_no_conciliado_ars: noConciliadoARS,
        fecha_publicacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", selectedRecibo.id)
      if (pubErr) throw pubErr

      // Generar asiento contable — si falla, revertir la publicación
      const asientoRes = await fetch(`/api/recibos/${selectedRecibo.id}/asiento`, { method: "POST" })
      const asientoData = await asientoRes.json()
      if (!asientoData.ok) {
        await supabase.from("recibos").update({ estado: "borrador" }).eq("id", selectedRecibo.id)
        throw new Error(`Error al generar asiento contable: ${asientoData.error}`)
      }

      await cargarDetalleRecibo(selectedRecibo.id)
      await cargarRecibos()
      await recargarFacturas()
    } catch (err) {
      alert("Error al confirmar recibo: " + (err as Error).message)
    } finally {
      setReciboPublicando(false)
    }
  }

  const cancelarReciboPublicado = async () => {
    if (!selectedRecibo || selectedRecibo.estado !== "publicado") return
    if (!cancelarReciboMotivo.trim()) { alert("Ingresá un motivo de cancelación."); return }
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    // Bloquear cancelación si el recibo tiene conciliaciones de deuda asociadas
    const { count: concCount } = await supabase
      .from('conciliaciones_deuda_aplicaciones')
      .select('*', { count: 'exact', head: true })
      .or(`credito_numero.eq.${selectedRecibo.numero},debito_numero.eq.${selectedRecibo.numero}`)
    if ((concCount ?? 0) > 0) {
      alert(`No se puede cancelar el recibo ${selectedRecibo.numero} porque tiene conciliaciones de deuda registradas. Revertí las conciliaciones primero.`)
      setShowCancelarReciboModal(false)
      setCancelarReciboMotivo("")
      return
    }

    // Revertir movimientos caja (buscar por numero ya que id no es UUID)
    await supabase.from("movimientos_caja").update({ estado_movimiento: "cancelado" }).eq("documento_origen_tipo", "recibo").eq("documento_origen_numero", selectedRecibo.numero)

    // Revertir movimientos CC bimonetaria (ambas filas de cc cruzadas incluidas, por comprobante_id)
    const { error: ccRevErr } = await supabase
      .from('ventas_cc_movimientos')
      .delete()
      .eq('comprobante_tipo', 'recibo')
      .eq('comprobante_id', String(selectedRecibo.id))
    if (ccRevErr && !ccRevErr.message.includes('does not exist') && !ccRevErr.message.includes('Could not find the table')) {
      console.warn('[cancelarRecibo] No se pudieron revertir movimientos CC:', ccRevErr.message)
    }

    // Cancelar cupones
    for (const pago of reciboPagosForm) {
      if (pago.cupon_tarjeta_id) {
        await supabase.from("cupones_tarjeta").update({ estado: "cancelado" }).eq("id", pago.cupon_tarjeta_id)
      }
    }

    // Revertir imputaciones
    const facturasRevertidas: { id: number | string; saldo: number; estado: string }[] = []
    for (const imp of reciboImputacionesForm) {
      if (imp.asignacion <= 0) continue
      const { data: factura } = await supabase.from("facturas").select("saldo, total").eq("id", imp.comprobante_id).single()
      if (factura) {
        const saldoRestaurado = Math.min((factura.saldo || 0) + imp.asignacion, factura.total)
        await supabase.from("facturas").update({
          saldo: saldoRestaurado,
          estado: "abierta",
        }).eq("id", imp.comprobante_id)
        facturasRevertidas.push({ id: imp.comprobante_id, saldo: saldoRestaurado, estado: "abierta" })
      }
    }
    if (facturasRevertidas.length > 0) {
      setFacturas(prev => prev.map(f => {
        const upd = facturasRevertidas.find(u => String(u.id) === String(f.id))
        return upd ? { ...f, saldo: upd.saldo, estado: upd.estado as typeof f.estado } : f
      }))
    }


    await supabase.from("recibos").update({
      estado: "cancelado",
      importe_no_conciliado: 0,
      importe_no_conciliado_ars: 0,
      fecha_cancelacion: new Date().toISOString(),
      motivo_cancelacion: cancelarReciboMotivo,
    }).eq("id", selectedRecibo.id)

    // Generar asiento de reversa (no bloquea si no había asiento previo)
    const reversaRes = await fetch(`/api/recibos/${selectedRecibo.id}/asiento`, { method: "DELETE" })
    const reversaData = await reversaRes.json()
    if (!reversaData.ok) {
      console.warn("[cancelarRecibo] No se pudo generar reversa contable:", reversaData.error)
    }

    setShowCancelarReciboModal(false)
    setCancelarReciboMotivo("")
    await cargarDetalleRecibo(selectedRecibo.id)
    await cargarRecibos()
    await recargarFacturas()
  }

  const resetFormRecibo = () => {
    setReciboClienteIdForm(null)
    setReciboFacturaIdForm(null)
    setReciboPagosForm([])
    setReciboImputacionesForm([])
    setReciboCCResumen(null)
    setReciboCCCargando(false)
    setReciboMontoForm(0)
    setReciboCajaId("")
    setReciboTipoCotizacion("")
    setReciboCotizacion(0)
    setReciboConcepto("")
    setReciboNvId("")
    setReciboObservaciones("")
    setReciboTab("pagos")
    setShowAddPagoModal(false)
  }

  const seleccionRapida = () => {
    const totalPagos = reciboPagosForm.reduce((s, p) => s + (p.importe_comprobante || 0), 0)
    let restante = totalPagos
    setReciboImputacionesForm(prev => prev.map(imp => {
      if (restante <= 0) return { ...imp, asignacion: 0 }
      const asig = Math.min(imp.saldo_actual, restante)
      restante -= asig
      return { ...imp, asignacion: asig }
    }))
  }

  const asignarPagosAFacturas = () => {
    const totalPagos = reciboPagosForm.reduce((s, p) => s + (p.importe_comprobante || 0), 0)
    const marcadas = reciboImputacionesForm.filter(i => i.asignacion > 0)
    if (marcadas.length === 0) { seleccionRapida(); return }
    const totalSaldoMarcadas = marcadas.reduce((s, i) => s + i.saldo_actual, 0)
    if (totalSaldoMarcadas === 0) return
    let restante = totalPagos
    setReciboImputacionesForm(prev => prev.map(imp => {
      if (imp.asignacion <= 0 && marcadas.find(m => m.comprobante_id === imp.comprobante_id)) {
        const prop = (imp.saldo_actual / totalSaldoMarcadas) * totalPagos
        const asig = Math.min(imp.saldo_actual, prop, restante)
        restante -= asig
        return { ...imp, asignacion: Math.round(asig * 100) / 100 }
      }
      return imp
    }))
  }

  // ─── RENDER: Formulario Recibo (Crear / Editar) ─────────────────────────
  const renderFormularioRecibo = () => {
    const esBorrador = !selectedRecibo || selectedRecibo.estado === "borrador"
    const enModoEdicion = creandoRecibo || editandoRecibo
    const esSoloLectura = !enModoEdicion
    const clienteSeleccionado = clientes.find(c => String(c.id) === String(reciboClienteIdForm))
    const totalPagos = reciboPagosForm.reduce((s, p) => s + (p.importe_comprobante || 0), 0)
    const totalAsig = reciboImputacionesForm.reduce((s, i) => s + (i.asignacion || 0), 0)
    const noConciliado = Math.max(0, totalPagos - totalAsig)
    // Pagos pre-cargados desde factura que no encontraron caja_valor en la caja seleccionada
    const pagosSinValor = reciboPagosForm.filter(p => p.medio_origen && !p.valor_id)
    const labelMedio: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia", tarjeta: "Tarjeta" }
    const cobroBloqueado = pagosSinValor.length > 0

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <BotonVolver onClick={() => { setCreandoRecibo(false); setEditandoRecibo(false); setSelectedRecibo(null); resetFormRecibo() }} variant="minimal" texto="" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-amber-900">{selectedRecibo ? selectedRecibo.numero : "Nuevo Recibo"}</h1>
            {selectedRecibo && <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedRecibo.estado === "borrador" ? "bg-gray-100 text-gray-700" : selectedRecibo.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{selectedRecibo.estado === "borrador" ? "Borrador" : selectedRecibo.estado === "publicado" ? "Publicado" : "Cancelado"}</span>
            </div>}
          </div>
          <div className="flex gap-2">
            {selectedRecibo?.estado === "borrador" && !editandoRecibo && <button onClick={() => setEditandoRecibo(true)} className="bg-indigo-900 text-white px-4 py-2 rounded text-sm hover:bg-indigo-800">Editar</button>}
            {esBorrador && enModoEdicion && <button onClick={guardarRecibo} disabled={reciboGuardando || reciboPublicando} className="bg-indigo-900 text-white px-4 py-2 rounded text-sm hover:bg-indigo-800 disabled:opacity-50">{reciboGuardando ? "Guardando..." : "Guardar"}</button>}
            {selectedRecibo?.estado === "borrador" && enModoEdicion && <button onClick={publicarRecibo} disabled={reciboGuardando || reciboPublicando || cobroBloqueado} title={cobroBloqueado ? "La caja seleccionada no tiene los valores requeridos" : ""} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"><CheckCircle className="w-4 h-4" />{reciboPublicando ? "Confirmando..." : "Confirmar"}</button>}
            {selectedRecibo?.estado === "publicado" && <button onClick={() => setShowCancelarReciboModal(true)} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Cancelar Recibo</button>}
          </div>
        </div>

        {/* Cabecera 2 columnas */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500">Sucursal</label><input value={sucursalActiva?.nombre || ""} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" /></div>
              <div><label className="text-xs font-medium text-gray-500">Cliente *</label>
                <select value={reciboClienteIdForm || ""} onChange={e => { const v = e.target.value; setReciboClienteIdForm(v || null); if (v) cargarComprobantesCliente(v) }} disabled={esSoloLectura} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.codigo || ""} - {c.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium text-gray-500">Importe</label><input value={`$ ${totalPagos.toLocaleString()}`} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" /></div>
                <div><label className="text-xs font-medium text-gray-500">No Conciliado</label><input value={`$ ${noConciliado.toLocaleString()}`} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50" /></div>
              </div>

            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500">Caja</label>
                <select
                  value={reciboCajaId}
                  onChange={async e => {
                    const nuevaCajaId = e.target.value
                    setReciboCajaId(nuevaCajaId)
                    const valores = await cargarValoresCaja(nuevaCajaId)
                    // Re-mapear pagos pre-cargados desde factura al cambiar la caja
                    setReciboPagosForm(prev => prev.map(p => {
                      if (!p.medio_origen) return p
                      const cv = mapearMedioACajaValor(p.medio_origen, valores)
                      return {
                        ...p,
                        valor_id: cv?.id || "",
                        valor_nombre: cv?.nombre || "",
                        tipo_valor: cv?.tipo || "",
                      }
                    }))
                  }}
                  disabled={esSoloLectura}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Seleccionar caja...</option>
                  {reciboCajasDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {cobroBloqueado && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            <strong>La caja seleccionada no tiene los siguientes valores configurados:</strong>{" "}
            {pagosSinValor.map(p => labelMedio[p.medio_origen || ""] || p.medio_origen).join(", ")}.
            Cambiá de caja o configurá esos valores para poder confirmar el cobro.
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b flex">
            {["pagos", "comprobantes", "descuentos", "otra_info", "observaciones"].map(t => (
              <button key={t} onClick={() => setReciboTab(t)} className={`px-4 py-2.5 text-sm font-medium ${reciboTab === t ? "border-b-2 border-emerald-600 text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}>
                {t === "pagos" ? "Información de Pago" : t === "comprobantes" ? "Comprobantes" : t === "descuentos" ? "Desc./Recargos" : t === "otra_info" ? "Otra Información" : "Observaciones"}
              </button>
            ))}
          </div>
          <div className="p-4">
            {/* TAB PAGOS */}
            {reciboTab === "pagos" && (
              <div className="space-y-3">
                {esBorrador && (
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (!reciboCajaId) { alert("Seleccioná una caja primero."); return }
                      setShowAddPagoModal(true)
                    }} className="bg-indigo-900 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" />Añadir un elemento</button>
                  </div>
                )}
                {reciboPagosForm.length > 0 ? (
                  <div className="space-y-3">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-xs text-gray-500">
                        <th className="py-2 px-3">Nombre (valor)</th>
                        <th className="text-right px-3">Imp. Comp.</th>
                        <th className="px-3">Mon. Comp.</th>
                        <th className="text-right px-3">Importe</th>
                        <th className="px-3">Moneda</th>
                        {calcularCasoImputacion(reciboCCResumen) === 'C' && <th className="text-center px-3">Imputar a</th>}
                        {esBorrador && <th className="w-10"></th>}
                      </tr></thead>
                      <tbody>{reciboPagosForm.map((p, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-1.5 px-3">{p.valor_nombre}{p.es_tarjeta && <span className="ml-1 text-xs text-blue-600">({p.tarjeta_nombre} x{p.cantidad_cuotas})</span>}</td>
                          <td className="text-right px-3">${(p.importe_comprobante || p.importe)?.toLocaleString()}</td>
                          <td className="px-3">{p.moneda_comprobante || p.moneda}</td>
                          <td className="text-right px-3 font-medium">${p.importe?.toLocaleString()}</td>
                          <td className="px-3">{p.moneda}</td>
                          {calcularCasoImputacion(reciboCCResumen) === 'C' && (
                            <td className="text-center">
                              {p.moneda === 'USD' ? (
                                <span className="text-xs text-gray-400">CC USD</span>
                              ) : esBorrador ? (
                                <select
                                  value={p.imputacion_cuenta || 'ARS'}
                                  onChange={e => setReciboPagosForm(prev => prev.map((x, idx) => idx === i ? { ...x, imputacion_cuenta: e.target.value as 'ARS' | 'USD' } : x))}
                                  className="border rounded px-1 py-0.5 text-xs"
                                >
                                  <option value="ARS">CC ARS</option>
                                  <option value="USD">CC USD</option>
                                </select>
                              ) : (
                                <span className="text-xs">{p.imputacion_cuenta === 'USD' ? 'CC USD' : 'CC ARS'}</span>
                              )}
                            </td>
                          )}
                          {esBorrador && <td className="text-right"><button onClick={() => setReciboPagosForm(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>}
                        </tr>
                      ))}</tbody>
                    </table>

                    {/* Resumen de totales — panel separado */}
                    {(() => {
                      const totalARS = reciboPagosForm.filter(p => p.moneda !== 'USD').reduce((s, p) => s + (p.importe || 0), 0)
                      const totalUSD = reciboPagosForm.filter(p => p.moneda === 'USD').reduce((s, p) => s + (p.importe || 0), 0)
                      const cotiz = reciboPagosForm.find(p => p.moneda === 'USD')?.cotizacion || reciboCotizacion || 1
                      const hasMixed = totalARS > 0 && totalUSD > 0
                      const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                      const totalReciboARS = Math.round((totalARS + totalUSD * cotiz) * 100) / 100
                      const totalReciboUSD = Math.round((totalUSD + totalARS / cotiz) * 100) / 100
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
                              <span className="font-bold text-indigo-900">$ {fmt(totalReciboARS)}</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-2 bg-indigo-50 border-t border-indigo-100">
                              <span className="font-semibold text-gray-700">Total en USD</span>
                              <span className="font-bold text-indigo-900">USD {fmt(totalReciboUSD)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : <p className="text-sm text-gray-400 py-6 text-center">No hay medios de pago agregados.</p>}
              </div>
            )}

            {/* TAB COMPROBANTES */}
            {reciboTab === "comprobantes" && (() => {
              const noClienteSeleccionado = !reciboClienteIdForm
              const mkFiltro = (lista: ReciboImputacion[], filtro: string, todos: boolean) => {
                const base = todos ? lista : lista.filter(i => i.saldo_actual > 0 || i.asignacion > 0)
                if (!filtro.trim()) return base
                const q = filtro.toLowerCase()
                return base.filter(i =>
                  i.comprobante_referencia?.toLowerCase().includes(q) ||
                  i.fecha_vencimiento?.includes(q)
                )
              }
              const impsARS = reciboImputacionesForm.filter(i => (i.moneda_comprobante || "ARS") === "ARS")
              const impsUSD = reciboImputacionesForm.filter(i => i.moneda_comprobante === "USD")
              const visiblesARS = mkFiltro(impsARS, reciboFiltroARS, reciboTodosARS)
              const visiblesUSD = mkFiltro(impsUSD, reciboFiltroUSD, reciboTodosUSD)

              // Macheo: al hacer click en un crédito, asigna el importe a los débitos en orden de venc.
              const machearCredito = (pago: ReciboPago) => {
                const monedaPago = pago.moneda as "ARS" | "USD"
                const cotiz = reciboPagosForm.find(p => p.moneda === 'USD')?.cotizacion || reciboCotizacion || 1

                // Buscar débitos en la misma moneda primero, si no hay, cruce de moneda
                const elegibledirectos = reciboImputacionesForm
                  .filter(i => (i.moneda_comprobante || "ARS") === monedaPago && i.saldo_actual > 0)
                  .sort((a, b) => (a.fecha_vencimiento || "").localeCompare(b.fecha_vencimiento || ""))
                const elegiblesCruce = reciboImputacionesForm
                  .filter(i => (i.moneda_comprobante || "ARS") !== monedaPago && i.saldo_actual > 0)
                  .sort((a, b) => (a.fecha_vencimiento || "").localeCompare(b.fecha_vencimiento || ""))

                // Si ya está machiado (directos o cruce), desmarcar todo de ambas monedas
                const yaMachiado = [...elegibledirectos, ...elegiblesCruce].some(i => i.asignacion > 0)
                if (yaMachiado) {
                  setReciboImputacionesForm(prev => prev.map(x => ({ ...x, asignacion: 0 })))
                  return
                }

                const elegibles = elegibledirectos.length > 0 ? elegibledirectos : elegiblesCruce
                const esCruce = elegibledirectos.length === 0 && elegiblesCruce.length > 0

                // Importepago convertido a la moneda de los débitos si es cruce
                const importeEnMonedaDebito = esCruce
                  ? (monedaPago === "ARS" ? pago.importe / cotiz : pago.importe * cotiz)
                  : pago.importe

                let restante = importeEnMonedaDebito
                const nuevasAsig: Record<string, number> = {}
                for (const imp of elegibles) {
                  if (restante <= 0) break
                  const asig = Math.min(imp.saldo_actual, restante)
                  nuevasAsig[imp.id] = asig
                  restante -= asig
                }
                setReciboImputacionesForm(prev => prev.map(x =>
                  x.id in nuevasAsig ? { ...x, asignacion: nuevasAsig[x.id] } : x
                ))
              }

              // Panel de créditos (medios de pago del recibo)
              const cotizCruce = reciboPagosForm.find(p => p.moneda === 'USD')?.cotizacion || reciboCotizacion || 1
              const totalAsigARS = impsARS.reduce((s, i) => s + (i.asignacion || 0), 0)
              const totalAsigUSD = impsUSD.reduce((s, i) => s + (i.asignacion || 0), 0)
              // ARS equivalente consumido por débitos USD (cruce)
              const totalAsigUSDenARS = totalAsigUSD * cotizCruce
              const pagosARS = reciboPagosForm.filter(p => p.moneda === "ARS")
              const pagosUSD = reciboPagosForm.filter(p => p.moneda === "USD")
              const totalCreditosARS = pagosARS.reduce((s, p) => s + p.importe, 0)
              const totalCreditosUSD = pagosUSD.reduce((s, p) => s + p.importe, 0)

              const panelCreditos = (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">Créditos de este Recibo</h3>
                    <span className="text-xs text-gray-400">Hacé click para machear con los débitos</span>
                  </div>
                  {reciboPagosForm.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-4">Sin medios de pago cargados todavía.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr className="text-xs font-semibold text-gray-600 uppercase">
                            <th className="text-left py-2 px-3">Medio de Pago</th>
                            <th className="text-right py-2 px-3">Importe</th>
                            <th className="text-center py-2 px-3">Moneda</th>
                            <th className="text-right py-2 px-3">Conciliado</th>
                            <th className="text-right py-2 px-3">Restante</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reciboPagosForm.map((pago) => {
                            const monedaPago = pago.moneda as "ARS" | "USD"
                            // Conciliado directo (misma moneda) o cruce
                            let conciliado = 0
                            if (monedaPago === "ARS") {
                              // Primero satisface deudas ARS; el sobrante va a deudas USD (cruce)
                              const usadoEnARS = Math.min(pago.importe, totalAsigARS)
                              const sobrante = Math.max(0, pago.importe - usadoEnARS)
                              // sobrante en ARS aplicado a deuda USD: comparar con lo asignado en USD * cotiz
                              const usadoEnCruceARS = Math.min(sobrante, totalAsigUSDenARS)
                              conciliado = usadoEnARS + usadoEnCruceARS
                            } else {
                              conciliado = Math.min(pago.importe, totalAsigUSD)
                            }
                            const restante = Math.max(0, pago.importe - conciliado)
                            const completo = restante < 0.01
                            const esCruce = monedaPago === "ARS" && totalAsigARS === 0 && totalAsigUSD > 0
                            return (
                              <tr
                                key={pago.id}
                                onClick={() => esBorrador && machearCredito(pago)}
                                className={`border-b border-gray-100 transition-colors ${esBorrador ? "cursor-pointer" : ""} ${completo ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-indigo-50"}`}
                              >
                                <td className="py-2 px-3 text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    {completo && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
                                    {!completo && esBorrador && <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />}
                                    {pago.valor_nombre}
                                    {pago.tarjeta_nombre && <span className="text-xs text-gray-400">({pago.tarjeta_nombre})</span>}
                                    {esCruce && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">cruce USD</span>}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(pago.importe, monedaPago)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${monedaPago === "USD" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{monedaPago}</span>
                                </td>
                                <td className="py-2 px-3 text-sm text-right text-emerald-700 font-medium">{formatCurrency(conciliado, monedaPago)}</td>
                                <td className={`py-2 px-3 text-sm text-right font-medium ${restante > 0.01 ? "text-rose-600" : "text-gray-400"}`}>{restante > 0.01 ? formatCurrency(restante, monedaPago) : "—"}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50 text-xs font-semibold text-gray-600">
                          {totalCreditosARS > 0 && (
                            <tr>
                              <td className="py-2 px-3">Total ARS</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(totalCreditosARS, "ARS")}</td>
                              <td></td>
                              <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(Math.min(totalCreditosARS, totalAsigARS), "ARS")}</td>
                              <td className={`py-2 px-3 text-right ${totalCreditosARS - totalAsigARS > 0.01 ? "text-rose-600" : "text-gray-400"}`}>{totalCreditosARS - totalAsigARS > 0.01 ? formatCurrency(totalCreditosARS - totalAsigARS, "ARS") : "—"}</td>
                            </tr>
                          )}
                          {totalCreditosUSD > 0 && (
                            <tr>
                              <td className="py-2 px-3">Total USD</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(totalCreditosUSD, "USD")}</td>
                              <td></td>
                              <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(Math.min(totalCreditosUSD, totalAsigUSD), "USD")}</td>
                              <td className={`py-2 px-3 text-right ${totalCreditosUSD - totalAsigUSD > 0.01 ? "text-rose-600" : "text-gray-400"}`}>{totalCreditosUSD - totalAsigUSD > 0.01 ? formatCurrency(totalCreditosUSD - totalAsigUSD, "USD") : "—"}</td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )

              const toggleImp = (imp: ReciboImputacion) => {
                const checked = imp.asignacion > 0
                if (checked) {
                  setReciboImputacionesForm(prev => prev.map(x =>
                    x.id === imp.id ? { ...x, asignacion: 0 } : x
                  ))
                  return
                }
                const monedaImp = (imp.moneda_comprobante || "ARS") as "ARS" | "USD"
                const cotiz = reciboPagosForm.find(p => p.moneda === 'USD')?.cotizacion || reciboCotizacion || 1
                // Crédito directo en la misma moneda
                const creditoDirecto = reciboPagosForm.filter(p => p.moneda === monedaImp).reduce((s, p) => s + p.importe, 0)
                // Crédito cruzado: pagos ARS usables para pagar deuda USD (y viceversa)
                const creditoCruce = monedaImp === "USD"
                  ? reciboPagosForm.filter(p => p.moneda === "ARS").reduce((s, p) => s + p.importe / cotiz, 0)
                  : reciboPagosForm.filter(p => p.moneda === "USD").reduce((s, p) => s + p.importe * cotiz, 0)
                const totalCredito = creditoDirecto + creditoCruce
                // Ya asignado a OTROS débitos de la misma moneda
                const yaAsig = reciboImputacionesForm
                  .filter(x => x.id !== imp.id && (x.moneda_comprobante || "ARS") === monedaImp)
                  .reduce((s, x) => s + (x.asignacion || 0), 0)
                const disponible = Math.max(0, totalCredito - yaAsig)
                const asig = Math.min(imp.saldo_actual, disponible)
                setReciboImputacionesForm(prev => prev.map(x =>
                  x.id === imp.id ? { ...x, asignacion: asig } : x
                ))
              }

              const renderPanel = (
                moneda: "ARS" | "USD",
                items: ReciboImputacion[],
                visibles: ReciboImputacion[],
                filtro: string,
                setFiltro: (v: string) => void,
                todos: boolean,
                setTodos: (v: boolean) => void
              ) => {
                const totalAsigMon = items.reduce((s, i) => s + (i.asignacion || 0), 0)
                const todosSeleccionados = visibles.length > 0 && visibles.every(i => i.asignacion > 0)
                const algunoSeleccionado = visibles.some(i => i.asignacion > 0)

                const toggleTodosVisibles = () => {
                  const marcar = !todosSeleccionados
                  const ids = new Set(visibles.map(i => i.id))
                  setReciboImputacionesForm(prev => prev.map(x =>
                    ids.has(x.id) ? { ...x, asignacion: marcar ? x.saldo_actual : 0 } : x
                  ))
                }

                return (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b bg-white">
                      <h3 className="text-sm font-bold text-gray-800">Cuenta Corriente {moneda}</h3>
                    </div>
                    <div className="bg-rose-50 border-b">
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-semibold text-rose-700">Débitos {moneda}</span>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={filtro}
                            onChange={e => setFiltro(e.target.value)}
                            placeholder="Filtrar..."
                            className="text-xs border rounded px-2 py-1 w-28 bg-white"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={todos} onChange={e => setTodos(e.target.checked)} className="w-3 h-3" />
                            Todos
                          </label>
                          <span className="text-xs font-medium text-rose-600">{visibles.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr className="text-xs font-semibold text-gray-600 uppercase">
                            <th className="text-left py-2 px-3">NV</th>
                            <th className="text-left py-2 px-3">Comprobante</th>
                            <th className="text-left py-2 px-3">Cond.</th>
                            <th className="text-left py-2 px-3">Venc.</th>
                            <th className="text-right py-2 px-3">Importe</th>
                            <th className="text-right py-2 px-3">Saldo</th>
                            <th className="text-center py-2 px-3 w-12">
                              {esBorrador && visibles.length > 0 && (
                                <input
                                  type="checkbox"
                                  checked={todosSeleccionados}
                                  ref={el => { if (el) el.indeterminate = algunoSeleccionado && !todosSeleccionados }}
                                  onChange={toggleTodosVisibles}
                                  className="w-4 h-4 cursor-pointer accent-indigo-700"
                                  title="Marcar / desmarcar todos"
                                />
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {noClienteSeleccionado ? (
                            <tr><td colSpan={7} className="py-6 text-center text-sm text-gray-400">Seleccioná un cliente</td></tr>
                          ) : visibles.length === 0 ? (
                            <tr><td colSpan={7} className="py-6 text-center text-sm text-gray-400">Sin comprobantes pendientes en {moneda}</td></tr>
                          ) : visibles.map((imp) => {
                            const seleccionado = imp.asignacion > 0
                            return (
                              <tr
                                key={imp.id}
                                className={`border-b border-gray-100 cursor-pointer transition-colors ${seleccionado ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-gray-50"}`}
                                onClick={() => esBorrador && toggleImp(imp)}
                              >
                                <td className="py-2 px-3 text-xs text-gray-500">-</td>
                                <td className="py-2 px-3 text-sm font-medium text-blue-700">{imp.comprobante_referencia}</td>
                                <td className="py-2 px-3 text-xs text-gray-500">-</td>
                                <td className="py-2 px-3 text-sm">{formatDate(imp.fecha_vencimiento) || "-"}</td>
                                <td className="py-2 px-3 text-sm text-right">{formatCurrency(imp.saldo_moneda, moneda)}</td>
                                <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(imp.saldo_actual, moneda)}</td>
                                <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                  {esBorrador ? (
                                    <input
                                      type="checkbox"
                                      checked={seleccionado}
                                      onChange={() => toggleImp(imp)}
                                      className="w-4 h-4 cursor-pointer accent-indigo-700"
                                    />
                                  ) : (
                                    seleccionado ? <span className="text-indigo-600 font-bold text-xs">{formatCurrency(imp.asignacion, moneda)}</span> : <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot className="bg-gray-50 font-semibold text-sm">
                            <tr>
                              <td colSpan={6} className="py-2 px-3 text-right text-gray-600">Total conciliado:</td>
                              <td className="py-2 px-3 text-center text-indigo-800">{formatCurrency(totalAsigMon, moneda)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )
              }

              return (
                <div className="space-y-4">
                  {panelCreditos}
                  {renderPanel("ARS", impsARS, visiblesARS, reciboFiltroARS, setReciboFiltroARS, reciboTodosARS, setReciboTodosARS)}
                  {renderPanel("USD", impsUSD, visiblesUSD, reciboFiltroUSD, setReciboFiltroUSD, reciboTodosUSD, setReciboTodosUSD)}
                </div>
              )
            })()}

            {/* TAB DESCUENTOS */}
            {reciboTab === "descuentos" && <p className="text-sm text-gray-400 py-8 text-center">En desarrollo.</p>}

            {/* TAB OTRA INFO */}
            {reciboTab === "otra_info" && <p className="text-sm text-gray-400 py-8 text-center">En desarrollo.</p>}

            {/* TAB OBSERVACIONES */}
            {reciboTab === "observaciones" && (
              <textarea value={reciboObservaciones} onChange={e => setReciboObservaciones(e.target.value)} disabled={esSoloLectura} className="w-full h-40 text-sm border rounded p-2" placeholder="Observaciones..." />
            )}
          </div>
        </div>

        {/* Modal agregar pago */}
        {showAddPagoModal && (
          <ModalMedioPago
            cajaId={reciboCajaId}
            puedeEditarCotizacion={currentUser?.rol === "admin" || currentUser?.rol === "supervisor"}
            onGuardar={(result: MedioPagoResult, yNuevo: boolean) => {
              const esTarjeta = result.valor_subtipo === "tarjeta"
              const escheque = result.valor_subtipo === "cheque_tercero"
              const nuevoPago: ReciboPago = {
                id: crypto.randomUUID(),
                recibo_id: selectedRecibo?.id || "",
                valor_id: result.valor_id,
                valor_nombre: result.valor_nombre,
                tipo_valor: result.valor_tipo,
                importe_comprobante: result.importe_ars ?? result.importe,
                moneda_comprobante: "ARS",
                importe: result.importe,
                moneda: result.moneda,
                es_tarjeta: esTarjeta,
                tarjeta_nombre: result.tarjeta_nombre || null,
                cantidad_cuotas: result.cuotas || 1,
                numero_cupon: result.numero_cupon || null,
                recargo_porcentaje: 0,
                recargo_importe: 0,
                es_cheque: escheque,
                cheque_id: null,
                cupon_tarjeta_id: null,
                cotizacion: result.cotizacion ?? null,
                tipo_cotizacion: result.tipo_cotizacion ?? null,
                imputacion_cuenta: null,
                cotizacion_cruce: null,
              }
              setReciboPagosForm(prev => [...prev, nuevoPago])
              if (!yNuevo) setShowAddPagoModal(false)
            }}
            onCerrar={() => setShowAddPagoModal(false)}
          />
        )}

        {/* Modal cancelar recibo */}
        {showCancelarReciboModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowCancelarReciboModal(false)}>
            <div className="bg-white rounded-lg shadow-xl w-[400px] p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 text-red-700">Cancelar Recibo</h3>
              <p className="text-sm text-gray-600 mb-3">Esta acción revertirá los movimientos de caja, cupones y las imputaciones de facturas.</p>
              <div><label className="text-xs font-medium text-gray-500">Motivo *</label><textarea value={cancelarReciboMotivo} onChange={e => setCancelarReciboMotivo(e.target.value)} className="w-full border rounded p-2 text-sm h-24" placeholder="Ingresá el motivo..." /></div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowCancelarReciboModal(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Volver</button>
                <button onClick={cancelarReciboPublicado} className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">Confirmar Cancelación</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── RENDER: Lista de Recibos ───────────────────────────────────────────────
  const renderRecibos = () => {
    if (selectedRecibo || editandoRecibo) return renderFormularioRecibo()
    if (creandoRecibo) return renderFormularioRecibo()

    // Cargar al montar
    if (!recibosLoaded) { cargarRecibos(); cargarCajasDisponibles() }

    const q = searchQuery.toLowerCase()
    const listaFiltrada = recibos.filter(r => {
      // Filtros OdooBar
      for (const f of activeFiltersRecibos) {
        if (f.field === "estado" && r.estado !== f.value) return false
        if (f.field === "moneda" && r.moneda !== f.value) return false
      }
      if (q && !r.numero?.toLowerCase().includes(q) && !r.cliente_nombre?.toLowerCase().includes(q)) return false
      return true
    })

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Recibos</h1>
          <button onClick={() => { resetFormRecibo(); setCreandoRecibo(true); setSelectedRecibo(null); setEditandoRecibo(false); cargarCajasDisponibles() }} className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"><Plus className="w-4 h-4" />Nuevo Recibo</button>
        </div>
        <div className="mb-4">
          <OdooFilterBar moduleName="recibos"
            filterOptions={[
              { field: "estado", label: "Estado", values: [{ value: "borrador", label: "Borrador" }, { value: "publicado", label: "Publicado" }, { value: "cancelado", label: "Cancelado" }] },
              { field: "moneda", label: "Moneda", values: [{ value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }] },
            ]}
            groupByOptions={[{ id: "estado", label: "Estado", field: "estado" }, { id: "cliente", label: "Cliente", field: "cliente_nombre" }]}
            activeFilters={activeFiltersRecibos} activeGroupBy={activeGroupByRecibos} searchTerm={searchQuery}
            onFiltersChange={setActiveFiltersRecibos} onGroupByChange={setActiveGroupByRecibos} onSearchChange={setSearchQuery}
            savedFilters={savedFiltersRecibos}
            {...makeSavedFilterHandlers(setSavedFiltersRecibos, setActiveFiltersRecibos, setActiveGroupByRecibos, setSearchQuery)}
            totalCount={recibos.length} filteredCount={listaFiltrada.length}
          />
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b text-left text-xs text-gray-500 uppercase"><th className="px-4 py-3">Número</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Nota de Venta</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Moneda</th><th className="px-4 py-3 text-right">Importe</th></tr></thead>
            <tbody>{listaFiltrada.map(r => (
              <tr key={r.id} onClick={async () => { await cargarDetalleRecibo(r.id); cargarCajasDisponibles(); if (r.caja_id) cargarValoresCaja(r.caja_id) }} className="border-b hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-sm">{r.numero}</td>
                <td className="px-4 py-3 text-sm">{r.cliente_nombre}</td>
                <td className="px-4 py-3 text-sm">{r.fecha}</td>
                <td className="px-4 py-3 text-sm">{r.nota_venta_numero || "—"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.estado === "borrador" ? "bg-gray-100 text-gray-700" : r.estado === "publicado" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{r.estado === "borrador" ? "Borrador" : r.estado === "publicado" ? "Publicado" : "Cancelado"}</span></td>
                <td className="px-4 py-3 text-sm">{r.moneda}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">${r.importe?.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
          {listaFiltrada.length === 0 && <div className="text-center py-12 text-gray-500">No se encontraron recibos</div>}
        </div>
      </div>
    )
  }

  
  // ─── CONCILIACIÓN — función al nivel del componente para evitar closures stale ──
  const ejecutarConciliacion = async () => {
    const selDebitos = conciliacionSeleccionDebitos
    const selCreditos = conciliacionSeleccionCreditos
    const cot = conciliacionCotizacion

    const selDebitosARS  = selDebitos.filter(d => d.moneda === 'ARS')
    const selCreditosARS = selCreditos.filter(c => c.moneda === 'ARS')
    const selDebitosUSD  = selDebitos.filter(d => d.moneda === 'USD')
    const selCreditosUSD = selCreditos.filter(c => c.moneda === 'USD')

    const hayParARS = selDebitosARS.length > 0 && selCreditosARS.length > 0
    const hayParUSD = selDebitosUSD.length > 0 && selCreditosUSD.length > 0
    const hayMixto  = (selDebitosARS.length > 0 && selCreditosUSD.length > 0) ||
                      (selDebitosUSD.length > 0 && selCreditosARS.length > 0)
    const puedeEjecutar = hayParARS || hayParUSD || (hayMixto && cot > 0)

    if (!puedeEjecutar || conciliacionEjecutando) return
    setConciliacionEjecutando(true)

    try {
      const clienteSeleccionado = clientes.find(c => c.id === conciliacionClienteId)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const facturaUpdates: { id: number; saldoNuevo: number }[] = []
      const reciboUpdates: { id: number; importeNoConciliadoNuevo: number; usaARSPorcion?: boolean }[] = []
      const ncUpdates: { id: number; saldoDisponibleNuevo: number }[] = []
      const aplicaciones: typeof conciliacionHistorial[0]['aplicaciones'] = []

      const cruzar = (moneda: 'ARS' | 'USD') => {
        const debits = selDebitos.filter(d => d.moneda === moneda).map(d => ({ ...d }))
        const credits = selCreditos.filter(c => c.moneda === moneda).map(c => ({ ...c }))
        for (const cred of credits) {
          const creditoInfo = cred.tipo === 'recibo' ? recibos.find(r => r.id === cred.id) : ajustes.find(a => a.id === cred.id)
          const creditoNum = creditoInfo ? (creditoInfo as any).numero : ''
          for (const deb of debits) {
            if (deb.montoAplicar <= 0 || cred.montoAplicar <= 0) continue
            const factInfo = facturas.find(f => f.id === deb.id)
            if (!factInfo) continue
            const monto = Math.min(deb.montoAplicar, cred.montoAplicar)
            aplicaciones.push({ debito_tipo: 'Factura', debito_numero: factInfo.numero, credito_tipo: cred.tipo === 'nc' ? 'NC' : 'Recibo', credito_numero: creditoNum, monto, debito_moneda: moneda, credito_moneda: moneda })
            const fu = facturaUpdates.find(u => u.id === deb.id)
            if (fu) fu.saldoNuevo -= monto
            else facturaUpdates.push({ id: deb.id, saldoNuevo: factInfo.saldo - monto })
            if (cred.tipo === 'recibo') {
              const ru = reciboUpdates.find(u => u.id === cred.id)
              const rInfo = recibos.find(r => r.id === cred.id)
              // Si el crédito es ARS pero el recibo es USD, usar porción ARS
              const usaARSPorcion = moneda === 'ARS' && rInfo?.moneda === 'USD'
              if (ru) ru.importeNoConciliadoNuevo -= monto
              else reciboUpdates.push({ id: cred.id, importeNoConciliadoNuevo: (usaARSPorcion ? (rInfo?.importe_no_conciliado_ars ?? 0) : (rInfo?.importe_no_conciliado ?? 0)) - monto, usaARSPorcion })
            } else {
              const nu = ncUpdates.find(u => u.id === cred.id)
              const nInfo = ajustes.find(a => a.id === cred.id)
              const saldoBase = nInfo?.saldo_disponible ?? nInfo?.total ?? 0
              if (nu) nu.saldoDisponibleNuevo -= monto
              else ncUpdates.push({ id: cred.id, saldoDisponibleNuevo: Math.max(0, saldoBase - monto) })
            }
            deb.montoAplicar -= monto; cred.montoAplicar -= monto
          }
        }
      }
      cruzar('ARS'); cruzar('USD')

      if (hayMixto && cot > 0) {
        // USD créditos → ARS débitos
        const usdCreds = selCreditosUSD.map(c => {
          const ru = reciboUpdates.find(u => u.id === c.id)
          const rInfo = recibos.find(r => r.id === c.id)
          return { ...c, montoAplicar: ru ? ru.importeNoConciliadoNuevo : (rInfo?.importe_no_conciliado ?? c.montoAplicar) }
        })
        const arsDebs = selDebitosARS.map(d => {
          const fu = facturaUpdates.find(u => u.id === d.id)
          const fInfo = facturas.find(f => f.id === d.id)
          return { ...d, montoAplicar: fu ? fu.saldoNuevo : (fInfo?.saldo ?? d.montoAplicar) }
        })
        for (const cred of usdCreds) {
          const rInfo = recibos.find(r => r.id === cred.id)
          const creditoNum = rInfo?.numero ?? ''
          for (const deb of arsDebs) {
            if (deb.montoAplicar <= 0.001 || cred.montoAplicar <= 0.001) continue
            const factInfo = facturas.find(f => f.id === deb.id)
            if (!factInfo) continue
            const montoAplicadoARS = Math.min(deb.montoAplicar, cred.montoAplicar * cot)
            const montoAplicadoUSD = montoAplicadoARS / cot
            aplicaciones.push({ debito_tipo: 'Factura', debito_numero: factInfo.numero, credito_tipo: 'Recibo', credito_numero: creditoNum, monto: montoAplicadoARS, debito_moneda: 'ARS', credito_moneda: 'USD', cotizacion: cot })
            const fu = facturaUpdates.find(u => u.id === deb.id)
            if (fu) fu.saldoNuevo = Math.max(0, fu.saldoNuevo - montoAplicadoARS)
            else facturaUpdates.push({ id: deb.id, saldoNuevo: Math.max(0, factInfo.saldo - montoAplicadoARS) })
            const ru = reciboUpdates.find(u => u.id === cred.id)
            if (ru) ru.importeNoConciliadoNuevo = Math.max(0, ru.importeNoConciliadoNuevo - montoAplicadoUSD)
            else reciboUpdates.push({ id: cred.id, importeNoConciliadoNuevo: Math.max(0, (rInfo?.importe_no_conciliado ?? 0) - montoAplicadoUSD) })
            deb.montoAplicar -= montoAplicadoARS; cred.montoAplicar -= montoAplicadoUSD
          }
        }

        // ARS créditos → USD débitos
        const arsCreds = selCreditosARS.map(c => {
          const ru = reciboUpdates.find(u => u.id === c.id)
          const rInfo = recibos.find(r => r.id === c.id)
          const nInfo = ajustes.find(a => a.id === c.id)
          return { ...c, montoAplicar: ru ? ru.importeNoConciliadoNuevo : c.tipo === 'recibo' ? (rInfo?.importe_no_conciliado ?? c.montoAplicar) : (nInfo?.saldo_disponible ?? nInfo?.total ?? c.montoAplicar) }
        })
        const usdDebs = selDebitosUSD.map(d => {
          const fu = facturaUpdates.find(u => u.id === d.id)
          const fInfo = facturas.find(f => f.id === d.id)
          return { ...d, montoAplicar: fu ? fu.saldoNuevo : (fInfo?.saldo ?? d.montoAplicar) }
        })
        for (const cred of arsCreds) {
          const rInfo = recibos.find(r => r.id === cred.id)
          const nInfo = ajustes.find(a => a.id === cred.id)
          const creditoNum = rInfo?.numero ?? nInfo?.numero ?? ''
          for (const deb of usdDebs) {
            if (deb.montoAplicar <= 0.001 || cred.montoAplicar <= 0.001) continue
            const factInfo = facturas.find(f => f.id === deb.id)
            if (!factInfo) continue
            const montoAplicadoARS = Math.min(cred.montoAplicar, deb.montoAplicar * cot)
            const montoAplicadoUSD = montoAplicadoARS / cot
            aplicaciones.push({ debito_tipo: 'Factura', debito_numero: factInfo.numero, credito_tipo: cred.tipo === 'nc' ? 'NC' : 'Recibo', credito_numero: creditoNum, monto: montoAplicadoUSD, debito_moneda: 'USD', credito_moneda: 'ARS', cotizacion: cot })
            const fu = facturaUpdates.find(u => u.id === deb.id)
            if (fu) fu.saldoNuevo = Math.max(0, fu.saldoNuevo - montoAplicadoUSD)
            else facturaUpdates.push({ id: deb.id, saldoNuevo: Math.max(0, factInfo.saldo - montoAplicadoUSD) })
            const ru = reciboUpdates.find(u => u.id === cred.id)
            if (cred.tipo === 'recibo') {
              if (ru) ru.importeNoConciliadoNuevo = Math.max(0, ru.importeNoConciliadoNuevo - montoAplicadoARS)
              else reciboUpdates.push({ id: cred.id, importeNoConciliadoNuevo: Math.max(0, (rInfo?.importe_no_conciliado ?? 0) - montoAplicadoARS) })
            } else {
              const nu = ncUpdates.find(u => u.id === cred.id)
              const saldoBase = nInfo?.saldo_disponible ?? nInfo?.total ?? 0
              if (nu) nu.saldoDisponibleNuevo = Math.max(0, nu.saldoDisponibleNuevo - montoAplicadoARS)
              else ncUpdates.push({ id: cred.id, saldoDisponibleNuevo: Math.max(0, saldoBase - montoAplicadoARS) })
            }
            deb.montoAplicar -= montoAplicadoUSD; cred.montoAplicar -= montoAplicadoARS
          }
        }
      }

      if (aplicaciones.length === 0) {
        alert('No se encontraron pares débito/crédito válidos para conciliar.')
        return
      }

      for (const u of facturaUpdates) {
        const s = Math.max(0, u.saldoNuevo)
        const { error } = await supabase.from('facturas').update({ saldo: s, estado: s <= 0.01 ? 'conciliada' : 'abierta' }).eq('id', u.id)
        if (error) { alert('Error al actualizar factura: ' + error.message); return }
      }
      for (const u of reciboUpdates) {
        const rInfo = recibos.find(r => r.id === u.id)
        // Si el crédito fue aplicado a moneda ARS desde un recibo USD, reducir porción ARS
        const usaARSPorcion = u.usaARSPorcion ?? false
        if (usaARSPorcion) {
          await supabase.from('recibos').update({ importe_no_conciliado_ars: Math.max(0, u.importeNoConciliadoNuevo) }).eq('id', u.id)
        } else {
          await supabase.from('recibos').update({ importe_no_conciliado: Math.max(0, u.importeNoConciliadoNuevo) }).eq('id', u.id)
        }
      }
      for (const u of ncUpdates) {
        await supabase.from('ajustes_clientes').update({ saldo_disponible: u.saldoDisponibleNuevo }).eq('id', u.id)
      }

      for (const u of facturaUpdates) {
        const s = Math.max(0, u.saldoNuevo)
        setFacturas(prev => prev.map(f => f.id === u.id ? { ...f, saldo: s, estado: s <= 0.01 ? 'conciliada' : f.estado } : f))
      }
      for (const u of reciboUpdates) {
        const usaARSPorcion = u.usaARSPorcion ?? false
        if (usaARSPorcion) {
          setRecibos(prev => prev.map(r => r.id === u.id ? { ...r, importe_no_conciliado_ars: Math.max(0, u.importeNoConciliadoNuevo) } : r))
        } else {
          setRecibos(prev => prev.map(r => r.id === u.id ? { ...r, importe_no_conciliado: Math.max(0, u.importeNoConciliadoNuevo) } : r))
        }
      }
      for (const u of ncUpdates) {
        setAjustes(prev => prev.map(a => a.id === u.id ? { ...a, saldo_disponible: u.saldoDisponibleNuevo } : a))
      }

      // Persistir conciliación en DB
      if (clienteSeleccionado) {
        const totalConciliado = aplicaciones.reduce((s, a) => s + a.monto, 0)
        const { data: nuevaConc, error: concErr } = await supabase
          .from('conciliaciones_deuda')
          .insert({
            fecha: new Date().toISOString(),
            cliente_id: clienteSeleccionado.id,
            total_conciliado: totalConciliado,
            usuario: currentUser?.nombre || 'Admin',
            sucursal_id: sucursalActiva?.id ?? null,
          })
          .select('id')
          .single()
        if (concErr) {
          alert('Error al guardar historial de conciliación: ' + concErr.message)
          return
        }
        const aplRows = aplicaciones.map(a => ({
          conciliacion_id: nuevaConc.id,
          debito_tipo: a.debito_tipo,
          debito_numero: a.debito_numero,
          credito_tipo: a.credito_tipo,
          credito_numero: a.credito_numero,
          monto: a.monto,
          debito_moneda: (a as any).debito_moneda ?? 'ARS',
          credito_moneda: (a as any).credito_moneda ?? 'ARS',
          cotizacion: (a as any).cotizacion ?? null,
        }))
        await supabase.from('conciliaciones_deuda_aplicaciones').insert(aplRows)
        setConciliacionHistorial(prev => [
          {
            id: nuevaConc.id,
            fecha: new Date().toISOString(),
            cliente_id: clienteSeleccionado.id,
            cliente_nombre: clienteSeleccionado.nombre,
            aplicaciones,
            total_conciliado: totalConciliado,
            usuario: currentUser?.nombre || 'Admin',
            estado: 'activa' as const,
            fecha_cancelacion: null,
          },
          ...prev.filter(h => h.id !== nuevaConc.id),
        ])
      }
    } catch (err) {
      alert('Error inesperado: ' + (err as Error).message)
    } finally {
      setConciliacionEjecutando(false)
      setConciliacionSeleccionDebitos([])
      setConciliacionSeleccionCreditos([])
    }
  }

  const revertirConciliacion = async (concId: number) => {
    if (!confirm('¿Confirmás que querés revertir esta conciliación? Se restaurarán los saldos de las facturas y créditos involucrados.')) return
    setConciliacionRevertiendoId(concId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Traer las aplicaciones de la conciliación
      const { data: apls, error: aplErr } = await supabase
        .from('conciliaciones_deuda_aplicaciones')
        .select('*')
        .eq('conciliacion_id', concId)
      if (aplErr || !apls) { alert('Error al obtener aplicaciones: ' + aplErr?.message); return }

      for (const apl of apls) {
        // Restaurar saldo de factura (débito) — buscar en DB directamente para no depender del estado local
        if (apl.debito_numero) {
          const { data: facDB } = await supabase.from('facturas').select('id, saldo, total').eq('numero', apl.debito_numero).maybeSingle()
          if (facDB) {
            const saldoRestaurado = Math.min((facDB.saldo || 0) + apl.monto, facDB.total)
            await supabase.from('facturas').update({ saldo: saldoRestaurado, estado: 'abierta' }).eq('id', facDB.id)
            setFacturas(prev => prev.map(f => f.id === facDB.id ? { ...f, saldo: saldoRestaurado, estado: 'abierta' } : f))
          }
        }

        // Restaurar crédito (recibo o NC) — buscar en DB directamente
        const esNC = apl.credito_tipo?.startsWith('NC')
        if (esNC) {
          if (apl.credito_numero) {
            const { data: ncDB } = await supabase.from('ajustes_clientes').select('id, saldo_disponible').eq('numero', apl.credito_numero).maybeSingle()
            if (ncDB) {
              const saldoRestaurado = (ncDB.saldo_disponible ?? 0) + apl.monto
              await supabase.from('ajustes_clientes').update({ saldo_disponible: saldoRestaurado }).eq('id', ncDB.id)
              setAjustes(prev => prev.map(a => a.id === ncDB.id ? { ...a, saldo_disponible: saldoRestaurado } : a))
            }
          }
        } else {
          if (apl.credito_numero) {
            const { data: reciboDBArr } = await supabase.from('recibos').select('id, numero, moneda, importe_no_conciliado, importe_no_conciliado_ars').eq('numero', apl.credito_numero)
            const reciboDB = reciboDBArr?.[0]
            if (reciboDB) {
              const creditoEsARSDeReciboUSD = apl.credito_moneda === 'ARS' && reciboDB.moneda === 'USD'
              if (creditoEsARSDeReciboUSD) {
                const importeRestaurado = (reciboDB.importe_no_conciliado_ars || 0) + apl.monto
                await supabase.from('recibos').update({ importe_no_conciliado_ars: importeRestaurado }).eq('id', reciboDB.id)
                setRecibos(prev => prev.map(r => r.id === reciboDB.id ? { ...r, importe_no_conciliado_ars: importeRestaurado } : r))
              } else {
                const importeRestaurado = (reciboDB.importe_no_conciliado || 0) + apl.monto
                await supabase.from('recibos').update({ importe_no_conciliado: importeRestaurado }).eq('id', reciboDB.id)
                setRecibos(prev => prev.map(r => r.id === reciboDB.id ? { ...r, importe_no_conciliado: importeRestaurado } : r))
              }
            }
          }
        }
      }

      // Marcar la conciliación como cancelada (no se elimina para conservar historial)
      const fechaCancelacion = new Date().toISOString()
      // Intentar persistir estado en DB (requiere script 072 ejecutado en Supabase)
      const { error: updErr } = await supabase
        .from('conciliaciones_deuda')
        .update({ estado: 'cancelada', fecha_cancelacion: fechaCancelacion })
        .eq('id', concId)
      if (updErr && !updErr.message.includes('schema cache') && !updErr.message.includes('Could not find')) {
        alert('Error al cancelar la conciliación: ' + updErr.message)
        return
      }
      // Persistir en localStorage para sobrevivir hard refresh (hasta que script 072 esté en DB)
      try {
        const stored = JSON.parse(localStorage.getItem('conciliaciones_canceladas') ?? '{}')
        stored[String(concId)] = fechaCancelacion
        localStorage.setItem('conciliaciones_canceladas', JSON.stringify(stored))
      } catch {}
      const clienteIdConciliacion = conciliacionHistorial.find(h => h.id === concId)?.cliente_id
      // Recargar pasando el override explícito para evitar stale closure sobre el estado local
      if (clienteIdConciliacion) {
        await cargarHistorialConciliacionesCliente(clienteIdConciliacion, { id: concId, fecha_cancelacion: fechaCancelacion })
      } else {
        setConciliacionHistorial(prev => prev.map(h =>
          h.id === concId ? { ...h, estado: 'cancelada' as const, fecha_cancelacion: fechaCancelacion } : h
        ))
      }
    } catch (err) {
      alert('Error inesperado: ' + (err as Error).message)
    } finally {
      setConciliacionRevertiendoId(null)
    }
  }

  const revertirImputacionesRecibo = async (reciboId: number) => {
    if (!confirm('¿Confirmás revertir las imputaciones de este recibo? Se restaurarán los saldos de las facturas y el crédito del recibo quedará disponible nuevamente.')) return
    setConciliacionRevertiendoId(-reciboId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Traer las imputaciones del recibo
      const { data: imps, error: impErr } = await supabase
        .from('recibo_imputaciones')
        .select('*')
        .eq('recibo_id', reciboId)
      if (impErr || !imps || imps.length === 0) { alert('No se encontraron imputaciones para revertir'); return }

      for (const imp of imps) {
        if (!imp.asignacion || imp.asignacion <= 0) continue
        // Restaurar saldo de factura
        const { data: fac } = await supabase.from('facturas').select('saldo, total').eq('id', imp.comprobante_id).single()
        if (fac) {
          const saldoRestaurado = Math.min((fac.saldo || 0) + imp.asignacion, fac.total)
          await supabase.from('facturas').update({ saldo: saldoRestaurado, estado: 'abierta' }).eq('id', imp.comprobante_id)
          setFacturas(prev => prev.map(f => String(f.id) === String(imp.comprobante_id) ? { ...f, saldo: saldoRestaurado, estado: 'abierta' } : f))
        }
      }

      // Eliminar las imputaciones del recibo
      await supabase.from('recibo_imputaciones').delete().eq('recibo_id', reciboId)

      // Restaurar importe_no_conciliado del recibo al importe total de pagos en su moneda
      const recibo = recibos.find(r => String(r.id) === String(reciboId))
      if (recibo) {
        const { data: pagos } = await supabase.from('recibo_pagos').select('importe, moneda, cotizacion_cruce').eq('recibo_id', reciboId)
        const monedaRecibo = recibo.moneda ?? 'ARS'
        const totalEnMoneda = (pagos ?? []).reduce((s: number, p: any) =>
          p.moneda === monedaRecibo ? s + (p.importe || 0) : s, 0)
        // Restaurar también la porción ARS para recibos mixtos
        const totalARSDirectos = monedaRecibo === 'USD'
          ? (pagos ?? []).reduce((s: number, p: any) =>
              p.moneda === 'ARS' && !p.cotizacion_cruce ? s + (p.importe || 0) : s, 0)
          : 0
        await supabase.from('recibos').update({
          importe_no_conciliado: totalEnMoneda,
          importe_no_conciliado_ars: totalARSDirectos,
        }).eq('id', reciboId)
        setRecibos(prev => prev.map(r => String(r.id) === String(reciboId)
          ? { ...r, importe_no_conciliado: totalEnMoneda, importe_no_conciliado_ars: totalARSDirectos }
          : r))
      }

      // Marcar en historial como cancelada
      setConciliacionHistorial(prev => prev.map(h =>
        h.id === -reciboId ? { ...h, estado: 'cancelada' as const, fecha_cancelacion: new Date().toISOString() } : h
      ))
    } catch (err) {
      alert('Error inesperado: ' + (err as Error).message)
    } finally {
      setConciliacionRevertiendoId(null)
    }
  }

  const cargarHistorialConciliacionesCliente = async (clienteId: number, cancelledOverride?: { id: number, fecha_cancelacion: string }) => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const clienteNombre = clientes.find(c => c.id === clienteId)?.nombre ?? ''

    // 1. Conciliaciones manuales desde conciliaciones_deuda
    const { data: concData, error: concLoadErr } = await supabase
      .from('conciliaciones_deuda')
      .select('id, fecha, cliente_id, total_conciliado, usuario, conciliaciones_deuda_aplicaciones(debito_tipo, debito_numero, credito_tipo, credito_numero, monto, debito_moneda, credito_moneda, cotizacion)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
    if (concLoadErr) console.error('[historial] error cargando conciliaciones:', concLoadErr.message)
    // Leer cancelaciones persistidas en localStorage (fallback hasta que script 072 esté en DB)
    let lsCancel: Record<string, string> = {}
    try { lsCancel = JSON.parse(localStorage.getItem('conciliaciones_canceladas') ?? '{}') } catch {}
    // Preservar estado 'cancelada' del estado local (la columna puede no existir en DB aún)
    const estadosLocales = new Map(
      conciliacionHistorial.filter(h => h.cliente_id === clienteId && h.estado === 'cancelada').map(h => [h.id, h])
    )
    const manualEntries = ((concData ?? []) as any[]).map(c => {
      const local = estadosLocales.get(c.id as number)
      const isOverride = cancelledOverride?.id === (c.id as number)
      const lsFecha = lsCancel[String(c.id as number)]
      const isCancelled = isOverride || !!lsFecha || local?.estado === 'cancelada' || c.estado === 'cancelada'
      const cancelFecha = isOverride ? cancelledOverride!.fecha_cancelacion : (lsFecha ?? local?.fecha_cancelacion ?? c.fecha_cancelacion ?? null)
      return {
      id: c.id as number,
      fecha: c.fecha as string,
      cliente_id: c.cliente_id as number,
      cliente_nombre: clienteNombre,
      aplicaciones: (c.conciliaciones_deuda_aplicaciones ?? []) as any[],
      total_conciliado: c.total_conciliado as number,
      usuario: (c.usuario ?? '') as string,
      estado: (isCancelled ? 'cancelada' : 'activa') as 'activa' | 'cancelada',
      fecha_cancelacion: cancelFecha as string | null,
      esRecibo: false as const,
      }
    })

    // 2. Imputaciones desde recibos con recibo_imputaciones
    const { data: recibosData } = await supabase
      .from('recibos')
      .select('id, numero, fecha, estado, importe, moneda, recibo_imputaciones(comprobante_referencia, tipo_comprobante, moneda_comprobante, asignacion, cotizacion_actual)')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false })
    const reciboEntries = ((recibosData ?? []) as any[])
      .filter(r => (r.recibo_imputaciones ?? []).some((i: any) => i.asignacion > 0))
      .map(r => {
        const imps = (r.recibo_imputaciones ?? []).filter((i: any) => i.asignacion > 0)
        const aplicaciones = imps.map((i: any) => ({
          debito_tipo: i.tipo_comprobante === 'factura' ? 'Factura' : 'ND',
          debito_numero: i.comprobante_referencia ?? '',
          credito_tipo: 'Recibo',
          credito_numero: r.numero ?? '',
          monto: i.asignacion as number,
          debito_moneda: i.moneda_comprobante ?? 'ARS',
          credito_moneda: i.moneda_comprobante ?? 'ARS',
          cotizacion: i.cotizacion_actual ?? null,
        }))
        return {
          id: -(r.id as number),   // ID negativo para distinguir de conciliaciones_deuda
          fecha: r.fecha as string,
          cliente_id: clienteId,
          cliente_nombre: clienteNombre,
          aplicaciones,
          total_conciliado: aplicaciones.reduce((s: number, a: any) => s + a.monto, 0) as number,
          usuario: '',
          estado: (r.estado === 'cancelado' ? 'cancelada' : 'activa') as 'activa' | 'cancelada',
          fecha_cancelacion: null,
          esRecibo: true as const,
          reciboNumero: r.numero as string,
        }
      })

    const loaded = [...manualEntries, ...reciboEntries].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )

    setConciliacionHistorial(prev => [
      ...prev.filter(h => h.cliente_id !== clienteId),
      ...loaded,
    ])
  }

  // Conciliacion de Deuda - Bimonetaria
  const renderConciliacion = () => {
    // Cargar recibos si aún no se hizo (pueden no estar si se navegó directo a esta vista)
    if (!recibosLoaded) { cargarRecibos() }

    const clienteSeleccionado = clientes.find(c => c.id === conciliacionClienteId)

    // ── Separar facturas por moneda ──────────────────────────────────────
    const todasFacts = conciliacionClienteId
      ? facturas.filter(f => f.cliente_id === conciliacionClienteId)
      : []
    const factsARS = todasFacts.filter(f => (!f.moneda || f.moneda === 'ARS'))
    const factsUSD = todasFacts.filter(f => f.moneda === 'USD')

    const pendientesARS = factsARS.filter(f => f.saldo > 0)
    const pendientesUSD = factsUSD.filter(f => f.saldo > 0)

    // ── Recibos por moneda ───────────────────────────────────────────────
    const todosRecibos = conciliacionClienteId
      ? recibos.filter(r => r.cliente_id === conciliacionClienteId && r.estado === 'publicado')
      : []
    // Recibos ARS puros + porción ARS de recibos USD mixtos
    const recibosARS = [
      ...todosRecibos.filter(r => !r.moneda || r.moneda === 'ARS'),
      ...todosRecibos
        .filter(r => r.moneda === 'USD' && (r.importe_no_conciliado_ars ?? 0) > 0)
        .map(r => ({ ...r, importe_no_conciliado: r.importe_no_conciliado_ars ?? 0, _esARSPorcionDeUSD: true })),
    ]
    const recibosUSD = todosRecibos.filter(r => r.moneda === 'USD')

    // ── NC por moneda ────────────────────────────────────────────────────
    const todasNC = conciliacionClienteId
      ? ajustes.filter(a => a.cliente_id === conciliacionClienteId && (a.estado === 'publicado' || a.estado === 'activo') && a.numero.startsWith('NC-'))
      : []
    const ncARS = todasNC.filter(a => !a.moneda || a.moneda === 'ARS')
    const ncUSD = todasNC.filter(a => a.moneda === 'USD')

    // ── Saldos totales ───────────────────────────────────────────────────
    const debitoARSTotal = factsARS.filter(f => f.saldo > 0).reduce((s, f) => s + f.saldo, 0)
    const creditoARSTotal = recibosARS.filter(r => r.importe_no_conciliado > 0).reduce((s, r) => s + r.importe_no_conciliado, 0)
      + ncARS.filter(n => (n.saldo_disponible ?? n.total) > 0).reduce((s, n) => s + (n.saldo_disponible ?? n.total), 0)
    const saldoARS = debitoARSTotal - creditoARSTotal

    const debitoUSDTotal = factsUSD.filter(f => f.saldo > 0).reduce((s, f) => s + f.saldo, 0)
    const creditoUSDTotal = recibosUSD.filter(r => r.importe_no_conciliado > 0).reduce((s, r) => s + r.importe_no_conciliado, 0)
      + ncUSD.filter(n => (n.saldo_disponible ?? n.total) > 0).reduce((s, n) => s + (n.saldo_disponible ?? n.total), 0)
    const saldoUSD = debitoUSDTotal - creditoUSDTotal

    // ── Selecciones ──────────────────────────────────────────────────────
    const selDebitosARS = conciliacionSeleccionDebitos.filter(d => d.moneda === 'ARS')
    const selCreditosARS = conciliacionSeleccionCreditos.filter(c => c.moneda === 'ARS')
    const selDebitosUSD = conciliacionSeleccionDebitos.filter(d => d.moneda === 'USD')
    const selCreditosUSD = conciliacionSeleccionCreditos.filter(c => c.moneda === 'USD')

    const totalSelDebitosARS = selDebitosARS.reduce((s, d) => s + d.montoAplicar, 0)
    const totalSelCreditosARS = selCreditosARS.reduce((s, c) => s + c.montoAplicar, 0)
    const totalSelDebitosUSD = selDebitosUSD.reduce((s, d) => s + d.montoAplicar, 0)
    const totalSelCreditosUSD = selCreditosUSD.reduce((s, c) => s + c.montoAplicar, 0)

    // Tipo de conciliación detectado
    const hayParARS  = selDebitosARS.length > 0 && selCreditosARS.length > 0
    const hayParUSD  = selDebitosUSD.length > 0 && selCreditosUSD.length > 0
    // Cruzada: débitos ARS + créditos USD (o débitos USD + créditos ARS)
    const hayMixto   = (selDebitosARS.length > 0 && selCreditosUSD.length > 0) ||
                       (selDebitosUSD.length > 0 && selCreditosARS.length > 0)
    const haySeleccion = hayParARS || hayParUSD || (hayMixto && conciliacionCotizacion > 0)

    // ── Helpers de toggle ────────────────────────────────────────────────
    const toggleDebito = (id: number, moneda: 'ARS' | 'USD', saldo: number) => {
      setConciliacionSeleccionDebitos(prev => {
        const existe = prev.find(d => d.id === id && d.tipo === 'factura')
        return existe ? prev.filter(d => !(d.id === id && d.tipo === 'factura'))
          : [...prev, { id, tipo: 'factura' as const, moneda, montoAplicar: saldo }]
      })
    }
    const toggleCredito = (id: number, tipo: 'recibo' | 'nc', moneda: 'ARS' | 'USD', saldo: number) => {
      setConciliacionSeleccionCreditos(prev => {
        const existe = prev.find(c => c.id === id && c.tipo === tipo)
        return existe ? prev.filter(c => !(c.id === id && c.tipo === tipo))
          : [...prev, { id, tipo, moneda, montoAplicar: saldo }]
      })
    }
    const limpiarSeleccion = () => { setConciliacionSeleccionDebitos([]); setConciliacionSeleccionCreditos([]) }
    const marcarTodoARS = () => {
      setConciliacionSeleccionDebitos(prev => [
        ...prev.filter(d => d.moneda !== 'ARS'),
        ...pendientesARS.map(f => ({ id: f.id, tipo: 'factura' as const, moneda: 'ARS' as const, montoAplicar: f.saldo }))
      ])
      setConciliacionSeleccionCreditos(prev => [
        ...prev.filter(c => c.moneda !== 'ARS'),
        ...recibosARS.filter(r => r.importe_no_conciliado > 0).map(r => ({ id: r.id, tipo: 'recibo' as const, moneda: 'ARS' as const, montoAplicar: r.importe_no_conciliado })),
        ...ncARS.filter(n => (n.saldo_disponible ?? n.total) > 0).map(n => ({ id: n.id, tipo: 'nc' as const, moneda: 'ARS' as const, montoAplicar: n.saldo_disponible ?? n.total }))
      ])
    }
    const marcarTodoUSD = () => {
      setConciliacionSeleccionDebitos(prev => [
        ...prev.filter(d => d.moneda !== 'USD'),
        ...pendientesUSD.map(f => ({ id: f.id, tipo: 'factura' as const, moneda: 'USD' as const, montoAplicar: f.saldo }))
      ])
      setConciliacionSeleccionCreditos(prev => [
        ...prev.filter(c => c.moneda !== 'USD'),
        ...recibosUSD.filter(r => r.importe_no_conciliado > 0).map(r => ({ id: r.id, tipo: 'recibo' as const, moneda: 'USD' as const, montoAplicar: r.importe_no_conciliado })),
        ...ncUSD.filter(n => (n.saldo_disponible ?? n.total) > 0).map(n => ({ id: n.id, tipo: 'nc' as const, moneda: 'USD' as const, montoAplicar: n.saldo_disponible ?? n.total }))
      ])
    }

    // ── Helper: panel de débitos/créditos por moneda ─────────────────────
    const PanelDebitos = ({ moneda, factsList }: { moneda: 'ARS' | 'USD'; factsList: typeof factsARS }) => {
      const filtro = conciliacionFiltroTextoDebitos.toLowerCase()
      const visibles = conciliacionFiltroConciliado === 'no'
        ? factsList.filter(f => f.saldo > 0)
        : conciliacionFiltroConciliado === 'si'
          ? factsList.filter(f => f.saldo <= 0)
          : conciliacionMostrarTodosDebitos ? factsList : factsList.filter(f => f.saldo > 0)
      const filtradas = filtro ? visibles.filter(f => f.numero?.toLowerCase().includes(filtro) || f.nota_venta_numero?.toLowerCase().includes(filtro)) : visibles

      return (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 bg-red-50 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">Débitos {moneda}</span>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Filtrar..." value={conciliacionFiltroTextoDebitos}
                onChange={e => setConciliacionFiltroTextoDebitos(e.target.value)}
                className="px-2 py-0.5 text-xs border rounded w-24" />
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={conciliacionMostrarTodosDebitos}
                  onChange={e => setConciliacionMostrarTodosDebitos(e.target.checked)}
                  className="w-3 h-3 rounded" /> Todos
              </label>
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{filtradas.length}</span>
            </div>
          </div>
          <div className="overflow-auto max-h-52">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-gray-500 uppercase">
                  <th className="py-1.5 px-2 text-left font-semibold">NV</th>
                  <th className="py-1.5 px-2 text-left font-semibold">Comprobante</th>
                  <th className="py-1.5 px-2 text-left font-semibold">Cond.</th>
                  <th className="py-1.5 px-2 text-left font-semibold">Venc.</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Importe</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Saldo</th>
                  <th className="py-1.5 px-2 text-center font-semibold">✓</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length > 0 ? filtradas.map(f => {
                  const sel = conciliacionSeleccionDebitos.find(d => d.id === f.id && d.tipo === 'factura')
                  const conciliada = f.saldo <= 0
                  return (
                    <tr key={f.id} onClick={() => !conciliada && toggleDebito(f.id, moneda, f.saldo)}
                      className={`border-b cursor-pointer ${sel ? 'bg-red-50' : 'hover:bg-gray-50'} ${conciliada ? 'opacity-40' : ''}`}>
                      <td className="py-1 px-2 text-orange-600 hover:underline">{f.nota_venta_numero}</td>
                      <td className="py-1 px-2 text-blue-600 hover:underline">{f.numero}</td>
                      <td className="py-1 px-2 text-gray-500">{f.condicion_pago || 'Contado'}</td>
                      <td className="py-1 px-2 text-gray-500">{f.fecha_vencimiento ? f.fecha_vencimiento.split('T')[0] : '-'}</td>
                      <td className="py-1 px-2 text-right">{moneda === 'USD' ? `USD ${f.total?.toLocaleString()}` : `$${f.total?.toLocaleString()}`}</td>
                      <td className="py-1 px-2 text-right font-semibold text-red-600">{moneda === 'USD' ? `USD ${f.saldo?.toLocaleString()}` : `$${f.saldo?.toLocaleString()}`}</td>
                      <td className="py-1 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {!conciliada && <input type="checkbox" checked={!!sel}
                          onChange={() => toggleDebito(f.id, moneda, f.saldo)}
                          className="w-3.5 h-3.5 rounded border-gray-300" />}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">
                    {!conciliacionClienteId ? 'Seleccioná un cliente' : 'Sin débitos ' + moneda}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    const PanelCreditos = ({ moneda, recibosList, ncList }: { moneda: 'ARS' | 'USD'; recibosList: typeof recibosARS; ncList: typeof ncARS }) => {
      const filtro = conciliacionFiltroTextoCreditos.toLowerCase()
      const recibosFilt = (conciliacionFiltroConciliado === 'si'
        ? recibosList.filter(r => r.importe_no_conciliado <= 0)
        : recibosList.filter(r => conciliacionMostrarTodosCreditos ? true : r.importe_no_conciliado > 0))
        .filter(r => !filtro || r.numero?.toLowerCase().includes(filtro))
      const ncFilt = (conciliacionFiltroConciliado === 'si'
        ? ncList.filter(n => (n.saldo_disponible ?? n.total) <= 0)
        : ncList.filter(n => conciliacionMostrarTodosCreditos ? true : (n.saldo_disponible ?? n.total) > 0))
        .filter(n => !filtro || n.numero?.toLowerCase().includes(filtro))
      const total = recibosFilt.length + ncFilt.length

      return (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 bg-blue-50 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Créditos {moneda}</span>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Filtrar..." value={conciliacionFiltroTextoCreditos}
                onChange={e => setConciliacionFiltroTextoCreditos(e.target.value)}
                className="px-2 py-0.5 text-xs border rounded w-24" />
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={conciliacionMostrarTodosCreditos}
                  onChange={e => setConciliacionMostrarTodosCreditos(e.target.checked)}
                  className="w-3 h-3 rounded" /> Todos
              </label>
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{total}</span>
            </div>
          </div>
          <div className="overflow-auto max-h-52">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-gray-500 uppercase">
                  <th className="py-1.5 px-2 text-center font-semibold">✓</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Saldo</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Importe</th>
                  <th className="py-1.5 px-2 text-left font-semibold">Fecha</th>
                  <th className="py-1.5 px-2 text-left font-semibold">Comprobante</th>
                  <th className="py-1.5 px-2 text-left font-semibold">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {recibosFilt.map(r => {
                  const saldo = r.importe_no_conciliado
                  const sel = conciliacionSeleccionCreditos.find(c => c.id === r.id && c.tipo === 'recibo')
                  const conciliado = saldo <= 0
                  return (
                    <tr key={`r-${r.id}`} onClick={() => !conciliado && toggleCredito(r.id, 'recibo', moneda, saldo)}
                      className={`border-b cursor-pointer ${sel ? 'bg-blue-50' : 'hover:bg-gray-50'} ${conciliado ? 'opacity-40' : ''}`}>
                      <td className="py-1 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {!conciliado && <input type="checkbox" checked={!!sel} onChange={() => toggleCredito(r.id, 'recibo', moneda, saldo)} className="w-3.5 h-3.5 rounded border-gray-300" />}
                      </td>
                      <td className="py-1 px-2 text-right font-semibold text-green-600">{moneda === 'USD' ? `USD ${saldo?.toLocaleString()}` : `$${saldo?.toLocaleString()}`}</td>
                      <td className="py-1 px-2 text-right">{moneda === 'USD' ? `USD ${r.importe?.toLocaleString()}` : `$${r.importe?.toLocaleString()}`}</td>
                      <td className="py-1 px-2 text-gray-500">{r.fecha?.split('T')[0]}</td>
                      <td className="py-1 px-2 text-blue-600">{r.numero}</td>
                      <td className="py-1 px-2 text-gray-500">Recibo</td>
                    </tr>
                  )
                })}
                {ncFilt.map(n => {
                  const saldo = n.saldo_disponible ?? n.total
                  const sel = conciliacionSeleccionCreditos.find(c => c.id === n.id && c.tipo === 'nc')
                  const conciliado = saldo <= 0
                  return (
                    <tr key={`nc-${n.id}`} onClick={() => !conciliado && toggleCredito(n.id, 'nc', moneda, saldo)}
                      className={`border-b cursor-pointer bg-emerald-50/30 ${sel ? 'bg-emerald-100' : 'hover:bg-emerald-50'} ${conciliado ? 'opacity-40' : ''}`}>
                      <td className="py-1 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {!conciliado && <input type="checkbox" checked={!!sel} onChange={() => toggleCredito(n.id, 'nc', moneda, saldo)} className="w-3.5 h-3.5 rounded border-gray-300 accent-emerald-600" />}
                      </td>
                      <td className="py-1 px-2 text-right font-semibold text-green-600">{moneda === 'USD' ? `USD ${saldo?.toLocaleString()}` : `$${saldo?.toLocaleString()}`}</td>
                      <td className="py-1 px-2 text-right">{moneda === 'USD' ? `USD ${n.total?.toLocaleString()}` : `$${n.total?.toLocaleString()}`}</td>
                      <td className="py-1 px-2 text-gray-500">{n.fecha?.split('T')[0]}</td>
                      <td className="py-1 px-2 text-emerald-700 font-medium">{n.numero}</td>
                      <td className="py-1 px-2"><span className="bg-emerald-100 text-emerald-600 rounded px-1 text-xs">NC</span></td>
                    </tr>
                  )
                })}
                {recibosFilt.length === 0 && ncFilt.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-400">
                    {!conciliacionClienteId ? 'Seleccioná un cliente' : 'Sin créditos ' + moneda}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    // ── Historial ────────────────────────────────────────────────────────
    const historialCliente = conciliacionClienteId
      ? conciliacionHistorial.filter(h => h.cliente_id === conciliacionClienteId)
      : []

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-amber-900">Conciliación de Deuda</h1>
          <div className="flex gap-2">
            <button onClick={() => setConciliacionTab("conciliar")}
              className={`px-4 py-2 text-sm font-medium rounded ${conciliacionTab === "conciliar" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              Conciliar
            </button>
            <button onClick={() => { setConciliacionTab("historial"); if (conciliacionClienteId) cargarHistorialConciliacionesCliente(conciliacionClienteId) }}
              className={`px-4 py-2 text-sm font-medium rounded ${conciliacionTab === "historial" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              Historial
            </button>
          </div>
        </div>

        {conciliacionTab === "conciliar" ? (
          <div className="space-y-4">
            {/* ── Encabezado: cliente + filtros ─────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border px-4 py-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 font-medium">Cliente</label>
                  <div className="flex items-center gap-1">
                    <select value={conciliacionClienteId || ""}
                      onChange={e => { setConciliacionClienteId(e.target.value ? parseInt(e.target.value) : null); limpiarSeleccion() }}
                      className="w-56 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
                    </select>
                    {clienteSeleccionado && (
                      <button onClick={() => { setClienteSeleccionadoId(clienteSeleccionado.id); setActiveSubmenu("ficha_cliente") }}
                        className="p-1 text-gray-400 hover:text-blue-600"><ArrowRight className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 font-medium">Conciliado</label>
                  <select value={conciliacionFiltroConciliado}
                    onChange={e => setConciliacionFiltroConciliado(e.target.value as typeof conciliacionFiltroConciliado)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                    <option value="no">No</option><option value="si">Sí</option><option value="todos">Todos</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={limpiarSeleccion} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                    <input type="checkbox" readOnly checked={!haySeleccion} className="w-3.5 h-3.5 rounded" />
                    Desmarcar
                  </button>
                  <button onClick={() => { marcarTodoARS(); marcarTodoUSD() }} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                    <input type="checkbox" readOnly checked={haySeleccion} className="w-3.5 h-3.5 rounded" />
                    Marcar todo
                  </button>
                </div>
              </div>

              {/* ── Panel resumen de saldos ──────────────────────────── */}
              {conciliacionClienteId && (
                <div className="mt-3 grid grid-cols-2 gap-4 border-t pt-3">
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">CC ARS</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-600">Débitos: <strong>${debitoARSTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</strong></span>
                      <span className="text-green-600">Créditos: <strong>${creditoARSTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</strong></span>
                      <span className={`font-bold ${saldoARS > 0 ? 'text-red-700' : saldoARS < 0 ? 'text-green-700' : 'text-gray-500'}`}>
                        Saldo pendiente: ${Math.abs(saldoARS).toLocaleString('es-AR', {minimumFractionDigits:2})}
                        {saldoARS < 0 ? ' (crédito)' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <div className="text-xs font-semibold text-gray-600 mb-1">CC USD</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-red-600">Débitos: <strong>USD {debitoUSDTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</strong></span>
                      <span className="text-green-600">Créditos: <strong>USD {creditoUSDTotal.toLocaleString('es-AR', {minimumFractionDigits:2})}</strong></span>
                      <span className={`font-bold ${saldoUSD > 0 ? 'text-red-700' : saldoUSD < 0 ? 'text-green-700' : 'text-gray-500'}`}>
                        Saldo: USD {Math.abs(saldoUSD).toLocaleString('es-AR', {minimumFractionDigits:2})}
                        {saldoUSD < 0 ? ' (crédito)' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── BLOQUE ARS ────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                <span className="font-semibold text-gray-800">Cuenta Corriente ARS</span>
                <div className="flex items-center gap-3">
                  <button onClick={marcarTodoARS} className="text-xs text-indigo-600 hover:underline">Marcar todo ARS</button>
                  <span className={`text-sm font-bold ${saldoARS > 0 ? 'text-red-600' : saldoARS < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    Saldo: ${Math.abs(saldoARS).toLocaleString('es-AR', {minimumFractionDigits:2})}
                  </span>
                </div>
              </div>
              <div className="flex divide-x">
                {PanelDebitos({ moneda: "ARS", factsList: factsARS })}
                {PanelCreditos({ moneda: "ARS", recibosList: recibosARS, ncList: ncARS })}
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t flex justify-end gap-6 text-xs">
                <span className="text-gray-500">Selec. Débitos ARS: <span className="text-red-600 font-semibold">${totalSelDebitosARS.toLocaleString('es-AR', {minimumFractionDigits:2})}</span></span>
                <span className="text-gray-500">Selec. Créditos ARS: <span className="text-green-600 font-semibold">${totalSelCreditosARS.toLocaleString('es-AR', {minimumFractionDigits:2})}</span></span>
              </div>
            </div>

            {/* ── BLOQUE USD ────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                <span className="font-semibold text-gray-800">Cuenta Corriente USD</span>
                <div className="flex items-center gap-3">
                  <button onClick={marcarTodoUSD} className="text-xs text-indigo-600 hover:underline">Marcar todo USD</button>
                  <span className={`text-sm font-bold ${saldoUSD > 0 ? 'text-red-600' : saldoUSD < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    Saldo: USD {Math.abs(saldoUSD).toLocaleString('es-AR', {minimumFractionDigits:2})}
                  </span>
                </div>
              </div>
              <div className="flex divide-x">
                {PanelDebitos({ moneda: "USD", factsList: factsUSD })}
                {PanelCreditos({ moneda: "USD", recibosList: recibosUSD, ncList: ncUSD })}
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t flex justify-end gap-6 text-xs">
                <span className="text-gray-500">Selec. Débitos USD: <span className="text-red-600 font-semibold">USD {totalSelDebitosUSD.toLocaleString('es-AR', {minimumFractionDigits:2})}</span></span>
                <span className="text-gray-500">Selec. Créditos USD: <span className="text-green-600 font-semibold">USD {totalSelCreditosUSD.toLocaleString('es-AR', {minimumFractionDigits:2})}</span></span>
              </div>
            </div>

            {/* ── Cotización (modo cruzado) ──────────────────────────────── */}
            {hayMixto && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-amber-800">Conciliación cruzada USD ↔ ARS</span>
                <span className="text-sm text-gray-600">Cotización 1 USD =</span>
                <input
                  type="number"
                  value={conciliacionCotizacion || ''}
                  onChange={e => setConciliacionCotizacion(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm w-32 text-right"
                  placeholder="ej: 1000"
                  min={0.01}
                  step={0.01}
                />
                <span className="text-sm text-gray-500">ARS (blue)</span>
                {conciliacionCotizacion > 0 && totalSelCreditosUSD > 0 && (
                  <span className="text-xs text-gray-600 bg-white border rounded px-2 py-0.5">
                    USD {totalSelCreditosUSD.toLocaleString('es-AR', {minimumFractionDigits:2})} = ARS {(totalSelCreditosUSD * conciliacionCotizacion).toLocaleString('es-AR', {minimumFractionDigits:2})}
                  </span>
                )}
              </div>
            )}

            {/* ── Botón ejecutar ─────────────────────────────────────────── */}
            <div className="flex justify-end items-center gap-3">
              {hayMixto && !conciliacionCotizacion && (
                <span className="text-xs text-amber-700">Ingresá la cotización para habilitar la conciliación cruzada</span>
              )}
              {(hayParARS || hayParUSD || hayMixto) && (
                <button
                  onClick={ejecutarConciliacion}
                  disabled={!(hayParARS || hayParUSD || (hayMixto && conciliacionCotizacion > 0)) || conciliacionEjecutando}
                  className={`px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                    (hayParARS || hayParUSD || (hayMixto && conciliacionCotizacion > 0)) && !conciliacionEjecutando
                      ? 'bg-indigo-900 text-white hover:bg-indigo-800 cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {conciliacionEjecutando ? 'Ejecutando...' : 'Ejecutar Conciliación'}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Tab Historial ────────────────────────────────────────────── */
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Historial de Conciliaciones</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Moneda</label>
                <select value={conciliacionMonedaHistorial}
                  onChange={e => setConciliacionMonedaHistorial(e.target.value as typeof conciliacionMonedaHistorial)}
                  className="border rounded px-2 py-1 text-xs">
                  <option value="todos">Ver todo</option><option value="ARS">Solo ARS</option><option value="USD">Solo USD</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <select value={conciliacionClienteId || ""}
                onChange={e => { const id = e.target.value ? parseInt(e.target.value) : null; setConciliacionClienteId(id); setConciliacionSeleccionDebitos([]); setConciliacionSeleccionCreditos([]); if (id) cargarHistorialConciliacionesCliente(id) }}
                className="w-full max-w-md border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
              </select>
            </div>
            {historialCliente.length > 0 ? (
              <div className="space-y-4">
                {historialCliente.map(h => (
                  <div key={h.id} className={`border rounded-lg p-4 ${h.estado === 'cancelada' ? 'opacity-60 bg-gray-50' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {h.esRecibo
                            ? <><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Recibo</span><p className="font-medium text-gray-900">{h.reciboNumero}</p></>
                            : <p className="font-medium text-gray-900">Conciliación #{h.id}</p>
                          }
                          {h.estado === 'cancelada'
                            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Cancelado</span>
                            : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Activo</span>
                          }
                        </div>
                        <p className="text-sm text-gray-500">{formatDateTime(h.fecha)}{h.usuario ? ` — ${h.usuario}` : ''}</p>
                        {h.estado === 'cancelada' && h.fecha_cancelacion && (
                          <p className="text-xs text-red-500">Revertida el {formatDateTime(h.fecha_cancelacion)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-lg font-bold ${h.estado === 'cancelada' ? 'text-gray-400 line-through' : 'text-emerald-600'}`}>{formatCurrency(h.total_conciliado)}</p>
                        {h.estado === 'activa' && !h.esRecibo && (
                          <button
                            onClick={() => revertirConciliacion(h.id)}
                            disabled={conciliacionRevertiendoId === h.id}
                            className="px-3 py-1 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {conciliacionRevertiendoId === h.id ? 'Revirtiendo...' : 'Revertir'}
                          </button>
                        )}
                        {h.estado === 'activa' && h.esRecibo && (
                          <button
                            onClick={() => revertirImputacionesRecibo(Math.abs(h.id))}
                            disabled={conciliacionRevertiendoId === -Math.abs(h.id)}
                            className="px-3 py-1 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            {conciliacionRevertiendoId === -Math.abs(h.id) ? 'Revirtiendo...' : 'Revertir'}
                          </button>
                        )}
                      </div>
                    </div>
                    <table className="w-full text-sm border-t">
                      <thead>
                        <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                          <th className="py-2 px-3 text-left font-semibold">Débito</th>
                          <th className="py-2 px-3 text-left font-semibold">Crédito</th>
                          <th className="py-2 px-3 text-left font-semibold">Monedas</th>
                          <th className="py-2 px-3 text-right font-semibold">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {h.aplicaciones.map((a, idx) => {
                          const dm = (a as any).debito_moneda ?? 'ARS'
                          const cm = (a as any).credito_moneda ?? 'ARS'
                          const cot = (a as any).cotizacion
                          const esMixto = dm !== cm
                          const parLabel = `${dm}→${cm}`
                          const montoFmt = cm === 'USD'
                            ? `USD ${a.monto.toLocaleString('es-AR', {minimumFractionDigits:2})}`
                            : `$${a.monto.toLocaleString('es-AR', {minimumFractionDigits:2})}`
                          return (
                            <tr key={idx} className="border-b">
                              <td className="py-2 px-3 text-red-700">{a.debito_tipo} {a.debito_numero}</td>
                              <td className="py-2 px-3 text-green-700">{a.credito_tipo} {a.credito_numero}</td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${esMixto ? 'bg-orange-100 text-orange-700' : cm === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {parLabel}
                                  </span>
                                  {esMixto && cot && (
                                    <span className="text-gray-400 text-xs">cotización: {Number(cot).toLocaleString('es-AR')}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-medium">{montoFmt}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {conciliacionClienteId ? "Sin conciliaciones registradas para este cliente" : "Seleccioná un cliente para ver el historial"}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Popup detalle Nota de Credito (global, usado desde toma_equipo y conciliacion)
  const renderNcDetallePopup = () => ncDetallePopup && (
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
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ncDetallePopup.estado === 'activo' ? 'bg-green-100 text-green-700' : ncDetallePopup.estado === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {ncDetallePopup.estado === 'activo' ? 'Activa' : ncDetallePopup.estado === 'cancelado' ? 'Cancelada' : 'Borrador'}
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
  )

  // Popup detalle Recepción de Toma (global, usado desde toma_equipo)
  const renderRecDetallePopup = () => recDetallePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRecDetallePopup(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-blue-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded px-2 py-0.5">RECEPCIÓN</span>
                  <span className="font-mono font-bold text-blue-800 text-lg">{recDetallePopup.numero}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{new Date(recDetallePopup.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  recDetallePopup.estado === 'recibida' ? 'bg-green-100 text-green-700' :
                  recDetallePopup.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {recDetallePopup.estado === 'recibida' ? 'Recibida' :
                   recDetallePopup.estado === 'cancelada' ? 'Cancelada' : 'Esperando recepción'}
                </span>
                <button onClick={() => setRecDetallePopup(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Info */}
            <div className="px-6 py-4 border-b grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Cliente</span>
                <p className="font-semibold text-gray-900 mt-0.5">{recDetallePopup.proveedor_nombre?.replace(' (toma de equipo)', '') ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Sucursal</span>
                <p className="font-semibold text-gray-900 mt-0.5">{recDetallePopup.sucursal || '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Depósito destino</span>
                <p className="font-semibold text-gray-900 mt-0.5">{recDetallePopup.deposito_destino || '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase font-medium">Ubicación</span>
                <p className="font-semibold text-gray-900 mt-0.5">{recDetallePopup.ubicacion || recDetallePopup.ubicacion_destino || '—'}</p>
              </div>
            </div>
            {/* Líneas */}
            {recDetallePopup.lineas?.length > 0 && (
              <div className="px-6 py-4 border-b">
                <p className="text-xs uppercase font-semibold text-gray-400 mb-3">Equipo</p>
                {recDetallePopup.lineas.map((l: any, i: number) => (
                  <div key={i} className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Producto</span>
                      <span className="font-semibold text-gray-900">{l.producto_nombre}</span>
                    </div>
                    {l.unidades_serie?.[0] && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">IMEI / Serie</span>
                          <span className="font-mono font-medium text-gray-800">{l.unidades_serie[0].nro_serie}</span>
                        </div>
                        {l.unidades_serie[0].color && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color</span>
                            <span className="font-medium">{l.unidades_serie[0].color}</span>
                          </div>
                        )}
                        {l.unidades_serie[0].bateria_pct !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">% Batería</span>
                            <span className="font-medium">{l.unidades_serie[0].bateria_pct}%</span>
                          </div>
                        )}
                        {l.unidades_serie[0].outlet && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Outlet</span>
                            <span className="text-amber-600 font-medium">Sí (daño estético)</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Valor acordado</span>
                      <span className="font-bold text-blue-700">{formatCurrency(l.precio_unitario)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recDetallePopup.observaciones && (
              <div className="px-6 py-3 border-b">
                <span className="text-gray-400 text-xs uppercase font-medium">Observaciones</span>
                <p className="text-sm text-gray-700 mt-0.5">{recDetallePopup.observaciones}</p>
              </div>
            )}
            <div className="px-6 py-3 text-right">
              <p className="text-xs text-gray-400 uppercase font-medium">Origen</p>
              <p className="text-sm font-semibold text-gray-700">{recDetallePopup.documento_origen_ref ?? '—'}</p>
            </div>
          </div>
        </div>
  )

  // Ajustes de Cliente
  const renderAjustes = () => (
    <VentasListSection
      title="Ajustes de Cliente"
      moduleName="ajustes"
      data={ajustes}
      searchFields={["numero", "cliente_nombre", "concepto"]}
      filterFields={[{field: "estado", label: "Estado"}, {field: "moneda", label: "Moneda"}]}
      actions={
        <button 
          onClick={() => { setEditingItem(null); setCreandoAjuste(true); setAjusteLineas([]); setAjusteClienteId(null) }}
          className="bg-indigo-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Ajuste
        </button>
      }
    >
      {(filtered) => (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
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
            {filtered.map(ajuste => (
              <tr key={ajuste.id} onClick={() => setSelectedAjuste(ajuste)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{ajuste.numero}</td>
                <td className="py-3 px-4 text-sm">{ajuste.cliente_nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{formatDate(ajuste.fecha)}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{ajuste.concepto}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    ajuste.estado === "publicado" || ajuste.estado === "activo" ? "bg-green-100 text-green-700" :
                    ajuste.estado === "cancelado" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {ajuste.estado === "publicado" ? "Publicado" :
                     ajuste.estado === "activo" ? "Activo" :
                     ajuste.estado === "cancelado" ? "Cancelado" :
                     "Borrador"}
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron ajustes
          </div>
        )}
      </div>
      )}
    </VentasListSection>
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
              <h1 className="text-2xl font-bold text-amber-900">{ajuste.numero}</h1>
              <p className="text-sm text-gray-500">{formatDate(ajuste.fecha)}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            ajuste.estado === "publicado" || ajuste.estado === "activo" ? "bg-green-100 text-green-700" :
            ajuste.estado === "cancelado" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {ajuste.estado === "publicado" ? "Publicada" :
             ajuste.estado === "activo" ? "Activa" :
             ajuste.estado === "cancelado" ? "Cancelada" :
             "Borrador"}
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
            <h1 className="text-2xl font-bold text-amber-900">{titulo}</h1>
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
                <tr className="border-b bg-gray-50">
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
                        nota.estado === "publicado" || nota.estado === "activo" ? "bg-green-100 text-green-700" :
                        nota.estado === "cancelado" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {nota.estado === "publicado" ? "Publicada" :
                         nota.estado === "activo" ? "Activa" :
                         nota.estado === "cancelado" ? "Cancelada" :
                         "Borrador"}
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

  const guardarListaPrecios = async () => {
    if (!editingListaPrecios || !editingListaPrecios.nombre.trim()) return
    
    const fechaActual = new Date().toISOString()
    
    if (creandoListaPrecios) {
      const nuevaLista: ListaPrecios = {
        ...editingListaPrecios,
        id: 0, // placeholder, se sobreescribe con la respuesta
        estado: editingListaPrecios.estado === "borrador" ? "creada" : editingListaPrecios.estado,
      }
      try {
        const res = await fetch("/api/listas-precios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nuevaLista.nombre,
            tipo: nuevaLista.tipo,
            moneda_base: nuevaLista.moneda_base,
            incluye_iva: nuevaLista.incluye_iva,
            activa: nuevaLista.activa,
            no_visible: nuevaLista.no_visible,
            dias_validez: nuevaLista.dias_validez,
            estado: nuevaLista.estado,
            usuarios_admin: nuevaLista.usuarios_admin,
            usuarios_habilitados: nuevaLista.usuarios_habilitados,
            observaciones_filtro: nuevaLista.observaciones_filtro,
          }),
        })
        const saved = await res.json()
        if (!res.ok || saved.error) {
          console.error("[listas-precios] error al crear:", saved.error)
          alert("Error al guardar la lista: " + (saved.error ?? "Error desconocido"))
          return
        }
        const listaConId = { ...nuevaLista, ...saved }
        setListasPrecios(prev => [listaConId, ...prev])
        setSelectedListaPrecios(listaConId)
      } catch (e) {
        console.error("[listas-precios] crear error:", e)
      }
      setEditingListaPrecios(null)
      setCreandoListaPrecios(false)
      setModoEdicionListaPrecios(false)
    } else {
      try {
        const res = await fetch("/api/listas-precios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingListaPrecios.id,
            nombre: editingListaPrecios.nombre,
            tipo: editingListaPrecios.tipo,
            moneda_base: editingListaPrecios.moneda_base,
            incluye_iva: editingListaPrecios.incluye_iva,
            activa: editingListaPrecios.activa,
            no_visible: editingListaPrecios.no_visible,
            dias_validez: editingListaPrecios.dias_validez,
            estado: editingListaPrecios.estado,
            usuarios_admin: editingListaPrecios.usuarios_admin,
            usuarios_habilitados: editingListaPrecios.usuarios_habilitados,
            observaciones_filtro: editingListaPrecios.observaciones_filtro,
          }),
        })
        const saved = await res.json()
        if (!res.ok || saved.error) {
          console.error("[listas-precios] error al actualizar:", saved.error)
          alert("Error al guardar la lista: " + (saved.error ?? "Error desconocido"))
          return
        }
        const listaActualizada = { ...editingListaPrecios, ...saved }
        setListasPrecios(prev => prev.map(l => l.id === editingListaPrecios.id ? listaActualizada : l))
        setSelectedListaPrecios(listaActualizada)
      } catch (e) {
        console.error("[listas-precios] actualizar error:", e)
      }
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
    setNuevaLineaVersion({ costo_moneda: lista.moneda_base as "ARS" | "USD" })
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
    console.log("[guardarVersion] editingVersion:", editingVersion)
    console.log("[guardarVersion] creandoVersion:", creandoVersion)
    // Validar que no haya una línea pendiente sin agregar
    if (nuevaLineaVersion.producto_id) {
      setErrorLineaPendiente(true)
      return
    }
    setErrorLineaPendiente(false)
    if (!editingVersion || !editingVersion.nombre.trim()) {
      console.log("[guardarVersion] ABORTANDO: editingVersion nulo o nombre vacío")
      return
    }
    
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
      console.log("[guardarVersion POST] status:", res.status, "lineas enviadas:", payload.lineas?.length ?? 0)
      if (res.ok) {
        const nuevaVersion: VersionListaPrecios = await res.json()
        console.log("[guardarVersion POST] respuesta lineas:", nuevaVersion.lineas?.length ?? 0)
        setVersionesLista(prev => [nuevaVersion, ...prev])
        setSelectedVersion(nuevaVersion)
      } else {
        const errBody = await res.text()
        console.error("[guardarVersion POST] ERROR:", res.status, errBody)
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
      console.log("[guardarVersion PUT] id:", editingVersion.id, "status:", res.status, "lineas enviadas:", versionActualizada.lineas?.length ?? 0)
      if (res.ok) {
        const saved: VersionListaPrecios = await res.json()
        console.log("[guardarVersion PUT] respuesta lineas:", saved.lineas?.length ?? 0)
        setVersionesLista(prev => prev.map(v => v.id === saved.id ? saved : v))
        setSelectedVersion(saved)
      } else {
        const errBody = await res.text()
        console.error("[guardarVersion PUT] ERROR:", res.status, errBody)
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
    setErrorLineaPendiente(false)
  }

  const iniciarEdicionVersion = () => {
    console.log("[iniciarEdicionVersion] productosMaestro.length:", productosMaestro.length, "selectedVersion.lineas:", selectedVersion?.lineas?.length ?? "null")
    if (selectedVersion) {
      setEditingVersion({ ...selectedVersion })
      setModoEdicionVersion(true)
      setEditandoLineas(true)
      const monedaLista = (listasPrecios.find(l => l.id === selectedVersion.lista_precios_id)?.moneda_base ?? "ARS") as "ARS" | "USD"
      setNuevaLineaVersion({ costo_moneda: monedaLista })
    }
  }

  // Funciones para líneas de versión
  const agregarLineaVersion = () => {
    console.log("[agregarLineaVersion] editingVersion:", editingVersion?.id ?? "NULL", "nuevaLineaVersion.producto_id:", nuevaLineaVersion.producto_id)
    const versionActual = editingVersion || selectedVersion
    if (!versionActual || !nuevaLineaVersion.producto_id) {
      console.log("[agregarLineaVersion] ABORTANDO: versionActual=", !!versionActual, "producto_id=", nuevaLineaVersion.producto_id)
      return
    }
    
    const costoImporte = nuevaLineaVersion.costo_importe || 0
    const markupPorcentaje = nuevaLineaVersion.markup_porcentaje || 0
    const markupNominal = nuevaLineaVersion.markup_nominal || 0
    const forzarPrecio = nuevaLineaVersion.forzar_precio_pesos || false
    const precioForzado = nuevaLineaVersion.precio_forzado_ars || null
    
    // Calcular precio de venta
    // Si forzar ARS: se guarda el precio fijo en ARS (la conversión a USD ocurre en la NV al momento de venta)
    // Si normal: costo + markup en la moneda del costo
    let precioVenta: number
    let precioVentaMoneda: "ARS" | "USD"
    if (forzarPrecio && precioForzado) {
      precioVenta = precioForzado
      precioVentaMoneda = "ARS"
    } else {
      const costoConMarkup = costoImporte * (1 + markupPorcentaje / 100) + markupNominal
      precioVenta = costoConMarkup
      precioVentaMoneda = nuevaLineaVersion.costo_moneda || "ARS"
    }
    
    const nuevaLinea: LineaListaPrecios = {
      id: Math.max(...versionActual.lineas.map(l => l.id), 0) + 1,
      producto_id: nuevaLineaVersion.producto_id,
      producto_codigo: nuevaLineaVersion.producto_codigo || "",
      producto_nombre: nuevaLineaVersion.producto_nombre || "",
      costo_moneda: nuevaLineaVersion.costo_moneda || "ARS",
      costo_importe: costoImporte,
      cotizacion_dolar: 0,
      markup_porcentaje: markupPorcentaje,
      markup_nominal: markupNominal,
      forzar_precio_pesos: forzarPrecio,
      precio_forzado_ars: precioForzado,
      precio_venta: Math.round(precioVenta * 100) / 100,
      precio_venta_moneda: precioVentaMoneda,
      iva: nuevaLineaVersion.iva ?? 21
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

    // Preservar moneda de la lista al resetear la fila de nueva línea
    const monedaLista = (listasPrecios.find(l => l.id === versionActual.lista_precios_id)?.moneda_base ?? "ARS") as "ARS" | "USD"
    setNuevaLineaVersion({ costo_moneda: monedaLista })
    setErrorLineaPendiente(false)
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
        if (['costo_importe', 'markup_porcentaje', 'markup_nominal', 'forzar_precio_pesos', 'precio_forzado_ars'].includes(campo)) {
          if (lineaActualizada.forzar_precio_pesos && lineaActualizada.precio_forzado_ars) {
            // Precio fijo en ARS: la conversión a USD se hace al momento de la venta
            lineaActualizada.precio_venta = lineaActualizada.precio_forzado_ars
            lineaActualizada.precio_venta_moneda = "ARS"
          } else {
            const costoConMarkup = lineaActualizada.costo_importe * (1 + lineaActualizada.markup_porcentaje / 100) + lineaActualizada.markup_nominal
            lineaActualizada.precio_venta = Math.round(costoConMarkup * 100) / 100
            lineaActualizada.precio_venta_moneda = lineaActualizada.costo_moneda
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
    return (
      <VentasListSection
        title="Categorías de Cliente"
        moduleName="categorias_cliente"
        data={categoriasCliente}
        searchFields={["nombre", "descripcion"]}
        filterFields={[{field: "activa", label: "Activa"}]}
        actions={
          <button
            onClick={() => {
              const nueva: CategoriaCliente = { id: 0, nombre: "", lista_precios_defecto_id: null, descripcion: "", activa: true, seguimiento: [] }
              setSelectedCategoria(nueva)
              setEditingCategoria(nueva)
              setCreandoCategoria(true)
              setModoEdicionCategoria(true)
            }}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Crear
          </button>
        }
      >
        {(filtered) => (
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
                  <tr key={cat.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
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
        )}
      </VentasListSection>
    )
  }

  const renderDetalleCategoriaCliente = () => {
    if (!selectedCategoria) return null
    const current = modoEdicionCategoria && editingCategoria ? editingCategoria : selectedCategoria
    const isEditing = modoEdicionCategoria

    const guardar = async () => {
      if (!editingCategoria || !editingCategoria.nombre.trim()) return
      const fecha = new Date().toISOString()
      try {
        if (creandoCategoria) {
          // Crear en DB
          const res = await fetch("/api/categorias-cliente", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: editingCategoria.nombre,
              descripcion: editingCategoria.descripcion,
              disponible_clientes: true,
              disponible_proveedores: false,
              cuenta_cobrar_id: editingCategoria.cuenta_cobrar_id || null,
            }),
          })
          const data = await res.json()
          const nueva: CategoriaCliente = {
            ...editingCategoria,
            id: data.id ?? Math.max(...categoriasCliente.map(c => c.id), 0) + 1,
            seguimiento: [{ id: 1, fecha, usuario: "Max Solina", tipo: "creacion", descripcion: "Categoría creada" }]
          }
          setCategoriasCliente(prev => [nueva, ...prev])
          setSelectedCategoria(nueva)
        } else {
          // Actualizar en DB
          await fetch(`/api/categorias-cliente/${editingCategoria.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: editingCategoria.nombre,
              descripcion: editingCategoria.descripcion,
              cuenta_cobrar_id: editingCategoria.cuenta_cobrar_id || null,
            }),
          })
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
      } catch (err) {
        console.error("Error al guardar categoría:", err)
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
              <button onClick={guardar} disabled={!current.nombre.trim()} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
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

          {/* Cuenta contable a cobrar por defecto */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
            <h4 className="text-sm font-semibold text-amber-900 mb-3">Configuración Contable</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta a cobrar por defecto
                </label>
                {isEditing ? (
                  <CuentaContableSelector
                    value={current.cuenta_cobrar_id ?? ""}
                    onChange={(id, codigo, nombre) => setEditingCategoria({ ...current, cuenta_cobrar_id: id || null, cuenta_cobrar_codigo: codigo, cuenta_cobrar_nombre: nombre })}
                  />
                ) : (
                  <p className="text-gray-900 py-2 font-mono text-sm">
                    {current.cuenta_cobrar_codigo
                      ? `${current.cuenta_cobrar_codigo}${current.cuenta_cobrar_nombre ? ` – ${current.cuenta_cobrar_nombre}` : ""}`
                      : current.cuenta_cobrar_id
                      ? <span className="text-gray-500 text-xs">{current.cuenta_cobrar_id}</span>
                      : <span className="text-gray-400">Sin asignar (usa mapeo global)</span>}
                  </p>
                )}
              </div>
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
    // Solo ocultar las que tienen activa=false explícito; null/undefined = activas (legacy)
    const dataListasFiltrada = mostrarInactivasListas ? listasPrecios : listasPrecios.filter(l => l.activa !== false)
    return (
      <VentasListSection
        title="Listas de Precios"
        moduleName="listas_precios"
        data={dataListasFiltrada}
        searchFields={["nombre", "tipo"]}
        filterFields={[{field: "tipo", label: "Tipo"}, {field: "moneda", label: "Moneda"}, {field: "estado", label: "Estado"}]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarInactivasListas(v => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm border transition-colors ${
                mostrarInactivasListas ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Incluir listas archivadas"
            >
              {mostrarInactivasListas ? "Ocultar archivadas" : "Mostrar archivadas"}
            </button>
            <button
              onClick={crearNuevaListaPrecios}
              className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear
            </button>
          </div>
        }
      >
        {(filtered) => (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Nombre</th>
                <th className="text-center py-3 px-4 font-medium">Tipo</th>
                <th className="text-center py-3 px-4 font-medium">Moneda</th>
                <th className="text-center py-3 px-4 font-medium">Días Validez</th>
                <th className="text-center py-3 px-4 font-medium">Estado</th>
                <th className="text-center py-3 px-4 font-medium">Versiones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lista, idx) => {
                const versionesCount = versionesLista.filter(v => v.lista_precios_id === lista.id).length
                return (
                  <tr 
                    key={lista.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No se encontraron listas de precios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </VentasListSection>
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
              <button onClick={guardarListaPrecios} disabled={!currentLista.nombre.trim()} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
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

        {/* Banner Archivada (solo si activa=false explícito) */}
        {currentLista.activa === false && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Esta lista está <strong>archivada</strong> y no aparece en los formularios de venta. Reactivala marcando "Activa" en el formulario.</span>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          {/* Campos principales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              {isEditing ? (
                <input type="text" value={currentLista.nombre} onChange={(e) => setEditingListaPrecios({ ...currentLista, nombre: e.target.value })} placeholder="Nombre de la lista" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" />
              ) : (
                <p className="text-gray-900 py-2 font-medium text-lg">{currentLista.nombre}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Base</label>
              {isEditing ? (
                <select value={currentLista.moneda_base} onChange={(e) => setEditingListaPrecios({ ...currentLista, moneda_base: e.target.value as "ARS" | "USD" | "EUR" })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">
                  {monedas.map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo} - {m.nombre}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 py-2">{currentLista.moneda_base}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Días de Validez</label>
              {isEditing ? (
                <input type="number" value={currentLista.dias_validez} onChange={(e) => setEditingListaPrecios({ ...currentLista, dias_validez: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" min="1" />
              ) : (
                <p className="text-gray-900 py-2">{currentLista.dias_validez} días</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" title="Cotización a aplicar al convertir USD↔ARS en los comprobantes que usen esta lista">Tipo de Cotización</label>
              {isEditing ? (
                <select
                  value={currentLista.tipo_cotizacion ?? "blue"}
                  onChange={(e) => setEditingListaPrecios({ ...currentLista, tipo_cotizacion: e.target.value as ListaPrecios["tipo_cotizacion"] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="oficial">Oficial</option>
                  <option value="blue">Blue</option>
                  <option value="ccl">CCL</option>
                  <option value="mep">MEP</option>
                  <option value="divisa">Divisa</option>
                  <option value="billete">Billete</option>
                </select>
              ) : (
                <p className="text-gray-900 py-2 capitalize">{currentLista.tipo_cotizacion ?? "blue"}</p>
              )}
            </div>
            <div className="flex items-center gap-4 pt-6">
              {isEditing ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={currentLista.activa} onChange={(e) => setEditingListaPrecios({ ...currentLista, activa: e.target.checked })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">Activa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={currentLista.no_visible} onChange={(e) => setEditingListaPrecios({ ...currentLista, no_visible: e.target.checked })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700">No visible</span>
                  </label>
                </>
              ) : (
                <>
                  <span className={`text-sm ${currentLista.activa !== false ? 'text-green-600' : 'text-gray-400'}`}>
                    {currentLista.activa !== false ? "Activa" : "Archivada"}
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
                  <button onClick={() => crearNuevaVersion(selectedListaPrecios.id)} className="flex items-center gap-2 bg-indigo-900 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-800">
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
                      <th className="text-center py-2 px-3 font-medium">Líneas</th>
                      <th className="text-center py-2 px-3 font-medium">Última Actualización</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionesDeLista.map((version, idx) => (
                      <tr key={version.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        onClick={() => { setSelectedVersion(version); setActiveView("versiones_lista") }}>
                        <td className="py-2 px-3 font-medium text-gray-900">{version.nombre}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{new Date(version.fecha_inicial).toLocaleDateString("es-AR")}</td>
                        <td className="py-2 px-3 text-center text-gray-600">{version.fecha_final ? new Date(version.fecha_final).toLocaleDateString("es-AR") : "-"}</td>
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
                      <tr><td colSpan={6} className="py-8 text-center text-gray-500">No hay versiones para esta lista</td></tr>
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
                {vendedores.map(u => (
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
                {vendedores.map(u => (
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
                  className="px-4 py-2 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800">Crear Versi��n</button>
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
    // Solo ocultar las que tienen activa=false explícito; null/undefined = activas (legacy)
    const dataVersionesFiltrada = mostrarInactivasVersiones ? versionesLista : versionesLista.filter(v => v.activa !== false)
    return (
      <VentasListSection
        title="Versiones de Lista de Precios"
        moduleName="versiones_lista"
        data={dataVersionesFiltrada}
        searchFields={["nombre", "lista_precios_nombre"]}
        filterFields={[{field: "lista_precios_nombre", label: "Lista"}]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarInactivasVersiones(v => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm border transition-colors ${
                mostrarInactivasVersiones ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="Incluir versiones archivadas"
            >
              {mostrarInactivasVersiones ? "Ocultar archivadas" : "Mostrar archivadas"}
            </button>
            <button onClick={() => crearNuevaVersion()} disabled={listasPrecios.length === 0}
              className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium disabled:opacity-50">
              <Plus className="w-4 h-4" /> Crear
            </button>
          </div>
        }
      >
        {(filtered) => (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Lista</th>
                <th className="text-left py-3 px-4 font-medium">Versión</th>
                <th className="text-center py-3 px-4 font-medium">Fecha Inicial</th>
                <th className="text-center py-3 px-4 font-medium">Fecha Final</th>
                <th className="text-center py-3 px-4 font-medium">Líneas</th>
                <th className="text-center py-3 px-4 font-medium">Última Actualización</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((version, idx) => (
                <tr key={version.id} className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  onClick={() => { setSelectedVersion(version); setEditingVersion(null); setModoEdicionVersion(false); setCreandoVersion(false) }}>
                  <td className="py-3 px-4 text-gray-600">{version.lista_precios_nombre}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{version.nombre}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{new Date(version.fecha_inicial).toLocaleDateString("es-AR")}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{version.fecha_final ? new Date(version.fecha_final).toLocaleDateString("es-AR") : "-"}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{version.lineas.length}</td>
                  <td className="py-3 px-4 text-center text-gray-500 text-xs">{new Date(version.ultima_actualizacion).toLocaleString("es-AR")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No se encontraron versiones</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </VentasListSection>
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
            <div className="flex items-center gap-3">
              <button onClick={guardarVersion} disabled={!currentVersion.nombre.trim()} className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> Guardar
              </button>
              <button onClick={descartarVersion} className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
                <X className="w-4 h-4" /> Descartar
              </button>
              {errorLineaPendiente && (
                <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                  ⚠ Hay una línea sin agregar — presioná <span className="font-bold text-red-700">+</span> para agregarla
                </span>
              )}
            </div>
          ) : (
            <BotonVolver onClick={() => { setSelectedVersion(null); setEditingVersion(null); setCreandoVersion(false); setModoEdicionVersion(false) }} />
          )}

          <div className="flex items-center gap-2">
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

        {/* Banner Archivada (solo si activa=false explícito) */}
        {currentVersion.activa === false && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Esta versión está <strong>archivada</strong> y no aparece en los formularios. Reactivala marcando "Activa" abajo.</span>
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white border border-gray-200 rounded p-6">
          {/* Cabecera de versión */}
          <div className="grid grid-cols-4 gap-4 mb-6 items-end">
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
          </div>

          {/* Info de la Lista Padre + Activa */}
          {listaPrecios && (
            <div className="bg-gray-50 rounded p-3 mb-4 text-sm flex items-center gap-3 flex-wrap">
              <span><span className="text-gray-600">Moneda: </span><span className="font-medium">{listaPrecios.moneda_base}</span></span>
              <span className="text-gray-300">|</span>
              {isEditing ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={currentVersion.activa} onChange={(e) => setEditingVersion({ ...currentVersion, activa: e.target.checked })} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                  <span className="text-sm text-gray-700">Activa</span>
                </label>
              ) : (
                <span className={`text-sm font-medium ${currentVersion.activa !== false ? 'text-green-600' : 'text-gray-400'}`}>
                  {currentVersion.activa !== false ? "Activa" : "Archivada"}
                </span>
              )}
            </div>
          )}

          {/* Grilla de Líneas */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">Líneas de Precios ({currentVersion.lineas.length})</h4>
              {!creandoVersion && !modoEdicionVersion && (
                <button onClick={iniciarEdicionVersion} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                  <Edit className="w-3 h-3" /> Editar líneas
                </button>
              )}
            </div>

            <div className="border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-xs table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[6%]" />
                  <col className="w-[14%]" />
                  <col className="w-[6%]" />
                  {(editandoLineas || creandoVersion) && <col className="w-[2%]" />}
                </colgroup>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-2 px-2 font-medium">Código</th>
                    <th className="text-left py-2 px-2 font-medium">Producto</th>
                    <th className="text-center py-2 px-2 font-medium">Mon. Costo</th>
                    <th className="text-right py-2 px-2 font-medium">Costo</th>
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
                          if (prod) {
                            const monedaDefault = (listaPrecios?.moneda_base ?? prod.moneda_costo ?? "ARS") as "ARS" | "USD"
                            setNuevaLineaVersion({ ...nuevaLineaVersion, producto_id: prod.id, producto_codigo: prod.sku, producto_nombre: prod.nombre, costo_importe: prod.costo_manual ?? prod.costo ?? 0, costo_moneda: monedaDefault })
                          }
                        }} className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-emerald-500">
                          <option value="">Seleccionar producto...</option>
                          {productosMaestro.map(prod => <option key={prod.id} value={prod.id}>{prod.sku} - {prod.nombre}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <select value={nuevaLineaVersion.costo_moneda || listaPrecios?.moneda_base || "ARS"} onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, costo_moneda: e.target.value as "ARS" | "USD" })}
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
                        <select value={nuevaLineaVersion.iva ?? 21} onChange={(e) => setNuevaLineaVersion({ ...nuevaLineaVersion, iva: Number(e.target.value) as 0 | 10.5 | 21 })}
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
                          <>
                            <div>{formatCurrency(linea.costo_importe, linea.costo_moneda)}</div>
                            {linea.costo_moneda === "USD" && listaPrecios?.moneda_base === "ARS" && (() => {
                              const tipo = listaPrecios?.tipo_cotizacion ?? "blue"
                              const cotiz = linea.cotizacion_dolar > 0 ? linea.cotizacion_dolar : (cotizacionesUsdPorTipo[tipo] ?? cotizacionUsdBlue)
                              return cotiz > 0 ? (
                                <div className="text-[10px] text-gray-400 leading-tight">≈ {formatCurrency(linea.costo_importe * cotiz, "ARS")} ({tipo})</div>
                              ) : null
                            })()}
                          </>
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
                            <>
                              <div className="text-emerald-700">{formatCurrency(linea.precio_venta, linea.precio_venta_moneda)}</div>
                              {linea.precio_venta_moneda === "USD" && listaPrecios?.moneda_base === "ARS" && (() => {
                                const tipo = listaPrecios?.tipo_cotizacion ?? "blue"
                                const cotiz = linea.cotizacion_dolar > 0 ? linea.cotizacion_dolar : (cotizacionesUsdPorTipo[tipo] ?? cotizacionUsdBlue)
                                return cotiz > 0 ? (
                                  <div className="text-[10px] text-gray-400 leading-tight font-normal">≈ {formatCurrency(linea.precio_venta * cotiz, "ARS")} ({tipo})</div>
                                ) : null
                              })()}
                            </>
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
      <VentasListSection
        title="Notas de Crédito — Categorías"
        subtitle={`${ncCategorias.length} categoría${ncCategorias.length !== 1 ? "s" : ""}`}
        moduleName="nc_categorias"
        data={ncCategorias}
        searchFields={["nombre"]}
        filterFields={[{field: "activa", label: "Activa"}]}
        actions={
          <button
            onClick={() => { setNcCategoriaCreando(true); setNcCategoriaNombre("") }}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        }
      >
        {(filtered) => (
          <>
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
              className="px-4 py-2 bg-indigo-900 text-white text-sm font-medium rounded hover:bg-indigo-800 disabled:opacity-50"
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
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="py-10 text-center text-gray-400 text-sm">No hay categorías creadas</td></tr>
              )}
              {filtered.map((cat, idx) => (
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
          </>
        )}
      </VentasListSection>
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
        if (creandoAjuste) return renderCrearAjuste()
        if (selectedAjuste) return renderFichaAjuste()
        return renderAjustes()
      case "notas_venta":
        return renderNotasVenta()
      // toma_equipo migró a /toma-equipo top-level. Sidebar tiene Link.
      case "senia_equipo":
        return renderSeniaEquipo()
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
      // listas_precios y versiones_lista migraron a /listas-precios top-level. Sidebar tiene Links.
      case "categorias_cliente":
        return renderCategoriasCliente()
      case "criterios_cotizador":
        return <CriteriosCotizador />
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
          <h2 className="text-lg font-semibold text-amber-900">
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
                className="w-full border border-violet-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
              <select name="tipo_documento" defaultValue={editingItem?.tipo_documento || "DNI"} required
                className="w-full border border-violet-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Documento *</label>
              <input type="text" name="numero_documento" defaultValue={editingItem?.numero_documento || ""} required
                className="w-full border border-violet-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posición Fiscal *</label>
              <select name="posicion_fiscal" defaultValue={editingItem?.posicion_fiscal || "consumidor_final"} required
                className="w-full border border-violet-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                name="categoria_id"
                defaultValue={editingItem?.categoria_id ?? ""}
                required
                className="w-full border border-violet-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Seleccione una categoría</option>
                {categoriasCliente.filter(c => c.activa).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Precios *</label>
              <select name="lista_precios_id" defaultValue={editingItem?.lista_precios_id || 1} required
                className="w-full border border-violet-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {listasPrecios.map(lp => (
                  <option key={lp.id} value={lp.id}>{lp.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Término de Pago</label>
              <select name="termino_pago_id" defaultValue={editingItem?.termino_pago_id || 1}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {terminosPago.map(tp => (
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
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800">
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
  const [tipoVentaForm, setTipoVentaForm] = useState<"inmediata" | "pedido">("inmediata")
  
  const renderNotaVentaModal = () => {
    const selectedCliente = clientes.find(c => c.id === nvClienteId)
    // Todos los precios incluyen IVA. Se desagrega para impuestos, total = subtotal.
    const subtotal = nvLineas.reduce((sum, l) => sum + Number(l.subtotal ?? 0), 0)
    const impuestos = nvLineas.reduce((sum, l) => {
      const tasa = (l.iva ?? 0) / 100
      const neto = Number(l.subtotal ?? 0) / (1 + tasa)
      return sum + (Number(l.subtotal ?? 0) - neto)
    }, 0)
    const total = subtotal

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-amber-900">
              {editingItem ? `Editar Nota de Venta ${editingItem.numero}` : "Nueva Nota de Venta"}
            </h2>
            <button onClick={() => { setShowModal(false); setNvLineas([]); setNvClienteId(null) }} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const cliente = clientes.find(c => c.id === nvClienteId)
            if (!cliente || nvLineas.length === 0) {
              alert("Debe seleccionar un cliente y agregar al menos un producto")
              return
            }
            const tipoVenta = tipoVentaForm
            const moneda = formData.get("moneda") as "ARS" | "USD"
            const depositoFromForm = formData.get("deposito") as string
            const depositoFromState = depositos.find(d => d.id === nvDepositoId)?.nombre
            const deposito = depositoFromForm || depositoFromState || "Sin depósito"
            const vendedorId = parseInt(formData.get("vendedor_id") as string) || 1
            const vendedorNombre = vendedores.find(v => v.id === vendedorId)?.nombre || "Max Solina"
            const terminoPagoId = parseInt(formData.get("termino_pago_id") as string) || 1
            const terminoPagoNombre = terminosPago.find(tp => tp.id === terminoPagoId)?.nombre || "Contado Efectivo"
            const fechaHoy = new Date().toISOString()
            // El número y el id real los devuelve el servidor — placeholders temporales
            const nvNumeroTemp = editingItem?.numero || ""
            const nvIdTemp = editingItem?.id || 0

            const newNV: NotaVenta = {
              id: nvIdTemp,
              numero: nvNumeroTemp,
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              cliente_codigo: cliente.codigo,
              vendedor_id: vendedorId,
              vendedor_nombre: vendedorNombre,
              fecha: fechaHoy,
                  estado: tipoVenta === "inmediata" ? "facturada" : "abierta",
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
              impuestos: impuestos,
              total: total,
              sucursal: "Puerto Norte",
              punto_venta: "10000"
            }

            // ── Persistir NV en Supabase ──────────────────────────────
            let nvNumero = nvNumeroTemp
            let nvId = nvIdTemp
            let nvPersistida = false
            try {
              const nvRes = await fetch("/api/notas-venta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  numero: editingItem?.numero || null,
                  cliente_id: cliente.id,
                  vendedor_id: vendedorId,
                  moneda,
                  estado: tipoVenta === "inmediata" ? "facturada" : "abierta",
                  sucursal_id: nvDepositoId || null,
                  subtotal: isNaN(subtotal) ? 0 : subtotal,
                  impuestos: isNaN(impuestos) ? 0 : impuestos,
                  total: isNaN(total) ? 0 : total,
                  lineas: nvLineas.map(l => ({
                    producto_id: l.producto_id,
                    producto_nombre: l.producto_nombre,
                    descripcion: l.descripcion ?? null,
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario ?? 0,
                    descuento: l.descuento ?? 0,
                    subtotal: l.subtotal ?? l.cantidad * (l.precio_unitario ?? 0),
                    iva: l.iva ?? 0,
                  })),
                }),
              })
              console.log("[v0] nvRes.status:", nvRes.status, "nvRes.ok:", nvRes.ok)
              if (nvRes.ok) {
                const nvData = await nvRes.json()
                console.log("[v0] nvData:", JSON.stringify(nvData))
                nvNumero = nvData.numero || nvNumeroTemp
                nvId = nvData.id || nvIdTemp
                newNV.numero = nvNumero
                newNV.id = nvId
                nvPersistida = true
              }
            } catch (err) {
              console.log("[v0] fetch NV error:", err)
            }

            console.log("[v0] POST-TRY tipoVenta:", tipoVenta, "editingItem:", !!editingItem, "nvPersistida:", nvPersistida)

            if (editingItem) {
              setNotasVenta(prev => prev.map(nv => nv.id === editingItem.id ? newNV : nv))
            } else {
              setNotasVenta(prev => [newNV, ...prev])
            }

            // Si es venta inmediata y la NV se persistió OK, generar OE y Remito
            if (tipoVenta === "inmediata" && !editingItem && nvPersistida) {
              // OE y remito — el servidor genera los números
              const oeId = ordenesEntrega.length + 1
              
              // 1. Crear Orden de Entrega (confirmada) — número generado por el servidor
              let oeNumero = ""
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
              // Persistir OE y obtener número del servidor
              try {
                const oeRes = await fetch("/api/ordenes-entrega", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...newOE, numero: null }),
                })
                if (oeRes.ok) {
                  const oeData = await oeRes.json()
                  oeNumero = oeData.numero || oeNumero
                  newOE.numero = oeNumero
                  newOE.id = oeData.id || oeId
                }
              } catch (_) {}
              setOrdenesEntrega(prev => [...prev, newOE])

              let remitoNumero = ""
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
                nota_venta_id: nvId,
                nota_venta_numero: nvNumero,
                sucursal: "Puerto Norte",
                deposito: deposito,
                deposito_id: nvDepositoId,
                ubicacion_id: nvUbicacionId,
                ubicacion: ubicaciones.find(u => u.id === nvUbicacionId)?.codigo ?? null,
                peso_kg: 0,
                peso_neto_kg: 0,
                bultos: 1,
                valor_declarado: isNaN(total) || total == null ? 0 : total,
                control_factura: "facturado",
                lineas: nvLineas.map(l => ({
                  producto_id: l.producto_id,
                  producto_nombre: l.producto_nombre,
                  cantidad: l.cantidad,
                  requiere_serie: l.requiere_serie ?? false,
                  series_seleccionadas: (l.series_seleccionadas ?? []).map((s: any) => ({
                    id: s.id,
                    serie: s.serie,
                    detalles: s.detalles ?? "",
                  })),
                })),
              }
              // Persistir remito y obtener número del servidor
              try {
                const remRes = await fetch("/api/remitos-venta", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...newRemito,
                    numero: null,
                    orden_entrega_numero: oeNumero,
                    nota_venta_id: nvId,
                    nota_venta_numero: nvNumero,
                    lineas: nvLineas.map(l => ({
                      producto_id: l.producto_id,
                      producto_nombre: l.producto_nombre,
                      cantidad: l.cantidad,
                      requiere_serie: l.requiere_serie ?? false,
                      series_seleccionadas: l.series_seleccionadas ?? [],
                    })),
                  }),
                })
                if (remRes.ok) {
                  const remData = await remRes.json()
                  remitoNumero = remData.numero || remitoNumero
                  newRemito.numero = remitoNumero
                  newRemito.id = remData.id || remitoId
                }
              } catch (_) {}
              setRemitos(prev => [newRemito, ...prev])

              // Actualizar OE con número de remito
              setOrdenesEntrega(prev => prev.map(oe =>
                oe.id === newOE.id ? { ...oe, remito_numero: remitoNumero } : oe
              ))

              const facturaNumero = `FAC-${String(facturas.length + 1).padStart(5, "0")}`
              const facturaId = facturas.length + 1
              
              // 3. Crear Factura en borrador
              const newFactura: Factura = {
                id: facturaId,
                numero: facturaNumero,
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
                impuestos: impuestos,
                total: total,
                saldo: total,
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
              setFacturas(prev => [newFactura, ...prev])

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
                <select
                  name="tipo_venta"
                  value={tipoVentaForm}
                  onChange={e => setTipoVentaForm(e.target.value as "inmediata" | "pedido")}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="inmediata">Inmediata</option>
                  <option value="pedido">Pedido</option>
                </select>
                {/* input hidden para que formData.get() siempre lo encuentre */}
                <input type="hidden" name="tipo_venta_ctrl" value={tipoVentaForm} />
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
                  {terminosPago.map(tp => (
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
                {impuestos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Impuestos:</span>
                    <span className="font-medium">{formatCurrency(impuestos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-emerald-700">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => { setShowModal(false); setNvLineas([]); setNvClienteId(null); setTipoVentaForm("inmediata") }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancelar
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800">
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
            <h2 className="text-lg font-semibold text-amber-900">Nuevo Recibo</h2>
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
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800">
                Crear Recibo
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Crear Ajuste (pantalla completa, mismo patrón que Nueva Factura)
  const [creandoAjuste, setCreandoAjuste] = useState(false)
  const [ajusteLineas, setAjusteLineas] = useState<{descripcion: string; fecha_vencimiento: string; importe: number}[]>([])
  const [ajusteClienteId, setAjusteClienteId] = useState<number | null>(null)

  const cancelarCrearAjuste = () => {
    setCreandoAjuste(false)
    setAjusteLineas([])
    setAjusteClienteId(null)
  }

  const renderCrearAjuste = () => {
    const totalAjuste = ajusteLineas.reduce((sum, l) => sum + l.importe, 0)

    return (
      <div>
        <form id="form-nuevo-ajuste" onSubmit={async (e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const cliente = clientes.find(c => c.id === ajusteClienteId)
            if (!cliente || ajusteLineas.length === 0) {
              alert("Debe seleccionar un cliente y agregar al menos una línea")
              return
            }
            const tipo = (formData.get("tipo") as string) || "nota_credito"
            const sucursalNombre = sucursalActiva?.nombre ?? ""
            const apiPayload = {
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              tipo,
              estado: "publicado",
              fecha: new Date().toISOString(),
              concepto: formData.get("concepto") as string,
              moneda: formData.get("moneda") as string,
              nota_venta_numero: null,
              sucursal_id: sucursalActiva?.id ?? null,
              categoria: (formData.get("categoria") as string) || null,
              lineas: ajusteLineas,
              total: totalAjuste,
            }
            let idFinal = Date.now()
            let numeroFinal = `${tipo === "nota_debito" ? "ND" : "NC"}-A-LOCAL`
            try {
              const res = await fetch("/api/ajustes-clientes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiPayload),
              })
              if (res.ok) {
                const data = await res.json()
                idFinal = data.id
                numeroFinal = data.numero
              } else {
                const errBody = await res.text()
                console.error("[ajustes] API respondió error:", res.status, errBody)
                alert(`No se pudo guardar el ajuste (${res.status}). Revisá la consola.`)
                return
              }
            } catch (err) {
              console.error("[ajustes] error al persistir:", err)
              alert("Error de red al guardar el ajuste.")
              return
            }
            const newAjuste: AjusteCliente = {
              id: idFinal,
              numero: numeroFinal,
              cliente_id: apiPayload.cliente_id,
              cliente_nombre: apiPayload.cliente_nombre,
              estado: "publicado",
              fecha: apiPayload.fecha,
              concepto: apiPayload.concepto,
              moneda: apiPayload.moneda as "ARS" | "USD",
              nota_venta_numero: null,
              sucursal: sucursalNombre,
              categoria: apiPayload.categoria,
              toma_equipo_id: null,
              es_automatica: false,
              lineas: apiPayload.lineas,
              total: apiPayload.total,
            }
            setAjustes(prev => [...prev, newAjuste])
            setCreandoAjuste(false)
            setAjusteLineas([])
            setAjusteClienteId(null)
          }} />

        {/* Header con back + título a la izquierda, Cancelar + Guardar arriba a la derecha */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BotonVolver onClick={cancelarCrearAjuste} variant="minimal" texto="" />
            <div>
              <h1 className="text-2xl font-bold text-amber-900">Nuevo Ajuste de Cliente</h1>
              <p className="text-sm text-gray-500">Complete los datos para registrar el ajuste</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={cancelarCrearAjuste}
              className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" form="form-nuevo-ajuste"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 rounded-md hover:bg-indigo-800">
              Guardar
            </button>
          </div>
        </div>

        {/* Cuerpo del formulario */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <select form="form-nuevo-ajuste" value={ajusteClienteId || ""} onChange={(e) => setAjusteClienteId(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select form="form-nuevo-ajuste" name="moneda" defaultValue="ARS"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="ARS">ARS - Pesos</option>
                <option value="USD">USD - Dólares</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select form="form-nuevo-ajuste" name="categoria" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sin categoría</option>
                {ncCategorias.filter(c => c.activa).map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
            <input form="form-nuevo-ajuste" type="text" name="concepto" required placeholder="Ej: Bonificación especial, Ajuste de saldo..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
                          placeholder="Descripción del ajuste"
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
      
      {/* Popups de detalle NC y Recepción (globales) */}
      {renderNcDetallePopup()}
      {renderRecDetallePopup()}

      {/* Modal confirmación de recepción de toma de equipo */}
      {showConfirmarRecepcionModal && selectedToma && (() => {
        const autoDeposit = depositos.find(d => (d.sucursal_id && sucursalActiva?.id ? d.sucursal_id === sucursalActiva.id : d.nombre === sucursalActiva?.nombre)) ?? depositos[0]
        const ubicacionesDep = ubicaciones.filter(u => u.deposito_id === autoDeposit?.id)
        const canConfirm = imeiInput.trim() !== '' && colorRecepcion.trim() !== '' && bateriaRecepcionPct !== undefined && ubicacionRecepcionId !== null && !confirmandoRecepcion

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{selectedToma.modelo_equipo}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Registro de recepción · {selectedToma.recepcion_numero}</p>
                </div>
                <button onClick={() => setShowConfirmarRecepcionModal(false)} className="text-gray-400 hover:text-gray-600 ml-4">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info de la toma */}
              <div className="px-6 pt-4 pb-2">
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
                  <div className="flex gap-4">
                    <span className="text-gray-500">Cliente: <span className="font-medium text-gray-800">{selectedToma.cliente_nombre}</span></span>
                    <span className="text-gray-500">Valor: <span className="font-medium text-emerald-600">{formatCurrency(selectedToma.precio_final)}</span></span>
                  </div>
                  <span className="text-xs text-gray-400">{autoDeposit?.nombre}</span>
                </div>
              </div>

              {/* Formulario */}
              <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[60vh]">

                {/* N° Serie / IMEI */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    N° Serie / IMEI <span className="text-red-500">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={imeiInput}
                    onChange={e => setImeiInput(e.target.value)}
                    placeholder="Ej: 356938035643809"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={colorRecepcion}
                    onChange={e => setColorRecepcion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Seleccionar color...</option>
                    {['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Amarillo', 'Gris', 'Plata', 'Oro', 'Morado', 'Rosa', 'Naranja'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* % Batería */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    % Batería <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={bateriaRecepcionPct ?? ''}
                      placeholder="0 – 100"
                      onChange={e => setBateriaRecepcionPct(e.target.value === '' ? undefined : Number(e.target.value))}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="text-sm text-gray-400">%</span>
                    {bateriaRecepcionPct !== undefined && (
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            bateriaRecepcionPct >= 80 ? 'bg-emerald-500' :
                            bateriaRecepcionPct >= 50 ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, bateriaRecepcionPct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Outlet */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="recepcion-outlet"
                    checked={outletRecepcion}
                    onChange={e => setOutletRecepcion(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600"
                  />
                  <label htmlFor="recepcion-outlet" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Equipo Outlet (tiene daño estético)
                  </label>
                </div>

                {/* Ubicación */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Ubicación de Stock <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ubicacionRecepcionId ?? ''}
                    onChange={e => setUbicacionRecepcionId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Seleccionar ubicación...</option>
                    {ubicacionesDep.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Depósito: {autoDeposit?.nombre}</p>
                </div>

                {/* Observaciones / Fallas */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    Observaciones / Fallas
                  </label>
                  <textarea
                    value={observacionesRecepcion}
                    onChange={e => setObservacionesRecepcion(e.target.value)}
                    rows={2}
                    placeholder="Describa fallas, daños o notas relevantes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col gap-2 px-6 py-3 bg-gray-50 rounded-b-xl border-t">
                {errorRecepcion && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorRecepcion}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowConfirmarRecepcionModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  disabled={!canConfirm}
                  onClick={async () => {
                    if (!canConfirm || !selectedToma) return
                    setConfirmandoRecepcion(true)
                    setErrorRecepcion(null)
                    try {
                      const res = await fetch(`/api/recepciones-toma/${selectedToma.id}/confirmar`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          imei: imeiInput.trim(),
                          color: colorRecepcion.trim(),
                          bateria_pct: bateriaRecepcionPct,
                          outlet: outletRecepcion,
                          ubicacion_id: ubicacionRecepcionId,
                          observaciones: observacionesRecepcion.trim(),
                        }),
                      })
                      if (res.ok) {
                        setTomasEquipo(prev => prev.map(t =>
                          t.id === selectedToma.id ? { ...t, estado_recepcion: "recibido" as const } : t
                        ))
                        setSelectedToma(prev => prev ? { ...prev, estado_recepcion: "recibido" as const } : prev)
                        setShowConfirmarRecepcionModal(false)
                      } else {
                        const data = await res.json().catch(() => ({}))
                        setErrorRecepcion(data?.error ?? `Error ${res.status}`)
                      }
                    } catch (err) {
                      console.error("[recepcion-toma] error al confirmar:", err)
                      setErrorRecepcion("Error de red. Intente nuevamente.")
                    } finally {
                      setConfirmandoRecepcion(false)
                    }
                  }}
                  className="px-5 py-2 bg-indigo-900 text-white text-sm font-semibold rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {confirmandoRecepcion ? "Confirmando..." : "Confirmar recepción"}
                </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal IMEI/Serie para Seña de Equipo */}
      {showSeniaSerieModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar IMEI / Serie</h3>
                <p className="text-sm text-gray-500 mt-0.5">{seniaEquipoNombre} — 1 unidad</p>
              </div>
              <button onClick={() => setShowSeniaSerieModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° de serie / IMEI..."
                  value={seniaSerieBusqueda}
                  onChange={e => setSeniaSerieBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                {seniaSerieCargando ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Cargando series disponibles...</p>
                  </div>
                ) : seniaSeriesDisponibles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay series disponibles</p>
                    <p className="text-sm mt-1">Verifique el inventario de stock</p>
                  </div>
                ) : (
                  seniaSeriesDisponibles
                    .filter(s => !seniaSerieBusqueda || s.serie?.toLowerCase().includes(seniaSerieBusqueda.toLowerCase()))
                    .map(serie => (
                      <div
                        key={serie.id}
                        onClick={() => {
                          setSeniaStockItemId(serie.id)
                          setSeniaEquipoImei(serie.serie ?? "")
                          const detalles = (serie.detalles ?? "").split(" - ")
                          setSeniaEquipoColor(detalles[0] ?? "")
                          const batMatch = (serie.detalles ?? "").match(/Batería (\d+)%/)
                          setSeniaEquipoBateria(batMatch ? Number(batMatch[1]) : undefined)
                          setShowSeniaSerieModal(false)
                        }}
                        className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-emerald-300 cursor-pointer transition-all"
                      >
                        <div className="flex-1">
                          <span className="font-mono font-semibold text-gray-900">{serie.serie}</span>
                          {serie.detalles && <div className="text-sm text-gray-600 mt-1">{serie.detalles}</div>}
                          <div className="text-xs text-gray-400 mt-1">Ingreso: {formatDate(serie.fecha_ingreso)}</div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowSeniaSerieModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => { setShowSerieModal(false); setSerieModalLineaIndex(null); setSeriesSeleccionadasTemp([]); setSerieModalBusqueda('') }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Ubicación: <span className="font-medium">{ubicaciones.find(u => u.id === nvUbicacionId)?.codigo}</span>
                </span>
                <span className={`text-sm font-medium ${seriesSeleccionadasTemp.length === nvLineas[serieModalLineaIndex]?.cantidad ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {seriesSeleccionadasTemp.length} de {nvLineas[serieModalLineaIndex]?.cantidad} seleccionados
                </span>
              </div>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° de serie / IMEI..."
                  value={serieModalBusqueda ?? ''}
                  onChange={e => setSerieModalBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
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
                  seriesReales.filter(serie =>
                    !serieModalBusqueda || serie.serie?.toLowerCase().includes(serieModalBusqueda.toLowerCase())
                  ).map(serie => {
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
                  onClick={() => { setShowSerieModal(false); setSerieModalLineaIndex(null); setSeriesSeleccionadasTemp([]); setSerieModalBusqueda('') }}
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
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 hover:bg-indigo-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
