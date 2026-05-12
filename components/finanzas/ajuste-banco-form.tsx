"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle } from "lucide-react"
import SearchableSelect from "@/components/ui/searchable-select"
import { useERP } from "@/contexts/erp-context"
import { type ConceptoRegistroCaja, type CuentaBancaria, cuentasPermitidasParaConcepto } from "./_shared"

interface CuentaContable { id: string; codigo: string; nombre: string }

type Form = {
  cuenta_bancaria_id: string
  cuenta_bancaria_nombre: string
  concepto_id: string
  importe: string
  fecha: string
  sucursal: string
  cuenta_analitica: string
  observaciones: string
}

const empty = (): Form => ({
  cuenta_bancaria_id: "",
  cuenta_bancaria_nombre: "",
  concepto_id: "",
  importe: "",
  fecha: new Date().toISOString().split("T")[0],
  sucursal: "",
  cuenta_analitica: "",
  observaciones: "",
})

export default function AjusteBancoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales, currentUser } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [conceptos, setConceptos] = useState<ConceptoRegistroCaja[]>([])
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userParam = currentUser?.id ? `&for_user=${encodeURIComponent(currentUser.id)}` : ""
    Promise.all([
      fetch(`/api/conceptos-registro-caja?con_relaciones=1${userParam}`).then(r => r.json()),
      fetch("/api/cuentas-bancarias").then(r => r.json()),
      fetch("/api/contabilidad/plan-cuentas?activo=true").then(r => r.json()).catch(() => []),
    ]).then(([c, cb, pc]) => {
      // Conceptos visibles en ajuste de banco.
      if (Array.isArray(c)) setConceptos(c.filter((x: ConceptoRegistroCaja) => x.visible_en_ajuste_banco))
      if (Array.isArray(cb)) setCuentas(cb)
      if (Array.isArray(pc)) setCuentasContables(pc.map((x: any) => ({ id: x.id, codigo: x.codigo, nombre: x.nombre })))
    }).catch(console.error)
  }, [currentUser?.id])

  // Auto-cargar cuenta_analitica cuando se elige concepto.
  useEffect(() => {
    if (!form.concepto_id) return
    const concepto = conceptos.find(c => c.id === form.concepto_id)
    if (!concepto) return
    const cuenta = concepto.cuenta_contable_egresos || concepto.cuenta_contable_ingresos
    if (!cuenta) return
    setForm(f => f.cuenta_analitica ? f : { ...f, cuenta_analitica: cuenta })
  }, [form.concepto_id, conceptos])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/ajustes-banco/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setForm({
          cuenta_bancaria_id: d.cuenta_bancaria_id ?? "",
          cuenta_bancaria_nombre: d.cuenta_bancaria_nombre ?? "",
          concepto_id: d.concepto_id ?? "",
          importe: String(d.importe ?? ""),
          fecha: d.fecha ?? new Date().toISOString().split("T")[0],
          sucursal: d.sucursal ?? "",
          cuenta_analitica: d.cuenta_analitica ?? "",
          observaciones: d.observaciones ?? "",
        })
        setEstado(d.estado ?? "borrador")
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Ajuste no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const conceptoSel = conceptos.find(c => c.id === form.concepto_id)
  const requiereObs = conceptoSel?.requiere_observacion

  const cuentasContablesFiltradas = (() => {
    const permitidas = cuentasPermitidasParaConcepto(conceptoSel)
    if (!permitidas) return cuentasContables
    return cuentasContables.filter(c => permitidas.has(c.codigo))
  })()

  const esSoloLectura = estado !== "borrador"

  const guardar = async (): Promise<string | null> => {
    if (esSoloLectura) return null
    if (!form.cuenta_bancaria_id) { setError("Seleccionar cuenta bancaria"); return null }
    if (!form.concepto_id) { setError("Seleccionar concepto"); return null }
    if (!form.importe || isNaN(Number(form.importe))) { setError("Importe inválido"); return null }
    if (requiereObs && !form.observaciones.trim()) { setError("Observaciones obligatorias para este concepto"); return null }
    if (guardando) return null
    setError(null)
    setGuardando(true)
    try {
      const payload = { ...form, importe: Number(form.importe) }
      const res = await fetch(
        isEdit ? `/api/ajustes-banco/${initialId}` : "/api/ajustes-banco",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return null }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/ajustes-banco/${data.id}/editar`)
      }
      return data.id ?? initialId ?? null
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      return null
    } finally {
      setGuardando(false)
    }
  }

  const publicar = async () => {
    if (!isEdit || estado !== "borrador" || publicando) return
    setError(null)
    setPublicando(true)
    try {
      const res = await fetch(`/api/ajustes-banco/${initialId}/publicar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setPublicando(false); return }
      router.push("/finanzas/ajustes-banco")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setPublicando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/ajustes-banco")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Editar Ajuste de Banco" : "Nuevo Ajuste de Banco"}</h1>
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
            <button onClick={() => guardar()} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
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
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <fieldset disabled={esSoloLectura}>
      <div className="bg-white rounded-lg border p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria *</label>
            <select value={form.cuenta_bancaria_id}
              onChange={e => {
                const c = cuentas.find(x => x.id === e.target.value)
                setForm(f => ({ ...f, cuenta_bancaria_id: e.target.value, cuenta_bancaria_nombre: c?.banco_nombre ?? "" }))
              }}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {cuentas.map(c => (
                <option key={c.id} value={c.id}>{c.numero_cuenta} - {c.banco_nombre} ({c.moneda})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Concepto *</label>
            <select value={form.concepto_id} onChange={e => set("concepto_id", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccionar…</option>
              {conceptos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Importe *</label>
            <input type="number" step="0.01" value={form.importe} onChange={e => set("importe", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
            <select value={form.sucursal} onChange={e => set("sucursal", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">—</option>
              {sucursales.map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Contable</label>
          <SearchableSelect
            value={form.cuenta_analitica || null}
            onChange={v => set("cuenta_analitica", v == null ? "" : String(v))}
            options={cuentasContablesFiltradas.map(c => ({
              value: c.codigo,
              label: `${c.codigo} - ${c.nombre}`,
              searchExtra: c.nombre,
            }))}
            placeholder={form.concepto_id ? "Elegir cuenta…" : "Elegí un concepto primero"}
            emptyText="Sin cuentas permitidas para este concepto"
            disabled={!form.concepto_id}
            allowClear
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Observaciones{requiereObs && " *"}
          </label>
          <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={3}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {requiereObs && <p className="text-xs text-amber-700 mt-1">Este concepto requiere observación.</p>}
        </div>
      </div>
      </fieldset>
    </div>
  )
}
