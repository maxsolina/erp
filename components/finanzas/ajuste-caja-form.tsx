"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, Plus, Trash2 } from "lucide-react"
import { type ConceptoRegistroCaja } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface ValorCaja { id: string; caja_id: string; nombre: string; tipo: string; moneda: string }
interface ValorLinea { valor_id: string; valor_nombre: string; tipo_movimiento: "entrada" | "salida"; importe: number }

type Form = {
  caja_id: string
  sucursal: string
  concepto_id: string
  tipo_ajuste: "ingreso" | "egreso" | ""
  fecha: string
  cuenta_analitica: string
  es_automatico: boolean
  observaciones: string
  valores: ValorLinea[]
}

const empty = (): Form => ({
  caja_id: "",
  sucursal: "",
  concepto_id: "",
  tipo_ajuste: "",
  fecha: new Date().toISOString().split("T")[0],
  cuenta_analitica: "",
  es_automatico: false,
  observaciones: "",
  valores: [],
})

export default function AjusteCajaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty())
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/conceptos-registro-caja").then(r => r.json()),
      fetch("/api/caja-valores").then(r => r.json()),
    ]).then(([c, co, v]) => {
      if (Array.isArray(c)) setCajas(c)
      // Solo conceptos visibles en ajuste de cajas.
      if (Array.isArray(co)) setConceptos(co.filter((x: ConceptoRegistroCaja) => x.visible_en_ajuste_cajas))
      if (Array.isArray(v)) setValores(v)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/ajustes-caja/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setEstado(d.estado ?? "borrador")
        setForm({
          caja_id: d.caja_id ?? "",
          sucursal: d.sucursal ?? "",
          concepto_id: d.concepto_id ?? "",
          tipo_ajuste: d.tipo_ajuste ?? "",
          fecha: d.fecha ?? new Date().toISOString().split("T")[0],
          cuenta_analitica: d.cuenta_analitica ?? "",
          es_automatico: !!d.es_automatico,
          observaciones: d.observaciones ?? "",
          valores: (d.valores ?? []).map((v: any) => ({
            valor_id: v.valor_id,
            valor_nombre: v.valor_nombre,
            tipo_movimiento: v.tipo_movimiento,
            importe: Number(v.importe ?? 0),
          })),
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Ajuste no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"

  const conceptoSel = conceptos.find(c => c.id === form.concepto_id)
  const requiereObs = conceptoSel?.requiere_observacion
  const valoresDisp = useMemo(() => valores.filter(v => v.caja_id === form.caja_id), [valores, form.caja_id])
  const importeTotal = form.valores.reduce((s, v) => s + v.importe, 0)

  // El tipo por defecto se infiere del concepto: si tiene solo cuenta_ingresos → "entrada", si no → "salida".
  const defaultTipo = (): "entrada" | "salida" => {
    if (conceptoSel?.cuenta_contable_ingresos && !conceptoSel?.cuenta_contable_egresos) return "entrada"
    return "salida"
  }

  const addLinea = () => {
    if (valoresDisp.length === 0) return
    const v = valoresDisp[0]
    setForm(f => ({ ...f, valores: [...f.valores, { valor_id: v.id, valor_nombre: v.nombre, tipo_movimiento: defaultTipo(), importe: 0 }] }))
  }
  const updLinea = (idx: number, patch: Partial<ValorLinea>) => {
    setForm(f => ({
      ...f,
      valores: f.valores.map((v, i) => {
        if (i !== idx) return v
        const next = { ...v, ...patch }
        if (patch.valor_id) {
          const found = valoresDisp.find(x => x.id === patch.valor_id)
          if (found) next.valor_nombre = found.nombre
        }
        return next
      }),
    }))
  }
  const delLinea = (idx: number) => setForm(f => ({ ...f, valores: f.valores.filter((_, i) => i !== idx) }))

  const guardar = async () => {
    if (esSoloLectura) return
    if (!form.caja_id) return setError("Seleccionar caja")
    if (!form.concepto_id) return setError("Seleccionar concepto")
    if (form.valores.length === 0) return setError("Agregar al menos una línea de valor")
    if (importeTotal <= 0) return setError("Importe total debe ser mayor a 0")
    if (requiereObs && !form.observaciones.trim()) return setError("Observaciones obligatorias para este concepto")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/ajustes-caja/${initialId}` : "/api/ajustes-caja",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/ajustes-caja/${data.id}/editar`)
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
      const res = await fetch(`/api/ajustes-caja/${initialId}/publicar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setPublicando(false); return }
      router.push("/finanzas/ajustes-caja")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setPublicando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/ajustes-caja")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Ajuste de Caja" : "Nuevo Ajuste de Caja"}</h1>
            {isEdit && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${estado === "borrador" ? "bg-gray-100 text-gray-700" : "bg-green-100 text-green-700"}`}>
                {estado === "borrador" ? "Borrador" : "Publicado"}
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
              <CheckCircle className="w-4 h-4" /> {publicando ? "Publicando…" : "Publicar"}
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

      <fieldset disabled={esSoloLectura}>
        <div className="bg-white rounded-lg border p-6 space-y-5 mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caja *</label>
              <select value={form.caja_id}
                onChange={e => {
                  const c = cajas.find(x => x.id === e.target.value)
                  set("caja_id", e.target.value)
                  if (c) set("sucursal", c.sucursal)
                  set("valores", [])
                }}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Analítica</label>
              <input value={form.cuenta_analitica} onChange={e => set("cuenta_analitica", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.es_automatico} onChange={e => set("es_automatico", e.target.checked)} className="w-4 h-4" />
              <span>Automático</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold text-gray-700">Valores afectados</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                Total: <span className="font-mono font-semibold text-amber-900">${importeTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </span>
              <button type="button" onClick={addLinea} disabled={!form.caja_id || valoresDisp.length === 0}
                className="text-xs text-indigo-700 hover:text-indigo-900 disabled:opacity-50 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Agregar valor
              </button>
            </div>
          </div>
          <div className="p-4">
            {form.valores.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">
                {form.caja_id ? "Sin líneas. Hacé click en \"Agregar valor\"." : "Seleccioná una caja primero."}
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left py-2 px-3">Valor</th>
                      <th className="text-left px-3 w-32">Tipo</th>
                      <th className="text-right px-3 w-32">Importe</th>
                      <th className="px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.valores.map((v, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-1 px-3">
                          <select value={v.valor_id} onChange={e => updLinea(idx, { valor_id: e.target.value })}
                            className="w-full border rounded px-2 py-1 text-sm">
                            {valoresDisp.map(x => <option key={x.id} value={x.id}>{x.nombre} ({x.moneda})</option>)}
                          </select>
                        </td>
                        <td className="px-3">
                          <select value={v.tipo_movimiento} onChange={e => updLinea(idx, { tipo_movimiento: e.target.value as "entrada" | "salida" })}
                            className="w-full border rounded px-2 py-1 text-sm">
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                          </select>
                        </td>
                        <td className="px-3">
                          <input type="number" step="0.01" value={v.importe}
                            onChange={e => updLinea(idx, { importe: Number(e.target.value) })}
                            className="w-full border rounded px-2 py-1 text-sm text-right font-mono" />
                        </td>
                        <td className="px-2">
                          <button type="button" onClick={() => delLinea(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Observaciones{requiereObs && " *"}
          </label>
          <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3}
            className="w-full border rounded px-3 py-2 text-sm" />
          {requiereObs && <p className="text-xs text-amber-700 mt-1">Este concepto requiere observación.</p>}
        </div>
      </fieldset>
    </div>
  )
}
