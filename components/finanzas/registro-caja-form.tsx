"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, Ban, Plus, Trash2 } from "lucide-react"
import SearchableSelect from "@/components/ui/searchable-select"
import { type ConceptoRegistroCaja, cuentasPermitidasParaConcepto, useMonedas, useCajasPermitidasParaUsuario, useValoresIdsPermitidasParaUsuario } from "./_shared"
import { useERP } from "@/contexts/erp-context"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface ValorCaja { id: string; caja_id: string; nombre: string; tipo: string; moneda: string }
interface CuentaContable { id: string; codigo: string; nombre: string }
interface TipoCotizacion { id: number; nombre: string }

interface Comprobante {
  id?: string
  descripcion: string
  cuenta_contable: string
  cuenta_analitica: string
  importe: number
  impuestos: number
}
interface ValorLinea {
  id?: string
  valor_id: string
  valor_nombre: string
  importe: number
  moneda: string
  importe_comprobante: number
  moneda_comprobante: string
}

type Form = {
  caja_id: string
  concepto_id: string
  moneda: string
  cotizacion: number
  tipo_cotizacion: string
  fecha: string
  observaciones: string
  comprobantes: Comprobante[]
  valores: ValorLinea[]
}

const empty = (): Form => ({
  caja_id: "",
  concepto_id: "",
  moneda: "ARS",
  cotizacion: 0,
  tipo_cotizacion: "",
  fecha: new Date().toISOString().split("T")[0],
  observaciones: "",
  comprobantes: [],
  valores: [],
})

const ESTADO_BG: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  confirmado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

