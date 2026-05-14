"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, Edit, Trash2 } from "lucide-react"

interface MonedaDetail {
  id: number
  codigo: string
  nombre: string
  simbolo: string | null
  moneda_afip: string | null
  es_base: boolean
  posicion_simbolo: "antes" | "despues"
  factor_redondeo: number
  precision_calculo: number
  tipo_cotizacion_defecto: string
  cotizacion_automatica: boolean
  activo: boolean
}

type Form = {
  codigo: string
  nombre: string
  simbolo: string
  moneda_afip: string
  es_base: boolean
  posicion_simbolo: "antes" | "despues"
  factor_redondeo: number
  precision_calculo: number
  tipo_cotizacion_defecto: string
  cotizacion_automatica: boolean
  activo: boolean
}

const empty: Form = {
  codigo: "",
  nombre: "",
  simbolo: "",
  moneda_afip: "",
  es_base: false,
  posicion_simbolo: "antes",
  factor_redondeo: 0.01,
  precision_calculo: 0.000001,
  tipo_cotizacion_defecto: "oficial",
  cotizacion_automatica: false,
  activo: true,
}

export default function MonedaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [moneda, setMoneda] = useState<MonedaDetail | null>(null)
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState(!isEdit)
  const [snapshot, setSnapshot] = useState<Form | null>(null)

  useEffect(() => {
    if (!isEdit || !initialId) return
    // El endpoint /api/contabilidad/monedas devuelve todas. Filtramos por id.
    fetch("/api/contabilidad/monedas?activo=false")
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: MonedaDetail[]) => {
        const found = (data ?? []).find(m => String(m.id) === String(initialId))
        if (!found) {
          setErrorCarga("Moneda no encontrada")
          setCargando(false)
          return
        }
        setMoneda(found)
        setForm({
          codigo: found.codigo ?? "",
          nombre: found.nombre ?? "",
          simbolo: found.simbolo ?? "",
          moneda_afip: found.moneda_afip ?? "",
          es_base: !!found.es_base,
          posicion_simbolo: found.posicion_simbolo ?? "antes",
          factor_redondeo: Number(found.factor_redondeo ?? 0.01),
          precision_calculo: Number(found.precision_calculo ?? 0.000001),
          tipo_cotizacion_defecto: found.tipo_cotizacion_defecto ?? "oficial",
          cotizacion_automatica: !!found.cotizacion_automatica,
          activo: found.activo ?? true,
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Moneda no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const entrarEdicion = () => {
    setSnapshot(form)
    setModoEdicion(true)
    setError(null)
  }
  const cancelarEdicion = () => {
    if (snapshot) setForm(snapshot)
    setSnapshot(null)
    setModoEdicion(false)
    setError(null)
  }

  const guardar = async () => {
    if (!form.codigo.trim()) return setError("El código es obligatorio")
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const url = isEdit
        ? `/api/contabilidad/monedas?id=${initialId}`
        : "/api/contabilidad/monedas"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.text()
        setError(`Error: ${body}`)
        setGuardando(false)
        return
      }
      const data = await res.json()
      if (!isEdit) {
        if (data?.id) router.push(`/contabilidad/monedas/${data.id}/editar`)
      } else {
        setOkMsg("Guardado")
        setModoEdicion(false)
        setSnapshot(null)
        setTimeout(() => setOkMsg(null), 2000)
      }
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!isEdit || !initialId || borrando) return
    if (!confirm("¿Eliminar esta moneda? Esta acción no se puede deshacer.")) return
    setError(null)
    setBorrando(true)
    try {
      const res = await fetch(`/api/contabilidad/monedas?id=${initialId}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.text()
        setError(`Error: ${body}`)
        setBorrando(false)
        return
      }
      router.push("/contabilidad/monedas")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setBorrando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/contabilidad/monedas")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Configuración</p>
            <h1 className="text-2xl font-bold text-amber-900">
              {isEdit ? (modoEdicion ? "Editar Moneda" : (form.nombre || "Moneda")) : "Nueva Moneda"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {modoEdicion ? (
            <>
              <button onClick={isEdit ? cancelarEdicion : () => router.back()}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 flex items-center gap-1 text-white ${okMsg ? "bg-green-600" : "bg-indigo-900 hover:bg-indigo-800"}`}>
                <Save className="w-4 h-4" /> {guardando ? "Guardando…" : okMsg ? "Guardado ✓" : "Guardar"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cerrar
              </button>
              {moneda && !moneda.es_base && (
                <button onClick={eliminar} disabled={borrando}
                  className="px-4 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 flex items-center gap-1 disabled:opacity-50">
                  <Trash2 className="w-4 h-4" /> {borrando ? "Borrando…" : "Eliminar"}
                </button>
              )}
              <button onClick={entrarEdicion} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-1">
                <Edit className="w-4 h-4" /> Editar
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
      {okMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>}

      <fieldset disabled={!modoEdicion}>
        <div className="bg-white rounded-lg border p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
              <input value={form.codigo} onChange={e => set("codigo", e.target.value.toUpperCase())}
                className="w-full border rounded px-3 py-2 text-sm font-mono"
                placeholder="ARS, USD, EUR…" maxLength={5} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set("nombre", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Peso Argentino, Dólar, Euro…" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Símbolo</label>
              <input value={form.simbolo} onChange={e => set("simbolo", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="$, US$, €…" maxLength={5} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Posición del símbolo</label>
              <select value={form.posicion_simbolo} onChange={e => set("posicion_simbolo", e.target.value as "antes" | "despues")}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="antes">Antes ($ 100,00)</option>
                <option value="despues">Después (100,00 $)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código AFIP</label>
              <input value={form.moneda_afip} onChange={e => set("moneda_afip", e.target.value.toUpperCase())}
                className="w-full border rounded px-3 py-2 text-sm font-mono"
                placeholder="PES, DOL, EUR…" maxLength={3} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Factor redondeo</label>
              <input type="number" step="0.001" value={form.factor_redondeo}
                onChange={e => set("factor_redondeo", Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precisión cálculo</label>
              <input type="number" step="0.000001" value={form.precision_calculo}
                onChange={e => set("precision_calculo", Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo cotización por defecto</label>
              <input value={form.tipo_cotizacion_defecto} onChange={e => set("tipo_cotizacion_defecto", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="oficial, blue, mep…" />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-3 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.es_base} onChange={e => set("es_base", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Moneda base del sistema</span>
              <span className="text-xs text-gray-400">(la que tiene cotización 1:1)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.cotizacion_automatica} onChange={e => set("cotizacion_automatica", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Cotización automática</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Activa</span>
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
