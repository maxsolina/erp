"use client"

// Extracto de Caja — apertura y detalle (Saldos / Movimientos / Cheques /
// Cupones) con modal de cierre que pide saldos físicos.
//
// Modo "nuevo" (sin initialId): formulario chico para abrir un extracto en una
// caja sin extracto abierto previo. Al guardar redirige al detalle.
// Modo "edit" (con initialId): vista de detalle con 4 cards informativas + 4
// tabs. Si está abierto, muestra botón "Cerrar Extracto" que abre el modal
// con conteo físico.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle, ArrowLeft, CreditCard, Lock, Receipt, Save, X,
} from "lucide-react"
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
  transacciones?: number
}

interface Movimiento {
  id: string
  valor_id: string
  valor_nombre: string
  tipo_movimiento: "ingreso" | "egreso"
  importe: number
  moneda: string
  concepto: string | null
  documento_origen_tipo: string | null
  documento_origen_id: string | null
  documento_origen_numero: string | null
  estado_movimiento: string | null
  fecha: string
}

interface Extracto {
  id: string
  numero: string
  caja_id: string
  caja_nombre: string
  sucursal: string
  responsable_nombre: string | null
  fecha_apertura: string
  fecha_cierre: string | null
  estado: "abierto" | "cerrado"
  saldos: Saldo[]
  movimientos: Movimiento[]
}

type Form = { caja_id: string; responsable_nombre: string }
const empty = (): Form => ({ caja_id: "", responsable_nombre: "" })

const formatFecha = (f: string | null | undefined) =>
  f ? new Date(f).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

const formatMonto = (m: number) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m)

