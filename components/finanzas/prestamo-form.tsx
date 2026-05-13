"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, DollarSign, Plus, Trash2, Banknote, CalendarPlus, Ban } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { type TipoPrestamo, type CuentaBancaria, formatCurrency, useMonedas, useCajasPermitidasParaUsuario } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface Cuota {
  id: string
  numero_cuota: number
  fecha_vencimiento: string
  capital: number
  interes: number
  total: number
  saldo: number
  estado: "pendiente" | "conciliado" | "vencido"
  fecha_pago: string | null
}
interface Gasto {
  id: string
  descripcion: string
  importe: number
  cuenta_contable: string
}

type Form = {
  tipo_id: string
  entidad_id: string
  entidad_nombre_manual: string  // si se usa un particular/empresa no bancaria
  nro_prestamo: string
  moneda: string
  capital: number
  tasa_porcentaje: number
  iva: number
  percepcion_iva: number
  percepcion_iibb: number
  otros_gastos: number
  fecha: string
  sucursal: string
  caja_id: string
  sistema_amortizacion: "frances" | "aleman" | "americano" | "bullet" | "perpetuo"
  es_preexistente: boolean
  cantidad_cuotas: number
  periodicidad: string
  fecha_primera_cuota: string
  importe_refinanciado: number
  importe_acreditado: number
  tipo_garante: string
  garante: string
  forma_pago: string
  tipo_tasa: string
  distribucion_pago: string
  periodo_gracia: number
  observaciones: string
  tipo_cotizacion: string
  cotizacion: number
  cuenta_bancaria_acreditacion_id: string
}

const empty = (): Form => ({
  tipo_id: "",
  entidad_id: "",
  entidad_nombre_manual: "",
  nro_prestamo: "",
  moneda: "ARS",
  capital: 0,
  tasa_porcentaje: 0,
  iva: 0,
  percepcion_iva: 0,
  percepcion_iibb: 0,
  otros_gastos: 0,
  fecha: new Date().toISOString().split("T")[0],
  sucursal: "",
  caja_id: "",
  sistema_amortizacion: "frances",
  es_preexistente: false,
  cantidad_cuotas: 12,
  periodicidad: "mensual",
  fecha_primera_cuota: "",
  importe_refinanciado: 0,
  importe_acreditado: 0,
  tipo_garante: "",
  garante: "",
  forma_pago: "",
  tipo_tasa: "",
  distribucion_pago: "Proporcional",
  periodo_gracia: 0,
  observaciones: "",
  tipo_cotizacion: "",
  cotizacion: 0,
  cuenta_bancaria_acreditacion_id: "",
})

const ESTADO_BG: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  pendiente: "bg-blue-100 text-blue-700",
  cerrado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

