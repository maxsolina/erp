"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, ChevronRight, Plus, Trash2, Ban } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { type CuentaBancaria, type ChequeTercero, formatCurrency } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }

interface Item {
  id?: string
  cheque_id: string
  valor_nombre: string
  valor_id: string
  importe: number
}
interface Gasto {
  id?: string
  tipo: string
  cuenta_contable: string
  cuenta_analitica: string
  descripcion: string
  importe: number
  impuestos: number
  total: number
  moneda: string
}
interface Devuelto {
  id: string
  cheque_id: string
  motivo_rechazo: string
  fecha_rechazo: string
  nd_generada_id: string | null
}

type Form = {
  caja_id: string
  sucursal: string
  tipo_acreditacion: "neto" | "bruto"
  fecha: string
  destino_tipo: "banco" | "proveedor"
  proveedor_nombre: string
  cuenta_bancaria_id: string
  observaciones: string
  items: Item[]
  gastos: Gasto[]
}

const empty = (): Form => ({
  caja_id: "",
  sucursal: "",
  tipo_acreditacion: "neto",
  fecha: new Date().toISOString().split("T")[0],
  destino_tipo: "banco",
  proveedor_nombre: "",
  cuenta_bancaria_id: "",
  observaciones: "",
  items: [],
  gastos: [],
})

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", en_negociacion: "En Negociación", cobranza: "Cobranza",
  liquidacion: "Liquidación", finalizada: "Finalizada", cancelada: "Cancelada",
}
const ESTADO_BG: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700", en_negociacion: "bg-blue-100 text-blue-700",
  cobranza: "bg-amber-100 text-amber-700", liquidacion: "bg-purple-100 text-purple-700",
  finalizada: "bg-green-100 text-green-700", cancelada: "bg-red-100 text-red-700",
}
const SIGUIENTE: Record<string, string> = {
  borrador: "En Negociación", en_negociacion: "Cobranza", cobranza: "Liquidación", liquidacion: "Finalizar",
}

