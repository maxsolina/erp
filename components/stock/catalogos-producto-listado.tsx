"use client"

// Listado + ABM de los 3 catálogos de Producto:
//   • Categorías (categorias_producto)
//   • Marcas     (marcas_producto)
//   • Colores    (colores_producto)
//
// Cada tab tiene su propia tabla + botón "Nuevo X" + edit inline + soft delete.
// Pensado para que el operador pueda crear nuevas opciones que después aparecen
// en los dropdowns del form de Producto.

import { useEffect, useState } from "react"
import { Edit, Plus, Trash2, X } from "lucide-react"

interface Categoria { id: number; nombre: string; activa: boolean }
interface Marca { id: number; nombre: string; activa: boolean }
interface Color { id: number; nombre: string; hex?: string | null; activo: boolean }

type Tab = "categorias" | "marcas" | "colores"

export default function CatalogosProductoListado() {
  const [activeTab, setActiveTab] = useState<Tab>("categorias")

  return (
    <div>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-amber-900">Catálogos de Productos</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {([
            { id: "categorias" as const, label: "Categorías" },
            { id: "marcas" as const, label: "Marcas" },
            { id: "colores" as const, label: "Colores" },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === t.id
                  ? "border-indigo-700 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "categorias" && <CategoriasTab />}
          {activeTab === "marcas" && <MarcasTab />}
          {activeTab === "colores" && <ColoresTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Categorías ────────────────────────────────────────────────────────────

function CategoriasTab() {
  const [items, setItems] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [creating, setCreating] = useState(false)

  async function recargar() {
    setLoading(true)
    try {
      const r = await fetch("/api/categorias-producto")
      const d = await r.json()
      setItems(Array.isArray(d) ? d : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { recargar() }, [])

  async function eliminar(id: number) {
    if (!confirm("¿Desactivar esta categoría? Los productos existentes con esta categoría no se ven afectados.")) return
    try {
      const r = await fetch(`/api/categorias-producto/${id}`, { method: "DELETE" })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        alert(e?.error ?? "Error al desactivar")
        return
      }
      await recargar()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setCreating(true)}
          className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-800 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva Categoría
        </button>
      </div>

      <CatalogoTabla
        loading={loading}
        empty="No hay categorías"
        rows={items}
        cols={[
          { label: "Nombre", render: r => r.nombre },
          { label: "Estado", render: r => <EstadoBadge activo={r.activa} /> },
        ]}
        onEdit={r => setEditing(r)}
        onDelete={r => eliminar(r.id)}
      />

      {creating && (
        <ModalCatalogoSimple
          title="Nueva Categoría"
          submit={async values => {
            const r = await fetch("/api/categorias-producto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: values.nombre, activa: true }),
            })
            if (!r.ok) {
              const e = await r.json().catch(() => ({}))
              throw new Error(e?.error ?? "Error al crear")
            }
            setCreating(false)
            await recargar()
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {editing && (
        <ModalCatalogoSimple
          title={`Editar Categoría: ${editing.nombre}`}
          initial={{ nombre: editing.nombre, activa: editing.activa }}
          showActivo
          submit={async values => {
            const r = await fetch(`/api/categorias-producto/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: values.nombre, activa: values.activa }),
            })
            if (!r.ok) {
              const e = await r.json().catch(() => ({}))
              throw new Error(e?.error ?? "Error al guardar")
            }
            setEditing(null)
            await recargar()
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Marcas ────────────────────────────────────────────────────────────────

function MarcasTab() {
  const [items, setItems] = useState<Marca[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Marca | null>(null)
  const [creating, setCreating] = useState(false)

  async function recargar() {
    setLoading(true)
    try {
      const r = await fetch("/api/marcas-producto")
      const d = await r.json()
      setItems(Array.isArray(d) ? d : [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { recargar() }, [])

  async function eliminar(id: number) {
    if (!confirm("¿Desactivar esta marca?")) return
    const r = await fetch(`/api/marcas-producto/${id}`, { method: "DELETE" })
    if (!r.ok) { alert("Error al desactivar"); return }
    await recargar()
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setCreating(true)}
          className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-800 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva Marca
        </button>
      </div>

      <CatalogoTabla
        loading={loading}
        empty="No hay marcas"
        rows={items}
        cols={[
          { label: "Nombre", render: r => r.nombre },
          { label: "Estado", render: r => <EstadoBadge activo={r.activa} /> },
        ]}
        onEdit={r => setEditing(r)}
        onDelete={r => eliminar(r.id)}
      />

      {creating && (
        <ModalCatalogoSimple
          title="Nueva Marca"
          submit={async values => {
            const r = await fetch("/api/marcas-producto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: values.nombre, activa: true }),
            })
            if (!r.ok) {
              const e = await r.json().catch(() => ({}))
              throw new Error(e?.error ?? "Error al crear")
            }
            setCreating(false)
            await recargar()
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {editing && (
        <ModalCatalogoSimple
          title={`Editar Marca: ${editing.nombre}`}
          initial={{ nombre: editing.nombre, activa: editing.activa }}
          showActivo
          submit={async values => {
            const r = await fetch(`/api/marcas-producto/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: values.nombre, activa: values.activa }),
            })
            if (!r.ok) {
              const e = await r.json().catch(() => ({}))
              throw new Error(e?.error ?? "Error al guardar")
            }
            setEditing(null)
            await recargar()
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Colores ───────────────────────────────────────────────────────────────

function ColoresTab() {
  const [items, setItems] = useState<Color[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Color | null>(null)
  const [creating, setCreating] = useState(false)

  async function recargar() {
    setLoading(true)
    try {
      const r = await fetch("/api/colores-producto")
      const d = await r.json()
      setItems(Array.isArray(d) ? d : [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }
  useEffect(() => { recargar() }, [])

  async function eliminar(id: number) {
    if (!confirm("¿Desactivar este color?")) return
    const r = await fetch(`/api/colores-producto/${id}`, { method: "DELETE" })
    if (!r.ok) { alert("Error al desactivar"); return }
    await recargar()
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setCreating(true)}
          className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-800 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo Color
        </button>
      </div>

      <CatalogoTabla
        loading={loading}
        empty="No hay colores"
        rows={items}
        cols={[
          {
            label: "Color",
            render: r => (
              <div className="flex items-center gap-2">
                {r.hex && (
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-gray-300"
                    style={{ background: r.hex }}
                  />
                )}
                <span>{r.nombre}</span>
              </div>
            ),
          },
          { label: "Hex", render: r => r.hex ?? "—" },
          { label: "Estado", render: r => <EstadoBadge activo={r.activo} /> },
        ]}
        onEdit={r => setEditing(r)}
        onDelete={r => eliminar(r.id)}
      />

      {creating && (
        <ModalCatalogoSimple
          title="Nuevo Color"
          showHex
          submit={async values => {
            const r = await fetch("/api/colores-producto", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: values.nombre, hex: values.hex || null, activo: true }),
            })
            if (!r.ok) {
              const e = await r.json().catch(() => ({}))
              throw new Error(e?.error ?? "Error al crear")
            }
            setCreating(false)
            await recargar()
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {editing && (
        <ModalCatalogoSimple
          title={`Editar Color: ${editing.nombre}`}
          initial={{ nombre: editing.nombre, hex: editing.hex ?? "", activa: editing.activo }}
          showActivo
          showHex
          submit={async values => {
            const r = await fetch(`/api/colores-producto/${editing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nombre: values.nombre, hex: values.hex || null, activo: values.activa }),
            })
            if (!r.ok) {
              const e = await r.json().catch(() => ({}))
              throw new Error(e?.error ?? "Error al guardar")
            }
            setEditing(null)
            await recargar()
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Helpers compartidos ───────────────────────────────────────────────────

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  )
}

function CatalogoTabla<T extends { id: number }>({
  loading,
  rows,
  empty,
  cols,
  onEdit,
  onDelete,
}: {
  loading: boolean
  rows: T[]
  empty: string
  cols: { label: string; render: (r: T) => React.ReactNode }[]
  onEdit: (r: T) => void
  onDelete: (r: T) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {cols.map(c => (
              <th key={c.label} className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase">
                {c.label}
              </th>
            ))}
            <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-600 uppercase w-24">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={cols.length + 1} className="py-6 text-center text-gray-400 text-sm">Cargando…</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={cols.length + 1} className="py-6 text-center text-gray-400 text-sm">{empty}</td></tr>
          )}
          {!loading && rows.map(r => (
            <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
              {cols.map(c => (
                <td key={c.label} className="py-2.5 px-4 text-sm">{c.render(r)}</td>
              ))}
              <td className="py-2.5 px-4 text-right">
                <button onClick={() => onEdit(r)} className="text-indigo-600 hover:text-indigo-800 mr-3" aria-label="Editar">
                  <Edit className="w-4 h-4 inline" />
                </button>
                <button onClick={() => onDelete(r)} className="text-red-500 hover:text-red-700" aria-label="Desactivar">
                  <Trash2 className="w-4 h-4 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ModalCatalogoSimple({
  title,
  initial,
  showActivo,
  showHex,
  submit,
  onCancel,
}: {
  title: string
  initial?: { nombre?: string; hex?: string; activa?: boolean }
  showActivo?: boolean
  showHex?: boolean
  submit: (values: { nombre: string; hex: string; activa: boolean }) => Promise<void>
  onCancel: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "")
  const [hex, setHex] = useState(initial?.hex ?? "")
  const [activa, setActiva] = useState(initial?.activa ?? true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return }
    setEnviando(true)
    try {
      await submit({ nombre: nombre.trim(), hex: hex.trim(), activa })
    } catch (err) {
      setError((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {showHex && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hex (opcional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="#FF0000"
                  value={hex}
                  onChange={e => setHex(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#999999"}
                  onChange={e => setHex(e.target.value)}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
          {showActivo && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activa"
                checked={activa}
                onChange={e => setActiva(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="activa" className="text-sm text-gray-700 cursor-pointer">Activo</label>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={enviando}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-sm hover:bg-indigo-800 disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
