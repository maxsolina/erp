"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, Plus, Trash2 } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { type CuentaBancaria } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface ValorCaja { id: string; caja_id: string; nombre: string; tipo: string; moneda: string }
interface ValorLinea { valor_id: string; valor_nombre: string; importe: number }

type Form = {
  cuenta_bancaria_id: string
  sucursal: string
  caja_ingreso_id: string
  tipo_operacion: string
  numero_operacion: string
  fecha_operacion: string
  observaciones: string
  valores: ValorLinea[]
}

const empty = (): Form => ({
  cuenta_bancaria_id: "",
  sucursal: "",
  caja_ingreso_id: "",
  tipo_operacion: "Extracción",
  numero_operacion: "",
  fecha_operacion: "",
  observaciones: "",
  valores: [],
})

export default function ExtraccionForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"valores" | "obs">("valores")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/cuentas-bancarias").then(r => r.json()),
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/caja-valores").then(r => r.json()),
    ]).then(([cb, c, v]) => {
      if (Array.isArray(cb)) setCuentas(cb)
      if (Array.isArray(c)) setCajas(c)
      if (Array.isArray(v)) setValores(v)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/extracciones/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setEstado(d.estado ?? "borrador")
        setForm({
          cuenta_bancaria_id: d.cuenta_bancaria_id ?? "",
          sucursal: d.sucursal ?? "",
          caja_ingreso_id: d.caja_ingreso_id ?? "",
          tipo_operacion: d.tipo_operacion ?? "Extracción",
          numero_operacion: d.numero_operacion ?? "",
          fecha_operacion: d.fecha_operacion ?? "",
          observaciones: d.observaciones ?? "",
          valores: (d.valores ?? []).map((v: any) => ({
            valor_id: v.valor_id,
            valor_nombre: v.valor_nombre,
            importe: Number(v.importe ?? 0),
          })),
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Extracción no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"

  const valoresDisp = useMemo(
    () => valores.filter(v => v.caja_id === form.caja_ingreso_id),
    [valores, form.caja_ingreso_id],
  )
  const importeTotal = form.valores.reduce((s, v) => s + v.importe, 0)

  const addLinea = () => {
    if (valoresDisp.length === 0) return
    const usados = new Set(form.valores.map(v => v.valor_id))
    const disponible = valoresDisp.find(v => !usados.has(v.id)) ?? valoresDisp[0]
    setForm(f => ({ ...f, valores: [...f.valores, { valor_id: disponible.id, valor_nombre: disponible.nombre, importe: 0 }] }))
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
    if (!form.cuenta_bancaria_id) return setError("Seleccionar cuenta bancaria")
    if (!form.caja_ingreso_id) return setError("Seleccionar caja de ingreso")
    if (form.valores.length === 0) return setError("Agregar al menos una línea de valor")
    if (importeTotal <= 0) return setError("Importe total debe ser mayor a 0")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/extracciones/${initialId}` : "/api/extracciones",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/extracciones/${data.id}/editar`)
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
      const res = await fetch(`/api/extracciones/${initialId}/publicar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setPublicando(false); return }
      router.push("/finanzas/extracciones")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setPublicando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/extracciones")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Extracción" : "Nueva Extracción"}</h1>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria *</label>
              <select value={form.cuenta_bancaria_id} onChange={e => set("cuenta_bancaria_id", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caja de Ingreso *</label>
              <select value={form.caja_ingreso_id} onChange={e => { set("caja_ingreso_id", e.target.value); set("valores", []) }}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
              <select value={form.sucursal} onChange={e => set("sucursal", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">—</option>
                {sucursales.map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Operación</label>
              <input value={form.tipo_operacion} onChange={e => set("tipo_operacion", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° Operación</label>
              <input value={form.numero_operacion} onChange={e => set("numero_operacion", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Operación</label>
              <input type="date" value={form.fecha_operacion} onChange={e => set("fecha_operacion", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex border-b">
            {([{ id: "valores", label: "Valores" }, { id: "obs", label: "Observaciones" }] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
                {t.label}
              </button>
            ))}
            <div className="ml-auto px-4 py-2 text-xs text-gray-500">
              Total: <span className="font-mono font-semibold text-amber-900">${importeTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="p-6">
            {tab === "valores" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">Valores que ingresan a la caja desde la cuenta bancaria.</p>
                  <button type="button" onClick={addLinea} disabled={!form.caja_ingreso_id || valoresDisp.length === 0}
                    className="text-xs text-indigo-700 hover:text-indigo-900 disabled:opacity-50 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar valor
                  </button>
                </div>
                {form.valores.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">
                    {form.caja_ingreso_id ? "Sin líneas. Hacé click en \"Agregar valor\"." : "Seleccioná una caja primero."}
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left py-2 px-3">Valor</th>
                          <th className="text-right px-3">Importe</th>
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
                              <input type="number" step="0.01" value={v.importe}
                                onChange={e => updLinea(idx, { importe: Number(e.target.value) })}
                                className="w-32 border rounded px-2 py-1 text-sm text-right font-mono" />
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
              </>
            )}
            {tab === "obs" && (
              <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={4}
                className="w-full border rounded px-3 py-2 text-sm" />
            )}
          </div>
        </div>
      </fieldset>
    </div>
  )
}
