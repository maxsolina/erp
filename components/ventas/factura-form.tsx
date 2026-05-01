"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react"
import ProductoDropdown from "@/components/producto-dropdown"
import BloquesMediosPago, { type LineaPago } from "@/components/bloques-medios-pago"
import { formatCurrency } from "@/lib/format"

interface ClienteOpt {
  id: number
  codigo?: string
  nombre: string
  tipo_documento?: string
  numero_documento?: string
  posicion_fiscal?: string
  direccion?: string
  lista_precios_id?: number | null
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

interface Vendedor { id: number; nombre: string }
interface TerminoPago { id: number; nombre: string; dias?: number }
interface Sucursal { id: number; nombre: string; codigo?: string; activa?: boolean }
interface Tarjeta { id: number; nombre: string; tipo: "credito" | "debito"; activa: boolean }
interface GrupoTarjeta { id: number; nombre: string; cargos: { nombre: string; arancel: number }[] }
interface RecargoTarjeta {
  id: number
  tarjeta_id: number
  grupo_id: number
  desde_cuota: number
  hasta_cuota: number
  recargo_pct: number
  activo: boolean
  dias: { dom: boolean; lun: boolean; mar: boolean; mie: boolean; jue: boolean; vie: boolean; sab: boolean }
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
}

export default function FacturaForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null