export default function NegociacionChequesForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [cajas, setCajas] = useState<CajaDisp[]>([])
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [chequesEnCartera, setChequesEnCartera] = useState<ChequeTercero[]>([])
  const [devueltos, setDevueltos] = useState<Devuelto[]>([])
  const [estado, setEstado] = useState<string>("borrador")
  const [tab, setTab] = useState<"cheques" | "gastos" | "devueltos" | "obs">("cheques")
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [accion, setAccion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/cajas").then(r => r.json()),
      fetch("/api/cuentas-bancarias").then(r => r.json()),
    ]).then(([c, cb]) => {
      if (Array.isArray(c)) setCajas(c)
      if (Array.isArray(cb)) setCuentas(cb)
    }).catch(console.error)
  }, [])

  // Cargar cheques en cartera de la caja seleccionada (filtro server-side
  // por caja_id para no romper con cajas homónimas en distintas sucursales).
  useEffect(() => {
    if (!form.caja_id) { setChequesEnCartera([]); return }
    fetch(`/api/cheques-terceros?estado=en_cartera&caja_id=${encodeURIComponent(form.caja_id)}`)
      .then(r => r.json())
      .then((d: ChequeTercero[]) => {
        if (Array.isArray(d)) setChequesEnCartera(d)
      })
      .catch(console.error)
  }, [form.caja_id])

  const recargar = async (id: string) => {
    const r = await fetch(`/api/negociaciones-cheques/${id}`)
    if (!r.ok) throw new Error(await r.text())
    const d = await r.json()
    setEstado(d.estado ?? "borrador")
    setForm({
      caja_id: d.caja_id ?? "",
      sucursal: d.sucursal ?? "",
      tipo_acreditacion: d.tipo_acreditacion ?? "neto",
      fecha: d.fecha ?? new Date().toISOString().split("T")[0],
      destino_tipo: d.destino_tipo ?? "banco",
      proveedor_nombre: d.proveedor_nombre ?? "",
      cuenta_bancaria_id: d.cuenta_bancaria_id ?? "",
      observaciones: d.observaciones ?? "",
      items: (d.items ?? []).map((i: any) => ({
        id: i.id, cheque_id: i.cheque_id, valor_nombre: i.valor_nombre ?? "",
        valor_id: i.valor_id ?? "", importe: Number(i.importe ?? 0),
      })),
      gastos: (d.gastos ?? []).map((g: any) => ({
        id: g.id, tipo: g.tipo ?? "Cuenta Contable", cuenta_contable: g.cuenta_contable ?? "",
        cuenta_analitica: g.cuenta_analitica ?? "", descripcion: g.descripcion ?? "",
        importe: Number(g.importe ?? 0), impuestos: Number(g.impuestos ?? 0),
        total: Number(g.total ?? 0), moneda: g.moneda ?? "ARS",
      })),
    })
    setDevueltos(d.devueltos ?? [])
  }

  useEffect(() => {
    if (!isEdit || !initialId) return
    recargar(initialId)
      .then(() => setCargando(false))
      .catch(() => { setErrorCarga("Negociación no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const esSoloLectura = isEdit && estado !== "borrador"

  const totalNeg = form.items.reduce((s, i) => s + i.importe, 0)
  const totalGas = form.gastos.reduce((s, g) => s + g.total, 0)
  const totalRecibido = totalNeg - totalGas

  const agregarCheque = (ch: ChequeTercero) => {
    if (form.items.find(i => i.cheque_id === ch.id)) return
    setForm(f => ({
      ...f,
      items: [...f.items, {
        cheque_id: ch.id,
        valor_nombre: `Cheque ${ch.numero_cheque} - ${ch.banco_nombre ?? "—"}`,
        valor_id: "",
        importe: ch.importe,
      }],
    }))
  }
  const quitarCheque = (chequeId: string) => setForm(f => ({ ...f, items: f.items.filter(i => i.cheque_id !== chequeId) }))

  const addGasto = () => setForm(f => ({
    ...f,
    gastos: [...f.gastos, { tipo: "Cuenta Contable", cuenta_contable: "", cuenta_analitica: "", descripcion: "", importe: 0, impuestos: 0, total: 0, moneda: "ARS" }],
  }))
  const updGasto = (idx: number, patch: Partial<Gasto>) => setForm(f => ({
    ...f,
    gastos: f.gastos.map((g, i) => {
      if (i !== idx) return g
      const next = { ...g, ...patch }
      next.total = next.importe + next.impuestos
      return next
    }),
  }))
  const delGasto = (idx: number) => setForm(f => ({ ...f, gastos: f.gastos.filter((_, i) => i !== idx) }))

  const guardar = async (): Promise<string | null> => {
    if (esSoloLectura) return null
    if (!form.caja_id) { setError("Seleccionar caja"); return null }
    if (!form.fecha) { setError("Fecha es requerida"); return null }
    if (guardando) return null
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/negociaciones-cheques/${initialId}` : "/api/negociaciones-cheques",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); return null }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/negociacion-cheques/${data.id}/editar`)
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

  const avanzar = async () => {
    if (!isEdit || !SIGUIENTE[estado] || accion) return
    setError(null)
    setAccion("Avanzando")
    try {
      const res = await fetch(`/api/negociaciones-cheques/${initialId}/avanzar`, { method: "POST" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      await recargar(initialId!)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAccion(null)
    }
  }

  const rechazarCheque = async (chequeId: string) => {
    if (!isEdit || accion) return
    const motivo = prompt("Motivo del rechazo:", "Rechazado por el banco")
    if (motivo == null) return
    setError(null)
    setAccion("Rechazando")
    try {
      const res = await fetch(`/api/negociaciones-cheques/${initialId}/rechazar-cheque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cheque_id: chequeId, motivo }),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); setAccion(null); return }
      const data = await res.json()
      setOkMsg(`Nota de Débito generada: ${data.nd_numero}`)
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
      <button onClick={() => router.push("/finanzas/negociacion-cheques")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  const labelSiguiente = SIGUIENTE[estado]

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? "Negociación de Cheques" : "Nueva Negociación"}</h1>
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
            <button onClick={() => guardar()} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
            </button>
          )}
          {isEdit && labelSiguiente && (
            <button onClick={avanzar} disabled={!!accion} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
              <ChevronRight className="w-4 h-4" /> {accion === "Avanzando" ? "Avanzando…" : labelSiguiente}
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
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caja *</label>
              <select value={form.caja_id} onChange={e => { set("caja_id", e.target.value); set("items", []) }}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Seleccionar…</option>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Acreditación</label>
              <select value={form.tipo_acreditacion} onChange={e => set("tipo_acreditacion", e.target.value as Form["tipo_acreditacion"])}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="neto">Neto (descuento gastos)</option>
                <option value="bruto">Bruto</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Destino</label>
              <select value={form.destino_tipo} onChange={e => set("destino_tipo", e.target.value as Form["destino_tipo"])}
                className="w-full border rounded px-3 py-2 text-sm">
                <option value="banco">Banco</option>
                <option value="proveedor">Proveedor</option>
              </select>
            </div>
            {form.destino_tipo === "banco" ? (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Bancaria</label>
                <select value={form.cuenta_bancaria_id} onChange={e => set("cuenta_bancaria_id", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">Seleccionar…</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco_nombre} — {c.numero_cuenta}</option>)}
                </select>
              </div>
            ) : (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                <input value={form.proveedor_nombre} onChange={e => set("proveedor_nombre", e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border">
          <div className="flex border-b">
            {([
              { id: "cheques", label: `Cheques (${form.items.length})` },
              { id: "gastos", label: `Gastos (${form.gastos.length})` },
              { id: "devueltos", label: `Devueltos (${devueltos.length})`, disabled: !isEdit },
              { id: "obs", label: "Observaciones" },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
                className={`px-4 py-2 text-sm border-b-2 disabled:opacity-50 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
                {t.label}
              </button>
            ))}
            <div className="ml-auto px-4 py-2 text-xs text-gray-500 flex items-center gap-4">
              <span>Neg: <span className="font-mono font-semibold">{formatCurrency(totalNeg, "ARS")}</span></span>
              <span>Gas: <span className="font-mono text-red-600">{formatCurrency(totalGas, "ARS")}</span></span>
              <span>Recib: <span className="font-mono text-green-700 font-semibold">{formatCurrency(totalRecibido, "ARS")}</span></span>
            </div>
          </div>

          <div className="p-4">
            {tab === "cheques" && !esSoloLectura && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Disponibles en cartera ({chequesEnCartera.length})</p>
                  {chequesEnCartera.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4">{form.caja_id ? "Sin cheques en cartera." : "Seleccioná una caja."}</p>
                  ) : (
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {chequesEnCartera.filter(ch => !form.items.find(i => i.cheque_id === ch.id)).map(ch => (
                        <div key={ch.id} className="flex items-center justify-between p-2 border-b text-xs hover:bg-gray-50">
                          <div>
                            <div className="font-medium">Cheque {ch.numero_cheque}</div>
                            <div className="text-gray-500">{ch.banco_nombre ?? "—"} · vence {ch.fecha_vencimiento}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{formatCurrency(ch.importe, ch.moneda)}</span>
                            <button type="button" onClick={() => agregarCheque(ch)} className="text-xs text-indigo-700 hover:text-indigo-900 font-medium">+ Agregar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">En la negociación ({form.items.length})</p>
                  {form.items.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4">Sin cheques.</p>
                  ) : (
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {form.items.map((i, idx) => (
                        <div key={i.cheque_id} className="flex items-center justify-between p-2 border-b text-xs">
                          <div>
                            <div className="font-medium">{i.valor_nombre}</div>
                            <div className="text-gray-500 font-mono">{formatCurrency(i.importe, "ARS")}</div>
                          </div>
                          <button type="button" onClick={() => quitarCheque(i.cheque_id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {tab === "cheques" && esSoloLectura && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cheques negociados</p>
                {form.items.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4">Sin cheques.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left py-2 px-3">Valor</th>
                          <th className="text-right px-3">Importe</th>
                          {estado !== "finalizada" && estado !== "cancelada" && <th className="px-3 w-32"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map(i => (
                          <tr key={i.cheque_id} className="border-t">
                            <td className="py-1 px-3">{i.valor_nombre}</td>
                            <td className="px-3 text-right font-mono">{formatCurrency(i.importe, "ARS")}</td>
                            {estado !== "finalizada" && estado !== "cancelada" && (
                              <td className="px-3">
                                <button type="button" onClick={() => rechazarCheque(i.cheque_id)} disabled={!!accion}
                                  className="text-xs text-red-700 hover:text-red-900 disabled:opacity-50 flex items-center gap-1">
                                  <Ban className="w-3 h-3" /> Rechazar (ND)
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === "gastos" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">Comisiones, gastos bancarios, impuestos.</p>
                  {!esSoloLectura && (
                    <button type="button" onClick={addGasto} className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Agregar gasto
                    </button>
                  )}
                </div>
                {form.gastos.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">Sin gastos.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left py-2 px-3">Descripción</th>
                          <th className="text-left px-3">Cta. Contable</th>
                          <th className="text-right px-3 w-28">Importe</th>
                          <th className="text-right px-3 w-28">Impuestos</th>
                          <th className="text-right px-3 w-28">Total</th>
                          <th className="px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.gastos.map((g, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="py-1 px-3"><input value={g.descripcion} onChange={e => updGasto(idx, { descripcion: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                            <td className="px-3"><input value={g.cuenta_contable} onChange={e => updGasto(idx, { cuenta_contable: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></td>
                            <td className="px-3"><input type="number" step="0.01" value={g.importe} onChange={e => updGasto(idx, { importe: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" /></td>
                            <td className="px-3"><input type="number" step="0.01" value={g.impuestos} onChange={e => updGasto(idx, { impuestos: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" /></td>
                            <td className="px-3 text-right font-mono text-sm">{g.total.toFixed(2)}</td>
                            <td className="px-2"><button type="button" onClick={() => delGasto(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tab === "devueltos" && (
              devueltos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No hay cheques devueltos.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-left py-2 px-3">Cheque ID</th>
                        <th className="text-left px-3">Motivo</th>
                        <th className="text-left px-3">Fecha</th>
                        <th className="text-left px-3">ND generada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devueltos.map(d => (
                        <tr key={d.id} className="border-t">
                          <td className="py-1 px-3 font-mono text-xs">{d.cheque_id}</td>
                          <td className="px-3">{d.motivo_rechazo}</td>
                          <td className="px-3 text-xs">{d.fecha_rechazo}</td>
                          <td className="px-3 font-mono text-xs">{d.nd_generada_id ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
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
