"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  User,
  Warehouse,
  X,
} from "lucide-react"
import ProductoDropdown from "@/components/producto-dropdown"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"
import SearchableSelect from "@/components/ui/searchable-select"
import { getEstadoNVLabel } from "./_shared"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClienteOpt {
  id: number
  codigo?: string
  nombre: string
  tipo_documento?: string
  numero_documento?: string
  posicion_fiscal?: string
  direccion?: string
  telefono?: string
  celular?: string
  email?: string
  lista_precios_id?: number | null
  categoria_nombre?: string
  termino_pago_id?: number | null
}

interface ProductoOpt {
  id: number
  sku: string
  nombre: string
  descripcion?: string
  precio_venta?: number
  costo?: number
  costo_manual?: number
  moneda_costo?: string
  stock?: number
  categoria?: string
  requiere_serie?: boolean
}

interface ListaPrecios {
  id: number
  nombre: string
  moneda_base?: string
  moneda?: string
  activa?: boolean
}

interface VersionLista {
  id: number
  lista_precios_id: number
  fecha_inicial: string
  fecha_final?: string | null
  activa: boolean
  lineas?: {
    producto_id: number
    iva?: number
    forzar_precio_pesos?: boolean
    precio_forzado_ars?: number | null
    precio_venta?: number
    precio_venta_moneda?: "ARS" | "USD"
    cotizacion_dolar?: number
  }[]
}

interface Deposito {
  id: number
  nombre: string
  sucursal_id?: number | null
  activo?: boolean
}

interface Ubicacion {
  id: number
  deposito_id: number
  nombre: string
  codigo?: string
}

interface Vendedor {
  id: number
  nombre: string
}

interface SerieDisponible {
  id: number
  serie: string
  detalles: string
  fecha_ingreso?: string
  lote?: string | null
}

interface LineaForm {
  uid: number
  producto_id: number
  producto_nombre: string
  producto_sku?: string
  cantidad: number
  precio_unitario: number
  precio_unitario_moneda: "ARS" | "USD"
  precio_unitario_usd: number
  precio_unitario_ars: number
  descuento: number
  subtotal: number
  iva: number
  requiere_serie?: boolean
  series_seleccionadas?: { id: number; serie: string; detalles?: string }[]
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NvForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const { currentUser } = useERP()
  const usuarioNombre = currentUser?.nombre ?? currentUser?.username ?? "sistema"
  const isEdit = initialId != null

