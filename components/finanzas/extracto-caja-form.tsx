"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle } from "lucide-react"
import { formatCurrency } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }

interface Saldo {
  id: string
  valor_id: string
  valor_nombre: string
  valor_codigo: string | null
  moneda: string
  saldo_apertura: number
  saldo_cierre_ingresado: number | null
  saldo_estimado?: number
}

type Form = {
  caja_id: string
  responsable_nombre: string
}

const empty = (): Form => ({ caja_id: "", responsable_nombre: "" })

export default function ExtractoCajaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty())
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [cajasConAbierto, setCajasConAbierto] = useState<Set<string>>(new Set())
  const [extracto, setExtracto] = useState<{ id: string; numero: string; caja_nombre: string; sucursal: string; responsable_nombre: string | null; fecha_apertura: string; fecha_cierre: string | null; estado: string } | null>(null)
  const [saldos, setSaldos] = useState<Saldo[]>([])
  const [saldosFisicos, setSaldosFisicos] = useState<Record<string, number>>({})
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit) return
    Promise.all([
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/extractos-caja?estado=abierto").then(r => r.json()),
    ]).then(([c, a]) => {
      if (Array.isArray(c)) setCajas(c)
      // Filtramos por caja_id (no por nombre) para soportar cajas homónimas
      // en distintas sucursales.
      if (Array.isArray(a)) setCajasConAbierto(new Set(a.map((e: any) => e.caja_id).filter(Boolean)))
    }).catch(console.error)
  }, [isEdit])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/extractos-caja/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setExtracto(d)
        setSaldos(d.saldos ?? [])
        const init: Record<string, number> = {}
        for (const s of d.saldos ?? []) {
          init[s.id] = s.saldo_cierre_ingresado != null ? Number(s.saldo_cierre_ingresado) : Number(s.saldo_estimado ?? s.saldo_apertura ?? 0)
        }
        setSaldosFisicos(init)
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Extracto no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const abrir = async () => {
    if (!form.caja_id) return setError("Seleccionar caja")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch("/api/extractos-caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      router.push(`/finanzas/extractos-caja/${data.id}/editar`)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  const cerrar = async () => {
    if (!isEdit || !extracto || extracto.estado !== "abierto") return
    if (cerrando) return
    setError(null)
    setCerrando(true)
    try {
      const payload = {
        saldos: saldos.map(s => ({ id: s.id, saldo_cierre: saldosFisicos[s.id] ?? 0 })),
      }
      const res = await fetch(`/api/extractos-caja/${initialId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setCerrando(false); return }
      router.push("/finanzas/extractos-caja")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setCerrando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/extractos-caja")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  // ── Apertura (modo nuevo) ────────────────────────────────────────────────
  if (!isEdit) {
    const cajasDisponibles = cajas.filter(c => !cajasConAbierto.has(c.id))
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
            <h1 className="text-2xl font-bold text-amber-900">Abrir Extracto de Caja</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button onClick={abrir} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Save className="w-4 h-4" /> {guardando ? "Abriendo…" : "Abrir Extracto"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg border p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caja *</label>
            <select value={form.caja_id} onChange={e => set("caja_id", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar…</option>
              {cajasDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
            </select>
            {cajasDisponibles.length === 0 && cajas.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">Todas las cajas ya tienen un extracto abierto.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Responsable</label>
            <input value={form.responsable_nombre} onChange={e => set("responsable_nombre", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm" placeholder="Nombre del operador" />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Al abrir, se inicializa un saldo por cada valor activo de la caja, partiendo del saldo de cierre del último extracto cerrado.
          </div>
        </div>
      </div>
    )
  }

  // ── Modo edit ────────────────────────────────────────────────────────────
  const isAbierto = extracto?.estado === "abierto"
  const hayDiferencia = saldos.some(s => {
    const fisico = saldosFisicos[s.id] ?? 0
    const estimado = s.saldo_estimado ?? Number(s.saldo_apertura)
    return Math.abs(fisico - estimado) > 0.01
  })

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Extracto {extracto?.numero}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{extracto?.caja_nombre} ({extracto?.sucursal})</span>
              <span>Responsable: {extracto?.responsable_nombre ?? "—"}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAbierto ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"}`}>
                {isAbierto ? "Abierto" : "Cerrado"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <X className="w-4 h-4" /> Cerrar
          </button>
          {isAbierto && (
            <button onClick={cerrar} disabled={cerrando} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {cerrando ? "Cerrando…" : "Cerrar Extracto"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      {isAbierto && hayDiferencia && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Atención: hay diferencias entre el conteo físico y el estimado. Se registrarán los valores ingresados al cerrar.
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left py-2 px-3">Valor</th>
              <th className="px-3 w-20">Moneda</th>
              <th className="text-right px-3 w-32">Apertura</th>
              <th className="text-right px-3 w-32">Estimado</th>
              <th className="text-right px-3 w-40">{isAbierto ? "Físico (cierre)" : "Cierre"}</th>
              <th className="text-right px-3 w-32">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {saldos.map(s => {
              const estimado = s.saldo_estimado ?? Number(s.saldo_apertura)
              const fisico = isAbierto ? (saldosFisicos[s.id] ?? 0) : Number(s.saldo_cierre_ingresado ?? 0)
              const dif = fisico - estimado
              return (
                <tr key={s.id} className="border-t">
                  <td className="py-2 px-3 font-medium">{s.valor_nombre}</td>
                  <td className="px-3 text-xs text-gray-500">{s.moneda}</td>
                  <td className="px-3 text-right font-mono">{formatCurrency(Number(s.saldo_apertura ?? 0), s.moneda)}</td>
                  <td className="px-3 text-right font-mono text-gray-700">{formatCurrency(estimado, s.moneda)}</td>
                  <td className="px-3">
                    {isAbierto ? (
                      <input type="number" step="0.01" value={saldosFisicos[s.id] ?? 0}
                        onChange={e => setSaldosFisicos(prev => ({ ...prev, [s.id]: Number(e.target.value) }))}
                        className="w-full border rounded px-2 py-1 text-sm text-right font-mono" />
                    ) : (
                      <span className="block text-right font-mono font-semibold">{formatCurrency(fisico, s.moneda)}</span>
                    )}
                  </td>
                  <td className={`px-3 text-right font-mono text-xs ${Math.abs(dif) > 0.01 ? "text-red-600" : "text-gray-400"}`}>
                    {dif > 0 ? "+" : ""}{dif.toFixed(2)}
                  </td>
                </tr>
              )
            })}
            {saldos.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-xs text-gray-400">Sin saldos cargados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
