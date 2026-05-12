"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, ArrowDownToLine, Ban } from "lucide-react"
import { useERP } from "@/contexts/erp-context"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface ValorCaja { id: string; caja_id: string; nombre: string; tipo: string; moneda: string; banco_permitido_id?: string | null }

type Form = {
  caja_desde_id: string
  caja_hasta_id: string
  sucursal: string
  valor_id: string
  importe: number
  concepto: string
  fecha: string
  observaciones: string
}

const empty = (): Form => ({
  caja_desde_id: "",
  caja_hasta_id: "",
  sucursal: "",
  valor_id: "",
  importe: 0,
  concepto: "Transferencia",
  fecha: new Date().toISOString().split("T")[0],
  observaciones: "",
})

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente de recepción",
  publicado: "Publicado",
  cancelado: "Cancelado",
}
const ESTADO_BG: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  pendiente: "bg-amber-100 text-amber-700",
  publicado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

export default function TransferenciaCajaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [valores, setValores] = useState<ValorCaja[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"valores" | "obs">("valores")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [accionPendiente, setAccionPendiente] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/caja-valores").then(r => r.json()),
    ]).then(([c, v]) => {
      if (Array.isArray(c)) setCajas(c)
      if (Array.isArray(v)) setValores(v)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/transferencias-caja/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setEstado(d.estado ?? "borrador")
        setForm({
          caja_desde_id: d.caja_desde_id ?? "",
          caja_hasta_id: d.caja_hasta_id ?? "",
          sucursal: d.sucursal ?? "",
          valor_id: d.valor_id ?? "",
          importe: Number(d.importe ?? 0),
          concepto: d.concepto ?? "Transferencia",
          fecha: d.fecha ?? new Date().toISOString().split("T")[0],
          observaciones: d.observaciones ?? "",
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Transferencia no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"
  const cajasDestino = useMemo(() => cajas.filter(c => c.id !== form.caja_desde_id), [cajas, form.caja_desde_id])
  // Excluir bancos permitidos: una transferencia entre cajas mueve valores físicos,
  // no se puede transferir desde/hacia un banco usando este formulario.
  const valoresOrigen = useMemo(
    () => valores.filter(v => v.caja_id === form.caja_desde_id && !v.banco_permitido_id),
    [valores, form.caja_desde_id],
  )

  const guardar = async () => {
    if (esSoloLectura) return
    if (!form.caja_desde_id || !form.caja_hasta_id) return setError("Seleccionar caja origen y destino")
    if (form.caja_desde_id === form.caja_hasta_id) return setError("Origen y destino deben ser distintos")
    if (!form.valor_id) return setError("Seleccionar valor")
    if (form.importe <= 0) return setError("Importe inválido")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/transferencias-caja/${initialId}` : "/api/transferencias-caja",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/transferencias-caja/${data.id}/editar`)
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

  const accion = async (path: string, label: string, redirectOnSuccess = true) => {
    if (!isEdit || accionPendiente) return
    setError(null)
    setAccionPendiente(label)
    try {
      const res = await fetch(`/api/transferencias-caja/${initialId}/${path}`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccionPendiente(null); return }
      if (redirectOnSuccess) {
        router.push("/finanzas/transferencias-caja")
      }
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
      <button onClick={() => router.push("/finanzas/transferencias-caja")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Transferencia de Caja" : "Nueva Transferencia"}</h1>
            {isEdit && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BG[estado] ?? "bg-gray-100 text-gray-700"}`}>
                {ESTADO_LABEL[estado] ?? estado}
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
            <button onClick={() => accion("publicar", "Publicando")} disabled={!!accionPendiente}
              className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {accionPendiente === "Publicando" ? "Publicando…" : "Publicar"}
            </button>
          )}
          {isEdit && estado === "pendiente" && (
            <>
              <button onClick={() => accion("recibir", "Recibiendo")} disabled={!!accionPendiente}
                className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <ArrowDownToLine className="w-4 h-4" /> {accionPendiente === "Recibiendo" ? "Recibiendo…" : "Recibir"}
              </button>
              <button onClick={() => accion("cancelar", "Cancelando")} disabled={!!accionPendiente}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <Ban className="w-4 h-4" /> {accionPendiente === "Cancelando" ? "Cancelando…" : "Cancelar Transferencia"}
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

      {/* Cabecera */}
      <div className="bg-white rounded-lg border p-6 space-y-5 mb-4">
        {esSoloLectura ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Caja Origen</p>
              <p className="text-sm font-medium text-gray-800">
                {cajas.find(c => c.id === form.caja_desde_id)?.nombre ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Caja Destino</p>
              <p className="text-sm font-medium text-gray-800">
                {cajas.find(c => c.id === form.caja_hasta_id)?.nombre ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sucursal</p>
              <p className="text-sm font-medium text-gray-800">{form.sucursal || "—"}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caja Origen *</label>
              <select value={form.caja_desde_id}
                onChange={e => {
                  const c = cajas.find(x => x.id === e.target.value)
                  set("caja_desde_id", e.target.value)
                  if (c) set("sucursal", c.sucursal)
                  set("valor_id", "")
                }}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caja Destino *</label>
              <select value={form.caja_hasta_id} onChange={e => set("caja_hasta_id", e.target.value)}
                disabled={!form.caja_desde_id}
                className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="">Seleccionar…</option>
                {cajasDestino.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
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
        )}
      </div>

      {/* Tabs — fuera del fieldset para poder navegar aunque esté en read-only */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {([
            { id: "valores", label: "Valores (1)" },
            { id: "obs", label: "Observaciones" },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <fieldset disabled={esSoloLectura} className="p-4">
          {tab === "valores" && (() => {
            // En read-only buscamos el valor en TODOS los caja_valores (no solo los de origen).
            const valorActual = valores.find(v => v.id === form.valor_id) ?? valoresOrigen.find(v => v.id === form.valor_id)
            return (
              <div className="border rounded-lg overflow-visible">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left py-2 px-3">Valor</th>
                      <th className="text-left px-3 w-24">Moneda</th>
                      <th className="text-right px-3 w-40">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t align-top">
                      <td className="py-2 px-3">
                        {esSoloLectura ? (
                          <span className="text-sm font-medium text-gray-800">{valorActual?.nombre ?? "—"}</span>
                        ) : (
                          <select value={form.valor_id} onChange={e => set("valor_id", e.target.value)}
                            disabled={!form.caja_desde_id}
                            className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-50">
                            <option value="">Seleccionar…</option>
                            {valoresOrigen.map(v => <option key={v.id} value={v.id}>{v.nombre} ({v.moneda})</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-3 text-xs text-gray-600 font-mono py-2">
                        {valorActual?.moneda ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {esSoloLectura ? (
                          <span className="font-mono font-semibold text-amber-900">
                            ${Number(form.importe).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <input type="number" step="0.01" value={form.importe} onChange={e => set("importe", Number(e.target.value))}
                            className="w-full border rounded px-2 py-1.5 text-sm text-right font-mono" />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })()}
          {tab === "obs" && (
            <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={4}
              className="w-full border rounded px-3 py-2 text-sm" />
          )}
        </fieldset>
      </div>

      <fieldset disabled={esSoloLectura} className="mt-4">
        <div className="space-y-5">
          {isEdit && estado === "pendiente" && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
              La transferencia está pendiente de recepción en la caja destino. Hacé click en <strong>Recibir</strong> cuando la caja destino confirme el ingreso del valor.
            </div>
          )}
        </div>
      </fieldset>
    </div>
  )
}
