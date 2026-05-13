"use client"

// Tabs avanzados de la ficha de Caja: Valores Permitidos, Bancos Permitidos,
// Usuarios. Portados desde el monolito modulo-finanzas.tsx para sacarlos de
// ahí — la lógica sigue siendo client-side con supabase (igual que el
// monolito). Server-side migration es trabajo futuro.

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertCircle, Edit, Plus, Trash2, UserPlus, X } from "lucide-react"
import { useMonedas } from "./_shared"
import SearchableSelect from "@/components/ui/searchable-select"

export interface CajaValor {
  id: string
  caja_id: string
  codigo: string
  nombre: string
  tipo: "efectivo" | "banco_cheques"
  subtipo?: string | null
  moneda: string
  activo: boolean
  cuenta_contable_id?: string | null
  cuenta_haber_id?: string | null
  banco_permitido_id?: string | null
}

export interface CajaUsuario {
  id: string
  caja_id: string
  usuario_id: string
  usuario_nombre: string
  es_cobrador: boolean
  es_vendedor: boolean
  para_transferencias: boolean
}

export interface CajaBancoPermitido {
  id: string
  caja_id: string
  banco_nombre: string
  codigo: string
  tipo: string
  moneda: string
}

const SUBTIPO_LABELS_VALOR: Record<string, string> = {
  banco: "Banco",
  cheque_tercero: "Cheque Tercero",
  tarjeta: "Tarjeta",
  rendicion_gastos: "Rendición de Gastos",
  fondo_fijo: "Fondo Fijo",
}

