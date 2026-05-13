"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, Trash2, Edit } from "lucide-react"
import SearchableSelect from "@/components/ui/searchable-select"

interface CuentaContable { id: string; codigo: string; nombre: string }
// usuarios.id en DB es BIGINT (number). Manejamos number en todo el flujo.
interface UsuarioDisp { id: number; username: string; nombre: string; email: string }
interface UsuarioAsignado { usuario_id: number; username?: string; nombre?: string; email?: string }
interface CuentaPermitida { cuenta_codigo: string; cuenta_nombre?: string | null }

const VISIBILITY_FLAGS = [
  { key: "visible_en_ajuste_cajas", label: "Ajuste de Cajas" },
  { key: "visible_en_ajuste_banco", label: "Ajuste de Banco" },
  { key: "visible_en_caja", label: "Registros de Caja" },
  { key: "visible_en_banco", label: "Registros de Banco" },
] as const

type Form = {
  codigo: string
  nombre: string
  cuenta_contable_ingresos: string
  cuenta_contable_egresos: string
  visible_en_ajuste_cajas: boolean
  visible_en_ajuste_banco: boolean
  visible_en_caja: boolean
  visible_en_banco: boolean
  visible_en_transferencias: boolean
  visible_en_cancelaciones: boolean
  requiere_observacion: boolean
  activo: boolean
}

const empty: Form = {
  codigo: "",
  nombre: "",
  cuenta_contable_ingresos: "",
  cuenta_contable_egresos: "",
  visible_en_ajuste_cajas: false,
  visible_en_ajuste_banco: false,
  visible_en_caja: false,
  visible_en_banco: false,
  visible_en_transferencias: false,
  visible_en_cancelaciones: false,
  requiere_observacion: false,
  activo: true,
}

