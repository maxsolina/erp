"use client"

// Ficha de tracking de una unidad de stock (IMEI / N° de Serie).
// Muestra los datos actuales de la unidad + el historial completo de movimientos
// extraído de `movimientos_stock` (filtrado por stock_unidad_id).

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Battery,
  ExternalLink,
  MapPin,
  Package,
  Smartphone,
  Tag,
  Warehouse,
  Wrench,
  X,
} from "lucide-react"
import BotonVolver from "@/components/ui/boton-volver"

interface Unidad {
  id: number
  nro_serie: string | null
  producto_id: number
  estado: string
  color: string | null
  bateria_pct: number | null
  es_outlet: boolean | null
  observaciones: string | null
  origen_tipo: string | null
  origen_numero: string | null
  nota_venta_id: number | null
  nota_venta_numero: string | null
  created_at: string
  updated_at: string
  productos?: { id: number; nombre: string; codigo_interno: string }
  depositos?: { id: number; codigo: string; nombre: string }
  ubicaciones?: { id: number; codigo: string; nombre: string }
}

interface Movimiento {
  // id puede venir como number (movimientos_stock) o string (stock_movimientos
  // normalizado, prefijado con "sm-" para evitar colisión)
  id: number | string
  tipo: string
  cantidad: number
  nro_serie: string | null
  origen_tipo: string | null
  origen_id: number | null
  origen_numero: string | null
  usuario: string | null
  observaciones: string | null
  created_at: string
  productos?: { nombre: string; codigo_interno: string }
  ubicaciones_origen?: { codigo: string; nombre: string } | null
  ubicaciones_destino?: { codigo: string; nombre: string } | null
  depositos_origen?: { codigo: string; nombre: string } | null
  depositos_destino?: { codigo: string; nombre: string } | null
}

const TIPO_LABEL: Record<string, { label: string; color: string; icon: typeof Package }> = {
  entrada_recepcion: { label: "Entrada por Recepción", color: "bg-green-100 text-green-700", icon: ArrowDownToLine },
  salida_entrega: { label: "Salida por Entrega", color: "bg-red-100 text-red-700", icon: ArrowUpFromLine },
  transferencia_origen: { label: "Transferencia (salida)", color: "bg-blue-100 text-blue-700", icon: ArrowLeftRight },
  transferencia_destino: { label: "Transferencia (entrada)", color: "bg-blue-100 text-blue-700", icon: ArrowLeftRight },
  ajuste_positivo: { label: "Ajuste Positivo", color: "bg-emerald-100 text-emerald-700", icon: ArrowDownToLine },
  ajuste_negativo: { label: "Ajuste Negativo", color: "bg-orange-100 text-orange-700", icon: ArrowUpFromLine },
  reserva: { label: "Reservada", color: "bg-amber-100 text-amber-700", icon: Tag },
  liberacion: { label: "Liberada", color: "bg-gray-100 text-gray-700", icon: Tag },
  toma_equipo: { label: "Toma de Equipo", color: "bg-purple-100 text-purple-700", icon: Wrench },
}

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "bg-green-100 text-green-700" },
  reservado: { label: "Reservado", color: "bg-blue-100 text-blue-700" },
  entregado: { label: "Entregado", color: "bg-gray-200 text-gray-700" },
  en_reparacion: { label: "En reparación", color: "bg-amber-100 text-amber-700" },
  devuelto: { label: "Devuelto", color: "bg-pink-100 text-pink-700" },
  dado_de_baja: { label: "Dado de baja", color: "bg-red-100 text-red-700" },
}

// Comprobante a abrir en el modal. Soportamos los tipos que aparecen en el
// origen del log de movimientos.
type ComprobanteTipo = "recepcion" | "toma_equipo" | "remito" | "orden_entrega"
interface ComprobanteAbierto {
  tipo: ComprobanteTipo
  numero: string
}

