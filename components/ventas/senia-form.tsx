"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  Search,
  Truck,
  Users,
  X,
} from "lucide-react"
import ProductoDropdown from "@/components/producto-dropdown"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"
import SearchableSelect from "@/components/ui/searchable-select"

interface ClienteOpt {
  id: number
  codigo?: string
  nombre: string
  lista_precios_id?: number | null
  categoria_id?: number | null
  telefono?: string
  numero_documento?: string
}
interface ProductoOpt {
  id: number
  sku: string
  nombre: string
  descripcion?: string
  precio_venta?: number
  costo_manual?: number
  moneda_costo?: string
  stock?: number
  categoria?: string
  requiere_serie?: boolean
}
interface ListaPrecios { id: number; nombre: string; moneda_base?: string; activa?: boolean }
interface CategoriaCliente { id: number; nombre: string; lista_precios_defecto_id?: number | null }
interface SerieDisponible {
  id: number
  serie: string
  detalles: string
  fecha_ingreso?: string
  color?: string | null
  bateria_pct?: number | null
}

export default function SeniaForm() {
  const router = useRouter()
  const { sucursalActiva } = useERP()

  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [productosMaestro, setProductosMaestro] = useState<ProductoOpt[]>([])
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [versionesLista, setVersionesLista] = useState<any[]>([])
  const [categoriasCliente, setCategoriasCliente] = useState<CategoriaCliente[]>([])
  const [cargando, setCargando] = useState(true)

  const [seniaClienteId, setSeniaClienteId] = useState<number | null>(null)
  const [seniaListaPreciosId, setSeniaListaPreciosId] = useState<number | null>(null)
  const [seniaMoneda, setSeniaMoneda] = useState<"ARS" | "USD">("ARS")
  const [seniaCotizacion, setSeniaCotizacion] = useState<number>(1)
  const [seniaFechaLimite, setSeniaFechaLimite] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().split("T")[0]
  })

  // Equipo
  const [seniaEquipoSearchText, setSeniaEquipoSearchText] = useState("")
  const [seniaEquipoSearchOpen, setSeniaEquipoSearchOpen] = useState(false)
  const [seniaEquipoNombre, setSeniaEquipoNombre] = useState("")
  const [seniaProductoId, setSeniaProductoId] = useState<number | null>(null)
  const [seniaProductoRequiereSerie, setSeniaProductoRequiereSerie] = useState(false)
  const [seniaStockItemId, setSeniaStockItemId] = useState<number | null>(null)
  const [seniaEquipoImei, setSeniaEquipoImei] = useState("")
  const [seniaEquipoColor, setSeniaEquipoColor] = useState("")
  const [seniaEquipoBateria, setSeniaEquipoBateria] = useState<number | undefined>(undefined)
  const seniaInputRef = useRef<HTMLInputElement | null>(null)

  // Precios
  const [seniaPrecioVenta, setSeniaPrecioVenta] = useState(0)
  const [seniaDescuento, setSeniaDescuento] = useState(0)

  // Modal series
  const [showSerieModal, setShowSerieModal] = useState(false)
  const [seriesDisponibles, setSeriesDisponibles] = useState<SerieDisponible[]>([])
  const [seriesCargando, setSeriesCargando] = useState(false)
  const [serieBusqueda, setSerieBusqueda] = useState("")

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
      fetch("/api/productos").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios/versiones").then(r => r.json()).catch(() => []),
      fetch("/api/categorias-cliente").then(r => r.json()).catch(() => []),
    ]).then(([cl, pr, lp, vl, cat]) => {
      if (!activo) return
      if (Array.isArray(cl)) setClientes(cl)
      if (Array.isArray(pr)) {
        setProductosMaestro(pr.map((p: any) => ({
          id: p.id,
          sku: p.codigo_interno ?? "",
          nombre: p.nombre ?? "",
          descripcion: p.observaciones ?? "",
          precio_venta: p.precio_venta ?? 0,
          costo_manual: p.costo_manual ?? 0,
          moneda_costo: p.moneda_costo ?? "ARS",
          stock: p.stock_real ?? 0,
          categoria: p.categoria ?? "",
          requiere_serie: p.tiene_numero_serie ?? false,
        })))
      }
      if (Array.isArray(lp)) setListasPrecios(lp)
      if (Array.isArray(vl)) setVersionesLista(vl)
      if (Array.isArray(cat)) setCategoriasCliente(cat)
      setCargando(false)
    })
    return () => { activo = false }
  }, [])

  // Auto cotización USD si moneda = USD
  useEffect(() => {
    if (seniaMoneda !== "USD") { setSeniaCotizacion(1); return }
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => r.json())
      .then((d: any) => { if (d?.tasa) setSeniaCotizacion(Number(d.tasa)) })
      .catch(() => {})
  }, [seniaMoneda])

  const precioFinalCalculado = seniaPrecioVenta - seniaDescuento
  const cliente = clientes.find(c => c.id === seniaClienteId)

  // ─── Modal series ──────────────────────────────────────────────────────
  const abrirModalSerie = async (productoId: number) => {
    setShowSerieModal(true)
    setSeriesDisponibles([])
    setSerieBusqueda("")
    setSeriesCargando(true)
    try {
      const params = new URLSearchParams({
        producto_id: String(productoId),
        estado: "disponible",
      })
      const res = await fetch(`/api/stock/unidades?${params}`)
      const data = await res.json()
      setSeriesDisponibles((Array.isArray(data) ? data : []).map((u: any) => ({
        id: u.id,
        serie: u.nro_serie || `ID:${u.id}`,
        color: u.color ?? null,
        bateria_pct: u.bateria_pct ?? null,
        detalles: [u.color, u.bateria_pct ? `Batería ${u.bateria_pct}%` : null, u.observaciones]
          .filter(Boolean).join(" - "),
        fecha_ingreso: u.created_at?.split("T")[0] || "",
      })))
    } catch {
      setSeriesDisponibles([])
    } finally {
      setSeriesCargando(false)
    }
  }

  const elegirSerie = (serie: SerieDisponible) => {
    setSeniaStockItemId(serie.id)
    setSeniaEquipoImei(serie.serie)
    setSeniaEquipoColor(serie.color ?? "")
    setSeniaEquipoBateria(serie.bateria_pct ?? undefined)
    setShowSerieModal(false)
  }

  // ─── Submit ────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!seniaClienteId) { setError("Debe seleccionar un cliente"); return }
    if (!seniaEquipoNombre.trim()) { setError("Debe ingresar un equipo"); return }
    if (seniaProductoRequiereSerie && !seniaStockItemId) {
      setError("Este producto requiere serie/IMEI. Seleccione una unidad disponible.")
      return
    }
    if (precioFinalCalculado <= 0) { setError("El precio final debe ser mayor a 0"); return }
    if (guardando) return
    setError(null)
    setGuardando(true)

    try {
      const res = await fetch("/api/senias-equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: seniaClienteId,
          cliente_nombre: cliente?.nombre ?? "",
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
          cotizacion: seniaMoneda === "USD" ? seniaCotizacion : 1,
          sucursal_id: sucursalActiva?.id ?? null,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        setError(`Error al crear seña: ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      router.push(`/ventas/senia-equipo/${data.id}`)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Nueva Seña de Equipo</h1>
            <p className="text-sm text-gray-500">Complete los datos para reservar el equipo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || !seniaClienteId || !seniaEquipoNombre || precioFinalCalculado <= 0}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {guardando ? "Creando…" : "Crear Seña"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5">
        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" /> Datos de la Operación
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <input
                type="text"
                value={sucursalActiva?.nombre ?? ""}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
              <input
                type="date"
                value={seniaFechaLimite}
                onChange={e => setSeniaFechaLimite(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={seniaClienteId}
                onChange={v => {
                  const id = v == null ? null : Number(v)
                  setSeniaClienteId(id)
                  if (id) {
                    const cli = clientes.find(c => c.id === id)
                    const cat = categoriasCliente.find(cc => cc.id === cli?.categoria_id)
                    const listaId = cat?.lista_precios_defecto_id ?? cli?.lista_precios_id ?? null
                    setSeniaListaPreciosId(listaId ?? null)
                    if (listaId) {
                      const lista = listasPrecios.find(l => l.id === listaId)
                      const moneda = (lista?.moneda_base === "USD" ? "USD" : "ARS") as "ARS" | "USD"
                      setSeniaMoneda(moneda)
                    }
                  } else {
                    setSeniaListaPreciosId(null)
                    setSeniaMoneda("ARS")
                  }
                }}
                options={clientes.map(c => ({
                  value: String(c.id),
                  label: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre,
                  hint: c.telefono ? `Tel: ${c.telefono}` : undefined,
                  searchExtra: `${c.codigo ?? ""} ${c.telefono ?? ""} ${c.numero_documento ?? ""}`,
                }))}
                placeholder="Buscar cliente por nombre, código o teléfono…"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lista de precios</label>
              <input
                type="text"
                readOnly
                value={
                  seniaListaPreciosId
                    ? listasPrecios.find(l => l.id === seniaListaPreciosId)?.nombre ?? `Lista #${seniaListaPreciosId}`
                    : "— Sin lista —"
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> Datos del Equipo
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipo <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={seniaInputRef}
                    type="text"
                    autoComplete="off"
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
                    placeholder="Buscar producto…"
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
                      onSelect={(p, _precioUnitario, moneda, precioUSD, precioARS) => {
                        setSeniaEquipoNombre(p.nombre)
                        setSeniaEquipoSearchText(p.nombre)
                        setSeniaEquipoSearchOpen(false)
                        setSeniaPrecioVenta(moneda === "USD" ? precioUSD : precioARS)
                        setSeniaMoneda(moneda)
                        setSeniaProductoId(p.id)
                        setSeniaProductoRequiereSerie(p.requiere_serie ?? false)
                        setSeniaStockItemId(null)
                        setSeniaEquipoImei("")
                        setSeniaEquipoColor("")
                        setSeniaEquipoBateria(undefined)
                        if (p.requiere_serie) {
                          setTimeout(() => abrirModalSerie(p.id), 100)
                        }
                      }}
                    />
                  )}
                </div>
                {seniaProductoRequiereSerie && seniaProductoId && (
                  <button
                    type="button"
                    onClick={() => abrirModalSerie(seniaProductoId)}
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
                  ✓ {seniaEquipoImei && `S/N: ${seniaEquipoImei}`}
                  {seniaEquipoColor && ` | ${seniaEquipoColor}`}
                  {seniaEquipoBateria != null && ` | 🔋 ${seniaEquipoBateria}%`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de venta {seniaMoneda === "USD" ? "(USD)" : "($)"}
                </label>
                <input
                  type="number"
                  value={seniaPrecioVenta}
                  step={0.01}
                  onChange={e => setSeniaPrecioVenta(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descuento {seniaMoneda === "USD" ? "(USD)" : "($)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={seniaDescuento}
                  onChange={e => setSeniaDescuento(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio final acordado</label>
                <input
                  type="text"
                  value={
                    seniaMoneda === "USD"
                      ? `USD ${precioFinalCalculado.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                      : formatCurrency(precioFinalCalculado, "ARS")
                  }
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-emerald-50 text-emerald-800 font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4">
          <p className="text-sm font-medium text-gray-600 mb-2">
            Al confirmar se generará automáticamente:
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> Nota de Venta — Abierta
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" /> Orden de Entrega — Confirmada
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Remito y Factura se generan al confirmar el cierre de la seña desde su ficha.
          </p>
        </div>
      </div>

      {/* Modal series */}
      {showSerieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar IMEI / Serie</h3>
                <p className="text-sm text-gray-500 mt-0.5">{seniaEquipoNombre}</p>
              </div>
              <button onClick={() => setShowSerieModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° de serie / IMEI…"
                  value={serieBusqueda}
                  onChange={e => setSerieBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                {seriesCargando ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Cargando series…</p>
                  </div>
                ) : seriesDisponibles.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No hay unidades disponibles para este producto.
                  </div>
                ) : (
                  seriesDisponibles
                    .filter(s => !serieBusqueda || s.serie?.toLowerCase().includes(serieBusqueda.toLowerCase()))
                    .map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => elegirSerie(s)}
                        className="w-full text-left flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-mono font-semibold text-gray-900">{s.serie}</div>
                          {s.detalles && <div className="text-sm text-gray-600 mt-1">{s.detalles}</div>}
                          {s.fecha_ingreso && <div className="text-xs text-gray-400 mt-1">Ingreso: {s.fecha_ingreso}</div>}
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowSerieModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