// ─── SelectorCuenta (autocomplete de cuentas contables) ─────────────────────
function SelectorCuenta({ value, onChange, placeholder = "Buscar cuenta..." }: {
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState("")
  const [opciones, setOpciones] = useState<{ id: string; codigo: string; nombre: string }[]>([])
  const [abierto, setAbierto] = useState(false)
  const [sel, setSel] = useState<{ id: string; codigo: string; nombre: string } | null>(null)

  useEffect(() => {
    if (!value) { setSel(null); return }
    fetch(`/api/contabilidad/cuentas?id=${value}`)
      .then(r => r.json())
      .then(d => { if (d?.data) setSel(d.data) })
      .catch(() => {})
  }, [value])

  useEffect(() => {
    if (!abierto) { setOpciones([]); return }
    const t = setTimeout(() => {
      fetch(`/api/contabilidad/cuentas?q=${encodeURIComponent(query.trim())}&limit=20`)
        .then(r => r.json())
        .then(d => setOpciones(Array.isArray(d?.data) ? d.data : []))
        .catch(() => {})
    }, query.length > 0 ? 300 : 0)
    return () => clearTimeout(t)
  }, [query, abierto])

  return (
    <div className="relative">
      <div className="w-full px-3 py-2 border border-gray-300 rounded focus-within:ring-1 focus-within:ring-indigo-500 bg-white cursor-pointer flex items-center justify-between"
        onClick={() => setAbierto(v => !v)}>
        <span className={sel ? "text-gray-900 font-mono text-sm" : "text-gray-400 text-sm"}>
          {sel ? `${sel.codigo} — ${sel.nombre}` : placeholder}
        </span>
        {sel && (
          <button type="button" className="text-gray-400 hover:text-red-500 ml-2"
            onClick={e => { e.stopPropagation(); setSel(null); onChange("") }}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {abierto && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded shadow-lg">
          <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Código o nombre..."
            className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none" />
          <div className="max-h-48 overflow-y-auto">
            {opciones.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>}
            {opciones.map(op => (
              <div key={op.id}
                className="px-3 py-2 text-sm hover:bg-indigo-50 cursor-pointer flex items-center gap-2"
                onClick={() => { setSel(op); onChange(op.id); setAbierto(false); setQuery("") }}>
                <span className="font-mono text-xs text-gray-500 w-20 shrink-0">{op.codigo}</span>
                <span className="text-gray-800">{op.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CuentaDisplay({ id }: { id: string }) {
  const [cuenta, setCuenta] = useState<{ codigo: string; nombre: string } | null>(null)
  useEffect(() => {
    fetch(`/api/contabilidad/cuentas?id=${id}`)
      .then(r => r.json())
      .then(d => setCuenta(d?.data ?? null))
      .catch(() => {})
  }, [id])
  if (!cuenta) return <p className="text-gray-400 text-sm">Cargando...</p>
  return (
    <p className="font-mono text-sm text-gray-900">
      <span className="font-bold">{cuenta.codigo}</span>
      <span className="text-gray-500 ml-2">– {cuenta.nombre}</span>
    </p>
  )
}

// ─── Modal de detalle / edición de un caja_valor ────────────────────────────
function ModalDetalleValor({ valor, cajaId, onClose, onActualizar }: {
  valor: CajaValor
  cajaId?: string
  onClose: () => void
  onActualizar: () => void
}) {
  const esNuevo = valor.id === ""
  const [modoEdicion, setModoEdicion] = useState(esNuevo)
  const [form, setForm] = useState<CajaValor>({ ...valor })
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState("")

  type ValorUsuario = { id: string; usuario_id: number; nombre: string; usuario?: { id: number; nombre: string; email: string } | null }
  type UsuarioPick = { id: number; nombre: string; email: string; is_superuser: boolean; is_active: boolean }
  const [valorUsuarios, setValorUsuarios] = useState<ValorUsuario[]>([])
  const [todosUsuariosVal, setTodosUsuariosVal] = useState<UsuarioPick[]>([])
  const [usuarioAAgregarVal, setUsuarioAAgregarVal] = useState<string | number | null>(null)
  const [agregandoVal, setAgregandoVal] = useState(false)
  const [errorUsuariosVal, setErrorUsuariosVal] = useState<string | null>(null)

  // Monedas desde contabilidad_monedas (hook compartido).
  const monedas = useMonedas()

  useEffect(() => {
    if (esNuevo || !valor.id) return
    Promise.all([
      fetch(`/api/caja-valores/usuarios?caja_valor_id=${valor.id}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/usuarios`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([asignados, todos]) => {
      setValorUsuarios(Array.isArray(asignados) ? asignados : [])
      setTodosUsuariosVal(Array.isArray(todos) ? todos.filter((u: any) => u.is_active !== false) : [])
    })
  }, [esNuevo, valor.id])

  const recargarValorUsuarios = async () => {
    if (!valor.id) return
    const r = await fetch(`/api/caja-valores/usuarios?caja_valor_id=${valor.id}`).then(r => r.ok ? r.json() : []).catch(() => [])
    setValorUsuarios(Array.isArray(r) ? r : [])
  }

  const agregarUsuarioAlValor = async () => {
    if (!valor.id || !usuarioAAgregarVal) return
    setErrorUsuariosVal(null)
    setAgregandoVal(true)
    try {
      const r = await fetch("/api/caja-valores/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caja_valor_id: valor.id, usuario_id: Number(usuarioAAgregarVal) }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        if (r.status === 409) setErrorUsuariosVal("El usuario ya está asignado a este valor.")
        else if (r.status === 403) setErrorUsuariosVal("Solo administradores pueden modificar asignaciones.")
        else setErrorUsuariosVal(e?.error ?? `Error ${r.status}`)
        return
      }
      setUsuarioAAgregarVal(null)
      await recargarValorUsuarios()
    } finally {
      setAgregandoVal(false)
    }
  }

  const quitarUsuarioDelValor = async (asignacionId: string) => {
    if (!confirm("¿Quitar este usuario del valor? Dejará de poder operarlo.")) return
    setErrorUsuariosVal(null)
    const r = await fetch(`/api/caja-valores/usuarios?id=${asignacionId}`, { method: "DELETE" })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      setErrorUsuariosVal(e?.error ?? `Error ${r.status}`)
      return
    }
    await recargarValorUsuarios()
  }

  const guardar = async () => {
    if (!form.codigo?.trim() || !form.nombre?.trim()) { setErrorGuardar("Código y nombre son obligatorios"); return }
    if (form.tipo === "banco_cheques" && !form.subtipo) { setErrorGuardar("El subtipo es obligatorio para Banco y cheques"); return }
    setErrorGuardar("")
    setGuardando(true)
    const supabase = createClient()
    if (esNuevo) {
      const { count } = await supabase
        .from("caja_valores")
        .select("*", { count: "exact", head: true })
        .eq("codigo", form.codigo)
      if (count && count > 0) { setErrorGuardar("El código ya existe"); setGuardando(false); return }
      await supabase.from("caja_valores").insert({
        caja_id: cajaId,
        nombre: form.nombre,
        codigo: form.codigo,
        tipo: form.tipo,
        subtipo: form.tipo === "banco_cheques" ? (form.subtipo || null) : null,
        moneda: form.moneda,
        activo: form.activo,
        cuenta_contable_id: form.cuenta_contable_id || null,
        cuenta_haber_id: form.cuenta_haber_id || null,
      })
    } else {
      await supabase.from("caja_valores").update({
        nombre: form.nombre,
        codigo: form.codigo,
        tipo: form.tipo,
        subtipo: form.tipo === "banco_cheques" ? (form.subtipo || null) : null,
        moneda: form.moneda,
        activo: form.activo,
        cuenta_contable_id: form.cuenta_contable_id || null,
        cuenta_haber_id: form.cuenta_haber_id || null,
      }).eq("id", form.id)
    }
    setGuardando(false)
    setModoEdicion(false)
    onActualizar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-2.5 border-b bg-gray-50 flex-shrink-0">
          {modoEdicion ? (
            <>
              <button onClick={guardar} disabled={guardando}
                className="flex items-center gap-1.5 bg-indigo-900 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => { if (esNuevo) { onClose() } else { setForm({ ...valor }); setModoEdicion(false); setErrorGuardar("") } }}
                className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100">
                Descartar
              </button>
              {errorGuardar && <span className="text-xs text-red-600 ml-2">{errorGuardar}</span>}
            </>
          ) : (
            <button onClick={() => setModoEdicion(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
              <Edit className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          <button onClick={onClose} className="ml-auto p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b flex-shrink-0">
          {modoEdicion ? (
            <input value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del valor..."
              className="text-2xl font-bold text-gray-900 border-b-2 border-indigo-500 outline-none w-full bg-transparent pb-0.5" />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">{valor.nombre || "Nuevo Valor"}</h2>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 mb-1">Código</p>
                {modoEdicion ? (
                  <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                ) : (
                  <p className="font-mono font-semibold text-gray-900">{valor.codigo}</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                {modoEdicion ? (
                  <select value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value as CajaValor["tipo"], subtipo: undefined }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                    <option value="efectivo">Efectivo</option>
                    <option value="banco_cheques">Banco y cheques</option>
                  </select>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${valor.tipo === "efectivo" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {valor.tipo === "efectivo" ? "Efectivo" : "Banco / Cheques"}
                  </span>
                )}
              </div>

              {(modoEdicion ? form.tipo === "banco_cheques" : !!valor.subtipo) && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Subtipo</p>
                  {modoEdicion ? (
                    <select value={form.subtipo || ""}
                      onChange={e => setForm(f => ({ ...f, subtipo: e.target.value || null }))}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                      <option value="">Sin subtipo</option>
                      <option value="banco">Banco</option>
                      <option value="cheque_tercero">Cheque Tercero</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="rendicion_gastos">Rendición de Gastos</option>
                      <option value="fondo_fijo">Fondo Fijo</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{valor.subtipo ? (SUBTIPO_LABELS_VALOR[valor.subtipo] || valor.subtipo) : "—"}</p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Activo</p>
                {modoEdicion ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.activo}
                      onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="rounded" />
                    <span className="text-sm">{form.activo ? "Activo" : "Inactivo"}</span>
                  </label>
                ) : (
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${valor.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {valor.activo ? "Activo" : "Inactivo"}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cuenta de débito predeterminada</p>
                {modoEdicion ? (
                  <SelectorCuenta value={form.cuenta_contable_id || ""}
                    onChange={id => setForm(f => ({ ...f, cuenta_contable_id: id || null }))}
                    placeholder="Buscar cuenta de débito..." />
                ) : (
                  valor.cuenta_contable_id ? <CuentaDisplay id={valor.cuenta_contable_id} /> : <p className="text-gray-400 text-sm">—</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Cuenta de haber predeterminada</p>
                {modoEdicion ? (
                  <SelectorCuenta value={form.cuenta_haber_id || ""}
                    onChange={id => setForm(f => ({ ...f, cuenta_haber_id: id || null }))}
                    placeholder="Buscar cuenta de haber..." />
                ) : (
                  valor.cuenta_haber_id ? <CuentaDisplay id={valor.cuenta_haber_id} /> : <p className="text-gray-400 text-sm">—</p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Moneda</p>
                {modoEdicion ? (
                  <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none">
                    {monedas.length === 0 ? (
                      <option value={form.moneda || "ARS"}>{form.moneda || "ARS"}</option>
                    ) : (
                      monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nombre}</option>)
                    )}
                  </select>
                ) : (
                  <p className="font-mono text-gray-900">{valor.moneda}</p>
                )}
              </div>
            </div>
          </div>

          {!esNuevo && valor.id && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-700" /> Usuarios autorizados
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Solo los usuarios listados acá pueden ver este valor. Para que la caja entera sea visible
                a un usuario, debe estar autorizado en al menos un valor.
              </p>

              {errorUsuariosVal && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {errorUsuariosVal}
                </div>
              )}

              <div className="bg-gray-50 rounded p-3 border border-gray-200 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={usuarioAAgregarVal}
                      onChange={v => setUsuarioAAgregarVal(v == null ? null : Number(v))}
                      options={todosUsuariosVal
                        .filter(u => !valorUsuarios.some(a => a.usuario_id === u.id))
                        .map(u => ({
                          value: u.id,
                          label: u.nombre + (u.is_superuser ? " (admin)" : ""),
                          hint: u.email,
                          searchExtra: u.email,
                        }))}
                      placeholder={
                        todosUsuariosVal.length === 0 ? "Cargando usuarios…"
                          : todosUsuariosVal.length === valorUsuarios.length ? "Todos los usuarios ya están asignados"
                          : "Elegir usuario…"
                      }
                    />
                  </div>
                  <button type="button" onClick={agregarUsuarioAlValor}
                    disabled={!usuarioAAgregarVal || agregandoVal}
                    className="bg-indigo-900 hover:bg-indigo-800 text-white px-3 py-2 rounded text-sm flex items-center gap-1 disabled:opacity-50">
                    <UserPlus className="w-4 h-4" />
                    {agregandoVal ? "Agregando…" : "Agregar"}
                  </button>
                </div>
              </div>

              {valorUsuarios.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Sin usuarios autorizados todavía. Solo administradores pueden ver este valor.</p>
              ) : (
                <table className="w-full text-sm border rounded overflow-hidden">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">Nombre</th>
                      <th className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 text-left">Email</th>
                      <th className="text-xs font-semibold text-gray-600 uppercase px-3 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {valorUsuarios.map(u => (
                      <tr key={u.id} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium">{u.usuario?.nombre ?? u.nombre}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{u.usuario?.email ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => quitarUsuarioDelValor(u.id)}
                            className="text-red-500 hover:text-red-700" title="Quitar autorización">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Valores Permitidos ────────────────────────────────────────────────
export function TabValores({ cajaId, valores, onActualizar, modoEdicion }: {
  cajaId: string
  valores: CajaValor[]
  onActualizar: () => void
  modoEdicion: boolean
}) {
  const [valorModal, setValorModal] = useState<CajaValor | null>(null)

  const desactivar = async (id: string) => {
    const supabase = createClient()
    await supabase.from("caja_valores").update({ activo: false }).eq("id", id)
    onActualizar()
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="text-left py-2 px-3">Código</th>
            <th className="text-left py-2 px-3">Nombre</th>
            <th className="text-left py-2 px-3">Tipo</th>
            <th className="text-left py-2 px-3">Moneda</th>
            <th className="text-center py-2 px-3">Activo</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {valores.map(v => {
            const esAutoBanco = !!v.banco_permitido_id
            return (
              <tr key={v.id}
                className={`border-b border-gray-100 ${esAutoBanco ? "bg-blue-50/30" : "hover:bg-indigo-50 cursor-pointer"}`}
                onClick={esAutoBanco ? undefined : () => setValorModal(v)}
                title={esAutoBanco ? "Valor auto-generado desde Bancos Permitidos. Editá desde ese tab." : undefined}>
                <td className="py-2 px-3 font-mono">{v.codigo}</td>
                <td className="py-2 px-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    {v.nombre}
                    {esAutoBanco && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium uppercase">Auto</span>
                    )}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-0.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.tipo === "efectivo" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {v.tipo === "efectivo" ? "Efectivo" : "Banco/Cheques"}
                    </span>
                    {v.subtipo && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 w-fit">
                        {SUBTIPO_LABELS_VALOR[v.subtipo] || v.subtipo}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 font-mono">{v.moneda}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {v.activo ? "Sí" : "No"}
                  </span>
                </td>
                <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                  {v.activo && modoEdicion && !esAutoBanco && (
                    <button onClick={() => desactivar(v.id)} className="p-1 text-gray-400 hover:text-red-600" title="Desactivar">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {valores.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Sin valores configurados</p>}
      {modoEdicion && (
        <button onClick={() => setValorModal({ id: "", caja_id: cajaId, nombre: "", codigo: "", tipo: "efectivo", moneda: "ARS", activo: true, subtipo: null })}
          className="mt-3 flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900">
          <Plus className="w-4 h-4" /> Agregar valor
        </button>
      )}

      {valorModal && (
        <ModalDetalleValor
          valor={valorModal}
          cajaId={cajaId}
          onClose={() => setValorModal(null)}
          onActualizar={() => { setValorModal(null); onActualizar() }}
        />
      )}
    </div>
  )
}

// ─── Tab: Bancos Permitidos ─────────────────────────────────────────────────
export function TabBancosPermitidos({ cajaId, bancos, onActualizar, modoEdicion }: {
  cajaId: string
  bancos: CajaBancoPermitido[]
  onActualizar: () => void
  modoEdicion: boolean
}) {
  type DiarioBanco = { id: string; codigo: string; nombre: string; moneda: string }

  const [agregando, setAgregando] = useState(false)
  const [diariosDisponibles, setDiariosDisponibles] = useState<DiarioBanco[]>([])
  const [cargandoValores, setCargandoValores] = useState(false)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  useEffect(() => {
    if (!agregando) return
    setCargandoValores(true)
    const supabase = createClient()
    supabase
      .from("contabilidad_diarios")
      .select("id, codigo, nombre, moneda, tipo, activo")
      .eq("tipo", "banco_cheques")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => {
        const codigosYa = new Set(bancos.map(b => b.codigo))
        const filtrados = (data ?? [])
          .filter((d: any) => !codigosYa.has(d.codigo))
          .map((d: any) => ({ id: d.id, codigo: d.codigo, nombre: d.nombre, moneda: d.moneda }))
        setDiariosDisponibles(filtrados)
        setCargandoValores(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agregando])

  const agregar = async (d: DiarioBanco) => {
    setGuardando(d.id)
    const supabase = createClient()
    await supabase.from("caja_bancos_permitidos").insert({
      caja_id: cajaId,
      banco_nombre: d.nombre,
      codigo: d.codigo,
      tipo: "banco_cheques",
      moneda: d.moneda,
    })
    setGuardando(null)
    setAgregando(false)
    onActualizar()
  }

  const eliminar = async (id: string) => {
    setErrorEliminar(null)
    const supabase = createClient()
    const { error } = await supabase.from("caja_bancos_permitidos").delete().eq("id", id)
    if (error) {
      if (error.code === "23503") {
        setErrorEliminar("No se puede eliminar este banco: tiene movimientos registrados. Desactivá el valor desde el tab 'Valores Permitidos'.")
      } else {
        setErrorEliminar(error.message)
      }
      return
    }
    onActualizar()
  }

  return (
    <div>
      {errorEliminar && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{errorEliminar}</span>
          <button onClick={() => setErrorEliminar(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {agregando && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-indigo-900">Seleccionar diario bancario</p>
            <button onClick={() => setAgregando(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {cargandoValores ? (
            <p className="text-sm text-gray-500 py-2">Cargando...</p>
          ) : diariosDisponibles.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              No hay diarios bancarios disponibles para agregar. Creá una cuenta bancaria desde Finanzas → Bancos para que se genere su diario.
            </p>
          ) : (
            <div className="space-y-1">
              {diariosDisponibles.map(v => (
                <button key={v.id} disabled={guardando === v.id} onClick={() => agregar(v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded bg-white border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-colors disabled:opacity-50">
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-500">{v.codigo}</span>
                    <span className="text-sm font-medium text-gray-900">{v.nombre}</span>
                  </span>
                  <span className="font-mono text-xs text-gray-400">{v.moneda}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="text-left py-2 px-3">Código</th>
            <th className="text-left py-2 px-3">Nombre</th>
            <th className="text-left py-2 px-3">Moneda</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {bancos.map(b => (
            <tr key={b.id} className="border-b border-gray-100">
              <td className="py-2 px-3 font-mono">{b.codigo}</td>
              <td className="py-2 px-3 font-medium">{b.banco_nombre}</td>
              <td className="py-2 px-3 font-mono">{b.moneda}</td>
              <td className="py-2 px-3">
                {modoEdicion && (
                  <button onClick={() => eliminar(b.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bancos.length === 0 && !agregando && <p className="text-sm text-gray-500 text-center py-6">Sin bancos habilitados</p>}
      {!agregando && modoEdicion && (
        <button onClick={() => setAgregando(true)} className="mt-3 flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900">
          <Plus className="w-4 h-4" /> Agregar banco
        </button>
      )}
    </div>
  )
}

// ─── Tab: Usuarios ──────────────────────────────────────────────────────────
type UsuarioDB = { id: number; username: string; nombre: string; email: string; is_active: boolean }

export function TabUsuarios({ cajaId, usuarios, soloTransferencias, onActualizar, modoEdicion }: {
  cajaId: string
  usuarios: CajaUsuario[]
  soloTransferencias: boolean
  onActualizar: () => void
  modoEdicion: boolean
}) {
  const [usuariosDisp, setUsuariosDisp] = useState<UsuarioDB[]>([])
  const [usuarioSel, setUsuarioSel] = useState<string | number | null>(null)
  const [agregando, setAgregando] = useState(false)

  // Trae todos los usuarios del sistema para el picker
  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setUsuariosDisp(data.filter(u => u.is_active).map(u => ({
            id: u.id, username: u.username, nombre: u.nombre, email: u.email, is_active: u.is_active,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const filtrados = soloTransferencias
    ? usuarios.filter(u => u.para_transferencias)
    : usuarios

  // IDs/nombres ya asignados en la lista actual para evitar duplicados.
  const nombresAsignados = new Set(filtrados.map(u => (u.usuario_nombre || "").toLowerCase().trim()))

  const opciones = usuariosDisp
    .filter(u => {
      const nombre = (u.nombre || "").toLowerCase().trim()
      const username = (u.username || "").toLowerCase().trim()
      return !nombresAsignados.has(nombre) && !nombresAsignados.has(username)
    })
    .map(u => ({
      value: u.id,
      label: u.nombre || u.username,
      hint: u.email,
      searchExtra: u.username,
    }))

  const agregar = async (usuarioId: string | number) => {
    if (agregando) return
    const u = usuariosDisp.find(x => Number(x.id) === Number(usuarioId))
    if (!u) return
    setAgregando(true)
    const supabase = createClient()
    await supabase.from("caja_usuarios").insert({
      caja_id: cajaId,
      usuario_nombre: u.nombre || u.username,  // guardamos el nombre (legible). La matching de visibilidad acepta ambos.
      es_cobrador: false,
      es_vendedor: false,
      para_transferencias: soloTransferencias ? true : false,
    })
    setUsuarioSel(null)
    setAgregando(false)
    onActualizar()
  }

  const eliminar = async (id: string) => {
    const supabase = createClient()
    await supabase.from("caja_usuarios").delete().eq("id", id)
    onActualizar()
  }

  return (
    <div>
      {modoEdicion && (
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Agregar usuario</label>
            <SearchableSelect
              value={usuarioSel}
              onChange={v => { if (v != null) agregar(v) }}
              options={opciones}
              placeholder={opciones.length === 0 ? "Todos los usuarios ya están asignados" : "Buscar usuario por nombre o email…"}
              emptyText="Sin resultados"
              disabled={opciones.length === 0 || agregando}
              allowClear
            />
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="text-left py-2 px-3">Usuario</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map(u => (
            <tr key={u.id} className="border-b border-gray-100">
              <td className="py-2 px-3 font-medium">{u.usuario_nombre}</td>
              <td className="py-2 px-3 text-right">
                <button onClick={() => eliminar(u.id)} className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtrados.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Sin usuarios asignados</p>}
    </div>
  )
}
