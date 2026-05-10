"use client"

// Extraído de components/ventas-module.tsx → renderDetalleListaPrecios (~13781-14091),
// modo edición/creación. Reproduce 1:1 el comportamiento de
// `crearNuevaListaPrecios` + `guardarListaPrecios` (líneas 12970-13072) y los campos
// del formulario (todos los inputs visibles cuando isEditing=true).
//
// Replica exacto el ajuste de estado: si la lista nueva está en "borrador", al guardar
// pasa a "creada" (como hacía guardarListaPrecios); en edición se guarda tal cual.
//
// Endpoint: POST /api/listas-precios (crear) / PATCH /api/listas-precios (editar).
// El payload va con los mismos campos que la versión original.

import { useEffect, useState } from "react"
import { Save, X } from "lucide-react"
import type { ListaPrecios, MonedaItem, UsuarioVendedor } from "./_shared"

interface ListaPreciosFormularioProps {
  inicial: ListaPrecios | null  // null = crear, objeto = editar
  onGuardar?: (listaGuardada: ListaPrecios) => void
  onCancelar?: () => void
}

const LISTA_NUEVA: ListaPrecios = {
  id: 0,
  nombre: "",
  tipo: "Minorista",
  moneda_base: "ARS",
  incluye_iva: true,
  activa: true,
  no_visible: false,
  visible_en_ot: false,
  dias_validez: 30,
  estado: "borrador",
  tipo_cotizacion: "blue",
  usuarios_admin: [],
  usuarios_habilitados: [],
  observaciones_filtro: "",
  seguimiento: [],
}