  // Loaders
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [productosMaestro, setProductosMaestro] = useState<ProductoOpt[]>([])
  const [productosNV, setProductosNV] = useState<ProductoOpt[]>([])
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [versionesLista, setVersionesLista] = useState<VersionLista[]>([])
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoNV, setCargandoNV] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Form state
  const [nvNumeroExistente, setNvNumeroExistente] = useState<string | null>(null)
  const [nvEstadoExistente, setNvEstadoExistente] = useState<string | null>(null)
  const [nvClienteId, setNvClienteId] = useState<number | null>(null)
  const [nvListaPreciosId, setNvListaPreciosId] = useState<number | null>(null)
  const [nvDepositoId, setNvDepositoId] = useState<number>(0)
  const [nvUbicacionId, setNvUbicacionId] = useState<number>(0)
  const [nvLineas, setNvLineas] = useState<LineaForm[]>([])
  // Override de moneda: cuando entrás a editar una NV en USD pero la lista de
  // precios del cliente es ARS, monedaForm caería a ARS incorrectamente. Este
  // override mantiene la moneda original de la NV hasta que el usuario cambie
  // manualmente la lista de precios.
  const [nvMonedaOverride, setNvMonedaOverride] = useState<"ARS" | "USD" | null>(null)
  // Cotización del USD del día (se fetch al cargar; queda en 1 para facturas ARS).
  // Se propaga a la factura al confirmar venta para que la ficha de factura
  // muestre la cotización real (no 1).
  const [nvCotizacionUsd, setNvCotizacionUsd] = useState<number>(1)

  // Producto search / dropdown
  const [productoSearchIndex, setProductoSearchIndex] = useState<number | null>(null)
  const [productoSearchText, setProductoSearchText] = useState("")
  const productoInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Modal de selección de serie
  const [showSerieModal, setShowSerieModal] = useState(false)
  const [serieModalLineaIndex, setSerieModalLineaIndex] = useState<number | null>(null)
  const [seriesReales, setSeriesReales] = useState<SerieDisponible[]>([])
  const [seriesRealesCargando, setSeriesRealesCargando] = useState(false)
  const [seriesSeleccionadasTemp, setSeriesSeleccionadasTemp] = useState<number[]>([])
  const [serieModalBusqueda, setSerieModalBusqueda] = useState("")

  // Submit state
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  // ─── Loaders iniciales ──────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
      fetch("/api/productos").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios/versiones").then(r => r.json()).catch(() => []),
      fetch("/api/depositos").then(r => r.json()).catch(() => []),
      fetch("/api/ubicaciones").then(r => r.json()).catch(() => []),
      fetch("/api/vendedores").then(r => r.json()).catch(() => []),
    ]).then(([cl, pr, lp, vl, dep, ub, ven]) => {
      if (!activo) return
      if (Array.isArray(cl)) setClientes(cl)
      if (Array.isArray(pr)) {
        setProductosMaestro(pr.map((p: any) => ({
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
        })))
      }
      if (Array.isArray(lp)) setListasPrecios(lp)
      if (Array.isArray(vl)) setVersionesLista(vl)
      if (Array.isArray(dep)) setDepositos(dep)
      if (Array.isArray(ub)) setUbicaciones(ub)
      if (Array.isArray(ven)) setVendedores(ven)
      setCargandoBase(false)
    })
    return () => { activo = false }
  }, [])

  // Default depósito + ubicación cuando ya cargaron y no hay NV existente
  useEffect(() => {
    if (cargandoBase || isEdit) return
    if (nvDepositoId === 0 && depositos.length > 0) {
      const def = depositos[0]
      setNvDepositoId(def.id)
      const ubic = ubicaciones.find(u => u.deposito_id === def.id && u.nombre === "Stock")
        ?? ubicaciones.find(u => u.deposito_id === def.id)
      if (ubic) setNvUbicacionId(ubic.id)
    }
  }, [cargandoBase, depositos, ubicaciones, nvDepositoId, isEdit])

  // ─── Cargar NV existente (modo editar) ──────────────────────────────────
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/notas-venta/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(r.status === 404 ? "Nota de venta no encontrada" : `Error ${r.status}`)
          setCargandoNV(false)
          return
        }
        const nv = await r.json()
        setNvNumeroExistente(nv.numero ?? null)
        setNvEstadoExistente(nv.estado ?? null)
        setNvClienteId(nv.cliente_id ?? null)
        setNvDepositoId(nv.sucursal_id ?? 0)
        setNvMonedaOverride(nv.moneda === "USD" ? "USD" : "ARS")
        setNvLineas((nv.notas_venta_lineas ?? []).map((l: any, idx: number) => ({
          uid: idx + 1,
          producto_id: l.producto_id ?? 0,
          producto_nombre: l.producto_nombre ?? "",
          producto_sku: "",
          cantidad: Number(l.cantidad ?? 1),
          precio_unitario: Number(l.precio_unitario ?? 0),
          precio_unitario_moneda: nv.moneda === "USD" ? "USD" : "ARS",
          precio_unitario_usd: 0,
          precio_unitario_ars: nv.moneda === "USD" ? 0 : Number(l.precio_unitario ?? 0),
          descuento: Number(l.descuento ?? 0),
          subtotal: Number(l.subtotal ?? 0),
          iva: Number(l.iva ?? 0),
          requiere_serie: false,
          series_seleccionadas: [],
        })))
        setCargandoNV(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar la NV")
        setCargandoNV(false)
      })
  }, [isEdit, initialId])

  // Auto-seleccionar lista de precios cuando se elige cliente
  useEffect(() => {
    if (!nvClienteId) return
    const cliente = clientes.find(c => c.id === nvClienteId)
    if (cliente?.lista_precios_id && !nvListaPreciosId) {
      setNvListaPreciosId(cliente.lista_precios_id)
    }
  }, [nvClienteId, clientes, nvListaPreciosId])

  // Cargar productos de la lista seleccionada
  useEffect(() => {
    if (!nvListaPreciosId) {
      setProductosNV([])
      return
    }
    fetch(`/api/listas-precios/items?lista_id=${nvListaPreciosId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) setProductosNV(data)
        else setProductosNV(productosMaestro)
      })
      .catch(() => setProductosNV(productosMaestro))
  }, [nvListaPreciosId, productosMaestro])

  // Auto-fetch cotización USD del día (mismo patrón que factura-form).
  // Si la NV es ARS, queda en 1.
  useEffect(() => {
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => r.json())
      .then((d: any) => { if (d?.tasa) setNvCotizacionUsd(Number(d.tasa)) })
      .catch(() => {})
  }, [])

  // ─── Helpers ────────────────────────────────────────────────────────────
  const selectedCliente = clientes.find(c => c.id === nvClienteId)
  const listaSel = listasPrecios.find(l => l.id === nvListaPreciosId)
  // Prioridad: override (NV existente en USD/ARS) > moneda de la lista > ARS
  const monedaForm = (nvMonedaOverride ?? listaSel?.moneda_base ?? "ARS") as "ARS" | "USD"
  const esUsdForm = monedaForm === "USD"

  const subtotalEnMoneda = (l: LineaForm) =>
    (esUsdForm ? (l.precio_unitario_usd ?? 0) : (l.precio_unitario_ars ?? l.precio_unitario ?? 0)) *
    l.cantidad * (1 - l.descuento / 100)

  const subtotal = useMemo(
    () => nvLineas.reduce((s, l) => s + subtotalEnMoneda(l), 0),
    [nvLineas, esUsdForm],
  )

  const total = subtotal

  const subtotalArsRef = esUsdForm
    ? nvLineas.reduce((s, l) => s + (l.precio_unitario_ars ?? 0) * l.cantidad * (1 - l.descuento / 100), 0)
    : 0

  const impuestosCalc = nvLineas.reduce((sum, l) => {
    const tasa = (l.iva ?? 0) / 100
    const sub = subtotalEnMoneda(l)
    if (tasa === 0) return sum
    const neto = sub / (1 + tasa)
    return sum + (sub - neto)
  }, 0)

  // ─── Modal series ───────────────────────────────────────────────────────
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
        serie: u.nro_serie || `ID:${u.id}`,
        lote: u.origen_numero || null,
        detalles: [u.color, u.bateria_pct ? `Batería ${u.bateria_pct}%` : null, u.observaciones]
          .filter(Boolean).join(" - "),
        fecha_ingreso: u.created_at?.split("T")[0] || "",
      }))
      setSeriesReales(mapeadas)
    } catch {
      setSeriesReales([])
    } finally {
      setSeriesRealesCargando(false)
    }
  }

  const cerrarModalSerie = () => {
    setShowSerieModal(false)
    setSerieModalLineaIndex(null)
    setSeriesSeleccionadasTemp([])
    setSerieModalBusqueda("")
  }

  // ─── Validación + guardado ──────────────────────────────────────────────
  const lineasValidas = nvLineas.filter(l => l.producto_id > 0 && l.producto_nombre.trim() !== "")

  const validar = (): string | null => {
    if (!nvClienteId) return "Debe seleccionar un cliente"
    if (lineasValidas.length === 0) return "Debe agregar al menos un producto válido"
    const sinSerie = lineasValidas.filter(l =>
      l.requiere_serie && (!l.series_seleccionadas || l.series_seleccionadas.length < l.cantidad)
    )
    if (sinSerie.length > 0) {
      return `Debe seleccionar IMEI/Serie para: ${sinSerie.map(l => l.producto_nombre).join(", ")}`
    }
    return null
  }

  const guardarPedido = async () => {
    const err = validar()
    if (err) { setErrorGuardado(err); return }
    if (guardando) return
    setErrorGuardado(null)
    setGuardando(true)

    const payload = construirPayloadNV("borrador")

    try {
      let res: Response
      if (isEdit && initialId) {
        res = await fetch(`/api/notas-venta/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/notas-venta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const text = await res.text()
        setErrorGuardado(`Error al guardar (HTTP ${res.status}): ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      const id = data.id ?? initialId
      router.push(`/ventas/nv/${id}`)
    } catch (e: any) {
      setErrorGuardado(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const confirmarVenta = async () => {
    const err = validar()
    if (err) { setErrorGuardado(err); return }
    if (guardando) return
    setErrorGuardado(null)
    setGuardando(true)

    const cliente = clientes.find(c => c.id === nvClienteId)!
    const depositoSeleccionado = depositos.find(d => d.id === nvDepositoId)
    const depositoNombre = depositoSeleccionado?.nombre || "Sin depósito"
    const fechaHoy = new Date().toISOString()
    const payloadNV = construirPayloadNV("facturada")

    try {
      // 1. Crear o actualizar NV con estado=facturada
      let nvIdFinal: number
      let nvNumeroFinal: string
      if (isEdit && initialId) {
        const nvRes = await fetch(`/api/notas-venta/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadNV),
        })
        if (!nvRes.ok) {
          const text = await nvRes.text()
          setErrorGuardado(`Error al actualizar NV (HTTP ${nvRes.status}): ${text}`)
          setGuardando(false)
          return
        }
        nvIdFinal = initialId
        nvNumeroFinal = nvNumeroExistente ?? ""
      } else {
        const nvRes = await fetch("/api/notas-venta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadNV),
        })
        if (!nvRes.ok) {
          const text = await nvRes.text()
          setErrorGuardado(`Error al crear NV (HTTP ${nvRes.status}): ${text}`)
          setGuardando(false)
          return
        }
        const nvData = await nvRes.json()
        nvIdFinal = nvData.id
        nvNumeroFinal = nvData.numero
      }

      // 2. OE
      let oeNumero = ""
      let oeIdFinal: number | null = null
      try {
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
            deposito: depositoNombre,
            sucursal_id: nvDepositoId || null,
            fecha: fechaHoy,
            total_productos: lineasValidas.length,
            productos: lineasValidas.map(l => ({
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              cantidad: l.cantidad,
              reserva: l.cantidad,
              estado: "confirmado",
            })),
          }),
        })
        if (oeRes.ok) {
          const oeData = await oeRes.json()
          oeNumero = oeData.numero || ""
          oeIdFinal = oeData.id ?? null
        }
      } catch (_) {}

      // 3. Remito
      let remitoId: number | null = null
      let remitoNumero: string | null = null
      try {
        const remRes = await fetch("/api/remitos-venta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numero: null,
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            orden_entrega_id: oeIdFinal,
            orden_entrega_numero: oeNumero,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            estado: "emitido",
            deposito: depositoNombre,
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
          remitoId = remData.id
          remitoNumero = remData.numero || null
        }
      } catch (_) {}

      // 4. Confirmar remito → descuenta stock + asiento CMV
      if (remitoId) {
        try {
          await fetch(`/api/remitos/${remitoId}/confirmar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              remito_numero: remitoNumero,
              nv_numero: nvNumeroFinal,
              oe_numero: oeNumero,
              deposito_id: nvDepositoId || null,
              deposito_nombre: depositoNombre,
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
        } catch (_) {}
      }

      // 5. Factura abierta vinculada
      try {
        const facRes = await fetch("/api/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nota_venta_id: nvIdFinal,
            nota_venta_numero: nvNumeroFinal,
            cliente_id: cliente.id,
            cliente_nombre: cliente.nombre,
            vendedor_nombre: vendedores[0]?.nombre ?? "",
            sucursal: depositoNombre,
            fecha: fechaHoy,
            estado: "abierta",
            moneda: monedaForm,
            tipo_cotizacion: "blue",
            cotizacion: monedaForm === "USD" ? nvCotizacionUsd : 1,
            termino_pago: null,
            subtotal: payloadNV.subtotal,
            descuento: 0,
            impuestos: payloadNV.impuestos,
            total: payloadNV.total,
            saldo: payloadNV.total,
            lineas: lineasValidas.map(l => ({
              producto_id: l.producto_id,
              producto_nombre: l.producto_nombre,
              descripcion: l.producto_nombre,
              cantidad: l.cantidad,
              precio_unitario: esUsdForm ? l.precio_unitario_usd : l.precio_unitario_ars,
              descuento: l.descuento,
              subtotal: subtotalEnMoneda(l),
            })),
          }),
        })
        if (!facRes.ok) {
          const errText = await facRes.text()
          console.error("[NV form] Error creando factura:", facRes.status, errText)
        }
      } catch (e) {
        console.error("[NV form] Error creando factura:", e)
      }

      router.push(`/ventas/nv/${nvIdFinal}`)
    } catch (e: any) {
      setErrorGuardado(`Error en cascada: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const construirPayloadNV = (estado: "borrador" | "abierta" | "facturada") => {
    const lineasPayload = lineasValidas.map(l => ({
      producto_id: l.producto_id,
      producto_nombre: l.producto_nombre,
      descripcion: l.producto_nombre,
      cantidad: l.cantidad,
      precio_unitario: esUsdForm ? l.precio_unitario_usd : l.precio_unitario_ars,
      descuento: l.descuento,
      subtotal: subtotalEnMoneda(l),
      iva: l.iva,
    }))
    return {
      numero: null,
      cliente_id: nvClienteId,
      vendedor_id: vendedores[0]?.id ?? null,
      sucursal_id: nvDepositoId || null,
      moneda: monedaForm,
      estado,
      subtotal,
      impuestos: impuestosCalc,
      total,
      lineas: lineasPayload,
      usuario: usuarioNombre,
    }
  }

  // ─── Render guards ──────────────────────────────────────────────────────
  if (cargandoBase || cargandoNV) {
    return <div className="p-12 text-center text-gray-500">Cargando datos…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/ventas/nv")} className="text-indigo-700 hover:underline">
          Volver al listado
        </button>
      </div>
    )
  }
  if (isEdit && nvEstadoExistente && nvEstadoExistente !== "abierta" && nvEstadoExistente !== "borrador") {
    return (
      <div className="p-12 text-center">
        <p className="text-amber-700 mb-2">
          Esta NV está en estado <strong>{getEstadoNVLabel(nvEstadoExistente)}</strong> y no puede editarse.
        </p>
        <p className="text-gray-500 text-sm mb-4">
          Solo las NVs en estado "borrador" o "abierta" (sin factura/remito generado) pueden modificarse.
        </p>
        <button onClick={() => router.push(`/ventas/nv/${initialId}`)} className="text-indigo-700 hover:underline">
          Ver ficha de la NV
        </button>
      </div>
    )
  }

  // ─── UI ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              {isEdit ? `Editar ${nvNumeroExistente ?? "Nota de Venta"}` : "Nueva Nota de Venta"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Modifique los datos y guarde" : "Complete los datos para crear la nota de venta"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          {(!isEdit || nvEstadoExistente === "borrador") && (
            <button
              onClick={confirmarVenta}
              disabled={guardando || !nvClienteId || lineasValidas.length === 0}
              className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title={isEdit
                ? "Pasa la NV a facturada y genera OE + Remito + Factura abierta (descuenta stock)"
                : "Crea NV + OE + Remito + Factura abierta y descuenta stock"}
            >
              {guardando ? "Procesando…" : "Confirmar Venta"}
            </button>
          )}
          <button
            onClick={guardarPedido}
            disabled={guardando || !nvClienteId || lineasValidas.length === 0}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar Pedido"}
          </button>
        </div>
      </div>

      {errorGuardado && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorGuardado}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Cliente */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Datos del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <SearchableSelect
                  value={nvClienteId}
                  onChange={v => {
                    const id = v == null ? null : Number(v)
                    setNvClienteId(id)
                    setNvMonedaOverride(null) // user cambia cliente → ya no aplica la moneda original de la NV
                    if (id) {
                      const cli = clientes.find(c => c.id === id)
                      if (cli?.lista_precios_id) setNvListaPreciosId(cli.lista_precios_id)
                    }
                  }}
                  options={clientes.map(c => ({
                    value: String(c.id),
                    label: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre,
                    hint: c.telefono ?? c.celular ? `Tel: ${c.telefono ?? c.celular}` : undefined,
                    searchExtra: `${c.codigo ?? ""} ${c.telefono ?? ""} ${c.celular ?? ""} ${c.numero_documento ?? ""}`,
                  }))}
                  placeholder="Buscar cliente por nombre, código o teléfono…"
                  required
                />
              </div>
              {selectedCliente && (
                <>
                  <div>
                    <span className="text-xs text-gray-500">Documento</span>
                    <p className="font-medium">{selectedCliente.tipo_documento}: {selectedCliente.numero_documento ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Posición Fiscal</span>
                    <p className="font-medium capitalize">{selectedCliente.posicion_fiscal?.replace("_", " ") ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Dirección</span>
                    <p className="font-medium">{selectedCliente.direccion ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Teléfono</span>
                    <p className="font-medium">{selectedCliente.telefono ?? selectedCliente.celular ?? "—"}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {!nvClienteId && (
            <div className="bg-amber-50 border border-amber-300 rounded p-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Seleccioná un cliente arriba para habilitar la lista de precios y los productos.
            </div>
          )}

          <div className={!nvClienteId ? "space-y-6 opacity-50 pointer-events-none select-none" : "contents"}>
            {/* Lista de precios */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Lista de Precios
              </h3>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lista de precios *</label>
                  <SearchableSelect
                    value={nvListaPreciosId}
                    onChange={v => {
                      setNvMonedaOverride(null) // user cambia lista → respetar la moneda de esta lista
                      setNvListaPreciosId(v == null ? null : Number(v))
                    }}
                    options={listasPrecios.filter(l => l.activa !== false).map(l => ({
                      value: String(l.id),
                      label: l.nombre,
                      hint: l.moneda_base ?? undefined,
                    }))}
                    placeholder="Buscar lista de precios…"
                    required
                  />
                </div>
                <div className="text-sm text-gray-500">
                  {nvListaPreciosId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Moneda:</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                        {monedaForm}
                      </span>
                    </div>
                  )}
                  {!nvListaPreciosId && (
                    <span className="text-amber-600">Seleccione una lista para agregar productos</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Warehouse className="w-4 h-4" /> Ubicación de Stock
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Depósito</label>
                  <select
                    value={nvDepositoId}
                    onChange={e => {
                      const id = parseInt(e.target.value, 10)
                      setNvDepositoId(id)
                      const ub = ubicaciones.find(u => u.deposito_id === id && u.nombre === "Stock")
                        ?? ubicaciones.find(u => u.deposito_id === id)
                      if (ub) setNvUbicacionId(ub.id)
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
                    onChange={e => setNvUbicacionId(parseInt(e.target.value, 10))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ubicaciones
                      .filter(u => u.deposito_id === nvDepositoId)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                El stock se descontará de:{" "}
                <span className="font-medium">
                  {ubicaciones.find(u => u.id === nvUbicacionId)?.codigo ??
                    ubicaciones.find(u => u.id === nvUbicacionId)?.nombre ?? "—"}
                </span>
              </p>
            </div>

            {/* Productos */}
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
                      <th className="text-center py-1.5 px-2 w-14">Cant.</th>
                      <th className="text-right py-1.5 px-2 w-28">Precio USD</th>
                      <th className="text-right py-1.5 px-2 w-32">Precio ARS</th>
                      <th className="text-center py-1.5 px-2 w-16">Dto.%</th>
                      <th className="text-right py-1.5 px-2 w-28">Subtotal</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {nvLineas.map((linea, index) => (
                      <tr key={linea.uid} className="border-b">
                        <td className="py-1 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                ref={el => { productoInputRefs.current[index] = el }}
                                type="text"
                                autoComplete="off"
                                spellCheck={false}
                                value={productoSearchIndex === index ? productoSearchText : linea.producto_nombre}
                                onChange={e => {
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
                                placeholder="Buscar producto…"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              {productoSearchIndex === index && (
                                <ProductoDropdown
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
                                    updated[index].subtotal =
                                      updated[index].cantidad * precioUnitario *
                                      (1 - updated[index].descuento / 100)
                                    setNvLineas(updated)
                                    setProductoSearchIndex(null)
                                    setProductoSearchText("")
                                    if (p.requiere_serie) {
                                      setTimeout(() => abrirModalSerie(index, []), 100)
                                    }
                                  }}
                                />
                              )}
                            </div>
                            {linea.requiere_serie && linea.producto_id > 0 && (
                              <button
                                type="button"
                                onClick={() => abrirModalSerie(index, linea.series_seleccionadas?.map(s => s.id) ?? [])}
                                className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
                                  (linea.series_seleccionadas?.length ?? 0) === linea.cantidad
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {linea.series_seleccionadas?.length ?? 0}/{linea.cantidad} IMEI
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            value={linea.cantidad}
                            min={1}
                            onChange={e => {
                              const updated = [...nvLineas]
                              const newCantidad = parseInt(e.target.value, 10) || 1
                              updated[index].cantidad = newCantidad
                              updated[index].subtotal =
                                newCantidad * updated[index].precio_unitario *
                                (1 - updated[index].descuento / 100)
                              if (
                                updated[index].series_seleccionadas &&
                                updated[index].series_seleccionadas!.length > newCantidad
                              ) {
                                updated[index].series_seleccionadas =
                                  updated[index].series_seleccionadas!.slice(0, newCantidad)
                              }
                              setNvLineas(updated)
                            }}
                            className="w-14 border border-gray-300 rounded px-1 py-1 text-sm text-center"
                          />
                        </td>
                        <td className="py-1 px-2 text-right text-sm text-blue-700 font-medium">
                          {linea.precio_unitario_usd > 0
                            ? `US$ ${linea.precio_unitario_usd.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-1 px-2 text-right text-sm font-medium">
                          {linea.precio_unitario_ars > 0
                            ? `ARS $ ${linea.precio_unitario_ars.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            value={linea.descuento}
                            min={0}
                            max={100}
                            step={0.01}
                            onChange={e => {
                              const updated = [...nvLineas]
                              updated[index].descuento = parseFloat(e.target.value) || 0
                              updated[index].subtotal =
                                updated[index].cantidad * updated[index].precio_unitario *
                                (1 - updated[index].descuento / 100)
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
              <div className="px-2 py-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setNvLineas([
                      ...nvLineas,
                      {
                        uid: Date.now() + nvLineas.length,
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
                        iva: 21,
                      },
                    ])
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Agregar producto
                </button>
              </div>
            </div>

            {/* Lotes y series */}
            {nvLineas.some(l => l.requiere_serie && (l.series_seleccionadas?.length ?? 0) > 0) && (
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
                        .filter(l => l.requiere_serie && (l.series_seleccionadas?.length ?? 0) > 0)
                        .flatMap(linea =>
                          linea.series_seleccionadas!.map((serie, serieIdx) => (
                            <tr key={`${linea.uid}-${serie.id}`} className="border-b border-gray-100 last:border-0">
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
                                    const idx = updated.findIndex(l => l.uid === linea.uid)
                                    if (idx !== -1) {
                                      updated[idx].series_seleccionadas =
                                        updated[idx].series_seleccionadas?.filter(s => s.id !== serie.id)
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
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Configuración de Venta</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoría de Cliente</label>
                {selectedCliente ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {selectedCliente.categoria_nombre ?? "Sin categoría"}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">Seleccione un cliente</span>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Lista por defecto</label>
                {selectedCliente ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {listasPrecios.find(l => l.id === selectedCliente.lista_precios_id)?.nombre ?? "Sin asignar"}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">Seleccione un cliente</span>
                )}
              </div>
            </div>
          </div>

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
                      <div className="text-xs text-gray-400 font-normal">
                        ARS {formatCurrency(subtotalArsRef, "ARS")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal series */}
      {showSerieModal && serieModalLineaIndex !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar IMEI / Serie</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {nvLineas[serieModalLineaIndex]?.producto_nombre} — Cantidad: {nvLineas[serieModalLineaIndex]?.cantidad}
                </p>
              </div>
              <button onClick={cerrarModalSerie} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Ubicación:{" "}
                  <span className="font-medium">
                    {ubicaciones.find(u => u.id === nvUbicacionId)?.codigo ??
                      ubicaciones.find(u => u.id === nvUbicacionId)?.nombre ?? "—"}
                  </span>
                </span>
                <span
                  className={`text-sm font-medium ${
                    seriesSeleccionadasTemp.length === nvLineas[serieModalLineaIndex]?.cantidad
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {seriesSeleccionadasTemp.length} de {nvLineas[serieModalLineaIndex]?.cantidad} seleccionados
                </span>
              </div>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° de serie / IMEI…"
                  value={serieModalBusqueda}
                  onChange={e => setSerieModalBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                {seriesRealesCargando ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Cargando series disponibles…</p>
                  </div>
                ) : seriesReales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay series disponibles en esta ubicación</p>
                    <p className="text-sm mt-1">Cambie la ubicación o verifique el inventario</p>
                  </div>
                ) : (
                  seriesReales
                    .filter(s => !serieModalBusqueda || s.serie?.toLowerCase().includes(serieModalBusqueda.toLowerCase()))
                    .map(serie => {
                      const isSelected = seriesSeleccionadasTemp.includes(serie.id)
                      const cantidadRequerida = nvLineas[serieModalLineaIndex!]?.cantidad ?? 0
                      const puedeSeleccionar = seriesSeleccionadasTemp.length < cantidadRequerida
                      return (
                        <label
                          key={serie.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50"
                              : puedeSeleccionar
                                ? "border-gray-200 hover:bg-gray-50"
                                : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isSelected && !puedeSeleccionar}
                            onChange={e => {
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
                            {serie.fecha_ingreso && <div className="text-xs text-gray-400 mt-1">Ingreso: {serie.fecha_ingreso}</div>}
                          </div>
                        </label>
                      )
                    })
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <span className="text-sm text-gray-500">
                {seriesSeleccionadasTemp.length < (nvLineas[serieModalLineaIndex]?.cantidad ?? 0) && (
                  <span className="text-amber-600">
                    Faltan seleccionar {(nvLineas[serieModalLineaIndex]?.cantidad ?? 0) - seriesSeleccionadasTemp.length} unidades
                  </span>
                )}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={cerrarModalSerie}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const updated = [...nvLineas]
                    updated[serieModalLineaIndex].series_seleccionadas =
                      seriesSeleccionadasTemp.map(id => {
                        const s = seriesReales.find(x => x.id === id)!
                        return { id: s.id, serie: s.serie, detalles: s.detalles }
                      })
                    setNvLineas(updated)
                    cerrarModalSerie()
                  }}
                  disabled={seriesSeleccionadasTemp.length !== nvLineas[serieModalLineaIndex]?.cantidad}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-900 hover:bg-indigo-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar selección
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
