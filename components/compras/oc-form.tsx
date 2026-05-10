"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Plus, Save, Trash2, X } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"
import { fetchProductos } from "@/lib/productos-actions"
import { guardarOrdenCompra } from "@/lib/compras-actions"

interface Proveedor {
  id: number
  nombre?: string
  razon_social?: string
  cuit?: string
  moneda_habitual?: string
  tipo_cotizacion_defecto?: string
}
interface Sucursal { id: number; nombre: string; activa: boolean }
interface Deposito { id: number; nombre: string; sucursal_id?: number | null; activo?: boolean }
interface Ubicacion { id: number; deposito_id: number; nombre: string; codigo?: string }
interface ProductoOpt {
  id: number
  nombre: string
  codigo_interno?: string
  sku?: string
  descripcion?: string | null
  observaciones?: string | null
  precio_compra?: number
  costo_manual?: number
  tiene_numero_serie?: boolean
  requiere_color?: boolean
  requiere_bateria?: boolean
  requiere_outlet?: boolean
  requiere_observaciones?: boolean
}
interface Moneda { codigo: string; nombre: string }

interface LineaForm {
  uid: number
  producto_id: number
  producto_nombre: string
  producto_sku?: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  nac: boolean
  tiene_serie?: boolean
  requiere_color?: boolean
  requiere_bateria?: boolean
  requiere_outlet?: boolean
  requiere_observaciones?: boolean
}

const MONEDAS_DEFAULT: Moneda[] = [
  { codigo: "ARS", nombre: "Pesos" },
  { codigo: "USD", nombre: "Dólares" },
]

