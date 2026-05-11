"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, DollarSign } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { type TipoPrestamo, type CuentaBancaria, formatCurrency } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface Cuota {
  id: string
  numero_cuota: number
  fecha_vencimiento: string
  capital: number
  interes: number
  total: number
  saldo: number
  estado: "pendiente" | "conciliado" | "vencido"
  fecha_pago: string | null
}

type Form = {
  tipo_id: string
  entidad_id: string
  nro_prestamo: string
  moneda: string
  capital: number
  tasa_porcentaje: number
  iva: number
  percepcion_iva: number
  percepcion_iibb: number
  otros_gastos: number
  fecha: string
  sucursal: string
  caja_id: string
  sistema_amortizacion: "frances" | "aleman" | "americano" | "bullet"
  es_preexistente: boolean
  cantidad_cuotas: number
  periodicidad: string
  fecha_primera_cuota: string
  importe_refinanciado: number
  importe_acreditado: number
  tipo_garante: string
  garante: string
  forma_pago: string
  tipo_tasa: string
  distribucion_pago: string
  periodo_gracia: number
  observaciones: string
}

const empty = (): Form => ({
  tipo_id: "",
  entidad_id: "",
  nro_prestamo: "",
  moneda: "ARS",
  capital: 0,
  tasa_porcentaje: 0,
  iva: 0,
  percepcion_iva: 0,
  percepcion_iibb: 0,
  otros_gastos: 0,
  fecha: new Date().toISOString().split("T")[0],
  sucursal: "",
  caja_id: "",
  sistema_amortizacion: "frances",
  es_preexistente: false,
  cantidad_cuotas: 12,
  periodicidad: "mensual",
  fecha_primera_cuota: "",
  importe_refinanciado: 0,
  importe_acreditado: 0,
  tipo_garante: "",
  garante: "",
  forma_pago: "",
  tipo_tasa: "",
  distribucion_pago: "Proporcional",
  periodo_gracia: 0,
  observaciones: "",
})

const ESTADO_BG: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  pendiente: "bg-blue-100 text-blue-700",
  cerrado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

