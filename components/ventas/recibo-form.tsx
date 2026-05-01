"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { formatCurrency } from "@/lib/format"

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface ClienteOpt { id: number; codigo?: string; nombre: string }
interface Caja { id: string; nombre: string; sucursal: string; activo?: boolean }
interface CajaValor { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }
interface Tarjeta { id: number; nombre: string; tipo: "credito" | "debito"; activa: boolean }

interface Pago {
  id: string
  valor_id: string
  valor_nombre: string
  tipo_valor: string
  importe: number
  moneda: "ARS" | "USD"
  importe_comprobante: number
  moneda_comprobante: "ARS" | "USD"
  es_tarjeta: boolean
  tarjeta_nombre: string | null
  cantidad_cuotas: number
  numero_cupon: string | null
  recargo_porcentaje: number
  recargo_importe: number
  es_cheque: boolean
  cheque_id: string | null
}

interface Imputacion {
  id: string
  tipo_comprobante: "factura"
  comprobante_id: number
  comprobante_referencia: string
  fecha_comprobante: string | null
  fecha_vencimiento: string | null
  saldo_moneda: number
  moneda_comprobante: "ARS" | "USD"
  saldo_actual: number
  asignacion: number
}

interface CCResumen {
  saldo_ars: number
  saldo_usd: number
  cotizacion_cliente: number
  tipo_cotizacion_cliente: string
}

const CUOTAS_OPTS = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24]

