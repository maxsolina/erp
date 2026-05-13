"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, Ban } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { useCajasPermitidasParaUsuario, useValoresIdsPermitidasParaUsuario } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface ValorCaja { id: string; caja_id: string; nombre: string; tipo: string; moneda: string }
interface TipoCotizacion { id: string; nombre: string }

type Form = {
  caja_id: string
  sucursal: string
  fecha: string
  valor_origen_id: string
  valor_destino_id: string
  importe_origen: number
  tipo_cotizacion: string
  cotizacion: number
  observaciones: string
}

const empty = (): Form => ({
  caja_id: "",
  sucursal: "",
  fecha: new Date().toISOString().split("T")[0],
  valor_origen_id: "",
  valor_destino_id: "",
  importe_origen: 0,
  tipo_cotizacion: "",
  cotizacion: 0,
  observaciones: "",
})

function calcularConversion(importeOrigen: number, cotizacion: number) {
  if (cotizacion <= 0) return { importeDestino: 0, diferencia: 0 }
  const importeDestinoExacto = importeOrigen / cotizacion
  const importeDestino = Math.round(importeDestinoExacto * 100) / 100
  const diferencia = Math.round(((importeDestino * cotizacion) - importeOrigen) * 100) / 100
  return { importeDestino, diferencia }
}