export default function PrestamoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [tipos, setTipos] = useState<TipoPrestamo[]>([])
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"info" | "cuotas" | "obs">("info")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [accion, setAccion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/tipos-prestamo").then(r => r.json()),
      fetch("/api/cuentas-bancarias").then(r => r.json()),
      fetch("/api/cajas").then(r => r.json()),
    ]).then(([t, cb, c]) => {
      if (Array.isArray(t)) setTipos(t)
      if (Array.isArray(cb)) setCuentas(cb)
      if (Array.isArray(c)) setCajas(c)
    }).catch(console.error)
  }, [])

  const recargar = async (id: string) => {
    const r = await fetch(`/api/prestamos/${id}`)
    if (!r.ok) throw new Error(await r.text())
    const d = await r.json()
    setEstado(d.estado ?? "borrador")
    setForm({
      tipo_id: d.tipo_id ?? "",
      entidad_id: d.entidad_id ?? "",
      nro_prestamo: d.nro_prestamo ?? "",
      moneda: d.moneda ?? "ARS",
      capital: Number(d.capital ?? 0),
      tasa_porcentaje: Number(d.tasa_porcentaje ?? 0),
      iva: Number(d.iva ?? 0),
      percepcion_iva: Number(d.percepcion_iva ?? 0),
      percepcion_iibb: Number(d.percepcion_iibb ?? 0),
      otros_gastos: Number(d.otros_gastos ?? 0),
      fecha: d.fecha ?? new Date().toISOString().split("T")[0],
      sucursal: d.sucursal ?? "",
      caja_id: d.caja_id ?? "",
      sistema_amortizacion: d.sistema_amortizacion ?? "frances",
      es_preexistente: !!d.es_preexistente,
      cantidad_cuotas: Number(d.cantidad_cuotas ?? 12),
      periodicidad: d.periodicidad ?? "mensual",
      fecha_primera_cuota: d.fecha_primera_cuota ?? "",
      importe_refinanciado: Number(d.importe_refinanciado ?? 0),
      importe_acreditado: Number(d.importe_acreditado ?? 0),
      tipo_garante: d.tipo_garante ?? "",
      garante: d.garante ?? "",
      forma_pago: d.forma_pago ?? "",
      tipo_tasa: d.tipo_tasa ?? "",
      distribucion_pago: d.distribucion_pago ?? "Proporcional",
      periodo_gracia: Number(d.periodo_gracia ?? 0),
      observaciones: d.observaciones ?? "",
    })
    setCuotas(d.cuotas ?? [])
  }

  useEffect(() => {
    if (!isEdit || !initialId) return
    recargar(initialId)
      .then(() => setCargando(false))
      .catch(() => { setErrorCarga("Préstamo no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"

  const guardar = async (): Promise<string | null> => {
    if (esSoloLectura) return null
    if (!form.capital || form.capital <= 0) { setError("Capital inválido"); return null }
    if (!form.fecha) { setError("Fecha es requerida"); return null }
    if (!form.cantidad_cuotas || form.cantidad_cuotas <= 0) { setError("Cantidad de cuotas inválida"); return null }
    if (guardando) return null
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/prestamos/${initialId}` : "/api/prestamos",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); return null }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/prestamos/${data.id}/editar`)
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
    if (!isEdit || estado !== "borrador" || accion) return
    if (!form.fecha_primera_cuota) { setError("Definí la fecha de primera cuota antes de confirmar"); return }
    setError(null)
    setAccion("Confirmando")
    try {
      const res = await fetch(`/api/prestamos/${initialId}/confirmar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      router.push("/finanzas/prestamos")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const pagarCuota = async (cuota: Cuota) => {
    if (!isEdit || accion) return
    if (!confirm(`¿Registrar pago de cuota ${cuota.numero_cuota} por ${formatCurrency(cuota.total, form.moneda)}?`)) return
    setError(null)
    setAccion(`Pagando ${cuota.id}`)
    try {
      const res = await fetch(`/api/prestamos/${initialId}/cuotas/${cuota.id}/pagar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      await recargar(initialId!)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/prestamos")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Préstamo" : "Nuevo Préstamo"}</h1>
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
            <button onClick={() => guardar()} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
            </button>
          )}
          {isEdit && estado === "borrador" && (
            <button onClick={confirmar} disabled={!!accion} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {accion === "Confirmando" ? "Confirmando…" : "Confirmar (genera cuotas)"}
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

      <div className="bg-white rounded-lg border mb-4">
        <div className="flex border-b">
          {([
            { id: "info", label: "Información" },
            { id: "cuotas", label: `Cuotas (${cuotas.length})`, disabled: cuotas.length === 0 },
            { id: "obs", label: "Observaciones" },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
              className={`px-4 py-2 text-sm border-b-2 disabled:opacity-50 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <fieldset disabled={esSoloLectura} className="p-6">
          {tab === "info" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={form.tipo_id} onChange={e => set("tipo_id", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">Seleccionar…</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entidad (cuenta bancaria)</label>
                  <select value={form.entidad_id} onChange={e => set("entidad_id", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">Seleccionar…</option>
                    {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Préstamo (banco)</label>
                  <input value={form.nro_prestamo} onChange={e => set("nro_prestamo", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
                  <select value={form.moneda} onChange={e => set("moneda", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Capital *</label>
                  <input type="number" step="0.01" value={form.capital} onChange={e => set("capital", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tasa % (anual)</label>
                  <input type="number" step="0.01" value={form.tasa_porcentaje} onChange={e => set("tasa_porcentaje", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                  <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cant. Cuotas *</label>
                  <input type="number" value={form.cantidad_cuotas} onChange={e => set("cantidad_cuotas", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Periodicidad</label>
                  <select value={form.periodicidad} onChange={e => set("periodicidad", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sistema Amortización</label>
                  <select value={form.sistema_amortizacion} onChange={e => set("sistema_amortizacion", e.target.value as Form["sistema_amortizacion"])}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="frances">Francés (cuota fija)</option>
                    <option value="aleman">Alemán (capital constante)</option>
                    <option value="americano">Americano (solo intereses)</option>
                    <option value="bullet">Bullet (todo al final)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha 1° Cuota</label>
                  <input type="date" value={form.fecha_primera_cuota} onChange={e => set("fecha_primera_cuota", e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">IVA</label>
                  <input type="number" step="0.01" value={form.iva} onChange={e => set("iva", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Perc. IVA</label>
                  <input type="number" step="0.01" value={form.percepcion_iva} onChange={e => set("percepcion_iva", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Perc. IIBB</label>
                  <input type="number" step="0.01" value={form.percepcion_iibb} onChange={e => set("percepcion_iibb", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Otros gastos</label>
                  <input type="number" step="0.01" value={form.otros_gastos} onChange={e => set("otros_gastos", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Caja (acreditación)</label>
                  <select value={form.caja_id} onChange={e => set("caja_id", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">Sin caja</option>
                    {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.sucursal})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
                  <select value={form.sucursal} onChange={e => set("sucursal", e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                    <option value="">—</option>
                    {sucursales.map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Importe Acreditado</label>
                  <input type="number" step="0.01" value={form.importe_acreditado} onChange={e => set("importe_acreditado", Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm text-right font-mono"
                    placeholder="Vacío = usa capital" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={form.es_preexistente} onChange={e => set("es_preexistente", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Préstamo preexistente (no genera ingreso en caja al confirmar)</span>
              </label>
            </div>
          )}

          {tab === "cuotas" && (
            <div>
              {cuotas.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Las cuotas se generan al confirmar el préstamo.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-center py-2 px-3 w-12">N°</th>
                        <th className="text-left px-3">Vencimiento</th>
                        <th className="text-right px-3">Capital</th>
                        <th className="text-right px-3">Interés</th>
                        <th className="text-right px-3">Total</th>
                        <th className="text-right px-3">Saldo</th>
                        <th className="text-center px-3">Estado</th>
                        <th className="px-3 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotas.map(c => (
                        <tr key={c.id} className="border-t">
                          <td className="py-1 px-3 text-center font-medium">{c.numero_cuota}</td>
                          <td className="px-3">{c.fecha_vencimiento}</td>
                          <td className="px-3 text-right font-mono">{formatCurrency(c.capital, form.moneda)}</td>
                          <td className="px-3 text-right font-mono text-gray-600">{formatCurrency(c.interes, form.moneda)}</td>
                          <td className="px-3 text-right font-mono font-semibold">{formatCurrency(c.total, form.moneda)}</td>
                          <td className="px-3 text-right font-mono text-gray-500 text-xs">{formatCurrency(c.saldo, form.moneda)}</td>
                          <td className="px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.estado === "conciliado" ? "bg-green-100 text-green-700" : c.estado === "vencido" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {c.estado === "conciliado" ? "Pago" : c.estado === "vencido" ? "Vencida" : "Pendiente"}
                            </span>
                          </td>
                          <td className="px-3">
                            {c.estado === "pendiente" && estado === "pendiente" && (
                              <button type="button" onClick={() => pagarCuota(c)} disabled={!!accion}
                                className="text-xs text-green-700 hover:text-green-900 disabled:opacity-50 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> {accion === `Pagando ${c.id}` ? "Pagando…" : "Pagar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "obs" && (
            <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} rows={4}
              className="w-full border rounded px-3 py-2 text-sm" />
          )}
        </fieldset>
      </div>
    </div>
  )
}
