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
import { formatCurrency, formatDate } from "@/lib/format"
import SearchableSelect from "@/components/ui/searchable-select"

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface ClienteOpt { id: number; codigo?: string; nombre: string; telefono?: string; numero_documento?: string }
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
  // factura = deuda (saldo positivo en CC). nc/ajuste = crédito (negativo).
  tipo_comprobante: "factura" | "nota_credito" | "ajuste"
  comprobante_id: number
  comprobante_referencia: string
  fecha_comprobante: string | null
  fecha_vencimiento: string | null
  saldo_moneda: number
  moneda_comprobante: "ARS" | "USD"
  saldo_actual: number
  asignacion: number
  // Categoría de la NC/ajuste (texto plain, ej. "Equipos en parte de pago").
  // Sirve para destacar las NCs especiales con color en la UI.
  categoria?: string | null
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
  // Paso 3: cotización blue del día — usada para cruce ARS↔USD al matchear
  const [cotizacionBlue, setCotizacionBlue] = useState<number>(1)
  // Set de IDs de pagos del recibo que están machiados (aplicados a débitos)
  const [pagosMachiados, setPagosMachiados] = useState<Set<string>>(new Set())

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
    medios: { medio: string; importe: number; moneda: "ARS" | "USD" | null }[]
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
      fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
        .then(r => r.json()).catch(() => null),
    ]).then(([cl, ca, tar, cot]) => {
      if (!activo) return
      if (Array.isArray(cl)) setClientes(cl)
      if (Array.isArray(ca)) setCajas(ca)
      if (Array.isArray(tar)) setTarjetas(tar)
      if (cot?.tasa) setCotizacionBlue(Number(cot.tasa))
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

  // Auto-seleccionar la primera caja del usuario cuando es un recibo nuevo y
  // todavía no se eligió ninguna. `cajasFiltradas` ya restringe por sucursal
  // y por permisos del usuario (el endpoint /api/cajas filtra por accesos),
  // así que el primer ítem de esa lista es la "caja por defecto" del usuario.
  useEffect(() => {
    if (isEdit) return
    if (reciboCajaId) return
    if (cajasFiltradas.length === 0) return
    setReciboCajaId(cajasFiltradas[0].id)
  }, [isEdit, reciboCajaId, cajasFiltradas])

  // ─── Pre-fill desde factura (Registrar Cobro) ──────────────────────────
  // 1. Fetch factura → setear cliente + factura_id + guardar medios para mapear después
  useEffect(() => {
    if (isEdit || !prefillFacturaId || prefillCargado) return
    fetch(`/api/facturas?id=${prefillFacturaId}`)
      .then(r => r.json())
      .then((data: any) => {
        const fac = Array.isArray(data) ? data[0] : data
        if (!fac?.id) return
        // FAC-11: excluir los medios "credito_toma" del prefill — esos no son
        // cobros reales, son marcadores de NC que el operador concilia manualmente
        // en el panel "Créditos del cliente" del recibo.
        //
        // OJO con monedas mixtas: en factura_medios_pago el `monto_base/monto_total`
        // está SIEMPRE en la moneda de la factura, NO en la moneda original del
        // cobro. Para reconstruir el importe original (lo que efectivamente
        // recibió el cliente en su moneda) hay que convertir devuelta usando
        // la cotización de la factura.
        //
        // Ej: factura USD con cot=1400 + cobro de 140.000 ARS guarda
        //     monto_base=100 (USD equivalente). Al cargar al recibo queremos
        //     volver a 140.000 ARS, no a 100 ARS literales.
        const monedaFac = fac.moneda === "USD" ? "USD" : "ARS"
        const cotFac = Number(fac.cotizacion ?? 0)
        const medios = (fac.factura_medios_pago ?? [])
          .filter((mp: any) => mp.medio !== "credito_toma")
          .map((mp: any) => {
            const monedaOriginal = mp.moneda === "USD" ? "USD" : mp.moneda === "ARS" ? "ARS" : monedaFac
            const importeEnFactura = Number(mp.monto_total ?? mp.monto_base ?? 0)
            // Convertir de la moneda de la factura a la moneda original
            let importeOriginal = importeEnFactura
            if (monedaOriginal !== monedaFac && cotFac > 0) {
              if (monedaFac === "USD" && monedaOriginal === "ARS") {
                importeOriginal = importeEnFactura * cotFac   // USD → ARS
              } else if (monedaFac === "ARS" && monedaOriginal === "USD") {
                importeOriginal = importeEnFactura / cotFac   // ARS → USD
              }
            }
            importeOriginal = Math.round(importeOriginal * 100) / 100
            return {
              medio: mp.medio ?? "efectivo",
              importe: importeOriginal,
              moneda: monedaOriginal,
            }
          })
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
    // Mapear (medio, moneda) → caja_valor. Cada caja tiene un valor por
    // moneda (ej: "Efectivo USD" y "Efectivo ARS"). El mapeo viejo solo
    // miraba el `tipo` y caía siempre en el primer efectivo, sin importar
    // la moneda del pago. Ahora primero buscamos coincidencia exacta por
    // moneda; si no hay valor en esa moneda, caemos al primero del tipo.
    const mapearMedio = (medio: string, moneda: "ARS" | "USD") => {
      if (medio === "efectivo") {
        return valoresCaja.find(v => v.tipo === "efectivo" && v.moneda === moneda)
            ?? valoresCaja.find(v => v.tipo === "efectivo")
      }
      if (medio === "tarjeta") {
        return valoresCaja.find(v => v.subtipo === "tarjeta" && v.moneda === moneda)
            ?? valoresCaja.find(v => v.subtipo === "tarjeta")
      }
      if (medio === "transferencia") {
        return valoresCaja.find(v => v.subtipo === "banco" && v.moneda === moneda)
            ?? valoresCaja.find(v => v.subtipo === "banco")
      }
      return undefined
    }
    const nuevosPagos: Pago[] = prefillData.medios.map(mp => {
      // Moneda del pago = la que el cliente usó originalmente. Si el medio no
      // tiene `moneda` guardada (facturas viejas pre-script 095), caemos a la
      // moneda de la factura.
      const monedaPago = mp.moneda ?? prefillData.moneda
      const cv = mapearMedio(mp.medio, monedaPago)
      return {
        id: crypto.randomUUID(),
        valor_id: cv?.id ?? "",
        valor_nombre: cv?.nombre ?? "",
        tipo_valor: cv?.tipo ?? "",
        importe: mp.importe,
        moneda: monedaPago,
        importe_comprobante: mp.importe,
        moneda_comprobante: monedaPago,
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
    // Cargar facturas pendientes (deudas) + NCs/ajustes con saldo (créditos).
    // Mostramos ambos como imputaciones para que el operador pueda matchear.
    Promise.all([
      fetch(`/api/facturas?cliente_id=${reciboClienteId}&saldo_min=0`)
        .then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/ajustes-clientes?cliente_id=${reciboClienteId}&estado=activo&con_saldo=true`)
        .then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([facts, ajustes]) => {
      const facturas: Imputacion[] = (Array.isArray(facts) ? facts : []).map((f: any) => ({
        id: crypto.randomUUID(),
        tipo_comprobante: "factura",
        comprobante_id: f.id,
        comprobante_referencia: f.numero,
        fecha_comprobante: f.fecha,
        fecha_vencimiento: f.fecha_vencimiento ?? f.fecha,
        // Importe original de la factura (total) — para que el operador vea
        // el monto facturado, aunque parte ya esté cubierto por créditos previos.
        saldo_moneda: Number(f.total ?? f.saldo ?? 0),
        moneda_comprobante: f.moneda === "USD" ? "USD" : "ARS",
        // Saldo pendiente a cobrar (después de aplicar credito_toma si hubo)
        saldo_actual: Number(f.saldo ?? 0),
        asignacion: 0,
        categoria: null,
      }))
      const creditos: Imputacion[] = (Array.isArray(ajustes) ? ajustes : [])
        .filter((a: any) => Number(a.saldo_disponible ?? 0) > 0)
        .map((a: any) => {
          const tipo: "nota_credito" | "ajuste" = a.numero?.startsWith("NC") ? "nota_credito" : "ajuste"
          // Saldo negativo porque es CRÉDITO (lo que el cliente tiene a favor).
          // Para imputar, "absorbe" deuda. Lo mostramos como saldo positivo en
          // la UI (el operador lo asigna como cualquier crédito) pero el
          // tipo_comprobante distingue del flujo "factura".
          return {
            id: crypto.randomUUID(),
            tipo_comprobante: tipo,
            comprobante_id: a.id,
            comprobante_referencia: a.numero,
            fecha_comprobante: a.fecha,
            fecha_vencimiento: a.fecha,
            saldo_moneda: Number(a.saldo_disponible ?? 0),
            moneda_comprobante: a.moneda === "USD" ? "USD" : "ARS",
            saldo_actual: Number(a.saldo_disponible ?? 0),
            asignacion: 0,
            categoria: a.categoria ?? null,
          }
        })
      // Ordenar por fecha de vencimiento ascendente (FIFO). Mezclar facturas y créditos.
      const all = [...facturas, ...creditos].sort((x, y) =>
        (x.fecha_vencimiento ?? x.fecha_comprobante ?? "").localeCompare(y.fecha_vencimiento ?? y.fecha_comprobante ?? "")
      )
      setImputaciones(all)
    })

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
  // Moneda principal del recibo: si hay al menos un pago USD, el recibo es USD.
  // (Caso mixto típico: factura USD + parte del cobro en ARS al cambio).
  const monedaRecibo: "ARS" | "USD" = pagos.some(p => p.moneda === "USD") ? "USD" : "ARS"

  // Total de pagos convertido a la moneda del recibo. Sin conversión los
  // mixtos quedan completamente incorrectos (ej: 100 USD + 140.000 ARS suma
  // 140.100 si se ignora la cotización; convertido da 200 USD).
  const cotRecibo = cotizacionBlue || 1
  const aMonedaRecibo = (importe: number, moneda: "ARS" | "USD"): number => {
    if (moneda === monedaRecibo) return importe
    if (cotRecibo <= 0) return importe
    if (moneda === "ARS" && monedaRecibo === "USD") return importe / cotRecibo
    if (moneda === "USD" && monedaRecibo === "ARS") return importe * cotRecibo
    return importe
  }
  const totalPagos = pagos.reduce(
    (s, p) => s + aMonedaRecibo(p.importe_comprobante || 0, p.moneda_comprobante as "ARS" | "USD"),
    0,
  )

  // Modelo correcto: las facturas son DESTINOS (deuda pagada), las NCs/ajustes
  // son FUENTES de fondos (suman al cash). Por eso noConciliado se calcula:
  //   noConciliado = pagos_cash + NC_asignadas - factura_asignadas
  const totalAsigFacturas = imputaciones
    .filter(i => i.tipo_comprobante === "factura" || i.tipo_comprobante === "nota_debito")
    .reduce((s, i) => s + aMonedaRecibo(i.asignacion || 0, (i.moneda_comprobante ?? monedaRecibo) as "ARS" | "USD"), 0)
  const totalAsigCreditos = imputaciones
    .filter(i => i.tipo_comprobante === "nota_credito" || i.tipo_comprobante === "ajuste")
    .reduce((s, i) => s + aMonedaRecibo(i.asignacion || 0, (i.moneda_comprobante ?? monedaRecibo) as "ARS" | "USD"), 0)
  // totalAsig (lo que se ve como "asignado" en la UI) = solo facturas, no las NCs
  const totalAsig = totalAsigFacturas
  const noConciliado = Math.max(0, totalPagos + totalAsigCreditos - totalAsigFacturas)

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
    // Si hay pagos en monedas mixtas (ej: USD + ARS), guardamos la cotización
    // para que el publicar API pueda hacer el cruce ARS↔USD correctamente.
    tipo_cotizacion: pagos.some(p => p.moneda !== monedaRecibo) ? "blue" : null,
    cotizacion: pagos.some(p => p.moneda !== monedaRecibo) ? (cotizacionBlue || null) : null,
    pagos: pagos.map(p => ({
      valor_id: p.valor_id,
      valor_nombre: p.valor_nombre,
      tipo_valor: p.tipo_valor,
      importe: p.importe,
      moneda: p.moneda,
      importe_comprobante: p.importe_comprobante,
      moneda_comprobante: p.moneda_comprobante,
      // Cotización del pago — la del recibo si difiere de la moneda principal,
      // sino null. El asiento contable la usa para convertir a ARS.
      cotizacion: p.moneda !== monedaRecibo ? (cotizacionBlue || null) : null,
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
    if (publicando) return
    setErrorAccion(null)

    // Confirmar funciona en dos escenarios:
    //   1. Recibo nuevo (sin id): lo creamos PRIMERO con POST y obtenemos el id.
    //   2. Borrador existente: PUT para guardar cambios y después publicar.
    // El usuario aprieta "Confirmar" sin pasar por "Guardar" — el handler
    // se encarga de ambos pasos.
    setPublicando(true)
    try {
      const errVal = validar()
      if (errVal) { setErrorAccion(errVal); setPublicando(false); return }

      let reciboId = initialId
      if (!isEdit || !reciboId) {
        // 1. Crear el recibo (POST)
        const postRes = await fetch("/api/recibos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayload()),
        })
        if (!postRes.ok) {
          const text = await postRes.text()
          setErrorAccion(`No se pudo crear el recibo: ${text}`)
          setPublicando(false)
          return
        }
        const created = await postRes.json()
        reciboId = created?.id
        if (!reciboId) {
          setErrorAccion("No se pudo obtener el ID del recibo recién creado")
          setPublicando(false)
          return
        }
      } else {
        // 2. Borrador existente — guardar cambios actuales antes de publicar
        const putRes = await fetch(`/api/recibos/${reciboId}`, {
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

      const pubRes = await fetch(`/api/recibos/${reciboId}/publicar`, {
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
      router.push(`/ventas/recibos/${reciboId}`)
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

  // Helper genérico para machear un crédito (en cualquier moneda) contra
  // facturas pendientes FIFO. Recibe id, monto, moneda, y una función
  // para setear la asignación interna del crédito (para mostrar visualmente
  // que está machiado). Devuelve true si pudo machear algo.
  const machearGenerico = (
    monto: number,
    monedaCredito: "ARS" | "USD",
    yaAsignado: boolean,
    onSetAsignacion: (consumido: number) => void
  ) => {
    if (yaAsignado) {
      // Desmachear: limpiar todas las asignaciones de facturas + reset propio
      setImputaciones(prev => prev.map(i => i.tipo_comprobante === "factura"
        ? { ...i, asignacion: 0 } : i
      ))
      onSetAsignacion(0)
      return
    }
    let deudas = imputaciones
      .filter(i => i.tipo_comprobante === "factura" && i.saldo_actual > 0 && i.moneda_comprobante === monedaCredito)
      .sort((a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""))
    let usandoCruce = false
    if (deudas.length === 0) {
      deudas = imputaciones
        .filter(i => i.tipo_comprobante === "factura" && i.saldo_actual > 0)
        .sort((a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""))
      usandoCruce = true
    }
    if (deudas.length === 0) return

    const monedaDeuda = deudas[0].moneda_comprobante
    const cot = cotizacionBlue || 1
    let saldoEnDeuda = monto
    if (usandoCruce && cot > 0) {
      if (monedaCredito === "USD" && monedaDeuda === "ARS") saldoEnDeuda = monto * cot
      else if (monedaCredito === "ARS" && monedaDeuda === "USD") saldoEnDeuda = monto / cot
    }

    let restante = saldoEnDeuda
    const asignacionesDeuda = new Map<string, number>()
    for (const d of deudas) {
      if (restante <= 0.005) break
      const asigPrevia = d.asignacion || 0
      const espacio = d.saldo_actual - asigPrevia
      const asig = Math.min(espacio, restante)
      asignacionesDeuda.set(d.id, asigPrevia + asig)
      restante -= asig
    }
    const consumidoEnDeuda = saldoEnDeuda - restante
    let consumidoEnCredito = consumidoEnDeuda
    if (usandoCruce && cot > 0) {
      if (monedaCredito === "USD" && monedaDeuda === "ARS") consumidoEnCredito = consumidoEnDeuda / cot
      else if (monedaCredito === "ARS" && monedaDeuda === "USD") consumidoEnCredito = consumidoEnDeuda * cot
    }
    consumidoEnCredito = Math.round(consumidoEnCredito * 100) / 100

    setImputaciones(prev => prev.map(i =>
      asignacionesDeuda.has(i.id)
        ? { ...i, asignacion: Math.round(asignacionesDeuda.get(i.id)! * 100) / 100 }
        : i
    ))
    onSetAsignacion(consumidoEnCredito)
  }

  // Macheo de pago del recibo (medio de pago) contra deudas. Usa el helper genérico.
  // Trackeamos qué pagos están machiados con `pagosMachiados` (set de IDs).
  const machearPago = (pagoId: string) => {
    const pago = pagos.find(p => p.id === pagoId)
    if (!pago) return
    const yaMachiado = pagosMachiados.has(pagoId)
    machearGenerico(
      pago.importe,
      pago.moneda,
      yaMachiado,
      () => {
        setPagosMachiados(prev => {
          const s = new Set(prev)
          if (yaMachiado) s.delete(pagoId)
          else s.add(pagoId)
          return s
        })
      }
    )
  }

  // Tickear/destickear un crédito (NC/ajuste) en el recibo.
  //
  // Modelo:
  //  - El crédito (NC) consume su saldo_disponible cuando se ticka.
  //  - Al ticarlo, también ADICIONA su monto a la asignación de las facturas
  //    abiertas FIFO (preserva lo que ya estaba asignado por el prefill o por
  //    los pagos). Así factura.asig = (cash aplicado) + (NCs aplicadas).
  //  - Al destickear, resta del factura.asig lo que el NC había sumado.
  const machearCredito = (creditoId: string) => {
    const credito = imputaciones.find(i => i.id === creditoId)
    if (!credito || credito.tipo_comprobante === "factura") return

    if (credito.asignacion > 0) {
      // Destickear — solo limpia la NC. No tocamos las asignaciones de
      // facturas: pueden venir del prefill, de pagos ticked, o ediciones
      // manuales del operador, y no podemos saber con certeza cuánto puso
      // este NC ahí. Si el operador necesita reducir factura.asig, lo edita
      // manualmente.
      setImputaciones(prev => prev.map(i =>
        i.id === creditoId ? { ...i, asignacion: 0 } : i
      ))
      return
    }

    // Tickear — la NC siempre se marca por su saldo total (es la "fuente de
    // fondos" que el operador eligió aplicar). En paralelo, si las facturas
    // tienen espacio (asig < saldo), incrementamos su asig FIFO para reflejar
    // que ahora la NC está cubriendo parte de la deuda. Si no tienen espacio
    // (típico cuando el prefill ya asignó full saldo), igual la NC queda
    // marcada — la conservación se valida en el publicar API:
    //     factura.asig  ==  pagos cash + NC.asig
    const deudas = imputaciones
      .filter(i => i.tipo_comprobante === "factura" && i.saldo_actual > 0
        && i.moneda_comprobante === credito.moneda_comprobante)
      .sort((a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""))
    let restante = credito.saldo_actual
    const sumas = new Map<string, number>()
    for (const d of deudas) {
      if (restante <= 0.005) break
      const asigPrevia = d.asignacion || 0
      const espacio = d.saldo_actual - asigPrevia
      if (espacio <= 0.005) continue
      const aSumar = Math.min(espacio, restante)
      sumas.set(d.id, asigPrevia + aSumar)
      restante -= aSumar
    }
    // NC.asig = saldo siempre (no `consumido`). Si las facturas estaban llenas,
    // sumas queda vacío y solo se ticka la NC sin tocar facturas.
    setImputaciones(prev => prev.map(i => {
      if (i.id === creditoId) return { ...i, asignacion: credito.saldo_actual }
      if (sumas.has(i.id)) return { ...i, asignacion: Math.round(sumas.get(i.id)! * 100) / 100 }
      return i
    }))
  }

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
          {esBorrador && (
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
              <SearchableSelect
                value={reciboClienteId}
                onChange={v => setReciboClienteId(v == null ? null : Number(v))}
                options={clientes.map(c => ({
                  value: String(c.id),
                  label: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre,
                  hint: c.telefono ? `Tel: ${c.telefono}` : undefined,
                  searchExtra: `${c.codigo ?? ""} ${c.telefono ?? ""} ${c.numero_documento ?? ""}`,
                }))}
                placeholder="Buscar cliente por nombre, código o teléfono…"
                disabled={!esBorrador}
                required
              />
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

          {tab === "comprobantes" && (() => {
            if (!reciboClienteId) {
              return <p className="text-sm text-gray-400 py-6 text-center">Seleccioná un cliente primero.</p>
            }
            const debitosARS = imputaciones.filter(i => i.tipo_comprobante === "factura" && (i.moneda_comprobante === "ARS"))
            const debitosUSD = imputaciones.filter(i => i.tipo_comprobante === "factura" && (i.moneda_comprobante === "USD"))
            const creditosClienteARS = imputaciones.filter(i => i.tipo_comprobante !== "factura" && i.moneda_comprobante === "ARS")
            const creditosClienteUSD = imputaciones.filter(i => i.tipo_comprobante !== "factura" && i.moneda_comprobante === "USD")
            const totalAsigARS = imputaciones.filter(i => i.moneda_comprobante === "ARS" && i.tipo_comprobante === "factura").reduce((s, i) => s + (i.asignacion || 0), 0)
            const totalAsigUSD = imputaciones.filter(i => i.moneda_comprobante === "USD" && i.tipo_comprobante === "factura").reduce((s, i) => s + (i.asignacion || 0), 0)
            const totalCreditosARS = pagos.filter(p => p.moneda === "ARS").reduce((s, p) => s + p.importe, 0)
            const totalCreditosUSD = pagos.filter(p => p.moneda === "USD").reduce((s, p) => s + p.importe, 0)

            const renderPanelMoneda = (
              moneda: "ARS" | "USD",
              debitos: Imputacion[],
              creditosCliente: Imputacion[]
            ) => {
              const totalAsigMon = debitos.reduce((s, i) => s + (i.asignacion || 0), 0)
              const todosMarcados = debitos.length > 0 && debitos.every(i => i.asignacion > 0)
              const algunoMarcado = debitos.some(i => i.asignacion > 0)
              const toggleTodos = () => {
                const marcar = !todosMarcados
                const ids = new Set(debitos.map(i => i.id))
                setImputaciones(prev => prev.map(x =>
                  ids.has(x.id) ? { ...x, asignacion: marcar ? x.saldo_actual : 0 } : x
                ))
              }
              const toggleImp = (imp: Imputacion) => {
                const nueva = imp.asignacion > 0 ? 0 : imp.saldo_actual
                cambiarAsignacion(imp.id, nueva)
              }
              return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b bg-white">
                    <h3 className="text-sm font-bold text-gray-800">Cuenta Corriente {moneda}</h3>
                  </div>
                  {/* Débitos */}
                  <div className="bg-rose-50 border-b">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs font-semibold text-rose-700">Débitos {moneda}</span>
                      <span className="text-xs font-medium text-rose-600">{debitos.length}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-600 uppercase">
                          <th className="text-left py-2 px-3">Comprobante</th>
                          <th className="text-left py-2 px-3">Venc.</th>
                          <th className="text-right py-2 px-3">Importe</th>
                          <th className="text-right py-2 px-3">Saldo</th>
                          <th className="text-center py-2 px-3 w-12">
                            {esBorrador && debitos.length > 0 && (
                              <input
                                type="checkbox"
                                checked={todosMarcados}
                                ref={el => { if (el) el.indeterminate = algunoMarcado && !todosMarcados }}
                                onChange={toggleTodos}
                                className="w-4 h-4 cursor-pointer accent-indigo-700"
                                title="Marcar / desmarcar todos"
                              />
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {debitos.length === 0 ? (
                          <tr><td colSpan={5} className="py-4 text-center text-sm text-gray-400">Sin facturas pendientes en {moneda}</td></tr>
                        ) : debitos.map(imp => {
                          const seleccionado = imp.asignacion > 0
                          return (
                            <tr
                              key={imp.id}
                              onClick={() => esBorrador && toggleImp(imp)}
                              className={`border-b border-gray-100 transition-colors ${esBorrador ? "cursor-pointer" : ""} ${seleccionado ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-gray-50"}`}
                            >
                              <td className="py-2 px-3 text-sm font-medium text-blue-700">{imp.comprobante_referencia}</td>
                              <td className="py-2 px-3 text-sm">{imp.fecha_vencimiento ? formatDate(imp.fecha_vencimiento) : "—"}</td>
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
                                ) : seleccionado ? (
                                  <span className="text-indigo-600 font-bold text-xs">{formatCurrency(imp.asignacion, moneda)}</span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {debitos.length > 0 && (
                        <tfoot className="bg-gray-50 font-semibold text-sm">
                          <tr>
                            <td colSpan={4} className="py-2 px-3 text-right text-gray-600">Total conciliado:</td>
                            <td className="py-2 px-3 text-center text-indigo-800">{formatCurrency(totalAsigMon, moneda)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Créditos del cliente (NCs/ajustes) en esta moneda — click toggle macheo */}
                  {creditosCliente.length > 0 && (
                    <>
                      <div className="bg-emerald-50 border-y">
                        <div className="flex items-center justify-between px-4 py-2">
                          <span className="text-xs font-semibold text-emerald-700">Créditos del cliente {moneda}</span>
                          <span className="text-xs font-medium text-emerald-600">{creditosCliente.length}</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b bg-gray-50">
                            <tr className="text-xs font-semibold text-gray-600 uppercase">
                              <th className="text-left py-2 px-3">Comprobante</th>
                              <th className="text-left py-2 px-3">Tipo</th>
                              <th className="text-right py-2 px-3">Saldo</th>
                              <th className="text-center py-2 px-3 w-12"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {creditosCliente.map(c => {
                              const esTomaEquipo = /equipos? en parte de pago/i.test(c.categoria ?? "")
                              const tipoLabel = c.tipo_comprobante === "nota_credito" ? "NC" : "Ajuste"
                              const seleccionado = c.asignacion > 0
                              return (
                                <tr
                                  key={c.id}
                                  onClick={() => esBorrador && machearCredito(c.id)}
                                  className={`border-b border-gray-100 transition-colors ${esBorrador ? "cursor-pointer" : ""} ${
                                    seleccionado
                                      ? "bg-emerald-100 hover:bg-emerald-200"
                                      : esTomaEquipo ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"
                                  }`}
                                >
                                  <td className="py-2 px-3">
                                    <span className="font-mono text-blue-700 text-sm">{c.comprobante_referencia}</span>
                                    {esTomaEquipo && (
                                      <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-amber-200 text-amber-900 rounded">Toma de equipo</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-xs text-gray-600">{tipoLabel}</td>
                                  <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(c.saldo_actual, moneda)}</td>
                                  <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                    {esBorrador ? (
                                      <input
                                        type="checkbox"
                                        checked={seleccionado}
                                        onChange={() => machearCredito(c.id)}
                                        className="w-4 h-4 cursor-pointer accent-emerald-600"
                                      />
                                    ) : seleccionado ? (
                                      <span className="text-emerald-700 font-bold text-xs">{formatCurrency(c.asignacion, moneda)}</span>
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
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {/* Panel Créditos del Recibo (medios de pago) — fila clickeable
                    para machear contra deudas del cliente */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">Créditos de este Recibo</h3>
                    <span className="text-xs text-gray-400">Click en la fila para machear con débitos</span>
                  </div>
                  {pagos.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-4">Sin medios de pago cargados todavía.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr className="text-xs font-semibold text-gray-600 uppercase">
                            <th className="text-left py-2 px-3">Medio de Pago</th>
                            <th className="text-right py-2 px-3">Importe</th>
                            <th className="text-center py-2 px-3">Moneda</th>
                            <th className="text-center py-2 px-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagos.map(p => {
                            const machiado = pagosMachiados.has(p.id)
                            const labelMoneda = ` ${p.moneda}`
                            return (
                              <tr
                                key={p.id}
                                onClick={() => esBorrador && machearPago(p.id)}
                                className={`border-b border-gray-100 transition-colors ${esBorrador ? "cursor-pointer" : ""} ${machiado ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-gray-50"}`}
                              >
                                <td className="py-2 px-3 text-sm font-medium">
                                  {p.valor_nombre}{labelMoneda}
                                  {p.tarjeta_nombre && <span className="ml-2 text-xs text-gray-400">({p.tarjeta_nombre})</span>}
                                </td>
                                <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(p.importe, p.moneda)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${p.moneda === "USD" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{p.moneda}</span>
                                </td>
                                <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                                  {esBorrador ? (
                                    <input
                                      type="checkbox"
                                      checked={machiado}
                                      onChange={() => machearPago(p.id)}
                                      className="w-4 h-4 cursor-pointer accent-emerald-600"
                                    />
                                  ) : <span className="text-gray-300">—</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-gray-50 text-xs font-semibold text-gray-600">
                          {totalCreditosARS > 0 && (
                            <tr>
                              <td className="py-2 px-3">Total ARS</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(totalCreditosARS, "ARS")}</td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                          {totalCreditosUSD > 0 && (
                            <tr>
                              <td className="py-2 px-3">Total USD</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(totalCreditosUSD, "USD")}</td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {renderPanelMoneda("ARS", debitosARS, creditosClienteARS)}
                {renderPanelMoneda("USD", debitosUSD, creditosClienteUSD)}

                {ccResumen && (totalAsigARS > 0 || totalAsigUSD > 0) && (
                  <div className="border-t pt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>CC ARS: {formatCurrency(ccResumen.saldo_ars, "ARS")}</span>
                    <span>CC USD: {formatCurrency(ccResumen.saldo_usd, "USD")}</span>
                    {cotizacionBlue > 1 && <span>Cotización blue: 1 USD = ${cotizacionBlue.toLocaleString("es-AR")}</span>}
                  </div>
                )}
              </div>
            )
          })()}
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
                    // La moneda se deriva del valor seleccionado — no hay
                    // selector aparte para evitar divergencias ilógicas
                    // (un caja_valor en USD con pago en ARS no tiene sentido).
                    const v = valoresCaja.find(x => x.id === e.target.value)
                    if (v?.moneda === "USD") setNuevoPagoMoneda("USD")
                    else setNuevoPagoMoneda("ARS")
                  }}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Seleccionar…</option>
                  {valoresCaja.map(v => (
                    <option key={v.id} value={v.id}>{v.nombre} · {v.moneda}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Importe{nuevoPagoValorId ? <span className="ml-2 text-xs text-gray-400">(en {nuevoPagoMoneda})</span> : null}
                </label>
                <input
                  type="number"
                  value={nuevoPagoImporte}
                  onChange={e => setNuevoPagoImporte(e.target.value)}
                  step={0.01}
                  min={0}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
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
