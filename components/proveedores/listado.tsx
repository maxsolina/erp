"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Lock } from "lucide-react"
import OdooFilterBar, { type FilterOption, type GroupByOption, type SavedFilter } from "@/components/odoo-filter-bar"
import { fetchProveedores } from "@/lib/compras-actions"

// Helpers duplicados desde modulo-compras-v2.tsx (formatCurrency / formatDate son
// privados del componente original). Si en el futuro se centralizan en un módulo
// compartido, reemplazar acá.
const formatCurrency = (amount: number, currency: string = "ARS") => {
  const num = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
  const code = currency || "ARS"
  return `${code} $ ${num}`
}

// makeSavedFilterHandlersC duplicado desde modulo-compras-v2.tsx
const makeSavedFilterHandlers = (
  setter: React.Dispatch<React.SetStateAction<SavedFilter[]>>,
  setActiveFilters: React.Dispatch<React.SetStateAction<FilterOption[]>>,
  setActiveGroupBy: React.Dispatch<React.SetStateAction<GroupByOption[]>>,
  setSearch: (s: string) => void,
) => ({
  onSaveFilter: (f: Omit<SavedFilter, "id" | "createdBy">) =>
    setter(prev => [...prev, { ...f, id: Date.now().toString(), createdBy: "Admin" }]),
  onDeleteFilter: (id: string) => setter(prev => prev.filter(sf => sf.id !== id)),
  onApplyFilter: (f: SavedFilter) => {
    setActiveFilters(f.filters)
    setActiveGroupBy(f.groupBy)
    setSearch("")
  },
})