export default function RegistroCajaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { currentUser } = useERP()
  const monedas = useMonedas()

  const [form, setForm] = useState<Form>(empty())
  const [cajasRaw, setCajasRaw] = useState<CajaDisp[]>([])
  const cajas = useCajasPermitidasParaUsuario(cajasRaw, currentUser)
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([])
  const [tiposCotizacion, setTiposCotizacion] = useState<TipoCotizacion[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"comprobantes" | "valores" | "obs">("comprobantes")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [accionPendiente, setAccionPendiente] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    // Si tenemos usuario logueado pasamos for_user al endpoint para que filtre
    // los conceptos donde el usuario está restringido. con_relaciones=1 trae
    // las cuentas_permitidas para que podamos filtrar el SearchableSelect.
    const userParam = currentUser?.id ? `&for_user=${encodeURIComponent(currentUser.id)}` : ""
    Promise.all([
      fetch("/api/cajas").then(r => r.json()),
      fetch(`/api/conceptos-registro-caja?con_relaciones=1${userParam}`).then(r => r.json()),
      fetch("/api/caja-valores").then(r => r.json()),
      fetch("/api/contabilidad/plan-cuentas?activo=true").then(r => r.json()).catch(() => []),
      fetch("/api/contabilidad/tipos-cotizacion?activo=true").then(r => r.json()).catch(() => []),
    ]).then(([c, co, v, pc, tc]) => {
      if (Array.isArray(c)) setCajasRaw(c)
      if (Array.isArray(co)) setConceptos(co.filter((x: ConceptoRegistroCaja) => x.visible_en_caja))
      if (Array.isArray(v)) setValores(v)
      if (Array.isArray(pc)) setCuentasContables(pc.map((x: any) => ({ id: x.id, codigo: x.codigo, nombre: x.nombre })))
      if (Array.isArray(tc)) setTiposCotizacion(tc.map((x: any) => ({ id: x.id, nombre: x.nombre })))
    }).catch(console.error)
  }, [currentUser?.id])

  // Cuando cambia moneda → ARS, limpiar cotización
  useEffect(() => {
    if (form.moneda === "ARS") {
      if (form.cotizacion !== 0 || form.tipo_cotizacion !== "") {
        setForm(f => ({ ...f, cotizacion: 0, tipo_cotizacion: "" }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.moneda])

  // Cuando se selecciona un tipo de cotización (guardamos el nombre como string,
  // ej: "blue"), traer la última tasa de ese tipo para la moneda y precargarla.
  useEffect(() => {
    if (form.moneda === "ARS" || !form.tipo_cotizacion) return
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${encodeURIComponent(form.moneda)}&tipo=${encodeURIComponent(form.tipo_cotizacion)}&latest=true`)
      .then(r => r.json())
      .then(cot => { if (cot?.tasa) setForm(f => ({ ...f, cotizacion: Number(cot.tasa) })) })
      .catch(() => {})
  }, [form.tipo_cotizacion, form.moneda])

  // Cuando se selecciona un concepto, auto-cargar cuenta_contable en los
  // comprobantes que estén vacíos. Registro de Caja es siempre egreso, así que
  // usamos cuenta_contable_egresos (con fallback a ingresos si egresos no está cargada).
  useEffect(() => {
    if (!form.concepto_id) return
    const concepto = conceptos.find(c => c.id === form.concepto_id)
    if (!concepto) return
    const cuenta = concepto.cuenta_contable_egresos || concepto.cuenta_contable_ingresos
    if (!cuenta) return
    setForm(f => ({
      ...f,
      comprobantes: f.comprobantes.map(c => c.cuenta_contable ? c : { ...c, cuenta_contable: cuenta }),
    }))
  }, [form.concepto_id, conceptos])

  // Al agregar un comprobante también lo precargamos con la cuenta del concepto.
  // Eso lo manejamos en addComp redefinido más abajo.

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/registros-caja/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setEstado(d.estado ?? "borrador")
        setForm({
          caja_id: d.caja_id ?? "",
          concepto_id: d.concepto_id ?? "",
          moneda: d.moneda ?? "ARS",
          cotizacion: Number(d.cotizacion ?? 0),
          tipo_cotizacion: d.tipo_cotizacion ?? "",
          fecha: d.fecha ?? new Date().toISOString().split("T")[0],
          observaciones: d.observaciones ?? "",
          comprobantes: (d.comprobantes ?? []).map((c: any) => ({
            id: c.id,
            descripcion: c.descripcion ?? "",
            cuenta_contable: c.cuenta_contable ?? "",
            cuenta_analitica: c.cuenta_analitica ?? "",
            importe: Number(c.importe ?? 0),
            impuestos: Number(c.impuestos ?? 0),
          })),
          valores: (d.valores ?? []).map((v: any) => ({
            id: v.id,
            valor_id: v.valor_id ?? "",
            valor_nombre: v.valor_nombre ?? "",
            importe: Number(v.importe ?? 0),
            moneda: v.moneda ?? "ARS",
            importe_comprobante: Number(v.importe_comprobante ?? 0),
            moneda_comprobante: v.moneda_comprobante ?? "ARS",
          })),
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Registro no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"

  const conceptoSel = conceptos.find(c => c.id === form.concepto_id)
  const cajaSel = cajas.find(c => c.id === form.caja_id)
  const requiereObs = conceptoSel?.requiere_observacion
  const valoresPermitidos = useValoresIdsPermitidasParaUsuario(currentUser)
  const valoresDisp = useMemo(
    () => valores.filter(v => v.caja_id === form.caja_id && (valoresPermitidos?.has(v.id) ?? false)),
    [valores, form.caja_id, valoresPermitidos],
  )

  // Cuentas contables permitidas según el concepto. Si no hay concepto seleccionado
  // o el concepto no tiene restricciones, mostramos todas.
  const cuentasContablesFiltradas = useMemo(() => {
    const permitidas = cuentasPermitidasParaConcepto(conceptoSel)
    if (!permitidas) return cuentasContables
    return cuentasContables.filter(c => permitidas.has(c.codigo))
  }, [cuentasContables, conceptoSel])

  const totalComp = form.comprobantes.reduce((s, c) => s + c.importe + c.impuestos, 0)
  // Convierte un importe en `monedaValor` a la moneda del registro usando la
  // cotización del registro (1 forma_moneda = N ARS si forma_moneda != ARS).
  // Si las monedas coinciden, retorna el importe tal cual.
  const aMonedaRegistro = (importe: number, monedaValor: string): number => {
    if (!monedaValor || monedaValor === form.moneda) return importe
    const cot = Number(form.cotizacion) || 0
    if (cot <= 0) return importe
    if (form.moneda === "ARS" && monedaValor !== "ARS") return importe * cot
    if (form.moneda !== "ARS" && monedaValor === "ARS") return importe / cot
    return importe
  }
  const totalVal = form.valores.reduce((s, v) => s + aMonedaRegistro(v.importe, v.moneda), 0)
  const diferencia = totalComp - totalVal
  const cuadrado = Math.abs(diferencia) <= 0.01
  const fmt = (n: number) => `${form.moneda === "ARS" ? "$" : `${form.moneda} `}${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

  // ── Comprobantes ─────────────────────────────────────────────────────────
  const addComp = () => setForm(f => {
    const concepto = conceptos.find(c => c.id === f.concepto_id)
    const cuentaDefault = concepto?.cuenta_contable_egresos || concepto?.cuenta_contable_ingresos || ""
    return {
      ...f,
      comprobantes: [...f.comprobantes, { descripcion: "", cuenta_contable: cuentaDefault, cuenta_analitica: "", importe: 0, impuestos: 0 }],
    }
  })
  const updComp = (idx: number, patch: Partial<Comprobante>) => setForm(f => ({
    ...f,
    comprobantes: f.comprobantes.map((c, i) => i === idx ? { ...c, ...patch } : c),
  }))
  const delComp = (idx: number) => setForm(f => ({ ...f, comprobantes: f.comprobantes.filter((_, i) => i !== idx) }))

  // ── Valores ──────────────────────────────────────────────────────────────
  const addVal = () => {
    if (valoresDisp.length === 0) return
    const usados = new Set(form.valores.map(v => v.valor_id))
    const disponible = valoresDisp.find(v => !usados.has(v.id)) ?? valoresDisp[0]
    setForm(f => ({ ...f, valores: [...f.valores, {
      valor_id: disponible.id,
      valor_nombre: disponible.nombre,
      importe: 0,
      moneda: disponible.moneda,
      importe_comprobante: 0,
      moneda_comprobante: f.moneda,
    }] }))
  }
  const updVal = (idx: number, patch: Partial<ValorLinea>) => {
    setForm(f => ({
      ...f,
      valores: f.valores.map((v, i) => {
        if (i !== idx) return v
        const next = { ...v, ...patch }
        if (patch.valor_id) {
          const found = valoresDisp.find(x => x.id === patch.valor_id)
          if (found) { next.valor_nombre = found.nombre; next.moneda = found.moneda }
        }
        return next
      }),
    }))
  }
  const delVal = (idx: number) => setForm(f => ({ ...f, valores: f.valores.filter((_, i) => i !== idx) }))

  const guardar = async (): Promise<string | null> => {
    if (esSoloLectura) return null
    if (!form.caja_id) { setError("Seleccionar caja"); return null }
    if (!form.concepto_id) { setError("Seleccionar concepto"); return null }
    if (form.comprobantes.length === 0) { setError("Agregar al menos un comprobante"); return null }
    if (requiereObs && !form.observaciones.trim()) { setError("Observaciones obligatorias para este concepto"); return null }
    if (guardando) return null
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/registros-caja/${initialId}` : "/api/registros-caja",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); return null }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/registros-caja/${data.id}/editar`)
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
    // Validaciones pre-confirmar (cliente). El backend también valida.
    if (!cuadrado) {
      setError(`Comprobantes (${fmt(totalComp)}) y Valores (${fmt(totalVal)}) no coinciden. Diferencia: ${fmt(diferencia)}.`)
      return
    }
    if (form.moneda !== "ARS" && (!form.cotizacion || form.cotizacion <= 0)) {
      setError(`Falta la cotización para ${form.moneda}. Cargala antes de confirmar.`)
      return
    }

    // Si es nuevo, guardar primero y después confirmar.
    let id = initialId
    if (!id) {
      const saved = await guardar()
      if (!saved) return
      id = saved
      // Nota: tras guardar router.push a /editar; el flujo continúa allí.
      // Para forzar el confirmar después del save, esperamos un tick:
      setTimeout(() => { void doConfirmar(id!) }, 100)
      return
    }
    await doConfirmar(id)
  }
  const doConfirmar = async (id: string) => {
    if (accionPendiente) return
    setError(null)
    setAccionPendiente("Confirmando")
    try {
      const res = await fetch(`/api/registros-caja/${id}/confirmar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccionPendiente(null); return }
      router.push("/finanzas/registros-caja")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccionPendiente(null)
    }
  }

  const cancelar = async () => {
    if (!isEdit || accionPendiente) return
    if (!confirm("¿Cancelar este registro confirmado?\n\nLos movimientos quedarán marcados como cancelados en el extracto (visibles pero tachados). El registro pasa a 'Cancelado' y no se puede revertir.")) return
    setError(null)
    setAccionPendiente("Cancelando")
    try {
      const res = await fetch(`/api/registros-caja/${initialId}/cancelar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccionPendiente(null); return }
      router.push("/finanzas/registros-caja")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccionPendiente(null)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/registros-caja")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Registro de Caja" : "Nuevo Registro de Caja"}</h1>
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
            <>
              <button onClick={() => guardar()} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button onClick={confirmar} disabled={guardando || !!accionPendiente} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {accionPendiente === "Confirmando" ? "Confirmando…" : "Confirmar"}
              </button>
            </>
          )}
          {isEdit && estado === "confirmado" && (
            <button onClick={cancelar} disabled={!!accionPendiente} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Ban className="w-4 h-4" /> {accionPendiente === "Cancelando" ? "Cancelando…" : "Cancelar Registro"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
      {okMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>}

      {/* Cabecera (form + cards) — fieldset cierra al final del header */}
      <fieldset disabled={esSoloLectura}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2 bg-white rounded-lg border p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Caja *</label>
                <select value={form.caja_id}
                  onChange={e => { set("caja_id", e.target.value); set("valores", []) }}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Seleccionar…</option>
                  {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Concepto *</label>
                <select value={form.concepto_id} onChange={e => set("concepto_id", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Seleccionar…</option>
                  {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                <select value={form.moneda} onChange={e => set("moneda", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  {monedas.length === 0
                    ? <option value={form.moneda || "ARS"}>{form.moneda || "ARS"}</option>
                    : monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              {form.moneda !== "ARS" && (
                <>
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
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sucursal</p>
              <p className="text-sm font-medium text-gray-800 mt-1">{cajaSel?.sucursal ?? "—"}</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Comprobantes</p>
              <p className="text-lg font-mono font-semibold text-amber-900 mt-1">{fmt(totalComp)}</p>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Valores</p>
              <p className="text-lg font-mono font-semibold text-amber-900 mt-1">{fmt(totalVal)}</p>
            </div>
            <div className={`rounded-lg border p-3 ${cuadrado ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-xs uppercase tracking-wide ${cuadrado ? "text-green-700" : "text-red-700"}`}>
                {cuadrado ? "✓ Cuadrado" : "⚠ Diferencia"}
              </p>
              <p className={`text-lg font-mono font-semibold mt-1 ${cuadrado ? "text-green-700" : "text-red-700"}`}>
                {fmt(diferencia)}
              </p>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Tabs fuera del fieldset para que se puedan clickear aunque el registro esté confirmado */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {([
            { id: "comprobantes", label: `Comprobantes (${form.comprobantes.length})` },
            { id: "valores", label: `Valores (${form.valores.length})` },
            { id: "obs", label: "Observaciones" + (requiereObs ? " *" : "") },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <fieldset disabled={esSoloLectura} className="p-4">
            {tab === "comprobantes" && (
              <>
                <div className="flex items-center justify-end mb-3">
                  <button type="button" onClick={addComp} className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar comprobante
                  </button>
                </div>
                {form.comprobantes.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">Sin comprobantes.</p>
                ) : (
                  <div className="border rounded-lg overflow-visible">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left py-2 px-3">Descripción</th>
                          <th className="text-left px-3">Cuenta Contable</th>
                          <th className="text-left px-3">Cta. Analítica</th>
                          <th className="text-right px-3 w-28">Importe</th>
                          <th className="text-right px-3 w-28">Impuestos</th>
                          <th className="text-right px-3 w-28">Total</th>
                          <th className="px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.comprobantes.map((c, idx) => (
                          <tr key={idx} className="border-t align-top">
                            <td className="py-1 px-3"><input value={c.descripcion} onChange={e => updComp(idx, { descripcion: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                            <td className="px-3 min-w-[240px]">
                              <SearchableSelect
                                value={c.cuenta_contable || null}
                                onChange={v => updComp(idx, { cuenta_contable: v == null ? "" : String(v) })}
                                options={cuentasContablesFiltradas.map(cc => ({
                                  value: cc.codigo,
                                  label: `${cc.codigo} - ${cc.nombre}`,
                                  searchExtra: cc.nombre,
                                }))}
                                placeholder={form.concepto_id ? "Elegir cuenta…" : "Elegí un concepto primero"}
                                emptyText="Sin cuentas permitidas para este concepto"
                                disabled={!form.concepto_id}
                                allowClear
                              />
                            </td>
                            <td className="px-3"><input value={c.cuenta_analitica} onChange={e => updComp(idx, { cuenta_analitica: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                            <td className="px-3"><input type="number" step="0.01" value={c.importe} onChange={e => updComp(idx, { importe: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" /></td>
                            <td className="px-3"><input type="number" step="0.01" value={c.impuestos} onChange={e => updComp(idx, { impuestos: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" /></td>
                            <td className="px-3 text-right font-mono text-sm text-gray-700">${(c.importe + c.impuestos).toFixed(2)}</td>
                            <td className="px-2"><button type="button" onClick={() => delComp(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "valores" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">Valores (efectivo, cheques, etc.) con los que se paga.</p>
                  <button type="button" onClick={addVal} disabled={!form.caja_id || valoresDisp.length === 0}
                    className="text-xs text-indigo-700 hover:text-indigo-900 disabled:opacity-50 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar valor
                  </button>
                </div>
                {form.valores.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">
                    {form.caja_id ? "Sin valores." : "Seleccioná una caja primero."}
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left py-2 px-3">Valor</th>
                          <th className="text-right px-3 w-32">Importe</th>
                          <th className="px-3 w-20">Moneda</th>
                          <th className="px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.valores.map((v, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="py-1 px-3">
                              <select value={v.valor_id} onChange={e => updVal(idx, { valor_id: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                                {valoresDisp.map(x => <option key={x.id} value={x.id}>{x.nombre} ({x.moneda})</option>)}
                              </select>
                            </td>
                            <td className="px-3"><input type="number" step="0.01" value={v.importe} onChange={e => updVal(idx, { importe: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" /></td>
                            <td className="px-3 text-xs text-gray-500">{v.moneda}</td>
                            <td className="px-2"><button type="button" onClick={() => delVal(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "obs" && (
              <>
                <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={4}
                  className="w-full border rounded px-3 py-2 text-sm" />
                {requiereObs && <p className="text-xs text-amber-700 mt-1">Este concepto requiere observación.</p>}
              </>
            )}
        </fieldset>
      </div>
    </div>
  )
}
