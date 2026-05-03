"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Edit, Trash2, X, Save, Search, AlertCircle, Smartphone, Sliders, Ban, Tag, ListChecks, GripVertical, MessageSquare } from "lucide-react"

// ── Hook reutilizable para drag-and-drop reorder ──────────────
function useDragReorder<T extends { id: string }>(
  items: T[],
  endpoint: string,
  onDone: () => void,
  onError: (msg: string | null) => void,
) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null)

  const onDragStart = (idx: number) => setDraggingIdx(idx)
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (draggingIdx !== null && draggingIdx !== idx) setDropTargetIdx(idx)
  }
  const onDragLeave = () => setDropTargetIdx(null)
  const onDragEnd = () => { setDraggingIdx(null); setDropTargetIdx(null) }
  const onDrop = async (toIdx: number) => {
    if (draggingIdx === null || draggingIdx === toIdx) {
      setDraggingIdx(null); setDropTargetIdx(null); return
    }
    const reordered = [...items]
    const [moved] = reordered.splice(draggingIdx, 1)
    reordered.splice(toIdx, 0, moved)
    setDraggingIdx(null); setDropTargetIdx(null)

    // Persistir el nuevo orden en paralelo
    const updates = reordered.map((item, i) =>
      fetch(`${endpoint}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: i }),
      })
    )
    const results = await Promise.all(updates)
    if (results.some(r => !r.ok)) onError("Algunos cambios de orden no se guardaron")
    else onError(null)
    onDone()
  }

  return { draggingIdx, dropTargetIdx, onDragStart, onDragOver, onDragLeave, onDragEnd, onDrop }
}

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
  descuento_porcentaje: number | null  // si NOT NULL → modo porcentual dinámico
  orden: number
  activo: boolean
  web_deriva_atencion: boolean
  categoria?: { id: string; nombre: string; accion: string } | null
}

type Exclusion = {
  id: string
  descripcion: string
  orden: number
  activo: boolean
}

type EtiquetaCategoria = {
  id: string
  categoria_id: string
  etiqueta: string
  orden: number
  activo: boolean
}

type Tab = "modelos" | "criterios" | "etiquetas" | "exclusiones" | "categorias"

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n)

export default function CriteriosCotizador() {
  const [tab, setTab] = useState<Tab>("modelos")

  const [modelos, setModelos] = useState<Modelo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [exclusiones, setExclusiones] = useState<Exclusion[]>([])
  const [productos, setProductos] = useState<ProductoLite[]>([])
  const [etiquetas, setEtiquetas] = useState<EtiquetaCategoria[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ───────────────────────── Fetch inicial
  const recargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rM, rC, rCr, rE, rP, rEt] = await Promise.all([
        fetch("/api/cotizador/modelos").then(r => r.json()),
        fetch("/api/cotizador/categorias").then(r => r.json()),
        fetch("/api/cotizador/criterios").then(r => r.json()),
        fetch("/api/cotizador/exclusiones").then(r => r.json()),
        fetch("/api/productos").then(r => r.json()),
        fetch("/api/cotizador/etiquetas").then(r => r.json()),
      ])
      setModelos(Array.isArray(rM) ? rM : [])
      setCategorias(Array.isArray(rC) ? rC : [])
      setCriterios(Array.isArray(rCr) ? rCr : [])
      setExclusiones(Array.isArray(rE) ? rE : [])
      setProductos(Array.isArray(rP) ? rP.map((p: any) => ({
        id: p.id, nombre: p.nombre, codigo_interno: p.codigo_interno, marca: p.marca, modelo: p.modelo,
      })) : [])
      setEtiquetas(Array.isArray(rEt) ? rEt : [])
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
          <TabButton active={tab === "etiquetas"} onClick={() => setTab("etiquetas")} icon={<ListChecks className="w-4 h-4" />}>
            Etiquetas
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
              etiquetas={etiquetas}
              onChange={recargar}
              onError={setError}
            />
          )}
          {tab === "etiquetas" && (
            <EtiquetasTab
              etiquetas={etiquetas}
              categorias={categorias}
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

  // Por cada modelo:
  //   - cargados: cantidad total de criterios activos (lo que el operador "ve")
  //   - conImpecable: cantidad de categorías de descuento/cartel_sistema que
  //     tienen al menos una opción con descuento=0 (regla de validez para que
  //     el wizard de Toma de Equipo pueda cotizar la opción "sin daño")
  //   - faltantes: nombres de las categorías sin opción Impecable cargada
  const completitudPorModelo = useMemo(() => {
    const map: Record<string, { total: number; conImpecable: number; cargados: number; faltantes: string[] }> = {}
    const cats = categorias.filter(c => c.activo && (c.accion === "descuento" || c.accion === "cartel_sistema"))
    for (const m of modelos) {
      let conImpecable = 0
      const faltantes: string[] = []
      const cargados = criterios.filter(cr => cr.modelo_id === m.id && cr.activo).length
      for (const cat of cats) {
        const opciones = criterios.filter(cr => cr.modelo_id === m.id && cr.categoria_id === cat.id && cr.activo)
        if (opciones.some(o => Number(o.descuento_usd) === 0)) conImpecable++
        else faltantes.push(cat.nombre)
      }
      map[m.id] = { total: cats.length, conImpecable, cargados, faltantes }
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
              const compl = completitudPorModelo[m.id] ?? { total: 0, conImpecable: 0, cargados: 0, faltantes: [] }
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {compl.cargados} criterio{compl.cargados !== 1 ? "s" : ""} · OK
                      </span>
                    ) : compl.cargados === 0 ? (
                      <button
                        onClick={onJumpToCriterios}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Sin criterios cargados. Cargá la opción 'Impecable' (USD 0) en cada categoría."
                      >
                        Sin criterios
                      </button>
                    ) : (
                      <button
                        onClick={onJumpToCriterios}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
                        title={`Falta opción "Impecable" (USD 0) en: ${compl.faltantes.join(", ")}`}
                      >
                        {compl.cargados} criterio{compl.cargados !== 1 ? "s" : ""} · falta Impecable
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
  modelos, categorias, criterios, etiquetas, onChange, onError,
}: {
  modelos: Modelo[]; categorias: Categoria[]; criterios: Criterio[]; etiquetas: EtiquetaCategoria[]
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
          descuento_porcentaje: editing.descuento_porcentaje,  // null = nominal, número = porcentual dinámico
          orden: editing.orden,
          activo: editing.activo,
          web_deriva_atencion: editing.web_deriva_atencion,
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

  // Detectar categorías sin "Impecable" para el modelo filtrado
  const impecablesFaltantes = useMemo(() => {
    if (!filtroModelo) return []
    return categoriasUtiles.filter(cat => {
      const opciones = criterios.filter(c => c.modelo_id === filtroModelo && c.categoria_id === cat.id && c.activo)
      return !opciones.some(o => Number(o.descuento_usd) === 0)
    })
  }, [filtroModelo, criterios, categoriasUtiles])

  const crearImpecablesFaltantes = async () => {
    if (!filtroModelo || impecablesFaltantes.length === 0) return
    if (!confirm(`Crear/ajustar ${impecablesFaltantes.length} opciones "Impecable" (USD 0) para: ${impecablesFaltantes.map(c => c.nombre).join(", ")}?\n\nSi ya existe un criterio "Impecable" con descuento > 0, se ajusta a USD 0.`)) return
    let errors = 0
    for (const cat of impecablesFaltantes) {
      // Si ya existe un criterio "Impecable" (cualquier descuento) para este
      // modelo+categoría, lo actualizamos a USD 0 en vez de crear duplicado.
      const existente = criterios.find(c =>
        c.modelo_id === filtroModelo &&
        c.categoria_id === cat.id &&
        c.activo &&
        (c.etiqueta ?? "").toLowerCase().trim() === "impecable"
      )
      if (existente) {
        const res = await fetch(`/api/cotizador/criterios/${existente.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelo_id: existente.modelo_id,
            categoria_id: existente.categoria_id,
            etiqueta: existente.etiqueta,
            descuento_usd: 0,
            descuento_porcentaje: existente.descuento_porcentaje ?? null,
            orden: existente.orden ?? 0,
            activo: true,
            web_deriva_atencion: existente.web_deriva_atencion ?? false,
          }),
        })
        if (!res.ok) errors++
      } else {
        const res = await fetch("/api/cotizador/criterios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelo_id: filtroModelo, categoria_id: cat.id,
            etiqueta: "Impecable", descuento_usd: 0, orden: 0, activo: true,
          }),
        })
        if (!res.ok) errors++
      }
    }
    if (errors > 0) onError(`${errors} de ${impecablesFaltantes.length} no se pudieron procesar`)
    else onError(null)
    onChange()
  }

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

      {filtroModelo && impecablesFaltantes.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Falta la opción "Impecable" (USD 0) en: <strong>{impecablesFaltantes.map(c => c.nombre).join(", ")}</strong>.
              Sin esto, el modelo no aparece en el wizard de Toma de Equipo.
            </span>
          </div>
          <button
            onClick={crearImpecablesFaltantes}
            className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
          >
            Crear automáticamente
          </button>
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
              <th className="text-center py-3 px-4 font-medium" title="En web deriva a atención presencial">Web</th>
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
                  <td className="py-3 px-4 text-right">
                    {fmtUsd(c.descuento_usd)}
                    {c.descuento_porcentaje !== null && c.descuento_porcentaje !== undefined && (
                      <span className="ml-1 text-xs text-violet-600" title="Calculado dinámicamente">↻</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 text-sm">
                    {c.descuento_porcentaje !== null && c.descuento_porcentaje !== undefined
                      ? <span className="text-violet-600 font-medium">{Number(c.descuento_porcentaje).toFixed(1)}% (din.)</span>
                      : pct == null ? "—" : `${pct.toFixed(1)}%`}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {c.web_deriva_atencion ? (
                      <MessageSquare className="w-4 h-4 text-amber-600 inline" />
                    ) : <span className="text-gray-300">—</span>}
                  </td>
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
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">No hay criterios cargados</td></tr>
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
              {(() => {
                const etiquetasDeCategoria = etiquetas
                  .filter(e => e.categoria_id === editing.categoria_id && e.activo)
                  .sort((a, b) => a.orden - b.orden || a.etiqueta.localeCompare(b.etiqueta))
                if (etiquetasDeCategoria.length === 0) {
                  return (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Esta categoría no tiene etiquetas predefinidas. Cargá algunas en la pestaña <strong>Etiquetas</strong> antes de crear el criterio.
                    </div>
                  )
                }
                return (
                  <select
                    value={editing.etiqueta ?? ""}
                    onChange={(e) => setEditing({ ...editing, etiqueta: e.target.value })}
                    className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Seleccione una etiqueta</option>
                    {etiquetasDeCategoria.map(et => (
                      <option key={et.id} value={et.etiqueta}>{et.etiqueta}</option>
                    ))}
                  </select>
                )
              })()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descuento USD *</label>
                <input
                  type="number" step="0.01" min="0" max={valorBaseEditing}
                  value={editing.descuento_usd ?? 0}
                  onChange={(e) => {
                    // Clamp a [0, valor_base] — no permitir exceder el valor del equipo
                    let usd = Math.max(0, Number(e.target.value) || 0)
                    if (valorBaseEditing > 0) usd = Math.min(usd, valorBaseEditing)
                    const pct = valorBaseEditing > 0 ? Number(((usd / valorBaseEditing) * 100).toFixed(2)) : 0
                    setEditing({ ...editing, descuento_usd: usd, descuento_porcentaje: editing.descuento_porcentaje !== null && editing.descuento_porcentaje !== undefined ? pct : null })
                  }}
                  className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Porcentaje %</label>
                <input
                  type="number" step="0.01" min="0" max="100"
                  value={editing.descuento_porcentaje ?? (valorBaseEditing > 0 && editing.descuento_usd != null ? Number(((Number(editing.descuento_usd) / valorBaseEditing) * 100).toFixed(2)) : 0)}
                  onChange={(e) => {
                    // Clamp a [0, 100]
                    const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                    const usd = valorBaseEditing > 0 ? Number(((valorBaseEditing * pct) / 100).toFixed(2)) : 0
                    setEditing({ ...editing, descuento_porcentaje: pct, descuento_usd: usd })
                  }}
                  className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <span className="text-xs text-gray-500 -mt-2 block">
              Valor base del modelo: {fmtUsd(valorBaseEditing)} (máximo 100% / {fmtUsd(valorBaseEditing)})
            </span>
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={editing.descuento_porcentaje !== null && editing.descuento_porcentaje !== undefined}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Activar modo porcentual: si no hay %, lo calculo del USD
                      const pct = valorBaseEditing > 0 && editing.descuento_usd != null
                        ? Number(((Number(editing.descuento_usd) / valorBaseEditing) * 100).toFixed(2))
                        : 0
                      setEditing({ ...editing, descuento_porcentaje: pct })
                    } else {
                      // Volver a modo nominal
                      setEditing({ ...editing, descuento_porcentaje: null })
                    }
                  }}
                />
                <div>
                  <span>Aplicar como % dinámico</span>
                  <span className="block text-xs text-gray-500">El descuento se recalcula al vuelo como % del valor base del modelo. Si el valor base cambia en el futuro, el descuento se ajusta automáticamente. Si está desactivado, queda fijo el monto USD nominal.</span>
                </div>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.activo ?? true}
                  onChange={(e) => setEditing({ ...editing, activo: e.target.checked })}
                />
                Activo
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={editing.web_deriva_atencion ?? false}
                  onChange={(e) => setEditing({ ...editing, web_deriva_atencion: e.target.checked })}
                />
                <div>
                  <span>En web deriva a atención</span>
                  <span className="block text-xs text-gray-500">El cotizador público mostrará aviso de derivación a WhatsApp en vez de aplicar el descuento. En el ERP no afecta — el operador siempre aplica el descuento.</span>
                </div>
              </label>
            </div>
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
  const sorted = useMemo(() => [...exclusiones].sort((a, b) => a.orden - b.orden), [exclusiones])
  const dnd = useDragReorder(sorted, "/api/cotizador/exclusiones", onChange, onError)

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
              <th className="w-8"></th>
              <th className="text-left py-3 px-4 font-medium">Descripción</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, idx) => (
              <tr
                key={e.id}
                draggable
                onDragStart={() => dnd.onDragStart(idx)}
                onDragOver={dnd.onDragOver(idx)}
                onDragLeave={dnd.onDragLeave}
                onDragEnd={dnd.onDragEnd}
                onDrop={() => dnd.onDrop(idx)}
                className={`border-b border-gray-100 ${
                  dnd.draggingIdx === idx ? 'opacity-40' :
                  dnd.dropTargetIdx === idx ? 'bg-blue-50 border-t-2 border-t-blue-400' :
                  idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <td className="py-3 px-2 text-center cursor-grab active:cursor-grabbing text-gray-400">
                  <GripVertical className="w-4 h-4 inline" />
                </td>
                <td className="py-3 px-4">{e.descripcion}</td>
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
            {sorted.length === 0 && (
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.activo ?? true} onChange={(ev) => setEditing({ ...editing, activo: ev.target.checked })} />
              Activo
            </label>
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
  const sorted = useMemo(() => [...categorias].sort((a, b) => a.orden - b.orden), [categorias])
  const dnd = useDragReorder(sorted, "/api/cotizador/categorias", onChange, onError)

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
              <th className="w-8"></th>
              <th className="text-left py-3 px-4 font-medium">Nombre</th>
              <th className="text-left py-3 px-4 font-medium">Acción</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, idx) => (
              <tr
                key={c.id}
                draggable
                onDragStart={() => dnd.onDragStart(idx)}
                onDragOver={dnd.onDragOver(idx)}
                onDragLeave={dnd.onDragLeave}
                onDragEnd={dnd.onDragEnd}
                onDrop={() => dnd.onDrop(idx)}
                className={`border-b border-gray-100 ${
                  dnd.draggingIdx === idx ? 'opacity-40' :
                  dnd.dropTargetIdx === idx ? 'bg-blue-50 border-t-2 border-t-blue-400' :
                  idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <td className="py-3 px-2 text-center cursor-grab active:cursor-grabbing text-gray-400">
                  <GripVertical className="w-4 h-4 inline" />
                </td>
                <td className="py-3 px-4 font-medium">{c.nombre}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{labelAccion(c.accion)}</td>
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
            {sorted.length === 0 && (
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
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.activo ?? true} onChange={(ev) => setEditing({ ...editing, activo: ev.target.checked })} />
              Activo
            </label>
          </div>
          <ModalFooter onCancel={() => { setEditing(null); setCreating(false) }} onSave={guardar} disabled={!editing.nombre?.trim()} />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB: ETIQUETAS
// ═══════════════════════════════════════════════════════════════
function EtiquetasTab({
  etiquetas, categorias, onChange, onError,
}: {
  etiquetas: EtiquetaCategoria[]; categorias: Categoria[]
  onChange: () => void; onError: (m: string | null) => void
}) {
  const [filtroCategoria, setFiltroCategoria] = useState<string>("")
  const [editing, setEditing] = useState<Partial<EtiquetaCategoria> | null>(null)
  const [creating, setCreating] = useState(false)

  // Solo categorías que tienen criterios (descuento + cartel_sistema)
  const categoriasUtiles = categorias.filter(c => c.activo && c.accion !== "whatsapp")

  const filtered = useMemo(() => {
    return etiquetas
      .filter(e => !filtroCategoria || e.categoria_id === filtroCategoria)
      .sort((a, b) => a.orden - b.orden)
  }, [etiquetas, filtroCategoria])

  const dnd = useDragReorder(filtered, "/api/cotizador/etiquetas", onChange, onError)

  const categoriaPorId = useMemo(() => {
    const m: Record<string, Categoria> = {}
    for (const c of categorias) m[c.id] = c
    return m
  }, [categorias])

  const guardar = async () => {
    if (!editing || !editing.etiqueta?.trim() || !editing.categoria_id) return
    const url = creating ? "/api/cotizador/etiquetas" : `/api/cotizador/etiquetas/${editing.id}`
    const method = creating ? "POST" : "PUT"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria_id: editing.categoria_id,
        etiqueta: editing.etiqueta,
        orden: editing.orden,
        activo: editing.activo,
      }),
    })
    const data = await res.json()
    if (!res.ok) { onError(data.error ?? "Error al guardar"); return }
    setEditing(null); setCreating(false); onError(null); onChange()
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta etiqueta? Si hay criterios usándola seguirán teniendo el texto, pero no podrás crear nuevos con esa etiqueta.")) return
    const res = await fetch(`/api/cotizador/etiquetas/${id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { onError(data.error ?? "Error al eliminar"); return }
    onError(null); onChange()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
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
                categoria_id: filtroCategoria || categoriasUtiles[0]?.id || "",
                etiqueta: "",
                orden: 0,
                activo: true,
              })
            }}
            disabled={categoriasUtiles.length === 0}
            className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800 text-sm font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Agregar etiqueta
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="w-8"></th>
              <th className="text-left py-3 px-4 font-medium">Categoría</th>
              <th className="text-left py-3 px-4 font-medium">Etiqueta</th>
              <th className="text-center py-3 px-4 font-medium">Activo</th>
              <th className="text-right py-3 px-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((et, idx) => (
              <tr
                key={et.id}
                draggable
                onDragStart={() => dnd.onDragStart(idx)}
                onDragOver={dnd.onDragOver(idx)}
                onDragLeave={dnd.onDragLeave}
                onDragEnd={dnd.onDragEnd}
                onDrop={() => dnd.onDrop(idx)}
                className={`border-b border-gray-100 ${
                  dnd.draggingIdx === idx ? 'opacity-40' :
                  dnd.dropTargetIdx === idx ? 'bg-blue-50 border-t-2 border-t-blue-400' :
                  idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'
                }`}
              >
                <td className="py-3 px-2 text-center cursor-grab active:cursor-grabbing text-gray-400">
                  <GripVertical className="w-4 h-4 inline" />
                </td>
                <td className="py-3 px-4 text-sm">{categoriaPorId[et.categoria_id]?.nombre ?? "—"}</td>
                <td className="py-3 px-4 font-medium">{et.etiqueta}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${et.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => setEditing({ ...et })} className="p-1.5 text-gray-500 hover:text-indigo-900 hover:bg-gray-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => eliminar(et.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">No hay etiquetas cargadas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={creating ? "Nueva etiqueta" : "Editar etiqueta"} onClose={() => { setEditing(null); setCreating(false) }}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría *</label>
              <select
                value={editing.categoria_id ?? ""}
                onChange={(ev) => setEditing({ ...editing, categoria_id: ev.target.value })}
                disabled={!creating}
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
              >
                {categoriasUtiles.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Etiqueta *</label>
              <input
                type="text"
                value={editing.etiqueta ?? ""}
                onChange={(ev) => setEditing({ ...editing, etiqueta: ev.target.value })}
                placeholder="Ej: Impecable, Rayones leves, Menor a 85%..."
                className="w-full border border-violet-500 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.activo ?? true} onChange={(ev) => setEditing({ ...editing, activo: ev.target.checked })} />
              Activo
            </label>
          </div>
          <ModalFooter onCancel={() => { setEditing(null); setCreating(false) }} onSave={guardar} disabled={!editing.etiqueta?.trim() || !editing.categoria_id} />
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