export default function ListaPreciosFormulario({
  inicial,
  onGuardar,
  onCancelar,
}: ListaPreciosFormularioProps) {
  const creando = inicial === null
  const [form, setForm] = useState<ListaPrecios>(inicial ?? LISTA_NUEVA)
  const [tab, setTab] = useState<"versiones" | "filtros" | "usuarios_admin" | "usuarios_habilitados">("filtros")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [monedas, setMonedas] = useState<MonedaItem[]>([])
  const [vendedores, setVendedores] = useState<UsuarioVendedor[]>([])

  useEffect(() => {
    fetch("/api/monedas")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMonedas(data)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch("/api/vendedores")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setVendedores(data)
      })
      .catch(() => {})
  }, [])

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    setError(null)

    try {
      if (creando) {
        const nuevaLista: ListaPrecios = {
          ...form,
          id: 0,
          estado: form.estado === "borrador" ? "creada" : form.estado,
        }
        const res = await fetch("/api/listas-precios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nuevaLista.nombre,
            tipo: nuevaLista.tipo,
            moneda_base: nuevaLista.moneda_base,
            incluye_iva: nuevaLista.incluye_iva,
            activa: nuevaLista.activa,
            no_visible: nuevaLista.no_visible,
            visible_en_ot: nuevaLista.visible_en_ot ?? false,
            dias_validez: nuevaLista.dias_validez,
            estado: nuevaLista.estado,
            usuarios_admin: nuevaLista.usuarios_admin,
            usuarios_habilitados: nuevaLista.usuarios_habilitados,
            observaciones_filtro: nuevaLista.observaciones_filtro,
            tipo_cotizacion: nuevaLista.tipo_cotizacion,
          }),
        })
        const saved = await res.json()
        if (!res.ok || saved.error) {
          const msg = saved.error ?? "Error desconocido"
          console.error("[listas-precios] error al crear:", msg)
          setError(msg)
          alert("Error al guardar la lista: " + msg)
          return
        }
        const listaConId: ListaPrecios = { ...nuevaLista, ...saved }
        onGuardar?.(listaConId)
      } else {
        const res = await fetch("/api/listas-precios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.id,
            nombre: form.nombre,
            tipo: form.tipo,
            moneda_base: form.moneda_base,
            incluye_iva: form.incluye_iva,
            activa: form.activa,
            no_visible: form.no_visible,
            visible_en_ot: form.visible_en_ot ?? false,
            dias_validez: form.dias_validez,
            estado: form.estado,
            usuarios_admin: form.usuarios_admin,
            usuarios_habilitados: form.usuarios_habilitados,
            observaciones_filtro: form.observaciones_filtro,
            tipo_cotizacion: form.tipo_cotizacion,
          }),
        })
        const saved = await res.json()
        if (!res.ok || saved.error) {
          const msg = saved.error ?? "Error desconocido"
          console.error("[listas-precios] error al actualizar:", msg)
          setError(msg)
          alert("Error al guardar la lista: " + msg)
          return
        }
        const listaActualizada: ListaPrecios = { ...form, ...saved }
        onGuardar?.(listaActualizada)
      }
    } catch (e) {
      console.error("[listas-precios] error:", e)
      setError(String(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white border-b border-gray-200 py-3 px-4 -mx-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGuardar}
            disabled={!form.nombre.trim() || guardando}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded hover:bg-indigo-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {guardando ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={onCancelar}
            className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre de la lista"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Base</label>
            <select
              value={form.moneda_base}
              onChange={e => setForm({ ...form, moneda_base: e.target.value as "ARS" | "USD" | "EUR" })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {monedas.length > 0
                ? monedas.map(m => (
                    <option key={m.codigo} value={m.codigo}>
                      {m.codigo} - {m.nombre}
                    </option>
                  ))
                : ["ARS", "USD", "EUR"].map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días de Validez</label>
            <input
              type="number"
              value={form.dias_validez}
              onChange={e => setForm({ ...form, dias_validez: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              min="1"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-1"
              title="Cotización a aplicar al convertir USD↔ARS en los comprobantes que usen esta lista"
            >
              Tipo de Cotización
            </label>
            <select
              value={form.tipo_cotizacion ?? "blue"}
              onChange={e => setForm({ ...form, tipo_cotizacion: e.target.value as ListaPrecios["tipo_cotizacion"] })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="oficial">Oficial</option>
              <option value="blue">Blue</option>
              <option value="ccl">CCL</option>
              <option value="mep">MEP</option>
              <option value="divisa">Divisa</option>
              <option value="billete">Billete</option>
            </select>
          </div>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={e => setForm({ ...form, activa: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Activa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.no_visible}
                onChange={e => setForm({ ...form, no_visible: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">No visible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer" title="Si está tildado, esta lista aparece en el dropdown de la OT (Servicio Técnico) para valuar repuestos.">
              <input
                type="checkbox"
                checked={form.visible_en_ot ?? false}
                onChange={e => setForm({ ...form, visible_en_ot: e.target.checked })}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Visible en OT</span>
            </label>
          </div>
        </div>

        {/* Tabs (sin "versiones" en modo crear, ya que no hay id) */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex gap-4">
            {[
              { id: "filtros" as const, label: "Filtros" },
              { id: "usuarios_admin" as const, label: "Usuarios Admin" },
              { id: "usuarios_habilitados" as const, label: "Usuarios Habilitados" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {tab === "filtros" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones / Filtros</label>
            <textarea
              value={form.observaciones_filtro}
              onChange={e => setForm({ ...form, observaciones_filtro: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              rows={4}
              placeholder="Observaciones o criterios de filtro para esta lista..."
            />
          </div>
        )}

        {tab === "usuarios_admin" && (
          <div>
            <p className="text-sm text-gray-600 mb-4">Usuarios con permisos de administración de esta lista.</p>
            <div className="space-y-2">
              {vendedores.map(u => (
                <label key={u.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.usuarios_admin.includes(u.id)}
                    onChange={e =>
                      setForm({
                        ...form,
                        usuarios_admin: e.target.checked
                          ? [...form.usuarios_admin, u.id]
                          : form.usuarios_admin.filter(id => id !== u.id),
                      })
                    }
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">{u.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tab === "usuarios_habilitados" && (
          <div>
            <p className="text-sm text-gray-600 mb-4">Usuarios habilitados para usar esta lista en presupuestos/ventas.</p>
            <div className="space-y-2">
              {vendedores.map(u => (
                <label key={u.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.usuarios_habilitados.includes(u.id)}
                    onChange={e =>
                      setForm({
                        ...form,
                        usuarios_habilitados: e.target.checked
                          ? [...form.usuarios_habilitados, u.id]
                          : form.usuarios_habilitados.filter(id => id !== u.id),
                      })
                    }
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">{u.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