export default function ImeiFicha({ unidadId }: { unidadId: number }) {
  const router = useRouter()
  const [unidad, setUnidad] = useState<Unidad | null | undefined>(undefined)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [error, setError] = useState<string | null>(null)
  const [comprobanteAbierto, setComprobanteAbierto] = useState<ComprobanteAbierto | null>(null)

  useEffect(() => {
    let cancelado = false
    // 1° fetch: la unidad (necesitamos nro_serie para el 2° fetch porque la
    // tabla `stock_movimientos` indexa por serie, no por stock_unidad_id).
    fetch(`/api/stock/unidades?id=${unidadId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(async unis => {
        if (cancelado) return
        const uni = Array.isArray(unis) ? unis[0] : unis
        if (!uni) {
          setError("Unidad no encontrada")
          setUnidad(null)
          return
        }
        setUnidad(uni)
        // 2° fetch: movimientos. Pasamos ambos filtros (id + nro_serie) para
        // que el API mergee las dos tablas (movimientos_stock y stock_movimientos).
        const params = new URLSearchParams()
        params.set("stock_unidad_id", String(unidadId))
        if (uni.nro_serie) params.set("nro_serie", String(uni.nro_serie))
        params.set("limit", "200")
        const movs = await fetch(`/api/stock/movimientos?${params.toString()}`)
          .then(r => (r.ok ? r.json() : []))
          .catch(() => [])
        if (!cancelado) setMovimientos(Array.isArray(movs) ? movs : [])
      })
      .catch(err => {
        console.error(err)
        if (!cancelado) {
          setError("Error de red al cargar la unidad")
          setUnidad(null)
        }
      })
    return () => {
      cancelado = true
    }
  }, [unidadId])

  if (unidad === undefined) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }
  if (unidad === null) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{error ?? "Unidad no encontrada"}</p>
        <Link href="/stock/lotes-series" className="text-amber-700 hover:underline">
          Volver al listado
        </Link>
      </div>
    )
  }

  const u = unidad
  const estadoCfg = ESTADO_LABEL[u.estado] ?? { label: u.estado, color: "bg-gray-100 text-gray-700" }

  // Fila sintética con el "ingreso original" del equipo (alta de la unidad).
  // Si la tabla movimientos_stock todavía no tenía registro de la entrada
  // (datos viejos pre-tracking) igual mostramos algo significativo: tipo
  // según `origen_tipo`, número de comprobante origen, depósito/ubicación
  // actual como "destino" y la fecha de creación de la unidad.
  // Mostramos esta fila SIEMPRE — actúa como ancla visual del origen.
  const tipoIngresoMap: Record<string, string> = {
    recepcion: "entrada_recepcion",
    toma_equipo: "toma_equipo",
    transferencia: "transferencia_destino",
    ajuste: "ajuste_positivo",
  }
  const filaIngreso: Movimiento = {
    id: -1,
    tipo: tipoIngresoMap[u.origen_tipo ?? ""] ?? "entrada_recepcion",
    cantidad: 1,
    nro_serie: u.nro_serie,
    origen_tipo: u.origen_tipo,
    origen_id: null,
    origen_numero: u.origen_numero,
    usuario: null,
    observaciones: null,
    created_at: u.created_at,
    ubicaciones_origen: null,
    ubicaciones_destino: u.ubicaciones
      ? { codigo: u.ubicaciones.codigo, nombre: u.ubicaciones.nombre }
      : null,
    depositos_origen: null,
    depositos_destino: u.depositos
      ? { codigo: u.depositos.codigo, nombre: u.depositos.nombre }
      : null,
  }

  // Combinar real + sintética. Ordenar por fecha desc (más reciente arriba),
  // así la fila sintética del ingreso queda al fondo de la tabla.
  const filas: Movimiento[] = [...movimientos, filaIngreso].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <BotonVolver onClick={() => router.push("/stock/lotes-series")} variant="ghost" />
          <div>
            <h1 className="text-2xl font-bold text-amber-900 font-mono">
              {u.nro_serie || <span className="italic font-sans text-gray-400">sin número de serie</span>}
            </h1>
            <p className="text-sm text-gray-500">
              {u.productos?.nombre ?? "Producto desconocido"}
              {u.productos?.codigo_interno ? ` · ${u.productos.codigo_interno}` : ""}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${estadoCfg.color}`}>
          {estadoCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Datos del equipo */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-amber-700" />
            <h3 className="font-semibold text-gray-900">Equipo</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Producto</dt>
              <dd className="text-gray-900 font-medium text-right">{u.productos?.nombre ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Código</dt>
              <dd className="text-gray-700">{u.productos?.codigo_interno ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Color</dt>
              <dd className="text-gray-700">{u.color || "—"}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500 flex items-center gap-1">
                <Battery className="w-3.5 h-3.5" /> Batería
              </dt>
              <dd>
                {u.bateria_pct != null ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      u.bateria_pct >= 90
                        ? "bg-green-100 text-green-700"
                        : u.bateria_pct >= 80
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.bateria_pct}%
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Outlet</dt>
              <dd className="text-gray-700">{u.es_outlet ? "Sí" : "No"}</dd>
            </div>
          </dl>
        </div>

        {/* Ubicación actual */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-amber-700" />
            <h3 className="font-semibold text-gray-900">Ubicación actual</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5" /> Depósito
              </dt>
              <dd className="text-gray-900 font-medium text-right">{u.depositos?.nombre ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Ubicación</dt>
              <dd className="text-gray-700 text-right">{u.ubicaciones?.nombre ?? "—"}</dd>
            </div>
            {u.observaciones && (
              <div className="pt-2 border-t mt-2">
                <dt className="text-gray-500 mb-1">Observaciones</dt>
                <dd className="text-gray-700 text-xs">{u.observaciones}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Historial de movimientos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Historial de movimientos</h3>
          <span className="text-xs text-gray-500">
            {filas.length} {filas.length === 1 ? "movimiento" : "movimientos"}
          </span>
        </div>
        {filas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            Esta unidad todavía no tiene movimientos registrados.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Desde</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Depósito / Ubicación</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Comprobante</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(m => {
                const cfg = TIPO_LABEL[m.tipo] ?? {
                  label: m.tipo,
                  color: "bg-gray-100 text-gray-700",
                  icon: Package,
                }
                const TipoIcon = cfg.icon
                const desde =
                  [m.depositos_origen?.nombre, m.ubicaciones_origen?.nombre]
                    .filter(Boolean)
                    .join(" · ") || "—"
                const hasta =
                  [m.depositos_destino?.nombre, m.ubicaciones_destino?.nombre]
                    .filter(Boolean)
                    .join(" · ") || "—"
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString("es-AR")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}
                      >
                        <TipoIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{desde}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{hasta}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {(() => {
                        if (!m.origen_numero) return m.origen_tipo ?? "—"
                        const tipoSoportado: ComprobanteTipo | null =
                          m.origen_tipo === "recepcion" ? "recepcion"
                          : m.origen_tipo === "toma_equipo" ? "toma_equipo"
                          : m.origen_tipo === "remito" ? "remito"
                          : m.origen_tipo === "orden_entrega" ? "orden_entrega"
                          : null
                        if (tipoSoportado) {
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                setComprobanteAbierto({ tipo: tipoSoportado, numero: m.origen_numero! })
                              }
                              className="text-amber-700 hover:text-amber-900 hover:underline font-medium"
                            >
                              {m.origen_numero}
                            </button>
                          )
                        }
                        return `${m.origen_tipo ?? ""} ${m.origen_numero}`.trim()
                      })()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{m.usuario ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer lateral con el comprobante origen — no es modal popup, slide-out
          desde la derecha. Click afuera o X para cerrar. */}
      {comprobanteAbierto && (
        <ComprobanteDrawer
          tipo={comprobanteAbierto.tipo}
          numero={comprobanteAbierto.numero}
          onClose={() => setComprobanteAbierto(null)}
        />
      )}
    </div>
  )
}

// ─── Modal centrado con la ficha completa del comprobante origen ────────────
function ComprobanteDrawer({
  tipo,
  numero,
  onClose,
}: {
  tipo: ComprobanteTipo
  numero: string
  onClose: () => void
}) {
  // ID del comprobante una vez resuelto por la vista interna — habilita el link
  // "Ver en su página" hacia la ficha individual (no al listado).
  const [resolvedId, setResolvedId] = useState<number | null>(null)

  // Cierra con tecla Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const fichaHref =
    resolvedId != null
      ? tipo === "recepcion"
        ? `/compras/recepciones/${resolvedId}`
        : tipo === "remito"
          ? `/ventas/remitos/${resolvedId}`
          : tipo === "orden_entrega"
            ? `/ventas/oe/${resolvedId}`
            : `/toma-equipo/${resolvedId}`
      : null

  const tituloTipo =
    tipo === "recepcion"
      ? "Recepción de compra"
      : tipo === "remito"
        ? "Remito de venta"
        : tipo === "orden_entrega"
          ? "Orden de Entrega"
          : "Recepción de Toma de Equipo"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-lg">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{tituloTipo}</p>
            <h3 className="text-lg font-semibold text-amber-900 font-mono">{numero}</h3>
          </div>
          <div className="flex items-center gap-2">
            {fichaHref ? (
              <Link
                href={fichaHref}
                className="text-xs text-indigo-700 hover:underline flex items-center gap-1"
                title="Abrir la ficha completa del comprobante"
              >
                <ExternalLink className="w-3 h-3" /> Ver en su página
              </Link>
            ) : (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Ver en su página
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {tipo === "recepcion" ? (
            <RecepcionCompleta numero={numero} onIdResolved={setResolvedId} />
          ) : tipo === "remito" ? (
            <RemitoCompleto numero={numero} onIdResolved={setResolvedId} />
          ) : tipo === "orden_entrega" ? (
            <OECompleta numero={numero} onIdResolved={setResolvedId} />
          ) : (
            <RecepcionTomaCompleta numero={numero} onIdResolved={setResolvedId} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vista completa de Recepción de compra (dentro del modal) ───────────────
function RecepcionCompleta({
  numero,
  onIdResolved,
}: {
  numero: string
  onIdResolved?: (id: number) => void
}) {
  const [data, setData] = useState<any | null | undefined>(undefined)
  useEffect(() => {
    fetch("/api/compras/recepciones")
      .then(r => (r.ok ? r.json() : []))
      .then(arr => {
        const found = (Array.isArray(arr) ? arr : []).find((x: any) => x.numero === numero)
        setData(found ?? null)
        if (found?.id != null && onIdResolved) onIdResolved(Number(found.id))
      })
      .catch(() => setData(null))
  }, [numero, onIdResolved])

  if (data === undefined) return <p className="text-sm text-gray-400">Cargando recepción…</p>
  if (data === null)
    return <p className="text-sm text-red-500">No se encontró la recepción {numero}.</p>

  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.lineas)
      ? data.lineas
      : []

  return (
    <div className="space-y-6">
      {/* Cards de cabecera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Datos generales</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Estado</dt>
              <dd className="text-gray-900 font-medium">{data.estado ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha</dt>
              <dd className="text-gray-700">
                {data.fecha ? new Date(data.fecha).toLocaleDateString("es-AR") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sucursal</dt>
              <dd className="text-gray-700">{data.sucursal ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Depósito</dt>
              <dd className="text-gray-700">{data.deposito_nombre ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Proveedor</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="text-gray-900 font-medium text-right">
                {data.proveedor_nombre ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">CUIT</dt>
              <dd className="text-gray-700">{data.proveedor_cuit ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Documentos vinculados</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">OC</dt>
              <dd className="text-gray-700 font-mono">{data.oc_numero ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Remito proveedor</dt>
              <dd className="text-gray-700">{data.remito_numero ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Factura</dt>
              <dd className="text-gray-700">{data.factura_numero ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Tabla items recibidos */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Items recibidos</h4>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg">
            Sin items
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Producto
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Código
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Cantidad
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Recibida
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Series
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => {
                  const series = Array.isArray(it.series)
                    ? it.series
                    : Array.isArray(it.numeros_serie)
                      ? it.numeros_serie
                      : []
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">
                        {it.producto_nombre ?? it.descripcion ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-gray-500 font-mono text-xs">
                        {it.producto_codigo ?? it.codigo ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">
                        {it.cantidad ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">
                        {it.cantidad_recibida ?? it.cantidad ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono text-amber-700">
                        {series.length > 0
                          ? series
                              .map((s: any) => (typeof s === "string" ? s : s?.nro_serie ?? s?.serie))
                              .filter(Boolean)
                              .join(", ")
                          : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.observaciones && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Observaciones</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observaciones}</p>
        </div>
      )}
    </div>
  )
}

// ─── Vista completa de Orden de Entrega (dentro del modal) ─────────────────
function OECompleta({
  numero,
  onIdResolved,
}: {
  numero: string
  onIdResolved?: (id: number) => void
}) {
  const [data, setData] = useState<any | null | undefined>(undefined)
  useEffect(() => {
    fetch("/api/ordenes-entrega")
      .then(r => (r.ok ? r.json() : []))
      .then(arr => {
        const found = (Array.isArray(arr) ? arr : []).find((x: any) => x.numero === numero)
        setData(found ?? null)
        if (found?.id != null && onIdResolved) onIdResolved(Number(found.id))
      })
      .catch(() => setData(null))
  }, [numero, onIdResolved])

  if (data === undefined) return <p className="text-sm text-gray-400">Cargando OE…</p>
  if (data === null) return <p className="text-sm text-red-500">No se encontró la OE {numero}.</p>

  const productos = Array.isArray(data.productos) ? data.productos : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Datos generales</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Estado</dt>
              <dd className="text-gray-900 font-medium">{data.estado ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tipo</dt>
              <dd className="text-gray-700">{data.tipo ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha</dt>
              <dd className="text-gray-700">
                {data.fecha ? new Date(data.fecha).toLocaleDateString("es-AR") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Entrega programada</dt>
              <dd className="text-gray-700">
                {data.fecha_entrega_programada
                  ? new Date(data.fecha_entrega_programada).toLocaleDateString("es-AR")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Cliente</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="text-gray-900 font-medium text-right">{data.cliente_nombre ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Depósito</dt>
              <dd className="text-gray-700">{data.deposito_origen ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Documentos vinculados</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">NV</dt>
              <dd className="text-gray-700 font-mono text-right">
                {data.nota_venta_numero ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Total productos</dt>
              <dd className="text-gray-700">{data.total_productos ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Entregados</dt>
              <dd className="text-gray-700">{data.productos_entregados ?? 0}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Productos a entregar</h4>
        {productos.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg">
            Sin productos
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Producto
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Cantidad
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    IMEI / Serie
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p: any, idx: number) => {
                  const series = Array.isArray(p.series_seleccionadas)
                    ? p.series_seleccionadas
                        .map((s: any) => (typeof s === "string" ? s : s?.serie ?? s?.nro_serie))
                        .filter(Boolean)
                    : p.imei
                      ? [p.imei]
                      : []
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">
                        {p.producto_nombre ?? p.nombre ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">{p.cantidad ?? "—"}</td>
                      <td className="py-2 px-3 text-xs font-mono text-amber-700">
                        {series.length > 0 ? series.join(", ") : "—"}
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-gray-600">
                        {p.estado ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.observaciones && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Observaciones</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observaciones}</p>
        </div>
      )}
    </div>
  )
}

// ─── Vista completa de Remito de venta (dentro del modal) ───────────────────
function RemitoCompleto({
  numero,
  onIdResolved,
}: {
  numero: string
  onIdResolved?: (id: number) => void
}) {
  const [data, setData] = useState<any | null | undefined>(undefined)
  useEffect(() => {
    fetch("/api/remitos-venta")
      .then(r => (r.ok ? r.json() : []))
      .then(arr => {
        const found = (Array.isArray(arr) ? arr : []).find((x: any) => x.numero === numero)
        setData(found ?? null)
        if (found?.id != null && onIdResolved) onIdResolved(Number(found.id))
      })
      .catch(() => setData(null))
  }, [numero, onIdResolved])

  if (data === undefined) return <p className="text-sm text-gray-400">Cargando remito…</p>
  if (data === null) return <p className="text-sm text-red-500">No se encontró el remito {numero}.</p>

  const productos = Array.isArray(data.productos) ? data.productos : []
  const seguimiento = Array.isArray(data.seguimiento) ? data.seguimiento : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Datos generales</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Estado</dt>
              <dd className="text-gray-900 font-medium">{data.estado ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tipo</dt>
              <dd className="text-gray-700">{data.tipo ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha</dt>
              <dd className="text-gray-700">
                {data.fecha ? new Date(data.fecha).toLocaleDateString("es-AR") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Bultos</dt>
              <dd className="text-gray-700">{data.total_bultos ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Cliente</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nombre</dt>
              <dd className="text-gray-900 font-medium text-right">{data.cliente_nombre ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Depósito</dt>
              <dd className="text-gray-700">{data.deposito ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Ubicación</dt>
              <dd className="text-gray-700">{data.ubicacion ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Documentos vinculados</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">NV</dt>
              <dd className="text-gray-700 font-mono">{data.nota_venta_numero ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">OE</dt>
              <dd className="text-gray-700 font-mono">{data.orden_entrega_numero ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Productos entregados</h4>
        {productos.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4 text-center bg-gray-50 rounded-lg">
            Sin productos en el remito
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Producto
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    Cantidad
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">
                    IMEI / Serie
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p: any, idx: number) => {
                  const series = Array.isArray(p.series_seleccionadas)
                    ? p.series_seleccionadas
                        .map((s: any) => (typeof s === "string" ? s : s?.serie ?? s?.nro_serie))
                        .filter(Boolean)
                    : p.imei
                      ? [p.imei]
                      : []
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">
                        {p.producto_nombre ?? p.nombre ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">{p.cantidad ?? "—"}</td>
                      <td className="py-2 px-3 text-xs font-mono text-amber-700">
                        {series.length > 0 ? series.join(", ") : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {seguimiento.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Seguimiento</h4>
          <ul className="space-y-1.5 text-xs">
            {seguimiento.map((s: any, idx: number) => (
              <li key={idx} className="flex gap-3 text-gray-600">
                <span className="text-gray-400 whitespace-nowrap">
                  {s.fecha ? new Date(s.fecha).toLocaleString("es-AR") : "—"}
                </span>
                <span>{s.accion}</span>
                {s.usuario && <span className="text-gray-400 ml-auto">{s.usuario}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.observaciones && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Observaciones</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observaciones}</p>
        </div>
      )}
    </div>
  )
}

// ─── Vista completa de Recepción de Toma de Equipo (dentro del modal) ───────
function RecepcionTomaCompleta({
  numero,
  onIdResolved,
}: {
  numero: string
  onIdResolved?: (id: number) => void
}) {
  const [data, setData] = useState<any | null | undefined>(undefined)
  useEffect(() => {
    fetch("/api/recepciones-toma")
      .then(r => (r.ok ? r.json() : []))
      .then(arr => {
        const found = (Array.isArray(arr) ? arr : []).find((x: any) => x.numero === numero)
        setData(found ?? null)
        // El link "Ver en su página" para una toma_equipo apunta a la TOMA
        // (que tiene página en /toma-equipo/[id]), no a la recepción de toma
        // que no tiene ruta propia. Usamos toma_equipo_id si existe.
        const tomaId = found?.toma_equipo_id ?? null
        if (tomaId != null && onIdResolved) onIdResolved(Number(tomaId))
      })
      .catch(() => setData(null))
  }, [numero, onIdResolved])

  if (data === undefined) return <p className="text-sm text-gray-400">Cargando…</p>
  if (data === null) return <p className="text-sm text-red-500">No se encontró {numero}.</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Datos generales</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Estado</dt>
              <dd className="text-gray-900 font-medium">{data.estado ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha</dt>
              <dd className="text-gray-700">
                {data.fecha ? new Date(data.fecha).toLocaleDateString("es-AR") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Cliente</dt>
              <dd className="text-gray-700 text-right">{data.cliente_nombre ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Toma origen</dt>
              <dd className="text-gray-700 font-mono">{data.toma_equipo_numero ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Equipo recibido</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">IMEI</dt>
              <dd className="text-gray-700 font-mono">{data.imei ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Color</dt>
              <dd className="text-gray-700">{data.color ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Batería</dt>
              <dd className="text-gray-700">
                {data.bateria_pct != null ? `${data.bateria_pct}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Outlet</dt>
              <dd className="text-gray-700">{data.outlet ? "Sí" : "No"}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-3">Toma — datos comerciales</h4>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Modelo</dt>
              <dd className="text-gray-700 text-right">
                {data.tomas_equipo?.modelo_equipo ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Precio final</dt>
              <dd className="text-gray-700">
                {data.tomas_equipo?.precio_final != null
                  ? `USD ${Number(data.tomas_equipo.precio_final).toLocaleString("es-AR")}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {data.tomas_equipo?.evaluacion && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Evaluación</h4>
          <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap">
            {typeof data.tomas_equipo.evaluacion === "string"
              ? data.tomas_equipo.evaluacion
              : JSON.stringify(data.tomas_equipo.evaluacion, null, 2)}
          </pre>
        </div>
      )}

      {data.observaciones && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Observaciones</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.observaciones}</p>
        </div>
      )}
    </div>
  )
}