export default function ReciboForm({
  initialId,
  prefillFacturaId,
}: { initialId?: string; prefillFacturaId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursalActiva } = useERP()

  // ─── Loaders ────────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [cajas, setCajas] = useState<Caja[]>([])
  const [valoresCaja, setValoresCaja] = useState<CajaValor[]>([])
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoRec, setCargandoRec] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // ─── Form state ─────────────────────────────────────────────────────────
  const [numeroExistente, setNumeroExistente] = useState<string | null>(null)
  const [estadoExistente, setEstadoExistente] = useState<string | null>(null)
  const [reciboClienteId, setReciboClienteId] = useState<number | null>(null)
  const [reciboCajaId, setReciboCajaId] = useState<string>("")
  const [reciboFacturaId, setReciboFacturaId] = useState<number | null>(null)
  const [reciboConcepto, setReciboConcepto] = useState("")
  const [reciboObservaciones, setReciboObservaciones] = useState("")
  const [pagos, setPagos] = useState<Pago[]>([])
  const [imputaciones, setImputaciones] = useState<Imputacion[]>([])
  const [ccResumen, setCcResumen] = useState<CCResumen | null>(null)

  // Tabs
  const [tab, setTab] = useState<"pagos" | "comprobantes">("pagos")

  // Modal añadir pago
  const [showAddPagoModal, setShowAddPagoModal] = useState(false)
  const [nuevoPagoValorId, setNuevoPagoValorId] = useState<string>("")
  const [nuevoPagoImporte, setNuevoPagoImporte] = useState<string>("")
  const [nuevoPagoMoneda, setNuevoPagoMoneda] = useState<"ARS" | "USD">("ARS")
  const [nuevoPagoTarjetaId, setNuevoPagoTarjetaId] = useState<number | null>(null)
  const [nuevoPagoCuotas, setNuevoPagoCuotas] = useState<number>(1)

  // Submit state
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  // Pre-fill desde factura (Registrar Cobro)
  const [prefillData, setPrefillData] = useState<{
    factura_id: number
    cliente_id: number
    saldo: number
    moneda: "ARS" | "USD"
    medios: { medio: string; importe: number }[]
  } | null>(null)
  const [prefillCargado, setPrefillCargado] = useState(false)

  // Cancelar publicado
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [cancelando, setCancelando] = useState(false)

  // ─── Cargar datos base ──────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/clientes").then(r => r.json()).catch(() => []),
      fetch("/api/cajas").then(r => r.json()).catch(() => []),
      fetch("/api/tarjetas").then(r => r.json()).catch(() => []),
    ]).then(([cl, ca, tar]) => {
      if (!activo) return
      if (Array.isArray(cl)) setClientes(cl)
      if (Array.isArray(ca)) setCajas(ca)
      if (Array.isArray(tar)) setTarjetas(tar)
      setCargandoBase(false)
    })
    return () => { activo = false }
  }, [])

  // Filtrar cajas por sucursal activa
  const cajasFiltradas = useMemo(() => {
    if (!sucursalActiva?.nombre) return cajas
    return cajas.filter(c => c.sucursal === sucursalActiva.nombre && c.activo !== false)
  }, [cajas, sucursalActiva])

  // ─── Cargar recibo existente ────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/recibos/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(`Error ${r.status}`)
          setCargandoRec(false)
          return
        }
        const data = await r.json()
        setNumeroExistente(data.numero ?? null)
        setEstadoExistente(data.estado ?? null)
        setReciboClienteId(data.cliente_id ?? null)
        setReciboCajaId(data.caja_id ?? "")
        setReciboFacturaId(data.factura_id ?? null)
        setReciboConcepto(data.concepto ?? "")
        setReciboObservaciones(data.observaciones ?? "")
        setPagos((data.pagos ?? []).map((p: any) => ({
          id: p.id,
          valor_id: p.valor_id ?? "",
          valor_nombre: p.valor_nombre ?? "",
          tipo_valor: p.tipo_valor ?? "",
          importe: Number(p.importe ?? 0),
          moneda: p.moneda === "USD" ? "USD" : "ARS",
          importe_comprobante: Number(p.importe_comprobante ?? p.importe ?? 0),
          moneda_comprobante: p.moneda_comprobante === "USD" ? "USD" : "ARS",
          es_tarjeta: !!p.es_tarjeta,
          tarjeta_nombre: p.tarjeta_nombre ?? null,
          cantidad_cuotas: Number(p.cantidad_cuotas ?? 1),
          numero_cupon: p.numero_cupon ?? null,
          recargo_porcentaje: Number(p.recargo_porcentaje ?? 0),
          recargo_importe: Number(p.recargo_importe ?? 0),
          es_cheque: !!p.es_cheque,
          cheque_id: p.cheque_id ?? null,
        })))
        setCargandoRec(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar el recibo")
        setCargandoRec(false)
      })
  }, [isEdit, initialId])

  // ─── Cargar valores de caja al cambiar caja ────────────────────────────
  useEffect(() => {
    if (!reciboCajaId) {
      setValoresCaja([])
      return
    }
    fetch(`/api/caja-valores?caja_id=${reciboCajaId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setValoresCaja(d) })
      .catch(() => setValoresCaja([]))
  }, [reciboCajaId])

  // ─── Pre-fill desde factura (Registrar Cobro) ──────────────────────────
  // 1. Fetch factura → setear cliente + factura_id + guardar medios para mapear después
  useEffect(() => {
    if (isEdit || !prefillFacturaId || prefillCargado) return
    fetch(`/api/facturas?id=${prefillFacturaId}`)
      .then(r => r.json())
      .then((data: any) => {
        const fac = Array.isArray(data) ? data[0] : data
        if (!fac?.id) return
        const medios = (fac.factura_medios_pago ?? []).map((mp: any) => ({
          medio: mp.medio ?? "efectivo",
          importe: Number(mp.monto_total ?? mp.monto_base ?? 0),
        }))
        setPrefillData({
          factura_id: fac.id,
          cliente_id: fac.cliente_id,
          saldo: Number(fac.saldo ?? 0),
          moneda: fac.moneda === "USD" ? "USD" : "ARS",
          medios,
        })
        setReciboClienteId(fac.cliente_id)
        setReciboFacturaId(fac.id)
        // Caja default: primera caja filtrada por sucursal
        const primeraCaja = cajas.find(c => sucursalActiva?.nombre ? c.sucursal === sucursalActiva.nombre : true)
        if (primeraCaja) setReciboCajaId(primeraCaja.id)
        setPrefillCargado(true)
      })
      .catch(() => {})
  }, [isEdit, prefillFacturaId, prefillCargado, cajas, sucursalActiva])

  // 2. Cuando cargaron valoresCaja + el prefill ya tiene datos, mapear medios → pagos
  useEffect(() => {
    if (!prefillData || pagos.length > 0 || valoresCaja.length === 0) return
    const mapearMedio = (medio: string) => {
      if (medio === "efectivo") return valoresCaja.find(v => v.tipo === "efectivo")
      if (medio === "tarjeta") return valoresCaja.find(v => v.subtipo === "tarjeta")
      if (medio === "transferencia") return valoresCaja.find(v => v.subtipo === "banco")
      return undefined
    }
    const nuevosPagos: Pago[] = prefillData.medios.map(mp => {
      const cv = mapearMedio(mp.medio)
      return {
        id: crypto.randomUUID(),
        valor_id: cv?.id ?? "",
        valor_nombre: cv?.nombre ?? "",
        tipo_valor: cv?.tipo ?? "",
        importe: mp.importe,
        moneda: prefillData.moneda,
        importe_comprobante: mp.importe,
        moneda_comprobante: prefillData.moneda,
        es_tarjeta: mp.medio === "tarjeta",
        tarjeta_nombre: null,
        cantidad_cuotas: 1,
        numero_cupon: null,
        recargo_porcentaje: 0,
        recargo_importe: 0,
        es_cheque: false,
        cheque_id: null,
      }
    })
    setPagos(nuevosPagos)
  }, [prefillData, valoresCaja, pagos.length])

  // 3. Cuando cargan las imputaciones, asignar el saldo a la factura del prefill
  useEffect(() => {
    if (!prefillData || imputaciones.length === 0) return
    const ya = imputaciones.find(i => i.comprobante_id === prefillData.factura_id && i.asignacion > 0)
    if (ya) return
    setImputaciones(prev => prev.map(i =>
      i.comprobante_id === prefillData.factura_id
        ? { ...i, asignacion: Math.min(i.saldo_actual, prefillData.saldo) }
        : i
    ))
  }, [prefillData, imputaciones.length])

  // ─── Cargar facturas pendientes y CC al cambiar cliente ─────────────────
  useEffect(() => {
    if (!reciboClienteId) {
      setImputaciones([])
      setCcResumen(null)
      return
    }
    fetch(`/api/facturas?cliente_id=${reciboClienteId}&saldo_min=0`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return
        // Ordenar por fecha de vencimiento ascendente
        const sorted = [...data].sort((a, b) =>
          (a.fecha_vencimiento ?? a.fecha ?? "").localeCompare(b.fecha_vencimiento ?? b.fecha ?? "")
        )
        setImputaciones(sorted.map((f: any) => ({
          id: crypto.randomUUID(),
          tipo_comprobante: "factura",
          comprobante_id: f.id,
          comprobante_referencia: f.numero,
          fecha_comprobante: f.fecha,
          fecha_vencimiento: f.fecha_vencimiento ?? f.fecha,
          saldo_moneda: Number(f.saldo ?? 0),
          moneda_comprobante: f.moneda === "USD" ? "USD" : "ARS",
          saldo_actual: Number(f.saldo ?? 0),
          asignacion: 0,
        })))
      })
      .catch(() => {})

    fetch(`/api/clientes/${reciboClienteId}/cc`)
      .then(r => r.ok ? r.json() : null)
      .then((cc: any) => {
        if (cc) {
          setCcResumen({
            saldo_ars: cc.saldo_ars ?? 0,
            saldo_usd: cc.saldo_usd ?? 0,
            cotizacion_cliente: cc.cotizacion_cliente ?? 0,
            tipo_cotizacion_cliente: cc.tipo_cotizacion_cliente ?? "",
          })
        }
      })
      .catch(() => {})
  }, [reciboClienteId])

  // ─── Helpers ────────────────────────────────────────────────────────────
  const totalPagos = pagos.reduce((s, p) => s + (p.importe_comprobante || 0), 0)
  const totalAsig = imputaciones.reduce((s, i) => s + (i.asignacion || 0), 0)
  const noConciliado = Math.max(0, totalPagos - totalAsig)

  const monedaRecibo: "ARS" | "USD" = pagos.some(p => p.moneda === "USD") ? "USD" : "ARS"

  const validar = (): string | null => {
    if (!reciboClienteId) return "Debe seleccionar un cliente"
    if (!reciboCajaId) return "Debe seleccionar una caja"
    if (pagos.length === 0) return "Debe agregar al menos un medio de pago"
    return null
  }

  const construirPayload = () => ({
    sucursal: sucursalActiva?.nombre ?? null,
    cliente_id: reciboClienteId,
    cliente_nombre: clientes.find(c => c.id === reciboClienteId)?.nombre ?? null,
    caja_id: reciboCajaId,
    caja_nombre: cajas.find(c => c.id === reciboCajaId)?.nombre ?? null,
    factura_id: reciboFacturaId,
    nota_venta_id: null,
    cobrador_nombre: null,
    concepto: reciboConcepto || null,
    observaciones: reciboObservaciones || null,
    importe: totalPagos,
    importe_no_conciliado: noConciliado,
    moneda: monedaRecibo,
    tipo_cotizacion: null,
    cotizacion: null,
    pagos: pagos.map(p => ({
      valor_id: p.valor_id,
      valor_nombre: p.valor_nombre,
      tipo_valor: p.tipo_valor,
      importe: p.importe,
      moneda: p.moneda,
      importe_comprobante: p.importe_comprobante,
      moneda_comprobante: p.moneda_comprobante,
      es_tarjeta: p.es_tarjeta,
      tarjeta_nombre: p.tarjeta_nombre,
      cantidad_cuotas: p.cantidad_cuotas,
      numero_cupon: p.numero_cupon,
      recargo_porcentaje: p.recargo_porcentaje,
      recargo_importe: p.recargo_importe,
      es_cheque: p.es_cheque,
      cheque_id: p.cheque_id,
    })),
    imputaciones: imputaciones
      .filter(i => i.asignacion > 0)
      .map(i => ({
        tipo_comprobante: i.tipo_comprobante,
        comprobante_id: i.comprobante_id,
        comprobante_referencia: i.comprobante_referencia,
        fecha_comprobante: i.fecha_comprobante,
        fecha_vencimiento: i.fecha_vencimiento,
        saldo_moneda: i.saldo_moneda,
        moneda_comprobante: i.moneda_comprobante,
        saldo_actual: i.saldo_actual,
        asignacion: i.asignacion,
      })),
  })

  // ─── Acciones ───────────────────────────────────────────────────────────
  const guardarBorrador = async () => {
    const err = validar()
    if (err) { setErrorAccion(err); return }
    if (guardando) return
    setErrorAccion(null)
    setGuardando(true)

    try {
      let res: Response
      if (isEdit && initialId) {
        res = await fetch(`/api/recibos/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayload()),
        })
      } else {
        res = await fetch("/api/recibos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayload()),
        })
      }
      if (!res.ok) {
        const text = await res.text()
        setErrorAccion(`Error al guardar (HTTP ${res.status}): ${text}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      const id = data.id ?? initialId
      router.push(`/ventas/recibos/${id}`)
    } catch (e: any) {
      setErrorAccion(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const publicarRecibo = async () => {
    if (!isEdit || !initialId) return
    if (publicando) return
    setErrorAccion(null)

    // Si hay cambios sin guardar, primero los guardamos
    setPublicando(true)
    try {
      const errVal = validar()
      if (errVal) { setErrorAccion(errVal); setPublicando(false); return }

      // Guardar cambios actuales antes de publicar
      const putRes = await fetch(`/api/recibos/${initialId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(construirPayload()),
      })
      if (!putRes.ok) {
        const text = await putRes.text()
        setErrorAccion(`No se pudo guardar antes de publicar: ${text}`)
        setPublicando(false)
        return
      }

      // Calcular caso de imputación bimonetaria
      const casoImputacion = (() => {
        if (!ccResumen) return "A"
        const tieneARS = ccResumen.saldo_ars > 0
        const tieneUSD = ccResumen.saldo_usd > 0
        if (tieneARS && tieneUSD) return "C"
        if (tieneUSD && !tieneARS) return "B"
        return "A"
      })()

      const pubRes = await fetch(`/api/recibos/${initialId}/publicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caso_imputacion: casoImputacion }),
      })
      if (!pubRes.ok) {
        const text = await pubRes.text()
        setErrorAccion(`Error al publicar: ${text}`)
        setPublicando(false)
        return
      }
      router.push(`/ventas/recibos/${initialId}`)
    } catch (e: any) {
      setErrorAccion(`Error de red: ${e?.message ?? e}`)
      setPublicando(false)
    }
  }

  const cancelarPublicado = async () => {
    if (!isEdit || !initialId) return
    if (!motivoCancel.trim()) { setErrorAccion("Ingresá un motivo de cancelación"); return }
    if (cancelando) return
    setErrorAccion(null)
    setCancelando(true)
    try {
      const res = await fetch(`/api/recibos/${initialId}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivoCancel }),
      })
      if (!res.ok) {
        const text = await res.text()
        setErrorAccion(`Error al cancelar: ${text}`)
        setCancelando(false)
        return
      }
      router.push(`/ventas/recibos/${initialId}`)
    } catch (e: any) {
      setErrorAccion(`Error de red: ${e?.message ?? e}`)
      setCancelando(false)
    }
  }

  const agregarPago = () => {
    if (!nuevoPagoValorId) { alert("Seleccioná un valor"); return }
    const valor = valoresCaja.find(v => v.id === nuevoPagoValorId)
    if (!valor) return
    const importe = parseFloat(nuevoPagoImporte) || 0
    if (importe <= 0) { alert("Importe inválido"); return }
    const esTarjeta = valor.subtipo === "tarjeta"
    const tarjeta = esTarjeta && nuevoPagoTarjetaId ? tarjetas.find(t => t.id === nuevoPagoTarjetaId) : null

    const nuevo: Pago = {
      id: crypto.randomUUID(),
      valor_id: valor.id,
      valor_nombre: valor.nombre,
      tipo_valor: valor.tipo,
      importe,
      moneda: nuevoPagoMoneda,
      importe_comprobante: importe,
      moneda_comprobante: nuevoPagoMoneda,
      es_tarjeta: esTarjeta,
      tarjeta_nombre: tarjeta?.nombre ?? null,
      cantidad_cuotas: esTarjeta ? nuevoPagoCuotas : 1,
      numero_cupon: null,
      recargo_porcentaje: 0,
      recargo_importe: 0,
      es_cheque: valor.subtipo === "cheque",
      cheque_id: null,
    }
    setPagos(prev => [...prev, nuevo])

    // Reset modal
    setNuevoPagoValorId("")
    setNuevoPagoImporte("")
    setNuevoPagoMoneda("ARS")
    setNuevoPagoTarjetaId(null)
    setNuevoPagoCuotas(1)
    setShowAddPagoModal(false)
  }

  const quitarPago = (id: string) => setPagos(prev => prev.filter(p => p.id !== id))
  const cambiarAsignacion = (id: string, val: number) =>
    setImputaciones(prev => prev.map(i => i.id === id ? { ...i, asignacion: Math.max(0, Math.min(val, i.saldo_actual)) } : i))

  // ─── Render guards ──────────────────────────────────────────────────────
  if (cargandoBase || cargandoRec) {
    return <div className="p-12 text-center text-gray-500">Cargando datos…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/ventas/recibos")} className="text-indigo-700 hover:underline">
          Volver al listado
        </button>
      </div>
    )
  }

  const esBorrador = !isEdit || estadoExistente === "borrador"
  const esPublicado = estadoExistente === "publicado"

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
              {isEdit ? `Editar ${numeroExistente ?? "Recibo"}` : "Nuevo Recibo"}
            </h1>
            {estadoExistente && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                estadoExistente === "borrador" ? "bg-gray-100 text-gray-700"
                : estadoExistente === "publicado" ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}>
                {estadoExistente === "borrador" ? "Borrador" : estadoExistente === "publicado" ? "Publicado" : "Cancelado"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          {esBorrador && (
            <button
              onClick={guardarBorrador}
              disabled={guardando || publicando}
              className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          )}
          {isEdit && esBorrador && (
            <button
              onClick={publicarRecibo}
              disabled={guardando || publicando}
              className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              {publicando ? "Publicando…" : "Confirmar"}
            </button>
          )}
          {esPublicado && (
            <button
              onClick={() => setShowCancelarModal(true)}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Cancelar Recibo
            </button>
          )}
        </div>
      </div>

      {errorAccion && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorAccion}</span>
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Sucursal</label>
              <input
                value={sucursalActiva?.nombre ?? ""}
                disabled
                className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Cliente *</label>
              <select
                value={reciboClienteId ?? ""}
                onChange={e => setReciboClienteId(e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={!esBorrador}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Seleccionar cliente…</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Importe</label>
                <input
                  value={`$ ${totalPagos.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  disabled
                  className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">No conciliado</label>
                <input
                  value={`$ ${noConciliado.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  disabled
                  className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50"
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Caja *</label>
              <select
                value={reciboCajaId}
                onChange={e => setReciboCajaId(e.target.value)}
                disabled={!esBorrador}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Seleccionar caja…</option>
                {cajasFiltradas.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Concepto</label>
              <input
                value={reciboConcepto}
                onChange={e => setReciboConcepto(e.target.value)}
                disabled={!esBorrador}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Observaciones</label>
              <input
                value={reciboObservaciones}
                onChange={e => setReciboObservaciones(e.target.value)}
                disabled={!esBorrador}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b flex">
          <button
            onClick={() => setTab("pagos")}
            className={`px-4 py-2.5 text-sm font-medium ${tab === "pagos" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}
          >
            Pagos
          </button>
          <button
            onClick={() => setTab("comprobantes")}
            className={`px-4 py-2.5 text-sm font-medium ${tab === "comprobantes" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-gray-500 hover:text-gray-700"}`}
          >
            Comprobantes
          </button>
        </div>

        <div className="p-4">
          {tab === "pagos" && (
            <div className="space-y-3">
              {esBorrador && (
                <div>
                  <button
                    onClick={() => {
                      if (!reciboCajaId) { alert("Seleccioná una caja primero"); return }
                      setShowAddPagoModal(true)
                    }}
                    className="bg-indigo-900 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Añadir un pago
                  </button>
                </div>
              )}
              {pagos.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase">
                      <th className="py-2 px-3">Valor</th>
                      <th className="text-right px-3">Importe</th>
                      <th className="px-3">Moneda</th>
                      <th className="px-3">Tarjeta</th>
                      {esBorrador && <th className="w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map(p => (
                      <tr key={p.id} className="border-b">
                        <td className="py-1.5 px-3">{p.valor_nombre}</td>
                        <td className="text-right px-3 font-medium">
                          {formatCurrency(p.importe, p.moneda)}
                        </td>
                        <td className="px-3">{p.moneda}</td>
                        <td className="px-3 text-xs text-gray-500">
                          {p.es_tarjeta ? `${p.tarjeta_nombre ?? "—"} × ${p.cantidad_cuotas}` : "—"}
                        </td>
                        {esBorrador && (
                          <td className="text-right">
                            <button onClick={() => quitarPago(p.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400 py-6 text-center">Sin medios de pago.</p>
              )}
            </div>
          )}

          {tab === "comprobantes" && (
            <div>
              {!reciboClienteId ? (
                <p className="text-sm text-gray-400 py-6 text-center">Seleccioná un cliente primero.</p>
              ) : imputaciones.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">El cliente no tiene facturas pendientes.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase">
                      <th className="py-2 px-3">Comprobante</th>
                      <th className="px-3">Vencimiento</th>
                      <th className="text-right px-3">Saldo</th>
                      <th className="px-3">Mon.</th>
                      <th className="text-right px-3">Asignar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imputaciones.map(i => (
                      <tr key={i.id} className="border-b">
                        <td className="py-1.5 px-3 font-mono text-emerald-700">{i.comprobante_referencia}</td>
                        <td className="px-3 text-xs text-gray-600">{i.fecha_vencimiento ?? "—"}</td>
                        <td className="text-right px-3">{formatCurrency(i.saldo_actual, i.moneda_comprobante)}</td>
                        <td className="px-3">{i.moneda_comprobante}</td>
                        <td className="text-right px-3">
                          <input
                            type="number"
                            value={i.asignacion}
                            min={0}
                            max={i.saldo_actual}
                            step={0.01}
                            disabled={!esBorrador}
                            onChange={e => cambiarAsignacion(i.id, parseFloat(e.target.value) || 0)}
                            className="w-32 border rounded px-2 py-1 text-sm text-right"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={4} className="py-2 px-3 text-right">Asignado:</td>
                      <td className="text-right px-3">
                        {formatCurrency(totalAsig, monedaRecibo)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
              {ccResumen && (
                <div className="mt-4 text-xs text-gray-500 border-t pt-3 flex gap-4">
                  <span>CC ARS: {formatCurrency(ccResumen.saldo_ars, "ARS")}</span>
                  <span>CC USD: {formatCurrency(ccResumen.saldo_usd, "USD")}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal añadir pago */}
      {showAddPagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Añadir medio de pago</h3>
              <button onClick={() => setShowAddPagoModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor</label>
                <select
                  value={nuevoPagoValorId}
                  onChange={e => {
                    setNuevoPagoValorId(e.target.value)
                    const v = valoresCaja.find(x => x.id === e.target.value)
                    if (v?.moneda === "USD") setNuevoPagoMoneda("USD")
                    else setNuevoPagoMoneda("ARS")
                  }}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {valoresCaja.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre} ({v.tipo}{v.subtipo ? ` / ${v.subtipo}` : ""})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Importe</label>
                <input
                  type="number"
                  value={nuevoPagoImporte}
                  onChange={e => setNuevoPagoImporte(e.target.value)}
                  step={0.01}
                  min={0}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Moneda</label>
                <select
                  value={nuevoPagoMoneda}
                  onChange={e => setNuevoPagoMoneda(e.target.value as "ARS" | "USD")}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              {(() => {
                const v = valoresCaja.find(x => x.id === nuevoPagoValorId)
                if (v?.subtipo !== "tarjeta") return null
                return (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tarjeta</label>
                      <select
                        value={nuevoPagoTarjetaId ?? ""}
                        onChange={e => setNuevoPagoTarjetaId(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="">Seleccionar tarjeta…</option>
                        {tarjetas.filter(t => t.activa).map(t => (
                          <option key={t.id} value={t.id}>{t.nombre} ({t.tipo})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Cuotas</label>
                      <select
                        value={nuevoPagoCuotas}
                        onChange={e => setNuevoPagoCuotas(parseInt(e.target.value, 10))}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        {CUOTAS_OPTS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )
              })()}
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setShowAddPagoModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={agregarPago}
                className="px-4 py-2 text-sm bg-indigo-900 text-white rounded-lg hover:bg-indigo-800"
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancelar publicado */}
      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Recibo</h3>
            <p className="text-sm text-gray-500 mb-3">
              Se revertirán los movimientos de caja, los saldos de las facturas imputadas y el asiento contable.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo *</label>
            <textarea
              value={motivoCancel}
              onChange={e => setMotivoCancel(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowCancelarModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={cancelarPublicado}
                disabled={cancelando || !motivoCancel.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {cancelando ? "Cancelando…" : "Cancelar Recibo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