export default function ConversionMonedaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { currentUser } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [cajasRaw, setCajasRaw] = useState<CajaDisp[]>([])
  const cajas = useCajasPermitidasParaUsuario(cajasRaw, currentUser)
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [tiposCotizacion, setTiposCotizacion] = useState<TipoCotizacion[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [mostrarConfirmCancel, setMostrarConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // Cargar cajas activas + todos los valores + tipos de cotización.
  useEffect(() => {
    Promise.all([
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/caja-valores").then(r => r.json()),
      fetch("/api/contabilidad/tipos-cotizacion?activo=true").then(r => r.json()).catch(() => []),
    ]).then(([c, v, tc]) => {
      if (Array.isArray(c)) setCajasRaw(c)
      if (Array.isArray(v)) setValores(v)
      if (Array.isArray(tc)) setTiposCotizacion(tc.map((x: any) => ({ id: x.id, nombre: x.nombre })))
    }).catch(console.error)
  }, [])

  // Cargar existente.
  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/conversiones-moneda/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setEstado(d.estado ?? "borrador")
        setForm({
          caja_id: d.caja_id ?? "",
          sucursal: d.sucursal ?? "",
          fecha: d.fecha ?? new Date().toISOString().split("T")[0],
          valor_origen_id: d.valor_origen_id ?? "",
          valor_destino_id: d.valor_destino_id ?? "",
          importe_origen: Number(d.importe_origen ?? 0),
          tipo_cotizacion: d.tipo_cotizacion ?? "Divisa",
          cotizacion: Number(d.cotizacion ?? 0),
          observaciones: d.observaciones ?? "",
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Conversión no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const esSoloLectura = isEdit && estado !== "borrador"

  const valoresPermitidos = useValoresIdsPermitidasParaUsuario(currentUser)
  // Valores filtrados por caja + tipo efectivo + permiso del usuario.
  const valoresEfectivoCaja = useMemo(
    () => valores.filter(v =>
      v.caja_id === form.caja_id
      && v.tipo === "efectivo"
      && (valoresPermitidos?.has(v.id) ?? false)
    ),
    [valores, form.caja_id, valoresPermitidos],
  )
  const valOrigen = valores.find(v => v.id === form.valor_origen_id)
  const valoresDestinoFiltrados = valoresEfectivoCaja.filter(v => v.id !== form.valor_origen_id && v.moneda !== valOrigen?.moneda)

  const { importeDestino, diferencia } = calcularConversion(form.importe_origen, form.cotizacion)
  const valDestino = valores.find(v => v.id === form.valor_destino_id)

  // Moneda cotizable: la NO-ARS entre origen y destino (preferimos destino si existe).
  const monedaCotizable =
    valDestino && valDestino.moneda !== "ARS" ? valDestino.moneda
    : valOrigen && valOrigen.moneda !== "ARS" ? valOrigen.moneda
    : ""

  // Cuando se selecciona un tipo de cotización, traer la última tasa.
  useEffect(() => {
    if (!monedaCotizable || !form.tipo_cotizacion) return
    fetch(`/api/contabilidad/cotizaciones?moneda_codigo=${encodeURIComponent(monedaCotizable)}&tipo=${encodeURIComponent(form.tipo_cotizacion)}&latest=true`)
      .then(r => r.ok ? r.json() : null)
      .then(cot => { if (cot?.tasa) setForm(f => ({ ...f, cotizacion: Number(cot.tasa) })) })
      .catch(() => {})
  }, [form.tipo_cotizacion, monedaCotizable])

  const guardar = async () => {
    if (esSoloLectura) return
    if (!form.caja_id) return setError("Seleccionar caja")
    if (!form.valor_origen_id || !form.valor_destino_id) return setError("Seleccionar valor origen y destino")
    if (form.valor_origen_id === form.valor_destino_id) return setError("El origen y destino deben ser distintos")
    if (form.importe_origen <= 0) return setError("Importe origen inválido")
    if (form.cotizacion <= 0) return setError("Cotización inválida")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const payload = {
        ...form,
        importe_destino: importeDestino,
        diferencia_redondeo: diferencia,
      }
      const res = await fetch(
        isEdit ? `/api/conversiones-moneda/${initialId}` : "/api/conversiones-moneda",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/conversion-monedas/${data.id}/editar`)
      } else {
        setOkMsg("Guardado")
        setTimeout(() => setOkMsg(null), 2000)
      }
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  const publicar = async () => {
    if (!isEdit || estado !== "borrador" || publicando) return
    setError(null)
    setPublicando(true)
    try {
      const res = await fetch(`/api/conversiones-moneda/${initialId}/publicar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setPublicando(false); return }
      router.push("/finanzas/conversion-monedas")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setPublicando(false)
    }
  }

  const cancelarOperacion = async () => {
    if (!isEdit || estado !== "publicado" || cancelando) return
    setError(null)
    setMostrarConfirmCancel(false)
    setCancelando(true)
    try {
      const res = await fetch(`/api/conversiones-moneda/${initialId}/cancelar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setCancelando(false); return }
      router.push("/finanzas/conversion-monedas")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setCancelando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/conversion-monedas")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Conversión de Monedas" : "Nueva Conversión"}</h1>
            {isEdit && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                estado === "borrador" ? "bg-gray-100 text-gray-700"
                : estado === "cancelado" ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
              }`}>
                {estado === "borrador" ? "Borrador" : estado === "cancelado" ? "Cancelado" : "Publicado"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <X className="w-4 h-4" /> {esSoloLectura ? "Cerrar" : "Cancelar"}
          </button>
          {!esSoloLectura && (
            <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
            </button>
          )}
          {isEdit && estado === "borrador" && (
            <button onClick={publicar} disabled={publicando} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {publicando ? "Confirmando…" : "Confirmar"}
            </button>
          )}
          {isEdit && estado === "publicado" && (
            <button onClick={() => setMostrarConfirmCancel(true)} disabled={cancelando} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Ban className="w-4 h-4" /> Cancelar Operación
            </button>
          )}
        </div>
      </div>

      {publicando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-700">Confirmando conversión…</p>
          </div>
        </div>
      )}

      {cancelando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-700">Cancelando conversión…</p>
          </div>
        </div>
      )}

      {mostrarConfirmCancel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar conversión</h3>
            <p className="text-sm text-gray-600 mb-5">
              Se van a anular los movimientos de caja y se generará un asiento de reversa.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMostrarConfirmCancel(false)} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                No, volver
              </button>
              <button onClick={cancelarOperacion} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1">
                <Ban className="w-4 h-4" /> Sí, cancelar
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
      {okMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>
      )}

      <fieldset disabled={esSoloLectura} className="space-y-5">
        <div className="bg-white rounded-lg border p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caja *</label>
            <select value={form.caja_id}
              onChange={e => {
                const c = cajas.find(x => x.id === e.target.value)
                set("caja_id", e.target.value)
                if (c) set("sucursal", c.sucursal)
                set("valor_origen_id", "")
                set("valor_destino_id", "")
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Origen → Destino</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Origen *</label>
              <select value={form.valor_origen_id} onChange={e => { set("valor_origen_id", e.target.value); set("valor_destino_id", "") }}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {valoresEfectivoCaja.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.moneda})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor Destino *</label>
              <select value={form.valor_destino_id} onChange={e => set("valor_destino_id", e.target.value)}
                disabled={!form.valor_origen_id}
                className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="">Seleccionar…</option>
                {valoresDestinoFiltrados.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.moneda})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Importe Origen *</label>
              <input type="number" step="0.01" value={form.importe_origen} onChange={e => set("importe_origen", Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo Cotización {monedaCotizable && <span className="text-gray-400">({monedaCotizable})</span>}
              </label>
              <select value={form.tipo_cotizacion} onChange={e => set("tipo_cotizacion", e.target.value)}
                disabled={!monedaCotizable}
                className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="">Seleccionar…</option>
                {tiposCotizacion.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cotización * {monedaCotizable && <span className="text-gray-400 font-normal">(1 {monedaCotizable} = $ ARS)</span>}
              </label>
              <input type="number" step="0.0001" value={form.cotizacion || ""} onChange={e => set("cotizacion", Number(e.target.value))}
                placeholder="0,0000"
                className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Importe Destino</label>
              <div className="px-3 py-2 bg-gray-50 border rounded text-sm text-right font-mono">
                {importeDestino.toLocaleString("es-AR", { minimumFractionDigits: 2 })} {valDestino?.moneda ?? ""}
              </div>
            </div>
          </div>

          {Math.abs(diferencia) > 0.001 && (
            <p className="text-xs text-amber-700">Diferencia de redondeo: {diferencia.toFixed(2)} {valOrigen?.moneda ?? ""}</p>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
          <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
      </fieldset>
    </div>
  )
}
