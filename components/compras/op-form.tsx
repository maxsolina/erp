"use client"

import React, { useEffect, useMemo, useState } from "react"
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
interface ProveedorOpt {
  id: number
  codigo?: string
  nombre?: string
  razon_social?: string
  cuit?: string
  moneda_habitual?: string
  tipo_cotizacion_defecto?: string
}
interface Caja { id: string; nombre: string; sucursal: string; activo?: boolean }
interface CajaValor { id: string; nombre: string; tipo: string; subtipo?: string | null; moneda: string }

interface Pago {
  id: string
  valor_id: string
  valor_nombre: string
  tipo_valor: string
  importe: number
  moneda: "ARS" | "USD"
  importe_comprobante: number
  moneda_comprobante: "ARS" | "USD"
}

// Comprobante imputable. Un débito es una Factura de Compra con saldo > 0.
// Un crédito es una NC de Compra con saldo_disponible > 0 — al aplicar absorbe deuda.
interface Imputacion {
  id: string
  tipo_comprobante: "factura" | "nota_credito"
  comprobante_id: number
  comprobante_referencia: string
  fecha_comprobante: string | null
  fecha_vencimiento: string | null
  saldo_moneda: number           // total original del comprobante
  moneda_comprobante: "ARS" | "USD"
  saldo_actual: number           // saldo pendiente / disponible
  asignacion: number             // lo que el operador asigna
}