export default function ExtractoCajaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  // ── Modo nuevo ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<Form>(empty())
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [cajasConAbierto, setCajasConAbierto] = useState<Set<string>>(new Set())
  const [ultimosSaldos, setUltimosSaldos] = useState<Saldo[] | null>(null)
  const [errorNuevo, setErrorNuevo] = useState("")

  // ── Modo edit ────────────────────────────────────────────────────────────
  const [extracto, setExtracto] = useState<Extracto | null>(null)
  const [tab, setTab] = useState<"saldos" | "movimientos" | "cheques" | "cupones">("saldos")
  const [saldoSel, setSaldoSel] = useState<Saldo | null>(null)
  const [mostrarCierre, setMostrarCierre] = useState(false)
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
      fetch("/api/extractos-caja?estado=abierto&sin_saldos=1").then(r => r.json()),
    ]).then(([c, a]) => {
      if (Array.isArray(c)) setCajas(c)
      if (Array.isArray(a)) setCajasConAbierto(new Set(a.map((e: any) => e.caja_id).filter(Boolean)))
    }).catch(console.error)
  }, [isEdit])

  // Cuando elige caja en modo nuevo, traer último cierre para mostrar saldos
  // de apertura previsibles.
  useEffect(() => {
    if (isEdit || !form.caja_id) { setUltimosSaldos(null); setErrorNuevo(""); return }
    if (cajasConAbierto.has(form.caja_id)) {
      setErrorNuevo("Esta caja ya tiene un extracto abierto. Cerralo antes de abrir uno nuevo.")
      setUltimosSaldos(null)
      return
    }
    setErrorNuevo("")
    // Levantamos el último extracto cerrado de esta caja vía API.
    fetch(`/api/extractos-caja?estado=cerrado&sin_saldos=1`)
      .then(r => r.json())
      .then(async (lst: any[]) => {
        const ultimo = (Array.isArray(lst) ? lst : []).find(e => e.caja_id === form.caja_id)
        if (!ultimo) return
        const detalle = await fetch(`/api/extractos-caja/${ultimo.id}`).then(r => r.json())
        if (detalle?.saldos) setUltimosSaldos(detalle.saldos)
      })
      .catch(() => {})
  }, [form.caja_id, isEdit, cajasConAbierto])

  useEffect(() => {
    if (!isEdit || !initialId) return
    recargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialId])

  const recargar = async () => {
    if (!initialId) return
    try {
      const r = await fetch(`/api/extractos-caja/${initialId}`)
      if (!r.ok) throw new Error(await r.text())
      const d: Extracto = await r.json()
      setExtracto(d)
      const init: Record<string, number> = {}
      for (const s of d.saldos ?? []) {
        init[s.id] = s.saldo_cierre_ingresado != null ? Number(s.saldo_cierre_ingresado) : Number(s.saldo_estimado ?? s.saldo_apertura ?? 0)
      }
      setSaldosFisicos(init)
    } catch {
      setErrorCarga("Extracto no encontrado")
    } finally {
      setCargando(false)
    }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const abrir = async () => {
    if (!form.caja_id) return setError("Seleccionar caja")
    if (errorNuevo) return
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

  const confirmarCierre = async () => {
    if (!extracto || cerrando) return
    setError(null)
    setCerrando(true)
    try {
      const payload = { saldos: extracto.saldos.map(s => ({ id: s.id, saldo_cierre: saldosFisicos[s.id] ?? 0 })) }
      const res = await fetch(`/api/extractos-caja/${initialId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setCerrando(false); return }
      setMostrarCierre(false)
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

  // ── Modo nuevo: form chico de apertura ───────────────────────────────────
  if (!isEdit) {
    const cajasDisponibles = cajas.filter(c => !cajasConAbierto.has(c.id))
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
            <h1 className="text-2xl font-bold text-amber-900">Abrir Extracto de Caja</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button onClick={abrir} disabled={guardando || !!errorNuevo} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Save className="w-4 h-4" /> {guardando ? "Abriendo…" : "Abrir Extracto"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}
        {errorNuevo && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{errorNuevo}</span>
          </div>
        )}

        <div className="bg-white rounded-lg border p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caja *</label>
            <select value={form.caja_id} onChange={e => set("caja_id", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Seleccionar…</option>
              {cajasDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre} — {c.sucursal}</option>)}
            </select>
            {cajasDisponibles.length === 0 && cajas.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">Todas las cajas ya tienen un extracto abierto.</p>
            )}
          </div>
          {form.caja_id && !errorNuevo && (
            <div className="bg-gray-50 rounded-md p-3 text-sm">
              <span className="text-gray-500">Sucursal:</span>{" "}
              <span className="font-medium">{cajas.find(c => c.id === form.caja_id)?.sucursal}</span>
            </div>
          )}
          {ultimosSaldos && ultimosSaldos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Saldos del último cierre (se usarán como apertura)</p>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-3 text-xs text-gray-500">Valor</th>
                      <th className="text-right py-2 px-3 text-xs text-gray-500">Saldo Cierre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosSaldos.map(s => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="py-2 px-3">{s.valor_nombre}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatMonto(Number(s.saldo_cierre_ingresado ?? s.saldo_estimado ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Al abrir, se inicializa un saldo por cada valor activo de la caja, partiendo del saldo de cierre del último extracto cerrado.
          </div>
        </div>
      </div>
    )
  }

  // ── Modo edit: detalle ───────────────────────────────────────────────────
  if (!extracto) return null
  const isAbierto = extracto.estado === "abierto"

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/finanzas/extractos-caja")} className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
            <ArrowLeft className="w-4 h-4" /> Extractos
          </button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{extracto.numero}</h1>
            <p className="text-sm text-gray-500">{extracto.caja_nombre} — {extracto.sucursal}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isAbierto ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {isAbierto ? "Abierto" : "Cerrado"}
          </span>
        </div>
        {isAbierto && (
          <button onClick={() => setMostrarCierre(true)} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Cerrar Extracto
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* 4 cards informativas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Responsable</p>
          <p className="font-medium text-gray-900">{extracto.responsable_nombre || "—"}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Apertura</p>
          <p className="font-medium text-gray-900 text-sm">{formatFecha(extracto.fecha_apertura)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Cierre</p>
          <p className="font-medium text-gray-900 text-sm">{formatFecha(extracto.fecha_cierre)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Valores</p>
          <p className="font-medium text-gray-900">{extracto.saldos.length} valores</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200 px-4">
          {([
            { id: "saldos" as const, label: "Saldos" },
            { id: "movimientos" as const, label: `Movimientos (${extracto.movimientos.length})` },
            { id: "cheques" as const, label: "Cheques" },
            { id: "cupones" as const, label: "Cupones" },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium relative transition-colors ${tab === t.id ? "text-indigo-900" : "text-gray-500 hover:text-indigo-700"}`}>
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-900" />}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "saldos" && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Moneda</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Apertura</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Movs</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Estimado</th>
                  {!isAbierto && (
                    <>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Cierre Ingresado</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Diferencia</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {extracto.saldos.map(s => {
                  const diff = !isAbierto ? Number(s.saldo_cierre_ingresado ?? 0) - (s.saldo_estimado ?? 0) : 0
                  return (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSaldoSel(s)}>
                      <td className="py-3 px-4 font-medium">{s.valor_nombre}</td>
                      <td className="py-3 px-4 text-gray-600">{s.moneda}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(s.saldo_apertura))}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{s.transacciones ?? 0}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{formatMonto(s.saldo_estimado ?? Number(s.saldo_apertura))}</td>
                      {!isAbierto && (
                        <>
                          <td className="py-3 px-4 text-right font-mono">{formatMonto(Number(s.saldo_cierre_ingresado ?? 0))}</td>
                          <td className={`py-3 px-4 text-right font-mono font-semibold ${Math.abs(diff) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                            {formatMonto(diff)}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
                {extracto.saldos.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-gray-400">Sin saldos cargados.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {tab === "movimientos" && (
            extracto.movimientos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay movimientos registrados en este extracto</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {extracto.movimientos.map(m => {
                    const cancelado = m.estado_movimiento === "cancelado"
                    return (
                      <tr key={m.id} className={`border-b border-gray-100 ${cancelado ? "opacity-50" : ""}`}>
                        <td className="py-3 px-4 text-sm text-gray-600">{formatFecha(m.fecha)}</td>
                        <td className="py-3 px-4">
                          {m.concepto || "—"}
                          {cancelado && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelado</span>}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{m.valor_nombre}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.tipo_movimiento === "ingreso" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {m.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-medium ${cancelado ? "line-through text-gray-400" : m.tipo_movimiento === "ingreso" ? "text-green-700" : "text-red-700"}`}>
                          {m.tipo_movimiento === "egreso" ? "-" : "+"}{formatMonto(Number(m.importe))}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{m.documento_origen_numero || "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          )}

          {tab === "cheques" && (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Gestión de cheques en desarrollo</p>
              <p className="text-xs text-gray-400 mt-1">Se integrará cuando el módulo de cheques esté completo.</p>
            </div>
          )}

          {tab === "cupones" && (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Gestión de cupones en desarrollo</p>
              <p className="text-xs text-gray-400 mt-1">Se integrará con el módulo de tarjetas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal cierre */}
      {mostrarCierre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-indigo-900">Cerrar Extracto — {extracto.numero}</h3>
              <button onClick={() => setMostrarCierre(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Ingresá el conteo físico de cada valor. Si hay diferencias se registran igualmente al confirmar.
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Saldo Estimado</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Conteo Físico</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {extracto.saldos.map(s => {
                    const estimado = s.saldo_estimado ?? Number(s.saldo_apertura)
                    const fisico = saldosFisicos[s.id] ?? 0
                    const diff = fisico - estimado
                    return (
                      <tr key={s.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-medium">{s.valor_nombre} <span className="text-xs text-gray-400">({s.moneda})</span></td>
                        <td className="py-3 px-4 text-right font-mono">{formatMonto(estimado)}</td>
                        <td className="py-3 px-4 text-right">
                          <input type="number" step="0.01" value={saldosFisicos[s.id] ?? ""}
                            onChange={e => setSaldosFisicos(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) || 0 }))}
                            className="w-32 text-right border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-semibold ${Math.abs(diff) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                          {formatMonto(diff)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setMostrarCierre(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarCierre} disabled={cerrando}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300">
                {cerrando ? "Cerrando…" : "Confirmar Cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de movimientos por valor (click en fila de Saldos) */}
      {saldoSel && (() => {
        const movsValor = extracto.movimientos
          .filter(m => m.valor_id === saldoSel.valor_id)
          .slice()
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        const saldoApertura = Number(saldoSel.saldo_apertura)
        let saldoAcc = saldoApertura
        const movsConSaldo = movsValor.map(m => {
          const cancelado = m.estado_movimiento === "cancelado"
          const imp = Number(m.importe)
          if (!cancelado) saldoAcc += m.tipo_movimiento === "ingreso" ? imp : -imp
          return { ...m, saldoAcum: cancelado ? null : saldoAcc }
        })
        const totalMovs = movsConSaldo.reduce((s, m) => m.estado_movimiento === "cancelado" ? s : s + (m.tipo_movimiento === "ingreso" ? Number(m.importe) : -Number(m.importe)), 0)
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-indigo-900">Saldos — {saldoSel.valor_nombre}</h3>
                <button onClick={() => setSaldoSel(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4 border-b">
                <div>
                  <p className="text-xs text-gray-500">Saldo de apertura</p>
                  <p className="font-mono font-semibold">{formatMonto(saldoApertura)}</p>
                  <p className="text-xs text-gray-500 mt-2">Total transacciones</p>
                  <p className="font-mono font-semibold">{formatMonto(totalMovs)}</p>
                  <p className="text-xs text-gray-500 mt-2">Saldo estimado</p>
                  <p className="font-mono font-semibold">{formatMonto(saldoSel.saldo_estimado ?? saldoApertura)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valor</p>
                  <p className="font-medium text-indigo-700">{saldoSel.valor_nombre} ({saldoSel.moneda})</p>
                  <p className="text-xs text-gray-500 mt-2">Moneda</p>
                  <p className="font-medium">{saldoSel.moneda}</p>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {movsConSaldo.length > 0 ? (
                  <table className="w-full">
                    <thead className="sticky top-0">
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Referencia</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Importe</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movsConSaldo.map(m => {
                        const cancelado = m.estado_movimiento === "cancelado"
                        return (
                          <tr key={m.id} className={`border-b border-gray-100 hover:bg-gray-50 ${cancelado ? "opacity-50" : ""}`}>
                            <td className="py-2 px-3 text-sm">
                              {m.concepto || m.valor_nombre}
                              {cancelado && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Cancelado</span>}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600">{m.documento_origen_numero || "—"}</td>
                            <td className="py-2 px-3 text-sm text-gray-600">{formatFecha(m.fecha)}</td>
                            <td className={`py-2 px-3 text-right font-mono text-sm ${cancelado ? "line-through text-gray-400" : m.tipo_movimiento === "ingreso" ? "text-green-700" : "text-red-700"}`}>
                              {m.tipo_movimiento === "egreso" ? "-" : ""}{formatMonto(Number(m.importe))}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-sm font-medium">
                              {m.saldoAcum !== null ? formatMonto(m.saldoAcum) : "—"}
                            </td>
                          </tr>
                        )
                      })}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="py-2 px-3 text-right text-sm text-gray-600">Total</td>
                        <td className="py-2 px-3 text-right font-mono text-sm">{formatMonto(totalMovs)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">No hay movimientos para este valor</div>
                )}
              </div>
              <div className="p-3 border-t flex justify-between items-center">
                <p className="text-xs text-gray-400">{movsConSaldo.length} movimiento{movsConSaldo.length !== 1 ? "s" : ""}</p>
                <button onClick={() => setSaldoSel(null)} className="text-sm text-indigo-700 hover:text-indigo-900 font-medium">Cerrar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