  // Loaders
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [productosMaestro, setProductosMaestro] = useState<ProductoOpt[]>([])
  const [productosLista, setProductosLista] = useState<ProductoOpt[]>([])
  const [listasPrecios, setListasPrecios] = useState<ListaPrecios[]>([])
  const [versionesLista, setVersionesLista] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [terminosPago, setTerminosPago] = useState<TerminoPago[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [gruposTarjeta, setGruposTarjeta] = useState<GrupoTarjeta[]>([])
  const [recargosTarjeta, setRecargosTarjeta] = useState<RecargoTarjeta[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoFactura, setCargandoFactura] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // Form state
  const [facturaNumeroExistente, setFacturaNumeroExistente] = useState<string | null>(null)
  const [facturaEstadoExistente, setFacturaEstadoExistente] = useState<string | null>(null)
  const [facturaClienteId, setFacturaClienteId] = useState<number | null>(null)
  const [facturaListaPreciosId, setFacturaListaPreciosId] = useState<number | null>(null)
  const [facturaMoneda, setFacturaMoneda] = useState<"ARS" | "USD">("ARS")
  const [facturaCotizacion, setFacturaCotizacion] = useState<number>(1)
  const [facturaLineas, setFacturaLineas] = useState<LineaForm[]>([])
  const [mediosLineas, setMediosLineas] = useState<LineaPago[]>([])
  const [estadoPago, setEstadoPago] = useState<{ cobrado: boolean; tieneLineas: boolean; diferenciaOk: boolean }>({
    cobrado: false, tieneLineas: false, diferenciaOk: false,
  })

  // Producto search
  const [productoSearchIndex, setProductoSearchIndex] = useState<number | null>(null)
  const [productoSearchText, setProductoSearchText] = useState("")
  const productoInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Submit state
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [modalValidacionMsg, setModalValidacionMsg] = useState<string | null>(null)

  // ─── Loaders ────────────────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
      fetch("/api/productos").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios").then(r => r.json()).catch(() => []),
      fetch("/api/listas-precios/versiones").then(r => r.json()).catch(() => []),
      fetch("/api/vendedores").then(r => r.json()).catch(() => []),
      fetch("/api/terminos-pago").then(r => r.json()).catch(() => []),
      fetch("/api/sucursales").then(r => r.json()).catch(() => []),
      fetch("/api/tarjetas").then(r => r.json()).catch(() => []),
      fetch("/api/grupos-tarjeta").then(r => r.json()).catch(() => []),
      fetch("/api/recargos-tarjeta").then(r => r.json()).catch(() => []),
    ]).then(([cl, pr, lp, vl, ven, tp, suc, tar, gru, rec]) => {
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
      if (Array.isArray(ven)) setVendedores(ven)
      if (Array.isArray(tp)) setTerminosPago(tp)
      if (Array.isArray(suc)) setSucursales(suc)
      if (Array.isArray(tar)) setTarjetas(tar)
      if (Array.isArray(gru)) setGruposTarjeta(gru)
      if (Array.isArray(rec)) setRecargosTarjeta(rec)
      setCargandoBase(false)
    })
    return () => { activo = false }
  }, [])

  // Cargar factura existente
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/facturas?id=${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(`Error ${r.status}`)
          setCargandoFactura(false)
          return
        }
        const data = await r.json()
        const factura = Array.isArray(data) ? data[0] : data
        if (!factura) {
          setErrorCarga("Factura no encontrada")
          setCargandoFactura(false)
          return
        }
        setFacturaNumeroExistente(factura.numero ?? null)
        setFacturaEstadoExistente(factura.estado ?? null)
        setFacturaClienteId(factura.cliente_id ?? null)
        setFacturaMoneda(factura.moneda === "USD" ? "USD" : "ARS")
        setFacturaCotizacion(Number(factura.cotizacion ?? 1))
        setFacturaLineas((factura.facturas_lineas ?? []).map((l: any, idx: number) => ({
          uid: idx + 1,
          producto_id: l.producto_id ?? 0,
          producto_nombre: l.producto_nombre ?? "",
          producto_sku: "",
          cantidad: Number(l.cantidad ?? 1),
          precio_unitario: Number(l.precio_unitario ?? 0),
          precio_unitario_moneda: factura.moneda === "USD" ? "USD" : "ARS",
          precio_unitario_usd: factura.moneda === "USD" ? Number(l.precio_unitario ?? 0) : 0,
          precio_unitario_ars: factura.moneda === "USD" ? 0 : Number(l.precio_unitario ?? 0),
          descuento: Number(l.descuento ?? 0),
          subtotal: Number(l.subtotal ?? 0),
          iva: Number(l.iva ?? 0),
        })))
        setCargandoFactura(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar la factura")
        setCargandoFactura(false)
      })
  }, [isEdit, initialId])

  // Auto-seleccionar lista de precios cuando se elige cliente
  useEffect(() => {
    if (!facturaClienteId) return
    const cliente = clientes.find(c => c.id === facturaClienteId)
    if (cliente?.lista_precios_id && !facturaListaPreciosId) {
      setFacturaListaPreciosId(cliente.lista_precios_id)
    }
  }, [facturaClienteId, clientes, facturaListaPreciosId])

  // Derivar moneda de la lista
  useEffect(() => {
    const lista = listasPrecios.find(l => l.id === facturaListaPreciosId)
    if (lista) setFacturaMoneda(lista.moneda_base === "USD" ? "USD" : "ARS")
  }, [facturaListaPreciosId, listasPrecios])

  // Cargar productos de la lista
  useEffect(() => {
    if (!facturaListaPreciosId) {
      setProductosLista([])
      return
    }
    fetch(`/api/listas-precios/items?lista_id=${facturaListaPreciosId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) setProductosLista(data)
        else setProductosLista(productosMaestro)
      })
      .catch(() => setProductosLista(productosMaestro))
  }, [facturaListaPreciosId, productosMaestro])

  // Auto-fetch cotización para facturas USD
  useEffect(() => {
    if (facturaMoneda !== "USD") { setFacturaCotizacion(1); return }
    fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
      .then(r => r.json())
      .then((d: any) => { if (d?.tasa) setFacturaCotizacion(Number(d.tasa)) })
      .catch(() => {})
  }, [facturaMoneda])

  // ─── Helpers ────────────────────────────────────────────────────────────
  const selectedCliente = clientes.find(c => c.id === facturaClienteId)
  const lineasValidas = facturaLineas.filter(l => l.producto_id > 0 && l.producto_nombre.trim() !== "")
  const subtotal = useMemo(
    () => lineasValidas.reduce((s, l) => s + l.subtotal, 0),
    [lineasValidas],
  )

  const construirPayloadCabecera = (estado: "borrador" | "abierta") => ({
    cliente_id: selectedCliente?.id,
    cliente_nombre: selectedCliente?.nombre,
    vendedor_nombre: vendedores[0]?.nombre ?? null,
    sucursal: sucursales[0]?.nombre ?? null,
    fecha: new Date().toISOString(),
    estado,
    moneda: facturaMoneda,
    cotizacion: facturaMoneda === "USD" ? facturaCotizacion : 1,
    termino_pago: terminosPago.find(tp => tp.id === selectedCliente?.termino_pago_id)?.nombre ?? "Contado",
    subtotal,
    descuento: 0,
    lineas: lineasValidas.map(l => ({
      producto_id: l.producto_id,
      producto_nombre: l.producto_nombre,
      descripcion: l.producto_nombre,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      descuento: l.descuento,
      subtotal: l.subtotal,
    })),
  })

  // ─── Acciones ───────────────────────────────────────────────────────────
  const validarBasico = (): string | null => {
    if (!selectedCliente) return "Debe seleccionar un cliente"
    if (lineasValidas.length === 0) return "Debe agregar al menos un producto válido"
    return null
  }

  const guardarBorrador = async () => {
    const err = validarBasico()
    if (err) { setErrorGuardado(err); return }
    if (guardando) return
    setErrorGuardado(null)
    setGuardando(true)

    try {
      let res: Response
      if (isEdit && initialId) {
        res = await fetch(`/api/facturas/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayloadCabecera("borrador")),
        })
      } else {
        res = await fetch("/api/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayloadCabecera("borrador")),
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
      router.push(`/ventas/facturas/${id}`)
    } catch (e: any) {
      setErrorGuardado(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const confirmarFactura = async () => {
    const err = validarBasico()
    if (err) { setErrorGuardado(err); return }
    if (subtotal <= 0) {
      setModalValidacionMsg("No se puede confirmar una factura con total $0,00. Revisá los precios de las líneas.")
      return
    }
    if (!estadoPago.tieneLineas) {
      setModalValidacionMsg("Debés ingresar al menos un medio de pago antes de confirmar la factura.")
      return
    }
    if (!estadoPago.cobrado) {
      setModalValidacionMsg('El cobro no fue confirmado. Completá los medios de pago y presioná "Listo".')
      return
    }
    if (guardando) return
    setErrorGuardado(null)
    setGuardando(true)

    try {
      // 1. Crear factura "abierta" (nuevo) o guardar borrador (edit) → /confirmar
      //    promueve a "confirmada" al final igual.
      let facId: number
      let facNumero: string
      if (isEdit && initialId) {
        const putRes = await fetch(`/api/facturas/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayloadCabecera("borrador")),
        })
        if (!putRes.ok) {
          const text = await putRes.text()
          setErrorGuardado(`Error al guardar antes de confirmar: ${text}`)
          setGuardando(false)
          return
        }
        facId = initialId
        facNumero = facturaNumeroExistente ?? ""
      } else {
        const facRes = await fetch("/api/facturas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayloadCabecera("abierta")),
        })
        if (!facRes.ok) {
          const text = await facRes.text()
          setErrorGuardado(`Error al crear factura: ${text}`)
          setGuardando(false)
          return
        }
        const facData = await facRes.json()
        facId = facData.id
        facNumero = facData.numero
      }

      // 2. Construir medios para /confirmar
      let monedaActual: "ARS" | "USD" = facturaMoneda
      const medios = mediosLineas
        .filter(l => l.monto > 0)
        .map(l => {
          let recargo_pct = 0
          if (l.medio === "tarjeta" && l.tarjeta_id) {
            const hoy = new Date()
            const diasKeys = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const
            const diaKey = diasKeys[hoy.getDay()]
            const rec = recargosTarjeta.find(r =>
              r.tarjeta_id === l.tarjeta_id && r.activo &&
              (l.cuotas || 1) >= r.desde_cuota && (l.cuotas || 1) <= r.hasta_cuota && r.dias[diaKey]
            )
            recargo_pct = rec?.recargo_pct ?? 0
          }
          let montoEnFac = l.monto
          if (l.moneda && l.moneda !== facturaMoneda) {
            if (l.moneda === "USD" && facturaMoneda === "ARS") {
              montoEnFac = l.monto * (l as any).cotizacion ?? l.monto * facturaCotizacion
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

      // 3. Si la factura es USD y hay tarjeta/transferencia, convertir a ARS
      const tieneFacturable = medios.some(m => m.medio === "tarjeta" || m.medio === "transferencia")
      if (facturaMoneda !== "ARS" && tieneFacturable) {
        const subtotalArs = subtotal * facturaCotizacion
        const ok = window.confirm(
          `Esta factura está en ${facturaMoneda}.\n\n` +
          `Para aplicar IVA y recargos hay que convertirla a pesos.\n\n` +
          `Cotización: blue · 1 ${facturaMoneda} = $${facturaCotizacion.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n` +
          `Subtotal en pesos: $${subtotalArs.toLocaleString("es-AR", { minimumFractionDigits: 2 })}\n\n` +
          `(El IVA y el recargo se calculan después y se suman al total final.)\n\n` +
          `¿Convertir y continuar?`
        )
        if (!ok) {
          setErrorGuardado(
            `La factura ${facNumero} quedó pendiente en ${facturaMoneda}. Podés cancelarla o completarla más tarde.`
          )
          setGuardando(false)
          router.push(`/ventas/facturas/${facId}`)
          return
        }
        const conv = await fetch(`/api/facturas/${facId}/convertir-a-ars`, { method: "POST" })
        if (!conv.ok) {
          const ce = await conv.json().catch(() => ({ error: "Error al convertir factura" }))
          setErrorGuardado(`No se pudo convertir la factura: ${ce.error ?? "error"}`)
          setGuardando(false)
          router.push(`/ventas/facturas/${facId}`)
          return
        }
        monedaActual = "ARS"
        for (const m of medios) {
          m.monto = Math.round(m.monto * facturaCotizacion * 100) / 100
        }
      }

      // 4. Confirmar
      const confRes = await fetch(`/api/facturas/${facId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medios }),
      })
      if (!confRes.ok) {
        const ce = await confRes.json().catch(() => ({ error: "Error al confirmar factura" }))
        setErrorGuardado(`Factura ${facNumero} pendiente, no confirmada: ${ce.error ?? "error"}`)
        setGuardando(false)
        router.push(`/ventas/facturas/${facId}`)
        return
      }

      router.push(`/ventas/facturas/${facId}`)
    } catch (e: any) {
      setErrorGuardado(`Error en cascada: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  // ─── Render guards ──────────────────────────────────────────────────────
  if (cargandoBase || cargandoFactura) {
    return <div className="p-12 text-center text-gray-500">Cargando datos…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/ventas/facturas")} className="text-indigo-700 hover:underline">
          Volver al listado
        </button>
      </div>
    )
  }
  if (isEdit && facturaEstadoExistente && facturaEstadoExistente !== "borrador") {
    return (
      <div className="p-12 text-center">
        <p className="text-amber-700 mb-2">
          Esta factura está en estado <strong>{facturaEstadoExistente}</strong> y no puede editarse.
        </p>
        <p className="text-gray-500 text-sm mb-4">
          Solo facturas en estado "borrador" son editables. Para registrar cobros usá "Registrar Cobro" desde la ficha.
        </p>
        <button onClick={() => router.push(`/ventas/facturas/${initialId}`)} className="text-indigo-700 hover:underline">
          Ver ficha de la factura
        </button>
      </div>
    )
  }

  // ─── UI ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              {isEdit ? `Editar ${facturaNumeroExistente ?? "Factura"}` : "Nueva Factura"}
            </h1>
            <p className="text-sm text-gray-500">
              {isEdit ? "Modifique el borrador y guarde" : "Complete los datos y elija medios de pago para confirmar"}
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
          <button
            onClick={guardarBorrador}
            disabled={guardando || !facturaClienteId || lineasValidas.length === 0}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {guardando ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar Borrador"}
          </button>
          <button
            onClick={confirmarFactura}
            disabled={guardando || !facturaClienteId || lineasValidas.length === 0}
            className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            {guardando ? "Procesando…" : "Confirmar Factura"}
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
              <User className="w-4 h-4" /> Cliente
            </h3>
            <select
              value={facturaClienteId ?? ""}
              onChange={e => setFacturaClienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar cliente…</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre}</option>
              ))}
            </select>
            {selectedCliente && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Documento:</span>{" "}
                  <span className="font-medium">{selectedCliente.tipo_documento}: {selectedCliente.numero_documento ?? "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pos. Fiscal:</span>{" "}
                  <span className="font-medium capitalize">{selectedCliente.posicion_fiscal?.replace("_", " ") ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Lista:</span>
                  <select
                    value={facturaListaPreciosId ?? ""}
                    onChange={e => setFacturaListaPreciosId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    <option value="">Sin lista</option>
                    {listasPrecios.filter(l => l.activa !== false).map(l => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${facturaMoneda === "USD" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {facturaMoneda}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Líneas */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-900">Líneas de Factura</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-2 px-3">Producto</th>
                  <th className="text-center py-2 px-3 w-20">Cant.</th>
                  <th className="text-right py-2 px-3 w-32">Precio ({facturaMoneda})</th>
                  <th className="text-center py-2 px-3 w-16">Dto. %</th>
                  <th className="text-right py-2 px-3 w-32">Subtotal ({facturaMoneda})</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {facturaLineas.map((linea, index) => (
                  <tr key={linea.uid} className="border-b">
                    <td className="py-2 px-3">
                      <div className="relative">
                        <input
                          ref={el => { productoInputRefs.current[index] = el }}
                          type="text"
                          autoComplete="off"
                          value={productoSearchIndex === index ? productoSearchText : linea.producto_nombre}
                          onChange={e => {
                            setProductoSearchIndex(index)
                            setProductoSearchText(e.target.value)
                            const updated = [...facturaLineas]
                            updated[index].producto_nombre = e.target.value
                            setFacturaLineas(updated)
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
                            nvClienteId={facturaClienteId}
                            nvListaPreciosId={facturaListaPreciosId}
                            clientes={clientes}
                            listasPrecios={listasPrecios}
                            versionesLista={versionesLista}
                            productosConSerie={facturaListaPreciosId ? productosLista : productosMaestro}
                            productoSearchText={productoSearchText}
                            anchorRef={{ current: productoInputRefs.current[index] } as React.RefObject<HTMLInputElement>}
                            onSelect={(p, precioUnitario, moneda, precioUSD, precioARS, iva) => {
                              const updated = [...facturaLineas]
                              updated[index].producto_id = p.id
                              updated[index].producto_nombre = p.nombre
                              updated[index].producto_sku = p.sku
                              updated[index].precio_unitario = facturaMoneda === "USD" ? precioUSD : precioARS
                              updated[index].precio_unitario_moneda = moneda
                              updated[index].precio_unitario_usd = precioUSD
                              updated[index].precio_unitario_ars = precioARS
                              updated[index].iva = iva ?? 21
                              updated[index].subtotal =
                                updated[index].cantidad * updated[index].precio_unitario *
                                (1 - updated[index].descuento / 100)
                              setFacturaLineas(updated)
                              setProductoSearchIndex(null)
                              setProductoSearchText("")
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={linea.cantidad}
                        min={1}
                        onChange={e => {
                          const updated = [...facturaLineas]
                          updated[index].cantidad = parseInt(e.target.value, 10) || 1
                          updated[index].subtotal =
                            updated[index].cantidad * updated[index].precio_unitario *
                            (1 - updated[index].descuento / 100)
                          setFacturaLineas(updated)
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={linea.precio_unitario}
                        min={0}
                        step={0.01}
                        onChange={e => {
                          const updated = [...facturaLineas]
                          updated[index].precio_unitario = parseFloat(e.target.value) || 0
                          updated[index].subtotal =
                            updated[index].cantidad * updated[index].precio_unitario *
                            (1 - updated[index].descuento / 100)
                          setFacturaLineas(updated)
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={linea.descuento}
                        min={0}
                        max={100}
                        onChange={e => {
                          const updated = [...facturaLineas]
                          updated[index].descuento = parseFloat(e.target.value) || 0
                          updated[index].subtotal =
                            updated[index].cantidad * updated[index].precio_unitario *
                            (1 - updated[index].descuento / 100)
                          setFacturaLineas(updated)
                        }}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {formatCurrency(linea.subtotal, facturaMoneda)}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => setFacturaLineas(facturaLineas.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {facturaLineas.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-3 text-gray-400 text-sm">No hay líneas agregadas</td></tr>
                )}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t">
              <button
                type="button"
                onClick={() =>
                  setFacturaLineas([
                    ...facturaLineas,
                    {
                      uid: Date.now() + facturaLineas.length,
                      producto_id: 0,
                      producto_nombre: "",
                      cantidad: 1,
                      precio_unitario: 0,
                      precio_unitario_moneda: facturaMoneda,
                      precio_unitario_usd: 0,
                      precio_unitario_ars: 0,
                      descuento: 0,
                      subtotal: 0,
                      iva: 21,
                    },
                  ])
                }
                className="text-sm text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar línea
              </button>
            </div>
          </div>

          {/* Medios de Pago — visible en crear y al editar borradores */}
          <div className="bg-white rounded-lg shadow-sm">
            <BloquesMediosPago
                key={`fac-${facturaClienteId}-${facturaMoneda}`}
                tarjetas={tarjetas}
                grupos={gruposTarjeta}
                recargos={recargosTarjeta}
                textoBoton="Listo (los IVA y recargos se calculan al confirmar)"
                textoConfirmado="Medios de pago listos."
                onEstadoPagoChange={setEstadoPago}
                onConfirmarCobro={(lineas) => setMediosLineas(lineas)}
                factura={{
                  id: 0,
                  numero: "",
                  tipo: "B",
                  estado: "borrador",
                  fecha: new Date().toISOString(),
                  cliente_id: facturaClienteId ?? 0,
                  cliente_nombre: selectedCliente?.nombre ?? "",
                  moneda: facturaMoneda,
                  tipo_cotizacion: "blue",
                  cotizacion: facturaMoneda === "USD" ? facturaCotizacion : 1,
                  subtotal,
                  descuento: 0,
                  impuestos: 0,
                  total: subtotal,
                  saldo: subtotal,
                } as any}
              />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Resumen{" "}
              {facturaMoneda !== "ARS" && (
                <span className="text-sm font-normal text-blue-600 ml-1">en {facturaMoneda}</span>
              )}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal, facturaMoneda)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-emerald-700 whitespace-nowrap">
                    {formatCurrency(subtotal, facturaMoneda)}
                  </span>
                </div>
              </div>
              {facturaMoneda === "USD" && facturaCotizacion > 1 && (
                <div className="border-t pt-2 text-xs text-gray-500 flex justify-between">
                  <span>Equivalente ARS (TC ${facturaCotizacion.toLocaleString("es-AR")}):</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(subtotal * facturaCotizacion, "ARS")}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-400 border-t pt-2">
                IVA y recargos se calculan al confirmar según los medios de pago.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal validación */}
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
    </div>
  )
}