export default function OpForm({ initialId }: { initialId?: number }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursalActiva, currentUser, isSuperuser } = useERP()

  // ─── Loaders ────────────────────────────────────────────────────────────
  const [proveedores, setProveedores] = useState<ProveedorOpt[]>([])
  const [cajas, setCajas] = useState<Caja[]>([])
  const [valoresCaja, setValoresCaja] = useState<CajaValor[]>([])
  const [cargandoBase, setCargandoBase] = useState(true)
  const [cargandoOP, setCargandoOP] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)

  // ─── Form state ─────────────────────────────────────────────────────────
  const [numeroExistente, setNumeroExistente] = useState<string | null>(null)
  const [estadoExistente, setEstadoExistente] = useState<string | null>(null)
  const [opProveedorId, setOpProveedorId] = useState<number | null>(null)
  const [opCajaId, setOpCajaId] = useState<string>("")
  const [opConcepto, setOpConcepto] = useState("")
  const [opObservaciones, setOpObservaciones] = useState("")
  const [pagos, setPagos] = useState<Pago[]>([])
  const [imputaciones, setImputaciones] = useState<Imputacion[]>([])
  const [cotizacionBlue, setCotizacionBlue] = useState<number>(1)
  const [pagosMachiados, setPagosMachiados] = useState<Set<string>>(new Set())

  // Tabs
  const [tab, setTab] = useState<"pagos" | "comprobantes">("pagos")

  // Modal añadir pago
  const [showAddPagoModal, setShowAddPagoModal] = useState(false)
  const [nuevoPagoValorId, setNuevoPagoValorId] = useState<string>("")
  const [nuevoPagoImporte, setNuevoPagoImporte] = useState<string>("")
  const [nuevoPagoMoneda, setNuevoPagoMoneda] = useState<"ARS" | "USD">("ARS")

  // Submit state
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  // Cancelar publicado
  const [showCancelarModal, setShowCancelarModal] = useState(false)
  const [motivoCancel, setMotivoCancel] = useState("")
  const [cancelando, setCancelando] = useState(false)

  // ─── Cargar datos base ──────────────────────────────────────────────────
  useEffect(() => {
    let activo = true
    Promise.all([
      fetch("/api/compras/proveedores").then(r => r.json()).catch(() => []),
      fetch("/api/cajas").then(r => r.json()).catch(() => []),
      fetch("/api/contabilidad/cotizaciones?moneda_codigo=USD&tipo=blue&latest=true")
        .then(r => r.json()).catch(() => null),
    ]).then(([prov, ca, cot]) => {
      if (!activo) return
      if (Array.isArray(prov)) setProveedores(prov)
      if (Array.isArray(ca)) setCajas(ca)
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

  // ─── Cargar OP existente ────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/compras/ordenes-pago/${initialId}`)
      .then(async r => {
        if (!r.ok) {
          setErrorCarga(`Error ${r.status}`)
          setCargandoOP(false)
          return
        }
        const data = await r.json()
        setNumeroExistente(data.numero ?? null)
        setEstadoExistente(data.estado ?? null)
        setOpProveedorId(data.proveedor_id ?? null)
        setOpCajaId(data.caja_id ?? "")
        setOpConcepto(data.concepto ?? "")
        setOpObservaciones(data.observaciones ?? "")
        setPagos((data.medios_pago ?? []).map((m: any) => ({
          id: m.id ?? crypto.randomUUID(),
          valor_id: m.forma_pago_id ?? m.valor_id ?? "",
          valor_nombre: m.forma_pago_nombre ?? m.valor_nombre ?? "",
          tipo_valor: m.tipo_valor ?? "",
          importe: Number(m.importe ?? 0),
          moneda: m.moneda === "USD" ? "USD" : "ARS",
          importe_comprobante: Number(m.importe_comp ?? m.importe ?? 0),
          moneda_comprobante: m.moneda_comp === "USD" ? "USD" : "ARS",
        })))
        // Las imputaciones se reconstruyen al cargar las facturas/NCs del proveedor
        // (más abajo). Acá solo guardamos qué comprobantes vinieron de la DB para
        // marcar la asignación previa cuando lleguen.
        setCargandoOP(false)
      })
      .catch(err => {
        console.error(err)
        setErrorCarga("Error de red al cargar la OP")
        setCargandoOP(false)
      })
  }, [isEdit, initialId])

  // ─── Cargar valores de caja al cambiar caja ────────────────────────────
  useEffect(() => {
    if (!opCajaId) { setValoresCaja([]); return }
    // Superusuario o sin currentUser: ver TODOS los valores de la caja sin filtrar.
    // Operador normal: filtrar por los que tiene asignados en caja_valores_usuarios.
    if (isSuperuser || !currentUser?.id) {
      fetch(`/api/caja-valores?caja_id=${opCajaId}`)
        .then(r => r.json()).catch(() => [])
        .then(d => { if (Array.isArray(d)) setValoresCaja(d) })
      return
    }
    Promise.all([
      fetch(`/api/caja-valores?caja_id=${opCajaId}`).then(r => r.json()).catch(() => []),
      import("@/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient()
        return supabase
          .from("caja_valores_usuarios")
          .select("caja_valor_id")
          .eq("usuario_id", currentUser.id!)
          .then(({ data }) => (data ?? []).map((r: any) => r.caja_valor_id as string))
      }),
    ]).then(([valores, allowedIds]) => {
      if (!Array.isArray(valores)) { setValoresCaja([]); return }
      const set = new Set(allowedIds as string[])
      // Si el usuario no tiene ninguno permitido, mostramos todos (sin filtrar)
      // para no romperle el form a operadores recién creados.
      const filtered = set.size > 0 ? valores.filter((v: any) => set.has(v.id)) : valores
      setValoresCaja(filtered)
    }).catch(() => setValoresCaja([]))
  }, [opCajaId, currentUser?.id, isSuperuser])

  // Auto-seleccionar la primera caja en OP nueva
  useEffect(() => {
    if (isEdit) return
    if (opCajaId) return
    if (cajasFiltradas.length === 0) return
    setOpCajaId(cajasFiltradas[0].id)
  }, [isEdit, opCajaId, cajasFiltradas])

  // ─── Cargar facturas pendientes + NCs disponibles al cambiar proveedor ───
  useEffect(() => {
    if (!opProveedorId) {
      setImputaciones([])
      return
    }
    Promise.all([
      // Facturas de compra del proveedor con saldo > 0 (no canceladas)
      fetch(`/api/compras/facturas`).then(r => r.ok ? r.json() : []).catch(() => []),
      // NCs de compra del proveedor con saldo disponible > 0
      fetch(`/api/compras/notas-credito?proveedor_id=${opProveedorId}&con_saldo=true`)
        .then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([allFacts, ncs]) => {
      const facturas: Imputacion[] = (Array.isArray(allFacts) ? allFacts : [])
        .filter((f: any) => Number(f.proveedor_id) === opProveedorId
          && Number(f.saldo ?? 0) > 0
          && f.estado !== "cancelada")
        .map((f: any) => ({
          id: crypto.randomUUID(),
          tipo_comprobante: "factura",
          comprobante_id: f.id,
          comprobante_referencia: f.numero,
          fecha_comprobante: f.fecha,
          fecha_vencimiento: f.fecha_vencimiento ?? f.fecha,
          saldo_moneda: Number(f.total ?? f.saldo ?? 0),
          moneda_comprobante: f.moneda === "USD" ? "USD" : "ARS",
          saldo_actual: Number(f.saldo ?? 0),
          asignacion: 0,
        }))
      const creditos: Imputacion[] = (Array.isArray(ncs) ? ncs : [])
        .filter((nc: any) => Number(nc.saldo_disponible ?? nc.total ?? 0) > 0)
        .map((nc: any) => ({
          id: crypto.randomUUID(),
          tipo_comprobante: "nota_credito",
          comprobante_id: nc.id,
          comprobante_referencia: nc.numero,
          fecha_comprobante: nc.fecha,
          fecha_vencimiento: nc.fecha,
          saldo_moneda: Number(nc.saldo_disponible ?? nc.total ?? 0),
          moneda_comprobante: nc.moneda === "USD" ? "USD" : "ARS",
          saldo_actual: Number(nc.saldo_disponible ?? nc.total ?? 0),
          asignacion: 0,
        }))
      // FIFO por fecha (más viejos primero, mezclando facturas y NCs)
      const all = [...facturas, ...creditos].sort((x, y) =>
        (x.fecha_vencimiento ?? x.fecha_comprobante ?? "").localeCompare(
          y.fecha_vencimiento ?? y.fecha_comprobante ?? ""
        )
      )
      setImputaciones(all)
    })
  }, [opProveedorId])

  // ─── Helpers ────────────────────────────────────────────────────────────
  // Moneda principal de la OP: si hay al menos un pago USD, la OP es USD.
  const monedaOp: "ARS" | "USD" = pagos.some(p => p.moneda === "USD") ? "USD" : "ARS"

  const cotOp = cotizacionBlue || 1
  const aMonedaOp = (importe: number, moneda: "ARS" | "USD"): number => {
    if (moneda === monedaOp) return importe
    if (cotOp <= 0) return importe
    if (moneda === "ARS" && monedaOp === "USD") return importe / cotOp
    if (moneda === "USD" && monedaOp === "ARS") return importe * cotOp
    return importe
  }
  const totalPagos = pagos.reduce(
    (s, p) => s + aMonedaOp(p.importe_comprobante || 0, p.moneda_comprobante),
    0,
  )

  // Modelo (mismo que recibo, invertido):
  //   - Las facturas (deuda con proveedor) son DESTINOS — se cancelan al pagar.
  //   - Las NCs (crédito a favor) son FUENTES adicionales — absorben deuda.
  //   - noConciliado = pagos_cash + NC_asignadas - factura_asignadas
  const totalAsigFacturas = imputaciones
    .filter(i => i.tipo_comprobante === "factura")
    .reduce((s, i) => s + aMonedaOp(i.asignacion || 0, i.moneda_comprobante), 0)
  const totalAsigCreditos = imputaciones
    .filter(i => i.tipo_comprobante === "nota_credito")
    .reduce((s, i) => s + aMonedaOp(i.asignacion || 0, i.moneda_comprobante), 0)
  const noConciliado = Math.max(0, totalPagos + totalAsigCreditos - totalAsigFacturas)

  // Si la OP tiene algún pago en ARS, la conciliación es obligatoria (igual que en
  // recibos). Esto matchea la validación del endpoint /confirmar — pero la chequeamos
  // acá para no dejar al usuario apretar Confirmar y comerse un 400.
  const tienePagosARS = pagos.some(p => p.moneda === "ARS")
  const requiereConciliacion = tienePagosARS
  // Tolerancia matchea la del backend: $10 ARS para cross-currency (acomoda
  // los redondeos a 2 decimales en USD que se amplifican al multiplicar por
  // la cotización), $0,01 para misma moneda.
  const hayCrossCurrency = pagos.some(p => p.moneda !== monedaOp) ||
    imputaciones.some(i => (i.asignacion ?? 0) > 0 && i.moneda_comprobante !== monedaOp)
  const toleranciaConciliacion = hayCrossCurrency ? 10 : 0.01
  // El valor visible del "No conciliado" — si es menor a la tolerancia, lo mostramos
  // como 0 para no confundir al usuario (vs el cálculo crudo `noConciliado` que se
  // usa internamente).
  const noConciliadoVisible = noConciliado <= toleranciaConciliacion ? 0 : noConciliado
  const cumpleConciliacion = !requiereConciliacion || noConciliado <= toleranciaConciliacion

  const validar = (paraConfirmar = false): string | null => {
    if (!opProveedorId) return "Debe seleccionar un proveedor"
    if (!opCajaId) return "Debe seleccionar una caja"
    if (pagos.length === 0) return "Debe agregar al menos un medio de pago"
    if (paraConfirmar && !cumpleConciliacion) {
      return `Faltan $${noConciliado.toLocaleString("es-AR", { minimumFractionDigits: 2 })} sin conciliar. Asigná esa diferencia a una factura del proveedor o reducí los medios de pago antes de confirmar.`
    }
    return null
  }

  const construirPayload = () => ({
    sucursal_nombre: sucursalActiva?.nombre ?? null,
    // sucursal_id se omite a propósito — la columna en compras_ordenes_pago
    // está declarada como UUID pero las sucursales del sistema usan INTEGER,
    // así que mandar el id rompería con "invalid input syntax for type uuid".
    proveedor_id: opProveedorId,
    proveedor_nombre: proveedores.find(p => p.id === opProveedorId)?.razon_social
      ?? proveedores.find(p => p.id === opProveedorId)?.nombre
      ?? null,
    caja_id: opCajaId,
    caja_nombre: cajas.find(c => c.id === opCajaId)?.nombre ?? null,
    fecha: new Date().toISOString().slice(0, 10),
    concepto: opConcepto || null,
    observaciones: opObservaciones || null,
    importe: totalPagos,
    importe_no_conciliado: noConciliado,
    moneda: monedaOp,
    tipo_cotizacion: pagos.some(p => p.moneda !== monedaOp) ? "blue" : null,
    cotizacion: pagos.some(p => p.moneda !== monedaOp) ? (cotizacionBlue || null) : null,
    estado: estadoExistente ?? "borrador",
    medios_pago: pagos.map(p => ({
      forma_pago_id: p.valor_id,
      forma_pago_nombre: p.valor_nombre,
      nombre: p.valor_nombre,
      tipo_operacion: p.tipo_valor,
      importe: p.importe,
      moneda: p.moneda,
      importe_comp: p.importe_comprobante,
      moneda_comp: p.moneda_comprobante,
      cotizacion: p.moneda !== monedaOp ? (cotizacionBlue || null) : null,
    })),
    comprobantes: imputaciones
      .filter(i => i.asignacion > 0)
      .map(i => ({
        tipo: i.tipo_comprobante === "factura" ? "debito" : "credito",
        factura_id: i.comprobante_id,
        referencia: i.comprobante_referencia,
        fecha: i.fecha_comprobante,
        vencimiento: i.fecha_vencimiento,
        saldo_mon: i.saldo_moneda,
        moneda_comp: i.moneda_comprobante,
        saldo_original: i.saldo_actual,
        importe: i.asignacion,
        cotizacion: i.moneda_comprobante !== monedaOp ? (cotizacionBlue || null) : null,
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
        res = await fetch(`/api/compras/ordenes-pago/${initialId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayload()),
        })
      } else {
        res = await fetch("/api/compras/ordenes-pago", {
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
      router.push(`/compras/op/${id}`)
    } catch (e: any) {
      setErrorAccion(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const confirmarOP = async () => {
    if (publicando) return
    setErrorAccion(null)
    setPublicando(true)
    try {
      const errVal = validar(true)  // estricto — exige conciliación si hay ARS
      if (errVal) { setErrorAccion(errVal); setPublicando(false); return }

      // 1. Save (POST si es nueva, PUT si está en borrador)
      let opId = initialId
      if (!isEdit || !opId) {
        const postRes = await fetch("/api/compras/ordenes-pago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayload()),
        })
        if (!postRes.ok) {
          const text = await postRes.text()
          setErrorAccion(`No se pudo crear la OP: ${text}`)
          setPublicando(false)
          return
        }
        const created = await postRes.json()
        opId = created?.id
        if (!opId) {
          setErrorAccion("No se pudo obtener el ID de la OP recién creada")
          setPublicando(false)
          return
        }
      } else {
        const putRes = await fetch(`/api/compras/ordenes-pago/${opId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(construirPayload()),
        })
        if (!putRes.ok) {
          const text = await putRes.text()
          setErrorAccion(`No se pudo guardar antes de confirmar: ${text}`)
          setPublicando(false)
          return
        }
      }

      // 2. Llamar al confirmar
      const confRes = await fetch(`/api/compras/ordenes-pago/${opId}/confirmar`, {
        method: "POST",
      })
      if (!confRes.ok) {
        const text = await confRes.text()
        setErrorAccion(`Error al confirmar: ${text}`)
        setPublicando(false)
        return
      }
      router.push(`/compras/op/${opId}`)
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
      const res = await fetch(`/api/compras/ordenes-pago/${initialId}/cancelar`, {
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
      router.push(`/compras/op/${initialId}`)
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

    const nuevo: Pago = {
      id: crypto.randomUUID(),
      valor_id: valor.id,
      valor_nombre: valor.nombre,
      tipo_valor: valor.tipo,
      importe,
      moneda: nuevoPagoMoneda,
      importe_comprobante: importe,
      moneda_comprobante: nuevoPagoMoneda,
    }
    setPagos(prev => [...prev, nuevo])

    setNuevoPagoValorId("")
    setNuevoPagoImporte("")
    setNuevoPagoMoneda("ARS")
    setShowAddPagoModal(false)
  }

  const quitarPago = (id: string) => setPagos(prev => prev.filter(p => p.id !== id))
  const cambiarAsignacion = (id: string, val: number) =>
    setImputaciones(prev => prev.map(i =>
      i.id === id ? { ...i, asignacion: Math.max(0, Math.min(val, i.saldo_actual)) } : i
    ))

  // Helper genérico para machear un crédito (medio de pago o NC) contra
  // deudas (facturas) FIFO. Espejo exacto del macheo en recibos pero invertido:
  // acá los créditos pagan deuda, en recibos absorben deuda.
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
      .filter(i => i.tipo_comprobante === "factura" && i.saldo_actual > 0
        && i.moneda_comprobante === monedaCredito)
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

  // Macheo de un pago contra deudas (FIFO)
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

  // Tickear/destickear una NC. Igual que recibos: marca la NC y agrega
  // su monto a las facturas FIFO con espacio.
  const machearCredito = (creditoId: string) => {
    const credito = imputaciones.find(i => i.id === creditoId)
    if (!credito || credito.tipo_comprobante === "factura") return

    if (credito.asignacion > 0) {
      // Destickear — solo limpia la NC (el operador edita facturas manualmente si necesita)
      setImputaciones(prev => prev.map(i =>
        i.id === creditoId ? { ...i, asignacion: 0 } : i
      ))
      return
    }

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
    setImputaciones(prev => prev.map(i => {
      if (i.id === creditoId) return { ...i, asignacion: credito.saldo_actual }
      if (sumas.has(i.id)) return { ...i, asignacion: Math.round(sumas.get(i.id)! * 100) / 100 }
      return i
    }))
  }

  // ─── Render guards ──────────────────────────────────────────────────────
  if (cargandoBase || cargandoOP) {
    return <div className="p-12 text-center text-gray-500">Cargando datos…</div>
  }
  if (errorCarga) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-600 mb-3">{errorCarga}</p>
        <button onClick={() => router.push("/compras/op")} className="text-indigo-700 hover:underline">
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
              {isEdit ? `Editar ${numeroExistente ?? "OP"}` : "Nueva Orden de Pago"}
            </h1>
            {estadoExistente && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                estadoExistente === "borrador" ? "bg-gray-100 text-gray-700"
                : estadoExistente === "publicado" ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
              }`}>
                {estadoExistente === "borrador" ? "Borrador"
                  : estadoExistente === "publicado" ? "Publicado"
                  : "Cancelado"}
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
              onClick={confirmarOP}
              disabled={guardando || publicando || !cumpleConciliacion}
              title={!cumpleConciliacion
                ? `Faltan $${noConciliado.toLocaleString("es-AR", { minimumFractionDigits: 2 })} sin conciliar — asigná esa diferencia a una factura antes de confirmar`
                : "Confirmar la OP y publicar movimientos de caja + asiento contable"}
              className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
              Cancelar OP
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

      {esBorrador && requiereConciliacion && !cumpleConciliacion && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Faltan ${noConciliado.toLocaleString("es-AR", { minimumFractionDigits: 2 })} sin conciliar.</strong>{" "}
            La OP tiene medios en ARS — el sistema exige asignar TODO el importe a facturas específicas (o NCs).
            Andá al tab <strong>Comprobantes</strong> y marcá las facturas/NC del proveedor hasta que el total quede en cero.
            El botón "Confirmar" queda bloqueado hasta entonces.
          </div>
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
              <label className="text-xs font-medium text-gray-500">Proveedor *</label>
              <SearchableSelect
                value={opProveedorId}
                onChange={v => setOpProveedorId(v == null ? null : Number(v))}
                options={proveedores.map(p => ({
                  value: String(p.id),
                  label: p.codigo
                    ? `${p.codigo} — ${p.razon_social ?? p.nombre ?? ""}`
                    : (p.razon_social ?? p.nombre ?? ""),
                  hint: p.cuit ? `CUIT: ${p.cuit}` : undefined,
                  searchExtra: `${p.codigo ?? ""} ${p.cuit ?? ""}`,
                }))}
                placeholder="Buscar proveedor por nombre, código o CUIT…"
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
                  value={`$ ${noConciliadoVisible.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  disabled
                  className={`w-full border rounded px-2 py-1.5 text-sm ${noConciliadoVisible > 0.01 ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-gray-50"}`}
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Caja *</label>
              <select
                value={opCajaId}
                onChange={e => setOpCajaId(e.target.value)}
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
                value={opConcepto}
                onChange={e => setOpConcepto(e.target.value)}
                disabled={!esBorrador}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Observaciones</label>
              <input
                value={opObservaciones}
                onChange={e => setOpObservaciones(e.target.value)}
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
                      if (!opCajaId) { alert("Seleccioná una caja primero"); return }
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
                      {esBorrador && <th className="w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map(p => (
                      <tr key={p.id} className="border-b">
                        <td className="py-1.5 px-3">{p.valor_nombre}</td>
                        <td className="text-right px-3 font-medium">{formatCurrency(p.importe, p.moneda)}</td>
                        <td className="px-3">{p.moneda}</td>
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
            if (!opProveedorId) {
              return <p className="text-sm text-gray-400 py-6 text-center">Seleccioná un proveedor primero.</p>
            }
            const debitosARS = imputaciones.filter(i => i.tipo_comprobante === "factura" && i.moneda_comprobante === "ARS")
            const debitosUSD = imputaciones.filter(i => i.tipo_comprobante === "factura" && i.moneda_comprobante === "USD")
            const creditosARS = imputaciones.filter(i => i.tipo_comprobante !== "factura" && i.moneda_comprobante === "ARS")
            const creditosUSD = imputaciones.filter(i => i.tipo_comprobante !== "factura" && i.moneda_comprobante === "USD")
            const totalPagosARS = pagos.filter(p => p.moneda === "ARS").reduce((s, p) => s + p.importe, 0)
            const totalPagosUSD = pagos.filter(p => p.moneda === "USD").reduce((s, p) => s + p.importe, 0)

            const renderPanelMoneda = (
              moneda: "ARS" | "USD",
              debitos: Imputacion[],
              creditosProv: Imputacion[]
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
                if (imp.asignacion > 0) {
                  // Desmarcar
                  setImputaciones(prev => prev.map(x =>
                    x.id === imp.id ? { ...x, asignacion: 0 } : x
                  ))
                  return
                }
                // Espejo de la lógica de recibos: asignación = min(saldo_factura, cash_disponible).
                // Si los pagos no alcanzan a cubrir el total de la factura, asigna sólo lo que
                // tenés cash → la factura queda con saldo a favor del proveedor (deuda pendiente).
                const monedaImp = imp.moneda_comprobante
                const cotiz = cotizacionBlue || 1
                // Crédito directo: pagos en la misma moneda que la factura
                const creditoDirecto = pagos.filter(p => p.moneda === monedaImp).reduce((s, p) => s + p.importe, 0)
                // Crédito cruzado: pagos en la otra moneda, convertidos por cotización
                const creditoCruce = monedaImp === "USD"
                  ? pagos.filter(p => p.moneda === "ARS").reduce((s, p) => s + p.importe / cotiz, 0)
                  : pagos.filter(p => p.moneda === "USD").reduce((s, p) => s + p.importe * cotiz, 0)
                const totalCredito = creditoDirecto + creditoCruce
                // Lo que ya está asignado a OTRAS facturas de la misma moneda
                const yaAsig = imputaciones
                  .filter(x => x.id !== imp.id && x.tipo_comprobante === "factura" && x.moneda_comprobante === monedaImp)
                  .reduce((s, x) => s + (x.asignacion || 0), 0)
                const disponible = Math.max(0, totalCredito - yaAsig)
                const asig = Math.min(imp.saldo_actual, disponible)
                setImputaciones(prev => prev.map(x =>
                  x.id === imp.id ? { ...x, asignacion: Math.round(asig * 100) / 100 } : x
                ))
              }
              return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b bg-white">
                    <h3 className="text-sm font-bold text-gray-800">Cuenta Corriente {moneda}</h3>
                  </div>
                  {/* Débitos (facturas a pagar) */}
                  <div className="bg-rose-50 border-b">
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-xs font-semibold text-rose-700">Facturas a pagar {moneda}</span>
                      <span className="text-xs font-medium text-rose-600">{debitos.length}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50">
                        <tr className="text-xs font-semibold text-gray-600 uppercase">
                          <th className="text-left py-2 px-3">Comprobante</th>
                          <th className="text-left py-2 px-3">Venc.</th>
                          <th className="text-right py-2 px-3">Total</th>
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

                  {/* Créditos del proveedor (NCs) en esta moneda */}
                  {creditosProv.length > 0 && (
                    <>
                      <div className="bg-emerald-50 border-y">
                        <div className="flex items-center justify-between px-4 py-2">
                          <span className="text-xs font-semibold text-emerald-700">Notas de Crédito {moneda}</span>
                          <span className="text-xs font-medium text-emerald-600">{creditosProv.length}</span>
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
                            {creditosProv.map(c => {
                              const seleccionado = c.asignacion > 0
                              return (
                                <tr
                                  key={c.id}
                                  onClick={() => esBorrador && machearCredito(c.id)}
                                  className={`border-b border-gray-100 transition-colors ${esBorrador ? "cursor-pointer" : ""} ${
                                    seleccionado
                                      ? "bg-emerald-100 hover:bg-emerald-200"
                                      : "hover:bg-gray-50"
                                  }`}
                                >
                                  <td className="py-2 px-3">
                                    <span className="font-mono text-blue-700 text-sm">{c.comprobante_referencia}</span>
                                  </td>
                                  <td className="py-2 px-3 text-xs text-gray-600">NC</td>
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
                {/* Panel Pagos de esta OP — fila clickeable para machear contra deuda */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b bg-white flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">Pagos de esta OP</h3>
                    <span className="text-xs text-gray-400">Click en la fila para machear con facturas</span>
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
                            return (
                              <tr
                                key={p.id}
                                onClick={() => esBorrador && machearPago(p.id)}
                                className={`border-b border-gray-100 transition-colors ${esBorrador ? "cursor-pointer" : ""} ${machiado ? "bg-emerald-50 hover:bg-emerald-100" : "hover:bg-gray-50"}`}
                              >
                                <td className="py-2 px-3 text-sm font-medium">
                                  {p.valor_nombre} {p.moneda}
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
                          {totalPagosARS > 0 && (
                            <tr>
                              <td className="py-2 px-3">Total ARS</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(totalPagosARS, "ARS")}</td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                          {totalPagosUSD > 0 && (
                            <tr>
                              <td className="py-2 px-3">Total USD</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(totalPagosUSD, "USD")}</td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {renderPanelMoneda("ARS", debitosARS, creditosARS)}
                {renderPanelMoneda("USD", debitosUSD, creditosUSD)}

                {cotizacionBlue > 1 && (
                  <div className="border-t pt-3 text-xs text-gray-500">
                    <span>Cotización blue: 1 USD = ${cotizacionBlue.toLocaleString("es-AR")}</span>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar OP</h3>
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
                {cancelando ? "Cancelando…" : "Cancelar OP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
