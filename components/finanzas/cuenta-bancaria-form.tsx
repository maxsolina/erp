"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Save, X, Info } from "lucide-react"
import { type Banco, useMonedas } from "./_shared"

type Form = {
  banco_id: string
  numero_cuenta: string
  cbu: string
  tipo_cuenta: "cuenta_corriente" | "caja_ahorro"
  moneda: string
  propietario: string
  direccion_propietario: string
  diario_nombre: string
  disponible_facturas_credito: boolean
  activo: boolean
}

const empty: Form = {
  banco_id: "",
  numero_cuenta: "",
  cbu: "",
  tipo_cuenta: "cuenta_corriente",
  moneda: "ARS",
  propietario: "",
  direccion_propietario: "",
  diario_nombre: "",
  disponible_facturas_credito: false,
  activo: true,
}

export default function CuentaBancariaForm({ initialId }: { initialId?: string }) {
  const router = useRouter()
  const isEdit = initialId != null

  const [form, setForm] = useState<Form>(empty)
  const [bancos, setBancos] = useState<Banco[]>([])
  const monedas = useMonedas()
  const [cargando, setCargando] = useState(isEdit)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/bancos")
      .then(r => r.json())
      .then((d: Banco[]) => { if (Array.isArray(d)) setBancos(d) })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEdit || !initialId) return
    fetch(`/api/cuentas-bancarias/${initialId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: any) => {
        setForm({
          banco_id: d.banco_id ?? "",
          numero_cuenta: d.numero_cuenta ?? "",
          cbu: d.cbu ?? "",
          tipo_cuenta: d.tipo_cuenta ?? "cuenta_corriente",
          moneda: d.moneda ?? "ARS",
          propietario: d.propietario ?? "",
          direccion_propietario: d.direccion_propietario ?? "",
          diario_nombre: d.diario_nombre ?? "",
          disponible_facturas_credito: !!d.disponible_facturas_credito,
          activo: d.activo ?? true,
        })
        setCargando(false)
      })
      .catch(() => { setErrorCarga("Cuenta bancaria no encontrada"); setCargando(false) })
  }, [isEdit, initialId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.numero_cuenta.trim()) return setError("El número de cuenta es obligatorio")
    if (guardando) return
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(
        isEdit ? `/api/cuentas-bancarias/${initialId}` : "/api/cuentas-bancarias",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
      )
      if (!res.ok) { setError(`Error: ${await res.text()}`); setGuardando(false); return }
      router.push("/finanzas/bancos-config")
    } catch (e: any) {
      setError(`Error de red: ${e?.message ?? e}`)
      setGuardando(false)
    }
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando…</div>
  if (errorCarga) return (
    <div className="p-12 text-center">
      <p className="text-red-600 mb-3">{errorCarga}</p>
      <button onClick={() => router.push("/finanzas/bancos-config")} className="text-indigo-700 hover:underline">Volver</button>
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-2xl font-bold text-amber-900">{isEdit ? `Cuenta ${form.numero_cuenta}` : "Nueva Cuenta Bancaria"}</h1>
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
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Información del Banco</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
              <select value={form.banco_id} onChange={e => set("banco_id", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar banco…</option>
                {bancos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">N° de Cuenta *</label>
              <input value={form.numero_cuenta} onChange={e => set("numero_cuenta", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CBU</label>
              <input value={form.cbu} onChange={e => set("cbu", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Cuenta</label>
              <select value={form.tipo_cuenta} onChange={e => set("tipo_cuenta", e.target.value as Form["tipo_cuenta"])}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="cuenta_corriente">Cuenta Corriente</option>
                <option value="caja_ahorro">Caja de Ahorro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
              <select value={form.moneda} onChange={e => set("moneda", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {monedas.length === 0
                  ? <option value={form.moneda || "ARS"}>{form.moneda || "ARS"}</option>
                  : monedas.map(m => <option key={m.codigo} value={m.codigo}>{m.codigo}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Propietario de la Cuenta</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Propietario</label>
              <input value={form.propietario} onChange={e => set("propietario", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <input value={form.direccion_propietario} onChange={e => set("direccion_propietario", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Información Contable</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Diario Contable</label>
              <input value={form.diario_nombre} onChange={e => set("diario_nombre", e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="ej: Banco Macro CC (ARS)" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2 cursor-pointer">
                <input type="checkbox" checked={form.disponible_facturas_credito} onChange={e => set("disponible_facturas_credito", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Disponible en Facturas de Crédito</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Activa</span>
          </label>
          {isEdit && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Info className="w-3 h-3" /> Las chequeras se administran en el módulo Finanzas
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
