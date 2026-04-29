"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Plus, Package, CheckCircle, XCircle } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { useERP } from "@/contexts/erp-context"
import type { Producto } from "@/components/modulo-productos"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Layout de columnas (sticky para que el toggle de Activo no salte de lugar):
//   Código  Nombre  Categoría  Marca  Tipo  Stock  Estado
const GRID_COLS = "120px 1fr 160px 140px 110px 90px 110px"

export default function ProductosListingPage() {
  const router = useRouter()
  const { canSee } = useERP()

  // Defensa por URL: si el usuario tipea /productos pero no tiene permiso, lo mandamos al home.
  useEffect(() => {
    if (!canSee("productos")) router.replace("/")
  }, [canSee, router])

  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setError(null)
    const { data, error: err } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false })
    if (err) setError(err.message)
    else setProductos((data ?? []) as Producto[])
    setCargando(false)
  }, [])

  useEffect(() => { cargarProductos() }, [cargarProductos])

  async function handleToggleActivo(e: React.MouseEvent, p: Producto) {
    e.preventDefault()
    e.stopPropagation()
    const { error: err } = await supabase
      .from("productos")
      .update({ activo: !p.activo })
      .eq("id", p.id)
    if (err) alert(err.message)
    else await cargarProductos()
  }

  const productosFiltrados = useMemo(() => {
    let result = [...productos]
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q)
        || p.codigo_interno.toLowerCase().includes(q)
        || p.marca.toLowerCase().includes(q)
        || p.categoria.toLowerCase().includes(q),
      )
    }
    for (const filter of activeFilters) {
      result = result.filter(p => String((p as any)[filter.field] ?? "") === filter.value)
    }
    return result
  }, [productos, searchTerm, activeFilters])

  const filterOptions = useMemo(() => {
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
    const tipos      = [...new Set(productos.map(p => p.tipo).filter(Boolean))]
    const marcas     = [...new Set(productos.map(p => p.marca).filter(Boolean))]
    return [
      { field: "activo", label: "Estado", values: [
        { value: "true",  label: "Activos" },
        { value: "false", label: "Inactivos" },
      ]},
      { field: "categoria", label: "Categoría", values: categorias.sort().map(c => ({ value: c, label: c })) },
      { field: "tipo",      label: "Tipo",      values: tipos.sort().map(t => ({ value: t, label: t })) },
      { field: "marca",     label: "Marca",     values: marcas.sort().map(m => ({ value: m, label: m })) },
    ]
  }, [productos])

  const groupByOptions: GroupByOption[] = [
    { id: "categoria", label: "Categoría", field: "categoria" },
    { id: "tipo",      label: "Tipo",      field: "tipo" },
    { id: "marca",     label: "Marca",     field: "marca" },
    { id: "activo",    label: "Estado",    field: "activo" },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Mini-topbar mientras el resto del ERP siga en el monolito */}
      <div className="bg-indigo-900 text-white px-6 py-2 flex items-center gap-4 text-sm">
        <Link href="/" className="hover:text-indigo-200 transition-colors flex items-center gap-1">
          ← Volver al ERP
        </Link>
        <span className="text-indigo-200">·</span>
        <span className="font-semibold">Productos</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Productos</h1>
          <p className="text-xs text-gray-500 mt-0.5">{productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/productos/nuevo"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-indigo-900 text-white hover:bg-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Link>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <OdooFilterBar
          moduleName="productos"
          filterOptions={filterOptions}
          groupByOptions={groupByOptions}
          activeFilters={activeFilters}
          activeGroupBy={activeGroupBy}
          searchTerm={searchTerm}
          onFiltersChange={setActiveFilters}
          onGroupByChange={setActiveGroupBy}
          onSearchChange={setSearchTerm}
          savedFilters={savedFilters}
          onSaveFilter={(filter) => setSavedFilters(prev => [...prev, { ...filter, id: `f-${Date.now()}`, createdBy: "current_user" }])}
          onDeleteFilter={(id) => setSavedFilters(prev => prev.filter(f => f.id !== id))}
          onApplyFilter={(filter) => {
            setActiveFilters(filter.filters)
            setActiveGroupBy(filter.groupBy)
          }}
          totalCount={productos.length}
          filteredCount={productosFiltrados.length}
        />
      </div>

      {/* Lista (grid en vez de table para que cada fila sea un <Link> con Ctrl+Click nativo) */}
      <div className="flex-1 overflow-auto">
        {cargando ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando productos...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">{error}</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <Package className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">No hay productos que coincidan</p>
            <Link href="/productos/nuevo" className="mt-1 text-sm text-indigo-700 hover:text-indigo-900 hover:underline">
              Crear primer producto
            </Link>
          </div>
        ) : (
          <div className="text-sm">
            {/* Cabecera de columnas */}
            <div
              className="grid border-b bg-gray-50 sticky top-0 z-10"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Código</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Nombre</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Categoría</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Marca</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Tipo</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Stock</div>
              <div className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</div>
            </div>

            {/* Filas */}
            {productosFiltrados.map(p => (
              <Link
                key={p.id}
                href={`/productos/${p.id}`}
                className="grid border-b border-gray-100 hover:bg-gray-50 transition-colors text-gray-700"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span className="px-4 py-3 font-mono text-xs text-gray-500 self-center">{p.codigo_interno}</span>
                <span className="px-4 py-3">
                  <span className="font-medium text-indigo-900 block">{p.nombre}</span>
                  {p.modelo && <span className="text-xs text-gray-400 block">{p.modelo}</span>}
                </span>
                <span className="px-4 py-3 text-gray-600 self-center">{p.categoria}</span>
                <span className="px-4 py-3 text-gray-600 self-center">{p.marca}</span>
                <span className="px-4 py-3 self-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.tipo === "almacenable" ? "bg-blue-100 text-blue-700" : p.tipo === "servicio" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                    {p.tipo}
                  </span>
                </span>
                <span className="px-4 py-3 self-center">{p.tipo === "servicio" ? "—" : p.stock_real}</span>
                <span className="px-4 py-3 self-center">
                  <button
                    onClick={(e) => handleToggleActivo(e, p)}
                    className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                  >
                    {p.activo
                      ? <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-600">Activo</span></>
                      : <><XCircle className="w-4 h-4 text-gray-400" /><span className="text-gray-400">Inactivo</span></>
                    }
                  </button>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