export default function PrestamoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales, currentUser } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const monedas = useMonedas()
  const [tipos, setTipos] = useState<TipoPrestamo[]>([])
  const [tiposCotizacion, setTiposCotizacion] = useState<{ id: string; nombre: string }[]>([])
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cajasRaw, setCajasRaw] = useState<CajaDisp[]>([])
  const cajas = useCajasPermitidasParaUsuario(cajasRaw, currentUser)
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"info" | "cuotas" | "gastos" | "obs">("info")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [accion, setAccion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // Estado nuevo gasto
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: "", importe: 0, cuenta_contable: "" })

  // Toggle "entidad manual" (no es banco, es un particular/empresa no bancaria)
  const [entidadManual, setEntidadManual] = useState(false)
  // Modal "Pagar cuota"
  const [mostrarPagarCuota, setMostrarPagarCuota] = useState<Cuota | null>(null)
  const [pagoDesdeCaja, setPagoDesdeCaja] = useState<string>("")
  const [pagoDesdeBanco, setPagoDesdeBanco] = useState<string>("")
  // Modal "Devolver capital"
  const [mostrarPagoCapital, setMostrarPagoCapital] = useState(false)
  const [importePagoCapital, setImportePagoCapital] = useState(0)
  const [pagoCapitalDesdeCaja, setPagoCapitalDesdeCaja] = useState<string>("")
  const [pagoCapitalDesdeBanco, setPagoCapitalDesdeBanco] = useState<string>("")
  // Modal "Extender cronograma" (perpetuo)
  const [mostrarExtender, setMostrarExtender] = useState(false)
  const [cantExtender, setCantExtender] = useState(12)
  // Modal "Cancelar préstamo"
  const [mostrarConfirmCancel, setMostrarConfirmCancel] = useState(false)
  // Estado de capital_pendiente (lo guardamos aparte del form)
  const [capitalPendiente, setCapitalPendiente] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch("/api/tipos-prestamo").then(r => r.json()),
      fetch("/api/cuentas-bancarias").then(r => r.json()),
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/contabilidad/tipos-cotizacion?activo=true").then(r => r.json()).catch(() => []),
    ]).then(([t, cb, c, tc]) => {
      if (Array.isArray(t)) setTipos(t)
      if (Array.isArray(cb)) setCuentas(cb)
      if (Array.isArray(c)) setCajasRaw(c)
      if (Array.isArray(tc)) setTiposCotizacion(tc.map((x: any) => ({ id: x.id, nombre: x.nombre })))
    }).catch(console.error)
  }, [])

  // Auto-cargar cotización cuando se selecciona tipo + moneda extranjera
  useEffect(() => {
    if (form.moneda === "ARS" || !form.tipo_cotizacion) return
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${encodeURIComponent(form.moneda)}&tipo=${encodeURIComponent(form.tipo_cotizacion)}&latest=true`)
      .then(r => r.ok ? r.json() : null)
      .then(cot => { if (cot?.tasa) setForm(f => ({ ...f, cotizacion: Number(cot.tasa) })) })
      .catch(() => {})
  }, [form.tipo_cotizacion, form.moneda])

  // Si pasa a ARS, limpiar cotización
  useEffect(() => {
    if (form.moneda === "ARS" && (form.cotizacion !== 0 || form.tipo_cotizacion !== "")) {
      setForm(f => ({ ...f, cotizacion: 0, tipo_cotizacion: "" }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.moneda])

  const recargar = async (id: string) => {
    const r = await fetch(`/api/prestamos/${id}`)
    if (!r.ok) throw new Error(await r.text())
    const d = await r.json()
    setEstado(d.estado ?? "borrador")
    setEntidadManual(!d.entidad_id && !!d.entidad_nombre)
    setForm({
      tipo_id: d.tipo_id ?? "",
      entidad_id: d.entidad_id ?? "",
      entidad_nombre_manual: (!d.entidad_id && d.entidad_nombre) ? d.entidad_nombre : "",
      nro_prestamo: d.nro_prestamo ?? "",
      moneda: d.moneda ?? "ARS",
      capital: Number(d.capital ?? 0),
      tasa_porcentaje: Number(d.tasa_porcentaje ?? 0),
      iva: Number(d.iva ?? 0),
      percepcion_iva: Number(d.percepcion_iva ?? 0),
      percepcion_iibb: Number(d.percepcion_iibb ?? 0),
      otros_gastos: Number(d.otros_gastos ?? 0),
      fecha: d.fecha ?? new Date().toISOString().split("T")[0],
      sucursal: d.sucursal ?? "",
      caja_id: d.caja_id ?? "",
      sistema_amortizacion: d.sistema_amortizacion ?? "frances",
      es_preexistente: !!d.es_preexistente,
      cantidad_cuotas: Number(d.cantidad_cuotas ?? 12),
      periodicidad: d.periodicidad ?? "mensual",
      fecha_primera_cuota: d.fecha_primera_cuota ?? "",
      importe_refinanciado: Number(d.importe_refinanciado ?? 0),
      importe_acreditado: Number(d.importe_acreditado ?? 0),
      tipo_garante: d.tipo_garante ?? "",
      garante: d.garante ?? "",
      forma_pago: d.forma_pago ?? "",
      tipo_tasa: d.tipo_tasa ?? "",
      distribucion_pago: d.distribucion_pago ?? "Proporcional",
      periodo_gracia: Number(d.periodo_gracia ?? 0),
      observaciones: d.observaciones ?? "",
      tipo_cotizacion: d.tipo_cotizacion ?? "",
      cotizacion: Number(d.cotizacion ?? 0),
      cuenta_bancaria_acreditacion_id: d.cuenta_bancaria_acreditacion_id ?? "",
    })
    setCuotas(d.cuotas ?? [])
    setGastos(d.gastos ?? [])
    setCapitalPendiente(Number(d.capital_pendiente ?? d.capital ?? 0))
  }

  useEffect(() => {
    if (!isEdit || !initialId) return
    recargar(initialId)
      .then(() => setCargando(false))
      .catch(() => { setErrorCarga("Préstamo no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"

  // ── Resúmenes (cabecera) ────────────────────────────────────────────────────
  const totalCuotas = useMemo(() => cuotas.reduce((s, c) => s + Number(c.total ?? 0), 0), [cuotas])
  const totalPagado = useMemo(() => cuotas.filter(c => c.estado === "conciliado").reduce((s, c) => s + Number(c.total ?? 0), 0), [cuotas])
  const totalPendiente = useMemo(() => cuotas.filter(c => c.estado !== "conciliado").reduce((s, c) => s + Number(c.total ?? 0), 0), [cuotas])
  const totalGastos = useMemo(() => gastos.reduce((s, g) => s + Number(g.importe ?? 0), 0), [gastos])
  // Metricas adicionales para vista "confirmado"
  const cuotasPagadasCount = useMemo(() => cuotas.filter(c => c.estado === "conciliado").length, [cuotas])
  const proximaCuota = useMemo(() => {
    const pendientes = cuotas.filter(c => c.estado !== "conciliado").sort((a, b) => a.numero_cuota - b.numero_cuota)
    return pendientes[0] ?? null
  }, [cuotas])
  const diasParaProximaCuota = useMemo(() => {
    if (!proximaCuota) return null
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const venc = new Date(proximaCuota.fecha_vencimiento)
    venc.setHours(0, 0, 0, 0)
    const diffMs = venc.getTime() - hoy.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  }, [proximaCuota])
  const cuotasVencidas = useMemo(() =>
    cuotas.filter(c => {
      if (c.estado === "conciliado") return false
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
      const venc = new Date(c.fecha_vencimiento); venc.setHours(0, 0, 0, 0)
      return venc.getTime() < hoy.getTime()
    }).length,
  [cuotas])

  const guardar = async (): Promise<string | null> => {
    if (esSoloLectura) return null
    if (!form.capital || form.capital <= 0) { setError("Capital es requerido"); return null }
    if (!form.tasa_porcentaje || form.tasa_porcentaje <= 0) { setError("Tasa anual es requerida"); return null }
    if (!form.fecha) { setError("Fecha es requerida"); return null }
    if (!form.sistema_amortizacion) { setError("Sistema de amortización es requerido"); return null }
    if (!form.cantidad_cuotas || form.cantidad_cuotas <= 0) { setError("Cantidad de cuotas inválida"); return null }
    if (!form.fecha_primera_cuota) { setError("Fecha de primera cuota es requerida"); return null }
    if (!form.es_preexistente) {
      const tieneCaja = !!form.caja_id
      const tieneBanco = !!form.cuenta_bancaria_acreditacion_id
      if (!tieneCaja && !tieneBanco) {
        setError("Indicá dónde se acredita la plata: una caja en efectivo o una cuenta bancaria propia")
        return null
      }
      if (tieneCaja && tieneBanco) {
        setError("Elegí solo un destino: caja efectivo o cuenta bancaria")
        return null
      }
      if (!form.importe_acreditado || form.importe_acreditado <= 0) {
        setError("Importe acreditado es requerido")
        return null
      }
    }
    if (guardando) return null
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/prestamos/${initialId}` : "/api/prestamos",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); return null }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/prestamos/${data.id}/editar`)
        return data.id
      }
      setOkMsg("Guardado")
      setTimeout(() => setOkMsg(null), 2000)
      return data.id
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      return null
    } finally {
      setGuardando(false)
    }
  }

  const confirmar = async () => {
    if (!isEdit || estado !== "borrador" || accion) return
    if (!form.fecha_primera_cuota) { setError("Definí la fecha de primera cuota antes de confirmar"); return }
    setError(null)
    setAccion("Confirmando")
    try {
      const res = await fetch(`/api/prestamos/${initialId}/confirmar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      router.push("/finanzas/prestamos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const abrirModalPagarCuota = (cuota: Cuota) => {
    if (!isEdit || accion) return
    // Sugerir el origen de pago igual que el de acreditación del préstamo (por defecto).
    setPagoDesdeCaja(form.caja_id || "")
    setPagoDesdeBanco(form.cuenta_bancaria_acreditacion_id || "")
    setError(null)
    setMostrarPagarCuota(cuota)
  }

  const confirmarPagoCuota = async () => {
    const cuota = mostrarPagarCuota
    if (!cuota || !isEdit || accion) return
    if (!pagoDesdeCaja && !pagoDesdeBanco) {
      setError("Elegí desde qué caja o cuenta bancaria sale el pago")
      return
    }
    if (pagoDesdeCaja && pagoDesdeBanco) {
      setError("Elegí solo uno: caja efectivo o cuenta bancaria")
      return
    }
    setError(null)
    setAccion(`Pagando ${cuota.id}`)
    try {
      const res = await fetch(`/api/prestamos/${initialId}/cuotas/${cuota.id}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caja_id: pagoDesdeCaja || null,
          cuenta_bancaria_id: pagoDesdeBanco || null,
        }),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      setMostrarPagarCuota(null)
      await recargar(initialId!)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const agregarGasto = async () => {
    if (!isEdit || accion) return
    if (!nuevoGasto.importe || nuevoGasto.importe <= 0) { setError("Importe inválido para el gasto"); return }
    setError(null)
    setAccion("AddGasto")
    try {
      const res = await fetch(`/api/prestamos/${initialId}/gastos`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nuevoGasto),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      const data = await res.json()
      setGastos(g => [...g, data])
      setNuevoGasto({ descripcion: "", importe: 0, cuenta_contable: "" })
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const eliminarGasto = async (gastoId: string) => {
    if (!isEdit || accion) return
    if (!confirm("¿Eliminar este gasto?")) return
    setError(null)
    setAccion(`DelGasto ${gastoId}`)
    try {
      const res = await fetch(`/api/prestamos/${initialId}/gastos/${gastoId}`, { method: "DELETE" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      setGastos(g => g.filter(x => x.id !== gastoId))
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const abrirModalPagoCapital = () => {
    setPagoCapitalDesdeCaja(form.caja_id || "")
    setPagoCapitalDesdeBanco(form.cuenta_bancaria_acreditacion_id || "")
    setImportePagoCapital(0)
    setError(null)
    setMostrarPagoCapital(true)
  }

  const pagarCapital = async () => {
    if (!isEdit || accion) return
    if (!importePagoCapital || importePagoCapital <= 0) { setError("Importe inválido"); return }
    if (importePagoCapital > capitalPendiente + 0.01) {
      setError(`Importe supera el capital pendiente (${formatCurrency(capitalPendiente, form.moneda)})`)
      return
    }
    if (!pagoCapitalDesdeCaja && !pagoCapitalDesdeBanco) {
      setError("Elegí desde qué caja o cuenta bancaria sale la plata")
      return
    }
    if (pagoCapitalDesdeCaja && pagoCapitalDesdeBanco) {
      setError("Elegí solo uno: caja efectivo o cuenta bancaria")
      return
    }
    setError(null)
    setAccion("PagoCapital")
    try {
      const res = await fetch(`/api/prestamos/${initialId}/pagar-capital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importe: importePagoCapital,
          caja_id: pagoCapitalDesdeCaja || null,
          cuenta_bancaria_id: pagoCapitalDesdeBanco || null,
        }),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      setMostrarPagoCapital(false)
      setImportePagoCapital(0)
      await recargar(initialId!)
      setOkMsg("Pago de capital registrado")
      setTimeout(() => setOkMsg(null), 2000)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const cancelarPrestamo = async () => {
    if (!isEdit || accion) return
    setError(null)
    setMostrarConfirmCancel(false)
    setAccion("Cancelando")
    try {
      const res = await fetch(`/api/prestamos/${initialId}/cancelar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      router.push("/finanzas/prestamos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setAccion(null)
    }
  }

  const extenderCronograma = async () => {
    if (!isEdit || accion) return
    if (!cantExtender || cantExtender <= 0) { setError("Cantidad inválida"); return }
    setError(null)
    setAccion("Extender")
    try {
      const res = await fetch(`/api/prestamos/${initialId}/extender-cronograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: cantExtender }),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      setMostrarExtender(false)
      await recargar(initialId!)
      setOkMsg(`Cronograma extendido (+${cantExtender} cuotas)`)
      setTimeout(() => setOkMsg(null), 2000)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/prestamos")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Préstamo" : "Nuevo Préstamo"}</h1>
            {isEdit && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_BG[estado] ?? "bg-gray-100 text-gray-700"}`}>
                {estado}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <X className="w-4 h-4" /> {esSoloLectura ? "Cerrar" : "Cancelar"}
          </button>
          {!esSoloLectura && (
            <button onClick={() => guardar()} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
            </button>
          )}
          {isEdit && estado === "borrador" && (
            <button onClick={confirmar} disabled={!!accion} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {accion === "Confirmando" ? "Confirmando…" : "Confirmar (genera cuotas)"}
            </button>
          )}
          {isEdit && estado === "pendiente" && capitalPendiente > 0 && (
            <button onClick={abrirModalPagoCapital} disabled={!!accion}
              className="px-4 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Banknote className="w-4 h-4" /> Devolver capital
            </button>
          )}
          {isEdit && estado === "pendiente" && form.sistema_amortizacion === "perpetuo" && (
            <button onClick={() => setMostrarExtender(true)} disabled={!!accion}
              className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <CalendarPlus className="w-4 h-4" /> Extender cronograma
            </button>
          )}
          {isEdit && (estado === "borrador" || estado === "pendiente") && (
            <button onClick={() => setMostrarConfirmCancel(true)} disabled={!!accion}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Ban className="w-4 h-4" /> Cancelar Préstamo
            </button>
          )}
        </div>
      </div>

      {mostrarPagoCapital && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Devolver capital del préstamo</h3>
            <p className="text-sm text-gray-600 mb-4">
              Capital pendiente actual: <span className="font-mono font-semibold">{formatCurrency(capitalPendiente, form.moneda)}</span>
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Importe a devolver</label>
            <input type="number" step="0.01" value={importePagoCapital}
              onChange={e => setImportePagoCapital(Number(e.target.value))}
              autoFocus
              className="w-full border rounded px-3 py-2 text-sm text-right font-mono mb-4" />

            <p className="text-xs text-gray-500 mb-3">¿Desde dónde sale la plata? Elegí una caja efectivo <strong>o</strong> una cuenta bancaria.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caja efectivo</label>
                <select value={pagoCapitalDesdeCaja}
                  onChange={e => { setPagoCapitalDesdeCaja(e.target.value); if (e.target.value) setPagoCapitalDesdeBanco("") }}
                  disabled={!!pagoCapitalDesdeBanco}
                  className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">— Sin caja —</option>
                  {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria propia</label>
                <select value={pagoCapitalDesdeBanco}
                  onChange={e => { setPagoCapitalDesdeBanco(e.target.value); if (e.target.value) setPagoCapitalDesdeCaja("") }}
                  disabled={!!pagoCapitalDesdeCaja}
                  className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">— Sin cuenta bancaria —</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Se va a registrar el egreso, generar un asiento de pago de capital y las cuotas pendientes se recalcularán con el nuevo capital.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setMostrarPagoCapital(false); setImportePagoCapital(0) }} disabled={accion === "PagoCapital"}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={pagarCapital} disabled={accion === "PagoCapital"}
                className="px-4 py-2 text-sm bg-amber-700 hover:bg-amber-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <Banknote className="w-4 h-4" /> {accion === "PagoCapital" ? "Procesando…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarPagarCuota && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagar cuota {mostrarPagarCuota.numero_cuota}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Importe: <span className="font-mono font-semibold">{formatCurrency(mostrarPagarCuota.total, form.moneda)}</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">¿Desde dónde sale el pago? Elegí una caja efectivo <strong>o</strong> una cuenta bancaria.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caja efectivo</label>
                <select value={pagoDesdeCaja}
                  onChange={e => { setPagoDesdeCaja(e.target.value); if (e.target.value) setPagoDesdeBanco("") }}
                  disabled={!!pagoDesdeBanco}
                  className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">— Sin caja —</option>
                  {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria propia</label>
                <select value={pagoDesdeBanco}
                  onChange={e => { setPagoDesdeBanco(e.target.value); if (e.target.value) setPagoDesdeCaja("") }}
                  disabled={!!pagoDesdeCaja}
                  className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100">
                  <option value="">— Sin cuenta bancaria —</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setMostrarPagarCuota(null); setError(null) }} disabled={!!accion}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmarPagoCuota} disabled={!!accion}
                className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> {accion?.startsWith("Pagando") ? "Pagando…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarConfirmCancel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar préstamo</h3>
            <p className="text-sm text-gray-600 mb-5">
              {estado === "borrador"
                ? "Se va a marcar el préstamo como cancelado y se eliminarán las cuotas. Esta acción no se puede deshacer."
                : "Sólo se puede cancelar si todavía no se pagó ninguna cuota (se asume que fue un error de carga). Se va a anular el movimiento de caja del alta, se generará un asiento de reversa y se eliminarán las cuotas. Si ya hiciste algún pago, primero usá \"Devolver capital\" para cerrar el préstamo. Esta acción no se puede deshacer."}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMostrarConfirmCancel(false)} disabled={accion === "Cancelando"}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                No, volver
              </button>
              <button onClick={cancelarPrestamo} disabled={accion === "Cancelando"}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <Ban className="w-4 h-4" /> Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {accion === "Cancelando" && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-700">Cancelando préstamo…</p>
          </div>
        </div>
      )}

      {mostrarExtender && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Extender cronograma</h3>
            <p className="text-sm text-gray-600 mb-4">
              Genera N cuotas adicionales de intereses a partir de la última cuota, usando el capital pendiente actual.
            </p>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad de cuotas a agregar</label>
            <input type="number" value={cantExtender}
              onChange={e => setCantExtender(Number(e.target.value))}
              autoFocus min={1}
              className="w-full border rounded px-3 py-2 text-sm text-right font-mono mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setMostrarExtender(false)} disabled={accion === "Extender"}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={extenderCronograma} disabled={accion === "Extender"}
                className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <CalendarPlus className="w-4 h-4" /> {accion === "Extender" ? "Generando…" : "Generar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
      {okMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>}

      {isEdit && estado !== "borrador" && (
        <>
        <div className="grid grid-cols-4 gap-4 mb-3">
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Capital pendiente</p>
            <p className="text-lg font-mono font-semibold text-amber-900">{formatCurrency(capitalPendiente, form.moneda)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">de {formatCurrency(form.capital, form.moneda)}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total a pagar</p>
            <p className="text-lg font-mono font-semibold text-gray-700">{formatCurrency(totalPendiente, form.moneda)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">cuotas pendientes</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cuotas</p>
            <p className="text-lg font-mono font-semibold text-indigo-700">
              {cuotasPagadasCount} <span className="text-gray-400 text-base">/ {cuotas.length}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">pagadas{cuotasVencidas > 0 ? ` · ${cuotasVencidas} vencida(s)` : ""}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Próxima cuota</p>
            {proximaCuota ? (
              <>
                <p className="text-lg font-mono font-semibold text-blue-700">{formatCurrency(proximaCuota.total, form.moneda)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {proximaCuota.fecha_vencimiento}
                  {diasParaProximaCuota !== null && (
                    diasParaProximaCuota < 0
                      ? <span className="text-red-600 font-medium"> · vencida hace {Math.abs(diasParaProximaCuota)} día(s)</span>
                      : diasParaProximaCuota === 0
                        ? <span className="text-amber-600 font-medium"> · vence hoy</span>
                        : <span> · en {diasParaProximaCuota} día(s)</span>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-mono font-semibold text-green-700">—</p>
                <p className="text-[10px] text-gray-400 mt-0.5">sin cuotas pendientes</p>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pagado total</p>
            <p className="text-base font-mono font-semibold text-green-700">{formatCurrency(totalPagado, form.moneda)}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Intereses totales</p>
            <p className="text-base font-mono font-semibold text-gray-700">{formatCurrency(Number(form.capital) * 0 + cuotas.reduce((s, c) => s + Number(c.interes ?? 0), 0), form.moneda)}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Tasa anual · Sistema</p>
            <p className="text-base font-semibold text-gray-700">
              {form.tasa_porcentaje}% · <span className="capitalize">{form.sistema_amortizacion}</span>
            </p>
          </div>
        </div>
        </>
      )}

      <div className="bg-white rounded-lg border mb-4">
        <div className="flex border-b">
          {([
            { id: "info", label: "Información" },
            { id: "cuotas", label: `Cuotas (${cuotas.length})`, disabled: cuotas.length === 0 },
            { id: "gastos", label: `Gastos (${gastos.length})`, disabled: !isEdit },
            { id: "obs", label: "Observaciones" },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
              className={`px-4 py-2 text-sm border-b-2 disabled:opacity-50 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
          {isEdit && (
            <div className="ml-auto px-4 py-2 text-xs text-gray-500 flex items-center gap-4">
              <span>Gastos: <span className="font-mono font-semibold text-amber-900">{formatCurrency(totalGastos, form.moneda)}</span></span>
            </div>
          )}
        </div>

        <fieldset disabled={esSoloLectura && tab === "info"} className="p-6">
          {tab === "info" && esSoloLectura && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Tipo</p>
                <p className="font-medium text-gray-900">{tipos.find(t => t.id === form.tipo_id)?.nombre ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Entidad / Prestamista</p>
                <p className="font-medium text-gray-900">
                  {entidadManual
                    ? form.entidad_nombre_manual
                    : cuentas.find(c => c.id === form.entidad_id)
                      ? `${cuentas.find(c => c.id === form.entidad_id)!.banco_nombre} — ${cuentas.find(c => c.id === form.entidad_id)!.numero_cuenta}`
                      : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">N° Préstamo (banco)</p>
                <p className="font-mono text-gray-900">{form.nro_prestamo || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Moneda</p>
                <p className="font-mono text-gray-900">{form.moneda}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Capital</p>
                <p className="font-mono text-amber-900 font-semibold">{formatCurrency(form.capital, form.moneda)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Tasa anual</p>
                <p className="font-mono text-gray-900">{form.tasa_porcentaje}%</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Fecha alta</p>
                <p className="text-gray-900">{form.fecha}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Sistema Amortización</p>
                <p className="text-gray-900 capitalize">{form.sistema_amortizacion}</p>
              </div>
              {form.moneda !== "ARS" && (
                <>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Tipo Cotización</p>
                    <p className="text-gray-900">{form.tipo_cotizacion || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Cotización aplicada</p>
                    <p className="font-mono text-gray-900">1 {form.moneda} = ${form.cotizacion.toLocaleString("es-AR")}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Cantidad de cuotas</p>
                <p className="font-mono text-gray-900">{form.cantidad_cuotas} ({form.periodicidad})</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Fecha 1° Cuota</p>
                <p className="text-gray-900">{form.fecha_primera_cuota || "—"}</p>
              </div>
              <div className="col-span-2 pt-4 border-t">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Acreditación</p>
                <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Origen</p>
                    <p className="text-gray-900">
                      {form.es_preexistente
                        ? "Preexistente (sin caja/banco)"
                        : form.cuenta_bancaria_acreditacion_id
                          ? `Banco: ${cuentas.find(c => c.id === form.cuenta_bancaria_acreditacion_id)?.banco_nombre ?? "—"}`
                          : form.caja_id
                            ? `Caja: ${cajas.find(c => c.id === form.caja_id)?.nombre ?? "—"}`
                            : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Importe acreditado</p>
                    <p className="font-mono text-gray-900">{formatCurrency(form.importe_acreditado || form.capital, form.moneda)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">Sucursal</p>
                    <p className="text-gray-900">{form.sucursal || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "info" && !esSoloLectura && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipo_id} onChange={e => set("tipo_id", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">Seleccionar…</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entidad / Prestamista</label>
                  <select
                    value={entidadManual ? "__manual__" : (form.entidad_id || "")}
                    onChange={e => {
                      const v = e.target.value
                      if (v === "__manual__") {
                        setEntidadManual(true)
                        set("entidad_id", "")
                      } else {
                        setEntidadManual(false)
                        set("entidad_id", v)
                        set("entidad_nombre_manual", "")
                      }
                    }}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">Seleccionar…</option>
                    {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta}</option>)}
                    <option value="__manual__">— Otro / Particular —</option>
                  </select>
                  {entidadManual && (
                    <input
                      value={form.entidad_nombre_manual}
                      onChange={e => set("entidad_nombre_manual", e.target.value)}
                      placeholder="Nombre del prestamista (ej: Juan Pérez)"
                      className="w-full mt-2 border rounded px-3 py-2 text-sm" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Préstamo (banco)</label>
                  <input value={form.nro_prestamo} onChange={e => set("nro_prestamo", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                  <select value={form.moneda} onChange={e => set("moneda", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    {monedas.length === 0
                      ? <option value={form.moneda || "ARS"}>{form.moneda || "ARS"}</option>
                      : monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capital *</label>
                  <input type="number" step="0.01" value={form.capital} onChange={e => set("capital", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tasa % (anual) *</label>
                  <input type="number" step="0.01" value={form.tasa_porcentaje} onChange={e => set("tasa_porcentaje", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              {form.moneda !== "ARS" && (
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Cotización *</label>
                    <select value={form.tipo_cotizacion} onChange={e => set("tipo_cotizacion", e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">Seleccionar…</option>
                      {tiposCotizacion.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cotización * <span className="text-gray-400 font-normal">(1 {form.moneda} = $ ARS)</span>
                    </label>
                    <input type="number" step="0.0001" value={form.cotizacion || ""}
                      onChange={e => set("cotizacion", Number(e.target.value))}
                      placeholder="0,0000"
                      className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cant. Cuotas *</label>
                  <input type="number" value={form.cantidad_cuotas} onChange={e => set("cantidad_cuotas", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Periodicidad</label>
                  <select value={form.periodicidad} onChange={e => set("periodicidad", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sistema Amortización *</label>
                  <select value={form.sistema_amortizacion} onChange={e => set("sistema_amortizacion", e.target.value as Form["sistema_amortizacion"])}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="frances">Francés (cuota fija)</option>
                    <option value="aleman">Alemán (capital constante)</option>
                    <option value="americano">Americano (intereses + capital al final)</option>
                    <option value="bullet">Bullet (todo al final)</option>
                    <option value="perpetuo">Perpetuo (sólo intereses, sin devolución de capital)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha 1° Cuota *</label>
                  <input type="date" value={form.fecha_primera_cuota} onChange={e => set("fecha_primera_cuota", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">IVA</label>
                  <input type="number" step="0.01" value={form.iva} onChange={e => set("iva", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Perc. IVA</label>
                  <input type="number" step="0.01" value={form.percepcion_iva} onChange={e => set("percepcion_iva", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Perc. IIBB</label>
                  <input type="number" step="0.01" value={form.percepcion_iibb} onChange={e => set("percepcion_iibb", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Otros gastos</label>
                  <input type="number" step="0.01" value={form.otros_gastos} onChange={e => set("otros_gastos", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Acreditación del préstamo</p>
                {!form.es_preexistente && (
                  <p className="text-xs text-gray-500 mb-3">
                    Elegí en qué destino entra la plata: una caja efectivo <strong>o</strong> una cuenta bancaria propia.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Caja efectivo</label>
                    <select value={form.caja_id}
                      onChange={e => {
                        set("caja_id", e.target.value)
                        if (e.target.value) set("cuenta_bancaria_acreditacion_id", "")
                      }}
                      disabled={!!form.cuenta_bancaria_acreditacion_id}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100">
                      <option value="">Sin caja</option>
                      {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria propia</label>
                    <select value={form.cuenta_bancaria_acreditacion_id}
                      onChange={e => {
                        set("cuenta_bancaria_acreditacion_id", e.target.value)
                        if (e.target.value) set("caja_id", "")
                      }}
                      disabled={!!form.caja_id}
                      className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100">
                      <option value="">Sin cuenta bancaria</option>
                      {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Importe Acreditado {!form.es_preexistente && "*"}
                    </label>
                    <input type="number" step="0.01" value={form.importe_acreditado} onChange={e => set("importe_acreditado", Number(e.target.value))}
                      className="w-full border rounded px-3 py-2 text-sm text-right font-mono"
                      placeholder="Vacío = usa capital" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
                    <select value={form.sucursal} onChange={e => set("sucursal", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                      <option value="">—</option>
                      {sucursales.map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={form.es_preexistente} onChange={e => set("es_preexistente", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Préstamo preexistente (no genera ingreso en caja ni banco al confirmar)</span>
              </label>
            </div>
          )}

          {tab === "cuotas" && (
            <div>
              {cuotas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Las cuotas se generan al confirmar el préstamo.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-center py-2 px-3 w-12">N°</th>
                        <th className="text-left px-3">Vencimiento</th>
                        <th className="text-right px-3">Capital</th>
                        <th className="text-right px-3">Interés</th>
                        <th className="text-right px-3">Total</th>
                        <th className="text-right px-3">Saldo</th>
                        <th className="text-center px-3">Estado</th>
                        <th className="px-3 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotas.map(c => (
                        <tr key={c.id} className="border-t">
                          <td className="py-1 px-3 text-center font-medium">{c.numero_cuota}</td>
                          <td className="px-3">{c.fecha_vencimiento}</td>
                          <td className="px-3 text-right font-mono">{formatCurrency(c.capital, form.moneda)}</td>
                          <td className="px-3 text-right font-mono text-gray-600">{formatCurrency(c.interes, form.moneda)}</td>
                          <td className="px-3 text-right font-mono font-semibold">{formatCurrency(c.total, form.moneda)}</td>
                          <td className="px-3 text-right font-mono text-gray-500 text-xs">{formatCurrency(c.saldo, form.moneda)}</td>
                          <td className="px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.estado === "conciliado" ? "bg-green-100 text-green-700" : c.estado === "vencido" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {c.estado === "conciliado" ? "Pago" : c.estado === "vencido" ? "Vencida" : "Pendiente"}
                            </span>
                          </td>
                          <td className="px-3">
                            {c.estado === "pendiente" && estado === "pendiente" && (
                              <button type="button" onClick={() => abrirModalPagarCuota(c)} disabled={!!accion}
                                className="text-xs text-green-700 hover:text-green-900 disabled:opacity-50 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> {accion === `Pagando ${c.id}` ? "Pagando…" : "Pagar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "gastos" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">Gastos asociados al préstamo (sellos, comisiones, etc.).</p>
              </div>

              {!esSoloLectura && (
                <div className="grid grid-cols-12 gap-2 items-end mb-3 p-3 border rounded-lg bg-gray-50">
                  <div className="col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                    <input value={nuevoGasto.descripcion}
                      onChange={e => setNuevoGasto(g => ({ ...g, descripcion: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Ej: Sellado" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta contable</label>
                    <input value={nuevoGasto.cuenta_contable}
                      onChange={e => setNuevoGasto(g => ({ ...g, cuenta_contable: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Código" />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Importe</label>
                    <input type="number" step="0.01" value={nuevoGasto.importe}
                      onChange={e => setNuevoGasto(g => ({ ...g, importe: Number(e.target.value) }))}
                      className="w-full border rounded px-2 py-1.5 text-sm text-right font-mono" />
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={agregarGasto} disabled={!!accion}
                      className="w-full px-2 py-1.5 text-xs bg-indigo-900 hover:bg-indigo-800 text-white rounded disabled:opacity-50 flex items-center justify-center gap-1">
                      <Plus className="w-3 h-3" /> {accion === "AddGasto" ? "..." : "Agregar"}
                    </button>
                  </div>
                </div>
              )}

              {gastos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">Sin gastos registrados.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-left py-2 px-3">Descripción</th>
                        <th className="text-left px-3">Cuenta contable</th>
                        <th className="text-right px-3 w-32">Importe</th>
                        <th className="px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gastos.map(g => (
                        <tr key={g.id} className="border-t">
                          <td className="py-1 px-3">{g.descripcion || <span className="text-gray-400 italic">—</span>}</td>
                          <td className="px-3 text-gray-600">{g.cuenta_contable || <span className="text-gray-400 italic">—</span>}</td>
                          <td className="px-3 text-right font-mono">{formatCurrency(g.importe, form.moneda)}</td>
                          <td className="px-2">
                            {!esSoloLectura && (
                              <button type="button" onClick={() => eliminarGasto(g.id)} disabled={!!accion}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-gray-50 font-medium">
                        <td colSpan={2} className="py-2 px-3 text-right text-xs uppercase text-gray-600">Total Gastos</td>
                        <td className="px-3 text-right font-mono">{formatCurrency(totalGastos, form.moneda)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "obs" && (
            <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={4}
              className="w-full border rounded px-3 py-2 text-sm" />
          )}
        </fieldset>
      </div>
    </div>
  )
}
