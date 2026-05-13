"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, Ban } from "lucide-react"
import { type CuentaBancaria } from "./_shared"

type Form = {
  desde_cuenta_id: string
  hasta_cuenta_id: string
  sucursal: string
  importe_origen: number
  tipo_operacion_origen: string
  numero_operacion_origen: string
  fecha_operacion_origen: string
  tipo_operacion_destino: string
  numero_operacion_destino: string
  fecha_operacion_destino: string
  observaciones: string
}

const empty = (): Form => {
  const hoy = new Date().toISOString().split("T")[0]
  return {
    desde_cuenta_id: "",
    hasta_cuenta_id: "",
    sucursal: "",
    importe_origen: 0,
    tipo_operacion_origen: "Transferencia",
    numero_operacion_origen: "",
    fecha_operacion_origen: hoy,
    tipo_operacion_destino: "Transferencia",
    numero_operacion_destino: "",
    fecha_operacion_destino: hoy,
    observaciones: "",
  }
}

export default function TransferenciaBancariaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty())
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"origen" | "destino" | "obs">("origen")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [mostrarConfirmCancel, setMostrarConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/cuentas-bancarias")
      .then(r => r.json())
      .then((d: CuentaBancaria[]) => { if (Array.isArray(d)) setCuentas(d) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/transferencias-bancarias/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setEstado(d.estado ?? "borrador")
        setForm({
          desde_cuenta_id: d.desde_cuenta_id ?? "",
          hasta_cuenta_id: d.hasta_cuenta_id ?? "",
          sucursal: d.sucursal ?? "",
          importe_origen: Number(d.importe_origen ?? 0),
          tipo_operacion_origen: d.tipo_operacion_origen ?? "Transferencia",
          numero_operacion_origen: d.numero_operacion_origen ?? "",
          fecha_operacion_origen: d.fecha_operacion_origen ?? "",
          tipo_operacion_destino: d.tipo_operacion_destino ?? "Transferencia",
          numero_operacion_destino: d.numero_operacion_destino ?? "",
          fecha_operacion_destino: d.fecha_operacion_destino ?? "",
          observaciones: d.observaciones ?? "",
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Transferencia no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"
  const cuentasDestino = useMemo(() => cuentas.filter(c => c.id !== form.desde_cuenta_id), [cuentas, form.desde_cuenta_id])

  const guardar = async () => {
    if (esSoloLectura) return
    if (!form.desde_cuenta_id || !form.hasta_cuenta_id) return setError("Seleccionar ambas cuentas")
    if (form.desde_cuenta_id === form.hasta_cuenta_id) return setError("Origen y destino no pueden ser iguales")
    if (form.importe_origen <= 0) return setError("Importe inválido")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/transferencias-bancarias/${initialId}` : "/api/transferencias-bancarias",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/transferencias-bancarias/${data.id}/editar`)
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
      const res = await fetch(`/api/transferencias-bancarias/${initialId}/publicar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setPublicando(false); return }
      router.push("/finanzas/transferencias-bancarias")
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
      const res = await fetch(`/api/transferencias-bancarias/${initialId}/cancelar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setCancelando(false); return }
      router.push("/finanzas/transferencias-bancarias")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setCancelando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/transferencias-bancarias")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Transferencia Bancaria" : "Nueva Transferencia Bancaria"}</h1>
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
            <p className="text-sm font-medium text-gray-700">Confirmando transferencia…</p>
          </div>
        </div>
      )}

      {cancelando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg px-8 py-6 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-700">Cancelando transferencia…</p>
          </div>
        </div>
      )}

      {mostrarConfirmCancel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancelar transferencia</h3>
            <p className="text-sm text-gray-600 mb-5">
              Se van a anular los movimientos bancarios y se generará un asiento de reversa.
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

      <fieldset disabled={esSoloLectura}>
        <div className="bg-white rounded-lg border p-6 space-y-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Origen *</label>
              <select value={form.desde_cuenta_id} onChange={e => set("desde_cuenta_id", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Destino *</label>
              <select value={form.hasta_cuenta_id} onChange={e => set("hasta_cuenta_id", e.target.value)}
                disabled={!form.desde_cuenta_id}
                className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-50">
                <option value="">Seleccionar…</option>
                {cuentasDestino.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta} ({c.moneda})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Importe *</label>
            <input type="number" step="0.01" value={form.importe_origen} onChange={e => set("importe_origen", Number(e.target.value))}
              className="w-full max-w-xs border rounded px-3 py-2 text-sm text-right font-mono" />
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex border-b">
            {([
              { id: "origen", label: "Datos Banco Origen" },
              { id: "destino", label: "Datos Banco Destino" },
              { id: "obs", label: "Observaciones" },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === "origen" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Operación</label>
                  <input value={form.tipo_operacion_origen} onChange={e => set("tipo_operacion_origen", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Operación</label>
                  <input value={form.numero_operacion_origen} onChange={e => set("numero_operacion_origen", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Operación</label>
                  <input type="date" value={form.fecha_operacion_origen} onChange={e => set("fecha_operacion_origen", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
            )}
            {tab === "destino" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Operación</label>
                  <input value={form.tipo_operacion_destino} onChange={e => set("tipo_operacion_destino", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Operación</label>
                  <input value={form.numero_operacion_destino} onChange={e => set("numero_operacion_destino", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Operación</label>
                  <input type="date" value={form.fecha_operacion_destino} onChange={e => set("fecha_operacion_destino", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>
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
