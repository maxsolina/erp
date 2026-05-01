"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import OdooFilterBar, {
  type FilterOption,
  type GroupByOption,
  type SavedFilter,
} from "@/components/odoo-filter-bar"
import {
  formatCurrency,
  formatDate,
  getEstadoAjusteColor,
  getEstadoAjusteLabel,
  type AjusteCliente,
} from "./_shared"

// Componente base reutilizado por las 3 vistas (Ajustes, NC, ND).
// Las 3 leen la misma API /api/ajustes-clientes y se distinguen por
// el prefijo del número (NC-* / ND-* / sin prefijo).

export type TipoVista = "todos" | "credito" | "debito"

interface Props {
  tipo: TipoVista
  title: string
  view: string  // valor del ?view= que abre el monolito
  permKey: string
  baseHref: string  // p.ej. /ventas/nc, /ventas/nd, /ventas/ajustes
  emptyText?: string
}

function matchesTipo(numero: string, tipo: TipoVista) {
  if (tipo === "credito") return numero.startsWith("NC-")
  if (tipo === "debito") return numero.startsWith("ND-")
  return true  // "todos" → no filtra
}

export default function AjustesListadoBase({ tipo, title, view, permKey, baseHref, emptyText }: Props) {
  const [items, setItems] = useState<AjusteCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [search, setSearch] = useState("")
  const [activeFilters, setActiveFilters] = useState<FilterOption[]>([])
  const [activeGroupBy, setActiveGroupBy] = useState<GroupByOption[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  useEffect(() => {
    fetch("/api/ajustes-clientes")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data.filter((a: AjusteCliente) => matchesTipo(a.numero ?? "", tipo)))
        }
      })
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [tipo])

  const filtered = useMemo(() => {
    let result = items
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        a =>
          a.numero?.toLowerCase().includes(q) ||
          (a.cliente_nombre ?? "").toLowerCase().includes(q) ||
          (a.concepto ?? "").toLowerCase().includes(q),
      )
    }
    for (const f of activeFilters) {
      result = result.filter(a => String(a[f.field as keyof AjusteCliente] ?? "") === f.value)
    }
    return result
  }, [items, search, activeFilters])

  const filterOptions = useMemo(() => {
    const estados = [...new Set(items.map(a => a.estado).filter(Boolean))]
    const monedas = [...new Set(items.map(a => a.moneda).filter(Boolean))] as string[]
    return [
      { field: "estado", label: "Estado", values: estados.map(e => ({ value: e, label: getEstadoAjusteLabel(e) })) },
      { field: "moneda", label: "Moneda", values: monedas.map(m => ({ value: m, label: m })) },
    ].filter(f => f.values.length > 0)
  }, [items])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-amber-900">{title}</h1>
        <Link
          href={`${baseHref}/nueva`}
          className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </Link>
      </div>

      <OdooFilterBar
        moduleName={`ventas_${permKey}`}
        filterOptions={filterOptions}
        groupByOptions={[
          { id: "estado", label: "Estado", field: "estado" },
          { id: "cliente_nombre", label: "Cliente", field: "cliente_nombre" },
          { id: "moneda", label: "Moneda", field: "moneda" },
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
        totalCount={items.length}
        filteredCount={filtered.length}
      />

      <div className="mt-4 bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Número</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Moneda</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Cargando...</td></tr>
            )}
            {!cargando && filtered.map(a => {
              const href = `${baseHref}/${a.id}`
              const moneda = a.moneda ?? "ARS"
              return (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-0"><Link href={href} className="block py-3 px-4 font-mono text-sm text-emerald-700 font-medium">{a.numero}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm">{a.cliente_nombre ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600">{formatDate(a.fecha)}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-sm text-gray-600 max-w-xs truncate">{a.concepto ?? "—"}</Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoAjusteColor(a.estado)}`}>{getEstadoAjusteLabel(a.estado)}</span>
                  </Link></td>
                  <td className="p-0"><Link href={href} className="block py-3 px-4 text-center text-sm">{moneda}</Link></td>
                  <td className="p-0"><Link href={href} className={`block py-3 px-4 text-sm text-right font-semibold ${a.total < 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(a.total, moneda)}</Link></td>
                </tr>
              )
            })}
            {!cargando && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400 text-sm">{emptyText ?? `No hay ${title.toLowerCase()}`}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