export default function ConceptoForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([])
  const [usuariosDisp, setUsuariosDisp] = useState<UsuarioDisp[]>([])
  const [usuariosAsignados, setUsuariosAsignados] = useState<UsuarioAsignado[]>([])
  const [cuentasPermitidas, setCuentasPermitidas] = useState<CuentaPermitida[]>([])
  const [tab, setTab] = useState<"usuarios" | "cuentas">("usuarios")
  const [usuarioNuevo, setUsuarioNuevo] = useState<string | null>(null)
  const [cuentaNueva, setCuentaNueva] = useState<string | null>(null)
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  // En edición arranca read-only; en nuevo arranca editable.
  const [modoEdicion, setModoEdicion] = useState(!isEdit)
  // Snapshot para revertir si el usuario cancela la edición.
  const [snapshot, setSnapshot] = useState<{
    form: Form
    usuarios: UsuarioAsignado[]
    cuentas: CuentaPermitida[]
  } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/contabilidad/plan-cuentas?activo=true").then(r => r.json()).catch(() => []),
      fetch("/api/usuarios").then(r => r.json()).catch(() => []),
    ]).then(([pc, us]) => {
      if (Array.isArray(pc)) setCuentasContables(pc.map((c: any) => ({ id: c.id, codigo: c.codigo, nombre: c.nombre })))
      if (Array.isArray(us)) setUsuariosDisp(us.map((u: any) => ({ id: u.id, username: u.username, nombre: u.nombre, email: u.email })))
    })
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/conceptos-registro-caja/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((data: any) => {
        setForm({
          ...empty,
          ...data,
          cuenta_contable_ingresos: data.cuenta_contable_ingresos ?? "",
          cuenta_contable_egresos: data.cuenta_contable_egresos ?? "",
        })
        setUsuariosAsignados((data.usuarios ?? []).map((u: any) => ({
          usuario_id: u.usuario_id, username: u.username, nombre: u.nombre, email: u.email,
        })))
        setCuentasPermitidas((data.cuentas_permitidas ?? []).map((c: any) => ({
          cuenta_codigo: c.cuenta_codigo, cuenta_nombre: c.cuenta_nombre,
        })))
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Concepto no encontrado"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value }))

  const guardar = async () => {
    if (!form.codigo.trim()) return setError("El código es obligatorio")
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const payload = {
        ...form,
        usuarios: usuariosAsignados.map(u => u.usuario_id),
        cuentas_permitidas: cuentasPermitidas,
      }
      const res = await fetch(
        isEdit ? `/api/conceptos-registro-caja/${initialId}` : "/api/conceptos-registro-caja",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) {
        const body = await res.text()
        setError(`Error: ${body}`)
        setGuardando(false)
        return
      }
      if (!isEdit) {
        // Nuevo: navegar al detalle del concepto recién creado (modo vista).
        const data = await res.json()
        if (data?.id) router.push(`/finanzas/conceptos/${data.id}/editar`)
      } else {
        setOkMsg("Guardado")
        setModoEdicion(false)
        setSnapshot(null)
        setTimeout(() => setOkMsg(null), 2000)
      }
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
    } finally {
      setGuardando(false)
    }
  }

  const entrarEdicion = () => {
    setSnapshot({ form, usuarios: usuariosAsignados, cuentas: cuentasPermitidas })
    setModoEdicion(true)
    setError(null)
  }

  const cancelarEdicion = () => {
    if (snapshot) {
      setForm(snapshot.form)
      setUsuariosAsignados(snapshot.usuarios)
      setCuentasPermitidas(snapshot.cuentas)
    }
    setSnapshot(null)
    setModoEdicion(false)
    setError(null)
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/conceptos")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  const cuentaOptions = cuentasContables.map(c => ({
    value: c.codigo,
    label: `${c.codigo} - ${c.nombre}`,
    searchExtra: c.nombre,
  }))

  // Usuarios todavía no asignados (para el picker)
  const usuariosAsignadosIds = new Set(usuariosAsignados.map(u => Number(u.usuario_id)))
  const usuariosOptions = usuariosDisp
    .filter(u => !usuariosAsignadosIds.has(Number(u.id)))
    .map(u => ({ value: u.id, label: u.nombre || u.username, hint: u.email, searchExtra: u.username }))

  // Cuentas todavía no permitidas (para el picker)
  const cuentasYaUsadas = new Set([
    ...cuentasPermitidas.map(c => c.cuenta_codigo),
    form.cuenta_contable_ingresos,
    form.cuenta_contable_egresos,
  ].filter(Boolean))
  const cuentasOptionsDisp = cuentasContables
    .filter(c => !cuentasYaUsadas.has(c.codigo))
    .map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nombre}`, searchExtra: c.nombre }))

  const addUsuario = (id: number) => {
    const u = usuariosDisp.find(x => Number(x.id) === Number(id))
    if (!u) return
    setUsuariosAsignados(prev => [...prev, { usuario_id: u.id, username: u.username, nombre: u.nombre, email: u.email }])
    setUsuarioNuevo(null)
  }
  const removeUsuario = (id: number) => setUsuariosAsignados(prev => prev.filter(u => Number(u.usuario_id) !== Number(id)))

  const addCuenta = (codigo: string) => {
    const c = cuentasContables.find(x => x.codigo === codigo)
    if (!c) return
    setCuentasPermitidas(prev => [...prev, { cuenta_codigo: c.codigo, cuenta_nombre: c.nombre }])
    setCuentaNueva(null)
  }
  const removeCuenta = (codigo: string) => setCuentasPermitidas(prev => prev.filter(c => c.cuenta_codigo !== codigo))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-amber-900">
            {isEdit ? (modoEdicion ? "Editar Concepto" : (form.nombre || "Concepto")) : "Nuevo Concepto"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {modoEdicion ? (
            <>
              <button onClick={isEdit ? cancelarEdicion : () => router.back()}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 flex items-center gap-1 text-white ${okMsg ? "bg-green-600" : "bg-indigo-900 hover:bg-indigo-800"}`}>
                <Save className="w-4 h-4" /> {guardando ? "Guardando…" : okMsg ? "Guardado ✓" : "Guardar"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.back()}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cerrar
              </button>
              <button onClick={entrarEdicion}
                className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg flex items-center gap-1">
                <Edit className="w-4 h-4" /> Editar
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {okMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>
      )}

      <fieldset disabled={!modoEdicion} className="space-y-4">
      <div className="bg-white rounded-lg border p-6 space-y-5 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Código *</label>
            <input value={form.codigo} onChange={e => set("codigo", e.target.value)} autoFocus
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ej: COM, DifCaja" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Contable de Ingresos</label>
            <SearchableSelect
              value={form.cuenta_contable_ingresos || null}
              onChange={v => set("cuenta_contable_ingresos", v == null ? "" : String(v))}
              options={cuentaOptions}
              placeholder="Elegir cuenta…"
              emptyText="Sin resultados"
              disabled={!modoEdicion}
              allowClear
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Contable de Egresos</label>
            <SearchableSelect
              value={form.cuenta_contable_egresos || null}
              onChange={v => set("cuenta_contable_egresos", v == null ? "" : String(v))}
              options={cuentaOptions}
              placeholder="Elegir cuenta…"
              emptyText="Sin resultados"
              disabled={!modoEdicion}
              allowClear
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Visible en</p>
          <div className="grid grid-cols-3 gap-3">
            {VISIBILITY_FLAGS.map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form[f.key]} onChange={e => set(f.key, e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-6 pt-2 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Activo</span>
          </label>
        </div>
      </div>

      {/* Tabs Usuarios / Cuentas Permitidas */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {([
            { id: "usuarios", label: `Usuarios (${usuariosAsignados.length})` },
            { id: "cuentas", label: `Cuentas Permitidas (${cuentasPermitidas.length})` },
          ] as const).map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "usuarios" && (
            <>
              {modoEdicion && (
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Agregar usuario</label>
                    <SearchableSelect
                      value={usuarioNuevo}
                      onChange={v => { if (v != null) addUsuario(Number(v)) }}
                      options={usuariosOptions}
                      placeholder={usuariosOptions.length === 0 ? "Todos los usuarios ya están asignados" : "Buscar usuario por nombre o email…"}
                      emptyText="Sin resultados"
                      disabled={usuariosOptions.length === 0}
                      allowClear
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mb-3">
                {usuariosAsignados.length === 0
                  ? "⚠ Sin usuarios asignados → nadie verá este concepto en los registros."
                  : `Solo estos ${usuariosAsignados.length} usuario(s) verán el concepto en los registros.`}
              </p>
              {usuariosAsignados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">Sin usuarios.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-left py-2 px-3">Usuario</th>
                        <th className="text-left px-3">Nombre</th>
                        <th className="text-left px-3">Email</th>
                        {modoEdicion && <th className="px-2 w-8"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosAsignados.map(u => (
                        <tr key={u.usuario_id} className="border-t">
                          <td className="py-1 px-3 font-mono text-xs">{u.username ?? "—"}</td>
                          <td className="px-3">{u.nombre ?? "—"}</td>
                          <td className="px-3 text-gray-500">{u.email ?? "—"}</td>
                          {modoEdicion && (
                            <td className="px-2">
                              <button type="button" onClick={() => removeUsuario(Number(u.usuario_id))} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "cuentas" && (
            <>
              {modoEdicion && (
                <div className="flex items-end gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Agregar cuenta contable</label>
                    <SearchableSelect
                      value={cuentaNueva}
                      onChange={v => v && addCuenta(String(v))}
                      options={cuentasOptionsDisp}
                      placeholder={cuentasOptionsDisp.length === 0 ? "Sin cuentas adicionales disponibles" : "Buscar por código o nombre…"}
                      emptyText="Sin resultados"
                      disabled={cuentasOptionsDisp.length === 0}
                      allowClear
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mb-3">
                Las cuentas listadas acá + las de la cabecera (Ingresos/Egresos) son las únicas habilitadas al cargar comprobantes con este concepto.
              </p>
              {cuentasPermitidas.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border border-dashed rounded">
                  Solo se permitirán las cuentas de Ingresos / Egresos de la cabecera.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="text-left py-2 px-3 w-32">Código</th>
                        <th className="text-left px-3">Nombre</th>
                        {modoEdicion && <th className="px-2 w-8"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {cuentasPermitidas.map(c => (
                        <tr key={c.cuenta_codigo} className="border-t">
                          <td className="py-1 px-3 font-mono text-xs">{c.cuenta_codigo}</td>
                          <td className="px-3">{c.cuenta_nombre ?? "—"}</td>
                          {modoEdicion && (
                            <td className="px-2">
                              <button type="button" onClick={() => removeCuenta(c.cuenta_codigo)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
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
      </fieldset>
    </div>
  )
}
