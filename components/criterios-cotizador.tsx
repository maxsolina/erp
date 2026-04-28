"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Edit, Trash2, X, Save, Search, AlertCircle, Smartphone, Sliders, Ban, Tag } from "lucide-react"

type Categoria = {
  id: string
  nombre: string
  orden: number
  accion: "descuento" | "whatsapp" | "cartel_sistema"
  activo: boolean
}

type ProductoLite = {
  id: number
  nombre: string
  codigo_interno: string
  marca: string
  modelo: string
}

type Modelo = {
  id: string
  producto_id: number
  valor_base_usd: number
  marca: string
  activo: boolean
  orden: number
  producto?: ProductoLite | null
}

type Criterio = {
  id: string
  modelo_id: string
  categoria_id: string
  etiqueta: string
  descuento_usd: number
  orden: number
  activo: boolean
  categoria?: { id: string; nombre: string; accion: string } | null
}

type Exclusion = {
  id: string
  descripcion: string
  orden: number
  activo: boolean
}

type Tab = "modelos" | "criterios" | "exclusiones" | "categorias"

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

export default function CriteriosCotizador() {
  const [tab, setTab] = useState<Tab>("modelos")

  const [modelos, setModelos] = useState<Modelo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [exclusiones, setExclusiones] = useState<Exclusion[]>([])
  const [productos, setProductos] = useState<ProductoLite[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ───────────────────────── Fetch inicial
  const recargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rM, rC, rCr, rE, rP] = await Promise.all([
        fetch("/api/cotizador/modelos").then(r => r.json()),
        fetch("/api/cotizador/categorias").then(r => r.json()),
        fetch("/api/cotizador/criterios").then(r => r.json()),
        fetch("/api/cotizador/exclusiones").then(r => r.json()),
        fetch("/api/productos").then(r => r.json()),
      ])
      setModelos(Array.isArray(rM) ? rM : [])
      setCategorias(Array.isArray(rC) ? rC : [])
      setCriterios(Array.isArray(rCr) ? rCr : [])
      setExclusiones(Array.isArray(rE) ? rE : [])
      setProductos(Array.isArray(rP) ? rP.map((p: any) => ({
        id: p.id, nombre: p.nombre, codigo_interno: p.codigo_interno, marca: p.marca, modelo: p.modelo,
      })) : [])
    } catch (e) {
      setError("Error cargando datos del cotizador")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { recargar() }, [])

  // ───────────────────────── Render
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-amber-900">Criterios para Cotizador</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          <TabButton active={tab === "modelos"} onClick={() => setTab("modelos")} icon={<Smartphone className="w-4 h-4" />}>
            Modelos
          </TabButton>
          <TabButton active={tab === "criterios"} onClick={() => setTab("criterios")} icon={<Sliders className="w-4 h-4" />}>
            Criterios de Descuento
          </TabButton>
          <TabButton active={tab === "exclusiones"} onClick={() => setTab("exclusiones")} icon={<Ban className="w-4 h-4" />}>
            Exclusiones
          </TabButton>
          <TabButton active={tab === "categorias"} onClick={() => setTab("categorias")} icon={<Tag className="w-4 h-4" />}>
            Categorías
          </TabButton>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <>
          {tab === "modelos" && (
            <ModelosTab
              modelos={modelos}
              productos={productos}
              criterios={criterios}
              categorias={categorias}
              onChange={recargar}
              onError={setError}
              onJumpToCriterios={() => setTab("criterios")}
            />
          )}
          {tab === "criterios" && (
            <CriteriosTab
              modelos={modelos}
              categorias={categorias}
              criterios={criterios}
              onChange={recargar}
              onError={setError}
            />
          )}
          {tab === "exclusiones" && (
            <ExclusionesTab exclusiones={exclusiones} onChange={recargar} onError={setError} />
          )}
          {tab === "categorias" && (
            <CategoriasTab categorias={categorias} onChange={recargar} onError={setError} />
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB BUTTON
// ═══════════════════════════════════════════════════════════════
function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-indigo-900 text-indigo-900" : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {icon} {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: MODELOS
// ═══════════════════════════════════════════════════════════════
function ModelosTab({
  modelos, productos, criterios, categorias, onChange, onError, onJumpToCriterios,
}: {
  modelos: Modelo[]; productos: ProductoLite[]; criterios: Criterio[]; categorias: Categoria[]
  onChange: () => void; onError: (msg: string | null) => void; onJumpToCriterios: () => void
}) {
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Partial<Modelo> | null>(null)
  const [creating, setCreating] = useState(false)

  const productoIdsOcupados = new Set(modelos.map(m => m.producto_id))

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return modelos
    return modelos.filter(m =>
      m.producto?.nombre.toLowerCase().includes(q) ||
      m.producto?.codigo_interno.toLowerCase().includes(q) ||
      String(m.valor_base_usd).includes(q)
    )
  }, [modelos, search])

  // Cuántas categorías de tipo "descuento" tienen al menos una opción con descuento=0 y al menos una opción para este modelo
  const completitudPorModelo = useMemo(() => {
    const map: Record<string, { total: number; conImpecable: number }> = {}
    const cats = categorias.filter(c => c.activo && c.accion === "descuento")
    for (const m of modelos) {
      let conImpecable = 0
      for (const cat of cats) {
        const opciones = criterios.filter(cr => cr.modelo_id === m.id && cr.categoria_id === cat.id && cr.activo)
        if (opciones.some(o => Number(o.descuento_usd) === 0)) conImpecable++
      }
      map[m.id] = { total: cats.length, conImpecable }
    }
    return map
  }, [modelos, criterios, categorias])

  const guardar = async () => {
    if (!editing) return
    try {
      const url = creating ? "/api/cotizador/modelos" : `/api/cotizador/modelos/${editing.id}`
      const method = creating ? "POST" : "PUT"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: editing.producto_id,
          valor_base_usd: editing.valor_base_usd,
          marca: editing.marca,
          activo: editing.activo,
          orden: editing.orden,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        onError(data.error ?? "Error al guardar")
        return
      }
      setEditing(null)
      setCreating(false)
      onError(null)
      onChange()
    } catch (e) {
      onError("Error de red")
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este modelo? Se borran también todos sus criterios.")) return
    const res = await fetch(`/api/cotizador/modelos/${id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { onError(data.error ?? "Error al eliminar"); return }
    onError(null)
    onChange()
  }

  return (
    <div>
      <Toolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar por modelo..."
        onAdd={() => {
          setCreating(true)
          setEditing({ producto_id: 0, valor_base_usd: 0, marca: "Apple", activo: true, orden: 0 })
        }}
        addLabel="Agregar modelo"
      />

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Producto</th>
              <th className="text-right py-3 px-4 font-medium">Valor base USD</th>
              <th className="text-center py-3 px-4 font-medium">Criterios</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => {
              const compl = completitudPorModelo[m.id] ?? { total: 0, conImpecable: 0 }
              const completo = compl.total > 0 && compl.conImpecable === compl.total
              return (
                <tr key={m.id} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{m.producto?.nombre ?? `#${m.producto_id}`}</div>
                    <div className="text-xs text-gray-500">{m.producto?.codigo_interno}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">{fmtUsd(m.valor_base_usd)}</td>
                  <td className="py-3 px-4 text-center">
                    {compl.total === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : completo ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{compl.conImpecable}/{compl.total} OK</span>
                    ) : (
                      <button
                        onClick={onJumpToCriterios}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
                        title="Faltan opciones 'Impecable' en algunas categorías"
                      >
                        {compl.conImpecable}/{compl.total} Pendiente
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${m.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setEditing({ ...m })} className="p-1.5 text-gray-500 hover:text-indigo-900 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(m.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">No hay modelos cargados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing && (
        <Modal title={creating ? "Nuevo modelo" : "Editar modelo"} onClose={() => { setEditing(null); setCreating(false) }}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Producto *</label>
              <select
                value={editing.producto_id || ""}
                onChange={(e) => setEditing({ ...editing, producto_id: Number(e.target.value) })}
                disabled={!creating}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
              >
                <option value="">Seleccione un producto</option>
                {productos
                  .filter(p => creating ? !productoIdsOcupados.has(p.id) : true)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.codigo_interno} — {p.nombre}
                    </option>
                  ))}
              </select>
              {!creating && <p className="text-xs text-gray-400 mt-1">El producto no se puede cambiar después de creado</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor base USD *</label>
              <input
                type="number" step="0.01" min="0"
                value={editing.valor_base_usd ?? 0}
                onChange={(e) => setEditing({ ...editing, valor_base_usd: Number(e.target.value) })}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.activo ?? true}
                onChange={(e) => setEditing({ ...editing, activo: e.target.checked })}
              />
              Activo
            </label>
          </div>
          <ModalFooter onCancel={() => { setEditing(null); setCreating(false) }} onSave={guardar} disabled={!editing.producto_id} />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: CRITERIOS
// ═══════════════════════════════════════════════════════════════
function CriteriosTab({
  modelos, categorias, criterios, onChange, onError,
}: {
  modelos: Modelo[]; categorias: Categoria[]; criterios: Criterio[]
  onChange: () => void; onError: (msg: string | null) => void
}) {
  const [filtroModelo, setFiltroModelo] = useState<string>("")
  const [filtroCategoria, setFiltroCategoria] = useState<string>("")
  const [editing, setEditing] = useState<Partial<Criterio> | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    return criterios.filter(c =>
      (!filtroModelo || c.modelo_id === filtroModelo) &&
      (!filtroCategoria || c.categoria_id === filtroCategoria)
    )
  }, [criterios, filtroModelo, filtroCategoria])

  const modeloPorId = useMemo(() => {
    const m: Record<string, Modelo> = {}
    for (const x of modelos) m[x.id] = x
    return m
  }, [modelos])

  const categoriaPorId = useMemo(() => {
    const m: Record<string, Categoria> = {}
    for (const x of categorias) m[x.id] = x
    return m
  }, [categorias])

  const valorBaseEditing = editing?.modelo_id ? modeloPorId[editing.modelo_id]?.valor_base_usd ?? 0 : 0
  const porcentajeEditing = valorBaseEditing > 0 && editing?.descuento_usd != null
    ? (Number(editing.descuento_usd) / valorBaseEditing) * 100
    : null

  const guardar = async () => {
    if (!editing) return
    try {
      const url = creating ? "/api/cotizador/criterios" : `/api/cotizador/criterios/${editing.id}`
      const method = creating ? "POST" : "PUT"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelo_id: editing.modelo_id,
          categoria_id: editing.categoria_id,
          etiqueta: editing.etiqueta,
          descuento_usd: editing.descuento_usd,
          orden: editing.orden,
          activo: editing.activo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { onError(data.error ?? "Error al guardar"); return }
      setEditing(null); setCreating(false); onError(null); onChange()
    } catch (e) {
      onError("Error de red")
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este criterio?")) return
    const res = await fetch(`/api/cotizador/criterios/${id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { onError(data.error ?? "Error al eliminar"); return }
    onError(null); onChange()
  }

  // Categorías filtrables: solo las de tipo "descuento" o "cartel_sistema" tienen criterios
  const categoriasUtiles = categorias.filter(c => c.activo && c.accion !== "whatsapp")

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
          <select value={filtroModelo} onChange={(e) => setFiltroModelo(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[240px]">
            <option value="">Todos</option>
            {modelos.map(m => (
              <option key={m.id} value={m.id}>{m.producto?.nombre ?? `#${m.producto_id}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[200px]">
            <option value="">Todas</option>
            {categoriasUtiles.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => {
              setCreating(true)
              setEditing({
                modelo_id: filtroModelo || modelos[0]?.id || "",
                categoria_id: filtroCategoria || categoriasUtiles[0]?.id || "",
                etiqueta: "",
                descuento_usd: 0,
                orden: 0,
                activo: true,
              })
            }}
            disabled={modelos.length === 0 || categoriasUtiles.length === 0}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Agregar criterio
          </button>
        </div>
      </div>

      {modelos.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Primero cargá modelos en la pestaña anterior.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Modelo</th>
              <th className="text-left py-3 px-4 font-medium">Categoría</th>
              <th className="text-left py-3 px-4 font-medium">Etiqueta</th>
              <th className="text-right py-3 px-4 font-medium">Descuento USD</th>
              <th className="text-right py-3 px-4 font-medium">% del base</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => {
              const m = modeloPorId[c.modelo_id]
              const cat = categoriaPorId[c.categoria_id]
              const pct = m && Number(m.valor_base_usd) > 0
                ? (Number(c.descuento_usd) / Number(m.valor_base_usd)) * 100
                : null
              return (
                <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="py-3 px-4 text-sm">{m?.producto?.nombre ?? "—"}</td>
                  <td className="py-3 px-4 text-sm">{cat?.nombre ?? "—"}</td>
                  <td className="py-3 px-4 font-medium">{c.etiqueta}</td>
                  <td className="py-3 px-4 text-right">{fmtUsd(c.descuento_usd)}</td>
                  <td className="py-3 px-4 text-right text-gray-500 text-sm">{pct == null ? "—" : `${pct.toFixed(1)}%`}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setEditing({ ...c })} className="p-1.5 text-gray-500 hover:text-indigo-900 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(c.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-500">No hay criterios cargados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing && (
        <Modal title={creating ? "Nuevo criterio" : "Editar criterio"} onClose={() => { setEditing(null); setCreating(false) }}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Modelo *</label>
                <select
                  value={editing.modelo_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, modelo_id: e.target.value })}
                  disabled={!creating}
                  className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                >
                  {modelos.map(m => (
                    <option key={m.id} value={m.id}>{m.producto?.nombre ?? `#${m.producto_id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
                <select
                  value={editing.categoria_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, categoria_id: e.target.value })}
                  className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
                >
                  {categoriasUtiles.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta *</label>
              <input
                type="text"
                value={editing.etiqueta ?? ""}
                onChange={(e) => setEditing({ ...editing, etiqueta: e.target.value })}
                placeholder="Ej: Rayones leves, Impecable, Menor a 85%..."
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descuento USD *</label>
              <input
                type="number" step="0.01" min="0" max={valorBaseEditing}
                value={editing.descuento_usd ?? 0}
                onChange={(e) => setEditing({ ...editing, descuento_usd: Number(e.target.value) })}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              />
              {porcentajeEditing != null && (
                <span className="text-xs text-gray-500 mt-1 block">= {porcentajeEditing.toFixed(1)}% del valor base ({fmtUsd(valorBaseEditing)})</span>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.activo ?? true}
                onChange={(e) => setEditing({ ...editing, activo: e.target.checked })}
              />
              Activo
            </label>
          </div>
          <ModalFooter
            onCancel={() => { setEditing(null); setCreating(false) }}
            onSave={guardar}
            disabled={!editing.modelo_id || !editing.categoria_id || !editing.etiqueta?.trim()}
          />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: EXCLUSIONES
// ═══════════════════════════════════════════════════════════════
function ExclusionesTab({ exclusiones, onChange, onError }: { exclusiones: Exclusion[]; onChange: () => void; onError: (m: string | null) => void }) {
  const [editing, setEditing] = useState<Partial<Exclusion> | null>(null)
  const [creating, setCreating] = useState(false)

  const guardar = async () => {
    if (!editing) return
    const url = creating ? "/api/cotizador/exclusiones" : `/api/cotizador/exclusiones/${editing.id}`
    const method = creating ? "POST" : "PUT"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descripcion: editing.descripcion, orden: editing.orden, activo: editing.activo }),
    })
    const data = await res.json()
    if (!res.ok) { onError(data.error ?? "Error al guardar"); return }
    setEditing(null); setCreating(false); onError(null); onChange()
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta exclusión?")) return
    const res = await fetch(`/api/cotizador/exclusiones/${id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { onError(data.error ?? "Error al eliminar"); return }
    onError(null); onChange()
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setCreating(true); setEditing({ descripcion: "", orden: 0, activo: true }) }}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Agregar exclusión
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Descripción</th>
              <th className="text-center py-3 px-4 font-medium">Orden</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {exclusiones.map((e, idx) => (
              <tr key={e.id} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="py-3 px-4">{e.descripcion}</td>
                <td className="py-3 px-4 text-center text-sm text-gray-500">{e.orden}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${e.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => setEditing({ ...e })} className="p-1.5 text-gray-500 hover:text-indigo-900 hover:bg-gray-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => eliminar(e.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {exclusiones.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-500">No hay exclusiones cargadas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={creating ? "Nueva exclusión" : "Editar exclusión"} onClose={() => { setEditing(null); setCreating(false) }}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
              <input
                type="text"
                value={editing.descripcion ?? ""}
                onChange={(ev) => setEditing({ ...editing, descripcion: ev.target.value })}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                <input
                  type="number"
                  value={editing.orden ?? 0}
                  onChange={(ev) => setEditing({ ...editing, orden: Number(ev.target.value) })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.activo ?? true} onChange={(ev) => setEditing({ ...editing, activo: ev.target.checked })} />
                  Activo
                </label>
              </div>
            </div>
          </div>
          <ModalFooter onCancel={() => { setEditing(null); setCreating(false) }} onSave={guardar} disabled={!editing.descripcion?.trim()} />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: CATEGORIAS
// ═══════════════════════════════════════════════════════════════
function CategoriasTab({ categorias, onChange, onError }: { categorias: Categoria[]; onChange: () => void; onError: (m: string | null) => void }) {
  const [editing, setEditing] = useState<Partial<Categoria> | null>(null)
  const [creating, setCreating] = useState(false)

  const guardar = async () => {
    if (!editing) return
    const url = creating ? "/api/cotizador/categorias" : `/api/cotizador/categorias/${editing.id}`
    const method = creating ? "POST" : "PUT"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editing.nombre,
        orden: editing.orden,
        accion: editing.accion,
        activo: editing.activo,
      }),
    })
    const data = await res.json()
    if (!res.ok) { onError(data.error ?? "Error al guardar"); return }
    setEditing(null); setCreating(false); onError(null); onChange()
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría? Si tiene criterios asociados no se puede borrar.")) return
    const res = await fetch(`/api/cotizador/categorias/${id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { onError(data.error ?? "Error al eliminar"); return }
    onError(null); onChange()
  }

  const labelAccion = (a: string) => a === "descuento" ? "Descuento" : a === "whatsapp" ? "WhatsApp" : a === "cartel_sistema" ? "Cartel sistema (-50%)" : a

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setCreating(true); setEditing({ nombre: "", orden: 0, accion: "descuento", activo: true }) }}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Agregar categoría
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-3 px-4 font-medium">Nombre</th>
              <th className="text-left py-3 px-4 font-medium">Acción</th>
              <th className="text-center py-3 px-4 font-medium">Orden</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c, idx) => (
              <tr key={c.id} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="py-3 px-4 font-medium">{c.nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{labelAccion(c.accion)}</td>
                <td className="py-3 px-4 text-center text-sm text-gray-500">{c.orden}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${c.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => setEditing({ ...c })} className="p-1.5 text-gray-500 hover:text-indigo-900 hover:bg-gray-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => eliminar(c.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">No hay categorías cargadas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={creating ? "Nueva categoría" : "Editar categoría"} onClose={() => { setEditing(null); setCreating(false) }}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                type="text"
                value={editing.nombre ?? ""}
                onChange={(ev) => setEditing({ ...editing, nombre: ev.target.value })}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Acción *</label>
              <select
                value={editing.accion ?? "descuento"}
                onChange={(ev) => setEditing({ ...editing, accion: ev.target.value as Categoria["accion"] })}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              >
                <option value="descuento">Descuento (con opciones y monto USD)</option>
                <option value="cartel_sistema">Cartel sistema (-50% al precio base)</option>
                <option value="whatsapp">WhatsApp (deriva a contacto)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                <input
                  type="number"
                  value={editing.orden ?? 0}
                  onChange={(ev) => setEditing({ ...editing, orden: Number(ev.target.value) })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.activo ?? true} onChange={(ev) => setEditing({ ...editing, activo: ev.target.checked })} />
                  Activo
                </label>
              </div>
            </div>
          </div>
          <ModalFooter onCancel={() => { setEditing(null); setCreating(false) }} onSave={guardar} disabled={!editing.nombre?.trim()} />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════
function Toolbar({
  search, onSearchChange, placeholder, onAdd, addLabel,
}: {
  search: string; onSearchChange: (v: string) => void; placeholder: string; onAdd: () => void; addLabel: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800 text-sm font-medium"
      >
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ModalFooter({ onCancel, onSave, disabled }: { onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
      <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-900 text-white rounded hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" /> Guardar
      </button>
    </div>
  )
}
