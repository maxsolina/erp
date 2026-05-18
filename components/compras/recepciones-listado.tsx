"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import { usePaginacion } from "@/components/ui/paginacion"
import {
  formatDate,
  getEstadoRecepcionColor,
  getEstadoRecepcionLabel,
  type Recepcion,
} from "./_shared"

export default function RecepcionesListado() {
  const [recs, setRecs] = useState<Recepcion[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    // El listado de "Recepciones" unifica DOS fuentes (igual que el monolito):
    //  - /api/compras/recepciones        → tabla `recepciones` (originadas en OC)
    //  - /api/recepciones-toma           → tabla `recepciones_toma` (originadas en
    //                                       Toma de Equipo desde Ventas)
    // La unión se hace acá en el cliente porque cada endpoint ya devuelve los
    // datos en el formato esperado, no es necesario un endpoint de unión nuevo.
    Promise.all([
      fetch("/api/compras/recepciones").then(r => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/recepciones-toma").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([oc, toma]) => {
      const all = [
        ...(Array.isArray(oc)   ? oc   : []),
        ...(Array.isArray(toma) ? toma : []),
      ]
      // Ordenar por fecha desc
      all.sort((a, b) => String(b.fecha ?? "").localeCompare(String(a.fecha ?? "")))
      setRecs(all)
    }).finally(() => setCargando(false))
  }, [])

  const filtered = useMemo(() => {
    let result = recs
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        r =>
          r.numero?.toLowerCase().includes(q) ||
          r.proveedor_nombre?.toLowerCase().includes(q) ||
          (r.orden_compra_numero ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(r => String(r[f.field as keyof Recepcion] ?? "") === f.value)
    }
    return result
  }, [recs, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(recs.map(r => r.estado))]
    const provs = [...new Set(recs.map(r => r.proveedor_nombre).filter(Boolean))]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoRecepcionLabel(e) })) },
      { field: "proveedor_nombre", label: "Proveedor", values: provs.map(p => ({ value: p, label: p })) },
    ].filter(f => f.values.length > 0)
  }, [recs])

  const { paginated, controles } = usePaginacion(filtered)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Recepciones</h1>
          <p className="text-xs text-gray-500 mt-1">
            Las recepciones se generan automáticamente al confirmar una OC, una Toma de Equipo o una Transferencia.
          </p>
        </div>
      </div>

      <OdooFilterBar
        moduleName="compras_recepciones"
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "proveedor_nombre", label: "Proveedor", field: "proveedor_nombre" },
        ]}
        activeFilters={activeFilters}
        activeGroupBy={activeGroupBy}
        searchTerm={search}
        onFiltersChange={setActiveFilters}
        onGroupByChange={setActiveGroupBy}
        onSearchChange={setSearch}
        savedFilters={savedFilters}
        onSaveFilter={f => setSavedFilters(p => [...p, { ...f, id: `f-${Date.now()}`, createdBy: "current_user" }])}
        onDeleteFilter={id => setSavedFilters(p => p.filter(f => f.id !== id))}
        onApplyFilter={f => {
          setActiveFilters(f.filters)
          setActiveGroupBy(f.groupBy)
        }}
        totalCount={recs.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Proveedor</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">OC Origen</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={5} className="py-8 text-center text-gray-400">Cargando...</td></tr>}
            {!cargando && paginated.map(r => {
              // Las recepciones de toma de equipo no tienen ficha App Router todavía
              // (su gestión completa con IMEI/color/batería sigue en el monolito).
              // Las de OC sí tienen ficha en /compras/recepciones/[id].
              const esToma = (r as any).documento_origen_tipo === "toma_equipo"
              const href = esToma
                ? `/?module=compras&view=recepciones&recepcion_numero=${encodeURIComponent(r.numero)}`
                : `/compras/recepciones/${r.id}`
              const ocOrigen = esToma ? (r as any).documento_origen_ref : r.orden_compra_numero
              const rowKey = `${esToma ? "toma" : "oc"}-${r.id}`
              return (
                <tr key={rowKey} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-amber-700 font-medium">{r.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{formatDate(r.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{r.proveedor_nombre}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm font-mono text-gray-600">{ocOrigen ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoRecepcionColor(r.estado)}`}>{getEstadoRecepcionLabel(r.estado)}</span>
                  </Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No hay recepciones</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex justify-end px-4 py-2 border-t border-gray-100 bg-gray-50">
            {controles}
          </div>
        )}
      </div>
    </div>
  )
}
