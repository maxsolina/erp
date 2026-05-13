"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, CheckCircle, ArrowDownToLine, Ban, Plus, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useERP } from "@/contexts/erp-context"
import { useCajasPermitidasParaUsuario, useValoresIdsPermitidasParaUsuario } from "./_shared"

interface CajaDisp { id: string; nombre: string; sucursal: string }
interface CajaUsuarioTransfer { caja_id: string; usuario_nombre: string }
interface ValorCaja { id: string; caja_id: string; nombre: string; tipo: string; moneda: string; banco_permitido_id?: string | null }
interface ValorLinea { valor_id: string; valor_nombre: string; importe: number; moneda: string }

type Form = {
  caja_desde_id: string
  caja_hasta_id: string
  sucursal: string
  valores: ValorLinea[]
  concepto: string
  fecha: string
  observaciones: string
}

const empty = (): Form => ({
  caja_desde_id: "",
  caja_hasta_id: "",
  sucursal: "",
  valores: [],
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
  const { sucursales, currentUser } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [cajasRaw, setCajasRaw] = useState<CajaDisp[]>([])
  // `cajas` filtra por usuarios asignados (regla general de visibilidad).
  // Para los lookups de nombres seguimos usando `cajasRaw` (cualquier caja).
  const cajas = useCajasPermitidasParaUsuario(cajasRaw, currentUser)
  const [valores, setValores] = useState<ValorCaja[]>([])
  // caja_usuarios con para_transferencias=true: define qué cajas puede recibir
  // este usuario como destino de una transfer.
  const [cajasTransferUsuario, setCajasTransferUsuario] = useState<Set<string>>(new Set())
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
      if (Array.isArray(c)) setCajasRaw(c)
      if (Array.isArray(v)) setValores(v)
    }).catch(console.error)
  }, [])

  // Cargar las cajas donde el usuario actual tiene permiso de transfer (recepción).
  // Match por usuario_nombre = currentUser.username o currentUser.nombre (case-insensitive),
  // ya que la tabla `caja_usuarios` guarda el nombre como texto, no FK.
  useEffect(() => {
    if (!currentUser) return
    const supabase = createClient()
    supabase
      .from("caja_usuarios")
      .select("caja_id, usuario_nombre")
      .eq("para_transferencias", true)
      .then(({ data }) => {
        const target1 = (currentUser.username || "").toLowerCase().trim()
        const target2 = (currentUser.nombre || "").toLowerCase().trim()
        const set = new Set<string>()
        for (const r of (data ?? []) as CajaUsuarioTransfer[]) {
          const name = (r.usuario_nombre || "").toLowerCase().trim()
          if (name && (name === target1 || name === target2)) set.add(r.caja_id)
        }
        setCajasTransferUsuario(set)
      })
  }, [currentUser?.id, currentUser?.username, currentUser?.nombre])

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
          valores: (d.valores ?? []).map((v: any) => ({
            valor_id: v.valor_id ?? "",
            valor_nombre: v.valor_nombre ?? "",
            importe: Number(v.importe ?? 0),
            moneda: v.moneda ?? "ARS",
          })),
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
  // Cajas destino: distinta de origen + el usuario actual debe estar autorizado
  // (en caja_usuarios con para_transferencias=true). NO usa el filtro general
  // de visibilidad por Usuarios; el destino se rige solo por "Recibe Transferencias".
  const cajasDestino = useMemo(
    () => cajasRaw.filter(c => c.id !== form.caja_desde_id && cajasTransferUsuario.has(c.id)),
    [cajasRaw, form.caja_desde_id, cajasTransferUsuario],
  )
  // Solo valores físicos en efectivo: una transferencia entre cajas mueve
  // dinero físico. Tarjetas (tipo banco_cheques) y bancos permitidos no son
  // transferibles desde acá. Los cheques se sumarán cuando se implemente.
  const valoresPermitidos = useValoresIdsPermitidasParaUsuario(currentUser)
  const valoresOrigen = useMemo(
    () => valores.filter(v =>
      v.caja_id === form.caja_desde_id
      && !v.banco_permitido_id
      && v.tipo === "efectivo"
      && (valoresPermitidos?.has(v.id) ?? false)
    ),
    [valores, form.caja_desde_id, valoresPermitidos],
  )

  // ── Líneas multi-valor ──────────────────────────────────────────────────
  const addLinea = () => {
    if (valoresOrigen.length === 0) return
    const usados = new Set(form.valores.map(v => v.valor_id))
    const disponible = valoresOrigen.find(v => !usados.has(v.id)) ?? valoresOrigen[0]
    setForm(f => ({
      ...f,
      valores: [...f.valores, { valor_id: disponible.id, valor_nombre: disponible.nombre, importe: 0, moneda: disponible.moneda }],
    }))
  }
  const updLinea = (idx: number, patch: Partial<ValorLinea>) => {
    setForm(f => ({
      ...f,
      valores: f.valores.map((v, i) => {
        if (i !== idx) return v
        const next = { ...v, ...patch }
        if (patch.valor_id) {
          const found = valoresOrigen.find(x => x.id === patch.valor_id)
          if (found) { next.valor_nombre = found.nombre; next.moneda = found.moneda }
        }
        return next
      }),
    }))
  }
  const delLinea = (idx: number) => setForm(f => ({ ...f, valores: f.valores.filter((_, i) => i !== idx) }))

  // Total desdoblado por moneda: { ARS: 5000, USD: 20, ... }
  const totalesPorMoneda = useMemo(() => {
    const out: Record<string, number> = {}
    for (const v of form.valores) {
      const mon = v.moneda || "ARS"
      out[mon] = (out[mon] ?? 0) + Number(v.importe ?? 0)
    }
    return out
  }, [form.valores])
  const fmtMoneda = (m: string, n: number) => `${m === "ARS" ? "$" : `${m} `}${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

  const guardar = async (opts?: { silenciarRedirect?: boolean }): Promise<string | null> => {
    if (esSoloLectura) return null
    if (!form.caja_desde_id || !form.caja_hasta_id) { setError("Seleccionar caja origen y destino"); return null }
    if (form.caja_desde_id === form.caja_hasta_id) { setError("Origen y destino deben ser distintos"); return null }
    if (form.valores.length === 0) { setError("Agregar al menos un valor"); return null }
    if (form.valores.some(v => !v.valor_id || v.importe <= 0)) { setError("Todos los valores deben tener un valor seleccionado y un importe > 0"); return null }
    if (guardando) return null
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/transferencias-caja/${initialId}` : "/api/transferencias-caja",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); return null }
      const data = await res.json()
      const newId = data.id ?? initialId
      if (!isEdit && !opts?.silenciarRedirect) {
        router.push(`/finanzas/transferencias-caja/${newId}/editar`)
      } else if (isEdit) {
        setOkMsg("Guardado")
        setTimeout(() => setOkMsg(null), 2000)
      }
      return newId
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      return null
    } finally {
      setGuardando(false)
    }
  }

  // Confirmar = Guardar (si es nuevo) + Publicar. Reemplaza el botón "Publicar".
  const confirmar = async () => {
    if (estado !== "borrador" || accionPendiente) return
    let id = initialId
    if (!id) {
      const saved = await guardar({ silenciarRedirect: true })
      if (!saved) return
      id = saved
    }
    await accion(id, "publicar", "Confirmando")
  }

  const accion = async (id: string, path: string, label: string, redirectOnSuccess = true) => {
    if (accionPendiente) return
    setError(null)
    setAccionPendiente(label)
    try {
      const res = await fetch(`/api/transferencias-caja/${id}/${path}`, { method: "POST" })
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
            <>
              <button onClick={() => guardar()} disabled={guardando || !!accionPendiente} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button onClick={confirmar} disabled={guardando || !!accionPendiente} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {accionPendiente === "Confirmando" ? "Confirmando…" : "Confirmar"}
              </button>
            </>
          )}
          {isEdit && estado === "pendiente" && (
            <>
              <button onClick={() => initialId && accion(initialId, "recibir", "Recibiendo")} disabled={!!accionPendiente}
                className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
                <ArrowDownToLine className="w-4 h-4" /> {accionPendiente === "Recibiendo" ? "Recibiendo…" : "Recibir"}
              </button>
              <button onClick={() => initialId && accion(initialId, "cancelar", "Cancelando")} disabled={!!accionPendiente}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Caja Origen</p>
              <p className="text-sm font-medium text-gray-800">
                {cajasRaw.find(c => c.id === form.caja_desde_id)?.nombre ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Caja Destino</p>
              <p className="text-sm font-medium text-gray-800">
                {cajasRaw.find(c => c.id === form.caja_hasta_id)?.nombre ?? "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
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
              {form.caja_desde_id && cajasDestino.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No tenés cajas autorizadas como destino. Pedile al administrador que te agregue en la pestaña Usuarios para Transferencias de la caja que querés usar.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs — fuera del fieldset para poder navegar aunque esté en read-only */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {([
            { id: "valores", label: `Valores (${form.valores.length})` },
            { id: "obs", label: "Observaciones" },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
          <div className="ml-auto px-4 py-2 text-xs text-gray-500 flex items-center gap-4">
            {Object.keys(totalesPorMoneda).length === 0 ? (
              <span>Total: <span className="font-mono font-semibold text-amber-900">$0,00</span></span>
            ) : (
              Object.entries(totalesPorMoneda).map(([mon, tot]) => (
                <span key={mon}>Total {mon}: <span className="font-mono font-semibold text-amber-900">{fmtMoneda(mon, tot)}</span></span>
              ))
            )}
          </div>
        </div>
        <fieldset disabled={esSoloLectura} className="p-4">
          {tab === "valores" && (
            <>
              {!esSoloLectura && (
                <div className="flex items-center justify-end mb-3">
                  <button type="button" onClick={addLinea} disabled={!form.caja_desde_id || valoresOrigen.length === 0}
                    className="text-xs text-indigo-700 hover:text-indigo-900 disabled:opacity-50 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar valor
                  </button>
                </div>
              )}
              {form.valores.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">
                  {form.caja_desde_id ? "Sin valores. Hacé click en \"Agregar valor\"." : "Seleccioná caja origen primero."}
                </p>
              ) : (
                <div className="border rounded-lg overflow-visible">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-left py-2 px-3">Valor</th>
                        <th className="text-left px-3 w-24">Moneda</th>
                        <th className="text-right px-3 w-40">Importe</th>
                        <th className="px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.valores.map((v, idx) => {
                        // En read-only, el valor puede ser de cualquier caja (incluso destino)
                        const valorActual = valores.find(x => x.id === v.valor_id)
                        return (
                          <tr key={idx} className="border-t align-top">
                            <td className="py-1 px-3">
                              {esSoloLectura ? (
                                <span className="text-sm font-medium text-gray-800">{valorActual?.nombre ?? v.valor_nombre ?? "—"}</span>
                              ) : (
                                <select value={v.valor_id} onChange={e => updLinea(idx, { valor_id: e.target.value })}
                                  className="w-full border rounded px-2 py-1.5 text-sm">
                                  {valoresOrigen.map(x => <option key={x.id} value={x.id}>{x.nombre} ({x.moneda})</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-3 text-xs text-gray-600 font-mono py-2">
                              {v.moneda ?? valorActual?.moneda ?? "—"}
                            </td>
                            <td className="px-3 py-1 text-right">
                              {esSoloLectura ? (
                                <span className="font-mono font-semibold text-amber-900">
                                  ${Number(v.importe).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <input type="number" step="0.01" value={v.importe} onChange={e => updLinea(idx, { importe: Number(e.target.value) })}
                                  className="w-full border rounded px-2 py-1.5 text-sm text-right font-mono" />
                              )}
                            </td>
                            <td className="px-2">
                              {!esSoloLectura && (
                                <button type="button" onClick={() => delLinea(idx)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
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
