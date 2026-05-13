"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, Trash2, Edit } from "lucide-react"
import SearchableSelect from "@/components/ui/searchable-select"
import { useMonedas } from "@/components/finanzas/_shared"
import { createClient } from "@/lib/supabase/client"

interface ValorCajaDetail {
  id: string
  caja_id: string
  codigo: string | null
  nombre: string
  tipo: string
  subtipo: string | null
  moneda: string
  banco_permitido_id: string | null
  cuenta_contable_id: string | null
  cuenta_haber_id: string | null
  activo: boolean
  cajas?: { nombre: string; sucursal: string | null } | null
}

interface UsuarioDB { id: number; username: string; nombre: string; email: string; is_active: boolean }
interface UsuarioAsignado { id: string; usuario_id: number; nombre: string; usuario?: { id: number; nombre: string; email: string } | null }
interface CuentaPlan { id: string; codigo: string; nombre: string }

type EditForm = {
  codigo: string
  nombre: string
  tipo: string
  moneda: string
  activo: boolean
  cuenta_contable_id: string | null
  cuenta_haber_id: string | null
}

export default function ValorCajaForm({ initialId }: { initialId: string }) {
  const router = useRouter()
  const monedas = useMonedas()
  const [valor, setValor] = useState<ValorCajaDetail | null>(null)
  const [tab, setTab] = useState<"info" | "usuarios">("info")
  const [modoEdicion, setModoEdicion] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  // Plan de cuentas para los selectores
  const [cuentas, setCuentas] = useState<CuentaPlan[]>([])

  // Usuarios asignados
  const [usuariosAsignados, setUsuariosAsignados] = useState<UsuarioAsignado[]>([])
  const [todosUsuarios, setTodosUsuarios] = useState<UsuarioDB[]>([])
  const [usuarioSel, setUsuarioSel] = useState<string | number | null>(null)
  const [agregando, setAgregando] = useState(false)

  const recargar = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("caja_valores")
      .select("id, caja_id, codigo, nombre, tipo, subtipo, moneda, banco_permitido_id, cuenta_contable_id, cuenta_haber_id, activo, cajas:caja_id(nombre, sucursal)")
      .eq("id", initialId)
      .maybeSingle()
    if (error || !data) { setErrorCarga("Valor no encontrado"); setCargando(false); return }
    const v = data as unknown as ValorCajaDetail
    setValor(v)
    setForm({
      codigo: v.codigo ?? "",
      nombre: v.nombre ?? "",
      tipo: v.tipo,
      moneda: v.moneda,
      activo: v.activo,
      cuenta_contable_id: v.cuenta_contable_id,
      cuenta_haber_id: v.cuenta_haber_id,
    })
    setCargando(false)
  }

  const recargarUsuarios = () => {
    fetch(`/api/caja-valores/usuarios?caja_valor_id=${initialId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => setUsuariosAsignados(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(() => {
    recargar()
    Promise.all([
      fetch("/api/contabilidad/plan-cuentas?activo=true").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/usuarios").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/caja-valores/usuarios?caja_valor_id=${initialId}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([pc, us, asignados]) => {
      if (Array.isArray(pc)) setCuentas(pc.map((c: any) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre })))
      if (Array.isArray(us)) setTodosUsuarios(us.filter((u: any) => u.is_active))
      if (Array.isArray(asignados)) setUsuariosAsignados(asignados)
    })
  }, [initialId])

  const guardar = async () => {
    if (!form || !valor) return
    if (!form.nombre.trim()) { setError("Nombre requerido"); return }
    if (!form.moneda) { setError("Moneda requerida"); return }
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const supabase = createClient()
      const { error: e1 } = await supabase
        .from("caja_valores")
        .update({
          codigo: form.codigo || null,
          nombre: form.nombre,
          tipo: form.tipo,
          subtipo: form.tipo === "banco_cheques" ? (valor.subtipo || null) : null,
          moneda: form.moneda,
          activo: form.activo,
          cuenta_contable_id: form.cuenta_contable_id || null,
          cuenta_haber_id: form.cuenta_haber_id || null,
        })
        .eq("id", valor.id)
      if (e1) { setError(`Error: ${e1.message}`); return }
      await recargar()
      setModoEdicion(false)
      setOkMsg("Guardado")
      setTimeout(() => setOkMsg(null), 2000)
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  const cancelar = () => {
    if (!valor) return
    setForm({
      codigo: valor.codigo ?? "",
      nombre: valor.nombre ?? "",
      tipo: valor.tipo,
      moneda: valor.moneda,
      activo: valor.activo,
      cuenta_contable_id: valor.cuenta_contable_id,
      cuenta_haber_id: valor.cuenta_haber_id,
    })
    setModoEdicion(false)
    setError(null)
  }

  const asignadosIds = new Set(usuariosAsignados.map(u => Number(u.usuario_id)))
  const opciones = todosUsuarios
    .filter(u => !asignadosIds.has(Number(u.id)))
    .map(u => ({ value: u.id, label: u.nombre || u.username, hint: u.email, searchExtra: u.username }))

  const cuentaOptions = cuentas.map(c => ({
    value: c.id,
    label: `${c.codigo} - ${c.nombre}`,
    searchExtra: c.nombre,
  }))

  const agregar = async (id: number) => {
    if (agregando) return
    setAgregando(true)
    setError(null)
    try {
      const res = await fetch(`/api/caja-valores/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caja_valor_id: initialId, usuario_id: id }),
      })
      if (!res.ok) { setError(`Error: ${await res.text()}`); return }
      setUsuarioSel(null)
      recargarUsuarios()
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setAgregando(false)
    }
  }

  const eliminar = async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/caja-valores/usuarios?id=${id}`, { method: "DELETE" })
      if (!res.ok) { setError(`Error: ${await res.text()}`); return }
      recargarUsuarios()
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    }
  }

  if (cargando || !form) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga || !valor) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga ?? "Valor no encontrado"}</p>
      <button onClick={() => router.push("/contabilidad/valores-caja")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Configuración</p>
            <h1 className="text-2xl font-bold text-amber-900">{form.nombre}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Caja: <span className="font-medium">{valor.cajas?.nombre ?? "—"}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {modoEdicion ? (
            <>
              <button onClick={cancelar} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 flex items-center gap-1 text-white ${okMsg ? "bg-green-600" : "bg-indigo-900 hover:bg-indigo-800"}`}>
                <Save className="w-4 h-4" /> {guardando ? "Guardando…" : okMsg ? "Guardado ✓" : "Guardar"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cerrar
              </button>
              <button onClick={() => setModoEdicion(true)} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-1">
                <Edit className="w-4 h-4" /> Editar
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
      {okMsg && !modoEdicion && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {([
            { id: "info", label: "Información" },
            { id: "usuarios", label: `Usuarios (${usuariosAsignados.length})` },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "info" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Código</label>
                {modoEdicion ? (
                  <input value={form.codigo} onChange={e => setForm(f => f ? ({ ...f, codigo: e.target.value }) : f)}
                    className="w-full border rounded px-3 py-2 text-sm font-mono" />
                ) : (
                  <p className="font-mono text-indigo-700">{valor.codigo ?? "—"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Nombre *</label>
                {modoEdicion ? (
                  <input value={form.nombre} onChange={e => setForm(f => f ? ({ ...f, nombre: e.target.value }) : f)}
                    className="w-full border rounded px-3 py-2 text-sm" />
                ) : (
                  <p className="font-medium">{valor.nombre}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Tipo</label>
                {modoEdicion ? (
                  <select value={form.tipo} onChange={e => setForm(f => f ? ({ ...f, tipo: e.target.value }) : f)}
                    className="w-full border rounded px-3 py-2 text-sm">
                    <option value="efectivo">Efectivo</option>
                    <option value="banco_cheques">Banco / Cheques</option>
                  </select>
                ) : (
                  <p>{valor.tipo === "banco_cheques" ? "Banco / Cheques" : "Efectivo"}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Moneda</label>
                {modoEdicion ? (
                  <select value={form.moneda} onChange={e => setForm(f => f ? ({ ...f, moneda: e.target.value }) : f)}
                    className="w-full border rounded px-3 py-2 text-sm">
                    {monedas.length === 0
                      ? <option value={form.moneda || "ARS"}>{form.moneda || "ARS"}</option>
                      : monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo}</option>)}
                  </select>
                ) : (
                  <p className="font-mono">{valor.moneda}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Caja</label>
                <p>{valor.cajas?.nombre ?? "—"}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Activo</label>
                {modoEdicion ? (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={form.activo} onChange={e => setForm(f => f ? ({ ...f, activo: e.target.checked }) : f)} className="rounded w-4 h-4" />
                    <span>{form.activo ? "Activo" : "Inactivo"}</span>
                  </label>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-block ${valor.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {valor.activo ? "Activo" : "Inactivo"}
                  </span>
                )}
              </div>
              <div className="col-span-2 pt-4 border-t mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cuentas Contables</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta de débito predeterminada</label>
                    {modoEdicion ? (
                      <SearchableSelect
                        value={form.cuenta_contable_id}
                        onChange={v => setForm(f => f ? ({ ...f, cuenta_contable_id: v == null ? null : String(v) }) : f)}
                        options={cuentaOptions}
                        placeholder="Elegir cuenta…"
                        emptyText="Sin resultados"
                        allowClear
                      />
                    ) : (
                      <p className="font-mono text-sm">
                        {valor.cuenta_contable_id ? (cuentas.find(c => c.id === valor.cuenta_contable_id) ? `${cuentas.find(c => c.id === valor.cuenta_contable_id)!.codigo} — ${cuentas.find(c => c.id === valor.cuenta_contable_id)!.nombre}` : valor.cuenta_contable_id) : "—"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta de haber predeterminada</label>
                    {modoEdicion ? (
                      <SearchableSelect
                        value={form.cuenta_haber_id}
                        onChange={v => setForm(f => f ? ({ ...f, cuenta_haber_id: v == null ? null : String(v) }) : f)}
                        options={cuentaOptions}
                        placeholder="Elegir cuenta…"
                        emptyText="Sin resultados"
                        allowClear
                      />
                    ) : (
                      <p className="font-mono text-sm">
                        {valor.cuenta_haber_id ? (cuentas.find(c => c.id === valor.cuenta_haber_id) ? `${cuentas.find(c => c.id === valor.cuenta_haber_id)!.codigo} — ${cuentas.find(c => c.id === valor.cuenta_haber_id)!.nombre}` : valor.cuenta_haber_id) : "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "usuarios" && (
            <>
              <div className="flex items-end gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agregar usuario</label>
                  <SearchableSelect
                    value={usuarioSel}
                    onChange={v => { if (v != null) agregar(Number(v)) }}
                    options={opciones}
                    placeholder={opciones.length === 0 ? "Todos los usuarios ya están asignados" : "Buscar usuario por nombre o email…"}
                    emptyText="Sin resultados"
                    disabled={opciones.length === 0 || agregando}
                    allowClear
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                {usuariosAsignados.length === 0
                  ? "⚠ Sin usuarios asignados → nadie verá este valor en los selectores de Registros / Ajustes / Transferencias."
                  : `Solo estos ${usuariosAsignados.length} usuario(s) verán este valor en los selectores.`}
              </p>

              {usuariosAsignados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">Sin usuarios asignados.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-left py-2 px-3">Usuario</th>
                        <th className="text-left px-3">Email</th>
                        <th className="px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosAsignados.map(u => (
                        <tr key={u.id} className="border-t">
                          <td className="py-1 px-3">{u.nombre ?? u.usuario?.nombre ?? `#${u.usuario_id}`}</td>
                          <td className="px-3 text-gray-500">{u.usuario?.email ?? "—"}</td>
                          <td className="px-2">
                            <button type="button" onClick={() => eliminar(u.id)} className="text-red-500 hover:text-red-700">
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
        </div>
      </div>
    </div>
  )
}