export default function OcForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const { sucursales: sucursalesCtx } = useERP()
  const isEdit = initialId != null

  // Loaders
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [monedas] = useState<Moneda[]>(MONEDAS_DEFAULT)
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoOC, setCargandoOC] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Form state
  const [numeroExistente, setNumeroExistente] = useState<string | null>(null)
  const [estadoExistente, setEstadoExistente] = useState<string | null>(null)
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [proveedorNombre, setProveedorNombre] = useState<string>("")
  const [sucursalNombre, setSucursalNombre] = useState<string>("")
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [terminoPago, setTerminoPago] = useState<string>("Contado")
  const [metodoCompra, setMetodoCompra] = useState<"estandar" | "inmediato">("estandar")
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [fechaEntregaEstimada, setFechaEntregaEstimada] = useState<string>("")
  const [depositoDestinoId, setDepositoDestinoId] = useState<number | null>(null)
  const [depositoDestinoNombre, setDepositoDestinoNombre] = useState<string>("")
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState<number | null>(null)
  const [ubicacionDestinoNombre, setUbicacionDestinoNombre] = useState<string>("")
  const [moneda, setMoneda] = useState<string>("ARS")
  const [tipoCotizacion, setTipoCotizacion] = useState<string>("oficial")
  const [cotizacionDia, setCotizacionDia] = useState<number | null>(null)
  const [observaciones, setObservaciones] = useState<string>("")
  const [lineas, setLineas] = useState<LineaForm[]>([])

  // Producto search
  const [productoSearch, setProductoSearch] = useState<Record<number, string>>({})
  const [productoOpciones, setProductoOpciones] = useState<Record<number, ProductoOpt[]>>({})
  const [productoDropdown, setProductoDropdown] = useState<Record<number, boolean>>({})
  const productoInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // Proveedor search
  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [proveedorDropdownAbierto, setProveedorDropdownAbierto] = useState(false)

  // Submit state
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/compras/proveedores").then(r => r.json()).catch(() => []),
      fetch("/api/depositos").then(r => r.json()).catch(() => []),
      fetch("/api/ubicaciones").then(r => r.json()).catch(() => []),
    ]).then(([prov, dep, ub]) => {
      if (!activo) return
      if (Array.isArray(prov)) setProveedores(prov)
      if (Array.isArray(dep)) setDepositos(dep)
      if (Array.isArray(ub)) setUbicaciones(ub)
      setCargandoBase(false)
    })
    return () => { activo = false }
  }, [])

  // Cargar OC existente
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/compras/ordenes-compra/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(r.status === 404 ? "OC no encontrada" : `Error ${r.status}`)
          setCargandoOC(false)
          return
        }
        const oc = await r.json()
        setNumeroExistente(oc.numero ?? null)
        setEstadoExistente(oc.estado ?? null)
        setProveedorId(oc.proveedor_id ?? null)
        setProveedorNombre(oc.proveedor_nombre ?? "")
        setSucursalNombre(oc.sucursal ?? "")
        setSucursalId(oc.sucursal_id ?? null)
        setTerminoPago(oc.termino_pago ?? "Contado")
        setMetodoCompra(oc.metodo_compra === "inmediato" ? "inmediato" : "estandar")
        setFecha((oc.fecha ?? "").slice(0, 10))
        setFechaEntregaEstimada((oc.fecha_entrega_estimada ?? "").slice(0, 10))
        setDepositoDestinoNombre(oc.deposito_destino ?? "")
        setDepositoDestinoId(oc.deposito_destino_id ?? null)
        setUbicacionDestinoNombre(oc.ubicacion ?? oc.ubicacion_destino ?? "")
        setUbicacionDestinoId(oc.ubicacion_destino_id ?? null)
        setMoneda(oc.moneda ?? "ARS")
        setTipoCotizacion(oc.tipo_cotizacion ?? "oficial")
        setCotizacionDia(oc.cotizacion_dia ?? null)
        setObservaciones(oc.observaciones ?? "")
        const ocLineas = Array.isArray(oc.lineas) ? oc.lineas : Array.isArray(oc.items) ? oc.items : []
        setLineas(ocLineas.map((l: any, idx: number) => ({
          uid: idx + 1,
          producto_id: l.producto_id ?? 0,
          producto_nombre: l.producto_nombre ?? "",
          producto_sku: l.producto_sku ?? "",
          descripcion: l.descripcion ?? "",
          cantidad: Number(l.cantidad ?? 1),
          precio_unitario: Number(l.precio_unitario ?? 0),
          subtotal: Number(l.subtotal ?? l.cantidad * l.precio_unitario ?? 0),
          nac: !!l.nac,
          tiene_serie: !!l.tiene_serie,
          requiere_color: !!l.requiere_color,
          requiere_bateria: !!l.requiere_bateria,
          requiere_outlet: !!l.requiere_outlet,
          requiere_observaciones: !!l.requiere_observaciones,
        })))
        setCargandoOC(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar la OC")
        setCargandoOC(false)
      })
  }, [isEdit, initialId])

  // ─── Filtrado ───────────────────────────────────────────────────────────
  const sucursalesActivas = sucursalesCtx.filter(s => s.activa)
  const depositosFiltrados = sucursalId
    ? depositos.filter(d => d.activo !== false && d.sucursal_id === sucursalId)
    : depositos.filter(d => d.activo !== false)
  const ubicacionesFiltradas = depositoDestinoId
    ? ubicaciones.filter(u => u.deposito_id === depositoDestinoId)
    : []

  const proveedoresFiltrados = useMemo(() => {
    const q = proveedorBusqueda.trim().toLowerCase()
    if (!q) return proveedores.slice(0, 10)
    return proveedores.filter(p => {
      const name = (p.nombre || p.razon_social || "").toLowerCase()
      return name.includes(q) || (p.cuit ?? "").includes(q)
    }).slice(0, 10)
  }, [proveedores, proveedorBusqueda])

  // ─── Helpers ────────────────────────────────────────────────────────────
  const lineasValidas = lineas.filter(l => l.producto_id > 0 && l.producto_nombre.trim() !== "")
  const totalOC = useMemo(
    () => lineas.reduce((s, l) => s + (l.subtotal ?? 0), 0),
    [lineas],
  )

  const seleccionarProveedor = (p: Proveedor) => {
    setProveedorId(p.id)
    setProveedorNombre(p.nombre || p.razon_social || "")
    if (p.moneda_habitual) setMoneda(p.moneda_habitual)
    if (p.tipo_cotizacion_defecto) setTipoCotizacion(p.tipo_cotizacion_defecto)
    setProveedorDropdownAbierto(false)
    setProveedorBusqueda("")
  }

  const buscarProductosLinea = async (idx: number, query: string) => {
    setProductoSearch(prev => ({ ...prev, [idx]: query }))
    if (query.trim().length === 0) {
      setProductoOpciones(prev => ({ ...prev, [idx]: [] }))
      setProductoDropdown(prev => ({ ...prev, [idx]: false }))
      return
    }
    setProductoDropdown(prev => ({ ...prev, [idx]: true }))
    try {
      // Excluir servicios — no se compran (no van en OC ni recepciones).
      const res = await fetchProductos({ busqueda: query, activo: true })
      const filtrado = (res ?? []).filter((p: any) => p.tipo !== "servicio")
      setProductoOpciones(prev => ({ ...prev, [idx]: filtrado }))
    } catch {
      setProductoOpciones(prev => ({ ...prev, [idx]: [] }))
    }
  }

  const seleccionarProducto = (idx: number, p: ProductoOpt) => {
    const updated = [...lineas]
    const linea = updated[idx]
    const precio = linea.precio_unitario || p.precio_compra || p.costo_manual || 0
    updated[idx] = {
      ...linea,
      producto_id: p.id,
      producto_nombre: p.nombre,
      producto_sku: p.codigo_interno ?? p.sku ?? "",
      descripcion: linea.descripcion || p.descripcion || p.observaciones || "",
      precio_unitario: precio,
      subtotal: linea.cantidad * precio,
      // Flags del producto — viajan a la OC y a la recepción para que
      // el wizard de registro de unidades pida color/batería/outlet/obs cuando aplica
      tiene_serie: !!p.tiene_numero_serie,
      requiere_color: !!p.requiere_color,
      requiere_bateria: !!p.requiere_bateria,
      requiere_outlet: !!p.requiere_outlet,
      requiere_observaciones: !!p.requiere_observaciones,
    }
    setLineas(updated)
    setProductoSearch(prev => ({ ...prev, [idx]: p.nombre }))
    setProductoDropdown(prev => ({ ...prev, [idx]: false }))
  }

  const agregarLinea = () => {
    setLineas(prev => [...prev, {
      uid: Date.now() + prev.length,
      producto_id: 0,
      producto_nombre: "",
      descripcion: "",
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
      nac: false,
    }])
  }

  const quitarLinea = (idx: number) => {
    setLineas(prev => prev.filter((_, i) => i !== idx))
    setProductoSearch(prev => { const n = { ...prev }; delete n[idx]; return n })
    setProductoOpciones(prev => { const n = { ...prev }; delete n[idx]; return n })
    setProductoDropdown(prev => { const n = { ...prev }; delete n[idx]; return n })
  }

  const updateLinea = (idx: number, patch: Partial<LineaForm>) => {
    setLineas(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const merged = { ...l, ...patch }
      // Recalcular subtotal si cambia cantidad o precio
      if ("cantidad" in patch || "precio_unitario" in patch) {
        merged.subtotal = (merged.cantidad ?? 1) * (merged.precio_unitario ?? 0)
      }
      return merged
    }))
  }

  // ─── Submit ─────────────────────────────────────────────────────────────
  const validar = (): string | null => {
    if (!proveedorId || !proveedorNombre) return "Debe seleccionar un proveedor"
    if (!depositoDestinoNombre) return "Debe seleccionar un Depósito Destino"
    if (!ubicacionDestinoNombre) return "Debe seleccionar una Ubicación Destino"
    if (lineasValidas.length === 0) return "Debe agregar al menos una línea de producto"
    const sinProducto = lineas.findIndex(l => !l.producto_id || !l.producto_nombre.trim())
    if (sinProducto !== -1) return `La línea ${sinProducto + 1} no tiene un producto seleccionado`
    return null
  }

  const guardar = async () => {
    const err = validar()
    if (err) { setError(err); return }
    if (guardando) return
    setError(null)
    setGuardando(true)

    const payload: Record<string, any> = {
      fecha: fecha || new Date().toISOString(),
      fecha_entrega_estimada: fechaEntregaEstimada || null,
      proveedor_id: proveedorId,
      proveedor_nombre: proveedorNombre,
      moneda,
      tipo_cotizacion: tipoCotizacion,
      cotizacion_dia: cotizacionDia,
      sucursal: sucursalNombre,
      sucursal_id: sucursalId,
      deposito_destino: depositoDestinoNombre,
      deposito_destino_id: depositoDestinoId,
      ubicacion: ubicacionDestinoNombre,
      ubicacion_destino: ubicacionDestinoNombre,
      ubicacion_destino_id: ubicacionDestinoId,
      termino_pago: terminoPago,
      metodo_compra: metodoCompra,
      observaciones: observaciones || null,
      items: lineas,
      lineas,
      subtotal: totalOC,
      total: totalOC,
    }
    if (!isEdit) payload.estado = "borrador"

    try {
      const created = await guardarOrdenCompra(payload, isEdit ? initialId : undefined)
      router.push(`/compras/oc/${created.id ?? initialId}`)
    } catch (e: any) {
      setError(`Error al guardar: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargandoBase || cargandoOC) {
    return <div className="p-12 text-center text-gray-500">Cargando…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/compras/oc")} className="text-indigo-700 hover:underline">
          Volver al listado
        </button>
      </div>
    )
  }
  if (isEdit && estadoExistente && estadoExistente !== "borrador") {
    return (
      <div className="p-12 text-center">
        <p className="text-amber-700 mb-2">
          Esta OC está en estado <strong>{estadoExistente}</strong> y no puede editarse.
        </p>
        <button onClick={() => router.push(`/compras/oc/${initialId}`)} className="text-indigo-700 hover:underline">
          Ver ficha de la OC
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              {isEdit ? `Editar ${numeroExistente ?? "OC"}` : "Nueva Orden de Compra"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Modifique los datos del borrador" : "Complete los datos para crear la OC"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white rounded-lg border p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {/* Columna izquierda */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">N° de OC</label>
              <p className="text-sm text-gray-700">
                {numeroExistente ?? <span className="text-gray-400 italic">Generado automáticamente</span>}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Sucursal</label>
              <select
                value={sucursalNombre}
                onChange={e => {
                  const nombre = e.target.value
                  const s = sucursalesActivas.find(x => x.nombre === nombre)
                  setSucursalNombre(nombre)
                  setSucursalId(s?.id ?? null)
                  // Reset depósito
                  setDepositoDestinoId(null)
                  setDepositoDestinoNombre("")
                  setUbicacionDestinoId(null)
                  setUbicacionDestinoNombre("")
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar sucursal…</option>
                {sucursalesActivas.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                Proveedor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProveedorDropdownAbierto(o => !o)}
                  className="w-full text-left px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  {proveedorNombre || <span className="text-gray-400">Seleccionar proveedor…</span>}
                </button>
                {proveedorDropdownAbierto && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
                    <div className="p-2 border-b">
                      <input
                        autoFocus
                        type="text"
                        value={proveedorBusqueda}
                        onChange={e => setProveedorBusqueda(e.target.value)}
                        placeholder="Buscar proveedor…"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {proveedoresFiltrados.map(p => (
                        <div
                          key={p.id}
                          onMouseDown={e => { e.preventDefault(); seleccionarProveedor(p) }}
                          className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                        >
                          <span className="font-medium">{p.nombre || p.razon_social}</span>
                          {p.cuit && <span className="ml-2 text-xs text-gray-400">{p.cuit}</span>}
                        </div>
                      ))}
                      {proveedoresFiltrados.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Término de Pago</label>
              <select
                value={terminoPago}
                onChange={e => setTerminoPago(e.target.value)}
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
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                Método de Compra <span className="text-red-500">*</span>
              </label>
              <select
                value={metodoCompra}
                onChange={e => setMetodoCompra(e.target.value as "estandar" | "inmediato")}
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
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha de Entrega Estimada</label>
              <input
                type="date"
                value={fechaEntregaEstimada}
                onChange={e => setFechaEntregaEstimada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">
                Depósito Destino <span className="text-red-500">*</span>
              </label>
              <select
                value={depositoDestinoId ?? ""}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null
                  const dep = depositos.find(d => d.id === id)
                  setDepositoDestinoId(id)
                  setDepositoDestinoNombre(dep?.nombre ?? "")
                  setUbicacionDestinoId(null)
                  setUbicacionDestinoNombre("")
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar depósito…</option>
                {depositosFiltrados.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs uppercase tracking-wide mb-1 ${depositoDestinoId ? "text-gray-500" : "text-gray-300"}`}>
                Ubicación Destino <span className="text-red-500">*</span>
              </label>
              <select
                value={ubicacionDestinoId ?? ""}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null
                  const ub = ubicaciones.find(u => u.id === id)
                  setUbicacionDestinoId(id)
                  setUbicacionDestinoNombre(ub?.nombre ?? "")
                }}
                disabled={!depositoDestinoId}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white ${
                  depositoDestinoId ? "border-gray-300 text-gray-900" : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                }`}
              >
                <option value="">
                  {depositoDestinoId
                    ? ubicacionesFiltradas.length === 0
                      ? "Sin ubicaciones en este depósito"
                      : "Seleccionar ubicación…"
                    : "Seleccione un depósito primero"}
                </option>
                {ubicacionesFiltradas.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={e => setMoneda(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                {monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)}
              </select>
            </div>
            {moneda !== "ARS" && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo Cotización</label>
                  <select
                    value={tipoCotizacion}
                    onChange={e => setTipoCotizacion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="oficial">Oficial</option>
                    <option value="blue">Blue</option>
                    <option value="mep">MEP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Cotización del Día</label>
                  <input
                    type="number"
                    value={cotizacionDia ?? ""}
                    onChange={e => setCotizacionDia(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white rounded-lg border overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-sm text-gray-900">Productos</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-center py-2.5 px-2 w-14" title="No Actualiza Costo contable">NAC</th>
              <th className="text-left py-2.5 px-4">Producto</th>
              <th className="text-left py-2.5 px-4">Descripción</th>
              <th className="text-right py-2.5 px-4 w-24">Cantidad</th>
              <th className="text-right py-2.5 px-4 w-36">Precio Unit.</th>
              <th className="text-right py-2.5 px-4 w-32">Subtotal</th>
              <th className="w-10 py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lineas.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                  No hay productos. Agregue una línea para comenzar.
                </td>
              </tr>
            )}
            {lineas.map((linea, idx) => (
              <tr key={linea.uid} className="hover:bg-gray-50">
                <td className="py-2 px-2 text-center">
                  <input
                    type="checkbox"
                    checked={linea.nac}
                    onChange={e => updateLinea(idx, { nac: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 accent-indigo-900"
                    title="No actualiza costo contable"
                  />
                </td>
                <td className="py-2 px-4">
                  <div className="relative">
                    <input
                      ref={el => { productoInputRefs.current[idx] = el }}
                      type="text"
                      value={productoSearch[idx] ?? linea.producto_nombre}
                      onChange={e => buscarProductosLinea(idx, e.target.value)}
                      onFocus={async () => {
                        const q = productoSearch[idx] ?? linea.producto_nombre
                        if ((productoOpciones[idx] ?? []).length > 0) {
                          setProductoDropdown(prev => ({ ...prev, [idx]: true }))
                          return
                        }
                        try {
                          const res = await fetchProductos({ busqueda: q || "", activo: true })
                          const filtrado = (res ?? []).filter((p: any) => p.tipo !== "servicio")
                          setProductoOpciones(prev => ({ ...prev, [idx]: filtrado }))
                          setProductoDropdown(prev => ({ ...prev, [idx]: true }))
                        } catch {}
                      }}
                      onBlur={() => setTimeout(() => setProductoDropdown(prev => ({ ...prev, [idx]: false })), 150)}
                      placeholder="Nombre del producto…"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                    />
                    {productoDropdown[idx] && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {(productoOpciones[idx] ?? []).length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-400">Sin resultados</div>
                        ) : (
                          (productoOpciones[idx] ?? []).map(p => (
                            <div
                              key={p.id}
                              onMouseDown={e => { e.preventDefault(); seleccionarProducto(idx, p) }}
                              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer text-xs"
                            >
                              <span className="font-medium">[{p.codigo_interno ?? p.sku ?? "—"}]</span> {p.nombre}
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
                    onChange={e => updateLinea(idx, { descripcion: e.target.value })}
                    placeholder="Descripción…"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    min={1}
                    value={linea.cantidad}
                    onChange={e => updateLinea(idx, { cantidad: Math.max(1, Number(e.target.value)) })}
                    className="w-full text-right px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={linea.precio_unitario}
                    onChange={e => updateLinea(idx, { precio_unitario: Math.max(0, Number(e.target.value)) })}
                    className="w-full text-right px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-4 text-right font-medium text-gray-700">
                  {formatCurrency(linea.subtotal, moneda as "ARS" | "USD")}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => quitarLinea(idx)}
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
                  onClick={agregarLinea}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" /> Agregar línea
                </button>
              </td>
              <td className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                {formatCurrency(totalOC, moneda as "ARS" | "USD")}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observaciones */}
      <div className="bg-white rounded-lg border p-4">
        <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Observaciones</label>
        <textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}
