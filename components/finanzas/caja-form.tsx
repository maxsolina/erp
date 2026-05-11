"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X } from "lucide-react"
import { useERP } from "@/contexts/erp-context"
import { createClient } from "@/lib/supabase/client"
import { TabValores, TabBancosPermitidos, TabUsuarios, type CajaValor, type CajaUsuario, type CajaBancoPermitido } from "./caja-tabs"

type Form = {
  nombre: string
  codigo: string
  sucursal: string
  cierre_diario_obligatorio: boolean
  no_valida_cierre_sabados: boolean
  no_valida_cierre_domingos: boolean
  no_valida_cierre_feriados: boolean
  activo: boolean
}

const empty = (): Form => ({
  nombre: "",
  codigo: "",
  sucursal: "",
  cierre_diario_obligatorio: true,
  no_valida_cierre_sabados: false,
  no_valida_cierre_domingos: false,
  no_valida_cierre_feriados: false,
  activo: true,
})

export default function CajaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null
  const { sucursales } = useERP()

  const [form, setForm] = useState<Form>(empty())
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/cajas/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: Partial<Form>) => {
        setForm({
          nombre: d.nombre ?? "",
          codigo: d.codigo ?? "",
          sucursal: d.sucursal ?? "",
          cierre_diario_obligatorio: d.cierre_diario_obligatorio ?? true,
          no_valida_cierre_sabados: !!d.no_valida_cierre_sabados,
          no_valida_cierre_domingos: !!d.no_valida_cierre_domingos,
          no_valida_cierre_feriados: !!d.no_valida_cierre_feriados,
          activo: d.activo ?? true,
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Caja no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (!form.sucursal) return setError("La sucursal es obligatoria")
    if (form.codigo && !/^[A-Z0-9-]+$/i.test(form.codigo)) return setError("El código solo puede contener letras, números y guiones")
    if (guardando) return
    setError(null)
    setOkMsg(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/cajas/${initialId}` : "/api/cajas",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      const data = await res.json()
      if (!isEdit) {
        router.push(`/finanzas/cajas/${data.id}/editar`)
      } else {
        setOkMsg("Guardado")
        setTimeout(() => setOkMsg(null), 2000)
      }
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/cajas")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Configuración</p>
            <h1 className="text-2xl font-bold text-amber-900">{isEdit ? `Caja ${form.nombre}` : "Nueva Caja"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <X className="w-4 h-4" /> Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-sm bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg disabled:opacity-50 flex items-center gap-1">
            <Save className="w-4 h-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
      {okMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{okMsg}</div>}

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 border-b pb-2">Información básica</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => set("nombre", e.target.value)} autoFocus
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
              <input value={form.codigo} onChange={e => set("codigo", e.target.value)}
                placeholder="ej: CF, ADM, REC"
                className="w-full border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal *</label>
              <select value={form.sucursal} onChange={e => set("sucursal", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar…</option>
                {sucursales.filter(s => s.activa).map(s => <option key={s.id ?? s.nombre} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase">Cierre Diario</p>
            <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.cierre_diario_obligatorio} onChange={e => set("cierre_diario_obligatorio", e.target.checked)} className="rounded w-4 h-4" />
              <span className="text-sm">Cierre de caja diario obligatorio</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.no_valida_cierre_sabados} onChange={e => set("no_valida_cierre_sabados", e.target.checked)} className="rounded w-4 h-4" />
              <span className="text-sm">No valida cierre los Sábados</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.no_valida_cierre_domingos} onChange={e => set("no_valida_cierre_domingos", e.target.checked)} className="rounded w-4 h-4" />
              <span className="text-sm">No valida cierre los Domingos</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.no_valida_cierre_feriados} onChange={e => set("no_valida_cierre_feriados", e.target.checked)} className="rounded w-4 h-4" />
              <span className="text-sm">No valida cierre los Feriados</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="rounded w-4 h-4" />
              <span className="text-sm">Activa</span>
            </label>
          </div>
        </div>
      </div>

      {isEdit && initialId && <CajaSubTabs cajaId={initialId} />}
    </div>
  )
}

// ─── Sub-tabs (Valores / Bancos / Usuarios) ─────────────────────────────────
// Solo se renderizan en modo edición (cuando ya existe la caja).
function CajaSubTabs({ cajaId }: { cajaId: string }) {
  const [tab, setTab] = useState<"valores" | "bancos" | "usuarios">("valores")
  const [valores, setValores] = useState<CajaValor[]>([])
  const [bancos, setBancos] = useState<CajaBancoPermitido[]>([])
  const [usuarios, setUsuarios] = useState<CajaUsuario[]>([])
  const [cargando, setCargando] = useState(true)

  const recargar = async () => {
    setCargando(true)
    const supabase = createClient()
    const [v, b, u] = await Promise.all([
      supabase.from("caja_valores").select("*").eq("caja_id", cajaId).order("codigo"),
      supabase.from("caja_bancos_permitidos").select("*").eq("caja_id", cajaId).order("codigo"),
      supabase.from("caja_usuarios").select("*").eq("caja_id", cajaId).order("usuario_nombre"),
    ])
    setValores((v.data as CajaValor[]) ?? [])
    setBancos((b.data as CajaBancoPermitido[]) ?? [])
    setUsuarios((u.data as CajaUsuario[]) ?? [])
    setCargando(false)
  }

  useEffect(() => { recargar() }, [cajaId])

  return (
    <div className="mt-6 bg-white rounded-lg border">
      <div className="flex border-b">
        {([
          { id: "valores", label: `Valores (${valores.length})` },
          { id: "bancos", label: `Bancos Permitidos (${bancos.length})` },
          { id: "usuarios", label: `Usuarios (${usuarios.length})` },
        ] as const).map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm border-b-2 ${tab === t.id ? "border-indigo-700 text-indigo-700 font-medium" : "border-transparent text-gray-500"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {cargando ? (
          <p className="text-sm text-gray-400 text-center py-6">Cargando…</p>
        ) : tab === "valores" ? (
          <TabValores cajaId={cajaId} valores={valores} onActualizar={recargar} modoEdicion={true} />
        ) : tab === "bancos" ? (
          <TabBancosPermitidos cajaId={cajaId} bancos={bancos} onActualizar={recargar} modoEdicion={true} />
        ) : (
          <TabUsuarios cajaId={cajaId} usuarios={usuarios} soloTransferencias={false} onActualizar={recargar} modoEdicion={true} />
        )}
      </div>
    </div>
  )
}