export default function ProveedoresListado() {
  // Datos
  const [proveedores, setProveedores] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros (mismas variables que modulo-compras-v2)
  const [proveedorSearchText, setProveedorSearchText] = useState("")
  const [proveedorFiltroCategoria, setProveedorFiltroCategoria] = useState<"todos" | "publico" | "privado">("todos")
  const [proveedorFiltroTipo, setProveedorFiltroTipo] = useState<"todos" | "nacional" | "internacional" | "despachante">("todos")

  // OdooFilterBar state
  const [savedFiltersProv, setSavedFiltersProv] = useState<SavedFilter[]>([])
  const [activeFiltersProv, setActiveFiltersProv] = useState<FilterOption[]>([])
  const [activeGroupByProv, setActiveGroupByProv] = useState<GroupByOption[]>([])

  useEffect(() => {
    let cancelled = false
    setCargando(true)
    fetchProveedores()
      .then(data => {
        if (cancelled) return
        setProveedores((data ?? []).map((p: any) => ({ ...p, nombre: p.nombre ?? p.razon_social ?? "" })))
      })
      .catch(err => {
        console.error("[Proveedores] Error al cargar:", err)
        if (!cancelled) setError(err?.message ?? "Error al cargar proveedores")
      })
      .finally(() => {
        if (!cancelled) setCargando(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredProveedores = useMemo(() => {
    return proveedores.filter(p => {
      const searchLower = proveedorSearchText.toLowerCase()
      const matchesSearch =
        (p.nombre?.toLowerCase() ?? "").includes(searchLower) ||
        (p.codigo?.toLowerCase() ?? "").includes(searchLower) ||
        (p.cuit ?? "").includes(proveedorSearchText)
      const matchesCategoria = proveedorFiltroCategoria === "todos" || p.categoria === proveedorFiltroCategoria
      const matchesTipo = proveedorFiltroTipo === "todos" || p.tipo === proveedorFiltroTipo
      return matchesSearch && matchesCategoria && matchesTipo
    })
  }, [proveedores, proveedorSearchText, proveedorFiltroCategoria, proveedorFiltroTipo])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Proveedores</h1>
          <p className="text-gray-500 mt-1">Gestione sus proveedores nacionales e internacionales</p>
        </div>
        <Link
          href="/proveedores/nuevo"
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg hover:bg-indigo-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <OdooFilterBar
          moduleName="proveedores"
          filterOptions={[
            {
              field: "categoria",
              label: "Categoría",
              values: [
                { value: "publico", label: "Público" },
                { value: "privado", label: "Privado" },
              ],
            },
            {
              field: "tipo",
              label: "Tipo",
              values: [
                { value: "nacional", label: "Nacional" },
                { value: "internacional", label: "Internacional" },
                { value: "despachante", label: "Despachante" },
              ],
            },
          ]}
          groupByOptions={[
            { id: "categoria", label: "Categoría", field: "categoria" },
            { id: "tipo", label: "Tipo", field: "tipo" },
            { id: "moneda_habitual", label: "Moneda", field: "moneda_habitual" },
          ]}
          activeFilters={activeFiltersProv}
          activeGroupBy={activeGroupByProv}
          searchTerm={proveedorSearchText}
          onFiltersChange={f => {
            setActiveFiltersProv(f)
            setProveedorFiltroCategoria((f.find(x => x.field === "categoria")?.value as any) ?? "todos")
            setProveedorFiltroTipo((f.find(x => x.field === "tipo")?.value as any) ?? "todos")
          }}
          onGroupByChange={setActiveGroupByProv}
          onSearchChange={setProveedorSearchText}
          savedFilters={savedFiltersProv}
          {...makeSavedFilterHandlers(setSavedFiltersProv, setActiveFiltersProv, setActiveGroupByProv, setProveedorSearchText)}
          totalCount={proveedores.length}
          filteredCount={filteredProveedores.length}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Proveedores</p>
          <p className="text-2xl font-bold text-gray-900">{proveedores.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Nacionales</p>
          <p className="text-2xl font-bold text-blue-600">
            {proveedores.filter(p => p.tipo === "nacional").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Internacionales</p>
          <p className="text-2xl font-bold text-purple-600">
            {proveedores.filter(p => p.tipo === "internacional").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Deuda Total</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(proveedores.reduce((s, p) => s + (p.saldo ?? 0), 0))}
          </p>
        </div>
      </div>

      {/* Estados de carga / error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b">
            <tr className="text-xs text-gray-500 uppercase">
              <th className="text-left py-3 px-4">Nombre</th>
              <th className="text-left py-3 px-4">Nombre Fantasía</th>
              <th className="text-left py-3 px-4">CUIT / Doc.</th>
              <th className="text-left py-3 px-4">Categoría</th>
              <th className="text-center py-3 px-4">Moneda</th>
              <th className="text-center py-3 px-4">Activo</th>
              <th className="text-center py-3 px-4">Confidencial</th>
            </tr>
          </thead>
          <tbody>
            {filteredProveedores.map(proveedor => (
              <tr key={proveedor.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    <div className="font-medium text-gray-900">{proveedor.nombre}</div>
                    <div className="text-xs text-gray-400">{proveedor.codigo}</div>
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    {proveedor.nombre_fantasia || <span className="text-gray-300">—</span>}
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    {proveedor.cuit || proveedor.numero_documento || <span className="text-gray-300">—</span>}
                  </Link>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    {proveedor.categoria_proveedor || proveedor.tipo}
                  </Link>
                </td>
                <td className="py-3 px-4 text-center">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {proveedor.moneda_habitual}
                    </span>
                  </Link>
                </td>
                <td className="py-3 px-4 text-center">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        proveedor.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {proveedor.activo ? "Sí" : "No"}
                    </span>
                  </Link>
                </td>
                <td className="py-3 px-4 text-center">
                  <Link href={`/proveedores/${proveedor.id}`} className="block">
                    {(proveedor.confidencial || proveedor.categoria === "privado") ? (
                      <Lock className="w-4 h-4 text-red-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </Link>
                </td>
              </tr>
            ))}
            {!cargando && filteredProveedores.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-gray-400">
                  Sin proveedores para los filtros aplicados
                </td>
              </tr>
            )}
            {cargando && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-gray-400">
                  Cargando proveedores...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
